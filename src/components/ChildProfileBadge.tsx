// @ts-nocheck
/* eslint-disable */
/**
 * ============================================================
 * 아이 프로필 배지 컴포넌트
 * ============================================================
 *
 * QR 인식 후 카메라 영역 좌상단에 표시되는 작은 프로필 카드입니다.
 * IDCard.tsx를 참고하여 만들었으나, 더 작고 간결한 형태입니다.
 *
 * 파일 위치: src/components/ChildProfileBadge.tsx
 */

import React from 'react';
import type { ChildProfile } from '../domain/childProfile';

// ============================================================
// Props 타입 정의
// ============================================================

export interface ChildProfileBadgeProps {
  /** 아이 프로필 정보 */
  profile: ChildProfile;

  /** 표시 크기 */
  size?: 'small' | 'medium' | 'large';

  /** 클릭 시 콜백 (선택적) */
  onClick?: () => void;
}

// ============================================================
// 크기별 스타일
// ============================================================

const SIZE_STYLES = {
  small: {
    container: 'px-3 py-2 gap-2',
    emoji: 'text-2xl',
    name: 'text-sm',
    points: 'text-xs',
  },
  medium: {
    container: 'px-4 py-3 gap-3',
    emoji: 'text-3xl',
    name: 'text-base',
    points: 'text-sm',
  },
  large: {
    container: 'px-5 py-4 gap-4',
    emoji: 'text-4xl',
    name: 'text-lg',
    points: 'text-base',
  },
} as const;

// ============================================================
// 컴포넌트 구현
// ============================================================

/**
 * 아이 프로필 배지
 *
 * QR ON 모드에서 아이가 인식되면 카메라 영역 좌상단에 표시됩니다.
 * 둥근 가로 직사각형 형태로, 동물 이모지 + 별명 + 누적 포인트를 보여줍니다.
 */
export function ChildProfileBadge({
  profile,
  size = 'medium',
  onClick,
}: ChildProfileBadgeProps) {
  const styles = SIZE_STYLES[size];

  return (
    <div
      className={`
        inline-flex items-center rounded-full shadow-lg
        ${profile.colorClass}
        ${styles.container}
        ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
        border-2 border-white/50 backdrop-blur-sm
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* 동물 캐릭터 이모지 */}
      <span className={`${styles.emoji} drop-shadow-md`}>
        {profile.character}
      </span>

      {/* 텍스트 영역 */}
      <div className="flex flex-col">
        {/* 별명 */}
        <span className={`${styles.name} font-bold text-white drop-shadow-sm`}>
          {profile.nickname} 친구
        </span>

        {/* 누적 포인트 */}
        <span className={`${styles.points} text-white/90`}>
          ⭐ {profile.totalPoints}점
        </span>
      </div>
    </div>
  );
}

// ============================================================
// 반 전체 모드용 배지
// ============================================================

export interface ClassModeBadgeProps {
  /** 반 이름 (선택적) */
  className?: string;

  /** 반 전체 포인트 */
  totalPoints?: number;

  /** 표시 크기 */
  size?: 'small' | 'medium' | 'large';
}

/**
 * 반 전체 모드 배지
 *
 * QR OFF 모드에서 표시되는 배지입니다.
 * 개별 아이가 아닌 "우리 반 전체"를 나타냅니다.
 */
export function ClassModeBadge({
  className = '우리 반',
  totalPoints = 0,
  size = 'medium',
}: ClassModeBadgeProps) {
  const styles = SIZE_STYLES[size];

  return (
    <div
      className={`
        inline-flex items-center rounded-full shadow-lg
        bg-gradient-to-br from-emerald-400 to-teal-500
        ${styles.container}
        border-2 border-white/50 backdrop-blur-sm
      `}
    >
      {/* 반 아이콘 */}
      <span className={`${styles.emoji} drop-shadow-md`}>🏫</span>

      {/* 텍스트 영역 */}
      <div className="flex flex-col">
        {/* 반 이름 */}
        <span className={`${styles.name} font-bold text-white drop-shadow-sm`}>
          {className}
        </span>

        {/* 반 전체 포인트 */}
        <span className={`${styles.points} text-white/90`}>
          ⭐ {totalPoints}점
        </span>
      </div>
    </div>
  );
}

export default ChildProfileBadge;