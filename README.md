# 🌈 쏙쏙분리 똑똑분리

어린이를 위한 재미있는 분리수거 교육 게임 플랫폼

---

## 📖 프로젝트 소개

**쏙쏙분리 똑똑분리**는 유치원과 어린이집 아이들이 분리수거를 재미있게 배울 수 있는 교육용 웹 애플리케이션입니다.

### 주요 특징

✨ **QR 코드 기반 아동 관리** - 각 아이에게 고유한 QR 아이디 카드 발급  
🎮 **학년별 맞춤 게임** - 저학년(1~3학년)과 고학년(4~6학년) 난이도 구분  
👥 **팀 관리 시스템** - 선생님이 팀을 생성하고 아이들을 팀별로 배정/관리  
🏆 **포인트 & 순위 시스템** - 게임을 통해 포인트를 획득하고 친구들과 경쟁  
📱 **모바일 게임** - 집에서도 즐길 수 있는 간단한 분리수거 퀴즈  
💬 **AI 챗봇** - 분리수거 관련 질문에 답변 (데모)  
🌍 **기관별 관리** - 여러 기관이 독립적으로 사용 가능

---

## 💻 개발 환경 설정

이 프로젝트를 로컬에서 실행하거나 배포하기 위한 가이드입니다.

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치 및 실행
```bash
# 1. 저장소 클론
git clone [repository-url]

# 2. 패키지 설치
npm install

# 3. 개발 서버 실행
npm run dev
```

### 환경 변수
`.env` 파일에 다음 설정이 필요합니다 (필요 시):
- `VITE_FIREBASE_API_KEY`: Firebase API Key (선택 사항, 없으면 백업 모드 동작)

---

## 🚀 빠른 시작

### 선생님(기관) 로그인
기관 계정으로 로그인하여 아이들과 활동을 관리할 수 있습니다.
처음 사용하시는 경우 회원가입을 먼저 진행해주세요.

### 일반 사용자
앱을 다운로드받아 가정에서도 즐길 수 있습니다.

**5분 만에 시작하기**: [docs/QUICK_START.md](./docs/QUICK_START.md)

---

## 📚 문서 (새로 정리됨!)

### 🎯 처음 사용하시나요?

1. **[빠른 시작](./docs/QUICK_START.md)** ⭐ - 5분이면 충분!
2. **[파일 찾기](./docs/FILE_FINDER.md)** ⭐ - 수정할 파일 찾는 법
3. **[문서 인덱스](./docs/INDEX.md)** - 모든 문서 목록

### 🖥️ 백엔드 개발

- **[백엔드 가이드](./docs/BACKEND_GUIDE.md)** - API 수정 방법
- **[API 문서](./API_DOCUMENTATION.md)** - 전체 API 상세

### 💻 프론트엔드 개발

- **[프론트엔드 가이드](./FRONTEND_GUIDE.md)** - 화면 수정 방법
- **[파일 찾기](./docs/FILE_FINDER.md)** - 컴포넌트 위치

### 🎫 기능별 가이드

- **[QR 코드 제작](./QR_CODE_GUIDE.md)** - QR 코드 만들기
- **[프로젝트 구조](./PROJECT_STRUCTURE.md)** - 전체 구조 이해

---

## 📁 간단한 폴더 구조

```
프로젝트/
│
├── 📚 /docs/              ← 구조화된 문서 (여기 먼저 보세요!)
│   ├── QUICK_START.md     ← 빠른 시작
│   ├── FILE_FINDER.md     ← 파일 찾기
│   ├── BACKEND_GUIDE.md   ← 백엔드 가이드
│   └── INDEX.md           ← 문서 목차
│
├── 🖥️ /supabase/functions/server/
│   └── index.tsx          ← 백엔드 API (여기만 수정!)
│
└── 💻 /src/app/components/
    ├── AdminDashboard.tsx ← 관리자 (QR 생성!)
    ├── GameScreen.tsx     ← 게임 화면
    └── MobileGame.tsx     ← 모바일 게임
```

**자세한 구조**: [docs/FILE_FINDER.md](./docs/FILE_FINDER.md)

---

## 🎮 게임 종류

### 🌱 저학년 (1~3학년) ✅ 완료
1. **분류 게임** - 기본적인 분리수거 방법을 재미있게 학습
2. **OX 퀴즈** - 쉬운 환경 상식 퀴즈 (O/X)
3. **카드 매칭** - 같은 그림 찾기로 친숙해지기

### 🌳 고학년 (4~6학년) ✅ 완료
1. **심화 분류 게임** - 헷갈리는 복합 재질 쓰레기 분리배출
2. **심화 OX 퀴즈** - 구체적인 분리배출 방법과 환경 지식
3. **심화 카드 매칭** - 다양한 자원순환 관련 아이템 매칭

---

## 🔑 고유 QR 아이디 시스템

이 프로젝트의 핵심 기능인 **로그인 없는 아동 식별 시스템**입니다.
복잡한 로그인 과정 없이 QR 코드 스캔만으로 아이들을 식별하고 활동을 기록할 수 있습니다.

### 1. ID 구조 및 생성 원리
QR 코드는 단순한 **고유 식별자(Unique String)**만을 담고 있습니다. QR 코드 자체에는 아이의 이름이나 나이 등 개인정보가 포함되지 않아 분실 시에도 개인정보 유출 위험이 없습니다.

- **형식**: `QR_{TIMESTAMP}{RANDOM}`
- **예시**: `QR_ks3d2A9F`
- **생성 코드 예시**:
  ```typescript
  const generateUniqueId = () => {
    // 타임스탬프와 랜덤 문자열을 조합하여 충돌 방지
    const timestamp = Date.now().toString(36).slice(-5);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `QR_${timestamp}${randomStr}`;
  };
  ```

### 2. 시스템 작동 프로세스

1. **발급 (관리자)**
   - 선생님이 대시보드에서 아이들의 이름을 입력하고 '생성' 버튼을 누릅니다.
   - 시스템이 각 아이에게 고유 ID를 부여하고 `qrcode` 라이브러리를 통해 QR 이미지를 생성합니다.
   - 귀여운 동물 캐릭터와 함께 ID 카드가 생성됩니다.

2. **사용 (어린이)**
   - 아이는 자신의 ID 카드를 카메라에 비춥니다.
   - `html5-qrcode` 라이브러리가 실시간으로 QR 코드를 인식합니다.

3. **인증 및 처리**
   - **등록된 아이**: 즉시 이름을 불러주며 게임 참여가 가능해집니다.
   - **미등록 아이**: "등록되지 않은 친구예요!" 알림과 함께 즉석 등록 팝업이 뜹니다.

### 3. 주요 기술 스택
- **QR 생성**: `node-qrcode` - 텍스트를 고화질 QR 이미지(Data URL)로 변환
- **QR 스캔**: `html5-qrcode` - 별도 앱 설치 없이 브라우저에서 바로 카메라 연동 및 스캔

**자세한 구현 코드는 `/src/app/components/AdminDashboard.tsx`를 참고하세요.**

---

## 🛠️ 기술 스택

### 프론트엔드
- **React** 18 + TypeScript
- **Tailwind CSS** v4
- **shadcn/ui** - UI 컴포넌트
- **lucide-react** - 아이콘
- **html5-qrcode** - QR 코드 스캔
- **react-dnd** - 드래그 앤 드롭 (게임용)

### 백엔드
- **Supabase Edge Functions** - 서버리스 백엔드
- **Hono** - 경량 웹 프레임워크
- **KV Store** - Postgres 기반 키-밸류 스토어
- **Deno** - 런타임 환경

---

## 📊 데이터베이스 구조

### KV Store 키 패턴
```
user:{email}                              # 사용자 정보
institution:{id}                          # 기관 정보
institution:list                          # 기관 목록
child:{qrId}:{institutionId}             # 아동 정보
children:{institutionId}                 # 기관별 아동 목록
archive:{qrId}:{institutionId}:{timestamp} # 아카이브
```

---

## 🌐 API 엔드포인트

**Base URL**: `https://rfhvdpsfawxcommkajli.supabase.co/functions/v1/make-server-edd517d1`

### 주요 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/auth/signup` | 기관 회원가입 |
| POST | `/auth/login` | 기관 로그인 |
| POST | `/institution/create` | 기관 생성 (회원가입 시 자동) |
| GET | `/institution/list` | 기관 목록 조회 |
| POST | `/child/register` | 아동 등록 |
| GET | `/child/list/:institutionId` | 아동 목록 조회 |
| POST | `/points/update` | 포인트 업데이트 |
| GET | `/ranking/:institutionId` | 기관별 순위 |
| GET | `/ranking/global` | 전체 순위 |

**전체 API 문서**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 📱 사용 시나리오

### 선생님(기관) 워크플로우

1. **기관 생성(회원가입)**
   ```
   앱 실행 → 기관 회원가입 → 기관명/아이디 입력 → 가입 완료
   ```

2. **아동 등록**
   ```
   아동 관리 탭 → QR 코드 스캔 → 이름/나이 입력 → 등록
   ```

3. **게임 진행**
   ```
   게임 탭 → 저학년/고학년 선택 → 게임 선택 → 아동 선택 → 게임 시작
   ```

4. **순위 확인**
   ```
   순위 탭 → 우리 반 아이들 순위 확인
   ```

### 일반 사용자 워크플로우

1. **회원가입/로그인**
   ```
   앱 실행 → 회원가입 탭 → 이메일/비밀번호/이름 입력 → 가입 완료
   ```

2. **게임 플레이**
   ```
   게임 탭 → 분리수거 퀴즈 5문제 풀기 → 점수 확인
   ```

3. **순위 확인**
   ```
   순위 탭 → 기관명 검색 → 우리 기관 아이들 순위 확인
   또는 전체 순위 탭 클릭
   ```

---

## ✅ 완료된 기능

- [x] 기관 인증 시스템 (회원가입/로그인)
- [x] 기관 생성 및 관리
- [x] 팀 관리 시스템 (팀 생성/삭제, 아동 배정)
- [x] QR 코드 스캔으로 아동 등록
- [x] 저학년/고학년 난이도별 게임 6종
- [x] 게임 완료 화면 및 다시 하기 기능
- [x] 포인트 시스템 (자동 저장)
- [x] 기관별 순위
- [x] 전체 순위 (모든 기관 통합)
- [x] 모바일 게임
- [x] 챗봇 UI (데모 응답)
- [x] 귀여운 어린이 친화적 UI

---

## 🔜 향후 계획

- [ ] AI 챗봇 연동 (OpenAI API 등)
- [ ] 이미지 업로드 분석 기능
- [ ] 게임 결과 통계 및 분석
- [ ] 부모용 앱 (자녀 성적 확인)
- [ ] 인증서 발급 기능
- [ ] 다국어 지원

---

## 🐛 알려진 이슈

현재 알려진 이슈 없음.

---

## 🔐 보안 고려사항

### 현재 상태 (프로토타입)
- ⚠️ 비밀번호 평문 저장
- ⚠️ 간단한 토큰 방식 사용

### 프로덕션 배포 시 필요 사항
- [ ] 비밀번호 해싱 (bcrypt 등)
- [ ] JWT 토큰 사용
- [ ] HTTPS 강제
- [ ] Rate Limiting
- [ ] Input Validation 강화

---

## 📞 지원 및 문의

### 문서
- 프로젝트 구조: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- API 문서: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- 프론트엔드 가이드: [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)
- QR 코드 가이드: [QR_CODE_GUIDE.md](./QR_CODE_GUIDE.md)

### 이슈 제보
프로젝트 관리자에게 문의하세요.

---

## 📄 라이선스

이 프로젝트는 교육용으로 제작되었습니다.

---

## 👥 제작

**쏙쏙분리 똑똑분리 프로젝트 팀**

---

## 🙏 감사의 말

이 프로젝트는 어린이들이 분리수거의 중요성을 재미있게 배울 수 있도록 만들어졌습니다. 
더 깨끗한 환경을 만들기 위해 노력하는 모든 분들께 감사드립니다. 🌍💚

---

**버전**: 1.0.0  
**최종 업데이트**: 2025-01-01  
**개발 환경**: React 18 + TypeScript + Supabase