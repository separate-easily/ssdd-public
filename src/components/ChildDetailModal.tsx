/**
 * ============================================================
 * 아동 상세/수정 모달
 * ============================================================
 *
 * 아동 카드 클릭 시 표시되는 상세 정보 및 수정 모달입니다.
 * - 기본 정보 (이름, 나이, 반) 수정
 * - 포인트 + 활동 로그 표시
 * - 개별 로그의 포인트/정답여부 수정
 * - QR ID 펼쳐보기
 *
 * 파일 위치: src/components/ChildDetailModal.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../app/components/ui/dialog';
import { Button } from '../app/components/ui/button';
import { Input } from '../app/components/ui/input';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Pencil,
  X,
  Loader2,
  Star,
} from 'lucide-react';
import { SUPABASE_FUNCTIONS_BASE_URL } from '../../utils/supabase/info';

// ============================================================
// 타입 정의
// ============================================================

export interface Child {
  qrId: string;
  name: string;
  age: string;
  points: number;
  team?: string;
  className?: string; // 소속 반
  institutionId?: string;
  registeredAt?: string;
}

export interface ActivityLog {
  id: string;
  childQrId: string;
  institutionId: string;
  sessionId: string;
  roundId?: string;
  logType: 'login' | 'logout' | 'trash_correct' | 'trash_wrong';
  materialLabel?: string;
  recommendedBin?: string;
  chosenBin?: string;
  pointsDelta: number;
  isCorrect?: boolean;
  createdAt: string;
  modifiedAt?: string;
  modifiedReason?: string;
}

/**
 * 기관(반) 정보 인터페이스
 */
export interface Institution {
  id: string;
  name: string;
  ownerId?: string;
}

export interface ChildDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: Child | null;
  teams: string[];
  institutions?: Institution[]; // 전체 기관(반) 목록 - 반 이동용
  institutionId: string;
  publicAnonKey: string;
  onChildUpdated?: () => void;
}

// ============================================================
// 유틸리티 함수
// ============================================================

function formatDateTime(isoString: string): { date: string; time: string; dayOfWeek: string } {
  const d = new Date(isoString);
  const days = ['일', '월', '화', '수', '목', '금', '토'];

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return {
    date: `${year}.${month}.${day}`,
    time: `${hours}:${minutes}`,
    dayOfWeek: days[d.getDay()],
  };
}

function groupLogsByDate(logs: ActivityLog[]): Map<string, ActivityLog[]> {
  const grouped = new Map<string, ActivityLog[]>();

  logs.forEach(log => {
    const { date, dayOfWeek } = formatDateTime(log.createdAt);
    const key = `${date} (${dayOfWeek})`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(log);
  });

  return grouped;
}

const BIN_LABELS: Record<string, string> = {
  plastic: '플라스틱류',
  paper: '종이류',
  vinyl: '비닐류',
  general: '일반쓰레기',
  canBotble: '캔/병류',
};

// ============================================================
// 로그 수정 모달 컴포넌트
// ============================================================

interface LogEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: ActivityLog | null;
  onSave: (logId: string, pointsDelta: number, isCorrect: boolean, reason: string) => Promise<void>;
}

function LogEditModal({ open, onOpenChange, log, onSave }: LogEditModalProps) {
  const [points, setPoints] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (log) {
      setPoints(log.pointsDelta);
      setIsCorrect(log.isCorrect ?? false);
      setReason('');
    }
  }, [log]);

  const handleSave = async () => {
    if (!log) return;
    setIsSaving(true);
    try {
      await onSave(log.id, points, isCorrect, reason);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!log) return null;

  const { date, time } = formatDateTime(log.createdAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5" />
            포인트 수정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 로그 정보 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">{date} {time}</p>
            <p className="font-medium mt-1">
              🗑️ {log.materialLabel || '쓰레기'} → {BIN_LABELS[log.chosenBin || ''] || log.chosenBin}
            </p>
          </div>

          {/* 정답 여부 변경 */}
          <div>
            <label className="text-sm font-medium block mb-2">정답 여부</label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCorrect(true)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  isCorrect
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                ✅ 정답
              </button>
              <button
                onClick={() => setIsCorrect(false)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  !isCorrect
                    ? 'bg-red-100 border-red-500 text-red-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                ❌ 오답
              </button>
            </div>
          </div>

          {/* 포인트 변경 */}
          <div>
            <label className="text-sm font-medium block mb-2">포인트</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPoints(p => Math.max(0, p - 10))}
              >
                -10
              </Button>
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="text-center font-bold text-lg"
                min={0}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPoints(p => p + 10)}
              >
                +10
              </Button>
            </div>
          </div>

          {/* 수정 사유 */}
          <div>
            <label className="text-sm font-medium block mb-2">수정 사유 (선택)</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 실제로는 맞게 버림"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin mr-2 size-4" /> : null}
            수정하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export function ChildDetailModal({
  open,
  onOpenChange,
  child,
  teams,
  institutions = [], // 전체 기관(반) 목록
  institutionId,
  publicAnonKey,
  onChildUpdated,
}: ChildDetailModalProps) {
  // 기관(반) 이름 목록 추출
  const classes = institutions.map(inst => inst.name);
  // 기본 정보 수정 상태
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [team, setTeam] = useState('');
  const [childClass, setChildClass] = useState(''); // 소속 반

  // 활동 로그 상태
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'camera' | 'other'>('all'); // 로그 필터

  // QR ID 펼치기 상태
  const [showQrId, setShowQrId] = useState(false);
  const [copiedQrId, setCopiedQrId] = useState(false);

  // 저장 상태
  const [isSaving, setIsSaving] = useState(false);

  // 로그 수정 모달 상태
  const [editingLog, setEditingLog] = useState<ActivityLog | null>(null);
  const [showLogEditModal, setShowLogEditModal] = useState(false);

  // 활동 로그 로드 함수
  const loadActivityLogs = async (childQrId: string, instId: string) => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_BASE_URL}/activity-log/list/${childQrId}/${instId}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Failed to load activity logs:', error);
      setLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // child가 변경되면 상태 초기화
  useEffect(() => {
    if (child) {
      // child에 저장된 institutionId 우선 사용
      const effectiveInstitutionId = child.institutionId || institutionId;

      console.log('[ChildDetailModal] Loading child:', {
        qrId: child.qrId,
        childInstitutionId: child.institutionId,
        propsInstitutionId: institutionId,
        effectiveInstitutionId,
      });

      setName(child.name);
      setAge(child.age);
      // 소속 반: child.team이 없거나 "팀"이 포함되어 있으면 현재 기관 이름으로 초기화
      const currentInstitution = institutions.find(inst => inst.id === effectiveInstitutionId);
      // child.team이 게임팀(숫자팀)이 아닌 경우에만 사용, 아니면 현재 기관 이름
      const isGameTeam = child.team && child.team.includes('팀');
      setTeam(isGameTeam ? (currentInstitution?.name || '') : (child.team || currentInstitution?.name || ''));
      setChildClass(child.className || (isGameTeam ? child.team : '')); // 게임 팀
      setShowQrId(false);
      setLogFilter('all');
      // 활동 로그 로드 (child의 institutionId 사용)
      loadActivityLogs(child.qrId, effectiveInstitutionId);
    }
  }, [child, institutions, institutionId, publicAnonKey]);

  // QR ID 복사
  const copyQrId = async () => {
    if (!child) return;
    await navigator.clipboard.writeText(child.qrId);
    setCopiedQrId(true);
    setTimeout(() => setCopiedQrId(false), 2000);
  };

  // 정보 저장
  const handleSave = async () => {
    if (!child) return;

    setIsSaving(true);
    try {
      // child 자체에 저장된 institutionId 우선 사용 (백엔드가 child:${qrId}:${institutionId} 키로 찾기 때문)
      // child.institutionId가 없으면 props의 institutionId 사용
      const effectiveInstitutionId = child.institutionId || institutionId;

      console.log('[ChildDetailModal] Saving with:', {
        qrId: child.qrId,
        effectiveInstitutionId,
        childInstitutionId: child.institutionId,
        propsInstitutionId: institutionId,
      });

      const response = await fetch(
        `${SUPABASE_FUNCTIONS_BASE_URL}/child/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            qrId: child.qrId,
            institutionId: effectiveInstitutionId, // child에 저장된 institutionId 우선 사용
            name,
            age,
            team: team || null, // 소속 반 이름 (표시용)
            className: childClass || null, // 게임 팀
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        onChildUpdated?.();
        onOpenChange(false);
      } else {
        alert('저장에 실패했습니다: ' + data.message);
      }
    } catch (error) {
      console.error('Failed to save child:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 로그 수정 저장
  const handleLogSave = async (logId: string, pointsDelta: number, isCorrect: boolean, reason: string) => {
    if (!child) return;

    const response = await fetch(
      `${SUPABASE_FUNCTIONS_BASE_URL}/activity-log/update`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          logId,
          childQrId: child.qrId,
          institutionId,
          pointsDelta,
          isCorrect,
          modifiedReason: reason,
        }),
      }
    );

    const data = await response.json();
    if (data.success) {
      // 로그 목록 새로고침
      loadActivityLogs();
      // 부모 컴포넌트에 알림 (포인트 변경됨)
      onChildUpdated?.();
    } else {
      alert('수정에 실패했습니다: ' + data.message);
    }
  };

  // 로그 필터링
  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'camera') {
      // 카메라 게임 관련 로그 (login, logout, trash_correct, trash_wrong)
      return ['login', 'logout', 'trash_correct', 'trash_wrong'].includes(log.logType);
    }
    if (logFilter === 'other') {
      // 기타 게임 로그 (ox, quiz, card)
      return ['ox_correct', 'ox_wrong', 'quiz_correct', 'quiz_wrong', 'card_correct', 'card_wrong'].includes(log.logType);
    }
    return true;
  });

  // 날짜별 로그 그룹핑 (필터링된 로그 사용)
  const groupedLogs = groupLogsByDate(filteredLogs);

  if (!child) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              👶 {child.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* ═══════════ 기본 정보 ═══════════ */}
            <section>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-green-500 rounded-full" />
                기본 정보
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* 이름 */}
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">📝 이름</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="아이 이름"
                  />
                </div>

                {/* 나이 */}
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">🎂 나이</label>
                  <Input
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="나이"
                  />
                </div>
              </div>

              {/* 소속 반 (드롭다운) - team 필드 사용 */}
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-600 block mb-2">🏫 소속 반</label>
                <select
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">반 선택 안함</option>
                  {classes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* 소속 팀 - 게임용 팀 (teams prop 사용) */}
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-600 block mb-2">👥 게임 팀</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setChildClass('')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      childClass === ''
                        ? 'bg-gray-100 text-gray-700 border-gray-300 ring-2 ring-gray-400 ring-offset-1'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    없음
                  </button>
                  {teams.map(t => (
                    <button
                      key={t}
                      onClick={() => setChildClass(t)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        childClass === t
                          ? 'bg-green-100 text-green-700 border-green-300 ring-2 ring-green-500 ring-offset-1'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ═══════════ 포인트 & 활동 기록 ═══════════ */}
            <section>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-yellow-500 rounded-full" />
                포인트 & 활동 기록
              </h3>

              {/* 누적 포인트 */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 mb-4 flex items-center gap-3">
                <Star className="size-8 text-yellow-500 fill-yellow-400" />
                <div>
                  <p className="text-sm text-gray-500">누적 포인트</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {child.points.toLocaleString()}점
                  </p>
                </div>
              </div>

              {/* 활동 로그 */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-600">
                    📋 활동 기록 {filteredLogs.length > 0 && `(${filteredLogs.length}건)`}
                  </p>
                  {/* 필터 탭 */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => setLogFilter('all')}
                      className={`px-2 py-1 text-xs rounded-md transition-all ${
                        logFilter === 'all'
                          ? 'bg-green-100 text-green-700 font-medium'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      전체
                    </button>
                    <button
                      onClick={() => setLogFilter('camera')}
                      className={`px-2 py-1 text-xs rounded-md transition-all ${
                        logFilter === 'camera'
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      📷 카메라
                    </button>
                    <button
                      onClick={() => setLogFilter('other')}
                      className={`px-2 py-1 text-xs rounded-md transition-all ${
                        logFilter === 'other'
                          ? 'bg-purple-100 text-purple-700 font-medium'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      🎮 퀴즈
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin size-6 text-gray-400" />
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>아직 활동 기록이 없습니다</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {Array.from(groupedLogs.entries()).map(([dateKey, dateLogs]) => (
                        <div key={dateKey}>
                          {/* 날짜 헤더 */}
                          <div className="bg-gray-50 px-4 py-1.5 sticky top-0">
                            <p className="text-xs font-medium text-gray-500">{dateKey}</p>
                          </div>

                          {/* 해당 날짜 로그들 */}
                          {dateLogs.map(log => {
                            const { time } = formatDateTime(log.createdAt);
                            const isTrashLog = log.logType === 'trash_correct' || log.logType === 'trash_wrong';
                            const isOxLog = log.logType === 'ox_correct' || log.logType === 'ox_wrong';
                            const isQuizLog = log.logType === 'quiz_correct' || log.logType === 'quiz_wrong';
                            const isCardLog = log.logType === 'card_correct' || log.logType === 'card_wrong';
                            const isOtherGame = isOxLog || isQuizLog || isCardLog;

                            // 게임 모드 표시 (팀/반)
                            const gameModeLabel = (log as any).gameMode === 'team'
                              ? `👥 팀(${(log as any).participatingTeams || ''})`
                              : (log as any).gameMode === 'class' ? '🏫 반' : '';

                            return (
                              <div
                                key={log.id}
                                className="px-4 py-2 hover:bg-gray-50 flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-400 w-12">{time}</span>

                                  {log.logType === 'login' && (
                                    <span className="text-sm">🔓 로그인</span>
                                  )}
                                  {log.logType === 'logout' && (
                                    <span className="text-sm">🔒 로그아웃</span>
                                  )}
                                  {isTrashLog && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">
                                        📷 {log.materialLabel || '쓰레기'}
                                      </span>
                                      <span className="text-gray-400">→</span>
                                      <span className={`text-sm font-medium ${
                                        log.isCorrect ? 'text-green-600' : 'text-red-500'
                                      }`}>
                                        {log.isCorrect ? '✅ 정답' : '❌ 오답'}
                                      </span>
                                      {log.modifiedAt && (
                                        <span className="text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                                          수정됨
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {isOxLog && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">⭕❌ OX퀴즈</span>
                                      <span className={`text-sm font-medium ${
                                        log.isCorrect ? 'text-green-600' : 'text-red-500'
                                      }`}>
                                        {log.isCorrect ? '✅ 정답' : '❌ 오답'}
                                      </span>
                                      {gameModeLabel && (
                                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                          {gameModeLabel}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {isQuizLog && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">🗑️ 사지선다</span>
                                      <span className={`text-sm font-medium ${
                                        log.isCorrect ? 'text-green-600' : 'text-red-500'
                                      }`}>
                                        {log.isCorrect ? '✅ 정답' : '❌ 오답'}
                                      </span>
                                      {gameModeLabel && (
                                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                          {gameModeLabel}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {isCardLog && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">🃏 카드매칭</span>
                                      <span className={`text-sm font-medium ${
                                        log.isCorrect ? 'text-green-600' : 'text-red-500'
                                      }`}>
                                        {log.isCorrect ? '✅ 정답' : '❌ 오답'}
                                      </span>
                                      {gameModeLabel && (
                                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                          {gameModeLabel}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {log.pointsDelta > 0 && (
                                    <span className={`text-sm font-medium ${
                                      log.isCorrect ? 'text-green-600' : 'text-orange-500'
                                    }`}>
                                      +{log.pointsDelta}점
                                    </span>
                                  )}
                                  {log.pointsDelta === 0 && !log.isCorrect && (isTrashLog || isOtherGame) && (
                                    <span className="text-sm font-medium text-gray-400">
                                      0점
                                    </span>
                                  )}

                                  {/* 수정 버튼 (trash 및 기타 게임 로그) */}
                                  {(isTrashLog || isOtherGame) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingLog(log);
                                        setShowLogEditModal(true);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                                    >
                                      <Pencil className="size-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ═══════════ 추가 정보 ═══════════ */}
            <section>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-500 rounded-full" />
                추가 정보
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* 부모님 연동 */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-600 mb-2">👨‍👩‍👧 부모님 연동</p>
                  <div className="bg-gray-100 rounded px-3 py-2 text-gray-400 text-sm">
                    🔒 개발 예정
                  </div>
                </div>

                {/* QR ID */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-600 mb-2">🔖 QR ID</p>
                  <button
                    onClick={() => setShowQrId(!showQrId)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showQrId ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    {showQrId ? '접기' : '펼치기'}
                  </button>

                  {showQrId && (
                    <div className="mt-2 bg-white rounded border p-2 flex items-center justify-between">
                      <code className="text-xs text-gray-600 break-all">{child.qrId}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyQrId}
                        className="ml-2 shrink-0"
                      >
                        {copiedQrId ? (
                          <Check className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? <Loader2 className="animate-spin mr-2 size-4" /> : null}
              저장하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 로그 수정 모달 */}
      <LogEditModal
        open={showLogEditModal}
        onOpenChange={setShowLogEditModal}
        log={editingLog}
        onSave={handleLogSave}
      />
    </>
  );
}

export default ChildDetailModal;