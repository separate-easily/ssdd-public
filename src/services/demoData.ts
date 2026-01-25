/**
 * ============================================================
 * 데모 모드 데이터 서비스
 * ============================================================
 *
 * DEMO_MODE=true일 때 Supabase 대신 사용되는 로컬 데이터 레이어.
 * 모든 데이터는 localStorage에 저장되어 새로고침해도 유지됨.
 *
 * 네트워크 호출 없이 동작하므로 오프라인에서도 사용 가능.
 *
 * 파일 위치: src/services/demoData.ts
 */

// ============================================================
// 타입 정의
// ============================================================

export interface DemoInstitution {
  id: string;
  name: string;
  ownerId: string;
  teams: string[];
  createdAt: string;
}

export interface DemoChild {
  qrId: string;
  name: string;
  age: string;
  points: number;
  team?: string;
  institutionId: string;
  createdAt: string;
}

// ============================================================
// localStorage 키
// ============================================================

const STORAGE_KEYS = {
  INSTITUTIONS: 'demo_institutions',
  CHILDREN: 'demo_children',
} as const;

// ============================================================
// 헬퍼 함수
// ============================================================

function generateId(): string {
  return `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[demoData] localStorage 저장 실패:', e);
  }
}

// ============================================================
// 초기 샘플 데이터
// ============================================================

/**
 * 데모용 초기 아이 목록 생성
 */
function createInitialChildren(institutionId: string): DemoChild[] {
  return [
    {
      qrId: 'demo-child-001',
      name: '김민준',
      age: '5',
      points: 150,
      team: '햇님반',
      institutionId,
      createdAt: new Date().toISOString(),
    },
    {
      qrId: 'demo-child-002',
      name: '이서연',
      age: '6',
      points: 230,
      team: '햇님반',
      institutionId,
      createdAt: new Date().toISOString(),
    },
    {
      qrId: 'demo-child-003',
      name: '박지호',
      age: '5',
      points: 180,
      team: '달님반',
      institutionId,
      createdAt: new Date().toISOString(),
    },
    {
      qrId: 'demo-child-004',
      name: '최수아',
      age: '6',
      points: 320,
      team: '달님반',
      institutionId,
      createdAt: new Date().toISOString(),
    },
    {
      qrId: 'demo-child-005',
      name: '정하윤',
      age: '5',
      points: 95,
      team: '별님반',
      institutionId,
      createdAt: new Date().toISOString(),
    },
  ];
}

/**
 * 데모용 초기 기관 생성 (첫 로그인 시)
 */
function createInitialInstitution(ownerId: string): DemoInstitution {
  return {
    id: 'demo-institution-001',
    name: '데모 유치원',
    ownerId,
    teams: ['햇님반', '달님반', '별님반'],
    createdAt: new Date().toISOString(),
  };
}

// ============================================================
// 기관 (Institution) 관련 함수
// ============================================================

/**
 * 기관 목록 로드 (데모 모드)
 *
 * @param ownerId - 로그인한 사용자 ID
 * @returns 해당 사용자의 기관 목록
 */
export function loadInstitutionsDemo(ownerId: string): DemoInstitution[] {
  let institutions = getFromStorage<DemoInstitution[]>(STORAGE_KEYS.INSTITUTIONS, []);

  // 해당 사용자의 기관이 없으면 초기 데이터 생성
  const userInstitutions = institutions.filter((inst) => inst.ownerId === ownerId);
  if (userInstitutions.length === 0) {
    const initialInstitution = createInitialInstitution(ownerId);
    institutions = [...institutions, initialInstitution];
    saveToStorage(STORAGE_KEYS.INSTITUTIONS, institutions);

    // 초기 아이 데이터도 함께 생성
    const initialChildren = createInitialChildren(initialInstitution.id);
    const existingChildren = getFromStorage<DemoChild[]>(STORAGE_KEYS.CHILDREN, []);
    saveToStorage(STORAGE_KEYS.CHILDREN, [...existingChildren, ...initialChildren]);

    return [initialInstitution];
  }

  return userInstitutions;
}

/**
 * 기관 생성 (데모 모드)
 *
 * @param name - 기관 이름
 * @param ownerId - 소유자 ID
 * @returns 생성된 기관
 */
export function createInstitutionDemo(name: string, ownerId: string): DemoInstitution {
  const institutions = getFromStorage<DemoInstitution[]>(STORAGE_KEYS.INSTITUTIONS, []);

  const newInstitution: DemoInstitution = {
    id: generateId(),
    name,
    ownerId,
    teams: [],
    createdAt: new Date().toISOString(),
  };

  saveToStorage(STORAGE_KEYS.INSTITUTIONS, [...institutions, newInstitution]);
  return newInstitution;
}

/**
 * 기관 삭제 (데모 모드)
 *
 * @param institutionId - 삭제할 기관 ID
 * @returns 성공 여부
 */
export function deleteInstitutionDemo(institutionId: string): boolean {
  const institutions = getFromStorage<DemoInstitution[]>(STORAGE_KEYS.INSTITUTIONS, []);
  const filtered = institutions.filter((inst) => inst.id !== institutionId);
  saveToStorage(STORAGE_KEYS.INSTITUTIONS, filtered);

  // 해당 기관의 아이들도 삭제
  const children = getFromStorage<DemoChild[]>(STORAGE_KEYS.CHILDREN, []);
  const filteredChildren = children.filter((child) => child.institutionId !== institutionId);
  saveToStorage(STORAGE_KEYS.CHILDREN, filteredChildren);

  return true;
}

// ============================================================
// 팀 (Team) 관련 함수
// ============================================================

/**
 * 팀 목록 로드 (데모 모드)
 *
 * @param institutionId - 기관 ID
 * @returns 팀 이름 배열
 */
export function loadTeamsDemo(institutionId: string): string[] {
  const institutions = getFromStorage<DemoInstitution[]>(STORAGE_KEYS.INSTITUTIONS, []);
  const institution = institutions.find((inst) => inst.id === institutionId);
  return institution?.teams || [];
}

/**
 * 팀 목록 업데이트 (데모 모드)
 *
 * @param institutionId - 기관 ID
 * @param teams - 새 팀 목록
 * @returns 성공 여부
 */
export function updateTeamsDemo(institutionId: string, teams: string[]): boolean {
  const institutions = getFromStorage<DemoInstitution[]>(STORAGE_KEYS.INSTITUTIONS, []);
  const index = institutions.findIndex((inst) => inst.id === institutionId);

  if (index === -1) return false;

  institutions[index].teams = teams;
  saveToStorage(STORAGE_KEYS.INSTITUTIONS, institutions);
  return true;
}

// ============================================================
// 아동 (Child) 관련 함수
// ============================================================

/**
 * 아동 목록 로드 (데모 모드)
 *
 * @param institutionId - 기관 ID
 * @returns 해당 기관의 아동 목록
 */
export function loadChildrenDemo(institutionId: string): DemoChild[] {
  const children = getFromStorage<DemoChild[]>(STORAGE_KEYS.CHILDREN, []);
  return children.filter((child) => child.institutionId === institutionId);
}

/**
 * 모든 기관의 아동 목록 로드 (데모 모드, 랭킹용)
 *
 * @param institutionIds - 기관 ID 배열
 * @returns 모든 아동 목록
 */
export function loadAllChildrenDemo(institutionIds: string[]): DemoChild[] {
  const children = getFromStorage<DemoChild[]>(STORAGE_KEYS.CHILDREN, []);
  return children.filter((child) => institutionIds.includes(child.institutionId));
}

/**
 * 아동 등록 (데모 모드)
 *
 * @param institutionId - 기관 ID
 * @param payload - 아동 정보
 * @returns 등록된 아동
 */
export function createChildDemo(
  institutionId: string,
  payload: {
    qrId: string;
    name: string;
    age: string;
    team?: string;
    points?: number;
  }
): DemoChild {
  const children = getFromStorage<DemoChild[]>(STORAGE_KEYS.CHILDREN, []);

  // 중복 QR 체크
  const existing = children.find((c) => c.qrId === payload.qrId);
  if (existing) {
    throw new Error('이미 등록된 QR 코드입니다.');
  }

  const newChild: DemoChild = {
    qrId: payload.qrId,
    name: payload.name,
    age: payload.age,
    points: payload.points || 0,
    team: payload.team,
    institutionId,
    createdAt: new Date().toISOString(),
  };

  saveToStorage(STORAGE_KEYS.CHILDREN, [...children, newChild]);
  return newChild;
}

/**
 * 아동 삭제 (데모 모드)
 *
 * @param qrId - 삭제할 아동의 QR ID
 * @returns 성공 여부
 */
export function deleteChildDemo(qrId: string): boolean {
  const children = getFromStorage<DemoChild[]>(STORAGE_KEYS.CHILDREN, []);
  const filtered = children.filter((child) => child.qrId !== qrId);
  saveToStorage(STORAGE_KEYS.CHILDREN, filtered);
  return true;
}

/**
 * 아동 포인트 업데이트 (데모 모드)
 *
 * ⚠️ 데모 모드에서는 포인트가 localStorage에만 저장됩니다.
 * 실제 서버에는 반영되지 않습니다.
 *
 * @param qrId - 아동의 QR ID
 * @param pointsDelta - 추가할 포인트 (양수)
 * @returns 업데이트 결과
 */
export function updatePointsDemo(
  qrId: string,
  pointsDelta: number
): { success: boolean; newPoints?: number; error?: string } {
  const children = getFromStorage<DemoChild[]>(STORAGE_KEYS.CHILDREN, []);
  const index = children.findIndex((child) => child.qrId === qrId);

  if (index === -1) {
    return { success: false, error: '아동을 찾을 수 없습니다.' };
  }

  children[index].points += pointsDelta;
  saveToStorage(STORAGE_KEYS.CHILDREN, children);

  console.log('[demoData] 포인트 업데이트 (로컬):', {
    qrId,
    pointsDelta,
    newPoints: children[index].points,
  });

  return { success: true, newPoints: children[index].points };
}

/**
 * 아동 팀 업데이트 (데모 모드)
 *
 * @param qrId - 아동의 QR ID
 * @param team - 새 팀 이름
 * @returns 성공 여부
 */
export function updateChildTeamDemo(qrId: string, team: string): boolean {
  const children = getFromStorage<DemoChild[]>(STORAGE_KEYS.CHILDREN, []);
  const index = children.findIndex((child) => child.qrId === qrId);

  if (index === -1) return false;

  children[index].team = team;
  saveToStorage(STORAGE_KEYS.CHILDREN, children);
  return true;
}

// ============================================================
// 데이터 초기화 (개발용)
// ============================================================

/**
 * 모든 데모 데이터 초기화
 * 개발/테스트 용도로만 사용
 */
export function resetAllDemoData(): void {
  localStorage.removeItem(STORAGE_KEYS.INSTITUTIONS);
  localStorage.removeItem(STORAGE_KEYS.CHILDREN);
  console.log('[demoData] 모든 데모 데이터가 초기화되었습니다.');
}