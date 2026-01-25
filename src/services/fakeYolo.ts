/**
 * ============================================================
 * 가짜 YOLO 분석기 (Mock Service)
 * ============================================================
 *
 * 실제 YOLO 서버 연동 전에 사용하는 목업 서비스입니다.
 * setTimeout + Math.random으로 가짜 분석 결과를 반환합니다.
 *
 * 주의: 이 파일에서는 HTTP 요청, Roboflow 연동을 하지 않습니다.
 *
 * TODO: 실제 YOLO 연동 시 이 파일을 실제 구현으로 교체하거나,
 *       별도의 realYolo.ts를 만들어서 사용할 것.
 *       (외부 API 호출 → 과금 가능성 있음)
 *
 * 파일 위치: src/services/fakeYolo.ts
 */

import type { MissionCategory } from '../domain/trashMission';

// ============================================================
// 타입 정의
// ============================================================

export interface FakeYoloResult {
  /** 감지된 쓰레기 카테고리 */
  category: MissionCategory;
  /** 신뢰도 (0.0 ~ 1.0) */
  confidence: number;
}

// ============================================================
// 상수
// ============================================================

/** 가능한 카테고리 목록 (5종류 - RecycleBinType과 일치) */
const CATEGORIES: MissionCategory[] = ['plastic', 'paper', 'vinyl', 'general', 'canBotble'];

/** 최소 분석 딜레이 (ms) */
const MIN_DELAY_MS = 800;

/** 최대 분석 딜레이 (ms) */
const MAX_DELAY_MS = 1500;

/** 최소 신뢰도 */
const MIN_CONFIDENCE = 0.4;

/** 최대 신뢰도 */
const MAX_CONFIDENCE = 0.95;

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * min과 max 사이의 랜덤 숫자 반환
 */
function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 배열에서 랜덤 요소 선택
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 지정된 ms만큼 대기
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// 가짜 YOLO 분석 함수
// ============================================================

/**
 * 가짜 YOLO 분석 수행
 *
 * @param frame - 캡처된 프레임 (HTMLCanvasElement)
 *                현재는 사용하지 않지만, 실제 YOLO 연동 시 이 데이터를 서버로 전송
 * @returns Promise<FakeYoloResult> - 분석 결과 (카테고리 + 신뢰도)
 *
 * 동작:
 * 1. 0.8~1.5초 사이 랜덤 딜레이
 * 2. 카테고리 중 하나를 랜덤 선택
 * 3. 신뢰도 0.4~0.95 사이 랜덤 생성
 */
export async function fakeYoloAnalyze(
  frame: HTMLCanvasElement
): Promise<FakeYoloResult> {
  // 분석 "시뮬레이션"을 위한 랜덤 딜레이
  const delayMs = randomBetween(MIN_DELAY_MS, MAX_DELAY_MS);
  await delay(delayMs);

  // 랜덤 카테고리 선택
  const category = randomChoice(CATEGORIES);

  // 랜덤 신뢰도 생성
  const confidence = randomBetween(MIN_CONFIDENCE, MAX_CONFIDENCE);

  // 디버그 로그
  console.log('[fakeYolo] 분석 완료:', {
    category,
    confidence: confidence.toFixed(2),
    delayMs: Math.round(delayMs),
    frameSize: `${frame.width}x${frame.height}`,
  });

  return {
    category,
    confidence,
  };
}

/**
 * 가짜 YOLO 분석 (카테고리 힌트 있음)
 *
 * 특정 카테고리가 나올 확률을 높이고 싶을 때 사용
 * 예: 테스트용으로 특정 시나리오를 재현할 때
 *
 * @param frame - 캡처된 프레임
 * @param hintCategory - 이 카테고리가 선택될 확률이 50%
 */
export async function fakeYoloAnalyzeWithHint(
  frame: HTMLCanvasElement,
  hintCategory: MissionCategory
): Promise<FakeYoloResult> {
  const delayMs = randomBetween(MIN_DELAY_MS, MAX_DELAY_MS);
  await delay(delayMs);

  // 50% 확률로 힌트 카테고리 선택
  const category = Math.random() < 0.5 ? hintCategory : randomChoice(CATEGORIES);
  const confidence = randomBetween(MIN_CONFIDENCE, MAX_CONFIDENCE);

  console.log('[fakeYolo] 분석 완료 (힌트 모드):', {
    category,
    confidence: confidence.toFixed(2),
    hintCategory,
  });

  return { category, confidence };
}