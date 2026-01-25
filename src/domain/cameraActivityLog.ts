/**
 * ============================================================
 * 카메라 게임 활동 로그 타입 정의
 * ============================================================
 *
 * 분리배출 카메라 게임의 활동 로그를 저장하기 위한 타입들입니다.
 * 나중에 Firestore의 activityLogs 컬렉션에 그대로 저장될 수 있도록 설계했습니다.
 *
 * 파일 위치: src/domain/cameraActivityLog.ts
 */

// ============================================================
// 기본 타입 정의
// ============================================================

/**
 * 활동 로그 종류 (대분류)
 */
export type ActivityLogKind = 'qr' | 'trash' | 'system' | 'point';

/**
 * 활동 로그 세부 타입
 */
export type ActivityLogSubType =
  | 'QR_DETECTED'       // QR 인식 성공
  | 'QR_FAILED'         // QR 인식 실패
  | 'QR_SKIPPED'        // QR 스킵 (반 전체 모드)
  | 'QR_UNREGISTERED'   // 미등록 QR (children 테이블에 없음)
  | 'CHILD_LOGIN'       // 아이 로그인 (DB에서 프로필 확정)
  | 'CHILD_GREETING'    // 아이 인사
  | 'TRASH_CAPTURED'    // 쓰레기 이미지 캡처
  | 'YOLO_RESULT'       // YOLO 분석 결과
  | 'BIN_CHOSEN'        // 분리배출통 선택
  | 'ROUND_CORRECT'     // 라운드 정답
  | 'ROUND_WRONG'       // 라운드 오답
  | 'POINT_AWARDED'     // 포인트 지급
  | 'ROUND_SUMMARY'     // 라운드 요약
  | 'SESSION_START'     // 세션 시작
  | 'SESSION_END';      // 세션 종료

/**
 * 분리배출통 종류 (5종류)
 */
export type RecycleBinType = 'plastic' | 'paper' | 'vinyl' | 'general' | 'canBotble';

/**
 * 분리배출 카테고리 상세 정보
 */
export interface TrashCategory {
  id: RecycleBinType;
  label: string;
  emoji: string;
  colorClass: string;
  bgClass: string;
  hoverBgClass: string;
}

/**
 * 5종류 분리배출 카테고리 상수
 */
export const TRASH_CATEGORIES: TrashCategory[] = [
  {
    id: 'plastic',
    label: '플라스틱류',
    emoji: '🥤',
    colorClass: 'text-blue-900',
    bgClass: 'bg-blue-300',
    hoverBgClass: 'hover:bg-blue-400',
  },
  {
    id: 'paper',
    label: '종이류',
    emoji: '📰',
    colorClass: 'text-amber-900',
    bgClass: 'bg-amber-300',
    hoverBgClass: 'hover:bg-amber-400',
  },
  {
    id: 'vinyl',
    label: '비닐류',
    emoji: '🛍️',
    colorClass: 'text-purple-900',
    bgClass: 'bg-purple-300',
    hoverBgClass: 'hover:bg-purple-400',
  },
  {
    id: 'general',
    label: '일반쓰레기',
    emoji: '🗑️',
    colorClass: 'text-gray-900',
    bgClass: 'bg-gray-400',
    hoverBgClass: 'hover:bg-gray-500',
  },
  {
    id: 'canBotble',
    label: '캔 및 병류',
    emoji: '🥫',
    colorClass: 'text-emerald-900',
    bgClass: 'bg-emerald-300',
    hoverBgClass: 'hover:bg-emerald-400',
  },
];

/**
 * 분리배출통 한글 라벨
 */
export const BIN_TYPE_LABELS: Record<RecycleBinType, string> = {
  plastic: '플라스틱류',
  paper: '종이류',
  vinyl: '비닐류',
  general: '일반쓰레기',
  canBotble: '캔 및 병류',
};

/**
 * 분리배출통 이모지
 */
export const BIN_TYPE_EMOJIS: Record<RecycleBinType, string> = {
  plastic: '🥤',
  paper: '📰',
  vinyl: '🛍️',
  general: '🗑️',
  canBotble: '🥫',
};

/**
 * YOLO 클래스명 → 분리배출 카테고리 매핑
 *
 * Roboflow 모델(waste-infad-qk5z1/2)의 출력 클래스와 호환됩니다.
 * 새 모델 클래스가 추가되면 이 매핑을 업데이트하세요.
 */
export const YOLO_CLASS_TO_CATEGORY: Record<string, RecycleBinType> = {
  // 플라스틱류
  plastic: 'plastic',
  plastic_bottle: 'plastic',
  plastic_container: 'plastic',
  plastic_cap: 'plastic',
  styrofoam: 'plastic',
  pet: 'plastic',
  bottle: 'plastic',

  // 종이류
  paper: 'paper',
  cardboard: 'paper',
  newspaper: 'paper',
  paper_cup: 'paper',
  paper_box: 'paper',
  box: 'paper',

  // 비닐류
  vinyl: 'vinyl',
  plastic_bag: 'vinyl',
  plastic_wrap: 'vinyl',
  bubble_wrap: 'vinyl',
  bag: 'vinyl',
  film: 'vinyl',

  // 캔 및 병류
  can: 'canBotble',
  aluminum: 'canBotble',
  aluminum_can: 'canBotble',
  glass: 'canBotble',
  glass_bottle: 'canBotble',
  metal: 'canBotble',
  tin: 'canBotble',

  // 일반쓰레기
  trash: 'general',
  general: 'general',
  food_waste: 'general',
  tissue: 'general',
  unknown: 'general',
  other: 'general',
};

/**
 * YOLO 클래스명을 분리배출 카테고리로 변환
 */
export function mapYoloClassToCategory(yoloClass: string): RecycleBinType {
  return YOLO_CLASS_TO_CATEGORY[yoloClass] ?? 'general';
}

// ============================================================
// 활동 로그 엔트리 타입
// ============================================================

/**
 * 카메라 게임 활동 로그 항목
 *
 * Firestore 저장 시:
 * - agencies/{agencyId}/cameraSessions/{sessionId}/activityLogs/{logId}
 */
export interface CameraActivityLogEntry {
  /** 고유 ID */
  id: string;

  /** 세션 ID */
  sessionId: string;

  /** 라운드 ID (세션 내 라운드 식별자) */
  roundId: string;

  /** 생성 시간 (ISO string) */
  createdAt: string;

  /** 로그 종류 (대분류) */
  kind: ActivityLogKind;

  /** 로그 세부 타입 */
  subType: ActivityLogSubType;

  /** 아이 ID (QR ON 모드에서) */
  childId?: string;

  /** 아이 별명 */
  childNickname?: string;

  /** YOLO 인식 라벨 */
  materialLabel?: string;

  /** 추천 배출통 */
  recommendedBin?: RecycleBinType;

  /** 실제 선택한 배출통 */
  chosenBin?: RecycleBinType;

  /** 정답 여부 */
  isCorrect?: boolean;

  /** 포인트 변화량 */
  pointsDelta?: number;

  /** 포인트 지급 후 총 포인트 */
  totalPointsAfter?: number;

  /** 한 줄 요약 메시지 (한국어) */
  message: string;

  /** 확장용 메타데이터 */
  meta?: Record<string, unknown>;
}

// ============================================================
// 로그 종류별 아이콘/색상
// ============================================================

/**
 * 로그 종류별 태그 스타일
 */
export const LOG_KIND_STYLES: Record<ActivityLogKind, { label: string; emoji: string; colorClass: string }> = {
  qr: {
    label: 'QR',
    emoji: '📱',
    colorClass: 'bg-blue-100 text-blue-800',
  },
  trash: {
    label: '쓰레기',
    emoji: '♻️',
    colorClass: 'bg-green-100 text-green-800',
  },
  system: {
    label: '시스템',
    emoji: '⚙️',
    colorClass: 'bg-gray-100 text-gray-800',
  },
  point: {
    label: '포인트',
    emoji: '⭐',
    colorClass: 'bg-yellow-100 text-yellow-800',
  },
};

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 로그 생성 시간을 포맷팅
 * 예: "2024-01-15 (월) 14:32:05"
 */
export function formatLogTime(isoString: string): string {
  const date = new Date(isoString);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[date.getDay()];

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} (${weekday}) ${hh}:${mi}:${ss}`;
}

/**
 * 로그가 YOLO 결과 로그인지 확인
 */
export function isYoloResultLog(log: CameraActivityLogEntry): boolean {
  return log.kind === 'trash' && log.subType === 'YOLO_RESULT';
}

/**
 * 로그가 결과(정답/오답) 로그인지 확인
 */
export function isResultLog(log: CameraActivityLogEntry): boolean {
  return log.subType === 'ROUND_CORRECT' || log.subType === 'ROUND_WRONG';
}