/**
 * ============================================================
 * 분리배출 카메라 게임 화면 (독립 실행형)
 * ============================================================
 *
 * 이 컴포넌트는 아직 기존 화면(GameScreen 등)과 연결되지 않은
 * 독립적인 분리배출 카메라 게임 화면입니다.
 *
 * 나중에 GameScreen에서 selectedGame === 'recycle'일 때
 * 이 컴포넌트를 렌더할 예정입니다.
 *
 * 파일 위치: src/components/RecycleCameraGame.tsx
 */

import { useEffect, useCallback } from 'react';
import { useWebcam } from '../hooks/useWebcam';
import { useMissionState } from '../hooks/useMissionState';
import { fakeYoloAnalyze } from '../services/fakeYolo';
import { fakeSpeak, VOICE_MESSAGES } from '../services/fakeTTS';
import {
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  isCorrectBinRandom,
  type MissionCategory,
} from '../domain/trashMission';

// ============================================================
// 컴포넌트 Props
// ============================================================

export interface RecycleCameraGameProps {
  /** 게임 종료 시 호출되는 콜백 (옵션) */
  onExit?: () => void;
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export function RecycleCameraGame({ onExit }: RecycleCameraGameProps) {
  // 카메라 훅
  const { videoRef, isReady, error, captureFrame } = useWebcam();

  // 게임 상태 훅
  const {
    state,
    dispatchEvent,
    phaseDescription,
    categoryLabel,
    isAnalyzing,
  } = useMissionState({ debugLabel: 'RecycleGame' });

  // ============================================================
  // Phase 변화 시 TTS 및 자동 전이 처리
  // ============================================================

  useEffect(() => {
    // 결과 Phase일 때 2초 후 자동으로 FINISHED로 전이
    if (state.phase === 'RESULT_CORRECT' || state.phase === 'RESULT_WRONG_BIN') {
      const timer = setTimeout(() => {
        dispatchEvent({ type: 'AUTO_FINISH' });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [state.phase, dispatchEvent]);

  // ============================================================
  // 촬영 및 분석 핸들러
  // ============================================================

  const handleCaptureAndAnalyze = useCallback(async () => {
    // 이미 분석 중이면 무시
    if (isAnalyzing) return;

    // 카메라가 준비되지 않았으면 무시
    if (!isReady) {
      console.warn('[RecycleCameraGame] 카메라가 준비되지 않았습니다.');
      return;
    }

    // 1. TRASH_READY 이벤트 (IDLE/FINISHED → READY_FOR_TRASH → ANALYZING)
    if (state.phase === 'IDLE' || state.phase === 'FINISHED') {
      dispatchEvent({ type: 'START_MISSION' });
    }
    dispatchEvent({ type: 'TRASH_READY' });

    // 2. 프레임 캡처
    const frame = captureFrame();
    if (!frame) {
      console.error('[RecycleCameraGame] 프레임 캡처 실패');
      return;
    }

    // 3. TTS: 분석 중 안내
    await fakeSpeak(VOICE_MESSAGES.analyzing);

    // 4. 가짜 YOLO 분석
    const yoloResult = await fakeYoloAnalyze(frame);

    // 5. 정답 여부 결정 (가짜 로직)
    const isCorrectBin = isCorrectBinRandom();

    // 6. YOLO_RESULT 이벤트
    dispatchEvent({
      type: 'YOLO_RESULT',
      category: yoloResult.category,
      confidence: yoloResult.confidence,
      isCorrectBin,
    });

    // 7. TTS: 결과 안내
    const categoryName = CATEGORY_LABELS[yoloResult.category];
    if (isCorrectBin) {
      await fakeSpeak(VOICE_MESSAGES.correct(categoryName));
    } else {
      await fakeSpeak(VOICE_MESSAGES.wrong(categoryName));
    }
  }, [isReady, isAnalyzing, state.phase, dispatchEvent, captureFrame]);

  // ============================================================
  // 게임 초기화 핸들러
  // ============================================================

  const handleReset = useCallback(() => {
    dispatchEvent({ type: 'RESET_MISSION' });
  }, [dispatchEvent]);

  // ============================================================
  // 렌더링
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-green-50 p-4 md:p-8 flex flex-col">
      {/* ==================== 상단: 제목 및 설명 ==================== */}
      <header className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-600 to-green-600 bg-clip-text text-transparent mb-2">
          ♻️ 올바른 분리배출 게임
        </h1>
        <p className="text-gray-600 text-lg">
          쓰레기를 화면에 보여주면 AI가 어떤 분리배출인지 맞춰봐요!
        </p>
      </header>

      {/* ==================== 중앙: 메인 컨텐츠 ==================== */}
      <main className="flex-1 flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto w-full">
        {/* ---------- 왼쪽: 카메라 미리보기 ---------- */}
        <div className="flex-1 flex flex-col">
          <div className="relative bg-black rounded-xl shadow-md overflow-hidden aspect-video">
            {/* 비디오 엘리먼트 */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

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
                  <p className="text-xl font-bold">AI 분석 중...</p>
                </div>
              </div>
            )}

            {/* 가이드 프레임 */}
            {isReady && !isAnalyzing && (
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
              {phaseDescription}
            </p>
          </div>
        </div>

        {/* ---------- 오른쪽: 상태 카드 ---------- */}
        <div className="lg:w-80 flex flex-col gap-4">
          {/* 점수 카드 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              🏆 게임 현황
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">총 점수</span>
                <span className="text-2xl font-bold text-cyan-600">
                  {state.totalScore}점
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">시도 횟수</span>
                <span className="text-xl font-semibold text-gray-800">
                  {state.missionCount}회
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">성공 횟수</span>
                <span className="text-xl font-semibold text-green-600">
                  {state.successCount}회
                </span>
              </div>
              {state.missionCount > 0 && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">정답률</span>
                  <span className="text-xl font-semibold text-purple-600">
                    {Math.round((state.successCount / state.missionCount) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 현재 결과 카드 (결과 Phase일 때만 표시) */}
          {(state.phase === 'RESULT_CORRECT' || state.phase === 'RESULT_WRONG_BIN') && (
            <div
              className={`rounded-xl shadow-md p-6 text-center ${
                state.phase === 'RESULT_CORRECT'
                  ? 'bg-green-100 border-2 border-green-400'
                  : 'bg-orange-100 border-2 border-orange-400'
              }`}
            >
              <div className="text-6xl mb-3">
                {state.currentCategory
                  ? CATEGORY_EMOJIS[state.currentCategory]
                  : '❓'}
              </div>
              <p className="text-xl font-bold mb-1">
                {categoryLabel || '알 수 없음'}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                신뢰도: {state.lastConfidence
                  ? `${(state.lastConfidence * 100).toFixed(0)}%`
                  : '-'}
              </p>
              <p
                className={`text-lg font-bold ${
                  state.phase === 'RESULT_CORRECT'
                    ? 'text-green-600'
                    : 'text-orange-600'
                }`}
              >
                {state.phase === 'RESULT_CORRECT' ? '✅ 정답!' : '❌ 다시 해봐요!'}
              </p>
            </div>
          )}

          {/* 분리배출 카테고리 안내 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">
              📋 분리배출 종류
            </h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(Object.keys(CATEGORY_LABELS) as MissionCategory[]).map(
                (cat) => (
                  <div
                    key={cat}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-xl">{CATEGORY_EMOJIS[cat]}</span>
                    <span className="text-gray-700">{CATEGORY_LABELS[cat]}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ==================== 하단: 버튼 ==================== */}
      <footer className="mt-6 flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto w-full">
        {/* 촬영 버튼 */}
        <button
          onClick={handleCaptureAndAnalyze}
          disabled={!isReady || isAnalyzing}
          className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg shadow-md transition-all ${
            !isReady || isAnalyzing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-green-500 text-white hover:from-cyan-600 hover:to-green-600 hover:scale-105'
          }`}
        >
          {isAnalyzing ? '분석 중...' : '📸 촬영하고 분석하기'}
        </button>

        {/* 초기화 버튼 */}
        <button
          onClick={handleReset}
          className="py-4 px-6 rounded-xl font-bold text-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all shadow-md"
        >
          🔄 게임 초기화
        </button>

        {/* 나가기 버튼 (옵션) */}
        {onExit && (
          <button
            onClick={onExit}
            className="py-4 px-6 rounded-xl font-bold text-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all shadow-md"
          >
            ← 나가기
          </button>
        )}
      </footer>
    </div>
  );
}

export default RecycleCameraGame;