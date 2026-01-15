/**
 * ============================================================
 * 분리배출 게임 테스트 페이지
 * ============================================================
 *
 * RecycleCameraGame 컴포넌트를 독립적으로 테스트하기 위한 페이지입니다.
 * App.tsx나 다른 Figma 파일을 수정하지 않고도 게임 엔진을 확인할 수 있습니다.
 *
 * 사용법:
 * 1. App.tsx에서 라우팅 추가 (나중에)
 * 2. 또는 브라우저에서 직접 import하여 테스트
 *
 * 파일 위치: src/pages/TestRecycleGame.tsx
 */

import React from 'react';
import RecycleCameraGame from '../components/RecycleCameraGame';

export default function TestRecycleGame() {
  const handleExit = () => {
    console.log('[TestRecycleGame] 나가기 버튼 클릭됨');
    // 실제 연동 시에는 navigate 등으로 이전 화면으로 돌아감
    alert('게임을 종료합니다. (테스트 모드)');
  };

  return (
    <div className="min-h-screen">
      {/* 테스트 모드 표시 배너 */}
      <div className="bg-yellow-400 text-black text-center py-2 text-sm font-bold">
        🧪 테스트 모드 - RecycleCameraGame 독립 실행 중
      </div>

      {/* 실제 게임 컴포넌트 */}
      <RecycleCameraGame onExit={handleExit} />
    </div>
  );
}