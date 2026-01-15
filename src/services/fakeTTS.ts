/**
 * ============================================================
 * 가짜 TTS 서비스 (Mock Service)
 * ============================================================
 *
 * 실제 NCP TTS 연동 전에 사용하는 목업 서비스입니다.
 * console.log로 텍스트를 출력하고, 텍스트 길이에 비례한 딜레이 후 resolve합니다.
 *
 * 주의: 이 파일에서는 실제 오디오 재생이나 NCP API 호출을 하지 않습니다.
 *
 * TODO: 실제 NCP TTS 연동 시 이 파일을 실제 구현으로 교체하거나,
 *       별도의 ncpTTS.ts를 만들어서 사용할 것.
 *       (외부 API 호출 → 과금 가능성 있음)
 *
 * 파일 위치: src/services/fakeTTS.ts
 */

// ============================================================
// 상수
// ============================================================

/** 기본 딜레이 (ms) - 짧은 텍스트 기준 */
const BASE_DELAY_MS = 500;

/** 글자당 추가 딜레이 (ms) */
const DELAY_PER_CHAR_MS = 30;

/** 최대 딜레이 (ms) */
const MAX_DELAY_MS = 2000;

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 텍스트 길이에 따른 예상 발화 시간 계산
 */
function calculateSpeakDuration(text: string): number {
  const duration = BASE_DELAY_MS + text.length * DELAY_PER_CHAR_MS;
  return Math.min(duration, MAX_DELAY_MS);
}

/**
 * 지정된 ms만큼 대기
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// 가짜 TTS 함수
// ============================================================

/**
 * 가짜 TTS 발화
 *
 * @param text - 발화할 텍스트
 * @returns Promise<void> - 발화가 "완료"되면 resolve
 *
 * 동작:
 * 1. console.log로 발화 텍스트 출력
 * 2. 텍스트 길이에 비례한 딜레이 (0.5~2초)
 * 3. resolve
 */
export async function fakeSpeak(text: string): Promise<void> {
  const duration = calculateSpeakDuration(text);

  console.log('[fakeTTS] 🔊 발화 시작:', {
    text,
    estimatedDuration: `${duration}ms`,
  });

  await delay(duration);

  console.log('[fakeTTS] 🔊 발화 완료:', text.substring(0, 20) + '...');
}

/**
 * 가짜 TTS 발화 (즉시 반환)
 *
 * 발화를 기다리지 않고 바로 다음 작업을 진행하고 싶을 때 사용
 * 내부적으로 fakeSpeak를 fire-and-forget으로 호출
 *
 * @param text - 발화할 텍스트
 */
export function fakeSpeakAsync(text: string): void {
  fakeSpeak(text).catch((err) => {
    console.error('[fakeTTS] 발화 에러:', err);
  });
}

/**
 * 여러 텍스트를 순차적으로 발화
 *
 * @param texts - 발화할 텍스트 배열
 */
export async function fakeSpeakSequence(texts: string[]): Promise<void> {
  for (const text of texts) {
    await fakeSpeak(text);
  }
}

// ============================================================
// 미리 정의된 음성 메시지
// ============================================================

/** 게임 진행 중 사용할 음성 메시지 모음 */
export const VOICE_MESSAGES = {
  // 분석 시작
  analyzing: '분석 중이야! 조금만 기다려줘!',

  // 정답 시
  correct: (category: string) => `정답이야! ${category}에 잘 버렸어!`,
  correctGeneric: '잘했어! 올바르게 분리배출했어!',

  // 오답 시
  wrong: (correctCategory: string) => `아쉬워! 이건 ${correctCategory}에 버려야 해!`,
  wrongGeneric: '이번에는 아쉬웠어. 다시 한 번 해볼까?',

  // 게임 시작/종료
  gameStart: '분리배출 게임을 시작할게! 준비됐니?',
  gameEnd: '게임이 끝났어! 수고했어!',

  // 안내
  showTrash: '쓰레기를 카메라에 보여줘!',
  tryAgain: '다시 해볼까?',
} as const;