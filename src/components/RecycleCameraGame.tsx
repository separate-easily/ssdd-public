// @ts-nocheck
/* eslint-disable */
/**
 * ============================================================
 * 분리배출 카메라 게임 화면 (확장된 버전)
 * ============================================================
 *
 * Phase 기반 UI/TTS 흐름, QR ON/OFF 모드, 아이 프로필 배지,
 * 활동 로그 패널이 통합된 분리배출 카메라 게임 화면입니다.
 *
 * 나중에 GameScreen에서 selectedGame === 'recycle'일 때
 * 이 컴포넌트를 렌더할 예정입니다.
 *
 * Props로 연동할 때:
 * - qrEnabled?: boolean (기본 true)
 * - onExit?: () => void
 * - classId?: string (반 전체 모드에서 사용)
 *
 * 파일 위치: src/components/RecycleCameraGame.tsx
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWebcam } from '../hooks/useWebcam';
import { useCameraActivityLog } from '../hooks/useCameraActivityLog';
import { useCameraGameSession } from '../hooks/useCameraGameSession';
import {
  analyzeWasteType,
  detectBinColor,
  isCorrectBin,
  getCorrectBinColor,
  getModelIds,
  isColorModelConfigured,
  BIN_COLOR_TO_CATEGORY,
  BIN_COLOR_LABELS,
  BIN_COLOR_EMOJIS,
  type BinColor,
} from '../services/yoloModels';
import {
  speak,
  speakAsync,
  speakForPhase,
  stopSpeaking,
  PHASE_VOICE_MESSAGES,
  CATEGORY_LABELS as TTS_CATEGORY_LABELS,
} from '../services/tts';
import {
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  type MissionCategory,
} from '../domain/trashMission';
import type { CameraGamePhase } from '../domain/cameraGamePhase';
import { PHASE_DESCRIPTIONS, getInitialPhase } from '../domain/cameraGamePhase';
import type { ChildProfile, ParsedQrPayload, AddPointsConfig } from '../domain/childProfile';
import {
  createFakeChildProfile,
  getProfileDisplayName,
  parseQrPayload,
  findChildByQrPayload,
  addPointsToChild,
} from '../domain/childProfile';
import { toast } from 'sonner';
import type { RecycleBinType } from '../domain/cameraActivityLog';
import { BIN_TYPE_LABELS, BIN_TYPE_EMOJIS, TRASH_CATEGORIES } from '../domain/cameraActivityLog';
import {
  createQrDetectedLog,
  createQrSkippedLog,
  createQrUnregisteredLog,
  createChildLoginLog,
  createChildGreetingLog,
  createTrashCapturedLog,
  createYoloResultLog,
  createBinChosenLog,
  createRoundCorrectLog,
  createRoundWrongLog,
  createPointAwardedLog,
  createRoundSummaryLog,
} from '../hooks/useCameraActivityLog';
import { ChildProfileBadge, ClassModeBadge } from './ChildProfileBadge';
import { ActivityLogPanel } from './ActivityLogPanel';
import { SUPABASE_FUNCTIONS_BASE_URL } from '../../utils/supabase/info';
import { Html5Qrcode } from 'html5-qrcode';

// ============================================================
// 컴포넌트 Props
// ============================================================

export interface RecycleCameraGameProps {
  /** 게임 종료 시 호출되는 콜백 (옵션) */
  onExit?: () => void;

  /** QR 인식 모드 초기값 (기본: true) */
  initialQrEnabled?: boolean;

  /** 반 이름 (QR OFF 모드에서 표시) */
  className?: string;

  /** 레이아웃 변형: 'full'=단독 페이지, 'embedded'=GameScreen 내부 임베드 */
  variant?: 'full' | 'embedded';

  /** QR 인식 성공 시 아이 프로필을 조회하는 콜백 (옵션)
   *  - 외부에서 Supabase/Firestore 조회 후 ChildProfile 반환
   *  - 없으면 내부 mock 함수 사용
   */
  onChildLogin?: (qrData: string) => Promise<ChildProfile | null>;

  /** 기관 ID (Supabase 포인트 업데이트용) */
  institutionId?: string;

  /** Supabase 프로젝트 ID */
  projectId?: string;

  /** Supabase Public Anon Key */
  publicAnonKey?: string;

  /** 미리 로드된 children 배열 (GameScreen에서 전달) */
  children?: ChildProfile[];

  /** children 배열 새로고침 콜백 (포인트 업데이트 후 호출) */
  onChildrenRefresh?: () => void;
}

// ============================================================
// 상수
// ============================================================

/** 정답 시 최소 포인트 */
const CORRECT_POINTS_MIN = 60;

/** 정답 시 최대 포인트 */
const CORRECT_POINTS_MAX = 100;

/** 오답 시 최소 포인트 (다시 시도 후 지급) */
const WRONG_POINTS_MIN = 40;

/** 오답 시 최대 포인트 (다시 시도 후 지급) */
const WRONG_POINTS_MAX = 60;

/** 피드백 후 쿨다운 시간 (ms) */
const FEEDBACK_COOLDOWN_MS = 3000;

/** 요약 후 다음 라운드까지 쿨다운 시간 (ms) */
const SUMMARY_COOLDOWN_MS = 4000;

/** 미등록 QR 토스트 표시 시간 (ms) */
const UNREGISTERED_QR_TOAST_DURATION_MS = 4000;

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 정답/오답에 따른 랜덤 포인트 생성
 *
 * @param isCorrect - 정답 여부
 * @returns 지급할 포인트 (정수)
 *
 * 정답: 60~100점 랜덤
 * 오답: 40~60점 랜덤 (질문 후 다시 시도 후 지급)
 */
function getRandomPointsForResult(isCorrect: boolean): number {
  if (isCorrect) {
    return Math.floor(
      Math.random() * (CORRECT_POINTS_MAX - CORRECT_POINTS_MIN + 1) + CORRECT_POINTS_MIN
    );
  } else {
    return Math.floor(
      Math.random() * (WRONG_POINTS_MAX - WRONG_POINTS_MIN + 1) + WRONG_POINTS_MIN
    );
  }
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export function RecycleCameraGame({
  onExit,
  initialQrEnabled = true,
  className = '우리 반',
  variant = 'full',
  onChildLogin,
  institutionId,
  projectId,
  publicAnonKey,
  children: childrenProp,
  onChildrenRefresh,
}: RecycleCameraGameProps) {
  // variant에 따른 레이아웃 분기
  const isEmbedded = variant === 'embedded';
  // ============================================================
  // 상태 관리
  // ============================================================

  // QR ON/OFF 모드
  const [qrEnabled, setQrEnabled] = useState(initialQrEnabled);

  // UI Phase
  const [phase, setPhase] = useState<CameraGamePhase>(() =>
    getInitialPhase(initialQrEnabled)
  );

  // 현재 라운드의 아이 프로필 (QR ON 모드)
  const [currentChild, setCurrentChild] = useState<ChildProfile | null>(null);

  // YOLO 결과 상태
  const [yoloResult, setYoloResult] = useState<{
    label: string;
    category: MissionCategory;
    recommendedBin: RecycleBinType;
    confidence: number;
  } | null>(null);

  // 선택한 분리배출통 (버튼 모드)
  const [chosenBin, setChosenBin] = useState<RecycleBinType | null>(null);

  // 감지된 분리수거함 색상 (카메라 모드)
  const [detectedBinColor, setDetectedBinColor] = useState<BinColor | null>(null);

  // 현재 라운드 정답 여부
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // 시도 횟수 (틀릴 때마다 증가, 최대 2회 추가 기회)
  const [attemptCount, setAttemptCount] = useState(0);

  // 반 전체 포인트 (QR OFF 모드)
  const [classPoints, setClassPoints] = useState(0);

  // 마지막 지급 포인트 (피드백 화면 표시용)
  const [lastAwardedPoints, setLastAwardedPoints] = useState(0);

  // 총 점수 및 통계
  const [totalScore, setTotalScore] = useState(0);
  const [roundCount, setRoundCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);

  // QR 스캐너 상태
  const [showQrScanner, setShowQrScanner] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  // processQrData ref (startQrScanner보다 나중에 정의되므로 ref 필요)
  const processQrDataRef = useRef<((qrData: string) => Promise<void>) | null>(null);

  // ============================================================
  // 훅 사용
  // ============================================================

  // 카메라 훅
  const { videoRef, isReady, error, captureFrame } = useWebcam();

  // 세션/라운드 관리
  const { session, currentRoundId, startNewRound, completeRound, resetSession } =
    useCameraGameSession();

  // 활동 로그
  const { logs, appendLog, clearLogs, undoLastLog } = useCameraActivityLog(session.sessionId);

  // 분석 중 플래그
  const isAnalyzing = phase === 'QR_RECOGNIZING' || phase === 'TRASH_RECOGNIZING' || phase === 'BIN_RECOGNIZING';

  // SUMMARY_COOLDOWN 진입 감지용 (중복 실행 방지)
  const prevPhaseRef = useRef<CameraGamePhase | null>(null);

  // ============================================================
  // Phase 변화 디버그 로그
  // ============================================================

  useEffect(() => {
    console.log('[RecycleCameraGame] phase:', phase, {
      qrEnabled,
      currentChild: currentChild?.nickname,
      yoloResult: yoloResult?.label,
    });
  }, [phase, qrEnabled, currentChild, yoloResult]);

  // ============================================================
  // Phase 변화 시 TTS 처리 (phase가 변경될 때만 실행)
  // ============================================================

  const prevPhaseForTTSRef = useRef<CameraGamePhase | null>(null);

  useEffect(() => {
    // Phase가 실제로 변경된 경우에만 TTS 발화
    if (prevPhaseForTTSRef.current === phase) {
      return;
    }
    prevPhaseForTTSRef.current = phase;

    // 이전 발화 중지 (새 Phase로 넘어갈 때)
    stopSpeaking();

    // Phase에 맞는 TTS 발화
    speakForPhase(phase, {
      nickname: currentChild?.nickname,
      category: yoloResult?.category,
      binColor: detectedBinColor ?? undefined,
      correctColor: yoloResult ? getCorrectBinColor(yoloResult.category) : undefined,
    });
  }, [phase, currentChild, yoloResult, detectedBinColor]);

  // ============================================================
  // 피드백 → 요약 → 다음 라운드 자동 전이
  // ============================================================

  useEffect(() => {
    if (phase === 'FEEDBACK_CORRECT' || phase === 'FEEDBACK_WRONG') {
      const timer = setTimeout(() => {
        setPhase('SUMMARY_COOLDOWN');
      }, FEEDBACK_COOLDOWN_MS);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // ============================================================
  // 다음 라운드 시작
  // ============================================================

  const startNextRound = useCallback(() => {
    const newRoundId = startNewRound();
    setCurrentChild(null);
    setYoloResult(null);
    setChosenBin(null);
    setDetectedBinColor(null);
    setIsCorrect(null);

    // QR ON/OFF에 따른 초기 Phase
    const initialPhase = getInitialPhase(qrEnabled);
    setPhase(initialPhase);

    // QR OFF 모드면 스킵 로그
    if (!qrEnabled) {
      appendLog(createQrSkippedLog(newRoundId));
    }

    console.log('[RecycleCameraGame] 다음 라운드 시작:', {
      roundId: newRoundId,
      qrEnabled,
      initialPhase,
    });
  }, [qrEnabled, startNewRound, appendLog]);

  // ============================================================
  // SUMMARY_COOLDOWN → 요약 로그 + 다음 라운드 전이
  // (startNextRound 선언 이후에 위치해야 TDZ 오류 방지)
  // ============================================================

  useEffect(() => {
    // SUMMARY_COOLDOWN에 "처음 진입"할 때만 실행
    const isEnteringSummary =
      prevPhaseRef.current !== 'SUMMARY_COOLDOWN' && phase === 'SUMMARY_COOLDOWN';

    if (isEnteringSummary) {
      // 현재 시점의 값들을 캡처
      const summaryRoundId = currentRoundId;
      const summaryIsCorrect = isCorrect ?? false;
      const summaryChildId = currentChild?.id;
      const summaryChildNickname = currentChild?.nickname;

      // 라운드 요약 로그
      appendLog(
        createRoundSummaryLog(
          summaryRoundId,
          summaryIsCorrect,
          summaryChildId,
          summaryChildNickname
        )
      );

      console.log('[RecycleCameraGame] SUMMARY_COOLDOWN 진입 - 요약 로그 생성');

      const timer = setTimeout(() => {
        // 다음 라운드 시작
        startNextRound();
      }, SUMMARY_COOLDOWN_MS);

      // cleanup 전에 prevPhaseRef 업데이트
      prevPhaseRef.current = phase;

      return () => clearTimeout(timer);
    }

    // SUMMARY_COOLDOWN이 아닌 경우에만 prevPhaseRef 업데이트
    prevPhaseRef.current = phase;
  }, [phase, currentRoundId, isCorrect, currentChild, appendLog, startNextRound]);

  // ============================================================
  // QR 인식 처리
  // ============================================================

  // QR 스캐너 시작
  const startQrScanner = useCallback(() => {
    setShowQrScanner(true);

    // DOM이 렌더링된 후 스캐너 시작
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('qr-reader-game');
        qrScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' }, // 후면 카메라
          {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            // QR 인식 성공
            console.log('[QR Scanner] 인식 성공:', decodedText);
            html5QrCode.stop().then(() => {
              qrScannerRef.current = null;
              setShowQrScanner(false);
              // ref를 통해 최신 processQrData 호출
              processQrDataRef.current?.(decodedText);
            });
          },
          (errorMessage: string) => {
            // QR 인식 실패 (무시 - 계속 스캔 시도)
          }
        );
      } catch (error) {
        console.error('[QR Scanner] 시작 실패:', error);
        toast.error('카메라를 시작할 수 없습니다', {
          description: '카메라 권한을 확인해주세요.',
        });
        setShowQrScanner(false);
      }
    }, 100);
  }, []);

  // QR 스캐너 중지
  const stopQrScanner = useCallback(() => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop().then(() => {
        qrScannerRef.current = null;
      }).catch((err) => {
        console.error('[QR Scanner] 중지 실패:', err);
      });
    }
    setShowQrScanner(false);
  }, []);

  // QR 데이터 처리
  const processQrData = useCallback(async (qrData: string) => {
    setPhase('QR_RECOGNIZING');

    // QR 페이로드 파싱
    const payload = parseQrPayload(qrData);

    let child: ChildProfile | null = null;

    // 1) childrenProp 배열에서 검색
    if (childrenProp && childrenProp.length > 0) {
      child = findChildByQrPayload(payload, childrenProp);
    }

    // 2) 외부 onChildLogin 콜백으로 추가 조회
    if (!child && onChildLogin) {
      try {
        child = await onChildLogin(payload.qrId);
      } catch (error) {
        console.error('[RecycleCameraGame] onChildLogin 오류:', error);
      }
    }

    // 3) 아이를 찾지 못한 경우 (미등록 QR)
    if (!child) {
      toast.error('등록되지 않은 카드입니다', {
        description: '이번 라운드는 반 전체 포인트로 적립됩니다.',
        duration: UNREGISTERED_QR_TOAST_DURATION_MS,
      });

      console.warn('[RecycleCameraGame] 미등록 QR:', payload.qrId);
      appendLog(createQrUnregisteredLog(currentRoundId, payload.qrId));
      setCurrentChild(null);
      setPhase('WAIT_FOR_TRASH');
      return;
    }

    // 4) 아이를 찾은 경우 - 정상 흐름
    setCurrentChild(child);

    // 로그 기록
    appendLog(createQrDetectedLog(currentRoundId, child.id, child.nickname));
    appendLog(createChildLoginLog(currentRoundId, child.id, child.nickname, child.totalPoints));

    // DB에 로그인 로그 저장 (비동기)
    if (institutionId && publicAnonKey) {
      fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/activity-log/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          childQrId: child.id,
          institutionId,
          sessionId: session.sessionId,
          roundId: currentRoundId,
          logType: 'login',
          pointsDelta: 0,
        }),
      }).catch((err) => console.error('[processQrData] 로그인 로그 저장 실패:', err));
    }

    // GREET_CHILD로 전이
    setPhase('GREET_CHILD');
    appendLog(createChildGreetingLog(currentRoundId, child.id, child.nickname));

    // 잠시 후 쓰레기 대기로 전이
    setTimeout(() => {
      setPhase('WAIT_FOR_TRASH');
    }, 2500);
  }, [currentRoundId, appendLog, onChildLogin, childrenProp, institutionId, publicAnonKey, session.sessionId]);

  // ref에 최신 processQrData 할당 (startQrScanner에서 사용)
  processQrDataRef.current = processQrData;

  // 기존 handleQrScan은 startQrScanner를 호출하도록 변경
  const handleQrScan = useCallback(() => {
    if (!qrEnabled) return;
    startQrScanner();
  }, [qrEnabled, startQrScanner]);

  // ============================================================
  // 쓰레기 촬영 및 YOLO 분석
  // ============================================================

  const handleCaptureAndAnalyze = useCallback(async () => {
    if (phase !== 'WAIT_FOR_TRASH' || !isReady) return;

    // 캡처 로그
    appendLog(
      createTrashCapturedLog(currentRoundId, currentChild?.id, currentChild?.nickname)
    );

    setPhase('TRASH_RECOGNIZING');

    // 프레임 캡처
    const frame = captureFrame();
    if (!frame) {
      console.error('[RecycleCameraGame] 프레임 캡처 실패');
      setPhase('WAIT_FOR_TRASH');
      return;
    }

    // Roboflow API 또는 Mock YOLO 분석
    const result = await analyzeWasteType(frame);

    console.log('[RecycleCameraGame] 쓰레기 분석 결과:', {
      category: result.category,
      rawClass: result.rawClass,
      confidence: result.confidence.toFixed(2),
      isRealApi: result.isRealApi,
      modelIds: getModelIds(),
    });

    // YOLO 결과 저장
    const yolo = {
      label: CATEGORY_LABELS[result.category],
      category: result.category,
      recommendedBin: result.category as RecycleBinType,
      confidence: result.confidence,
    };
    setYoloResult(yolo);

    // YOLO 결과 로그
    appendLog(
      createYoloResultLog(
        currentRoundId,
        yolo.label,
        yolo.recommendedBin,
        yolo.confidence,
        currentChild?.id,
        currentChild?.nickname
      )
    );

    // 분리수거함 색상 스캔 대기로 전이
    setPhase('WAIT_FOR_BIN_SCAN');
  }, [phase, isReady, currentRoundId, currentChild, captureFrame, appendLog]);

  // ============================================================
  // DB 활동 로그 저장 헬퍼
  // ============================================================

  const saveActivityLogToDB = useCallback(
    async (logData: {
      logType: 'login' | 'logout' | 'trash_correct' | 'trash_wrong';
      materialLabel?: string;
      recommendedBin?: string;
      chosenBin?: string;
      pointsDelta?: number;
      isCorrect?: boolean;
    }) => {
      if (!institutionId || !publicAnonKey || !currentChild) {
        console.log('[saveActivityLogToDB] 필수 정보 없음 - DB 저장 스킵');
        return;
      }

      try {
        const response = await fetch(
          `${SUPABASE_FUNCTIONS_BASE_URL}/activity-log/save`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              childQrId: currentChild.id,
              institutionId,
              sessionId: session.sessionId,
              roundId: currentRoundId,
              logType: logData.logType,
              materialLabel: logData.materialLabel || null,
              recommendedBin: logData.recommendedBin || null,
              chosenBin: logData.chosenBin || null,
              pointsDelta: logData.pointsDelta || 0,
              isCorrect: logData.isCorrect ?? null,
            }),
          }
        );

        const data = await response.json();
        if (data.success) {
          console.log('[saveActivityLogToDB] 로그 저장 성공:', data.log.id);
        } else {
          console.error('[saveActivityLogToDB] 로그 저장 실패:', data.message);
        }
      } catch (error) {
        console.error('[saveActivityLogToDB] 로그 저장 예외:', error);
      }
    },
    [institutionId, publicAnonKey, currentChild, session.sessionId, currentRoundId]
  );

  // ============================================================
  // 분리수거함 색상 스캔 (카메라 모드)
  // ============================================================

  const handleBinScan = useCallback(async () => {
    if (phase !== 'WAIT_FOR_BIN_SCAN' || !isReady || !yoloResult) return;

    setPhase('BIN_RECOGNIZING');

    // 프레임 캡처
    const frame = captureFrame();
    if (!frame) {
      console.error('[RecycleCameraGame] 분리수거함 프레임 캡처 실패');
      setPhase('WAIT_FOR_BIN_SCAN');
      return;
    }

    // 색상 감지 API 호출
    const colorResult = await detectBinColor(frame);

    console.log('[RecycleCameraGame] 분리수거함 색상 감지 결과:', {
      color: colorResult.color,
      rawClass: colorResult.rawClass,
      confidence: colorResult.confidence.toFixed(2),
      isRealApi: colorResult.isRealApi,
    });

    setDetectedBinColor(colorResult.color);

    // 색상 → 카테고리 변환
    const chosenCategory = BIN_COLOR_TO_CATEGORY[colorResult.color];
    setChosenBin(chosenCategory);

    // 선택 로그
    appendLog(
      createBinChosenLog(currentRoundId, chosenCategory, currentChild?.id, currentChild?.nickname)
    );

    // 정답 여부 판정
    const correct = isCorrectBin(yoloResult.category, colorResult.color);

    // === 정답인 경우 ===
    if (correct) {
      setIsCorrect(true);

      // 랜덤 포인트 계산 (정답: 60~100)
      const pointsDelta = getRandomPointsForResult(true);
      setLastAwardedPoints(pointsDelta);

      // 통계 업데이트
      setRoundCount((prev) => prev + 1);
      setSuccessCount((prev) => prev + 1);
      setTotalScore((prev) => prev + pointsDelta);

      // 정답 로그
      appendLog(
        createRoundCorrectLog(currentRoundId, currentChild?.id, currentChild?.nickname)
      );

      // 포인트 지급
      const pointsBefore = currentChild?.totalPoints ?? classPoints;
      const pointsAfter = pointsBefore + pointsDelta;

      if (currentChild) {
        setCurrentChild((prev) =>
          prev ? { ...prev, totalPoints: pointsAfter } : null
        );

        if (projectId && publicAnonKey && institutionId) {
          const config: AddPointsConfig = {
            projectId,
            publicAnonKey,
            institutionId,
          };

          addPointsToChild(currentChild.id, pointsDelta, config)
            .then((result) => {
              if (result.success) {
                console.log('[handleBinScan] Supabase 포인트 업데이트 성공:', result.newPoints);
                onChildrenRefresh?.();
              } else {
                console.error('[handleBinScan] Supabase 포인트 업데이트 실패:', result.error);
                toast.error('포인트 저장 실패', {
                  description: '네트워크 오류로 포인트가 저장되지 않았습니다.',
                  duration: 3000,
                });
              }
            })
            .catch((err) => {
              console.error('[handleBinScan] Supabase 포인트 업데이트 예외:', err);
            });
        }
      } else {
        setClassPoints(pointsAfter);
      }

      // 포인트 지급 로그
      appendLog(
        createPointAwardedLog(
          currentRoundId,
          pointsDelta,
          pointsAfter,
          currentChild?.id,
          currentChild?.nickname
        )
      );

      // DB에 활동 로그 저장
      saveActivityLogToDB({
        logType: 'trash_correct',
        materialLabel: yoloResult.label,
        recommendedBin: yoloResult.recommendedBin,
        chosenBin: chosenCategory,
        pointsDelta,
        isCorrect: true,
      });

      // Phase 전이
      setPhase('FEEDBACK_CORRECT');
      completeRound(true);
      setAttemptCount(0);

    // === 오답인 경우 ===
    } else {
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);

      // 아직 기회가 남아있는 경우 (최대 2회 추가 기회)
      if (newAttemptCount < 3) {
        // 재시도 안내 (TTS는 speakForPhase에서 자동 처리)
        setPhase('FEEDBACK_RETRY' as CameraGamePhase);

        // 5초 후 다시 스캔 대기로 (TTS 발화 시간 고려)
        setTimeout(() => {
          setPhase('WAIT_FOR_BIN_SCAN');
        }, 5000);

      // === 기회 모두 소진 (3번 다 틀림) ===
      } else {
        setIsCorrect(false);

        // 랜덤 포인트 계산 (오답: 40~60)
        const pointsDelta = getRandomPointsForResult(false);
        setLastAwardedPoints(pointsDelta);

        // 통계 업데이트
        setRoundCount((prev) => prev + 1);
        setTotalScore((prev) => prev + pointsDelta);

        // 오답 로그
        appendLog(
          createRoundWrongLog(currentRoundId, currentChild?.id, currentChild?.nickname)
        );

        // 포인트 지급
        const pointsBefore = currentChild?.totalPoints ?? classPoints;
        const pointsAfter = pointsBefore + pointsDelta;

        if (currentChild) {
          setCurrentChild((prev) =>
            prev ? { ...prev, totalPoints: pointsAfter } : null
          );

          if (projectId && publicAnonKey && institutionId) {
            const config: AddPointsConfig = {
              projectId,
              publicAnonKey,
              institutionId,
            };

            addPointsToChild(currentChild.id, pointsDelta, config)
              .then((result) => {
                if (result.success) {
                  onChildrenRefresh?.();
                }
              })
              .catch((err) => {
                console.error('[handleBinScan] 포인트 업데이트 예외:', err);
              });
          }
        } else {
          setClassPoints(pointsAfter);
        }

        // 포인트 지급 로그
        appendLog(
          createPointAwardedLog(
            currentRoundId,
            pointsDelta,
            pointsAfter,
            currentChild?.id,
            currentChild?.nickname
          )
        );

        // DB에 활동 로그 저장
        saveActivityLogToDB({
          logType: 'trash_wrong',
          materialLabel: yoloResult.label,
          recommendedBin: yoloResult.recommendedBin,
          chosenBin: chosenCategory,
          pointsDelta,
          isCorrect: false,
        });

        // Phase 전이 (TTS는 speakForPhase에서 자동 처리)
        setPhase('FEEDBACK_WRONG');
        completeRound(false);
        setAttemptCount(0);
      }
    }
  }, [
    phase,
    isReady,
    yoloResult,
    currentRoundId,
    currentChild,
    classPoints,
    attemptCount,
    captureFrame,
    appendLog,
    completeRound,
    projectId,
    publicAnonKey,
    institutionId,
    onChildrenRefresh,
    saveActivityLogToDB,
  ]);

  // ============================================================
  // 분리배출통 선택 (버튼 모드 - 폴백)
  // ============================================================

  const handleBinChoice = useCallback(
    async (bin: RecycleBinType) => {
      if (phase !== 'WAIT_FOR_BIN_CHOICE' || !yoloResult) return;

      setChosenBin(bin);

      // 선택 로그
      appendLog(
        createBinChosenLog(currentRoundId, bin, currentChild?.id, currentChild?.nickname)
      );

      // 정답 여부 판정
      const correct = bin === yoloResult.recommendedBin;

      // === 정답인 경우 ===
      if (correct) {
        setIsCorrect(true);

        // 랜덤 포인트 계산 (정답: 60~100)
        const pointsDelta = getRandomPointsForResult(true);
        setLastAwardedPoints(pointsDelta);

        // 통계 업데이트
        setRoundCount((prev) => prev + 1);
        setSuccessCount((prev) => prev + 1);
        setTotalScore((prev) => prev + pointsDelta);

        // 정답 로그
        appendLog(
          createRoundCorrectLog(currentRoundId, currentChild?.id, currentChild?.nickname)
        );

        // 포인트 지급
        const pointsBefore = currentChild?.totalPoints ?? classPoints;
        const pointsAfter = pointsBefore + pointsDelta;

        if (currentChild) {
          setCurrentChild((prev) =>
            prev ? { ...prev, totalPoints: pointsAfter } : null
          );

          if (projectId && publicAnonKey && institutionId) {
            const config: AddPointsConfig = {
              projectId,
              publicAnonKey,
              institutionId,
            };

            addPointsToChild(currentChild.id, pointsDelta, config)
              .then((result) => {
                if (result.success) {
                  console.log('[handleBinChoice] Supabase 포인트 업데이트 성공:', result.newPoints);
                  onChildrenRefresh?.();
                } else {
                  console.error('[handleBinChoice] Supabase 포인트 업데이트 실패:', result.error);
                  toast.error('포인트 저장 실패', {
                    description: '네트워크 오류로 포인트가 저장되지 않았습니다.',
                    duration: 3000,
                  });
                }
              })
              .catch((err) => {
                console.error('[handleBinChoice] Supabase 포인트 업데이트 예외:', err);
              });
          }
        } else {
          setClassPoints(pointsAfter);
        }

        // 포인트 지급 로그
        appendLog(
          createPointAwardedLog(
            currentRoundId,
            pointsDelta,
            pointsAfter,
            currentChild?.id,
            currentChild?.nickname
          )
        );

        // DB에 활동 로그 저장
        saveActivityLogToDB({
          logType: 'trash_correct',
          materialLabel: yoloResult.label,
          recommendedBin: yoloResult.recommendedBin,
          chosenBin: bin,
          pointsDelta,
          isCorrect: true,
        });

        // Phase 전이
        setPhase('FEEDBACK_CORRECT');
        completeRound(true);
        setAttemptCount(0); // 시도 횟수 초기화

      // === 오답인 경우 ===
      } else {
        const newAttemptCount = attemptCount + 1;
        setAttemptCount(newAttemptCount);

        // 아직 기회가 남아있는 경우 (최대 2회 추가 기회)
        if (newAttemptCount < 3) {
          // 재시도 안내 (TTS는 speakForPhase에서 자동 처리)
          setPhase('FEEDBACK_RETRY' as CameraGamePhase);

          // 5초 후 다시 선택 화면으로 (TTS 발화 시간 고려)
          setTimeout(() => {
            setPhase('WAIT_FOR_BIN_CHOICE');
          }, 5000);

        // === 기회 모두 소진 (3번 다 틀림) ===
        } else {
          setIsCorrect(false);

          // 랜덤 포인트 계산 (오답: 40~60)
          const pointsDelta = getRandomPointsForResult(false);
          setLastAwardedPoints(pointsDelta);

          // 통계 업데이트
          setRoundCount((prev) => prev + 1);
          setTotalScore((prev) => prev + pointsDelta);

          // 오답 로그
          appendLog(
            createRoundWrongLog(currentRoundId, currentChild?.id, currentChild?.nickname)
          );

          // 포인트 지급
          const pointsBefore = currentChild?.totalPoints ?? classPoints;
          const pointsAfter = pointsBefore + pointsDelta;

          if (currentChild) {
            setCurrentChild((prev) =>
              prev ? { ...prev, totalPoints: pointsAfter } : null
            );

            if (projectId && publicAnonKey && institutionId) {
              const config: AddPointsConfig = {
                projectId,
                publicAnonKey,
                institutionId,
              };

              addPointsToChild(currentChild.id, pointsDelta, config)
                .then((result) => {
                  if (result.success) {
                    onChildrenRefresh?.();
                  }
                })
                .catch((err) => {
                  console.error('[handleBinChoice] 포인트 업데이트 예외:', err);
                });
            }
          } else {
            setClassPoints(pointsAfter);
          }

          // 포인트 지급 로그
          appendLog(
            createPointAwardedLog(
              currentRoundId,
              pointsDelta,
              pointsAfter,
              currentChild?.id,
              currentChild?.nickname
            )
          );

          // DB에 활동 로그 저장
          saveActivityLogToDB({
            logType: 'trash_wrong',
            materialLabel: yoloResult.label,
            recommendedBin: yoloResult.recommendedBin,
            chosenBin: bin,
            pointsDelta,
            isCorrect: false,
          });

          // Phase 전이 (TTS는 speakForPhase에서 자동 처리)
          setPhase('FEEDBACK_WRONG');
          completeRound(false);
          setAttemptCount(0); // 시도 횟수 초기화
        }
      }
    },
    [
      phase,
      yoloResult,
      currentRoundId,
      currentChild,
      classPoints,
      attemptCount,
      appendLog,
      completeRound,
      projectId,
      publicAnonKey,
      institutionId,
      onChildrenRefresh,
      saveActivityLogToDB,
    ]
  );

  // ============================================================
  // QR 토글
  // ============================================================

  const handleQrToggle = useCallback(() => {
    setQrEnabled((prev) => !prev);
  }, []);

  // ============================================================
  // 게임 초기화
  // ============================================================

  const handleReset = useCallback(() => {
    // 1) 세션 훅 쪽 상태(세션 ID, 라운드 ID, 카운터 등) 완전 리셋
    resetSession();

    // 2) UI/점수/로그 리셋
    setCurrentChild(null);
    setYoloResult(null);
    setChosenBin(null);
    setDetectedBinColor(null);
    setIsCorrect(null);
    setTotalScore(0);
    setRoundCount(0);
    setSuccessCount(0);
    setClassPoints(0);
    setLastAwardedPoints(0);
    clearLogs();

    // 3) prevPhaseRef도 초기화 (SUMMARY_COOLDOWN 중복 방지용)
    prevPhaseRef.current = null;

    const initialPhase = getInitialPhase(qrEnabled);
    setPhase(initialPhase);

    console.log('[RecycleCameraGame] 게임 초기화 (새 세션 시작)');
  }, [qrEnabled, clearLogs, resetSession]);

  // ============================================================
  // 렌더링
  // ============================================================

  // variant에 따른 루트 컨테이너 클래스
  const containerClassName = isEmbedded
    ? 'w-full h-full flex flex-col p-2 md:p-4 overflow-y-auto'
    : 'min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-green-50 p-4 md:p-6 flex flex-col overflow-y-auto';

  // variant에 따른 헤더 마진
  const headerMarginClass = isEmbedded ? 'mb-2' : 'mb-4';

  return (
    <div className={containerClassName}>
      {/* ==================== 상단: 제목 및 QR 토글 ==================== */}
      <header className={`flex items-center justify-between ${headerMarginClass}`}>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-green-600 bg-clip-text text-transparent">
            ♻️ 올바른 분리배출 게임
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            쓰레기를 화면에 보여주고 올바른 분리배출을 하면 포인트가 쌓여요!
          </p>
        </div>

        {/* QR ON/OFF iOS 스타일 토글 */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">QR 카드 모드</span>
          <button
            role="switch"
            aria-checked={qrEnabled}
            onClick={handleQrToggle}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              qrEnabled ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                qrEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-semibold min-w-[28px] ${qrEnabled ? 'text-green-600' : 'text-gray-500'}`}>
            {qrEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </header>

      {/* ==================== 중앙: 메인 컨텐츠 ==================== */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto w-full">
        {/* ---------- 왼쪽: 카메라 미리보기 ---------- */}
        <div className="flex-1 flex flex-col">
          <div className="relative bg-black rounded-xl shadow-md overflow-hidden aspect-video">
            {/* 비디오 엘리먼트 (거울 모드: scaleX(-1)) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* 좌상단: 프로필 배지 */}
            <div className="absolute top-4 left-4 z-10">
              {qrEnabled && currentChild ? (
                <ChildProfileBadge profile={currentChild} size="small" />
              ) : !qrEnabled ? (
                <ClassModeBadge
                  className={className}
                  totalPoints={classPoints}
                  size="small"
                />
              ) : null}
            </div>

            {/* 우상단: QR 인식 버튼 (QR 모드 ON일 때 항상 표시) */}
            {qrEnabled && !showQrScanner && !isAnalyzing && phase !== 'GREET_CHILD' && phase !== 'FEEDBACK_RETRY' && phase !== 'FEEDBACK_CORRECT' && phase !== 'FEEDBACK_WRONG' && phase !== 'SUMMARY_COOLDOWN' && (
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={startQrScanner}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:from-blue-600 hover:to-purple-600 transition-all hover:scale-105 flex items-center gap-2"
                >
                  <span className="text-lg">📱</span>
                  <span className="text-sm">QR 인식</span>
                </button>
              </div>
            )}

            {/* 카메라 에러 표시 */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                <div className="text-center text-white p-4">
                  <p className="text-xl mb-2">📷 카메라 오류</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
              </div>
            )}

            {/* 카메라 로딩 표시 */}
            {!isReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                <div className="text-center text-white">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p>카메라 연결 중...</p>
                </div>
              </div>
            )}

            {/* 분석 중 오버레이 */}
            {isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center text-white">
                  <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-xl font-bold">
                    {phase === 'QR_RECOGNIZING'
                      ? '카드 읽는 중...'
                      : phase === 'BIN_RECOGNIZING'
                      ? '쓰레기통 색깔 확인 중...'
                      : 'AI가 쓰레기를 분석 중...'}
                  </p>
                </div>
              </div>
            )}

            {/* 인사 오버레이 */}
            {phase === 'GREET_CHILD' && currentChild && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-500/80 to-green-500/80">
                <div className="text-center text-white p-8">
                  <span className="text-8xl drop-shadow-xl animate-bounce">
                    {currentChild.character}
                  </span>
                  <p className="text-3xl font-bold mt-4 drop-shadow-md">
                    {currentChild.nickname} 친구 반가워요!
                  </p>
                  <p className="text-lg mt-2 opacity-90">
                    오늘도 지구와 평택시를 지켜볼까요?
                  </p>
                </div>
              </div>
            )}

            {/* 재시도 안내 오버레이 */}
            {phase === 'FEEDBACK_RETRY' && (
              <div className="absolute inset-0 flex items-center justify-center bg-yellow-500/80">
                <div className="text-center text-white p-8">
                  <span className="text-8xl drop-shadow-xl">🤔</span>
                  <p className="text-2xl font-bold mt-4 drop-shadow-md">
                    다시 한 번 생각해볼까요?
                  </p>
                  <p className="text-lg mt-2 opacity-90">
                    쓰레기가 어떻게 생겼는지 잘 살펴보세요!
                  </p>
                  <p className="text-sm mt-3 opacity-70">
                    남은 기회: {3 - attemptCount}회
                  </p>
                </div>
              </div>
            )}

            {/* 정답 피드백 오버레이 */}
            {phase === 'FEEDBACK_CORRECT' && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/80">
                <div className="text-center text-white p-8">
                  <span className="text-8xl drop-shadow-xl">🎉</span>
                  <p className="text-3xl font-bold mt-4 drop-shadow-md">
                    정답이에요!
                  </p>
                  {detectedBinColor && (
                    <p className="text-lg mt-2 opacity-90">
                      {BIN_COLOR_EMOJIS[detectedBinColor]} {BIN_COLOR_LABELS[detectedBinColor]} 쓰레기통에 잘 버렸어요!
                    </p>
                  )}
                  <p className="text-xl mt-2">+{lastAwardedPoints}점!</p>
                </div>
              </div>
            )}

            {/* 오답 피드백 오버레이 (기회 모두 소진) */}
            {phase === 'FEEDBACK_WRONG' && (
              <div className="absolute inset-0 flex items-center justify-center bg-orange-500/80">
                <div className="text-center text-white p-8">
                  <span className="text-8xl drop-shadow-xl">😢</span>
                  <p className="text-2xl font-bold mt-4 drop-shadow-md">
                    아쉬워요!
                  </p>
                  {yoloResult && (
                    <p className="text-lg mt-2">
                      정답은{' '}
                      <span className="font-bold underline">
                        {BIN_COLOR_EMOJIS[getCorrectBinColor(yoloResult.category)]}{' '}
                        {BIN_COLOR_LABELS[getCorrectBinColor(yoloResult.category)]} 쓰레기통
                      </span>
                      이었어요
                    </p>
                  )}
                  <p className="text-xl mt-3">+{lastAwardedPoints}점!</p>
                  <p className="text-sm mt-2 opacity-70">다음엔 꼭 맞출 수 있어요!</p>
                </div>
              </div>
            )}

            {/* 요약 오버레이 */}
            {phase === 'SUMMARY_COOLDOWN' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500/80 to-pink-500/80">
                <div className="text-center text-white p-8">
                  {currentChild && (
                    <span className="text-8xl drop-shadow-xl">
                      {currentChild.character}
                    </span>
                  )}
                  <p className="text-2xl font-bold mt-4 drop-shadow-md">
                    오늘도 지구를 지키느라 수고했어요!
                  </p>
                  <p className="text-lg mt-2 opacity-90">
                    다음 친구를 위해 자리를 양보해 줄까요?
                  </p>
                </div>
              </div>
            )}

            {/* QR 스캐너 오버레이 */}
            {showQrScanner && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
                <div className="text-center w-full max-w-lg px-4">
                  <div className="mb-4">
                    <p className="text-white text-xl font-bold mb-2">
                      📱 QR 카드를 스캔해주세요
                    </p>
                    <p className="text-white/70 text-sm">
                      카드의 QR 코드를 카메라에 비춰주세요
                    </p>
                  </div>
                  <div
                    id="qr-reader-game"
                    className="w-full aspect-square max-w-md mx-auto bg-gray-800 rounded-xl overflow-hidden"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <button
                    onClick={stopQrScanner}
                    className="mt-4 px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                  >
                    ✕ 취소
                  </button>
                </div>
              </div>
            )}

            {/* 가이드 프레임 */}
            {isReady &&
              !isAnalyzing &&
              phase !== 'GREET_CHILD' &&
              phase !== 'FEEDBACK_RETRY' &&
              phase !== 'FEEDBACK_CORRECT' &&
              phase !== 'FEEDBACK_WRONG' &&
              phase !== 'SUMMARY_COOLDOWN' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 md:w-64 md:h-64 border-2 border-white/50 rounded-xl relative">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
                  </div>
                </div>
              )}
          </div>

          {/* Phase 설명 (카메라 아래) */}
          <div className="mt-4 text-center">
            <p className="text-lg font-semibold text-gray-700">
              {PHASE_DESCRIPTIONS[phase]}
            </p>
          </div>

          {/* 분리배출통 선택 버튼 (WAIT_FOR_BIN_CHOICE일 때) - 5개 카테고리 */}
          {phase === 'WAIT_FOR_BIN_CHOICE' && (
            <div className="mt-4 bg-white rounded-xl shadow-md p-4">
              <h3 className="text-center font-bold text-gray-800 mb-3">
                🗑️ 어디에 버렸나요?
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {TRASH_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleBinChoice(cat.id)}
                    className={`p-3 rounded-xl text-center transition-all hover:scale-105 ${cat.bgClass} ${cat.hoverBgClass}`}
                  >
                    <span className="text-3xl">{cat.emoji}</span>
                    <p className={`text-xs font-medium mt-1 ${cat.colorClass}`}>
                      {cat.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 액션 버튼 영역 */}
          <div className="mt-4 space-y-3">
            {/* QR 스캔 영역 (WAIT_FOR_QR일 때): 왼쪽 Undo | 중앙 라벨 | 오른쪽 활동종료 */}
            {phase === 'WAIT_FOR_QR' && (
              <div className="flex items-center gap-2">
                {/* 왼쪽: Undo 버튼 */}
                <button
                  onClick={() => undoLastLog()}
                  disabled={logs.length === 0}
                  className={`py-3 px-4 rounded-xl font-medium text-sm shadow-md transition-all ${
                    logs.length === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
                >
                  ↩️ Undo
                </button>

                {/* 중앙: QR 카드 스캔 라벨 (클릭 시 스캔) */}
                <button
                  onClick={handleQrScan}
                  disabled={!isReady}
                  className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg shadow-md transition-all ${
                    !isReady
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 hover:scale-105'
                  }`}
                >
                  📱 QR 카드 스캔하기
                </button>

                {/* 오��쪽: 활동 종료 버튼 */}
                <button
                  onClick={onExit}
                  className="py-3 px-4 rounded-xl font-medium text-sm bg-red-100 text-red-600 hover:bg-red-200 transition-all shadow-md"
                >
                  🚪 활동종료
                </button>
              </div>
            )}

            {/* 촬영 버튼 영역 (WAIT_FOR_TRASH일 때) */}
            {phase === 'WAIT_FOR_TRASH' && (
              <div className="flex items-center gap-2">
                {/* 왼쪽: Undo 버튼 */}
                <button
                  onClick={() => undoLastLog()}
                  disabled={logs.length === 0}
                  className={`py-3 px-4 rounded-xl font-medium text-sm shadow-md transition-all ${
                    logs.length === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
                >
                  ↩️ Undo
                </button>

                {/* 중앙: 촬영 버튼 */}
                <button
                  onClick={handleCaptureAndAnalyze}
                  disabled={!isReady}
                  className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg shadow-md transition-all ${
                    !isReady
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-green-500 text-white hover:from-cyan-600 hover:to-green-600 hover:scale-105'
                  }`}
                >
                  📸 쓰레기 촬영하기
                </button>

                {/* 오른쪽: 활동 종료 버튼 */}
                <button
                  onClick={onExit}
                  className="py-3 px-4 rounded-xl font-medium text-sm bg-red-100 text-red-600 hover:bg-red-200 transition-all shadow-md"
                >
                  🚪 활동종료
                </button>
              </div>
            )}

            {/* 분리수거함 색상 스캔 버튼 영역 (WAIT_FOR_BIN_SCAN일 때) */}
            {phase === 'WAIT_FOR_BIN_SCAN' && (
              <div className="flex flex-col gap-3">
                {/* 안내 카드 */}
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 text-center">
                  <p className="text-lg font-bold text-purple-800 mb-2">
                    🗑️ 쓰레기통에 가서 색깔을 보여주세요!
                  </p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {(['blue', 'yellow', 'green', 'orange', 'purple'] as BinColor[]).map((color) => (
                      <span
                        key={color}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-sm"
                      >
                        {BIN_COLOR_EMOJIS[color]} {BIN_COLOR_LABELS[color]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 버튼 영역 */}
                <div className="flex items-center gap-2">
                  {/* 왼쪽: Undo 버튼 */}
                  <button
                    onClick={() => undoLastLog()}
                    disabled={logs.length === 0}
                    className={`py-3 px-4 rounded-xl font-medium text-sm shadow-md transition-all ${
                      logs.length === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    ↩️ Undo
                  </button>

                  {/* 중앙: 색상 스캔 버튼 */}
                  <button
                    onClick={handleBinScan}
                    disabled={!isReady}
                    className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg shadow-md transition-all ${
                      !isReady
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:scale-105'
                    }`}
                  >
                    🎨 쓰레기통 색깔 촬영하기
                  </button>

                  {/* 오른쪽: 활동 종료 버튼 */}
                  <button
                    onClick={onExit}
                    className="py-3 px-4 rounded-xl font-medium text-sm bg-red-100 text-red-600 hover:bg-red-200 transition-all shadow-md"
                  >
                    🚪 활동종료
                  </button>
                </div>
              </div>
            )}

            {/* 기타 Phase일 때 하단 버튼들 */}
            {phase !== 'WAIT_FOR_QR' && phase !== 'WAIT_FOR_TRASH' && phase !== 'WAIT_FOR_BIN_SCAN' && (
              <div className="flex gap-3">
                {/* Undo 버튼 */}
                <button
                  onClick={() => undoLastLog()}
                  disabled={logs.length === 0}
                  className={`py-3 px-4 rounded-xl font-medium text-sm shadow-md transition-all ${
                    logs.length === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
                >
                  ↩️ Undo
                </button>

                {/* 초기화 버튼 */}
                <button
                  onClick={handleReset}
                  className="py-3 px-4 rounded-xl font-bold text-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all shadow-md"
                >
                  🔄
                </button>

                {/* 나가기 버튼 */}
                {onExit && (
                  <button
                    onClick={onExit}
                    className="py-3 px-4 rounded-xl font-medium text-sm bg-red-100 text-red-600 hover:bg-red-200 transition-all shadow-md"
                  >
                    🚪 활동종료
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ---------- 오른쪽: 상태 카드 + 활동 로그 ---------- */}
        <div className="lg:w-96 flex flex-col gap-4">
          {/* 점수 카드 */}
          <div className="bg-white rounded-xl shadow-md p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              🏆 게임 현황
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">총 점수</span>
                <span className="text-2xl font-bold text-cyan-600">
                  {totalScore}점
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">시도 횟수</span>
                <span className="text-xl font-semibold text-gray-800">
                  {roundCount}회
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">성공 횟수</span>
                <span className="text-xl font-semibold text-green-600">
                  {successCount}회
                </span>
              </div>
              {roundCount > 0 && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">정답률</span>
                  <span className="text-xl font-semibold text-purple-600">
                    {Math.round((successCount / roundCount) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* YOLO 결과 카드 - 사용자에게 보여주지 않음 (내부적으로만 사용) */}

          {/* 분리수거함 색상 안내 */}
          <div className="bg-white rounded-xl shadow-md p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              🎨 쓰레기통 색깔 안내
            </h2>
            <div className="space-y-2 text-sm">
              {(['blue', 'yellow', 'green', 'orange', 'purple'] as BinColor[]).map((color) => (
                <div
                  key={color}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{BIN_COLOR_EMOJIS[color]}</span>
                    <span className="font-medium">{BIN_COLOR_LABELS[color]}</span>
                  </span>
                  <span className="text-gray-600">
                    → {BIN_TYPE_LABELS[BIN_COLOR_TO_CATEGORY[color]]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 활동 로그 패널 */}
          <ActivityLogPanel logs={logs} maxHeightClass="h-64 lg:h-80" />
        </div>
      </main>
    </div>
  );
}

export default RecycleCameraGame;