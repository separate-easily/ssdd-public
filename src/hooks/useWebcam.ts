/**
 * ============================================================
 * 공통 카메라 훅
 * ============================================================
 *
 * getUserMedia로 카메라 스트림을 열고, <video> ref에 연결합니다.
 * 프레임 캡처 기능도 제공합니다.
 *
 * 이 훅은 카메라 관련 로직만 담당합니다.
 * - Firestore, 게임 상태와는 분리되어 있습니다.
 *
 * 파일 위치: src/hooks/useWebcam.ts
 */

import { useRef, useState, useEffect, useCallback } from 'react';

// ============================================================
// 타입 정의
// ============================================================

export interface UseWebcamOptions {
  /** MediaTrackConstraints for video */
  videoConstraints?: MediaTrackConstraints;
  /** 자동으로 카메라를 시작할지 여부 (기본: true) */
  autoStart?: boolean;
}

export interface UseWebcamResult {
  /** video 엘리먼트에 연결할 ref */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** 카메라가 준비되었는지 여부 */
  isReady: boolean;
  /** 에러 메시지 (없으면 null) */
  error: string | null;
  /** 현재 프레임을 캔버스에 캡처하여 반환 */
  captureFrame: () => HTMLCanvasElement | null;
  /** 카메라 시작 (autoStart=false일 때 수동 시작용) */
  startCamera: () => Promise<void>;
  /** 카메라 중지 */
  stopCamera: () => void;
}

// ============================================================
// 기본 옵션
// ============================================================

const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: 'environment', // 후면 카메라 우선
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

// ============================================================
// 훅 구현
// ============================================================

export function useWebcam(options?: UseWebcamOptions): UseWebcamResult {
  const {
    videoConstraints = DEFAULT_VIDEO_CONSTRAINTS,
    autoStart = true,
  } = options ?? {};

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 카메라 스트림 시작
   */
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsReady(false);

      // 기존 스트림이 있으면 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // getUserMedia로 스트림 획득
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = stream;

      // video 엘리먼트에 스트림 연결
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // loadedmetadata 이벤트로 준비 완료 감지
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '카메라를 열 수 없습니다.';
      setError(message);
      console.error('[useWebcam] 카메라 에러:', err);
    }
  }, [videoConstraints]);

  /**
   * 카메라 스트림 중지
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, []);

  /**
   * 현재 비디오 프레임을 캔버스에 캡처
   */
  const captureFrame = useCallback((): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (!video || !isReady) {
      console.warn('[useWebcam] 카메라가 준비되지 않았습니다.');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[useWebcam] Canvas context를 생성할 수 없습니다.');
      return null;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  }, [isReady]);

  // 마운트 시 자동 시작 (autoStart=true일 때)
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }

    // 언마운트 시 정리
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [autoStart, startCamera]);

  return {
    videoRef,
    isReady,
    error,
    captureFrame,
    startCamera,
    stopCamera,
  };
}