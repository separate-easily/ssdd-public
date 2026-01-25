// @ts-nocheck
/* eslint-disable */
/**
 * ============================================================
 * 활동 로그 상세 모달 컴포넌트
 * ============================================================
 *
 * 활동 로그 패널에서 행을 클릭했을 때 표시되는 상세 정보 모달입니다.
 * YOLO 결과, 포인트 정보 등 상세 데이터를 보여줍니다.
 *
 * 파일 위치: src/components/ActivityLogDetailModal.tsx
 */

import React from 'react';
import type { CameraActivityLogEntry } from '../domain/cameraActivityLog';
import {
  formatLogTime,
  LOG_KIND_STYLES,
  BIN_TYPE_LABELS,
  BIN_TYPE_EMOJIS,
} from '../domain/cameraActivityLog';

// ============================================================
// Props 타입 정의
// ============================================================

export interface ActivityLogDetailModalProps {
  /** 표시할 로그 항목 (null이면 모달 숨김) */
  log: CameraActivityLogEntry | null;

  /** 모달 닫기 콜백 */
  onClose: () => void;
}

// ============================================================
// 컴포넌트 구현
// ============================================================

/**
 * 활동 로그 상세 모달
 */
export function ActivityLogDetailModal({
  log,
  onClose,
}: ActivityLogDetailModalProps) {
  if (!log) return null;

  const kindStyle = LOG_KIND_STYLES[log.kind];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-cyan-500 to-green-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{kindStyle.emoji}</span>
              <span className="text-white font-bold text-lg">
                로그 상세 정보
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* 내용 */}
        <div className="px-6 py-4 space-y-4">
          {/* 시간 */}
          <div className="flex items-start gap-3">
            <span className="text-gray-500 w-20 flex-shrink-0">시간</span>
            <span className="font-mono text-sm text-gray-800">
              {formatLogTime(log.createdAt)}
            </span>
          </div>

          {/* 종류 태그 */}
          <div className="flex items-start gap-3">
            <span className="text-gray-500 w-20 flex-shrink-0">종류</span>
            <span
              className={`px-2 py-1 rounded-full text-sm font-medium ${kindStyle.colorClass}`}
            >
              {kindStyle.emoji} {kindStyle.label}
            </span>
          </div>

          {/* 세부 타입 */}
          <div className="flex items-start gap-3">
            <span className="text-gray-500 w-20 flex-shrink-0">타입</span>
            <span className="text-gray-800">{log.subType}</span>
          </div>

          {/* 요약 메시지 */}
          <div className="flex items-start gap-3">
            <span className="text-gray-500 w-20 flex-shrink-0">메시지</span>
            <span className="text-gray-800 font-medium">{log.message}</span>
          </div>

          {/* 아이 정보 (있을 경우) */}
          {log.childNickname && (
            <div className="flex items-start gap-3">
              <span className="text-gray-500 w-20 flex-shrink-0">참여자</span>
              <span className="text-gray-800">{log.childNickname} 친구</span>
            </div>
          )}

          {/* YOLO 결과 (있을 경우) */}
          {log.materialLabel && (
            <div className="bg-green-50 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-green-800 flex items-center gap-2">
                ♻️ YOLO 인식 결과
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">인식된 물질:</span>
                  <p className="font-medium text-gray-800">
                    {log.materialLabel}
                  </p>
                </div>
                {log.recommendedBin && (
                  <div>
                    <span className="text-gray-500">추천 배출통:</span>
                    <p className="font-medium text-gray-800">
                      {BIN_TYPE_EMOJIS[log.recommendedBin]}{' '}
                      {BIN_TYPE_LABELS[log.recommendedBin]}
                    </p>
                  </div>
                )}
                {log.chosenBin && (
                  <div>
                    <span className="text-gray-500">실제 선택:</span>
                    <p className="font-medium text-gray-800">
                      {BIN_TYPE_EMOJIS[log.chosenBin]}{' '}
                      {BIN_TYPE_LABELS[log.chosenBin]}
                    </p>
                  </div>
                )}
                {log.meta?.confidence !== undefined && (
                  <div>
                    <span className="text-gray-500">신뢰도:</span>
                    <p className="font-medium text-gray-800">
                      {(Number(log.meta.confidence) * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 정답/오답 (있을 경우) */}
          {log.isCorrect !== undefined && (
            <div className="flex items-start gap-3">
              <span className="text-gray-500 w-20 flex-shrink-0">결과</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  log.isCorrect
                    ? 'bg-green-100 text-green-800'
                    : 'bg-orange-100 text-orange-800'
                }`}
              >
                {log.isCorrect ? '✅ 정답' : '❌ 오답'}
              </span>
            </div>
          )}

          {/* 포인트 정보 (있을 경우) */}
          {log.pointsDelta !== undefined && (
            <div className="bg-yellow-50 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-yellow-800 flex items-center gap-2">
                ⭐ 포인트 정보
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">지급 포인트:</span>
                  <p className="font-medium text-gray-800">
                    +{log.pointsDelta}점
                  </p>
                </div>
                {log.totalPointsAfter !== undefined && (
                  <div>
                    <span className="text-gray-500">누적 포인트:</span>
                    <p className="font-medium text-gray-800">
                      {log.totalPointsAfter}점
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 라운드/세션 ID (개발용) */}
          <div className="text-xs text-gray-400 font-mono border-t pt-3 mt-3">
            <p>Session: {log.sessionId.slice(0, 8)}...</p>
            <p>Round: {log.roundId.slice(0, 8)}...</p>
            <p>Log ID: {log.id.slice(0, 8)}...</p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default ActivityLogDetailModal;