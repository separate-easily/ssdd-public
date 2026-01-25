/**
 * ============================================================
 * 아이 프로필 타입 정의
 * ============================================================
 *
 * QR 카드로 인식된 아이의 프로필 정보입니다.
 * IDCard.tsx의 props를 참고하여 구성했습니다.
 *
 * 파일 위치: src/domain/childProfile.ts
 */

// DEMO_MODE 제거됨 - Supabase만 사용
import { SUPABASE_FUNCTIONS_BASE_URL } from '../../utils/supabase/info';

// ============================================================
// 타입 정의
// ============================================================

/**
 * 아이 프로필 정보
 */
export interface ChildProfile {
  /** 고유 ID (나중에 Firestore의 kidId와 연결) */
  id: string;

  /** 별명 (예: "귀여운 병아리") */
  nickname: string;

  /** 동물 캐릭터 이모지 */
  character: string;

  /** 배경색 클래스 (Tailwind) */
  colorClass: string;

  /** 실제 이름 (선택적) */
  realName?: string;

  /** 소속 반 ID (선택적) */
  classId?: string;

  /** 소속 반 이름 (선택적) */
  className?: string;

  /** 누적 포인트 */
  totalPoints: number;
}

// ============================================================
// 동물 캐릭터 목록 (IDCard.tsx 참고)
// ============================================================

export const ANIMAL_CHARACTERS = [
  { emoji: '🐥', name: '병아리' },
  { emoji: '🐰', name: '토끼' },
  { emoji: '🦊', name: '여우' },
  { emoji: '🐻', name: '곰돌이' },
  { emoji: '🐼', name: '판다' },
  { emoji: '🐨', name: '코알라' },
  { emoji: '🦁', name: '사자' },
  { emoji: '🐯', name: '호랑이' },
  { emoji: '🐸', name: '개구리' },
  { emoji: '🐙', name: '문어' },
  { emoji: '🦋', name: '나비' },
  { emoji: '🐢', name: '거북이' },
] as const;

// ============================================================
// 배경색 목록
// ============================================================

export const PROFILE_COLORS = [
  'bg-gradient-to-br from-pink-300 to-pink-400',
  'bg-gradient-to-br from-blue-300 to-blue-400',
  'bg-gradient-to-br from-green-300 to-green-400',
  'bg-gradient-to-br from-yellow-300 to-yellow-400',
  'bg-gradient-to-br from-purple-300 to-purple-400',
  'bg-gradient-to-br from-orange-300 to-orange-400',
  'bg-gradient-to-br from-cyan-300 to-cyan-400',
  'bg-gradient-to-br from-rose-300 to-rose-400',
] as const;

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 가짜 아이 프로필 생성
 *
 * ⚠️ DEV ONLY - 개발/테스트 전용
 *
 * 이 함수는 메인 운영 플로우(GameScreen → RecycleCameraGame)에서
 * 절대 호출되어서는 안 됩니다.
 *
 * 운영 환경에서 ChildProfile은 반드시 Supabase children 테이블에서
 * 파생되어야 합니다 (mapSupabaseChildToChildProfile 사용).
 *
 * 사용 가능한 경우:
 * - 단위 테스트
 * - Storybook 컴포넌트 미리보기
 * - 개발 중 임시 데이터
 */
export function createFakeChildProfile(qrData?: string): ChildProfile {
  const randomAnimal = ANIMAL_CHARACTERS[Math.floor(Math.random() * ANIMAL_CHARACTERS.length)];
  const randomColor = PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)];

  // QR 데이터가 있으면 해당 데이터를 별명으로 사용
  const nickname = qrData || `귀여운 ${randomAnimal.name}`;

  return {
    id: crypto.randomUUID(),
    nickname,
    character: randomAnimal.emoji,
    colorClass: randomColor,
    totalPoints: Math.floor(Math.random() * 500), // 가짜 누적 포인트
  };
}

/**
 * 프로필 표시용 풀네임 생성
 * 예: "🐥 귀여운 병아리 친구"
 */
export function getProfileDisplayName(profile: ChildProfile): string {
  return `${profile.character} ${profile.nickname} 친구`;
}

// ============================================================
// Supabase Child → ChildProfile 변환 헬퍼
// ============================================================

/**
 * Supabase/AdminDashboard에서 사용하는 Child 타입
 * (GameScreen, AdminDashboard의 Child 인터페이스와 동일)
 */
export interface SupabaseChild {
  qrId: string;
  name: string;
  age: string;
  points: number;
  team?: string;
  institutionName?: string;
}

/**
 * 이름 해시를 기반으로 일관된 캐릭터 선택
 */
function getCharacterFromName(name: string): { emoji: string; name: string } {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ANIMAL_CHARACTERS[hash % ANIMAL_CHARACTERS.length];
}

/**
 * 이름 해시를 기반으로 일관된 색상 선택
 */
function getColorFromName(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PROFILE_COLORS[(hash * 7) % PROFILE_COLORS.length];
}

/**
 * Supabase Child 레코드를 ChildProfile로 변환
 *
 * @param child - Supabase에서 가져온 아이 데이터
 * @returns ChildProfile 도메인 객체
 */
export function mapSupabaseChildToChildProfile(child: SupabaseChild): ChildProfile {
  const animalChar = getCharacterFromName(child.name);

  return {
    id: child.qrId,
    nickname: child.name,
    character: animalChar.emoji,
    colorClass: getColorFromName(child.name),
    totalPoints: child.points || 0,
    classId: child.team,
    className: child.team || child.institutionName,
    realName: child.name,
  };
}

/**
 * Supabase Child 배열을 ChildProfile 배열로 변환
 *
 * @param children - Supabase에서 가져온 아이 배열
 * @returns ChildProfile 배열
 */
export function mapSupabaseChildren(children: SupabaseChild[]): ChildProfile[] {
  return children.map(mapSupabaseChildToChildProfile);
}

/**
 * QR 코드 데이터로 아이 프로필 조회 (mock 버전)
 *
 * 실제 구현 시 Supabase에서 qrId로 조회하도록 변경
 * @param qrData - QR 코드에서 읽은 데이터 (kidId 또는 qrId)
 * @param childList - 현재 로드된 아이 목록
 * @returns 찾은 ChildProfile 또는 null
 */
export function findChildByQrData(
  qrData: string,
  childList: ChildProfile[]
): ChildProfile | null {
  return childList.find((child) => child.id === qrData) || null;
}

// ============================================================
// QR Payload 파싱 (v1: 단순 문자열, 향후 JSON/URL 확장 가능)
// ============================================================

/**
 * QR 코드에서 파싱된 페이로드
 *
 * v1: qrId만 포함 (단순 문자열)
 * 향후 확장 시: { qrId, version, timestamp, ... } 형태로 확장 가능
 */
export interface ParsedQrPayload {
  /** QR 코드에 담긴 고유 ID (= children 테이블의 qrId) */
  qrId: string;
  /** 원본 데이터 (디버깅용) */
  raw: string;
}

/**
 * QR 스캐너에서 받은 raw 문자열을 ParsedQrPayload로 변환
 *
 * v1 구현: 그대로 qrId로 사용
 * 향후 JSON 형식이나 URL 형식 QR 지원 시 이 함수만 수정하면 됨
 *
 * @param rawQrData - QR 스캐너에서 받은 원본 문자열
 * @returns ParsedQrPayload
 */
export function parseQrPayload(rawQrData: string): ParsedQrPayload {
  // v1: 단순 문자열 → qrId로 그대로 사용
  // TODO: JSON 형식 지원 시
  // try {
  //   const parsed = JSON.parse(rawQrData);
  //   return { qrId: parsed.qrId || parsed.id, raw: rawQrData };
  // } catch {}

  return {
    qrId: rawQrData.trim(),
    raw: rawQrData,
  };
}

/**
 * ParsedQrPayload를 이용해 children 배열에서 아이 검색
 *
 * @param payload - parseQrPayload()로 파싱된 페이로드
 * @param childList - Supabase에서 로드한 ChildProfile 배열
 * @returns 찾은 ChildProfile 또는 null (미등록 QR)
 */
export function findChildByQrPayload(
  payload: ParsedQrPayload,
  childList: ChildProfile[]
): ChildProfile | null {
  return childList.find((child) => child.id === payload.qrId) || null;
}

// ============================================================
// Supabase 포인트 업데이트 헬퍼
// ============================================================

/**
 * addPointsToChild 함수의 설정 옵션
 */
export interface AddPointsConfig {
  projectId: string;
  publicAnonKey: string;
  institutionId: string;
}

/**
 * addPointsToChild 함수의 반환 타입
 */
export interface AddPointsResult {
  success: boolean;
  newPoints?: number;
  error?: string;
}

/**
 * Supabase Edge Function을 호출하여 아이의 포인트를 업데이트
 *
 * @param qrId - 아이의 QR ID
 * @param pointsDelta - 추가할 포인트 (양수)
 * @param config - Supabase 연결 설정
 * @returns Promise<AddPointsResult>
 *
 * 주의: 이 함수는 Undo로 롤백되지 않습니다.
 * Undo는 프론트엔드 로그만 롤백하며, DB에 기록된 포인트는 유지됩니다.
 */
export async function addPointsToChild(
  qrId: string,
  pointsDelta: number,
  config: AddPointsConfig
): Promise<AddPointsResult> {
  try {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_BASE_URL}/points/update`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.publicAnonKey}`,
        },
        body: JSON.stringify({
          qrId,
          institutionId: config.institutionId,
          points: pointsDelta,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('[addPointsToChild] 포인트 업데이트 성공:', {
        qrId,
        pointsDelta,
        newPoints: data.newPoints,
      });
      return { success: true, newPoints: data.newPoints };
    } else {
      console.error('[addPointsToChild] 포인트 업데이트 실패:', data);
      return { success: false, error: data.message || 'Unknown error' };
    }
  } catch (error) {
    console.error('[addPointsToChild] 네트워크 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}