# 🔍 파일 찾기 완전 가이드

## 📁 실제 폴더 구조

```
프로젝트/
│
├── 🖥️ 백엔드 코드
│   └── /supabase/functions/server/
│       ├── index.tsx           ⭐ API 서버 (수정 OK!)
│       └── kv_store.tsx        ⛔ 수정 금지
│
├── 💻 프론트엔드 코드
│   └── /src/app/
│       ├── App.tsx             ⭐ 메인 라우터
│       └── components/
│           ├── AdminDashboard.tsx    ⭐ 관리자 (QR 생성!)
│           ├── GameScreen.tsx        ⭐ 게임 화면
│           ├── MobileGame.tsx        ⭐ 모바일 게임
│           ├── LoginScreen.tsx       ⭐ 로그인
│           └── ui/                   📦 UI 컴포넌트
│
├── 🎨 스타일
│   └── /src/styles/
│
└── 📚 문서
    ├── /docs/                  ← 구조화된 문서 (여기!)
    └── *.md                    ← 루트 문서들
```

---

## ⚡ 초고속 파일 찾기

### 백엔드 수정
```
/supabase/functions/server/index.tsx
```

### 프론트엔드 수정

| 수정하려는 것 | 파일 |
|--------------|------|
| QR 코드 생성 | `/src/app/components/AdminDashboard.tsx` |
| 기관 관리 | `/src/app/components/AdminDashboard.tsx` |
| 게임 문제 | `/src/app/components/GameScreen.tsx` |
| 모바일 게임 | `/src/app/components/MobileGame.tsx` |
| 로그인 화면 | `/src/app/components/LoginScreen.tsx` |

---

## 🎯 상황별 파일 찾기

### 상황 1: "QR 코드 생성 기능을 수정하고 싶어요"

**파일:**
```
/src/app/components/AdminDashboard.tsx
```

**찾는 법:**
1. 파일 열기
2. `Ctrl + F` → `generateQrCodes` 검색
3. 약 240줄 근처에 있음

---

### 상황 2: "관리자 로그인 비밀번호를 바꾸고 싶어요"

**파일:**
```
/supabase/functions/server/index.tsx
```

**찾는 법:**
1. 파일 열기
2. `Ctrl + F` → `ptu2025` 검색
3. 약 29줄 근처에 있음

**수정 예시:**
```typescript
// 기존
if (email === "Separaterecycling@ptu.com" && password === "ptu2025") {

// 변경
if (email === "Separaterecycling@ptu.com" && password === "새비밀번호123") {
```

---

### 상황 3: "게임 문제를 추가/수정하고 싶어요"

**파일:**
```
/src/app/components/GameScreen.tsx
```

**찾는 법:**

#### 분류 게임 문제
1. `Ctrl + F` → `TRASH_ITEMS`
2. 약 70줄 근처

```typescript
const TRASH_ITEMS = [
  { id: 1, name: '플라스틱병', emoji: '🥤', category: 'plastic' },
  // 여기에 새 항목 추가!
];
```

#### 카드 매칭 문제
1. `Ctrl + F` → `CARD_PAIRS`
2. 약 250줄 근처

#### OX 퀴즈 문제
1. `Ctrl + F` → `OX_QUESTIONS`
2. 약 400줄 근처

---

### 상황 4: "모바일 게임 문제를 수정하고 싶어요"

**파일:**
```
/src/app/components/MobileGame.tsx
```

**찾는 법:**
1. `Ctrl + F` → `GAME_ITEMS`
2. 약 30줄 근처

---

### 상황 5: "새 API를 추가하고 싶어요"

**파일:**
```
/supabase/functions/server/index.tsx
```

**추가 방법:**
1. 파일 맨 아래로 스크롤
2. 기존 API 패턴 복사
3. 새 엔드포인트 작성

```typescript
app.post("/make-server-edd517d1/새엔드포인트", async (c) => {
  try {
    // 코드 작성
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error: ${error}`);
    return c.json({ success: false }, 500);
  }
});
```

---

## 🚫 절대 수정하면 안 되는 파일

| 파일 | 이유 |
|------|------|
| `/supabase/functions/server/kv_store.tsx` | 시스템 파일 |
| `/utils/supabase/info.tsx` | Supabase 설정 |
| `/src/app/components/figma/ImageWithFallback.tsx` | Figma 전용 |

---

## 💡 VSCode 꿀팁

### 파일 빠르게 열기
```
Ctrl + P (Mac: Cmd + P)
→ AdminDashboard 입력
→ Enter
```

### 전체 프로젝트에서 검색
```
Ctrl + Shift + F (Mac: Cmd + Shift + F)
→ generateQrCodes 입력
```

### 현재 파일에서 검색
```
Ctrl + F (Mac: Cmd + F)
→ QR 코드 생성 입력
```

### 특정 줄로 이동
```
Ctrl + G (Mac: Cmd + G)
→ 240 입력
→ 240줄로 이동
```

---

## 📊 파일별 주요 내용

### /supabase/functions/server/index.tsx (백엔드)

| 줄 번호 | 내용 |
|---------|------|
| 24줄 | 관리자 로그인 API |
| 45줄 | 일반 사용자 회원가입 |
| 76줄 | 일반 사용자 로그인 |
| 112줄 | 기관 생성 |
| 146줄 | 아동 등록 |
| 220줄 | 포인트 업데이트 |
| 275줄 | 순위 조회 |

### /src/app/components/AdminDashboard.tsx (관리자)

| 줄 번호 | 내용 |
|---------|------|
| 240줄 | QR 코드 생성 함수 |
| 260줄 | QR 코드 다운로드 함수 |
| 145줄 | 기관 생성 함수 |
| 165줄 | 아동 등록 함수 |
| 195줄 | 포인트 업데이트 함수 |

### /src/app/components/GameScreen.tsx (게임)

| 줄 번호 | 내용 |
|---------|------|
| 70줄 | 분류 게임 문제 |
| 250줄 | 카드 매칭 문제 |
| 400줄 | OX 퀴즈 문제 |

---

## 🎯 실전 연습

### 연습 1: QR 코드 생성 개수 제한 변경

**목표**: 한 번에 최대 200개까지 생성 가능하게 변경

**파일**: `/src/app/components/AdminDashboard.tsx`

**찾기**: `Ctrl + F` → `100개까지`

**수정**:
```typescript
// 기존
if (qrEndNumber - qrStartNumber > 100) {
  alert('한 번에 최대 100개까지만 생성할 수 있습니다.');

// 변경
if (qrEndNumber - qrStartNumber > 200) {
  alert('한 번에 최대 200개까지만 생성할 수 있습니다.');
```

---

### 연습 2: 관리자 이메일 변경

**목표**: 관리자 이메일을 `admin@company.com`으로 변경

**파일**: `/supabase/functions/server/index.tsx`

**찾기**: `Ctrl + F` → `Separaterecycling`

**수정**: 2군데 모두 변경 (24줄, 81줄)
```typescript
if (email === "admin@company.com" && password === "ptu2025") {
```

---

## 📞 여전히 못 찾겠다면?

1. **문서 인덱스**: [INDEX.md](./INDEX.md)
2. **상세 구조**: [../FILE_ORGANIZATION.md](../FILE_ORGANIZATION.md)
3. **빠른 참조**: [../QUICK_REFERENCE.md](../QUICK_REFERENCE.md)

---

**이 가이드로도 못 찾겠다면 프로젝트 관리자에게 문의하세요!**
