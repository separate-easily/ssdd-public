/**
 * ============================================================
 * 분리배출 게임 상태 관리 훅
 * ============================================================
 *
 * trashMission.ts의 reduceMissionState를 감싼 React 훅입니다.
 * useReducer로 상태를 관리하고, 이벤트 발생 시 로그를 출력합니다.
 *
 * 현재 단계에서는 Firestore 연동 없이 in-memory 상태 + console.log만 사용합니다.
 *
 * 파일 위치: src/hooks/useMissionState.ts
 */

import { useReducer, useCallback, useMemo } from 'react';
import {
  MissionState,
  MissionEvent,
  initialMissionState,
  reduceMissionState,
  getPhaseDescription,
  CATEGORY_LABELS,
} from '../domain/trashMission';

// ============================================================
// 타입 정의
// ============================================================

export interface UseMissionStateOptions {
  /** 디버그 로그에 표시할 라벨 */
  debugLabel?: string;

  /**
   * 나중에 Firestore 연동 시 사용할 옵션들 (현재는 미사용)
   *
   * TODO: Firestore 연동 시 아래 옵션들을 활성화할 것
   */
  // agencyId?: string;
  // sessionId?: string;
  // kidId?: string;
  // enableFirestoreLog?: boolean;
}

export interface UseMissionStateResult {
  /** 현재 게임 상태 */
  state: MissionState;

  /** 이벤트를 dispatch하여 상태 전이 */
  dispatchEvent: (event: MissionEvent) => void;

  /** 현재 Phase에 대한 한글 설명 */
  phaseDescription: string;

  /** 현재 카테고리의 한글 이름 (없으면 null) */
  categoryLabel: string | null;

  /** 게임이 진행 중인지 여부 */
  isPlaying: boolean;

  /** 분석 중인지 여부 */
  isAnalyzing: boolean;
}

// ============================================================
// 훅 구현
// ============================================================

export function useMissionState(
  options?: UseMissionStateOptions
): UseMissionStateResult {
  const { debugLabel = 'MissionState' } = options ?? {};

  // useReducer로 상태 관리
  const [state, dispatch] = useReducer(reduceMissionState, initialMissionState);

  /**
   * 이벤트 dispatch 래퍼
   *
   * 1) reduceMissionState로 새 state 계산 (내부적으로 useReducer가 처리)
   * 2) console.log로 디버그 정보 출력
   *
   * TODO: Firestore 연동 시 여기서 addDoc을 호출하여 로그 저장
   */
  const dispatchEvent = useCallback(
    (event: MissionEvent) => {
      // 디버그 로그 출력
      console.log(`[${debugLabel}] 이벤트 발생:`, {
        eventType: event.type,
        eventPayload: event,
        prevPhase: state.phase,
      });

      // 실제 dispatch
      dispatch(event);

      /**
       * TODO: Firestore 로그 저장 (나중에 추가)
       *
       * 예시 코드:
       * ```
       * if (options?.enableFirestoreLog && options?.sessionId) {
       *   const logRef = collection(db, 'missionLogs');
       *   await addDoc(logRef, {
       *     agencyId: options.agencyId,
       *     sessionId: options.sessionId,
       *     kidId: options.kidId,
       *     eventType: event.type,
       *     eventPayload: event,
       *     prevPhase: state.phase,
       *     timestamp: serverTimestamp(),
       *   });
       * }
       * ```
       */
    },
    [debugLabel, state.phase]
  );

  // 현재 Phase에 대한 한글 설명
  const phaseDescription = useMemo(
    () => getPhaseDescription(state.phase),
    [state.phase]
  );

  // 현재 카테고리의 한글 이름
  const categoryLabel = useMemo(
    () => (state.currentCategory ? CATEGORY_LABELS[state.currentCategory] : null),
    [state.currentCategory]
  );

  // 게임이 진행 중인지 여부 (IDLE, FINISHED가 아닌 상태)
  const isPlaying = useMemo(
    () => state.phase !== 'IDLE' && state.phase !== 'FINISHED',
    [state.phase]
  );

  // 분석 중인지 여부
  const isAnalyzing = useMemo(() => state.phase === 'ANALYZING', [state.phase]);

  return {
    state,
    dispatchEvent,
    phaseDescription,
    categoryLabel,
    isPlaying,
    isAnalyzing,
  };
}

// ============================================================
// 유틸리티 훅
// ============================================================

/**
 * 상태 변화 시 콜백을 실행하는 훅 (선택적 사용)
 *
 * 예: Phase가 RESULT_CORRECT로 변할 때 효과음 재생
 */
export function useMissionStateEffect(
  state: MissionState,
  onPhaseChange?: (phase: MissionState['phase'], state: MissionState) => void
) {
  // Phase 변화 감지는 useEffect로 처리하면 됨
  // 이 훅은 필요할 때 RecycleCameraGame에서 사용
}