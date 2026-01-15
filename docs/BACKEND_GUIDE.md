# 🖥️ 백엔드 가이드

## 📍 백엔드 파일 위치

```
/supabase/functions/server/
├── index.tsx          ⭐ 메인 API 서버 (수정 OK!)
└── kv_store.tsx       ⛔ 절대 수정 금지
```

---

## 🎯 API 서버 구조

### 파일: `/supabase/functions/server/index.tsx`

이 파일 하나에 모든 API가 들어있습니다!

---

## 📋 API 목록 (카테고리별)

### 1️⃣ 인증 (Authentication)

#### 관리자 로그인
```typescript
POST /make-server-edd517d1/auth/admin-login

// 위치: 24줄
// 수정: 이메일/비밀번호 변경 가능

if (email === "Separaterecycling@ptu.com" && password === "ptu2025") {
  // 여기서 수정!
}
```

#### 일반 사용자 회원가입
```typescript
POST /make-server-edd517d1/auth/signup

// 위치: 45줄
// 기능: 새 사용자 생성
```

#### 일반 사용자 로그인
```typescript
POST /make-server-edd517d1/auth/login

// 위치: 76줄
// 기능: 사용자/관리자 로그인 처리
```

---

### 2️⃣ 기관 관리 (Institution)

#### 기관 생성
```typescript
POST /make-server-edd517d1/institution/create

// 위치: 112줄
// 수정 예시: 기관명 검증 추가
if (!name || name.length < 2) {
  return c.json({ success: false, message: "기관명은 2자 이상이어야 합니다." }, 400);
}
```

#### 기관 목록 조회
```typescript
GET /make-server-edd517d1/institution/list

// 위치: 135줄
```

#### 기관 검색
```typescript
POST /make-server-edd517d1/institution/lookup

// 위치: 327줄
// 기능: 기관명으로 검색 (부분 일치)
```

---

### 3️⃣ 아동 관리 (Child)

#### 아동 등록
```typescript
POST /make-server-edd517d1/child/register

// 위치: 146줄
// 핵심: QR ID + 기관 ID로 고유 아동 생성
// 키 패턴: child:{qrId}:{institutionId}
```

**중요 개념:**
```
QR_001 + 기관A = child:QR_001:inst_A (기관A의 아동)
QR_001 + 기관B = child:QR_001:inst_B (기관B의 아동)
→ 같은 QR 코드, 다른 아동!
```

#### 아동 목록 조회
```typescript
GET /make-server-edd517d1/child/list/:institutionId

// 위치: 181줄
// 기능: 특정 기관의 모든 아동 조회
```

#### 아동 데이터 초기화
```typescript
POST /make-server-edd517d1/child/reset

// 위치: 192줄
// 기능: 아동 데이터 아카이브 후 삭제
```

---

### 4️⃣ 포인트 관리 (Points)

#### 포인트 업데이트
```typescript
POST /make-server-edd517d1/points/update

// 위치: 220줄
// 기능: 포인트 추가/차감 (음수 가능)

// 예시: 10점 추가
{ qrId: "QR_001", institutionId: "inst_A", points: 10 }

// 예시: 10점 차감
{ qrId: "QR_001", institutionId: "inst_A", points: -10 }
```

#### 포인트 추가 (대체 엔드포인트)
```typescript
POST /make-server-edd517d1/child/add-points

// 위치: 248줄
// 기능: points/update와 동일
```

---

### 5️⃣ 순위 (Ranking)

#### 기관별 순위
```typescript
GET /make-server-edd517d1/ranking/:institutionId

// 위치: 275줄
// 기능: 특정 기관 내 순위 (포인트 내림차순)
```

#### 전체 순위
```typescript
GET /make-server-edd517d1/ranking/global

// 위치: 298줄
// 기능: 모든 기관 통합 순위
```

---

## 🔧 API 수정 가이드

### 새 API 추가하기

**위치**: `/supabase/functions/server/index.tsx` 맨 아래

**템플릿**:
```typescript
// ==================== 새 기능 ====================
app.post("/make-server-edd517d1/새엔드포인트", async (c) => {
  try {
    const { 파라미터1, 파라미터2 } = await c.req.json();
    
    // 유효성 검사
    if (!파라미터1) {
      return c.json({ success: false, message: "파라미터가 필요합니다." }, 400);
    }
    
    // KV Store 사용
    const data = await kv.get(`key:${파라미터1}`);
    
    return c.json({ success: true, data });
  } catch (error) {
    console.log(`에러 발생: ${error}`);
    return c.json({ success: false, message: "서버 오류" }, 500);
  }
});
```

---

### 기존 API 수정하기

**예시 1: 아동 등록 시 나이 제한 추가**

**파일**: `/supabase/functions/server/index.tsx`  
**위치**: 146줄 (child/register)

```typescript
// 기존 코드에 추가
const { qrId, name, age, institutionId } = await c.req.json();

// 새로 추가: 나이 검증
const validAges = ['4-5세', '6-7세', '초등학생'];
if (!validAges.includes(age)) {
  return c.json({ 
    success: false, 
    message: "유효하지 않은 나이입니다." 
  }, 400);
}

// 기존 코드 계속...
```

---

**예시 2: 포인트 한도 제한**

**파일**: `/supabase/functions/server/index.tsx`  
**위치**: 220줄 (points/update)

```typescript
// 포인트 업데이트 후 추가
childData.points = (childData.points || 0) + points;

// 새로 추가: 최대 포인트 제한
if (childData.points > 1000) {
  childData.points = 1000;
}
if (childData.points < 0) {
  childData.points = 0;
}

await kv.set(`child:${qrId}:${institutionId}`, childData);
```

---

## 💾 KV Store 사용법

### kv_store.tsx 함수들

**절대 이 파일을 수정하지 마세요!** 대신 함수를 사용하세요:

```typescript
// 1. 단일 값 가져오기
const value = await kv.get('key');

// 2. 값 저장하기
await kv.set('key', { data: '값' });

// 3. 값 삭제하기
await kv.del('key');

// 4. 여러 값 가져오기
const values = await kv.mget(['key1', 'key2']);

// 5. 여러 값 저장하기
await kv.mset([
  ['key1', { data: '값1' }],
  ['key2', { data: '값2' }]
]);

// 6. 여러 값 삭제하기
await kv.mdel(['key1', 'key2']);

// 7. 접두사로 검색
const items = await kv.getByPrefix('child:QR_001:');
```

---

## 🗄️ 데이터 키 패턴

### 현재 사용 중인 키

```typescript
// 사용자
user:{email}                              
// 예: user:test@example.com

// 기관
institution:{id}                          
institution:list                          
// 예: institution:inst_1735660800000
// 예: institution:list

// 아동
child:{qrId}:{institutionId}             
children:{institutionId}                 
// 예: child:QR_001:inst_A
// 예: children:inst_A

// 아카이브
archive:{qrId}:{institutionId}:{timestamp}
// 예: archive:QR_001:inst_A:1735660800000
```

---

### 새 키 패턴 추가하기

**규칙**:
- 명확한 접두사 사용 (`type:`)
- 고유 식별자 포함 (`:id`)
- 계층 구조 표현 (`:parent:child`)

**예시**:
```typescript
// 게임 기록 저장
game_history:{institutionId}:{childQrId}:{timestamp}

// 사용 예
await kv.set(
  `game_history:${institutionId}:${qrId}:${Date.now()}`,
  { score: 50, gameType: '분류게임' }
);
```

---

## 🔍 디버깅

### 로그 확인하기

**모든 API에 로그 추가하기**:
```typescript
app.post("/make-server-edd517d1/child/register", async (c) => {
  try {
    const body = await c.req.json();
    console.log('아동 등록 요청:', body); // 로그 추가!
    
    // ... 처리 ...
    
    console.log('아동 등록 성공:', childData); // 로그 추가!
    return c.json({ success: true, child: childData });
  } catch (error) {
    console.error('아동 등록 실패:', error); // 에러 로그!
    return c.json({ success: false, message: "Failed to register child" }, 500);
  }
});
```

---

## 🚀 배포 후 테스트

### Postman/Thunder Client로 테스트

**예시: 아동 등록 API 테스트**

```
POST https://rfhvdpsfawxcommkajli.supabase.co/functions/v1/make-server-edd517d1/child/register

Headers:
  Content-Type: application/json
  Authorization: Bearer eyJhbGci...

Body:
{
  "qrId": "TEST_001",
  "name": "테스트 아동",
  "age": "4-5세",
  "institutionId": "inst_1234567890"
}
```

---

## 📊 API 응답 패턴

### 성공 응답
```json
{
  "success": true,
  "data": { ... }
}
```

### 실패 응답
```json
{
  "success": false,
  "message": "오류 메시지"
}
```

### 상태 코드
- `200`: 성공
- `400`: 잘못된 요청 (클라이언트 오류)
- `401`: 인증 실패
- `404`: 리소스 없음
- `500`: 서버 오류

---

## 📞 더 알아보기

- **전체 API 문서**: [../API_DOCUMENTATION.md](../API_DOCUMENTATION.md)
- **파일 찾기**: [FILE_FINDER.md](./FILE_FINDER.md)
- **프로젝트 구조**: [../PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md)

---

**백엔드 수정은 이 가이드만 보면 됩니다!** 🚀
