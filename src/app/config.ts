/**
 * ============================================================
 * 앱 전역 설정
 * ============================================================
 *
 * DEMO_MODE가 true이면:
 * - Supabase/Firebase 네트워크 호출을 하지 않음
 * - localStorage 기반 mock 데이터 사용
 * - 포인트는 프론트엔드에서만 유지됨
 *
 * DEMO_MODE가 false이면:
 * - 실제 Supabase Edge Function 호출
 * - 실제 Firebase Auth 사용
 *
 * 파일 위치: src/app/config.ts
 */

/**
 * 데모 모드 플래그
 *
 * true: 서버 없이 로컬 데이터로 동작 (개발/시연용)
 * false: 실제 Supabase/Firebase 서버 연결 (운영용)
 */
export const DEMO_MODE = false;

/**
 * 데모 모드 안내 메시지
 */
export const DEMO_MODE_MESSAGE = '현재는 데모 모드입니다. Supabase/Firebase와 실제로 연결되지 않습니다.';