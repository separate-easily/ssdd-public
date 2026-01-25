// @ts-nocheck
/* eslint-disable */

import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowLeft, ArrowRight, Eye, Plus, Check, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { RecycleCameraGame } from '../../components/RecycleCameraGame';
import type { ChildProfile } from '../../domain/childProfile';
import { mapSupabaseChildToChildProfile } from '../../domain/childProfile';
// DEMO_MODE 제거됨 - Supabase만 사용
import { SUPABASE_FUNCTIONS_BASE_URL, publicAnonKey as anonKey } from '../../../utils/supabase/info';

interface GameScreenProps {
  institutionId: string;
  institutionName: string;
  projectId: string;
  publicAnonKey: string;
}

interface Child {
  qrId: string;
  name: string;
  age: string;
  points: number;
  team?: string;
}

// 저학년(1~3학년) 분류 게임 문제 (사지선다)
const CLASSIFICATION_ITEMS = [
  // 플라스틱 (1~10)
  { emoji: '🧃', question: '빈 페트병은 어디에 버릴까요?', options: ['종이', '유리', '플라스틱', '음식물'], answer: 2 },
  { emoji: '🧃', question: '페트병에 물이 남아 있으면 어떻게 해야 할까요?', options: ['그냥 버린다', '물을 버리고 씻는다', '땅에 버린다', '음식물에 버린다'], answer: 1 },
  { emoji: '🧃', question: '페트병 뚜껑은 어떻게 버릴까요?', options: ['병과 함께', '따로 분리', '음식물', '종이'], answer: 1 },
  { emoji: '🥤', question: '플라스틱 컵은 어떻게 버릴까요?', options: ['씻어서 버린다', '그대로 버린다', '종이에 버린다', '유리에 버린다'], answer: 0 },
  { emoji: '🥤', question: '음식이 묻은 플라스틱은?', options: ['그냥 버린다', '씻어서 버린다', '땅에 묻는다', '태운다'], answer: 1 },
  { emoji: '🥤', question: '빨대는 무엇으로 만들어졌을까요?', options: ['종이', '플라스틱', '유리', '금속'], answer: 1 },
  { emoji: '🧃', question: '다음 중 플라스틱인 것은?', options: ['신문지', '유리병', '페트병', '캔'], answer: 2 },
  { emoji: '🥤', question: '더러운 플라스틱은 어디에 버릴까요?', options: ['플라스틱', '종이', '일반쓰레기', '유리'], answer: 2 },
  { emoji: '♻️', question: '플라스틱을 깨끗이 버리면 좋은 이유는?', options: ['냄새가 난다', '다시 쓸 수 있다', '더러워진다', '위험하다'], answer: 1 },
  { emoji: '🧴', question: '플라스틱은 어디에 버릴까요?', options: ['아무 데나', '재활용 상자', '음식물', '길바닥'], answer: 1 },
  
  // 종이 (11~20)
  { emoji: '📰', question: '신문지는 어디에 버릴까요?', options: ['플라스틱', '종이', '유리', '캔'], answer: 1 },
  { emoji: '🧻', question: '사용한 휴지는 어디에 버릴까요?', options: ['종이', '플라스틱', '일반쓰레기', '유리'], answer: 2 },
  { emoji: '📄', question: '깨끗한 종이는 어떻게 할까요?', options: ['버린다', '재활용한다', '태운다', '숨긴다'], answer: 1 },
  { emoji: '📄', question: '젖은 종이는 재활용이 될까요?', options: ['잘 된다', '조금 된다', '어렵다', '꼭 된다'], answer: 2 },
  { emoji: '📦', question: '종이 상자는 어떻게 버릴까요?', options: ['접어서 버린다', '구겨서 던진다', '물에 넣는다', '태운다'], answer: 0 },
  { emoji: '📦', question: '종이에 음식이 묻으면?', options: ['괜찮다', '씻는다', '재활용이 안 된다', '다시 쓴다'], answer: 2 },
  { emoji: '🎨', question: '색종이는 무엇일까요?', options: ['플라스틱', '종이', '유리', '캔'], answer: 1 },
  { emoji: '🥤', question: '종이컵은 어디에 버릴까요?', options: ['종이', '플라스틱', '일반쓰레기', '유리'], answer: 2 },
  { emoji: '📚', question: '책을 버릴 때 맞는 것은?', options: ['그대로 버린다', '표지를 떼고 버린다', '물에 넣는다', '태운다'], answer: 1 },
  { emoji: '📄', question: '종이는 어떻게 버리는 것이 좋을까요?', options: ['섞어서', '종이끼리', '아무 데나', '길에'], answer: 1 },
  
  // 유리 (21~30)
  { emoji: '🍾', question: '유리병은 어디에 버릴까요?', options: ['종이', '플라스틱', '유리', '캔'], answer: 2 },
  { emoji: '🍾', question: '유리병을 버리기 전 해야 할 일은?', options: ['깨뜨린다', '씻는다', '던진다', '숨긴다'], answer: 1 },
  { emoji: '🔨', question: '깨진 유리는 어떻게 할까요?', options: ['그냥 버린다', '던진다', '신문지에 싸서 버린다', '재활용한다'], answer: 2 },
  { emoji: '🍾', question: '유리병 뚜껑은 어떻게 할까요?', options: ['그대로 둔다', '떼서 버린다', '깨뜨린다', '물에 넣는다'], answer: 1 },
  { emoji: '🏺', question: '도자기 그릇은 어디에 버릴까요?', options: ['유리', '플라스틱', '일반쓰레기', '종이'], answer: 2 },
  { emoji: '🔪', question: '유리는 왜 조심해야 할까요?', options: ['냄새가 나서', '무거워서', '손을 다칠 수 있어서', '색이 있어서'], answer: 2 },
  { emoji: '♻️', question: '유리병은 재활용이 될까요?', options: ['안 된다', '가끔 된다', '된다', '모른다'], answer: 2 },
  { emoji: '🍾', question: '유리병은 어디에 버리면 안 될까요?', options: ['유리 상자', '재활용함', '아무 데나', '정해진 곳'], answer: 2 },
  { emoji: '✨', question: '유리병은 어떤 상태로 버릴까요?', options: ['더럽게', '깨끗하게', '젖게', '깨서'], answer: 1 },
  { emoji: '🗑️', question: '유리병 안에 쓰레기를 넣어도 될까요?', options: ['된다', '가끔 된다', '안 된다', '상관없다'], answer: 2 },
  
  // 캔 & 기본 (31~40)
  { emoji: '🥫', question: '음료 캔은 무엇으로 만들어졌을까요?', options: ['종이', '플라스틱', '금속', '유리'], answer: 2 },
  { emoji: '🥫', question: '캔은 어떻게 버릴까요?', options: ['씻어서', '그냥', '음식물에', '종이에'], answer: 0 },
  { emoji: '🥫', question: '캔에 음료가 남아 있으면?', options: ['괜찮다', '버려도 된다', '안 된다', '숨긴다'], answer: 2 },
  { emoji: '🥫', question: '캔은 어떻게 하면 좋을까요?', options: ['찢는다', '찌그러뜨린다', '던진다', '숨긴다'], answer: 1 },
  { emoji: '♻️', question: '캔은 재활용이 될까요?', options: ['안 된다', '된다', '가끔 된다', '모른다'], answer: 1 },
  { emoji: '🥫', question: '캔은 플라스틱일까요?', options: ['맞다', '아니다', '가끔 맞다', '모른다'], answer: 1 },
  { emoji: '🗑️', question: '캔에 쓰레기를 넣어도 될까요?', options: ['된다', '가끔 된다', '안 된다', '상관없다'], answer: 2 },
  { emoji: '🥫', question: '캔은 어디에 버릴까요?', options: ['재활용 상자', '길바닥', '음식물', '화단'], answer: 0 },
  { emoji: '🌍', question: '분리수거를 하면 어떤 점이 좋을까요?', options: ['쓰레기가 늘어난다', '지구가 아프다', '자원을 아낀다', '냄새가 난다'], answer: 2 },
  { emoji: '👦', question: '분리수거는 누가 할 수 있을까요?', options: ['어른만', '어린이도', '선생님만', '아무도 못 한다'], answer: 1 },
  
  // 환경 생각 (41~50)
  { emoji: '🗑️', question: '쓰레기는 어떻게 버려야 할까요?', options: ['아무 데나', '나누어서', '길에', '던져서'], answer: 1 },
  { emoji: '✨', question: '재활용품은 어떤 상태가 좋을까요?', options: ['더럽게', '깨끗하게', '젖게', '찢어서'], answer: 1 },
  { emoji: '🌳', question: '재활용을 하면 어떤 일이 생길까요?', options: ['쓰레기 증가', '자원 낭비', '환경 보호', '위험'], answer: 2 },
  { emoji: '🌱', question: '쓰레기를 줄이면 어떤 점이 좋을까요?', options: ['냄새가 난다', '지구가 깨끗해진다', '힘들다', '모른다'], answer: 1 },
  { emoji: '🏫', question: '분리수거는 어디에서 할까요?', options: ['집에서만', '학교에서만', '집과 학교', '아무 데서나'], answer: 2 },
  { emoji: '♻️', question: '재활용은 왜 필요할까요?', options: ['재미있어서', '자원을 아끼기 위해', '귀찮아서', '숙제라서'], answer: 1 },
  { emoji: '🚫', question: '쓰레기를 길에 버리면?', options: ['괜찮다', '깨끗해진다', '안 된다', '상관없다'], answer: 2 },
  { emoji: '⏰', question: '분리수거는 언제 할까요?', options: ['필요 없을 때', '생각날 때', '항상', '가끔'], answer: 2 },
  { emoji: '👍', question: '재활용은 우리에게 어떤 행동일까요?', options: ['나쁜 행동', '귀찮은 행동', '좋은 행동', '위험한 행동'], answer: 2 },
  { emoji: '😊', question: '분리수거를 잘하면 지구는?', options: ['아프다', '웃는다', '더러워진다', '화난다'], answer: 1 },
];

// 저학년(1~3학년) OX 퀴즈 문제
const OX_QUIZ_ITEMS = [
  // 플라스틱 (1~10)
  { emoji: '🧃', question: '빈 페트병은 씻어서 버린다.', answer: true, reason: '안에 남은 음료가 있으면 재활용이 안 돼요.' },
  { emoji: '🧃', question: '물이 남아 있는 페트병은 그대로 버려도 된다.', answer: false, reason: '물이 있으면 다른 재활용품이 더러워져요.' },
  { emoji: '🧃', question: '페트병은 플라스틱이다.', answer: true, reason: '페트병은 플라스틱으로 만들어졌어요.' },
  { emoji: '🧃', question: '페트병 뚜껑은 따로 버린다.', answer: true, reason: '뚜껑과 병은 재질이 달라요.' },
  { emoji: '🥤', question: '더러운 플라스틱은 재활용이 어렵다.', answer: true, reason: '더러우면 다시 쓰기 힘들어요.' },
  { emoji: '🥤', question: '플라스틱 컵은 씻어서 버린다.', answer: true, reason: '깨끗해야 재활용할 수 있어요.' },
  { emoji: '🥤', question: '음식이 묻은 플라스틱은 그냥 버린다.', answer: false, reason: '음식은 씻어서 버려야 해요.' },
  { emoji: '🥤', question: '빨대는 플라스틱이다.', answer: true, reason: '빨대는 플라스틱으로 만들어졌어요.' },
  { emoji: '🥤', question: '빨대는 재활용이 잘 된다.', answer: false, reason: '너무 작아서 재활용하기 어려워요.' },
  { emoji: '🧴', question: '플라스틱은 재활용 상자에 버린다.', answer: true, reason: '플라스틱은 따로 모아야 해요.' },
  
  // 종이 (11~20)
  { emoji: '📰', question: '신문지는 종다.', answer: true, reason: '종이로 만들어졌어요.' },
  { emoji: '🧻', question: '사용한 휴지는 종이로 재활용한다.', answer: false, reason: '더러워서 재활용이 안 돼요.' },
  { emoji: '📄', question: '깨끗한 종이는 재활용할 수 있다.', answer: true, reason: '다시 종이로 만들 수 있어요.' },
  { emoji: '📄', question: '젖은 종이는 재활용이 어렵다.', answer: true, reason: '물에 젖으면 찢어지고 더러워져요.' },
  { emoji: '📦', question: '종이 상자는 접어서 버린다.', answer: true, reason: '부피를 줄일 수 있어요.' },
  { emoji: '📦', question: '종이에 음식이 묻어도 괜찮다.', answer: false, reason: '음식이 묻으면 재활용이 안 돼요.' },
  { emoji: '🎨', question: '색종이는 종이다.', answer: true, reason: '종이로 만들어졌어요.' },
  { emoji: '🥤', question: '종이컵은 종이로 재활용한다.', answer: false, reason: '안쪽에 코팅이 되어 있어요.' },
  { emoji: '📚', question: '책은 그대로 종이로 버린다.', answer: false, reason: '표지와 테이프를 떼야 해요.' },
  { emoji: '📄', question: '종이는 종이끼리 모아서 버린다.', answer: true, reason: '같은 것끼리 모아야 해요.' },
  
  // 유리 (21~30)
  { emoji: '🍾', question: '유리병은 깨지기 쉽다.', answer: true, reason: '떨어뜨리면 쉽게 깨져요.' },
  { emoji: '🍾', question: '유리병은 씻어서 버린다.', answer: true, reason: '깨끗해야 다시 쓸 수 있어요.' },
  { emoji: '🔨', question: '깨진 유리는 그냥 버린다.', answer: false, reason: '손이 다칠 수 있어요.' },
  { emoji: '🍾', question: '유리병 뚜껑은 떼서 버린다.', answer: true, reason: '뚜껑은 금속이나 플라스틱이에요.' },
  { emoji: '🍾', question: '유리병은 재활용할 수 있다.', answer: true, reason: '녹여서 다시 병을 만들 수 있어요.' },
  { emoji: '🏺', question: '도자기 그릇은 유리병이다.', answer: false, reason: '유리와 재질이 달라요.' },
  { emoji: '🔪', question: '유리는 손을 다치게 할 수 있다.', answer: true, reason: '날카로워서 위험해요.' },
  { emoji: '🍾', question: '유리병은 아무 데나 버린다.', answer: false, reason: '정해진 곳에 버려야 해요.' },
  { emoji: '🍾', question: '유리병은 깨끗해야 한다.', answer: true, reason: '더러우면 재활용이 안 돼요.' },
  { emoji: '♻️', question: '유리병은 재활용 상자에 버린다.', answer: true, reason: '유리끼리 모아서 버려요.' },
  
  // 캔 (31~38)
  { emoji: '🥫', question: '음료 캔은 금속이다.', answer: true, reason: '캔은 금속으로 만들어졌어요.' },
  { emoji: '🥫', question: '캔은 씻어서 버린다.', answer: true, reason: '안에 남은 음료를 없애야 해요.' },
  { emoji: '🥫', question: '캔에 음료가 남아 있어도 된다.', answer: false, reason: '다른 재활용품을 더럽혀요.' },
  { emoji: '🥫', question: '캔은 찌그러뜨려 버린다.', answer: true, reason: '공간을 적게 차지해요.' },
  { emoji: '🥫', question: '캔은 재활용할 수 있다.', answer: true, reason: '다시 캔이나 물건을 만들 수 있어요.' },
  { emoji: '🥫', question: '캔은 플라스틱이다.', answer: false, reason: '캔은 금속이에요.' },
  { emoji: '🥫', question: '캔에 쓰레기를 넣어 버린다.', answer: false, reason: '재활용이 안 돼요.' },
  { emoji: '♻️', question: '캔은 재활용 상자에 버린다.', answer: true, reason: '캔끼리 모아야 해요.' },
  
  // 분리수거 기본 (39~50)
  { emoji: '🌍', question: '분리수거를 하면 지구가 좋아진다.', answer: true, reason: '쓰레기가 줄어들어요.' },
  { emoji: '🗑️', question: '쓰레기는 모두 한 곳에 버린다.', answer: false, reason: '나누어 버려야 해요.' },
  { emoji: '♻️', question: '재활용품은 깨끗하게 버린다.', answer: true, reason: '다시 쓰기 쉬워요.' },
  { emoji: '🌍', question: '분리수거는 필요 없다.', answer: false, reason: '환경을 지키기 위해 필요해요.' },
  { emoji: '♻️', question: '재활용은 자원을 아낀다.', answer: true, reason: '새 물건을 덜 만들어요.' },
  { emoji: '🌱', question: '쓰레기를 줄이면 좋다.', answer: true, reason: '지구가 덜 아파요.' },
  { emoji: '👨‍👩‍👧‍👦', question: '분리수거는 어른만 한다.', answer: false, reason: '어린이도 할 수 있어요.' },
  { emoji: '👦', question: '나도 분리수거를 할 수 있다.', answer: true, reason: '누구나 할 수 있어요.' },
  { emoji: '🌳', question: '재활용은 환경을 지킨다.', answer: true, reason: '자연을 보호해요.' },
  { emoji: '🏫', question: '분리수거는 학교에서도 한다.', answer: true, reason: '학교에서도 환경을 지켜요.' },
  { emoji: '🚫', question: '쓰레기를 아무 데나 버려도 된다.', answer: false, reason: '주변이 더러워져요.' },
  { emoji: '😊', question: '분리수거를 잘하면 지구가 웃는다.', answer: true, reason: '지구가 건강해져요.' },
];

// 저학년(1~3학년) 카드 매칭 게임 (A/B 선택)
const CARD_ITEMS = [
  // 플라스틱 (1~15)
  { emoji: '🧃', question: '빈 페트병은 어디에 버릴까요?', optionA: '플라스틱 통', optionB: '일반쓰레기 통', answer: 'A' },
  { emoji: '🧃', question: '물이 남은 페트병, 어느 쪽이 맞을까요?', optionA: '물 그대로', optionB: '물 버리고 씻음', answer: 'B' },
  { emoji: '🧃', question: '페트병 뚜껑은?', optionA: '병에 붙임', optionB: '따로 분리', answer: 'B' },
  { emoji: '🥤', question: '플라스틱 컵은?', optionA: '씻어서 버림', optionB: '더러운 채 버림', answer: 'A' },
  { emoji: '🥤', question: '음식 묻은 플라스틱은?', optionA: '그냥 버림', optionB: '씻어서 버림', answer: 'B' },
  { emoji: '🥤', question: '빨대는 어디로 갈까요?', optionA: '플라스틱', optionB: '종이', answer: 'A' },
  { emoji: '🥤', question: '더러운 플라스틱은?', optionA: '재활용', optionB: '일반쓰레기', answer: 'B' },
  { emoji: '🧴', question: '플라스틱 통은?', optionA: '재활용 상자', optionB: '음식물 통', answer: 'A' },
  { emoji: '🧃', question: '플라스틱 병 안에는?', optionA: '쓰레기 넣기', optionB: '비워서 버리기', answer: 'B' },
  { emoji: '✨', question: '플라스틱을 버릴 때 좋은 모습은?', optionA: '깨끗함', optionB: '더러움', answer: 'A' },
  { emoji: '🥛', question: '요구르트 병은?', optionA: '씻어서 버림', optionB: '안 씻고 버림', answer: 'A' },
  { emoji: '🎮', question: '플라스틱 장난감은?', optionA: '플라스틱 통', optionB: '일반쓰레기', answer: 'B' },
  { emoji: '🥤', question: '플라스틱 컵에 물이 남아 있으면?', optionA: '그냥 버림', optionB: '물 버림', answer: 'B' },
  { emoji: '♻️', question: '플라스틱은 어디에?', optionA: '재활용함', optionB: '길바닥', answer: 'A' },
  { emoji: '🌍', question: '플라스틱을 잘 버리면?', optionA: '지구가 좋아함', optionB: '지구가 아픔', answer: 'A' },
  
  // 종이 (16~30)
  { emoji: '📰', question: '신문지는 어디로?', optionA: '종이 상자', optionB: '플라스틱 통', answer: 'A' },
  { emoji: '🧻', question: '사용한 휴지는?', optionA: '종이', optionB: '일반쓰레기', answer: 'B' },
  { emoji: '📄', question: '깨끗한 종이는?', optionA: '재활용', optionB: '버림', answer: 'A' },
  { emoji: '📄', question: '젖은 종이는?', optionA: '재활용', optionB: '일반쓰레기', answer: 'B' },
  { emoji: '📦', question: '종이 상자는?', optionA: '접어서 버림', optionB: '그대로 던짐', answer: 'A' },
  { emoji: '📦', question: '음식 묻은 종이는?', optionA: '재활용', optionB: '일반쓰레기', answer: 'B' },
  { emoji: '🎨', question: '색종이는?', optionA: '종이', optionB: '플라스틱', answer: 'A' },
  { emoji: '🥤', question: '종이컵은?', optionA: '종이', optionB: '일반쓰레기', answer: 'B' },
  { emoji: '📚', question: '책을 버릴 때는?', optionA: '그대로', optionB: '표지 떼기', answer: 'B' },
  { emoji: '📄', question: '종이는 어떻게 버릴까요?', optionA: '종이끼리', optionB: '다 섞어서', answer: 'A' },
  { emoji: '♻️', question: '종이를 깨끗이 버리면?', optionA: '다시 쓸 수 있음', optionB: '못 씀', answer: 'A' },
  { emoji: '💧', question: '종이를 물에 넣으면?', optionA: '괜찮다', optionB: '안 된다', answer: 'B' },
  { emoji: '📄', question: '종이는 어디에?', optionA: '종이 상자', optionB: '유리 통', answer: 'A' },
  { emoji: '🗑️', question: '더러운 종이는?', optionA: '재활용', optionB: '일반쓰레기', answer: 'B' },
  { emoji: '🌳', question: '종이를 아껴 쓰면?', optionA: '좋다', optionB: '나쁘다', answer: 'A' },
  
  // 유리·캔 (31~45)
  { emoji: '🍾', question: '유리병은 어디로?', optionA: '유리 상자', optionB: '종이 상자', answer: 'A' },
  { emoji: '🍾', question: '유리병 버리기 전은?', optionA: '씻음', optionB: '안 씻음', answer: 'A' },
  { emoji: '🔨', question: '깨진 유리는?', optionA: '그냥 버림', optionB: '신문지에 싸서', answer: 'B' },
  { emoji: '🍾', question: '유리병 뚜껑은?', optionA: '붙여서', optionB: '떼어서', answer: 'B' },
  { emoji: '🏺', question: '도자기 그릇은?', optionA: '유리', optionB: '일반쓰레기', answer: 'B' },
  { emoji: '🥫', question: '음료 캔은?', optionA: '금속', optionB: '종이', answer: 'A' },
  { emoji: '🥫', question: '캔을 버리기 전은?', optionA: '씻기', optionB: '그냥', answer: 'A' },
  { emoji: '🥫', question: '캔에 음료가 남아 있으면?', optionA: '괜찮다', optionB: '안 된다', answer: 'B' },
  { emoji: '🥫', question: '캔은 어떻게 버릴까요?', optionA: '찌그러뜨림', optionB: '그대로', answer: 'A' },
  { emoji: '🥫', question: '캔은 어디로?', optionA: '재활용함', optionB: '음식물 통', answer: 'A' },
  { emoji: '🔪', question: '유리는 왜 조심해야 할까요?', optionA: '손 다침', optionB: '냄새', answer: 'A' },
  { emoji: '🗑️', question: '유리병 안에 쓰레기는?', optionA: '넣기', optionB: '넣지 않기', answer: 'B' },
  { emoji: '🗑️', question: '캔 안에 쓰레기는?', optionA: '넣기', optionB: '넣지 않기', answer: 'B' },
  { emoji: '✨', question: '유리병은 깨끗해야?', optionA: '된다', optionB: '안 된다', answer: 'A' },
  { emoji: '♻️', question: '캔은 다시 쓸 수 있을까요?', optionA: '있다', optionB: '없다', answer: 'A' },
  
  // 환경 기본 (46~50)
  { emoji: '🗑️', question: '쓰레기는 어떻게 버릴까요?', optionA: '나누어서', optionB: '아무 데나', answer: 'A' },
  { emoji: '♻️', question: '분리수거는?', optionA: '필요하다', optionB: '필요 없다', answer: 'A' },
  { emoji: '👦', question: '분리수거는 누가 할 수 있을까요?', optionA: '어른만', optionB: '어린이도', answer: 'B' },
  { emoji: '🌍', question: '재활용을 하면?', optionA: '지구 보호', optionB: '지구 아픔', answer: 'A' },
  { emoji: '😊', question: '분리수거를 잘하면 지구는?', optionA: '웃는다', optionB: '운다', answer: 'A' },
];

// === 고학년(4~6학년) 난이도 데이터 ===

// 고학년(4~6학년) 분류 게임 문제 (헷갈리는 항목들)
const HARD_CLASSIFICATION_ITEMS = [
  { emoji: '🍜', name: '국물 밴 컵라면 용기', answer: '일반쓰레기' },
  { emoji: '🔦', name: '깨진 유리', answer: '일반쓰레기(신문지 포장)' },
  { emoji: '🧾', name: '영수증', answer: '일반쓰레기' },
  { emoji: '🍗', name: '치킨 뼈', answer: '일반쓰레기' },
  { emoji: '🔋', name: '다 쓴 건전지', answer: '전용수거함' },
  { emoji: '📱', name: '보조배터리', answer: '전용수거함' },
  { emoji: '🥔', name: '프링글스 통', answer: '본체:종이, 바닥:캔' },
  { emoji: '💊', name: '먹다 남은 약', answer: '약국/보건소' },
  { emoji: '🧼', name: '펌프형 용기 스프링', answer: '일반쓰레기' },
  { emoji: '🧊', name: '아이스팩(젤)', answer: '일반쓰레기(전용수거함)' },
];

// 고학년(4~6학년) 사지선다 퀴즈 (80문제)
const HARD_MULTIPLE_CHOICE_ITEMS = [
  // 플라스틱 - 페트병 & 재질 (1~25)
  { emoji: '🧃', question: '페트병 뚜껑을 분리하는 이유는?', options: ['색이 달라서', '크기가 작아서', '재질이 달라서', '무거워서'], answer: 2 },
  { emoji: '🧃', question: '재활용 가치가 가장 높은 페트병은?', options: ['유색', '라벨 부착', '기름 묻음', '투명·깨끗함'], answer: 3 },
  { emoji: '🧃', question: '페트병을 씻지 않으면 생기는 문제는?', options: ['색 변형', '재활용 비용 증가', '무게 감소', '냄새 제거'], answer: 1 },
  { emoji: '🧃', question: '페트병에 담배꽁초를 넣어 버리면 안 되는 이유는?', options: ['냄새', '미관', '재활용 공정 방해', '무게 증가'], answer: 2 },
  { emoji: '🧃', question: '페트병 몸통과 재질이 다른 것은?', options: ['생수병', '탄산병', '페트병 뚜껑', '음료병'], answer: 2 },
  { emoji: '🧃', question: '투명 페트병을 별도로 수거하는 이유는?', options: ['보기 좋아서', '분리 쉬움', '고품질 재활용', '냄새 없음'], answer: 2 },
  { emoji: '🧃', question: '페트병을 찌그러뜨리는 주된 목적은?', options: ['재활용 방해', '공간 절약', '색 제거', '무게 감소'], answer: 1 },
  { emoji: '🧃', question: '기름이 묻은 페트병은?', options: ['물로 헹구면 OK', '그대로 재활용', '재활용 매우 어려움', '색만 보면 됨'], answer: 2 },
  { emoji: '🧃', question: '페트병 분리 기준에서 가장 중요한 것은?', options: ['크기', '색', '오염 여부', '브랜드'], answer: 2 },
  { emoji: '🧃', question: '라벨을 떼지 않은 페트병은?', options: ['문제 없음', '가치 상승', '재활용 어려움', '더 가벼움'], answer: 2 },
  { emoji: '🧃', question: '페트병에 남은 물이 문제인 이유는?', options: ['무게', '냄새', '다른 재활용품 오염', '색 변화'], answer: 2 },
  { emoji: '🧃', question: '페트병은 왜 일반쓰레기가 아닌가?', options: ['가볍기 때문', '다시 자원이 되기 때문', '색이 예뻐서', '많이 쓰여서'], answer: 1 },
  { emoji: '🧃', question: '페트병을 전자레인지에 사용하면 안 되는 이유는?', options: ['냄새', '열에 약함', '색 변화', '무거움'], answer: 1 },
  { emoji: '🧃', question: '투명 페트병과 유색 페트병의 차이는?', options: ['크기', '가격', '재활용 난이도', '무게'], answer: 2 },
  { emoji: '🧃', question: '페트병 안에 이물질이 있으면?', options: ['상관없음', '재활용 어려움', '더 가치 있음', '색만 보면 됨'], answer: 1 },
  { emoji: '🧃', question: '찌그러진 페트병은?', options: ['재활용 불가', '재활용 가능', '위험', '일반쓰레기'], answer: 1 },
  { emoji: '🧃', question: '페트병을 말려서 버리는 이유는?', options: ['냄새 제거', '색 유지', '오염 방지', '무게 감소'], answer: 2 },
  { emoji: '🧃', question: '페트병에 붙은 비닐 라벨은 어디로?', options: ['종이', '플라스틱', '일반쓰레기', '유리'], answer: 1 },
  { emoji: '🧃', question: '페트병을 잘 분리하면 생기는 효과는?', options: ['처리 시간 증가', '재활용률 상승', '비용 증가', '냄새 증가'], answer: 1 },
  { emoji: '🧃', question: '다음 중 페트병이 아닌 것은?', options: ['생수병', '음료병', '샴푸통', '탄산병'], answer: 2 },
  { emoji: '🧃', question: '페트병을 한데 묶어 버리는 이유는?', options: ['보기 좋아서', '분실 방지', '운반 효율', '색 구분'], answer: 2 },
  { emoji: '🧃', question: '페트병에 붙은 스티커가 많으면?', options: ['상관없음', '재활용 어려움', '가치 상승', '무게 감소'], answer: 1 },
  { emoji: '🧃', question: '페트병 분리가 중요한 이유는?', options: ['법 때문에', '가장 많이 쓰이는 플라스틱이라서', '무겁기 때문', '색이 다양해서'], answer: 1 },
  { emoji: '🧃', question: '깨끗한 페트병의 장점은?', options: ['빨리 썩음', '재사용 쉬움', '냄새 큼', '색 변화'], answer: 1 },

  // 플라스틱 - 용기·혼합재질 (26~45)
  { emoji: '🥤', question: '검은색 플라스틱이 어려운 이유는?', options: ['무거움', '냄새', '기계 인식 문제', '크기'], answer: 2 },
  { emoji: '🍱', question: '플라스틱 도시락 용기가 문제되는 이유는?', options: ['모양', '기름 냄새', '색', '브랜드'], answer: 1 },
  { emoji: '🧴', question: '펌프형 용기를 분해해야 하는 이유는?', options: ['크기', '색', '금속 혼합', '냄새'], answer: 2 },
  { emoji: '🪥', question: '다음 중 혼합재질 제품은?', options: ['페트병', '요구르트병', '칫솔', '물병'], answer: 2 },
  { emoji: '🍱', question: '재질 표시가 있어도 재활용이 안 될 수 있는 경우는?', options: ['깨끗함', '투명함', '음식물 묻음', '큼'], answer: 2 },
  { emoji: '🥤', question: '플라스틱 빨대가 어려운 이유는?', options: ['무거움', '작아서 선별 어려움', '냄새', '색'], answer: 1 },
  { emoji: '🍱', question: '플라스틱 트레이가 모두 재활용되지 않는 이유는?', options: ['크기', '브랜드', '재질·오염 차이', '색'], answer: 2 },
  { emoji: '🧴', question: '플라스틱을 말려서 버리는 이유는?', options: ['보기 좋게', '냄새 제거', '오염 방지', '색 유지'], answer: 2 },
  { emoji: '🧴', question: '다음 중 재활용이 가장 어려운 것은?', options: ['깨끗한 컵', '요구르트병', '펌프용기', '투명통'], answer: 2 },
  { emoji: '🍱', question: '플라스틱 용기에 스티커가 많으면?', options: ['상관없음', '무게 감소', '재활용 어려움', '가치 상승'], answer: 2 },
  { emoji: '🎮', question: '플라스틱 장난감이 안 되는 이유는?', options: ['크기', '색', '재질 혼합', '냄새'], answer: 2 },
  { emoji: '♻️', question: '다음 중 플라스틱 분리 기준으로 틀린 것은?', options: ['재질', '오염', '사용 횟수', '색'], answer: 2 },
  { emoji: '🍱', question: '플라스틱에 음식 냄새가 남아 있으면?', options: ['괜찮음', '재활용 어려움', '가치 상승', '무게 감소'], answer: 1 },
  { emoji: '🧴', question: '플라스틱 용기를 씻는 목적은?', options: ['색 제거', '무게 감소', '오염 제거', '모양 유지'], answer: 2 },
  { emoji: '🥤', question: '여러 플라스틱이 섞이면?', options: ['쉬워짐', '비용 증가', '무게 감소', '가치 상승'], answer: 1 },
  { emoji: '🥛', question: '요구르트 용기는 어떻게 버리나요?', options: ['그냥', '헹궈서', '찢어서', '태워서'], answer: 1 },
  { emoji: '🍱', question: '일회용 용기에 기름이 묻으면?', options: ['재활용 가능', '씻어야 함', '일반쓰레기', '태워야 함'], answer: 1 },
  { emoji: '🧴', question: '플라스틱 재활용 표시 숫자의 의미는?', options: ['가격', '재질 종류', '크기', '무게'], answer: 1 },
  { emoji: '🥤', question: '일회용 컵 뚜껑은?', options: ['일반쓰레기', '플라스틱', '종이', '캔'], answer: 1 },
  { emoji: '🍱', question: '배달 음식 용기를 버리기 전에?', options: ['찢기', '씻기', '태우기', '묻기'], answer: 1 },

  // 유리 심화 (46~60)
  { emoji: '🔨', question: '깨진 유리를 수거함에 넣으면 안 되는 이유는?', options: ['냄새', '색', '안전사고', '무게'], answer: 2 },
  { emoji: '🔥', question: '내열유리가 문제되는 이유는?', options: ['색', '녹는점 차이', '냄새', '크기'], answer: 1 },
  { emoji: '💄', question: '유리병과 같은 방식으로 배출 가능한 것은?', options: ['거울', '전구', '향수병', '강화유리'], answer: 2 },
  { emoji: '🍾', question: '유리병에 액체가 남으면?', options: ['상관없음', '오염 발생', '가치 상승', '무게 감소'], answer: 1 },
  { emoji: '🍾', question: '유리병을 색상별로 나누는 이유는?', options: ['보기', '무게', '재활용 효율', '냄새'], answer: 2 },
  { emoji: '🏺', question: '도자기 그릇이 유리가 아닌 이유는?', options: ['무게', '성분 차이', '색', '크기'], answer: 1 },
  { emoji: '🍾', question: '유리병 뚜껑을 제거해야 하는 이유는?', options: ['무게', '색', '재질 다름', '냄새'], answer: 2 },
  { emoji: '♻️', question: '유리병은 왜 여러 번 재활용 가능한가?', options: ['가벼워서', '녹여도 성질 유지', '색이 예뻐서', '크기 때문'], answer: 1 },
  { emoji: '🪞', question: '거울이 재활용이 어려운 이유는?', options: ['무거움', '코팅 성분', '색', '크기'], answer: 1 },
  { emoji: '🍾', question: '유리 분리에서 가장 중요한 것은?', options: ['모양', '오염·안전', '브랜드', '가격'], answer: 1 },
  { emoji: '💡', question: '전구는 유리 수거함에?', options: ['넣는다', '넣지 않는다', '깨서 넣는다', '상관없다'], answer: 1 },
  { emoji: '🍾', question: '유리병 안을 씻는 이유는?', options: ['보기', '오염 방지', '무게', '색'], answer: 1 },
  { emoji: '🍾', question: '색 있는 유리병은?', options: ['재활용 안 됨', '재활용 가능', '깨야 함', '일반쓰레기'], answer: 1 },
  { emoji: '💄', question: '화장품 유리병은?', options: ['일반쓰레기', '재활용 가능', '위험물', '캔류'], answer: 1 },
  { emoji: '🍾', question: '유리병 재활용의 장점은?', options: ['1회용', '여러 번 재활용', '썩기 쉬움', '가벼움'], answer: 1 },

  // 캔·금속 심화 (61~80)
  { emoji: '🥫', question: '알루미늄 캔의 장점은?', options: ['색', '재활용 용이', '크기', '냄새'], answer: 1 },
  { emoji: '💨', question: '부탄가스 캔을 비워야 하는 이유는?', options: ['무게', '냄새', '폭발 위험', '색'], answer: 2 },
  { emoji: '🍴', question: '알루미늄 호일이 캔류가 아닌 이유는?', options: ['금속 아님', '너무 얇음', '색 없음', '무거움'], answer: 1 },
  { emoji: '🥫', question: '캔에 라벨을 제거하는 이유는?', options: ['보기', '무게', '재질 혼합 방지', '색'], answer: 2 },
  { emoji: '🍳', question: '프라이팬이 캔이 아닌 이유는?', options: ['금속 아님', '고철·대형폐기물', '색', '냄새'], answer: 1 },
  { emoji: '🥫', question: '캔 안에 쓰레기를 넣으면?', options: ['괜찮음', '재활용 중단', '가치 상승', '무게 감소'], answer: 1 },
  { emoji: '🥫', question: '캔을 씻는 이유는?', options: ['색 제거', '냄새 제거', '오염 방지', '무게 감소'], answer: 2 },
  { emoji: '🥫', question: '캔을 찌그러뜨리는 이유는?', options: ['보기', '공간 절약', '색', '냄새'], answer: 1 },
  { emoji: '🥫', question: '철캔과 알루미늄 캔은?', options: ['따로 버림', '같이 버림', '일반쓰레기', '유리'], answer: 1 },
  { emoji: '♻️', question: '고철은 왜 캔과 다르게 배출할까?', options: ['무거움', '수거 방식 다름', '색', '냄새'], answer: 1 },
  { emoji: '♻️', question: '재활용이 애매한 물건을 재활용으로 버리면?', options: ['도움', '오염', '비용 감소', '문제 없음'], answer: 1 },
  { emoji: '♻️', question: '분리수거의 핵심 기준은?', options: ['색·크기', '재질·오염', '가격·브랜드', '무게·모양'], answer: 1 },
  { emoji: '✨', question: '재활용품을 깨끗이 버리면?', options: ['비용 증가', '처리 쉬움', '문제 증가', '무게 증가'], answer: 1 },
  { emoji: '🔧', question: '혼합재질이 문제인 이유는?', options: ['보기', '분리 비용', '색', '냄새'], answer: 1 },
  { emoji: '🌍', question: '분리배출이 중요한 가장 큰 이유는?', options: ['법', '습관', '자원 절약', '통 부족'], answer: 2 },
  { emoji: '🗑️', question: '재활용률이 낮아지는 가장 큰 원인은?', options: ['통 부족', '오염', '색', '크기'], answer: 1 },
  { emoji: '✅', question: '정확한 분리가 필요한 이유는?', options: ['빠르게', '싸게', '제대로 재활용', '보기'], answer: 2 },
  { emoji: '🌱', question: '재활용이 잘되면 생기는 효과는?', options: ['쓰레기 증가', '자원 낭비', '환경 보호', '비용 증가'], answer: 2 },
  { emoji: '♻️', question: '재활용품이 오염되면?', options: ['상관없음', '가치 증가', '처리 불가', '색 변화'], answer: 2 },
  { emoji: '🌍', question: '정확한 분리수거가 가장 크게 돕는 것은?', options: ['학교', '집', '지구', '통'], answer: 2 },
];

// 고학년(4~6학년) OX 퀴즈 문제
const HARD_OX_QUIZ_ITEMS = [
  // 플라스틱 ① 페트병 (1~20)
  { emoji: '🧃', question: '페트병은 내용물을 비우고 헹군 뒤 배출한다.', answer: true, reason: '내용물이 남아 있으면 다른 재활용품이 오염된다.' },
  { emoji: '🧃', question: '페트병 라벨은 떼지 않아도 된다.', answer: false, reason: '라벨은 다른 재질이라 분리해야 한다.' },
  { emoji: '🧃', question: '페트병 뚜껑은 병과 함께 버린다.', answer: false, reason: '뚜껑은 병과 재질이 다르다.' },
  { emoji: '🧃', question: '페트병 뚜껑은 플라스틱류로 따로 버린다.', answer: true, reason: '같은 재질끼리 모아야 재활용이 쉽다.' },
  { emoji: '🧃', question: '투명 페트병은 재활용 가치가 높다.', answer: true, reason: '색이 없어서 다시 만들기 쉽다.' },
  { emoji: '🧃', question: '색이 있는 페트병은 재활용이 더 어렵다.', answer: true, reason: '색을 제거하는 과정이 필요하다.' },
  { emoji: '🧃', question: '페트병 안에 음식물이 있으면 재활용이 어렵다.', answer: true, reason: '음식물이 기계를 오염시킨다.' },
  { emoji: '🧃', question: '페트병은 찌그러뜨려서 버리면 좋다.', answer: true, reason: '부피가 줄어 운반이 쉽다.' },
  { emoji: '🧃', question: '기름이 묻은 페트병도 재활용된다.', answer: false, reason: '기름은 세척이 어려워 재활용이 힘들다.' },
  { emoji: '🧃', question: '페트병은 플라스틱 중에서도 따로 분리한다.', answer: true, reason: '재질이 일정해 따로 모아 재활용한다.' },
  { emoji: '🧃', question: '페트병에 담배꽁초를 넣어 버려도 된다.', answer: false, reason: '이물질이 들어가면 재활용이 불가능해진다.' },
  { emoji: '🧃', question: '페트병은 재활용 표시가 있다.', answer: true, reason: '재질을 알 수 있게 표시되어 있다.' },
  { emoji: '🧃', question: '페트��은 전자레인지에 사용해도 된다.', answer: false, reason: '열에 약해 변형될 수 있다.' },
  { emoji: '🧃', question: '생수병은 대부분 페트병이다.', answer: true, reason: '가볍고 투명해서 생수병으로 많이 쓰인다.' },
  { emoji: '🧃', question: '페트병은 일반쓰레기로 버린다.', answer: false, reason: '재활용 가능한 자원이다.' },
  { emoji: '🧃', question: '페트병은 깨끗할수록 재활용이 잘 된다.', answer: true, reason: '세척 비용과 시간이 줄어든다.' },
  { emoji: '🧃', question: '찌그러진 페트병은 재활용이 안 된다.', answer: false, reason: '모양이 변해도 재활용은 가능하다.' },
  { emoji: '🧃', question: '투명 페트병은 별도 수거함이 있는 지역도 있다.', answer: true, reason: '재활용 효율을 높이기 위해서다.' },
  { emoji: '🧃', question: '페트병은 씻지 않아도 된다.', answer: false, reason: '오염되면 재활용이 어렵다.' },
  { emoji: '🧃', question: '페트병 분리는 재활용에서 매우 중요하다.', answer: true, reason: '재활용률을 크게 높일 수 있다.' },
  
  // 플라스틱 ② 용기·혼합 플라스틱 (21~40)
  { emoji: '🍱', question: '플라스틱 용기는 음식물을 제거해야 한다.', answer: true, reason: '음식물이 남아 있으면 재활용이 안 된다.' },
  { emoji: '🍜', question: '컵라면 용기는 플라스틱으로 재활용한다.', answer: false, reason: '종이와 플라스틱이 섞여 있다.' },
  { emoji: '🥤', question: '검은색 플라스틱 용기는 재활용이 어렵다.', answer: true, reason: '선별 기계가 색을 인식하기 어렵다.' },
  { emoji: '🥤', question: '플라스틱 빨대는 대부분 재활용이 어렵다.', answer: true, reason: '크기가 작아 분리하기 힘들다.' },
  { emoji: '🥤', question: '플라스틱 용기에 스티커가 많으면 재활용이 어렵다.', answer: true, reason: '다른 재질이 섞이기 때문이다.' },
  { emoji: '🎮', question: '장난감은 플라스틱이므로 플라스틱류다.', answer: false, reason: '여러 재질이 섞인 경우가 많다.' },
  { emoji: '🧴', question: '플라스틱 용기는 깨끗이 씻어야 한다.', answer: true, reason: '오염을 제거해야 재활용 가능하다.' },
  { emoji: '🔧', question: '여러 재질이 섞인 플라스틱은 재활용이 어렵다.', answer: true, reason: '분리하는 데 비용이 많이 든다.' },
  { emoji: '🧴', question: '플라스틱 펌프 용기는 분해해서 버린다.', answer: true, reason: '금속과 플라스틱이 함께 들어 있다.' },
  { emoji: '🥤', question: '플라스틱 용기는 모두 같은 재질이다.', answer: false, reason: '플라스틱도 종류가 다양하다.' },
  { emoji: '🥛', question: '요구르트 병은 헹군 후 배출한다.', answer: true, reason: '내용물을 제거해야 한다.' },
  { emoji: '🍱', question: '플라스틱 도시락 용기는 재활용 가능하다.', answer: true, reason: '깨끗이 씻으면 재활용된다.' },
  { emoji: '🍱', question: '음식물이 묻은 플라스틱은 일반쓰레기다.', answer: true, reason: '재활용 공정을 방해한다.' },
  { emoji: '🧴', question: '플라스틱 용기는 물에 헹구기만 해도 충분하다.', answer: true, reason: '큰 오염만 제거하면 된다.' },
  { emoji: '🪥', question: '플라스틱 칫솔은 재활용이 가능하다.', answer: false, reason: '여러 재질이 섞여 있다.' },
  { emoji: '🍱', question: '플라스틱 트레이는 모두 재활용된다.', answer: false, reason: '재질과 오염 상태에 따라 다르다.' },
  { emoji: '♻️', question: '재질 표시가 없는 플라스틱은 재활용이 어렵다.', answer: true, reason: '선별하기 힘들다.' },
  { emoji: '🧴', question: '플라스틱은 재활용 전에 말려서 버리는 것이 좋다.', answer: true, reason: '물기가 있으면 다른 재활용품이 젖는다.' },
  { emoji: '🍱', question: '플라스틱에 음식물 냄새가 나면 재활용이 어렵다.', answer: true, reason: '세척이 제대로 되지 않았다는 뜻이다.' },
  { emoji: '🌍', question: '플라스틱 분리는 환경 보호에 중요하다.', answer: true, reason: '자원 낭비를 줄일 수 있다.' },
  
  // 유리류 (41~60)
  { emoji: '🍾', question: '유리병은 내용물을 비우고 헹군 후 배출한다.', answer: true, reason: '오염을 줄이기 위해서다.' },
  { emoji: '🔨', question: '깨진 유리는 유리병 수거함에 넣는다.', answer: false, reason: '수거하는 사람이 다칠 수 있다.' },
  { emoji: '📰', question: '깨진 유리는 신문지에 싸서 일반쓰레기로 버린다.', answer: true, reason: '안전사고를 막기 위해서다.' },
  { emoji: '🍾', question: '유리병의 금속 뚜껑은 분리해야 한다.', answer: true, reason: '유리와 금속은 재질이 다르다.' },
  { emoji: '🏺', question: '도자기 그릇은 유리류다.', answer: false, reason: '유리병과 성분이 다르다.' },
  { emoji: '🪞', question: '거울은 유리병과 같은 방식으로 버린다.', answer: false, reason: '특수 코팅이 되어 있다.' },
  { emoji: '💄', question: '향수병은 유리류로 배출할 수 있다.', answer: true, reason: '일반 유리병과 재질이 같다.' },
  { emoji: '💡', question: '전구는 유리병 수거함에 넣는다.', answer: false, reason: '특수 유리로 재활용이 어렵다.' },
  { emoji: '🔥', question: '내열유리는 일반 유리병과 다르다.', answer: true, reason: '녹는 온도가 다르다.' },
  { emoji: '🍾', question: '유리병에 남은 액체는 비우고 버린다.', answer: true, reason: '오염을 막기 위해서다.' },
  { emoji: '♻️', question: '유리병은 재활용을 여러 번 할 수 있다.', answer: true, reason: '녹여도 품질이 거의 떨어지지 않는다.' },
  { emoji: '🏷️', question: '유리병에 붙은 스티커는 제거하면 좋다.', answer: true, reason: '이물질을 줄일 수 있다.' },
  { emoji: '🍾', question: '색이 있는 유리병은 재활용이 안 된다.', answer: false, reason: '색이 있어도 재활용 가능하다.' },
  { emoji: '🍾', question: '유리병은 색상별로 분리하면 더 좋다.', answer: true, reason: '재활용 효율이 높아진다.' },
  { emoji: '🍾', question: '유리병은 뚜껑을 닫아서 배출한다.', answer: false, reason: '뚜껑을 분리해야 한다.' },
  { emoji: '♻️', question: '유리는 재활용해도 품질이 크게 떨어지지 않는다.', answer: true, reason: '반복 재활용이 가능하다.' },
  { emoji: '💄', question: '화장품 유리 공병은 세척 후 재활용 가능하다.', answer: true, reason: '일반 유리병과 같다.' },
  { emoji: '🪑', question: '유리 식탁 상판은 유리류다.', answer: false, reason: '대형 폐기물로 처리한다.' },
  { emoji: '🗑️', question: '유리병 안에 쓰레기를 넣어 버리면 안 된다.', answer: true, reason: '재활용이 불가능해진다.' },
  { emoji: '⚠️', question: '유리류는 안전에 주의해 배출해야 한다.', answer: true, reason: '깨지면 위험하기 때문이다.' },
  
  // 캔·금속류 (61~80)
  { emoji: '🥫', question: '음료 캔은 내용물을 비우고 헹군다.', answer: true, reason: '오염을 막기 위해서다.' },
  { emoji: '🥫', question: '캔에 붙은 플라스틱은 제거해야 한다.', answer: true, reason: '금속만 있어야 재활용이 쉽다.' },
  { emoji: '🥫', question: '통조림 캔은 음식물을 제거하면 재활용 가능하다.', answer: true, reason: '캔 자체는 금속이다.' },
  { emoji: '💨', question: '부탄가스 캔은 내용물을 완전히 비운다.', answer: true, reason: '폭발 위험이 있다.' },
  { emoji: '💨', question: '스프레이 캔은 구멍을 뚫어 배출한다.', answer: true, reason: '남은 가스를 빼기 위해서다.' },
  { emoji: '🍳', question: '프라이팬은 캔류로 분리수거한다.', answer: false, reason: '고철이나 대형 폐기물이다.' },
  { emoji: '🥫', question: '알루미늄 캔은 재활용 가치가 높다.', answer: true, reason: '다시 쓰기 쉽다.' },
  { emoji: '🍴', question: '알루미늄 호일은 캔류다.', answer: false, reason: '너무 얇고 오염되기 쉽다.' },
  { emoji: '🥫', question: '캔은 찌그러뜨려 배출하면 좋다.', answer: true, reason: '부피를 줄일 수 있다.' },
  { emoji: '🥫', question: '캔에 음식물이 남아 있으면 재활용이 어렵다.', answer: true, reason: '다른 캔까지 오염시킨다.' },
  { emoji: '🥫', question: '철캔과 알루미늄 캔은 같은 곳에 버린다.', answer: true, reason: '같은 캔류로 분리된다.' },
  { emoji: '🏷️', question: '캔에 붙은 종이 라벨은 제거한다.', answer: true, reason: '다른 재질이기 때문이다.' },
  { emoji: '🎨', question: '페인트 통은 캔류다.', answer: false, reason: '유해 물질이 남아 있을 수 있다.' },
  { emoji: '👔', question: '금속 옷걸이는 캔류로 버린다.', answer: false, reason: '고철로 따로 배출한다.' },
  { emoji: '🔩', question: '고철은 캔류와 다르게 배출한다.', answer: true, reason: '수거 방식이 다르다.' },
  { emoji: '🗑️', question: '캔 안에 쓰레기를 넣어 버리면 안 된다.', answer: true, reason: '재활용이 불가능해진다.' },
  { emoji: '✨', question: '캔도 깨끗할수록 재활용이 잘 된다.', answer: true, reason: '세척 과정이 쉬워진다.' },
  { emoji: '♻️', question: '캔은 재활용 후 다시 제품이 될 수 있다.', answer: true, reason: '녹여서 새 금속을 만든다.' },
  { emoji: '🥫', question: '캔은 일반쓰레기로 버린다.', answer: false, reason: '재활용 가능한 자원이다.' },
  { emoji: '🌍', question: '캔 분리는 자원 절약에 도움이 된다.', answer: true, reason: '새 금속을 덜 만들어도 된다.' },
];

// 고학년(4~6학년) 카드 매칭 게임
const HARD_CARD_ITEMS = [
  { emoji: '🔋', name: '폐건전지' },
  { emoji: '💊', name: '폐의약품' },
  { emoji: '🔦', name: '불연성 쓰레기' },
  { emoji: '📱', name: '전자제품' },
  { emoji: '♻️', name: '분리배출 마크' },
  { emoji: '🌏', name: '탄소 중립' },
  { emoji: '🧾', name: '일반 쓰레기' },
  { emoji: '🥤', name: '투명 페트병' },
];

export function GameScreen({ institutionId, institutionName, projectId, publicAnonKey }: GameScreenProps) {
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy'); // 난이도 상태 추가
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenLoadError, setChildrenLoadError] = useState<boolean>(false); // 서버 연결 실패 시 true
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]); // 복수 선택 지원
  const [points, setPoints] = useState(10);
  const [isGameFinished, setIsGameFinished] = useState(false); // 게임 완료 상태 추가
  const [isPanelOpen, setIsPanelOpen] = useState(false); // 포인트 패널 열림 상태

  // === 새로운 게임 로직 상태 ===
  const [selectedOption, setSelectedOption] = useState<number | boolean | string | null>(null); // 사용자가 선택한 옵션
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null); // 정답 여부
  const [gameMode, setGameMode] = useState<'class' | 'team'>('class'); // 게임 모드: 반 전체 or 팀
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]); // 참여할 팀 목록
  const [classScore, setClassScore] = useState(0); // 반 전체 점수
  const [teamScores, setTeamScores] = useState<Record<string, number>>({}); // 팀별 점수
  const [correctCount, setCorrectCount] = useState(0); // 맞춘 문제 수
  const [wrongCount, setWrongCount] = useState(0); // 틀린 문제 수

  // 기관의 게임 팀 목록 추출 (className 필드 사용)
  // team = 반 이름 (돌고래반), className = 게임 팀 (1팀)
  const teams = Array.from(new Set(children.filter(c => c.className).map(c => c.className!)));

  // Load children when institution changes
  useEffect(() => {
    if (institutionId) {
      loadChildren(institutionId);
    }
  }, [institutionId]);

  // 정답 표시 후 자동으로 다음 문제로 넘어가기
  useEffect(() => {
    if (showAnswer) {
      const timer = setTimeout(() => {
        setShowAnswer(false);
        setSelectedOption(null);
        setIsCorrect(null);
        if (currentIndex < items.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setIsGameFinished(true);
        }
      }, 2500); // 2.5초 후 자동으로 다음 문제로 (피드백 확인 시간 추가)

      return () => clearTimeout(timer);
    }
  }, [showAnswer, currentIndex, items.length]);

  // Load items when game changes
  useEffect(() => {
    // 고학년 카드매칭은 업데이트 예정이므로 데이터 로드하지 않음
    if (selectedGame === '어려움-카드매칭') {
      return;
    }

    let allItems: any[] = [];
    let questionCount = 0;
    
    if (selectedGame === '쉬움-분류게임') {
      allItems = CLASSIFICATION_ITEMS;
      questionCount = 10;
    } else if (selectedGame === '쉬움-OX퀴즈') {
      allItems = OX_QUIZ_ITEMS;
      questionCount = 10;
    } else if (selectedGame === '쉬움-카드매칭') {
      allItems = CARD_ITEMS;
      questionCount = 10;
    } else if (selectedGame === '어려움-분류게임') {
      allItems = HARD_CLASSIFICATION_ITEMS;
      questionCount = 10;
    } else if (selectedGame === '어려움-사지선다') {
      allItems = HARD_MULTIPLE_CHOICE_ITEMS;
      questionCount = 20;
    } else if (selectedGame === '어려움-OX퀴즈') {
      allItems = HARD_OX_QUIZ_ITEMS;
      questionCount = 20;
    }
    
    // 랜덤으로 문제 선택
    const shuffled = [...allItems].sort(() => Math.random() - 0.5);
    const selectedItems = shuffled.slice(0, Math.min(questionCount, allItems.length));
    
    setItems(selectedItems);
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsGameFinished(false);
  }, [selectedGame]);

  const loadChildren = async (institutionId: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_BASE_URL}/child/list/${institutionId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        const uniqueChildren = Array.from(
          new Map(data.children.map((child: Child) => [child.qrId, child])).values()
        );
        setChildren(uniqueChildren as Child[]);
        setChildrenLoadError(false);
      }
    } catch (error) {
      console.error('Failed to load children:', error);
      setChildrenLoadError(true);
      setChildren([]); // 에러 시 빈 배열로 초기화
    }
  };

  const addPoints = async () => {
    if (selectedChildIds.length === 0 || !institutionId) return;

    try {
      // 선택된 모든 아이에게 포인트 지급
      const promises = selectedChildIds.map(qrId =>
        fetch(
          `${SUPABASE_FUNCTIONS_BASE_URL}/points/update`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              qrId: qrId,
              institutionId: institutionId,
              points: points,
            }),
          }
        )
      );

      await Promise.all(promises);
      // Reload children to get updated points
      await loadChildren(institutionId);
    } catch (error) {
      console.error('Failed to add points:', error);
      alert('포인트 추가 중 오류가 발생했습니다.');
    }
  };

  // === 활동 로그 저장 및 포인트 업데이트 (기타 게임용) ===
  const saveGameActivityLog = async (params: {
    gameType: 'ox' | 'quiz' | 'card';
    question: string;
    isCorrect: boolean;
    pointsDelta: number;
  }) => {
    const sessionId = `game_${Date.now()}`;

    // 팀 모드일 때 - 팀에 속한 아이들에게 포인트 지급 + 로그 저장
    if (gameMode === 'team' && selectedTeams.length > 0) {
      // 선택된 팀에 속한 아이들 찾기 (className = 게임 팀)
      const teamChildren = children.filter(c => c.className && selectedTeams.includes(c.className));

      for (const child of teamChildren) {
        try {
          // 1. 활동 로그 저장
          await fetch(
            `${SUPABASE_FUNCTIONS_BASE_URL}/activity-log/save`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({
                childQrId: child.qrId,
                institutionId,
                sessionId,
                roundId: `round_${currentIndex}`,
                logType: `${params.gameType}_${params.isCorrect ? 'correct' : 'wrong'}`,
                materialLabel: params.question.substring(0, 50), // 문제 일부 저장
                pointsDelta: params.pointsDelta,
                isCorrect: params.isCorrect,
                gameMode: 'team',
                participatingTeams: selectedTeams.join(','),
              }),
            }
          );

          // 2. 정답인 경우에만 실제 포인트 업데이트
          if (params.isCorrect && params.pointsDelta > 0) {
            await fetch(
              `${SUPABASE_FUNCTIONS_BASE_URL}/points/update`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify({
                  qrId: child.qrId,
                  institutionId: institutionId,
                  points: params.pointsDelta,
                }),
              }
            );
          }
        } catch (error) {
          console.error('Failed to save activity log or update points:', error);
        }
      }

      // 포인트 업데이트 후 children 목록 새로고침
      if (params.isCorrect && params.pointsDelta > 0) {
        await loadChildren(institutionId);
      }
    }
    // 반 모드에서는 모든 아이들에게 포인트 지급
    else if (gameMode === 'class') {
      // 모든 아이에게 포인트 지급
      for (const child of children) {
        try {
          // 1. 활동 로그 저장
          await fetch(
            `${SUPABASE_FUNCTIONS_BASE_URL}/activity-log/save`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({
                childQrId: child.qrId,
                institutionId,
                sessionId,
                roundId: `round_${currentIndex}`,
                logType: `${params.gameType}_${params.isCorrect ? 'correct' : 'wrong'}`,
                materialLabel: params.question.substring(0, 50),
                pointsDelta: params.pointsDelta,
                isCorrect: params.isCorrect,
                gameMode: 'class',
              }),
            }
          );

          // 2. 정답인 경우에만 실제 포인트 업데이트
          if (params.isCorrect && params.pointsDelta > 0) {
            await fetch(
              `${SUPABASE_FUNCTIONS_BASE_URL}/points/update`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify({
                  qrId: child.qrId,
                  institutionId: institutionId,
                  points: params.pointsDelta,
                }),
              }
            );
          }
        } catch (error) {
          console.error('Failed to save class activity log or update points:', error);
        }
      }

      // 포인트 업데이트 후 children 목록 새로고침
      if (params.isCorrect && params.pointsDelta > 0) {
        await loadChildren(institutionId);
      }
    }
  };

  const handleNext = () => {
    setShowAnswer(false); 
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsGameFinished(true);
    }
  };
  
  const resetGame = () => {
    setIsGameFinished(false);
    setCurrentIndex(0);
    setShowAnswer(false);
    setSelectedOption(null);
    setIsCorrect(null);
    setClassScore(0);
    setTeamScores({});
    setCorrectCount(0);
    setWrongCount(0);
  };

  const handlePrevious = () => {
    setShowAnswer(false);
    setSelectedOption(null);
    setIsCorrect(null);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(items.length - 1);
    }
  };

  // === 정답/오답 판별 핸들러 ===
  // 사지선다형: selectedIndex는 0~3
  const handleClassificationAnswer = (selectedIndex: number) => {
    if (showAnswer) return; // 이미 정답이 표시된 상태면 무시

    setSelectedOption(selectedIndex);
    const correct = selectedIndex === currentItem?.answer;
    setIsCorrect(correct);

    const pointsDelta = correct ? 5 : 0;

    if (correct) {
      setCorrectCount(prev => prev + 1);
      // 정답 시 5점 추가
      if (gameMode === 'class') {
        setClassScore(prev => prev + 5);
      } else {
        // 팀 모드: 모든 참여 팀에 5점씩
        setTeamScores(prev => {
          const newScores = { ...prev };
          selectedTeams.forEach(team => {
            newScores[team] = (newScores[team] || 0) + 5;
          });
          return newScores;
        });
      }
    } else {
      setWrongCount(prev => prev + 1);
      // 오답 시 감점 없음
    }

    // 활동 로그 저장
    saveGameActivityLog({
      gameType: 'quiz',
      question: currentItem?.question || '',
      isCorrect: correct,
      pointsDelta,
    });

    setShowAnswer(true);
  };

  // OX 퀴즈형: selectedAnswer는 true(O) 또는 false(X)
  const handleOXAnswer = (selectedAnswer: boolean) => {
    if (showAnswer) return;

    setSelectedOption(selectedAnswer);
    const correct = selectedAnswer === currentItem?.answer;
    setIsCorrect(correct);

    const pointsDelta = correct ? 5 : 0;

    if (correct) {
      setCorrectCount(prev => prev + 1);
      if (gameMode === 'class') {
        setClassScore(prev => prev + 5);
      } else {
        setTeamScores(prev => {
          const newScores = { ...prev };
          selectedTeams.forEach(team => {
            newScores[team] = (newScores[team] || 0) + 5;
          });
          return newScores;
        });
      }
    } else {
      setWrongCount(prev => prev + 1);
    }

    // 활동 로그 저장
    saveGameActivityLog({
      gameType: 'ox',
      question: currentItem?.question || '',
      isCorrect: correct,
      pointsDelta,
    });

    setShowAnswer(true);
  };

  // 카드 매칭형: selectedAnswer는 'A' 또는 'B'
  const handleCardAnswer = (selectedAnswer: 'A' | 'B') => {
    if (showAnswer) return;

    setSelectedOption(selectedAnswer);
    const correct = selectedAnswer === currentItem?.answer;
    setIsCorrect(correct);

    const pointsDelta = correct ? 5 : 0;

    if (correct) {
      setCorrectCount(prev => prev + 1);
      if (gameMode === 'class') {
        setClassScore(prev => prev + 5);
      } else {
        setTeamScores(prev => {
          const newScores = { ...prev };
          selectedTeams.forEach(team => {
            newScores[team] = (newScores[team] || 0) + 5;
          });
          return newScores;
        });
      }
    } else {
      setWrongCount(prev => prev + 1);
    }

    // 활동 로그 저장
    saveGameActivityLog({
      gameType: 'card',
      question: currentItem?.question || '',
      isCorrect: correct,
      pointsDelta,
    });

    setShowAnswer(true);
  };

  // 팀 선택 토글
  const toggleTeam = (team: string) => {
    setSelectedTeams(prev =>
      prev.includes(team)
        ? prev.filter(t => t !== team)
        : [...prev, team]
    );
  };

  // 1. Game Menu Screen
  if (!selectedGame) {
    return (
      <div className="size-full bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8 overflow-auto flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-4">
            환경 교육 게임
          </h2>
          <p className="text-gray-600 text-lg mb-6">
            아이들과 함께 재미있는 분리수거 게임을 즐겨보세요!
          </p>

          {/* 난이도 선택 탭 */}
          <div className="inline-flex bg-white p-1 rounded-xl shadow-md border border-gray-100 mb-4">
            <button
              onClick={() => setDifficulty('easy')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                difficulty === 'easy'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              🌱 저학년 (1~3학년)
            </button>
            <button
              onClick={() => setDifficulty('hard')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                difficulty === 'hard'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              🌳 고학년 (4~6학년)
            </button>
          </div>

          {/* 참여 모드 선택 */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">참여 모드</p>
            <div className="inline-flex bg-white p-1 rounded-xl shadow-md border border-gray-100">
              <button
                onClick={() => {
                  setGameMode('class');
                  setSelectedTeams([]);
                }}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                  gameMode === 'class'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                🏫 반 전체
              </button>
              <button
                onClick={() => setGameMode('team')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                  gameMode === 'team'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                👥 팀별
              </button>
            </div>
          </div>

          {/* 팀 선택 (팀 모드일 때만 표시) */}
          {gameMode === 'team' && teams.length > 0 && (
            <div className="mb-4 max-w-md mx-auto">
              <p className="text-sm text-gray-500 mb-2">참여할 팀 선택 (결석 시 제외 가능)</p>
              <div className="flex flex-wrap justify-center gap-2">
                {teams.map(team => (
                  <button
                    key={team}
                    onClick={() => toggleTeam(team)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedTeams.includes(team)
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {selectedTeams.includes(team) ? '✓ ' : ''}{team}
                  </button>
                ))}
              </div>
              {selectedTeams.length === 0 && (
                <p className="text-xs text-orange-500 mt-2">하나 이상의 팀을 선택해주세요</p>
              )}
            </div>
          )}
          {gameMode === 'team' && teams.length === 0 && (
            <p className="text-sm text-orange-500 mb-4">등록된 팀이 없습니다. 아동 관리에서 팀을 설정해주세요.</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full">
          {/* Game Card 1 */}
          <Card 
            className={`group cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 overflow-hidden relative ${
              difficulty === 'easy' ? 'hover:border-green-400' : 'hover:border-purple-400'
            }`}
            onClick={() => setSelectedGame(difficulty === 'easy' ? '쉬움-분류게임' : '어려움-사지선다')}
          >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
              difficulty === 'easy' 
                ? 'bg-gradient-to-br from-green-100/50 to-emerald-100/50' 
                : 'bg-gradient-to-br from-purple-100/50 to-pink-100/50'
            }`} />
            <div className="p-8 text-center relative z-10">
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">🗑️</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">사지선다 퀴즈</h3>
              <p className="text-gray-600">
                {difficulty === 'easy' 
                  ? '4개 중에서 정답을 골라보세요!'
                  : '헷갈리는 쓰레기들도 척척! 분리배출 박사가 되어보세요!'
                }
              </p>
            </div>
          </Card>

          {/* Game Card 2 */}
          <Card 
            className={`group cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 overflow-hidden relative ${
              difficulty === 'easy' ? 'hover:border-blue-400' : 'hover:border-indigo-400'
            }`}
            onClick={() => setSelectedGame(`${difficulty === 'easy' ? '쉬움' : '어려움'}-OX퀴즈`)}
          >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
              difficulty === 'easy'
                ? 'bg-gradient-to-br from-blue-100/50 to-indigo-100/50'
                : 'bg-gradient-to-br from-indigo-100/50 to-violet-100/50'
            }`} />
            <div className="p-8 text-center relative z-10">
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">⭕❌</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">OX 퀴즈</h3>
              <p className="text-gray-600">
                {difficulty === 'easy'
                  ? '맞으면 O, 틀리면 X를 들어주세요!'
                  : '정확한 환경 지식! OX 퀴즈로 확인해보세요.'
                }
              </p>
            </div>
          </Card>

          {/* Game Card 3 */}
          <Card 
            className={`group transition-all duration-300 border-2 overflow-hidden relative ${
              difficulty === 'easy' 
                ? 'cursor-pointer hover:shadow-2xl hover:border-yellow-400' 
                : 'cursor-not-allowed opacity-60'
            }`}
            onClick={() => {
              if (difficulty === 'easy') {
                setSelectedGame('쉬움-카드매칭');
              }
            }}
          >
             <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
              difficulty === 'easy'
                ? 'bg-gradient-to-br from-yellow-100/50 to-orange-100/50'
                : ''
            }`} />
            {difficulty === 'hard' && (
              <div className="absolute top-4 right-4 z-20 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                업데이트 예정
              </div>
            )}
            <div className="p-8 text-center relative z-10">
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">🃏</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">A/B 선택 게임</h3>
              <p className="text-gray-600">
                {difficulty === 'easy'
                  ? 'A와 B 중에서 정답을 골라보세요!'
                  : '곧 만나볼 수 있어요!'
                }
              </p>
            </div>
          </Card>

          {/* Game Card 4 - 분리배출 카메라 게임 */}
          <Card
            className="group cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 overflow-hidden relative hover:border-cyan-400"
            onClick={() => setSelectedGame('분리배출')}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-cyan-100/50 to-green-100/50" />
            <div className="p-8 text-center relative z-10">
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">📷</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">분리배출 카메라</h3>
              <p className="text-gray-600">
                카메라로 쓰레기를 인식하고 올바르게 분리해요!
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-sm text-cyan-600 font-medium">
                <span>🤖</span>
                <span>AI 분석</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // 1.5. 분리배출 카메라 게임 화면
  if (selectedGame === '분리배출') {
    // children 배열을 ChildProfile로 변환
    const childProfiles: ChildProfile[] = children.map((child) =>
      mapSupabaseChildToChildProfile({
        qrId: child.qrId,
        name: child.name,
        age: child.age,
        points: child.points,
        team: child.team,
        institutionName: institutionName,
      })
    );

    return (
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-teal-50 to-green-50 z-50 overflow-hidden">
        <RecycleCameraGame
          variant="embedded"
          initialQrEnabled={true}
          className={institutionName}
          onExit={() => setSelectedGame(null)}
          institutionId={institutionId}
          projectId={projectId}
          publicAnonKey={publicAnonKey}
          children={childProfiles}
          onChildrenRefresh={() => loadChildren(institutionId)}
        />
      </div>
    );
  }

  // 2. Game Finished Screen
  if (isGameFinished) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 z-50 flex items-center justify-center animate-in fade-in zoom-in duration-500 overflow-hidden">
        <div className="max-w-4xl w-full h-full flex items-center justify-center p-3 sm:p-4 md:p-8 overflow-y-auto">
          <Card className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-yellow-300 w-full my-auto max-h-full overflow-y-auto">
            <div className="p-4 sm:p-6 md:p-8 lg:p-10 text-center">
              {/* 축하 메시지 */}
              <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
                <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl animate-bounce">🎉</div>
                <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl animate-bounce" style={{ animationDelay: '0.1s' }}>⭐</div>
                <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎊</div>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2 sm:mb-3 md:mb-4 animate-pulse">
                참 잘했어요!
              </h2>
              <p className="text-xl sm:text-2xl md:text-3xl text-gray-700 mb-2 sm:mb-3 font-bold">
                모든 문제를 완료했습니다! 👏
              </p>
              {/* 게임 결과 요약 */}
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-4 rounded-xl border-2 border-yellow-300 mb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">✓ {correctCount}</p>
                    <p className="text-sm text-gray-600">정답</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-500">✗ {wrongCount}</p>
                    <p className="text-sm text-gray-600">오답</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-yellow-600">
                      {gameMode === 'class' ? classScore : Object.values(teamScores).reduce((a, b) => a + b, 0)}점
                    </p>
                    <p className="text-sm text-gray-600">{gameMode === 'class' ? '반 점수' : '팀 점수'}</p>
                  </div>
                </div>
                {gameMode === 'team' && selectedTeams.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-yellow-300">
                    <p className="text-sm text-gray-600 mb-1">참여 팀:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {selectedTeams.map(team => (
                        <span key={team} className="px-3 py-1 bg-orange-200 rounded-full text-sm font-medium">
                          {team}: {teamScores[team] || 0}점
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-base sm:text-lg md:text-xl text-gray-500 mb-4 sm:mb-6 md:mb-8">
                총 {items.length}개 문제 중 {correctCount}개를 맞췄어요!
              </p>

              {/* 점수 설정 섹션 */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl border-2 border-blue-200 mb-4 sm:mb-6 md:mb-8">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 md:mb-6">🏆 포인트를 받을 아이를 선택하세요</h3>

                {/* 전체 선택 / 선택 해제 버튼 */}
                {(() => {
                  // 팀 모드일 때는 해당 팀 아이들만, 반 모드일 때는 전체
                  const displayChildren = gameMode === 'team' && selectedTeams.length > 0
                    ? children.filter(c => c.className && selectedTeams.includes(c.className))
                    : children;
                  const allSelected = displayChildren.length > 0 && displayChildren.every(c => selectedChildIds.includes(c.qrId));

                  return (
                    <>
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => {
                            if (allSelected) {
                              setSelectedChildIds([]);
                            } else {
                              setSelectedChildIds(displayChildren.map(c => c.qrId));
                            }
                          }}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            allSelected
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {allSelected ? '✓ 전체 해제' : '☑️ 전체 선택'}
                        </button>
                        {selectedChildIds.length > 0 && (
                          <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                            {selectedChildIds.length}명 선택됨
                          </span>
                        )}
                      </div>

                      {/* 아이 선택 그리드 */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 max-h-48 sm:max-h-56 md:max-h-64 overflow-y-auto">
                        {displayChildren.length === 0 ? (
                          <div className="col-span-full text-center py-8 text-gray-500">
                            {gameMode === 'team' ? '선택된 팀에 등록된 아이가 없습니다' : '등록된 아이가 없습니다'}
                          </div>
                        ) : (
                          displayChildren
                            .sort((a, b) => b.points - a.points)
                            .map((child) => {
                              const isSelected = selectedChildIds.includes(child.qrId);
                              return (
                                <button
                                  key={child.qrId}
                                  onClick={() => {
                                    setSelectedChildIds(prev =>
                                      isSelected
                                        ? prev.filter(id => id !== child.qrId)
                                        : [...prev, child.qrId]
                                    );
                                  }}
                                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 relative ${
                                    isSelected
                                      ? 'bg-blue-500 text-white border-blue-600 shadow-lg'
                                      : 'bg-white text-gray-800 border-gray-200 hover:border-blue-300'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                      <span className="text-blue-500 text-sm">✓</span>
                                    </div>
                                  )}
                                  <p className="font-bold text-lg">{child.name}</p>
                                  <p className={`text-sm ${
                                    isSelected ? 'text-blue-100' : 'text-gray-500'
                                  }`}>{child.age}</p>
                                  <p className={`font-semibold mt-1 ${
                                    isSelected ? 'text-white' : 'text-green-600'
                                  }`}>{child.points}점</p>
                                </button>
                              );
                            })
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* 포인트 입력 */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-base sm:text-lg font-bold text-gray-700 mb-2 sm:mb-3">💎 줄 포인트</label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 text-xl sm:text-2xl font-bold text-center border-2 sm:border-4 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                    min="1"
                    max="100"
                  />
                </div>

                {/* 포인트 추가 버튼 */}
                <Button
                  onClick={async () => {
                    await addPoints();
                    const count = selectedChildIds.length;
                    setSelectedChildIds([]);
                    setPoints(10);
                    alert(`${count}명에게 포인트가 추가되었습니다! 🎉`);
                  }}
                  disabled={selectedChildIds.length === 0}
                  size="lg"
                  className="w-full h-12 sm:h-14 md:h-16 text-base sm:text-lg md:text-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="mr-2 size-4 sm:size-5 md:size-6" />
                  {selectedChildIds.length > 0 ? `${selectedChildIds.length}명에게 포인트 추가하기` : '포인트 추가하기'}
                </Button>
              </div>
              
              {/* 하단 버튼 */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 justify-center">
                <Button 
                  onClick={resetGame}
                  size="lg"
                  className="bg-blue-500 hover:bg-blue-600 text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 rounded-xl shadow-lg transition-transform hover:scale-105"
                >
                  같은 게임 다시 하기 🔄
                </Button>
                <Button 
                  onClick={() => setSelectedGame(null)}
                  size="lg"
                  variant="outline"
                  className="text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 rounded-xl border-2 hover:bg-gray-50 transition-transform hover:scale-105"
                >
                  다른 게임 선택 🎮
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 text-6xl opacity-20 animate-pulse">⭐</div>
          <div className="absolute bottom-20 right-20 text-6xl opacity-20 animate-pulse delay-700">🎈</div>
          <div className="absolute top-40 right-40 text-6xl opacity-20 animate-pulse delay-300">✨</div>
          <div className="absolute bottom-40 left-40 text-6xl opacity-20 animate-pulse delay-500">🎊</div>
        </div>
      </div>
    );
  }

  // 3. Playing Game Screen
  const currentItem = items[currentIndex];
  if (!currentItem) return null;

  const isClassificationGame = selectedGame === '쉬움-분류게임' || selectedGame === '어려움-분류게임' || selectedGame === '어려움-사지선다';
  const isOXQuiz = selectedGame === '쉬움-OX퀴즈' || selectedGame === '어려움-OX퀴즈';
  const isCardMatching = selectedGame === '쉬움-카드매칭' || selectedGame === '어려움-카드매칭';
  const isHardCardMatching = selectedGame === '어려움-카드매칭'; // 고학년 A/B 선택 게임

  // 고학년 A/B 선택 게임 업데이트 예정 화면
  if (isHardCardMatching) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 z-50 flex items-center justify-center">
        <Card className="max-w-2xl w-full mx-8 border-4 border-purple-200 shadow-2xl bg-white/95 backdrop-blur">
          <div className="p-16 text-center">
            <div className="text-8xl mb-6 animate-bounce">🚧</div>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              업데이트 예정
            </h2>
            <p className="text-2xl text-gray-600 mb-8">
              고학년 A/B 선택 게임은 곧 만나볼 수 있어요!
            </p>
            <Button 
              onClick={() => setSelectedGame(null)} 
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xl px-8 py-6 rounded-2xl"
            >
              <ArrowLeft className="size-6 mr-2" />
              다른 게임 선택하기
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 z-50 flex overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-200/20 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Left Side - Game Screen */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm shadow-xl px-4 py-2 flex justify-between items-center border-b-2 border-purple-200 flex-shrink-0">
          <Button
            onClick={() => setSelectedGame(null)}
            variant="ghost"
            size="sm"
            className="hover:bg-purple-100 text-sm font-medium flex-shrink-0"
          >
            <ArrowLeft className="size-4 mr-1" />
            뒤로
          </Button>
          <div className="text-center flex-1 px-2 min-w-0">
            <p className="font-bold text-base md:text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
              {selectedGame.replace('쉬움-', '').replace('어려움-', '')}
            </p>
            <p className="text-xs md:text-sm text-gray-600 font-medium">
              문제 {currentIndex + 1} / {items.length}
            </p>
          </div>

          {/* 점수 표시 */}
          <div className="flex items-center gap-3 mr-2">
            <div className="text-center">
              <p className="text-xs text-gray-500">{gameMode === 'class' ? '반 점수' : '팀 점수'}</p>
              <p className="font-bold text-lg text-yellow-600">
                {gameMode === 'class'
                  ? classScore
                  : Object.values(teamScores).reduce((a, b) => a + b, 0)
                }점
              </p>
            </div>
            <div className="text-center text-xs">
              <span className="text-green-600">✓{correctCount}</span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-red-500">✗{wrongCount}</span>
            </div>
          </div>

          {/* 진행 바 */}
          <div className="w-24 md:w-32">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
                style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <Card className="max-w-4xl w-full border-2 border-white shadow-xl bg-white/95 backdrop-blur animate-scale-in h-fit max-h-full overflow-y-auto">
            <div className="p-4 md:p-6 text-center">
              {isClassificationGame && (
                <>
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-300 to-blue-300 rounded-full blur-2xl opacity-30" />
                    <div className="relative text-4xl md:text-6xl animate-bounce">{currentItem.emoji}</div>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-4 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent leading-tight px-2">
                    {currentItem.question}
                  </h2>

                  {/* 사지선다 선택지 */}
                  <div className="grid grid-cols-2 gap-2 md:gap-3 max-w-3xl mx-auto mb-3">
                    {currentItem.options && currentItem.options.map((option: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => handleClassificationAnswer(index)}
                        disabled={showAnswer}
                        className={`group relative overflow-hidden p-3 md:p-4 rounded-xl transition-all hover:scale-105 active:scale-95 border-2 border-white shadow-lg ${
                          showAnswer
                            ? index === currentItem.answer
                              ? 'bg-gradient-to-br from-green-400 to-emerald-500' // 정답 표시
                              : selectedOption === index
                                ? 'bg-gradient-to-br from-red-400 to-red-500' // 선택한 오답
                                : 'bg-gradient-to-br from-gray-300 to-gray-400 opacity-60' // 나머지
                            : 'bg-gradient-to-br from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600'
                        }`}
                      >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 text-center">
                          <p className="text-sm md:text-base font-bold text-white drop-shadow-lg mb-1">
                            {['①', '②', '③', '④'][index]}
                          </p>
                          <p className="text-base md:text-xl font-bold text-white drop-shadow-lg">
                            {option}
                          </p>
                        </div>
                        {showAnswer && index === currentItem.answer && (
                          <div className="absolute top-1 right-1 text-xl md:text-2xl">✓</div>
                        )}
                        {showAnswer && selectedOption === index && index !== currentItem.answer && (
                          <div className="absolute top-1 right-1 text-xl md:text-2xl">✗</div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* 정답/오답 피드백 */}
                  {showAnswer && currentItem.options && (
                    <div className={`p-3 md:p-4 rounded-xl border-2 border-white shadow-lg animate-slide-up ${
                      isCorrect
                        ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                        : 'bg-gradient-to-r from-orange-400 to-red-400'
                    }`}>
                      {isCorrect ? (
                        <p className="text-lg md:text-xl font-bold text-white drop-shadow-lg mb-1">
                          🎉 정답이에요! +5점
                        </p>
                      ) : (
                        <>
                          <p className="text-lg md:text-xl font-bold text-white drop-shadow-lg mb-1">
                            😢 아쉬워요!
                          </p>
                          <p className="text-sm md:text-base text-white drop-shadow-lg">
                            정답: {currentItem.options[currentItem.answer]}
                          </p>
                        </>
                      )}
                      <p className="text-xs md:text-sm text-white/90 drop-shadow mt-1">
                        잠시 후 다음 문제로 넘어갑니다...
                      </p>
                    </div>
                  )}
                </>
              )}

              {isOXQuiz && (
                <>
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full blur-2xl opacity-30" />
                    <div className="relative text-4xl md:text-6xl animate-bounce">{currentItem.emoji}</div>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight px-2">
                    {currentItem.question}
                  </h2>
                  <p className="text-base md:text-lg text-gray-700 mb-4 font-semibold px-2">
                    {difficulty === 'easy' ? '맞는 이야기일까요? 🤔' : '올바른 설명일까요? 🤔'}
                  </p>

                  {/* OX 버튼 */}
                  <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto mb-3">
                    <button
                      onClick={() => handleOXAnswer(true)}
                      disabled={showAnswer}
                      className={`group relative overflow-hidden flex flex-col items-center gap-2 p-4 md:p-6 rounded-xl transition-all hover:scale-105 active:scale-95 border-2 border-white shadow-lg hover:shadow-xl ${
                        showAnswer
                          ? currentItem.answer === true
                            ? 'bg-gradient-to-br from-green-400 to-green-600' // 정답
                            : selectedOption === true
                              ? 'bg-gradient-to-br from-red-400 to-red-600' // 선택한 오답
                              : 'bg-gradient-to-br from-gray-300 to-gray-400 opacity-60'
                          : 'bg-gradient-to-br from-blue-400 to-blue-600'
                      }`}
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Check className="size-12 md:size-16 text-white drop-shadow-lg relative z-10" strokeWidth={3} />
                      <span className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg relative z-10">O</span>
                      {showAnswer && currentItem.answer === true && (
                        <span className="absolute top-1 right-2 text-xl">✓</span>
                      )}
                      {showAnswer && selectedOption === true && currentItem.answer !== true && (
                        <span className="absolute top-1 right-2 text-xl">✗</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleOXAnswer(false)}
                      disabled={showAnswer}
                      className={`group relative overflow-hidden flex flex-col items-center gap-2 p-4 md:p-6 rounded-xl transition-all hover:scale-105 active:scale-95 border-2 border-white shadow-lg hover:shadow-xl ${
                        showAnswer
                          ? currentItem.answer === false
                            ? 'bg-gradient-to-br from-green-400 to-green-600' // 정답
                            : selectedOption === false
                              ? 'bg-gradient-to-br from-red-400 to-red-600' // 선택한 오답
                              : 'bg-gradient-to-br from-gray-300 to-gray-400 opacity-60'
                          : 'bg-gradient-to-br from-orange-400 to-red-500'
                      }`}
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <X className="size-12 md:size-16 text-white drop-shadow-lg relative z-10" strokeWidth={3} />
                      <span className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg relative z-10">X</span>
                      {showAnswer && currentItem.answer === false && (
                        <span className="absolute top-1 right-2 text-xl">✓</span>
                      )}
                      {showAnswer && selectedOption === false && currentItem.answer !== false && (
                        <span className="absolute top-1 right-2 text-xl">✗</span>
                      )}
                    </button>
                  </div>

                  {/* 정답/오답 피드백 */}
                  {showAnswer && (
                    <div
                      className={`p-3 md:p-4 rounded-xl border-2 border-white shadow-lg mx-auto max-w-md animate-slide-up ${
                        isCorrect
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                          : 'bg-gradient-to-br from-orange-400 to-red-500'
                      }`}
                    >
                      {isCorrect ? (
                        <p className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
                          🎉 정답이에요! +5점
                        </p>
                      ) : (
                        <>
                          <p className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
                            😢 아쉬워요!
                          </p>
                          <p className="text-sm md:text-base text-white drop-shadow-lg mt-1">
                            정답은 {currentItem.answer ? 'O' : 'X'}예요
                          </p>
                        </>
                      )}
                      <p className="text-sm md:text-base text-white drop-shadow-lg mt-1 mb-1">
                        {currentItem.reason}
                      </p>
                      <p className="text-xs md:text-sm text-white/90 drop-shadow">
                        잠시 후 다음 문제로 넘어갑니다...
                      </p>
                    </div>
                  )}
                </>
              )}

              {isCardMatching && (
                <>
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full blur-2xl opacity-30 animate-pulse" />
                    <div className="relative text-4xl md:text-6xl animate-pulse">{currentItem.emoji}</div>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight px-2">
                    {currentItem.question}
                  </h2>

                  {/* A/B 선택지 */}
                  <div className="grid grid-cols-2 gap-3 max-w-3xl mx-auto mb-3">
                    <button
                      onClick={() => handleCardAnswer('A')}
                      disabled={showAnswer}
                      className={`group relative overflow-hidden p-4 md:p-6 rounded-xl transition-all hover:scale-105 active:scale-95 border-2 border-white shadow-lg ${
                        showAnswer
                          ? currentItem.answer === 'A'
                            ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                            : selectedOption === 'A'
                              ? 'bg-gradient-to-br from-red-400 to-red-500'
                              : 'bg-gradient-to-br from-gray-300 to-gray-400 opacity-60'
                          : 'bg-gradient-to-br from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600'
                      }`}
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10 text-center">
                        <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg mb-2">A</p>
                        <p className="text-base md:text-xl font-bold text-white drop-shadow-lg">
                          {currentItem.optionA}
                        </p>
                      </div>
                      {showAnswer && currentItem.answer === 'A' && (
                        <div className="absolute top-2 right-2 text-2xl md:text-3xl">✓</div>
                      )}
                      {showAnswer && selectedOption === 'A' && currentItem.answer !== 'A' && (
                        <div className="absolute top-2 right-2 text-2xl md:text-3xl">✗</div>
                      )}
                    </button>

                    <button
                      onClick={() => handleCardAnswer('B')}
                      disabled={showAnswer}
                      className={`group relative overflow-hidden p-4 md:p-6 rounded-xl transition-all hover:scale-105 active:scale-95 border-2 border-white shadow-lg ${
                        showAnswer
                          ? currentItem.answer === 'B'
                            ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                            : selectedOption === 'B'
                              ? 'bg-gradient-to-br from-red-400 to-red-500'
                              : 'bg-gradient-to-br from-gray-300 to-gray-400 opacity-60'
                          : 'bg-gradient-to-br from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600'
                      }`}
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10 text-center">
                        <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg mb-2">B</p>
                        <p className="text-base md:text-xl font-bold text-white drop-shadow-lg">
                          {currentItem.optionB}
                        </p>
                      </div>
                      {showAnswer && currentItem.answer === 'B' && (
                        <div className="absolute top-2 right-2 text-2xl md:text-3xl">✓</div>
                      )}
                      {showAnswer && selectedOption === 'B' && currentItem.answer !== 'B' && (
                        <div className="absolute top-2 right-2 text-2xl md:text-3xl">✗</div>
                      )}
                    </button>
                  </div>

                  {/* 정답/오답 피드백 */}
                  {showAnswer && (
                    <div className={`p-3 md:p-4 rounded-xl border-2 border-white shadow-lg animate-slide-up ${
                      isCorrect
                        ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                        : 'bg-gradient-to-r from-orange-400 to-red-400'
                    }`}>
                      {isCorrect ? (
                        <p className="text-lg md:text-xl font-bold text-white drop-shadow-lg mb-1">
                          🎉 정답이에요! +5점
                        </p>
                      ) : (
                        <>
                          <p className="text-lg md:text-xl font-bold text-white drop-shadow-lg mb-1">
                            😢 아쉬워요!
                          </p>
                          <p className="text-sm md:text-base text-white drop-shadow-lg">
                            정답: {currentItem.answer === 'A' ? currentItem.optionA : currentItem.optionB}
                          </p>
                        </>
                      )}
                      <p className="text-xs md:text-sm text-white/90 drop-shadow mt-1">
                        잠시 후 다음 문제로 넘어갑니다...
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Navigation */}
        <div className="bg-white/90 backdrop-blur-sm shadow-xl px-4 py-2 border-t-2 border-purple-200 flex-shrink-0">
          <div className="max-w-5xl mx-auto">
            {!showAnswer && (
              <div className="text-center mb-1">
                <p className="text-sm font-bold text-purple-600 animate-pulse">
                  👆 답을 선택해주세요!
                </p>
              </div>
            )}
            {showAnswer && (
              <div className="text-center mb-1">
                <p className="text-xs md:text-sm font-bold text-green-600">
                  ⏱️ 잠시 후 자동으로 넘어갑니다
                </p>
              </div>
            )}
            <div className="flex justify-between items-center gap-2">
              <Button
                onClick={handlePrevious}
                size="sm"
                className="flex-1 h-10 text-sm bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 shadow"
              >
                <ArrowLeft className="size-4 mr-1" />
                이전
              </Button>
              
              <Button
                onClick={handleNext}
                size="sm"
                className="flex-1 h-10 text-sm bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow"
              >
                다음
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Point Management Panel */}
      <div className={`bg-white shadow-lg flex flex-col border-l transition-all duration-300 ${
        isPanelOpen ? 'w-80' : 'w-12'
      }`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="p-3 border-b hover:bg-gray-50 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          {isPanelOpen ? (
            <ChevronRight className="size-5" />
          ) : (
            <ChevronLeft className="size-5" />
          )}
        </button>

        {isPanelOpen && (
          <>
            <div className="px-4 py-3 border-b flex-shrink-0">
              <h3 className="font-bold text-base mb-1">포인트 관리</h3>
              <p className="text-xs text-gray-600 truncate">{institutionName}</p>
            </div>

            <div className="p-3 border-b space-y-2 flex-shrink-0">
              {/* Points Input */}
              <div>
                <label className="block text-xs font-medium mb-1">포인트</label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                  min="1"
                  max="100"
                />
              </div>

              {/* 선택된 인원 표시 */}
              {selectedChildIds.length > 0 && (
                <p className="text-xs text-blue-600 font-medium">
                  {selectedChildIds.length}명 선택됨
                </p>
              )}

              {/* Add Points Button */}
              <Button
                onClick={async () => {
                  await addPoints();
                  const count = selectedChildIds.length;
                  setSelectedChildIds([]);
                  alert(`${count}명에게 포인트가 추가되었습니다! 🎉`);
                }}
                className="w-full bg-green-500 hover:bg-green-600 h-8 text-sm"
                disabled={selectedChildIds.length === 0}
              >
                <Plus className="mr-1 size-4" />
                {selectedChildIds.length > 0 ? `${selectedChildIds.length}명에게 추가` : '포인트 추가'}
              </Button>
            </div>

            {/* Children List */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">아이 선택</h4>
                {/* 전체 선택 버튼 */}
                <button
                  onClick={() => {
                    const allSelected = children.length > 0 && children.every(c => selectedChildIds.includes(c.qrId));
                    if (allSelected) {
                      setSelectedChildIds([]);
                    } else {
                      setSelectedChildIds(children.map(c => c.qrId));
                    }
                  }}
                  className="text-xs text-blue-500 hover:text-blue-700"
                >
                  {children.length > 0 && children.every(c => selectedChildIds.includes(c.qrId)) ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div className="space-y-1.5">
                {children.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-3">
                    등록된 아이가 없습니다
                  </p>
                ) : (
                  children
                    .sort((a, b) => b.points - a.points)
                    .map((child, index) => {
                      const isSelected = selectedChildIds.includes(child.qrId);
                      return (
                        <Card
                          key={child.qrId}
                          className={`p-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-2 border-blue-500'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            setSelectedChildIds(prev =>
                              isSelected
                                ? prev.filter(id => id !== child.qrId)
                                : [...prev, child.qrId]
                            );
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                                isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200'
                              }`}>
                                {isSelected ? '✓' : index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-xs">{child.name}</p>
                                <p className="text-[10px] text-gray-500">{child.age}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-xs text-green-600">{child.points}점</p>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}