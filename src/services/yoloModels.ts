/**
 * ============================================================
 * YOLO 모델 통합 관리
 * ============================================================
 *
 * Roboflow API를 사용하는 두 가지 모델을 관리합니다:
 * 1. 쓰레기 종류 인식 모델 (waste-infad-qk5z1/2)
 * 2. 분리수거함 색상 감지 모델 (colors-4b28z/1)
 *
 * 환경 변수:
 * - VITE_WASTE_MODEL_ID: 쓰레기 종류 인식 모델 ID
 * - VITE_BINCOLOR_MODEL_ID: 분리수거함 색상 감지 모델 ID
 * - VITE_ROBOFLOW_API_KEY: Roboflow API 키
 *
 * 파일 위치: src/services/yoloModels.ts
 */

import type { MissionCategory } from '../domain/trashMission';
import type { RecycleBinType } from '../domain/cameraActivityLog';

// ============================================================
// 환경 변수
// ============================================================

const WASTE_MODEL_ID = import.meta.env.VITE_WASTE_MODEL_ID || '';
const BINCOLOR_MODEL_ID = import.meta.env.VITE_BINCOLOR_MODEL_ID || '';
const ROBOFLOW_API_KEY = import.meta.env.VITE_ROBOFLOW_API_KEY || '';

const ROBOFLOW_API_BASE = 'https://detect.roboflow.com';
const ROBOFLOW_CLASSIFY_BASE = 'https://classify.roboflow.com';

// ============================================================
// 타입 정의
// ============================================================

/** Roboflow 객체 감지 응답 */
export interface RoboflowDetectionResponse {
  predictions: Array<{
    class: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

/** Roboflow 분류 응답 */
export interface RoboflowClassificationResponse {
  predictions: Array<{
    class: string;
    confidence: number;
  }>;
  top: string;
  confidence: number;
}

/** 쓰레기 분석 결과 */
export interface WasteAnalysisResult {
  category: MissionCategory;
  rawClass: string;
  confidence: number;
  isRealApi: boolean;
}

/** 색상 감지 결과 */
export interface ColorDetectionResult {
  color: BinColor;
  rawClass: string;
  confidence: number;
  isRealApi: boolean;
}

/** 분리수거함 색상 (5가지) */
export type BinColor = 'blue' | 'yellow' | 'green' | 'orange' | 'purple';

// ============================================================
// 색상 → 분리수거함 매핑
// ============================================================

/**
 * 분리수거함 색상별 쓰레기 종류
 *
 * 평택시 분리수거함 기준:
 * - 파랑 (blue): 플라스틱류
 * - 노랑 (yellow): 종이류
 * - 초록 (green): 캔 및 병류
 * - 주황 (orange): 비닐류
 * - 보라 (purple/violet): 일반쓰레기
 */
export const BIN_COLOR_TO_CATEGORY: Record<BinColor, RecycleBinType> = {
  blue: 'plastic',
  yellow: 'paper',
  green: 'canBotble',
  orange: 'vinyl',
  purple: 'general',
};

/** 색상 한글 라벨 */
export const BIN_COLOR_LABELS: Record<BinColor, string> = {
  blue: '파란색',
  yellow: '노란색',
  green: '초록색',
  orange: '주황색',
  purple: '보라색',
};

/** 색상 이모지 */
export const BIN_COLOR_EMOJIS: Record<BinColor, string> = {
  blue: '🔵',
  yellow: '🟡',
  green: '🟢',
  orange: '🟠',
  purple: '🟣',
};

/** Roboflow 색상 클래스 → BinColor 매핑 */
const ROBOFLOW_COLOR_MAP: Record<string, BinColor> = {
  blue: 'blue',
  yellow: 'yellow',
  green: 'green',
  orange: 'orange',
  violet: 'purple', // Roboflow는 'violet'으로 출력
  purple: 'purple',
};

// ============================================================
// 쓰레기 종류 인식 모델 (YOLO)
// ============================================================

/** 쓰레기 클래스 → MissionCategory 매핑 */
const WASTE_CLASS_MAP: Record<string, MissionCategory> = {
  // 플라스틱류
  plastic: 'plastic',
  plastic_bottle: 'plastic',
  plastic_container: 'plastic',
  bottle: 'plastic',
  pet: 'plastic',
  styrofoam: 'plastic',

  // 종이류
  paper: 'paper',
  cardboard: 'paper',
  newspaper: 'paper',
  paper_cup: 'paper',
  box: 'paper',

  // 비닐류
  vinyl: 'vinyl',
  plastic_bag: 'vinyl',
  bag: 'vinyl',
  film: 'vinyl',
  plastic_wrap: 'vinyl',

  // 캔 및 병류
  can: 'canBotble',
  aluminum: 'canBotble',
  metal: 'canBotble',
  glass: 'canBotble',
  glass_bottle: 'canBotble',
  tin: 'canBotble',

  // 일반쓰레기
  trash: 'general',
  general: 'general',
  food_waste: 'general',
  tissue: 'general',
  unknown: 'general',
  other: 'general',
};

// ============================================================
// 유틸리티 함수
// ============================================================

/** Canvas를 Base64로 변환 */
function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

/** API 설정 확인 */
export function isRoboflowConfigured(): boolean {
  return !!(ROBOFLOW_API_KEY && ROBOFLOW_API_KEY !== 'your_api_key_here');
}

/** 쓰레기 모델 설정 확인 */
export function isWasteModelConfigured(): boolean {
  return isRoboflowConfigured() && !!WASTE_MODEL_ID;
}

/** 색상 모델 설정 확인 */
export function isColorModelConfigured(): boolean {
  return isRoboflowConfigured() && !!BINCOLOR_MODEL_ID;
}

/** 설정된 모델 ID 반환 (디버깅용) */
export function getModelIds(): { waste: string; color: string } {
  return {
    waste: WASTE_MODEL_ID || '(미설정)',
    color: BINCOLOR_MODEL_ID || '(미설정)',
  };
}

// ============================================================
// 쓰레기 종류 분석 API
// ============================================================

/**
 * 쓰레기 종류 분석 (Roboflow API)
 *
 * @param frame - 캡처된 프레임
 * @returns Promise<WasteAnalysisResult>
 */
export async function analyzeWasteType(
  frame: HTMLCanvasElement
): Promise<WasteAnalysisResult> {
  if (!isWasteModelConfigured()) {
    console.log('[yoloModels] 쓰레기 모델 미설정 - Mock 모드');
    return mockWasteAnalysis();
  }

  const base64Image = canvasToBase64(frame);
  const apiUrl = `${ROBOFLOW_API_BASE}/${WASTE_MODEL_ID}?api_key=${ROBOFLOW_API_KEY}`;

  console.log('[yoloModels] 쓰레기 분석 API 호출:', {
    modelId: WASTE_MODEL_ID,
    frameSize: `${frame.width}x${frame.height}`,
  });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: base64Image,
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const data: RoboflowDetectionResponse = await response.json();

    if (data.predictions && data.predictions.length > 0) {
      const top = data.predictions.reduce((best, curr) =>
        curr.confidence > best.confidence ? curr : best
      );

      const normalized = top.class.toLowerCase().replace(/[\s-]/g, '_');
      const category = WASTE_CLASS_MAP[normalized] || 'general';

      console.log('[yoloModels] 쓰레기 분석 결과:', {
        rawClass: top.class,
        category,
        confidence: top.confidence.toFixed(2),
      });

      return {
        category,
        rawClass: top.class,
        confidence: top.confidence,
        isRealApi: true,
      };
    }

    console.warn('[yoloModels] 감지된 쓰레기 없음');
    return {
      category: 'general',
      rawClass: 'unknown',
      confidence: 0.5,
      isRealApi: true,
    };

  } catch (error) {
    console.error('[yoloModels] 쓰레기 분석 실패:', error);
    return mockWasteAnalysis();
  }
}

/** Mock 쓰레기 분석 */
function mockWasteAnalysis(): WasteAnalysisResult {
  const categories: MissionCategory[] = ['plastic', 'paper', 'vinyl', 'general', 'canBotble'];
  const category = categories[Math.floor(Math.random() * categories.length)];
  return {
    category,
    rawClass: category,
    confidence: 0.7 + Math.random() * 0.25,
    isRealApi: false,
  };
}

// ============================================================
// 분리수거함 색상 감지 API
// ============================================================

/**
 * 분리수거함 색상 감지 (Roboflow Classification API)
 *
 * @param frame - 캡처된 프레임
 * @returns Promise<ColorDetectionResult>
 */
export async function detectBinColor(
  frame: HTMLCanvasElement
): Promise<ColorDetectionResult> {
  if (!isColorModelConfigured()) {
    console.log('[yoloModels] 색상 모델 미설정 - Mock 모드');
    return mockColorDetection();
  }

  const base64Image = canvasToBase64(frame);
  const apiUrl = `${ROBOFLOW_CLASSIFY_BASE}/${BINCOLOR_MODEL_ID}?api_key=${ROBOFLOW_API_KEY}`;

  console.log('[yoloModels] 색상 감지 API 호출:', {
    modelId: BINCOLOR_MODEL_ID,
    frameSize: `${frame.width}x${frame.height}`,
  });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: base64Image,
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const data: RoboflowClassificationResponse = await response.json();

    console.log('[yoloModels] 색상 감지 응답:', {
      top: data.top,
      confidence: data.confidence?.toFixed(2),
      predictions: data.predictions?.slice(0, 3),
    });

    // 유효한 분리수거함 색상인지 확인
    const topColor = data.top?.toLowerCase();
    const binColor = ROBOFLOW_COLOR_MAP[topColor];

    if (binColor) {
      return {
        color: binColor,
        rawClass: data.top,
        confidence: data.confidence,
        isRealApi: true,
      };
    }

    // 유효하지 않은 색상이면 predictions에서 찾기
    if (data.predictions) {
      for (const pred of data.predictions) {
        const mappedColor = ROBOFLOW_COLOR_MAP[pred.class.toLowerCase()];
        if (mappedColor) {
          return {
            color: mappedColor,
            rawClass: pred.class,
            confidence: pred.confidence,
            isRealApi: true,
          };
        }
      }
    }

    console.warn('[yoloModels] 유효한 분리수거함 색상 감지 실패');
    return mockColorDetection();

  } catch (error) {
    console.error('[yoloModels] 색상 감지 실패:', error);
    return mockColorDetection();
  }
}

/** Mock 색상 감지 */
function mockColorDetection(): ColorDetectionResult {
  const colors: BinColor[] = ['blue', 'yellow', 'green', 'orange', 'purple'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  return {
    color,
    rawClass: color,
    confidence: 0.8 + Math.random() * 0.15,
    isRealApi: false,
  };
}

// ============================================================
// 통합 분석: 쓰레기 + 색상 → 정답 판정
// ============================================================

/**
 * 쓰레기와 분리수거함 색상이 일치하는지 확인
 *
 * @param wasteCategory - 감지된 쓰레기 종류
 * @param binColor - 감지된 분리수거함 색상
 * @returns 일치 여부
 */
export function isCorrectBin(
  wasteCategory: MissionCategory,
  binColor: BinColor
): boolean {
  const expectedCategory = BIN_COLOR_TO_CATEGORY[binColor];
  return wasteCategory === expectedCategory;
}

/**
 * 쓰레기 종류에 맞는 올바른 분리수거함 색상 반환
 *
 * @param wasteCategory - 쓰레기 종류
 * @returns 올바른 분리수거함 색상
 */
export function getCorrectBinColor(wasteCategory: MissionCategory): BinColor {
  const entries = Object.entries(BIN_COLOR_TO_CATEGORY) as [BinColor, RecycleBinType][];
  const match = entries.find(([_, cat]) => cat === wasteCategory);
  return match ? match[0] : 'purple'; // 기본값: 일반쓰레기
}
