/**
 * ============================================================
 * 카메라 게임 세션 관리 훅
 * ============================================================
 *
 * 세션 ID와 라운드 ID를 관리합니다.
 * 나중에 Firestore 연동 시 세션 생성/종료 로직을 추가할 수 있습니다.
 *
 * 파일 위치: src/hooks/useCameraGameSession.ts
 */

import { useState, useCallback, useRef } from 'react';

// ============================================================
// 타입 정의
// ============================================================

export interface CameraGameSession {
  /** 세션 ID */
  sessionId: string;

  /** 세션 시작 시간 (ISO string) */
  startedAt: string;

  /** 세션 종료 시간 (ISO string, 진행 중이면 null) */
  endedAt: string | null;

  /** 총 라운드 수 */
  totalRounds: number;

  /** 정답 라운드 수 */
  correctRounds: number;
}

export interface UseCameraGameSessionResult {
  /** 현재 세션 정보 */
  session: CameraGameSession;

  /** 현재 라운드 ID */
  currentRoundId: string;

  /** 현재 라운드 번호 (1부터 시작) */
  currentRoundNumber: number;

  /** 새 라운드 시작 */
  startNewRound: () => string;

  /** 라운드 완료 처리 */
  completeRound: (isCorrect: boolean) => void;

  /** 세션 리셋 (새 세션 시작) */
  resetSession: () => void;

  /** 세션 종료 */
  endSession: () => void;
}

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 새 세션 생성
 */
function createNewSession(): CameraGameSession {
  return {
    sessionId: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    totalRounds: 0,
    correctRounds: 0,
  };
}

/**
 * 새 라운드 ID 생성
 */
function createNewRoundId(): string {
  return crypto.randomUUID();
}

// ============================================================
// 훅 구현
// ============================================================

/**
 * 카메라 게임 세션 관리 훅
 *
 * TODO: Firestore 연동 시
 * - startNewRound에서 addDoc으로 세션 문서 생성/업데이트
 * - completeRound에서 updateDoc으로 라운드 결과 저장
 * - endSession에서 updateDoc으로 세션 종료 시간 기록
 * - 경로: agencies/{agencyId}/cameraSessions/{sessionId}
 */
export function useCameraGameSession(): UseCameraGameSessionResult {
  const [session, setSession] = useState<CameraGameSession>(createNewSession);
  const [currentRoundId, setCurrentRoundId] = useState<string>(createNewRoundId);
  const roundNumberRef = useRef(0);

  /**
   * 새 라운드 시작
   *
   * TODO: Firestore 연동 시
   * ```ts
   * const roundRef = doc(db, `agencies/${agencyId}/cameraSessions/${session.sessionId}/rounds/${roundId}`);
   * await setDoc(roundRef, {
   *   roundNumber: roundNumberRef.current,
   *   startedAt: serverTimestamp(),
   *   isCorrect: null,
   * });
   * ```
   */
  const startNewRound = useCallback((): string => {
    const newRoundId = createNewRoundId();
    roundNumberRef.current += 1;
    setCurrentRoundId(newRoundId);

    console.log('[CameraGameSession] 새 라운드 시작:', {
      roundId: newRoundId,
      roundNumber: roundNumberRef.current,
    });

    return newRoundId;
  }, []);

  /**
   * 라운드 완료 처리
   *
   * TODO: Firestore 연동 시
   * ```ts
   * const roundRef = doc(db, `agencies/${agencyId}/cameraSessions/${session.sessionId}/rounds/${currentRoundId}`);
   * await updateDoc(roundRef, {
   *   isCorrect,
   *   completedAt: serverTimestamp(),
   * });
   *
   * const sessionRef = doc(db, `agencies/${agencyId}/cameraSessions/${session.sessionId}`);
   * await updateDoc(sessionRef, {
   *   totalRounds: increment(1),
   *   correctRounds: isCorrect ? increment(1) : increment(0),
   * });
   * ```
   */
  const completeRound = useCallback((isCorrect: boolean) => {
    setSession((prev) => ({
      ...prev,
      totalRounds: prev.totalRounds + 1,
      correctRounds: isCorrect ? prev.correctRounds + 1 : prev.correctRounds,
    }));

    console.log('[CameraGameSession] 라운드 완료:', {
      roundId: currentRoundId,
      roundNumber: roundNumberRef.current,
      isCorrect,
    });
  }, [currentRoundId]);

  /**
   * 세션 리셋 (새 세션 시작)
   */
  const resetSession = useCallback(() => {
    const newSession = createNewSession();
    setSession(newSession);
    setCurrentRoundId(createNewRoundId());
    roundNumberRef.current = 0;

    console.log('[CameraGameSession] 세션 리셋:', {
      newSessionId: newSession.sessionId,
    });
  }, []);

  /**
   * 세션 종료
   *
   * TODO: Firestore 연동 시
   * ```ts
   * const sessionRef = doc(db, `agencies/${agencyId}/cameraSessions/${session.sessionId}`);
   * await updateDoc(sessionRef, {
   *   endedAt: serverTimestamp(),
   * });
   * ```
   */
  const endSession = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      endedAt: new Date().toISOString(),
    }));

    console.log('[CameraGameSession] 세션 종료:', {
      sessionId: session.sessionId,
      totalRounds: session.totalRounds,
      correctRounds: session.correctRounds,
    });
  }, [session]);

  return {
    session,
    currentRoundId,
    currentRoundNumber: roundNumberRef.current,
    startNewRound,
    completeRound,
    resetSession,
    endSession,
  };
}