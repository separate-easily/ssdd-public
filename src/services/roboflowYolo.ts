/**
 * ============================================================
 * Roboflow YOLO 분석 서비스
 * ============================================================
 *
 * Roboflow API를 사용한 실제 쓰레기 분류 서비스입니다.
 * 환경 변수에서 모델 ID와 API 키를 읽어 사용합니다.
 *
 * 환경 변수:
 * - VITE_WASTE_MODEL_ID: Roboflow 모델 ID (예: waste-infad-qk5z1/2)
 * - VITE_ROBOFLOW_API_KEY: Roboflow API 키
 *
 * 파일 위치: src/services/roboflowYolo.ts
 */

import type { MissionCategory } from '../domain/trashMission';
import { mapYoloClassToCategory } from '../domain/cameraActivityLog';
import type { RecycleBinType } from '../domain/cameraActivityLog';

// ============================================================
// 타입 정의
// ============================================================

export interface RoboflowPrediction {
  /** 감지된 클래스 이름 */
  class: string;
  /** 신뢰도 (0.0 ~ 1.0) */
  confidence: number;
  /** 바운딩 박스 좌표 */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoboflowResponse {
  predictions: RoboflowPrediction[];
  image?: {
    width: number;
    height: number;
  };
}

export interface YoloAnalysisResult {
  /** 감지된 쓰레기 카테고리 */
  category: MissionCategory;
  /** 원본 클래스 이름 */
  rawClass: string;
  /** 신뢰도 (0.0 ~ 1.0) */
  confidence: number;
  /** API 사용 여부 (false면 mock 모드) */
  isRealApi: boolean;
}

// ============================================================
// 환경 변수
// ============================================================

const WASTE_MODEL_ID = import.meta.env.VITE_WASTE_MODEL_ID || '';
const ROBOFLOW_API_KEY = import.meta.env.VITE_ROBOFLOW_API_KEY || '';

// Roboflow API 기본 URL
const ROBOFLOW_API_BASE = 'https://detect.roboflow.com';

// ============================================================
// Roboflow 클래스 → MissionCategory 매핑
// ============================================================

/**
 * Roboflow 모델의 클래스 이름을 MissionCategory로 매핑
 *
 * 모델 출력 클래스와 앱 내 카테고리를 연결합니다.
 * 새로운 모델 클래스가 추가되면 이 매핑을 업데이트하세요.
 */
const ROBOFLOW_CLASS_MAP: Record<string, MissionCategory> = {
  // 플라스틱류
  plastic: 'plastic',
  plastic_bottle: 'plastic',
  plastic_container: 'plastic',
  bottle: 'plastic',
  pet: 'plastic',

  // 종이류
  paper: 'paper',
  cardboard: 'paper',
  newspaper: 'paper',
  paper_cup: 'paper',
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
  metal: 'canBotble',
  glass: 'canBotble',
  glass_bottle: 'canBotble',
  tin: 'canBotble',

  // 일반 쓰레기
  trash: 'general',
  general: 'general',
  food_waste: 'general',
  tissue: 'general',
  unknown: 'general',
  other: 'general',
};

/**
 * Roboflow 클래스 이름을 MissionCategory로 변환
 */
function mapRoboflowClass(className: string): MissionCategory {
  const normalized = className.toLowerCase().replace(/[\s-]/g, '_');
  return ROBOFLOW_CLASS_MAP[normalized] || 'general';
}

// ============================================================
// API 호출 함수
// ============================================================

/**
 * Roboflow API 사용 가능 여부 확인
 */
export function isRoboflowConfigured(): boolean {
  return !!(WASTE_MODEL_ID && ROBOFLOW_API_KEY && ROBOFLOW_API_KEY !== 'your_api_key_here');
}

/**
 * Canvas를 Base64 이미지로 변환
 */
function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

/**
 * Roboflow API를 호출하여 이미지 분석
 *
 * @param frame - 캡처된 프레임 (HTMLCanvasElement)
 * @returns Promise<YoloAnalysisResult>
 */
export async function analyzeWithRoboflow(
  frame: HTMLCanvasElement
): Promise<YoloAnalysisResult> {
  if (!isRoboflowConfigured()) {
    throw new Error('Roboflow API가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }

  const base64Image = canvasToBase64(frame);
  const apiUrl = `${ROBOFLOW_API_BASE}/${WASTE_MODEL_ID}?api_key=${ROBOFLOW_API_KEY}`;

  console.log('[roboflowYolo] API 호출 시작:', {
    modelId: WASTE_MODEL_ID,
    frameSize: `${frame.width}x${frame.height}`,
  });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: base64Image,
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status} ${response.statusText}`);
    }

    const data: RoboflowResponse = await response.json();

    console.log('[roboflowYolo] API 응답:', {
      predictionsCount: data.predictions?.length || 0,
      predictions: data.predictions?.map(p => ({
        class: p.class,
        confidence: p.confidence.toFixed(2),
      })),
    });

    // 가장 신뢰도 높은 예측 선택
    if (data.predictions && data.predictions.length > 0) {
      const topPrediction = data.predictions.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );

      const category = mapRoboflowClass(topPrediction.class);

      console.log('[roboflowYolo] 분석 결과:', {
        rawClass: topPrediction.class,
        category,
        confidence: topPrediction.confidence.toFixed(2),
      });

      return {
        category,
        rawClass: topPrediction.class,
        confidence: topPrediction.confidence,
        isRealApi: true,
      };
    }

    // 예측 결과가 없는 경우
    console.warn('[roboflowYolo] 감지된 객체 없음 - general로 처리');
    return {
      category: 'general',
      rawClass: 'unknown',
      confidence: 0.5,
      isRealApi: true,
    };

  } catch (error) {
    console.error('[roboflowYolo] API 호출 실패:', error);
    throw error;
  }
}

// ============================================================
// 통합 분석 함수 (API 또는 Mock 자동 선택)
// ============================================================

/**
 * 쓰레기 이미지 분석 (Roboflow API 또는 Mock)
 *
 * - API 키가 설정되어 있으면 실제 Roboflow API 사용
 * - 설정되지 않으면 fakeYoloAnalyze로 폴백
 *
 * @param frame - 캡처된 프레임
 * @param forceMock - true면 항상 mock 모드 사용
 */
export async function analyzeTrashImage(
  frame: HTMLCanvasElement,
  forceMock: boolean = false
): Promise<YoloAnalysisResult> {
  // Mock 모드 강제 또는 API 미설정 시 fakeYolo 사용
  if (forceMock || !isRoboflowConfigured()) {
    console.log('[analyzeTrashImage] Mock 모드 사용');

    // fakeYolo를 동적 import하여 순환 참조 방지
    const { fakeYoloAnalyze } = await import('./fakeYolo');
    const result = await fakeYoloAnalyze(frame);

    return {
      category: result.category,
      rawClass: result.category, // mock에서는 category가 곧 rawClass
      confidence: result.confidence,
      isRealApi: false,
    };
  }

  // 실제 API 사용
  return analyzeWithRoboflow(frame);
}

/**
 * 현재 설정된 모델 ID 반환 (디버깅용)
 */
export function getConfiguredModelId(): string {
  return WASTE_MODEL_ID || '(미설정)';
}
