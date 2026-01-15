/**
 * ============================================================
 * 분리배출 카메라 게임 - 도메인 레이어 (상태머신)
 * ============================================================
 *
 * 이 파일은 React에 의존하지 않는 순수 타입/함수만 포함합니다.
 * 상태 전이 로직과 포인트 계산 규칙을 정의합니다.
 *
 * 파일 위치: src/domain/trashMission.ts
 */

// ============================================================
// 타입 정의
// ============================================================

/** 분리배출 카테고리 */
export type MissionCategory = 'plastic' | 'paper' | 'can' | 'general';

/** 게임 진행 Phase */
export type MissionPhase =
  | 'IDLE'              // 대기 상태 (게임 시작 전)
  | 'READY_FOR_TRASH'   // 쓰레기 촬영 대기 중
  | 'ANALYZING'         // AI 분석 중
  | 'RESULT_CORRECT'    // 정답! 올바른 분리배출
  | 'RESULT_WRONG_BIN'  // 오답! 잘못된 분리배출
  | 'FINISHED';         // 라운드 종료

/** 게임 상태 */
export interface MissionState {
  phase: MissionPhase;
  currentCategory: MissionCategory | null;
  lastConfidence: number | null;
  totalScore: number;
  missionCount: number;
  successCount: number;
}

/** 게임 이벤트 (상태 전이 트리거) */
export type MissionEvent =
  | { type: 'START_MISSION' }
  | { type: 'TRASH_READY' }
  | { type: 'YOLO_RESULT'; category: MissionCategory; confidence: number; isCorrectBin: boolean }
  | { type: 'AUTO_FINISH' }
  | { type: 'RESET_MISSION' };

// ============================================================
// 상수
// ============================================================

/** 정답 시 획득 점수 */
const CORRECT_SCORE = 100;

/** 오답 시 획득 점수 (0점 또는 음수 가능) */
const WRONG_SCORE = 0;

/** 카테고리 한글 이름 매핑 */
export const CATEGORY_LABELS: Record<MissionCategory, string> = {
  plastic: '플라스틱',
  paper: '종이',
  can: '캔',
  general: '일반쓰레기',
};

/** 카테고리 이모지 매핑 */
export const CATEGORY_EMOJIS: Record<MissionCategory, string> = {
  plastic: '🥤',
  paper: '📰',
  can: '🥫',
  general: '🗑️',
};

// ============================================================
// 초기 상태
// ============================================================

export const initialMissionState: MissionState = {
  phase: 'IDLE',
  currentCategory: null,
  lastConfidence: null,
  totalScore: 0,
  missionCount: 0,
  successCount: 0,
};

// ============================================================
// 상태 전이 함수 (순수 함수)
// ============================================================

/**
 * 상태 전이 리듀서 함수
 *
 * 주의: 이 함수는 순수 함수입니다.
 * - Firestore, React, 브라우저 API를 사용하지 않습니다.
 * - 동일한 입력에 대해 항상 동일한 출력을 반환합니다.
 */
export function reduceMissionState(
  state: MissionState,
  event: MissionEvent
): MissionState {
  switch (event.type) {
    case 'START_MISSION':
      // IDLE → READY_FOR_TRASH
      if (state.phase === 'IDLE' || state.phase === 'FINISHED') {
        return {
          ...state,
          phase: 'READY_FOR_TRASH',
          currentCategory: null,
          lastConfidence: null,
        };
      }
      return state;

    case 'TRASH_READY':
      // READY_FOR_TRASH → ANALYZING
      if (state.phase === 'READY_FOR_TRASH') {
        return {
          ...state,
          phase: 'ANALYZING',
          missionCount: state.missionCount + 1,
        };
      }
      return state;

    case 'YOLO_RESULT':
      // ANALYZING → RESULT_CORRECT | RESULT_WRONG_BIN
      if (state.phase === 'ANALYZING') {
        const isCorrect = event.isCorrectBin;
        return {
          ...state,
          phase: isCorrect ? 'RESULT_CORRECT' : 'RESULT_WRONG_BIN',
          currentCategory: event.category,
          lastConfidence: event.confidence,
          totalScore: state.totalScore + (isCorrect ? CORRECT_SCORE : WRONG_SCORE),
          successCount: isCorrect ? state.successCount + 1 : state.successCount,
        };
      }
      return state;

    case 'AUTO_FINISH':
      // RESULT_CORRECT | RESULT_WRONG_BIN → FINISHED
      if (state.phase === 'RESULT_CORRECT' || state.phase === 'RESULT_WRONG_BIN') {
        return {
          ...state,
          phase: 'FINISHED',
        };
      }
      return state;

    case 'RESET_MISSION':
      // 어느 Phase에서든 초기 상태로 리셋
      return initialMissionState;

    default:
      return state;
  }
}

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * Phase에 따른 한글 설명 반환
 */
export function getPhaseDescription(phase: MissionPhase): string {
  switch (phase) {
    case 'IDLE':
      return '게임 시작 버튼을 눌러주세요!';
    case 'READY_FOR_TRASH':
      return '쓰레기를 카메라에 보여주세요!';
    case 'ANALYZING':
      return 'AI가 분석 중이에요...';
    case 'RESULT_CORRECT':
      return '정답이에요! 잘했어요!';
    case 'RESULT_WRONG_BIN':
      return '아쉬워요! 다시 해볼까요?';
    case 'FINISHED':
      return '한 라운드가 끝났어요!';
    default:
      return '';
  }
}

/**
 * 정답 여부를 랜덤하게 결정 (가짜 로직)
 * 실제로는 YOLO가 감지한 카테고리와 선택한 분리수거통을 비교해야 함
 *
 * TODO: 실제 YOLO 연동 시 이 함수를 수정하거나 제거할 것
 */
export function isCorrectBinRandom(): boolean {
  // 70% 확률로 정답 (테스트용)
  return Math.random() < 0.7;
}