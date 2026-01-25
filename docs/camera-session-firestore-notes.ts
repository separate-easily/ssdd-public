/**
 * ============================================================
 * 카메라 게임 Firestore 연동 노트
 * ============================================================
 *
 * 이 파일은 나중에 Firestore를 연동할 때 참고할 구조와 예시 코드를 담고 있습니다.
 * 실제 코드가 아니라 설계 문서 성격의 파일입니다.
 *
 * 파일 위치: docs/camera-session-firestore-notes.ts
 */

// ============================================================
// 1. Firestore 컬렉션 구조
// ============================================================

/**
 * 전체 Firestore 구조:
 *
 * agencies/{agencyId}
 *   - name: string (기관명)
 *   - createdAt: Timestamp
 *
 *   └── cameraSessions/{sessionId}
 *       - startedAt: Timestamp
 *       - endedAt: Timestamp | null
 *       - totalRounds: number
 *       - correctRounds: number
 *       - teacherId?: string
 *       - classId?: string
 *
 *       └── activityLogs/{logId}
 *           - 아래 CameraActivityLogEntry 구조 그대로
 *           - createdAt: Timestamp (serverTimestamp 사용)
 *
 *   └── kids/{kidId}
 *       - nickname: string
 *       - character: string (이모지)
 *       - colorClass: string
 *       - totalPoints: number
 *       - createdAt: Timestamp
 *
 *       └── pointHistory/{pointLogId}
 *           - sessionId: string
 *           - roundId: string
 *           - pointsDelta: number
 *           - reason: string
 *           - createdAt: Timestamp
 *
 *   └── classes/{classId}
 *       - name: string (반 이름)
 *       - totalPoints: number (반 전체 포인트)
 *       - createdAt: Timestamp
 */

// ============================================================
// 2. 타입 정의 (Firestore용)
// ============================================================

import type { Timestamp } from 'firebase/firestore';

/**
 * Firestore에 저장될 카메라 세션 문서
 */
export interface FirestoreCameraSession {
  sessionId: string;
  agencyId: string;
  classId?: string;
  teacherId?: string;

  startedAt: Timestamp;
  endedAt: Timestamp | null;

  totalRounds: number;
  correctRounds: number;

  qrEnabled: boolean;
}

/**
 * Firestore에 저장될 활동 로그 문서
 * (CameraActivityLogEntry와 거의 동일하나, createdAt이 Timestamp)
 */
export interface FirestoreActivityLog {
  id: string;
  sessionId: string;
  roundId: string;
  createdAt: Timestamp;

  kind: 'qr' | 'trash' | 'system' | 'point';
  subType: string;

  childId?: string;
  childNickname?: string;

  materialLabel?: string;
  recommendedBin?: string;
  chosenBin?: string;
  isCorrect?: boolean;

  pointsDelta?: number;
  totalPointsAfter?: number;

  message: string;
  meta?: Record<string, unknown>;
}

/**
 * Firestore에 저장될 아이 문서
 */
export interface FirestoreKid {
  id: string;
  agencyId: string;
  classId?: string;

  nickname: string;
  character: string;
  colorClass: string;
  realName?: string;

  totalPoints: number;
  createdAt: Timestamp;
}

// ============================================================
// 3. Firestore 연동 예시 코드
// ============================================================

/**
 * 세션 생성 예시
 *
 * useCameraGameSession.ts의 startNewRound 또는 별도 함수에서 호출
 */
/*
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; // 프로젝트의 Firebase 설정

async function createCameraSession(agencyId: string, options?: {
  classId?: string;
  teacherId?: string;
  qrEnabled?: boolean;
}): Promise<string> {
  const sessionId = crypto.randomUUID();
  const sessionRef = doc(db, `agencies/${agencyId}/cameraSessions/${sessionId}`);

  await setDoc(sessionRef, {
    sessionId,
    agencyId,
    classId: options?.classId || null,
    teacherId: options?.teacherId || null,
    qrEnabled: options?.qrEnabled ?? true,
    startedAt: serverTimestamp(),
    endedAt: null,
    totalRounds: 0,
    correctRounds: 0,
  });

  return sessionId;
}
*/

/**
 * 활동 로그 추가 예시
 *
 * useCameraActivityLog.ts의 appendLog 내부에서 호출
 */
/*
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

async function appendActivityLog(
  agencyId: string,
  sessionId: string,
  logData: Omit<FirestoreActivityLog, 'id' | 'createdAt'>
): Promise<string> {
  const logsRef = collection(db, `agencies/${agencyId}/cameraSessions/${sessionId}/activityLogs`);

  const docRef = await addDoc(logsRef, {
    ...logData,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}
*/

/**
 * 실시간 로그 구독 예시
 *
 * useCameraActivityLog.ts에서 useEffect 내에서 호출
 */
/*
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

function subscribeToActivityLogs(
  agencyId: string,
  sessionId: string,
  onLogsUpdate: (logs: FirestoreActivityLog[]) => void
): () => void {
  const logsRef = collection(db, `agencies/${agencyId}/cameraSessions/${sessionId}/activityLogs`);
  const q = query(logsRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FirestoreActivityLog[];

    onLogsUpdate(logs);
  });

  return unsubscribe;
}
*/

/**
 * 포인트 지급 예시
 *
 * handleBinChoice에서 정답 시 호출
 */
/*
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';

async function awardPoints(
  agencyId: string,
  kidId: string,
  sessionId: string,
  roundId: string,
  points: number,
  reason: string
): Promise<void> {
  // 1. 아이의 누적 포인트 증가
  const kidRef = doc(db, `agencies/${agencyId}/kids/${kidId}`);
  await updateDoc(kidRef, {
    totalPoints: increment(points),
  });

  // 2. 포인트 히스토리 추가
  const historyRef = collection(db, `agencies/${agencyId}/kids/${kidId}/pointHistory`);
  await addDoc(historyRef, {
    sessionId,
    roundId,
    pointsDelta: points,
    reason,
    createdAt: serverTimestamp(),
  });
}
*/

/**
 * 반 전체 포인트 지급 예시 (QR OFF 모드)
 */
/*
async function awardClassPoints(
  agencyId: string,
  classId: string,
  points: number
): Promise<void> {
  const classRef = doc(db, `agencies/${agencyId}/classes/${classId}`);
  await updateDoc(classRef, {
    totalPoints: increment(points),
  });
}
*/

/**
 * 세션 종료 예시
 */
/*
async function endCameraSession(agencyId: string, sessionId: string): Promise<void> {
  const sessionRef = doc(db, `agencies/${agencyId}/cameraSessions/${sessionId}`);
  await updateDoc(sessionRef, {
    endedAt: serverTimestamp(),
  });
}
*/

// ============================================================
// 4. 연동 체크리스트
// ============================================================

/**
 * Firestore 연동 시 수정이 필요한 파일들:
 *
 * 1. src/hooks/useCameraActivityLog.ts
 *    - appendLog에서 addDoc 호출 추가
 *    - useEffect에서 onSnapshot 구독 추가
 *    - clearLogs 대신 실제 삭제 로직 (필요시)
 *
 * 2. src/hooks/useCameraGameSession.ts
 *    - startNewRound에서 세션/라운드 문서 생성
 *    - completeRound에서 라운드 결과 업데이트
 *    - resetSession에서 새 세션 문서 생성
 *    - endSession에서 세션 종료 시간 기록
 *
 * 3. src/components/RecycleCameraGame.tsx
 *    - agencyId prop 추가 (또는 Context에서 가져오기)
 *    - 포인트 지급 시 Firestore 업데이트 호출
 *    - QR 인식 시 실제 아이 정보 조회
 *
 * 4. 새로 생성할 파일
 *    - src/services/firestoreCameraSession.ts (위 함수들 구현)
 *    - src/hooks/useKidProfile.ts (QR로 아이 정보 조회)
 */

// ============================================================
// 5. QR 인식 연동
// ============================================================

/**
 * 실제 QR 인식 시 아이 프로필 조회 예시
 *
 * QR 코드에는 kidId 또는 nickname이 인코딩되어 있다고 가정
 */
/*
import { collection, query, where, getDocs } from 'firebase/firestore';

async function getKidByQrData(agencyId: string, qrData: string): Promise<FirestoreKid | null> {
  // QR 데이터가 kidId인 경우
  const kidRef = doc(db, `agencies/${agencyId}/kids/${qrData}`);
  const kidSnap = await getDoc(kidRef);

  if (kidSnap.exists()) {
    return { id: kidSnap.id, ...kidSnap.data() } as FirestoreKid;
  }

  // QR 데이터가 nickname인 경우
  const kidsRef = collection(db, `agencies/${agencyId}/kids`);
  const q = query(kidsRef, where('nickname', '==', qrData));
  const querySnap = await getDocs(q);

  if (!querySnap.empty) {
    const doc = querySnap.docs[0];
    return { id: doc.id, ...doc.data() } as FirestoreKid;
  }

  return null;
}
*/

export {};