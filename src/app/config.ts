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

/**
 * 카메라 기능 활성화 플래그
 *
 * false이면 분리배출 카메라 게임(RecycleCameraGame)과 AI 분리수거
 * 웹캠 화면(WebcamScreen) 진입이 막히고 점검 안내만 표시됩니다.
 * getUserMedia 자체가 호출되지 않습니다.
 *
 * true로 되돌리면 즉시 원래대로 복구됩니다.
 */
export const CAMERA_FEATURE_ENABLED = false;

/**
 * 카메라 기능 점검 중 안내 메시지
 */
export const CAMERA_FEATURE_DISABLED_MESSAGE = '카메라 기능은 현재 점검 중입니다. 곧 다시 만나요!';