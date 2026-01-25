/**
 * ============================================================
 * TTS 서비스 (Web Speech API)
 * ============================================================
 *
 * Web Speech API를 사용하여 실제 음성을 재생합니다.
 * 한국어 음성을 우선 사용하며, 없을 경우 기본 음성을 사용합니다.
 *
 * 파일 위치: src/services/tts.ts
 */

import type { CameraGamePhase } from '../domain/cameraGamePhase';
import type { MissionCategory } from '../domain/trashMission';
import { BIN_COLOR_LABELS, type BinColor } from './yoloModels';

// ============================================================
// 상수
// ============================================================

/** TTS 속도 (0.1 ~ 10, 기본값 1) */
const SPEECH_RATE = 0.9;

/** TTS 피치 (0 ~ 2, 기본값 1) */
const SPEECH_PITCH = 1.1;

/** TTS 볼륨 (0 ~ 1, 기본값 1) */
const SPEECH_VOLUME = 1.0;

// ============================================================
// 한국어 음성 캐시
// ============================================================

let cachedKoreanVoice: SpeechSynthesisVoice | null = null;

/**
 * 한국어 음성 찾기
 */
function getKoreanVoice(): SpeechSynthesisVoice | null {
  if (cachedKoreanVoice) {
    return cachedKoreanVoice;
  }

  const voices = window.speechSynthesis.getVoices();

  // 한국어 음성 우선순위로 찾기
  const koreanVoice = voices.find(
    (v) => v.lang === 'ko-KR' || v.lang.startsWith('ko')
  );

  if (koreanVoice) {
    cachedKoreanVoice = koreanVoice;
    console.log('[TTS] 한국어 음성 찾음:', koreanVoice.name);
  }

  return koreanVoice || null;
}

/**
 * 음성 목록이 로드될 때까지 대기 (최초 1회)
 */
function waitForVoices(): Promise<void> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve();
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      resolve();
    };

    // 타임아웃 (2초 후 진행)
    setTimeout(resolve, 2000);
  });
}

// ============================================================
// TTS 함수
// ============================================================

/**
 * TTS 발화
 *
 * @param text - 발화할 텍스트
 * @returns Promise<void> - 발화가 완료되면 resolve
 */
export async function speak(text: string): Promise<void> {
  // Web Speech API 지원 확인
  if (!window.speechSynthesis) {
    console.warn('[TTS] Web Speech API 미지원 브라우저');
    return;
  }

  // 음성 목록 로드 대기
  await waitForVoices();

  return new Promise((resolve, reject) => {
    // 이전 발화 중지
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // 한국어 음성 설정
    const koreanVoice = getKoreanVoice();
    if (koreanVoice) {
      utterance.voice = koreanVoice;
    }
    utterance.lang = 'ko-KR';

    // 속성 설정
    utterance.rate = SPEECH_RATE;
    utterance.pitch = SPEECH_PITCH;
    utterance.volume = SPEECH_VOLUME;

    utterance.onend = () => {
      console.log('[TTS] 발화 완료:', text.substring(0, 30) + '...');
      resolve();
    };

    utterance.onerror = (event) => {
      console.error('[TTS] 발화 에러:', event.error);
      // 에러가 발생해도 게임은 계속 진행
      resolve();
    };

    console.log('[TTS] 🔊 발화 시작:', text);
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * TTS 발화 (즉시 반환, fire-and-forget)
 *
 * @param text - 발화할 텍스트
 */
export function speakAsync(text: string): void {
  speak(text).catch((err) => {
    console.error('[TTS] 비동기 발화 에러:', err);
  });
}

/**
 * 여러 텍스트를 순차적으로 발화
 *
 * @param texts - 발화할 텍스트 배열
 */
export async function speakSequence(texts: string[]): Promise<void> {
  for (const text of texts) {
    await speak(text);
  }
}

/**
 * 현재 발화 중지
 */
export function stopSpeaking(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * 발화 중인지 확인
 */
export function isSpeaking(): boolean {
  return window.speechSynthesis?.speaking ?? false;
}

// ============================================================
// 카테고리 한글 라벨
// ============================================================

/** 쓰레기 종류 한글 라벨 */
export const CATEGORY_LABELS: Record<MissionCategory, string> = {
  plastic: '플라스틱',
  paper: '종이',
  vinyl: '비닐',
  general: '일반쓰레기',
  canBotble: '캔/병',
};

// ============================================================
// Phase별 TTS 음성 메시지
// ============================================================

/**
 * 카메라 게임 Phase별 음성 메시지
 */
export const PHASE_VOICE_MESSAGES = {
  // QR 인식 관련
  WAIT_FOR_QR: '카메라에 카드가 잘 보이게 보여주세요!',
  QR_RECOGNIZING: '카드를 읽고 있어요. 잠시만 기다려 주세요!',

  // 아이 인사
  greetChild: (nickname: string) =>
    `${nickname} 친구 반가워요! 오늘도 지구와 평택시를 지켜볼까요?`,

  // 쓰레기 인식 관련
  WAIT_FOR_TRASH: '이제 버릴 쓰레기를 화면에 잘 보이게 보여주세요!',
  WAIT_FOR_TRASH_RETRY:
    '쓰레기를 조금 더 가까이 가져와 주세요. 잘 안되면 선생님을 불러 주세요!',
  TRASH_RECOGNIZING: '이 쓰레기를 어디로 보내야 할지 생각해 보는 중이에요!',

  // 분리수거함 색상 스캔 (NEW)
  WAIT_FOR_BIN_SCAN: '쓰레기통에 가서 버릴 곳의 색깔을 카메라로 보여주세요!',
  waitForBinScanWithHint: (category: MissionCategory) => {
    const label = CATEGORY_LABELS[category];
    return `이건 ${label}이에요! 쓰레기통에 가서 어떤 색 통에 버릴지 보여주세요!`;
  },
  BIN_RECOGNIZING: '쓰레기통 색깔을 확인하고 있어요!',

  // 분리배출통 선택 (버튼 모드용)
  WAIT_FOR_BIN_CHOICE:
    '이제 우리 반 쓰레기통으로 가서, 어디에 버릴지 생각해 보아요!',

  // 피드백
  feedbackCorrect: (nickname?: string) =>
    nickname
      ? `와우! ${nickname} 친구 멋져요! 덕분에 평택시가 더 깨끗해졌어요!`
      : '와우! 멋져요! 덕분에 평택시가 더 깨끗해졌어요!',

  feedbackCorrectWithColor: (binColor: BinColor, nickname?: string) => {
    const colorLabel = BIN_COLOR_LABELS[binColor];
    return nickname
      ? `정답이에요! ${nickname} 친구가 ${colorLabel} 통에 잘 버렸어요! 멋져요!`
      : `정답이에요! ${colorLabel} 통에 잘 버렸어요! 멋져요!`;
  },

  feedbackWrong:
    '아쉬워요! 우리 버리려던 쓰레기가 어떻게 생겼는지 한 번 보고 만져볼까요? 딱딱한지, 말랑한지, 투명한지 선생님과 이야기해 보세요!',

  feedbackWrongWithCorrectColor: (correctColor: BinColor, category?: MissionCategory) => {
    const colorLabel = BIN_COLOR_LABELS[correctColor];
    if (category) {
      const categoryLabel = CATEGORY_LABELS[category];
      return `아쉬워요! 이건 ${categoryLabel}라서 ${colorLabel} 통에 버려야 해요! 다음에 다시 도전해봐요!`;
    }
    return `아쉬워요! 이건 ${colorLabel} 통에 버려야 해요! 다음에 다시 도전해봐요!`;
  },

  feedbackRetry: '다시 한 번 생각해볼까요? 혼자 어려우면 선생님과 상의해도 좋아요! 준비되면 어떤 색 통에 버릴지 다시 보여주세요!',

  // 라운드 종료
  SUMMARY_COOLDOWN:
    '오늘도 지구를 지키느라 수고했어요! 다음 친구를 위해 자리를 양보해 줄까요?',

  // QR OFF 모드 (반 전체 모드)
  classMode: '우리 반 전체가 함께하는 분리배출 시간이에요!',
} as const;

// ============================================================
// Phase별 TTS 자동 발화 함수
// ============================================================

/**
 * Phase 변경 시 자동으로 TTS 발화
 *
 * @param phase - 현재 Phase
 * @param context - 추가 컨텍스트 (닉네임, 카테고리 등)
 */
export function speakForPhase(
  phase: CameraGamePhase,
  context?: {
    nickname?: string;
    category?: MissionCategory;
    binColor?: BinColor;
    correctColor?: BinColor;
  }
): void {
  let message: string;

  switch (phase) {
    case 'WAIT_FOR_QR':
      message = PHASE_VOICE_MESSAGES.WAIT_FOR_QR;
      break;
    case 'QR_RECOGNIZING':
      message = PHASE_VOICE_MESSAGES.QR_RECOGNIZING;
      break;
    case 'GREET_CHILD':
      message = context?.nickname
        ? PHASE_VOICE_MESSAGES.greetChild(context.nickname)
        : '반가워요! 오늘도 지구를 지켜볼까요?';
      break;
    case 'WAIT_FOR_TRASH':
      message = PHASE_VOICE_MESSAGES.WAIT_FOR_TRASH;
      break;
    case 'TRASH_RECOGNIZING':
      message = PHASE_VOICE_MESSAGES.TRASH_RECOGNIZING;
      break;
    case 'WAIT_FOR_BIN_SCAN':
      message = context?.category
        ? PHASE_VOICE_MESSAGES.waitForBinScanWithHint(context.category)
        : PHASE_VOICE_MESSAGES.WAIT_FOR_BIN_SCAN;
      break;
    case 'BIN_RECOGNIZING':
      message = PHASE_VOICE_MESSAGES.BIN_RECOGNIZING;
      break;
    case 'WAIT_FOR_BIN_CHOICE':
      message = PHASE_VOICE_MESSAGES.WAIT_FOR_BIN_CHOICE;
      break;
    case 'FEEDBACK_CORRECT':
      message = context?.binColor
        ? PHASE_VOICE_MESSAGES.feedbackCorrectWithColor(context.binColor, context.nickname)
        : PHASE_VOICE_MESSAGES.feedbackCorrect(context?.nickname);
      break;
    case 'FEEDBACK_WRONG':
      message = context?.correctColor
        ? PHASE_VOICE_MESSAGES.feedbackWrongWithCorrectColor(context.correctColor, context.category)
        : PHASE_VOICE_MESSAGES.feedbackWrong;
      break;
    case 'FEEDBACK_RETRY':
      message = PHASE_VOICE_MESSAGES.feedbackRetry;
      break;
    case 'SUMMARY_COOLDOWN':
      message = PHASE_VOICE_MESSAGES.SUMMARY_COOLDOWN;
      break;
    default:
      return; // 알 수 없는 Phase는 무시
  }

  speakAsync(message);
}
