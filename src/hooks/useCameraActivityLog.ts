/**
 * ============================================================
 * 카메라 게임 활동 로그 훅
 * ============================================================
 *
 * 분리배출 카메라 게임의 활동 로그를 메모리에서 관리합니다.
 * 나중에 Firestore 연동 시 이 훅을 확장하여 실시간 저장 기능을 추가할 수 있습니다.
 *
 * 파일 위치: src/hooks/useCameraActivityLog.ts
 */

import { useState, useCallback } from 'react';
import type {
  CameraActivityLogEntry,
  ActivityLogKind,
  RecycleBinType,
} from '../domain/cameraActivityLog';

// ============================================================
// 타입 정의
// ============================================================

/**
 * appendLog 함수에 전달할 부분 로그 객체
 * id, sessionId, createdAt은 자동 생성됨
 */
export type PartialLogEntry = Omit<CameraActivityLogEntry, 'id' | 'sessionId' | 'createdAt'>;

/**
 * 훅 반환 타입
 */
export interface UseCameraActivityLogResult {
  /** 현재 로그 목록 (최신순) */
  logs: CameraActivityLogEntry[];

  /** 로그 추가 함수 */
  appendLog: (partial: PartialLogEntry) => CameraActivityLogEntry;

  /** 로그 전체 삭제 */
  clearLogs: () => void;

  /** 가장 최근 로그 1개 삭제 (Undo) */
  undoLastLog: () => CameraActivityLogEntry | null;

  /** 특정 라운드의 로그만 필터링 */
  getLogsByRound: (roundId: string) => CameraActivityLogEntry[];

  /** 특정 종류의 로그만 필터링 */
  getLogsByKind: (kind: ActivityLogKind) => CameraActivityLogEntry[];
}

// ============================================================
// 훅 구현
// ============================================================

/**
 * 카메라 게임 활동 로그 관리 훅
 *
 * @param sessionId - 현재 세션 ID
 * @returns 로그 목록 및 조작 함수들
 *
 * TODO: Firestore 연동 시
 * - appendLog 내부에서 addDoc() 호출하여 실시간 저장
 * - useEffect에서 onSnapshot()으로 실시간 구독하여 logs 동기화
 * - 경로: agencies/{agencyId}/cameraSessions/{sessionId}/activityLogs/{logId}
 */
export function useCameraActivityLog(sessionId: string): UseCameraActivityLogResult {
  const [logs, setLogs] = useState<CameraActivityLogEntry[]>([]);

  /**
   * 로그 추가
   *
   * 최신 로그가 맨 앞에 오도록 prepend 방식으로 추가합니다.
   *
   * TODO: Firestore 연동 시 여기서 addDoc() 호출
   * ```ts
   * const logRef = collection(db, `agencies/${agencyId}/cameraSessions/${sessionId}/activityLogs`);
   * await addDoc(logRef, {
   *   ...newLog,
   *   createdAt: serverTimestamp(),
   * });
   * ```
   */
  const appendLog = useCallback(
    (partial: PartialLogEntry): CameraActivityLogEntry => {
      const now = new Date();
      const newLog: CameraActivityLogEntry = {
        id: crypto.randomUUID(),
        sessionId,
        createdAt: now.toISOString(),
        ...partial,
      };

      // 최신이 위로 오도록 prepend
      setLogs((prev) => [newLog, ...prev]);

      // 디버그 로그
      console.log('[CameraActivityLog] 로그 추가:', {
        kind: newLog.kind,
        subType: newLog.subType,
        message: newLog.message,
      });

      return newLog;
    },
    [sessionId]
  );

  /**
   * 로그 전체 삭제
   */
  const clearLogs = useCallback(() => {
    setLogs([]);
    console.log('[CameraActivityLog] 로그 전체 삭제');
  }, []);

  /**
   * 가장 최근 로그 1개 삭제 (Undo)
   *
   * @returns 삭제된 로그, 없으면 null
   *
   * ⚠️ Undo 정책 (v1):
   * - 이 함수는 **프론트엔드 로그만** 롤백합니다.
   * - Supabase에 이미 저장된 포인트는 롤백되지 않습니다.
   * - 이유: 포인트 지급은 즉시 DB에 반영되며, 롤백 API가 없습니다.
   * - 만약 오조작으로 잘못된 포인트가 지급되었다면,
   *   관리자 대시보드에서 수동으로 조정해야 합니다.
   *
   * 향후 개선 시:
   * - 포인트 지급 트랜잭션 로그를 별도 테이블에 저장
   * - Undo 시 해당 트랜잭션을 무효화하는 API 호출
   */
  const undoLastLog = useCallback((): CameraActivityLogEntry | null => {
    if (logs.length === 0) return null;

    const removedLog = logs[0];
    setLogs((prev) => prev.slice(1));

    // Undo 경고: 포인트 관련 로그인 경우 주의 메시지 출력
    if (removedLog.kind === 'point' || removedLog.subType === 'POINT_AWARDED') {
      console.warn('[CameraActivityLog] ⚠️ Undo 주의: 포인트 로그가 삭제되었지만, DB 포인트는 롤백되지 않습니다.');
    }

    console.log('[CameraActivityLog] 로그 Undo:', {
      kind: removedLog.kind,
      subType: removedLog.subType,
      message: removedLog.message,
    });

    return removedLog;
  }, [logs]);

  /**
   * 특정 라운드의 로그만 필터링
   */
  const getLogsByRound = useCallback(
    (roundId: string): CameraActivityLogEntry[] => {
      return logs.filter((log) => log.roundId === roundId);
    },
    [logs]
  );

  /**
   * 특정 종류의 로그만 필터링
   */
  const getLogsByKind = useCallback(
    (kind: ActivityLogKind): CameraActivityLogEntry[] => {
      return logs.filter((log) => log.kind === kind);
    },
    [logs]
  );

  return {
    logs,
    appendLog,
    clearLogs,
    undoLastLog,
    getLogsByRound,
    getLogsByKind,
  };
}

// ============================================================
// 로그 생성 헬퍼 함수들
// ============================================================

/**
 * QR 인식 성공 로그 생성
 */
export function createQrDetectedLog(
  roundId: string,
  childId: string,
  childNickname: string
): PartialLogEntry {
  return {
    roundId,
    kind: 'qr',
    subType: 'QR_DETECTED',
    childId,
    childNickname,
    message: `QR 인식 성공 – ${childNickname} 친구`,
  };
}

/**
 * QR 인식 실패 로그 생성
 */
export function createQrFailedLog(roundId: string): PartialLogEntry {
  return {
    roundId,
    kind: 'qr',
    subType: 'QR_FAILED',
    message: 'QR 인식 실패 – 선생님 도움 필요',
  };
}

/**
 * QR 스킵 로그 생성 (반 전체 모드)
 */
export function createQrSkippedLog(roundId: string): PartialLogEntry {
  return {
    roundId,
    kind: 'qr',
    subType: 'QR_SKIPPED',
    message: 'QR 없이 반 전체 모드로 진행',
  };
}

/**
 * 미등록 QR 로그 생성 (children 테이블에 없는 QR)
 *
 * QR 인식은 성공했으나 Supabase children에서 찾지 못한 경우.
 * 이 라운드는 반 전체 모드로 진행되며, DB 포인트 업데이트 없음.
 */
export function createQrUnregisteredLog(
  roundId: string,
  qrId: string
): PartialLogEntry {
  return {
    roundId,
    kind: 'qr',
    subType: 'QR_UNREGISTERED',
    message: `미등록 QR 카드 (${qrId.slice(0, 8)}...) – 반 전체 모드로 전환`,
    meta: { qrId },
  };
}

/**
 * 아이 로그인 로그 생성 (DB에서 프로필 조회 성공 시)
 *
 * QR 인식 → Supabase children에서 ChildProfile 확정된 시점에 호출.
 * totalPointsAfter에 "로그 시점 기준 누적 포인트"를 기록합니다.
 */
export function createChildLoginLog(
  roundId: string,
  childId: string,
  childNickname: string,
  totalPoints: number
): PartialLogEntry {
  return {
    roundId,
    kind: 'system',
    subType: 'CHILD_LOGIN',
    childId,
    childNickname,
    totalPointsAfter: totalPoints,
    message: `${childNickname} 친구 로그인 (누적 ${totalPoints}점)`,
  };
}

/**
 * 아이 인사 로그 생성
 */
export function createChildGreetingLog(
  roundId: string,
  childId: string,
  childNickname: string
): PartialLogEntry {
  return {
    roundId,
    kind: 'system',
    subType: 'CHILD_GREETING',
    childId,
    childNickname,
    message: `${childNickname} 친구 환영!`,
  };
}

/**
 * 쓰레기 캡처 로그 생성
 */
export function createTrashCapturedLog(
  roundId: string,
  childId?: string,
  childNickname?: string
): PartialLogEntry {
  return {
    roundId,
    kind: 'trash',
    subType: 'TRASH_CAPTURED',
    childId,
    childNickname,
    message: '쓰레기 이미지 캡처 후 YOLO 분석 시작',
  };
}

/**
 * YOLO 결과 로그 생성
 */
export function createYoloResultLog(
  roundId: string,
  materialLabel: string,
  recommendedBin: RecycleBinType,
  confidence: number,
  childId?: string,
  childNickname?: string
): PartialLogEntry {
  const binLabel: Record<RecycleBinType, string> = {
    plastic: '플라스틱류',
    paper: '종이류',
    vinyl: '비닐류',
    general: '일반쓰레기',
    canBotble: '캔 및 병류',
  };

  return {
    roundId,
    kind: 'trash',
    subType: 'YOLO_RESULT',
    childId,
    childNickname,
    materialLabel,
    recommendedBin,
    message: `YOLO 인식: ${materialLabel} → 추천 배출통: ${binLabel[recommendedBin]}`,
    meta: { confidence },
  };
}

/**
 * 분리배출통 선택 로그 생성
 */
export function createBinChosenLog(
  roundId: string,
  chosenBin: RecycleBinType,
  childId?: string,
  childNickname?: string
): PartialLogEntry {
  const binLabel: Record<RecycleBinType, string> = {
    plastic: '플라스틱류',
    paper: '종이류',
    vinyl: '비닐류',
    general: '일반쓰레기',
    canBotble: '캔 및 병류',
  };

  return {
    roundId,
    kind: 'trash',
    subType: 'BIN_CHOSEN',
    childId,
    childNickname,
    chosenBin,
    message: `실제 배출통 선택: ${binLabel[chosenBin]}`,
  };
}

/**
 * 라운드 정답 로그 생성
 */
export function createRoundCorrectLog(
  roundId: string,
  childId?: string,
  childNickname?: string
): PartialLogEntry {
  return {
    roundId,
    kind: 'system',
    subType: 'ROUND_CORRECT',
    childId,
    childNickname,
    isCorrect: true,
    message: '정답! 올바른 배출통에 버렸습니다.',
  };
}

/**
 * 라운드 오답 로그 생성
 */
export function createRoundWrongLog(
  roundId: string,
  childId?: string,
  childNickname?: string
): PartialLogEntry {
  return {
    roundId,
    kind: 'system',
    subType: 'ROUND_WRONG',
    childId,
    childNickname,
    isCorrect: false,
    message: '오답 – 잘못된 배출통에 버렸습니다.',
  };
}

/**
 * 포인트 지급 로그 생성
 */
export function createPointAwardedLog(
  roundId: string,
  pointsDelta: number,
  totalPointsAfter: number,
  childId?: string,
  childNickname?: string
): PartialLogEntry {
  return {
    roundId,
    kind: 'point',
    subType: 'POINT_AWARDED',
    childId,
    childNickname,
    pointsDelta,
    totalPointsAfter,
    message: `포인트 +${pointsDelta}점 지급 (누적: ${totalPointsAfter}점)`,
  };
}

/**
 * 라운드 요약 로그 생성
 */
export function createRoundSummaryLog(
  roundId: string,
  isCorrect: boolean,
  childId?: string,
  childNickname?: string
): PartialLogEntry {
  const resultText = isCorrect ? '정답' : '오답';
  const who = childNickname ? `${childNickname} 친구` : '우리 반';

  return {
    roundId,
    kind: 'system',
    subType: 'ROUND_SUMMARY',
    childId,
    childNickname,
    isCorrect,
    message: `라운드 완료 – ${who}: ${resultText}`,
  };
}