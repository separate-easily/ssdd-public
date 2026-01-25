/**
 * ============================================================
 * 카메라 게임 Phase 정의
 * ============================================================
 *
 * RecycleCameraGame UI의 상태를 나타내는 Phase 타입입니다.
 * 기존 trashMission.ts의 MissionPhase와는 별개로,
 * UI/TTS 흐름을 더 세밀하게 제어하기 위해 사용합니다.
 *
 * 파일 위치: src/domain/cameraGamePhase.ts
 */

// ============================================================
// Phase 타입 정의
// ============================================================

/**
 * 카메라 게임 UI Phase
 *
 * 한 라운드 안에서 UI/TTS가 같은 목적을 위해 움직이는 상태 덩어리
 */
export type CameraGamePhase =
  | 'WAIT_FOR_QR'          // QR 카드 보여달라고 안내
  | 'QR_RECOGNIZING'       // QR 인식 중
  | 'GREET_CHILD'          // 아이 프로필 + 인사
  | 'WAIT_FOR_TRASH'       // 쓰레기 가져다 대기
  | 'TRASH_RECOGNIZING'    // YOLO 분석 중
  | 'WAIT_FOR_BIN_CHOICE'  // 아이가 어디에 버렸는지 관찰/입력 대기 (버튼 모드)
  | 'WAIT_FOR_BIN_SCAN'    // 분리수거함 색상 스캔 대기 (카메라 모드)
  | 'BIN_RECOGNIZING'      // 분리수거함 색상 인식 중
  | 'FEEDBACK_RETRY'       // 오답 - 재시도 기회 안내
  | 'FEEDBACK_CORRECT'     // 정답 피드백 + 포인트 지급
  | 'FEEDBACK_WRONG'       // 오답 피드백 (기회 모두 소진) + 정답 알려주기
  | 'SUMMARY_COOLDOWN';    // 프로필 크게 + 쿨타임 후 다음 라운드

// ============================================================
// Phase 설명 (한글)
// ============================================================

/**
 * Phase에 따른 화면 표시용 한글 설명
 */
export const PHASE_DESCRIPTIONS: Record<CameraGamePhase, string> = {
  WAIT_FOR_QR: '카메라에 카드가 잘 보이게 보여주세요!',
  QR_RECOGNIZING: '카드를 읽고 있어요. 잠시만 기다려 주세요!',
  GREET_CHILD: '친구를 환영해요!',
  WAIT_FOR_TRASH: '이제 버릴 쓰레기를 화면에 잘 보이게 보여주세요!',
  TRASH_RECOGNIZING: '이 쓰레기를 어디로 보내야 할지 생각해 보는 중이에요!',
  WAIT_FOR_BIN_CHOICE: '이제 우리 반 쓰레기통으로 가서, 어디에 버릴지 생각해 보아요!',
  WAIT_FOR_BIN_SCAN: '쓰레기통에 가서 버릴 곳의 색깔을 카메라로 보여주세요!',
  BIN_RECOGNIZING: '쓰레기통 색깔을 확인하고 있어요!',
  FEEDBACK_RETRY: '다시 한 번 생각해볼까요?',
  FEEDBACK_CORRECT: '정답이에요! 잘했어요!',
  FEEDBACK_WRONG: '아쉬워요! 다음에 또 도전해봐요!',
  SUMMARY_COOLDOWN: '오늘도 지구를 지키느라 수고했어요!',
};

// ============================================================
// Phase 전이 관련 유틸리티
// ============================================================

/**
 * QR ON 모드에서의 Phase 전이 순서
 */
export const QR_ON_PHASE_ORDER: CameraGamePhase[] = [
  'WAIT_FOR_QR',
  'QR_RECOGNIZING',
  'GREET_CHILD',
  'WAIT_FOR_TRASH',
  'TRASH_RECOGNIZING',
  'WAIT_FOR_BIN_SCAN',   // 카메라로 분리수거함 색상 스캔
  'BIN_RECOGNIZING',
  // FEEDBACK_CORRECT 또는 FEEDBACK_WRONG 또는 FEEDBACK_RETRY
  'SUMMARY_COOLDOWN',
];

/**
 * QR OFF 모드에서의 Phase 전이 순서
 */
export const QR_OFF_PHASE_ORDER: CameraGamePhase[] = [
  'WAIT_FOR_TRASH',
  'TRASH_RECOGNIZING',
  'WAIT_FOR_BIN_SCAN',   // 카메라로 분리수거함 색상 스캔
  'BIN_RECOGNIZING',
  // FEEDBACK_CORRECT 또는 FEEDBACK_WRONG 또는 FEEDBACK_RETRY
  'SUMMARY_COOLDOWN',
];

/**
 * 다음 라운드 시작 시 초기 Phase 반환
 */
export function getInitialPhase(qrEnabled: boolean): CameraGamePhase {
  return qrEnabled ? 'WAIT_FOR_QR' : 'WAIT_FOR_TRASH';
}

/**
 * Phase가 라운드 종료 상태인지 확인
 */
export function isRoundEndPhase(phase: CameraGamePhase): boolean {
  return phase === 'SUMMARY_COOLDOWN';
}

/**
 * Phase가 피드백 상태인지 확인
 */
export function isFeedbackPhase(phase: CameraGamePhase): boolean {
  return phase === 'FEEDBACK_CORRECT' || phase === 'FEEDBACK_WRONG' || phase === 'FEEDBACK_RETRY';
}