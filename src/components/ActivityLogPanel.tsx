// @ts-nocheck
/* eslint-disable */
/**
 * ============================================================
 * 활동 로그 패널 컴포넌트
 * ============================================================
 *
 * RecycleCameraGame 우측 영역에 표시되는 활동 로그 패널입니다.
 * 최신 로그가 맨 위에 오며, 스크롤하여 과거 로그를 볼 수 있습니다.
 * 행을 클릭하면 상세 모달이 열립니다.
 *
 * 파일 위치: src/components/ActivityLogPanel.tsx
 */

import React, { useState } from 'react';
import type { CameraActivityLogEntry } from '../domain/cameraActivityLog';
import {
  formatLogTime,
  LOG_KIND_STYLES,
  isYoloResultLog,
} from '../domain/cameraActivityLog';
import { ActivityLogDetailModal } from './ActivityLogDetailModal';

// ============================================================
// Props 타입 정의
// ============================================================

export interface ActivityLogPanelProps {
  /** 로그 목록 (최신순) */
  logs: CameraActivityLogEntry[];

  /** 패널 제목 */
  title?: string;

  /** 최대 높이 (기본: h-96) */
  maxHeightClass?: string;
}

// ============================================================
// 개별 로그 행 컴포넌트
// ============================================================

interface LogRowProps {
  log: CameraActivityLogEntry;
  onClick: () => void;
}

function LogRow({ log, onClick }: LogRowProps) {
  const kindStyle = LOG_KIND_STYLES[log.kind];
  const isYolo = isYoloResultLog(log);

  // 시간 포맷팅 (HH:mm:ss만 표시)
  const timeStr = formatLogTime(log.createdAt).split(' ').pop() || '';

  return (
    <div
      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
      onClick={onClick}
    >
      {/* 상단: 시간 + 종류 태그 */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-gray-400">{timeStr}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${kindStyle.colorClass}`}
        >
          {kindStyle.emoji} {kindStyle.label}
        </span>
      </div>

      {/* 메시지 */}
      <p className="text-sm text-gray-700 line-clamp-2">{log.message}</p>

      {/* YOLO 결과 힌트 */}
      {isYolo && (
        <p className="text-xs text-cyan-600 mt-1">
          📊 YOLO 인식 결과 있음 · 클릭하여 자세히 보기
        </p>
      )}

      {/* 정답/오답 표시 */}
      {log.isCorrect !== undefined && (
        <span
          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
            log.isCorrect
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {log.isCorrect ? '✅ 정답' : '❌ 오답'}
        </span>
      )}
    </div>
  );
}

// ============================================================
// 메인 컴포넌트
// ============================================================

/**
 * 활동 로그 패널
 *
 * 요구사항:
 * - 최신 로그가 맨 위
 * - 아래로 스크롤하면 과거 로그
 * - 각 행: 시간, 종류 태그, 한 줄 요약
 * - YOLO 결과 로그: 추가 힌트 표시
 * - 행 클릭 시 상세 모달 열기
 */
export function ActivityLogPanel({
  logs,
  title = '📋 활동 로그',
  maxHeightClass = 'h-96',
}: ActivityLogPanelProps) {
  const [selectedLog, setSelectedLog] = useState<CameraActivityLogEntry | null>(
    null
  );

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-green-500 flex items-center justify-between">
          <h2 className="text-white font-bold flex items-center gap-2">
            {title}
          </h2>
          <span className="text-white/80 text-sm">{logs.length}개</span>
        </div>

        {/* 로그 목록 */}
        <div className={`overflow-y-auto ${maxHeightClass}`}>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
              <span className="text-4xl mb-2">📝</span>
              <p className="text-sm">아직 활동 로그가 없어요</p>
              <p className="text-xs mt-1">게임을 시작하면 여기에 기록돼요!</p>
            </div>
          ) : (
            logs.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                onClick={() => setSelectedLog(log)}
              />
            ))
          )}
        </div>
      </div>

      {/* 상세 모달 */}
      <ActivityLogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </>
  );
}

export default ActivityLogPanel;