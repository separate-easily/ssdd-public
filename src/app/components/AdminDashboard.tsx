// @ts-nocheck
/* eslint-disable */

/**
 * ============================================================
 * 👨‍💼 기관 대시보드 (Admin Dashboard)
 * ============================================================
 * 
 * 파일 위치: /src/app/components/AdminDashboard.tsx
 * 
 * 주요 기능:
 * - 🎫 ID 카드 생성 및 다운로드 (동물 캐릭터 + QR)
 * - 🏫 반(Class) 생성 및 관리 (로그인한 기관별 분리)
 * - 👤 프로필 관리 (비밀번호 변경, 로그아웃)
 * - 👶 아동 등록 (QR 스캔 또는 수동 입력)
 * - 🎮 게임 진행
 * - ⭐ 포인트 관리
 * - 🏆 순위 확인 (반 내 순위 / 기관 전체 순위)
 * 
 * ============================================================
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LogOut, Users, Gamepad2, Trophy, Plus, Download, QrCode, Trash2, RefreshCw, X, Loader2, UserCircle, Lock, Key, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { GameScreen } from './GameScreen';
import { RankingScreen, RankingUser } from './RankingScreen';
import QRCodeLib from 'qrcode';
import { Html5Qrcode } from "html5-qrcode";
import logoImage from '../../assets/08495d2ac9d9702a3eba0824bb37379f02899583.png';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { auth } from '../../utils/firebase/config';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { projectId, publicAnonKey, SUPABASE_FUNCTIONS_BASE_URL } from '../../../utils/supabase/info';
import { ChildDetailModal } from '../../components/ChildDetailModal';
// DEMO_MODE 제거됨 - Supabase만 사용

// Custom Arrow Components for Slider
const NextArrow = ({ onClick, className, style }: any) => (
  <Button
    onClick={onClick}
    variant="outline"
    size="icon"
    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-full w-12 h-12 border-2 border-gray-200 bg-white/90 hover:bg-white shadow-lg hidden md:flex"
    style={{ ...style, display: onClick ? "flex" : "none" }}
  >
    <ChevronRight className="size-6 text-gray-700" />
  </Button>
);

const PrevArrow = ({ onClick, className, style }: any) => (
  <Button
    onClick={onClick}
    variant="outline"
    size="icon"
    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-full w-12 h-12 border-2 border-gray-200 bg-white/90 hover:bg-white shadow-lg hidden md:flex"
    style={{ ...style, display: onClick ? "flex" : "none" }}
  >
    <ChevronLeft className="size-6 text-gray-700" />
  </Button>
);

// --- ID Card Constants ---
type AnimalType = 'cute' | 'cool' | 'smart';

const ANIMALS: { emoji: string; name: string; type: AnimalType }[] = [
  { emoji: '🐶', name: '강아지', type: 'cute' },
  { emoji: '🐱', name: '고양이', type: 'cute' },
  { emoji: '🦁', name: '사자', type: 'cool' },
  { emoji: '🐯', name: '호랑이', type: 'cool' },
  { emoji: '🐰', name: '토끼', type: 'cute' },
  { emoji: '🐻', name: '곰', type: 'cool' },
  { emoji: '🐨', name: '코알라', type: 'cute' },
  { emoji: '🐼', name: '판다', type: 'cute' },
  { emoji: '🐸', name: '개구리', type: 'smart' },
  { emoji: '🐵', name: '원숭이', type: 'smart' },
  { emoji: '🐧', name: '펭귄', type: 'cute' },
  { emoji: '🐹', name: '햄스터', type: 'cute' },
  { emoji: '🐤', name: '병아리', type: 'cute' },
  { emoji: '🦊', name: '여우', type: 'smart' },
  { emoji: '🦒', name: '기린', type: 'smart' },
  { emoji: '🐘', name: '코끼리', type: 'cool' },
];

const ADJECTIVES_BY_TYPE: Record<AnimalType, string[]> = {
  cute: [
    '귀여운', '사랑스러운', '깜찍한', '보들보들', '동글동글', 
    '아장아장', '폭신한', '새침한', '엉뚱한', '다정한',
    '상냥한', '소중한', '반짝이는', '예쁜', '작은',
    '꼬마', '해피', '달콤한', '말랑한', '싱글벙글'
  ],
  cool: [
    '용감한', '씩씩한', '멋진', '튼튼한', '날쌘', 
    '힘센', '우직한', '대담한', '자유로운', '정의로운',
    '늠름한', '위대한', '강한', '빛나는', '거침없는',
    '당당한', '최고', '슈퍼', '열정적인', '힘찬'
  ],
  smart: [
    '똑똑한', '지혜로운', '재치있는', '호기심 많은', '유쾌한', 
    '신비한', '매력적인', '부지런한', '친절한', '활기찬',
    '명랑한', '센스있는', '기발한', '독창적인', '스마트',
    '차분한', '정직한', '성실한', '긍정적인', '개성있는'
  ]
};

const COLORS = [
  'bg-gradient-to-br from-pink-100 to-rose-200 border-pink-200',
  'bg-gradient-to-br from-orange-100 to-amber-200 border-orange-200',
  'bg-gradient-to-br from-yellow-100 to-lime-200 border-yellow-200',
  'bg-gradient-to-br from-green-100 to-emerald-200 border-green-200',
  'bg-gradient-to-br from-teal-100 to-cyan-200 border-teal-200',
  'bg-gradient-to-br from-sky-100 to-blue-200 border-sky-200',
  'bg-gradient-to-br from-indigo-100 to-violet-200 border-indigo-200',
  'bg-gradient-to-br from-purple-100 to-fuchsia-200 border-purple-200',
];

interface IdCardData {
  id: string;
  qrDataUrl: string;
  name: string; // 아이 실명
  animalName: string; // 동물 이름
  animalEmoji: string; // 동물 이모지
  affiliation: string; // 소속 (기관명)
  className: string; // 반 이름
  colorClass: string;
}

interface AdminDashboardProps {
  onLogout: () => void;
  user: any; // 로그인한 사용자 정보
}

interface Institution {
  id: string;
  name: string;
  ownerId?: string; 
}

interface Child {
  qrId: string;
  name: string;
  age: string;
  points: number;
  team?: string; // 팀 정보 추가
  className?: string; // 소속 반
}

export function AdminDashboard({ onLogout, user }: AdminDashboardProps) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [allChildren, setAllChildren] = useState<RankingUser[]>([]); // For Institution Ranking
  const [childrenLoadError, setChildrenLoadError] = useState<boolean>(false); // 서버 연결 실패 시 true
  
  // Team Management States
  const [teams, setTeams] = useState<string[]>([]);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all'); // 'all' or team name

  const [showInstitutionDialog, setShowInstitutionDialog] = useState(false);
  const [showChildDialog, setShowChildDialog] = useState(false);
  const [newInstitutionName, setNewInstitutionName] = useState('');
  
  // Child Registration States
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');
  const [newChildTeam, setNewChildTeam] = useState<string>(''); // 아동 등록 시 팀 선택
  const [scannedQrId, setScannedQrId] = useState('');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Profile & Password States
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // QR Generation States
  const [showQrGenerateDialog, setShowQrGenerateDialog] = useState(false);
  const [inputNames, setInputNames] = useState(''); // 이름 입력 (여러 줄)
  const [affiliationInput, setAffiliationInput] = useState(''); // 소속 입력
  const [classNameInput, setClassNameInput] = useState(''); // 반 입력
  const [generatedCards, setGeneratedCards] = useState<IdCardData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); 
  const cardsRef = useRef<HTMLDivElement>(null);
  
  // Institution Creation Loading State
  const [isCreatingInstitution, setIsCreatingInstitution] = useState(false);

  // Export Stage State (Single Card Rendering for Performance)
  const [exportTargetCardId, setExportTargetCardId] = useState<string | null>(null);

  // Child Detail Modal States
  const [selectedChildForDetail, setSelectedChildForDetail] = useState<Child | null>(null);
  const [showChildDetailModal, setShowChildDetailModal] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadInstitutions();
    }
  }, [user]);

  useEffect(() => {
    if (institutions.length > 0) {
      loadAllChildren();
    }
  }, [institutions]);

  useEffect(() => {
    if (selectedInstitution) {
      loadChildren(selectedInstitution.id);
      loadTeams(selectedInstitution.id);
    }
  }, [selectedInstitution]);

  const loadInstitutions = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_BASE_URL}/institution/list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ ownerId: user.uid }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setInstitutions(data.institutions);
      }
    } catch (error) {
      console.error('Failed to load institutions:', error);
    }
  };

  const loadTeams = async (institutionId: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_BASE_URL}/institution/teams/list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ institutionId }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setTeams(data.teams);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const addTeam = async () => {
    if (!newTeamName.trim() || !selectedInstitution) return;
    if (teams.includes(newTeamName.trim())) {
      alert('이미 존재하는 팀 이름입니다.');
      return;
    }

    const updatedTeams = [...teams, newTeamName.trim()];

    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_BASE_URL}/institution/teams/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Admin-Token': user.adminToken,
          },
          body: JSON.stringify({
            institutionId: selectedInstitution.id,
            teams: updatedTeams
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setTeams(updatedTeams);
        setNewTeamName('');
      }
    } catch (error) {
      console.error('Failed to add team:', error);
      alert('팀 추가 중 오류가 발생했습니다.');
    }
  };

  const deleteTeam = async (teamName: string) => {
    if (!selectedInstitution) return;
    if (!confirm(`'${teamName}' 팀을 삭제하시겠습니까?`)) return;

    const updatedTeams = teams.filter(t => t !== teamName);

    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_BASE_URL}/institution/teams/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Admin-Token': user.adminToken,
          },
          body: JSON.stringify({
            institutionId: selectedInstitution.id,
            teams: updatedTeams
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setTeams(updatedTeams);
        if (selectedTeamFilter === teamName) setSelectedTeamFilter('all');
      }
    } catch (error) {
      console.error('Failed to delete team:', error);
      alert('팀 삭제 중 오류가 발생했습니다.');
    }
  };

  const loadAllChildren = async () => {
    // Fetch children from all institutions (parallel)
    let collectedChildren: any[] = [];

    // 회원가입 시 입력한 기관명 사용 (user.displayName)
    const actualInstitutionName = user?.displayName || '기관';

    await Promise.all(institutions.map(async (inst) => {
      try {
        const response = await fetch(
          `${SUPABASE_FUNCTIONS_BASE_URL}/child/list/${inst.id}`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          }
        );
        const data = await response.json();
        if (data.success) {
          // Add institution name to child data (회원가입 시 입력한 기관명 사용)
          // inst.name = 반 이름 (돌고래반, 금붕어반 등)
          const kids = data.children.map((child: any) => ({
             ...child,
             institutionName: actualInstitutionName,
             className: inst.name  // 반 이름 저장 (inst.name이 실제 반 이름)
          }));
          collectedChildren = [...collectedChildren, ...kids];
        }
      } catch (error) {
        console.error(`Failed to load children for ${inst.name}`, error);
      }
    }));

    // Map to RankingUser format - 포인트가 있는 아이만 표시
    const rankingUsers: RankingUser[] = collectedChildren
      .filter(child => (child.points || 0) > 0) // 0점인 아이 제외
      .map(child => ({
        id: child.qrId,
        name: child.name,
        region: child.institutionName || '기관', // 기관 순위용: 기관명
        organization: child.className || '미지정', // 반 순위용: 반 이름 (inst.name에서 가져옴, 돌고래반 등)
        gamePoints: 0,
        webcamPoints: 0,
        totalPoints: child.points || 0
    }));

    // Remove duplicates (by ID) just in case
    const unique = Array.from(new Map(rankingUsers.map(u => [u.id, u])).values());
    setAllChildren(unique as RankingUser[]);
  };

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
        // 중복 제거 (qrId 기준)
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

  // ... (createInstitution, registerChild, handleChangePassword, etc. remain same)
  const createInstitution = async () => {
    if (!newInstitutionName.trim()) return;
    if (isCreatingInstitution) return;

    setIsCreatingInstitution(true);

    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_BASE_URL}/institution/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Admin-Token': user.adminToken,
          },
          body: JSON.stringify({
            name: newInstitutionName,
            ownerId: user.uid
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        await loadInstitutions();
        setNewInstitutionName('');
        setShowInstitutionDialog(false);
      }
    } catch (error) {
      console.error('Failed to create institution:', error);
    } finally {
      setIsCreatingInstitution(false);
    }
  };

  const registerChild = async () => {
    if (!scannedQrId || !newChildName.trim() || !newChildAge || !selectedInstitution) {
      alert('모든 정보를 입력해주세요.');
      return;
    }
    if (isRegistering) return;

    setIsRegistering(true);

    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_BASE_URL}/child/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Admin-Token': user.adminToken,
          },
          body: JSON.stringify({
            qrId: scannedQrId,
            name: newChildName,
            age: newChildAge,
            institutionId: selectedInstitution.id,
            team: newChildTeam || null, // 팀 정보 추가
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        await loadChildren(selectedInstitution.id);
        // Also reload all children for ranking
        loadAllChildren();

        setScannedQrId('');
        setNewChildName('');
        setNewChildAge('');
        setNewChildTeam(''); // Reset team
        setShowChildDialog(false);
      } else {
        alert(data.message || '아동 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to register child:', error);
      alert('아동 등록 중 오류가 발생했습니다.');
    } finally {
      setIsRegistering(false);
    }
  };

  const deleteChild = async (qrId: string, childName: string) => {
    if (!selectedInstitution) return;

    if (!confirm(`정말로 "${childName}" 아동을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_BASE_URL}/child/delete`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Admin-Token': user.adminToken,
          },
          body: JSON.stringify({
            qrId: qrId,
            institutionId: selectedInstitution.id,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        await loadChildren(selectedInstitution.id);
        loadAllChildren(); // Reload all children for ranking
        alert('아동이 삭제되었습니다.');
      } else {
        alert(data.message || '아동 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete child:', error);
      alert('아동 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('정말로 탈퇴하시겠습니까?\n모든 데이터가 삭제되며 복구할 수 없습니다.')) {
      return;
    }
    
    // 비밀번호 확인을 위한 프롬프트
    const password = prompt('탈퇴를 위해 비밀번호를 입력해주세요:');
    if (!password) return;

    try {
      if (auth.currentUser) {
        // 재인증
        const credential = EmailAuthProvider.credential(auth.currentUser.email!, password);
        await reauthenticateWithCredential(auth.currentUser, credential);
        
        // 삭제
        await deleteUser(auth.currentUser);
        
        alert('회원 탈퇴가 완료되었습니다.');
        if (onLogout) onLogout();
      } else {
        alert('로그인 정보가 유효하지 않습니다.');
      }
    } catch (error: any) {
      console.error('Account deletion error:', error);
      if (error.code === 'auth/wrong-password') {
        alert('비밀번호가 올바르지 않습니다.');
      } else {
        alert('회원 탈퇴 처리에 실패했습니다.\n' + error.message);
      }
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 6) {
      alert('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setIsChangingPassword(true);

    try {
      if (user.isFallback) {
        const response = await fetch(
          `${SUPABASE_FUNCTIONS_BASE_URL}/auth/update-password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ 
              email: user.email, 
              oldPassword: currentPassword, 
              newPassword: newPassword 
            }),
          }
        );
        const data = await response.json();
        if (data.success) {
          alert('비밀번호가 변경되었습니다.');
          closePasswordDialog();
        } else {
          alert(data.message || '비밀번호 변경 실패');
        }
      } else {
        const firebaseUser = auth.currentUser;
        if (firebaseUser && firebaseUser.email) {
          const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
          await reauthenticateWithCredential(firebaseUser, credential);
          await updatePassword(firebaseUser, newPassword);
          alert('비밀번호가 변경되었습니다.');
          closePasswordDialog();
        } else {
          alert('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
        }
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password') {
        alert('현재 비밀번호가 일치하지 않습니다.');
      } else if (error.code === 'auth/requires-recent-login') {
        alert('보안을 위해 다시 로그인한 후 시도해주세요.');
      } else {
        alert('비밀번호 변경 중 오류가 발생했습니다.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const closePasswordDialog = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordDialog(false);
  };

  // ... QR Generation (Existing Code) ...
  const startQrScan = async () => {
    setShowQrScanner(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText: string) => {
            setScannedQrId(decodedText);
            html5QrCode.stop();
            setShowQrScanner(false);
          },
          (errorMessage: any) => {
            console.log(errorMessage);
          }
        );
      } catch (err) {
        console.error("Failed to start QR scanner:", err);
        setShowQrScanner(false);
      }
    }, 100);
  };

  const generateUniqueId = () => {
    const timestamp = Date.now().toString(36).slice(-5);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `QR_${timestamp}${randomStr}`;
  };

  const generateIdCards = async () => {
    const names = inputNames.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 0);

    if (names.length === 0) {
      alert('아이들의 이름을 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    const cards: IdCardData[] = [];
    const count = names.length;
    
    // Track used colors for each animal to prevent duplicates
    const usedColorsByAnimal = new Map<string, Set<string>>();

    // 1. Create a balanced list of animals
    let animalPool: typeof ANIMALS = [];
    while (animalPool.length < count) {
      // Shuffle ANIMALS and append to pool
      const shuffled = [...ANIMALS].sort(() => Math.random() - 0.5);
      animalPool = [...animalPool, ...shuffled];
    }
    // Trim to exact count
    animalPool = animalPool.slice(0, count);

    // FIXED: Use current context strictly (No manual input)
    const affiliation = user.displayName || user.name || '소속 없음';
    const className = selectedInstitution?.name || '반 이름 없음';
    const registerPromises: Promise<any>[] = [];

    for (let i = 0; i < count; i++) {
      const qrId = generateUniqueId();
      try {
        const qrDataUrl = await QRCodeLib.toDataURL(qrId, {
          width: 300,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff00'
          },
          errorCorrectionLevel: 'H',
        });

        const animalObj = animalPool[i];
        
        // Select a color that hasn't been used for this animal yet
        if (!usedColorsByAnimal.has(animalObj.name)) {
          usedColorsByAnimal.set(animalObj.name, new Set());
        }
        
        const usedColors = usedColorsByAnimal.get(animalObj.name)!;
        let availableColors = COLORS.filter(c => !usedColors.has(c));
        
        // If all colors used (rare case), reset available colors
        if (availableColors.length === 0) {
          availableColors = COLORS;
        }
        
        const colorClass = availableColors[Math.floor(Math.random() * availableColors.length)];
        usedColors.add(colorClass);

        // Fix potential encoding issue with 'Elephant'
        const fixedAnimalName = animalObj.name.startsWith('코끼') ? '코끼리' : animalObj.name;

        cards.push({
          id: qrId,
          qrDataUrl,
          name: names[i],
          animalName: fixedAnimalName,
          animalEmoji: animalObj.emoji,
          affiliation: affiliation,
          className: className,
          colorClass
        });

        // 아동 자동 등록 (Auto Register)
        if (selectedInstitution) {
          const registerPromise = fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/child/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
                'X-Admin-Token': user.adminToken,
              },
              body: JSON.stringify({
                qrId: qrId,
                name: names[i],
                age: "정보없음", // 나이 정보 기본값
                institutionId: selectedInstitution.id,
              }),
            }).then(res => res.json())
              .then(data => {
                if (!data.success) console.error(`Failed to auto-register ${names[i]}:`, data.message);
                return data;
              })
              .catch(err => console.error(`Error registering ${names[i]}:`, err));

            registerPromises.push(registerPromise);
        }

      } catch (error) {
        console.error(`Failed to generate QR code for ${qrId}:`, error);
      }
    }
    
    // Wait for all registrations to complete (or fail)
    if (registerPromises.length > 0) {
      await Promise.all(registerPromises);
      if (selectedInstitution) {
        await loadChildren(selectedInstitution.id);
        loadAllChildren();
      }
    }
    
    setGeneratedCards(cards);
    setIsGenerating(false);
  };
  
  const addCard = async () => {
    // Single card add - asking for name via prompt for simplicity in this context
    const name = prompt("추가할 아이의 이름을 입력해주세요:");
    if (!name) return;

    setIsGenerating(true);
    try {
      const qrId = generateUniqueId();
      const qrDataUrl = await QRCodeLib.toDataURL(qrId, {
        width: 300,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff00' },
        errorCorrectionLevel: 'H',
      });

      // Pick random animal
      const animalObj = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      const colorClass = COLORS[Math.floor(Math.random() * COLORS.length)];

      // Fix potential encoding issue with 'Elephant'
      const fixedAnimalName = animalObj.name.startsWith('코끼') ? '코끼리' : animalObj.name;

      const newCard: IdCardData = {
        id: qrId,
        qrDataUrl,
        name: name,
        animalName: fixedAnimalName,
        animalEmoji: animalObj.emoji,
        affiliation: user.displayName || user.name || '소속 없음',
        className: selectedInstitution?.name || '반 이름 없음',
        colorClass
      };

      // 아동 자동 등록
      if (selectedInstitution) {
        try {
          const res = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/child/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
              'X-Admin-Token': user.adminToken,
            },
            body: JSON.stringify({
              qrId: qrId,
              name: name,
              age: "정보없음",
              institutionId: selectedInstitution.id,
            }),
          });
          const data = await res.json();
          if (data.success) {
            await loadChildren(selectedInstitution.id);
            loadAllChildren();
          } else {
            console.error('Failed to auto-register child:', data.message);
          }
        } catch (e) {
          console.error('Error auto-registering child:', e);
        }
      }

      setGeneratedCards(prev => [...prev, newCard]);
      
      // Scroll to bottom
      setTimeout(() => {
        if (cardsRef.current) {
          cardsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

    } catch (error) {
      console.error('Failed to add card:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const removeCard = (cardId: string) => {
    if (confirm('이 카드를 삭제하시겠습니까?')) {
      setGeneratedCards(prev => prev.filter(c => c.id !== cardId));
    }
  };

  const downloadCard = async (cardId: string) => {
    // 1. Set the target card to be rendered in the hidden stage
    setExportTargetCardId(cardId);
    
    // 2. Wait for React to render the card
    await new Promise(resolve => setTimeout(resolve, 100));

    const element = document.getElementById(`print-card-stage`);
    if (element) {
      try {
        const dataUrl = await toPng(element, { 
          cacheBust: false, 
          skipAutoScale: true,
          pixelRatio: 2,
          backgroundColor: 'white',
        });
        const link = document.createElement('a');
        link.download = `ID_CARD_${cardId}.png`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error('Failed to download card:', error);
        alert('다운로드 중 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        // Reset state
        setExportTargetCardId(null);
      }
    } else {
      alert('카드를 찾을 수 없습니다.');
      setExportTargetCardId(null);
    }
  };

  const downloadAllCards = async () => {
    if (!generatedCards.length) return;
    if (isDownloading) return;

    setIsDownloading(true);
    
    // Add a full-screen loading overlay to hide the flashing cards
    // NOTE: This overlay has z-index 100, so it covers everything including the "hidden" card stage (z-index 1)
    const loadingOverlay = document.createElement('div');
    loadingOverlay.style.position = 'fixed';
    loadingOverlay.style.top = '0';
    loadingOverlay.style.left = '0';
    loadingOverlay.style.width = '100vw';
    loadingOverlay.style.height = '100vh';
    loadingOverlay.style.backgroundColor = 'rgba(255, 255, 255, 1)'; // Fully opaque to hide the card stage behind it
    loadingOverlay.style.zIndex = '100'; 
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.flexDirection = 'column';
    loadingOverlay.style.alignItems = 'center';
    loadingOverlay.style.justifyContent = 'center';
    loadingOverlay.innerHTML = `
      <div class="text-4xl animate-spin mb-4">⏳</div>
      <h2 class="text-2xl font-bold text-gray-800">카드 포장 중...</h2>
      <p class="text-gray-500 mt-2">잠시만 기다려주세요</p>
    `;
    document.body.appendChild(loadingOverlay);

    const zip = new JSZip();
    const folder = zip.folder("ID_Cards");

    try {
      // Sequential processing to prevent browser freeze and timeouts
      for (let i = 0; i < generatedCards.length; i++) {
        const card = generatedCards[i];
        
        // 1. Mount the card to the stage
        setExportTargetCardId(card.id);
        
        // 2. Wait for render (give browser breathing room)
        // Shorter wait is usually enough if not waiting for external images
        await new Promise(resolve => setTimeout(resolve, 500));

        const element = document.getElementById(`print-card-stage`);
        
        if (element) {
          let attempts = 0;
          let success = false;
          
          while (attempts < 3 && !success) {
            attempts++;
            try {
              // 타임아웃 20초 (넉넉하게)
              // style: { opacity: '1' } is just a safeguard, the element is already opacity: 1
              const capturePromise = toPng(element, { 
                cacheBust: false, 
                skipAutoScale: true,
                pixelRatio: 2,
                backgroundColor: 'white',
                width: 320,
                height: 480,
                fontEmbedCSS: '', 
              });
              
              const timeoutPromise = new Promise<string>((_, reject) => 
                setTimeout(() => reject(new Error("Capture timeout")), 20000)
              );
  
              const dataUrl = await Promise.race([capturePromise, timeoutPromise]);
              const base64Data = dataUrl.split(',')[1];
              // Use real name for file name
              folder?.file(`${card.name.replace(/\s/g, '_')}_${card.id}.png`, base64Data, { base64: true });
              success = true;
            } catch (e) {
              console.error(`Failed to capture card ${card.id} (Attempt ${attempts})`, e);
              // Wait a bit before retry
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (!success) {
            console.error(`Ultimately failed to capture card ${card.id}`);
            // Fallback: Try to capture generic error placeholder or skip?
            // For now, we skip to avoid breaking the whole zip
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "ID_Cards_Pack.zip");
      
    } catch (error) {
      console.error("ZIP 생성 중 오류 발생:", error);
      alert("다운로드 중 오류가 발생했습니다.");
    } finally {
      if (document.body.contains(loadingOverlay)) {
        document.body.removeChild(loadingOverlay);
      }
      setIsDownloading(false);
      setExportTargetCardId(null);
    }
  };

  const deleteInstitution = async (institutionId: string, institutionName: string) => {
    if (!confirm(`"${institutionName}" 반을 정말 삭제하시겠습니까?\n\n이 반에 등록된 모든 아동 정보도 함께 삭제됩니다.`)) {
      return;
    }

    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_BASE_URL}/institution/delete/${institutionId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Admin-Token': user.adminToken,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        await loadInstitutions();
        alert('반이 성공적으로 삭제되었습니다.');
      } else {
        alert('반 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete institution:', error);
      alert('반 삭제 중 오류가 발생했습니다.');
    }
  };

  if (!selectedInstitution) {
    return (
      <div className="size-full bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-3 sm:p-4 md:p-6 overflow-auto">
        {/* 데모 모드 배너 */}

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-6 sm:mb-8 animate-slide-up">
            <div className="flex items-center gap-3 sm:gap-4">
              <img src={logoImage} alt="쏙쏙분리 똑똑분리" className="h-12 sm:h-14 md:h-16 w-auto" />
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
                  기관 대시보드
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">쏙쏙분리 똑똑분리 관리 시스템</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button 
                onClick={() => setShowProfileDialog(true)}
                variant="outline"
                size="sm"
                className="border-2 hover:bg-gray-50 h-9 sm:h-10 md:h-11 px-3 sm:px-4 md:px-6 flex items-center gap-2 text-sm"
              >
                <UserCircle className="size-4 sm:size-5" />
                <span className="hidden sm:inline">내 정보</span>
                <span className="sm:hidden">정보</span>
              </Button>
            </div>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm animate-scale-in">
            <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-2 rounded-lg">
                      <Users className="size-6 text-white" />
                    </div>
                    반 관리
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">등록된 반을 선택하거나 새 반을 추가하세요</p>
                </div>
                <Button 
                  onClick={() => setShowInstitutionDialog(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md h-11"
                  disabled={isCreatingInstitution}
                >
                  {isCreatingInstitution ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Plus className="mr-2 size-5" />}
                  반 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {institutions.map((inst, index) => (
                  <Card
                    key={inst.id}
                    className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-green-400 bg-gradient-to-br from-white to-green-50/30 animate-slide-up relative"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-6 relative overflow-hidden">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteInstitution(inst.id, inst.name);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>

                      <div 
                        className="cursor-pointer"
                        onClick={() => setSelectedInstitution(inst)}
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                          <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                            <Users className="size-8 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-2">{inst.name}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            클릭하여 관리하기
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {institutions.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                      <Users className="size-12 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg">등록된 반이 없습니다</p>
                    <p className="text-gray-400 text-sm mt-1">새 반을 추가해주세요</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dialogs... (Profile, Password, Institution Add) */}
          <Dialog open={showInstitutionDialog} onOpenChange={setShowInstitutionDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 반 추가</DialogTitle>
                <DialogDescription>새로운 반 이름을 입력하세요.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="반 이름 (예: 해바라기반)"
                  value={newInstitutionName}
                  onChange={(e) => setNewInstitutionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createInstitution();
                  }}
                />
                <Button onClick={createInstitution} className="w-full" disabled={isCreatingInstitution}>
                  {isCreatingInstitution ? <Loader2 className="animate-spin" /> : '추가하기'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <UserCircle className="size-6 text-green-600" />
                  프로필 관리
                </DialogTitle>
                <DialogDescription>
                  기관 계정 정보를 확인하고 관리합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">기관 이름</label>
                    <div className="font-medium text-gray-900 mt-1">{user.displayName || user.name || '알 수 없음'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">이메일</label>
                    <div className="font-medium text-gray-900 mt-1">{user.email}</div>
                  </div>
                </div>

                <Button 
                  onClick={() => setShowPasswordDialog(true)} 
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-gray-300 hover:bg-gray-50"
                >
                  <Lock className="size-4" />
                  비밀번호 변경
                </Button>
              </div>
              <div className="flex flex-col gap-3 border-t pt-4">
                 <Button 
                   variant="destructive" 
                   onClick={onLogout}
                   className="w-full"
                 >
                   <LogOut className="mr-2 size-4" />
                   로그아웃
                 </Button>
                 
                 <button
                   onClick={handleDeleteAccount}
                   className="text-xs text-gray-400 hover:text-red-500 hover:underline text-center w-full py-2 transition-colors"
                 >
                   회원 탈퇴하기
                 </button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="size-5 text-purple-600" />
                  비밀번호 변경
                </DialogTitle>
                <DialogDescription>
                  안전을 위해 주기적으로 비밀번호를 변경해주세요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">현재 비밀번호</label>
                  <Input 
                    type="password" 
                    placeholder="현재 비밀번호 입력" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">새 비밀번호</label>
                  <Input 
                    type="password" 
                    placeholder="새 비밀번호 (6자 이상)" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">새 비밀번호 확인</label>
                  <Input 
                    type="password" 
                    placeholder="새 비밀번호 다시 입력" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={closePasswordDialog} disabled={isChangingPassword}>
                  취소
                </Button>
                <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                  {isChangingPassword ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  변경하기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // 기관 선택 후 화면
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* 데모 모드 배너 */}

      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between z-30 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedInstitution(null)}
            className="text-gray-500 hover:text-gray-900 flex-shrink-0"
          >
            ← <span className="hidden sm:inline ml-1">목록으로</span>
          </Button>
          <div className="h-6 w-px bg-gray-200 hidden sm:block" />
          <h2 className="font-bold text-base md:text-lg text-gray-800 flex items-center gap-2 truncate">
            <div className="w-2 h-8 bg-green-500 rounded-full flex-shrink-0" />
            <span className="truncate">{selectedInstitution.name}</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <Button 
            onClick={() => setShowQrGenerateDialog(true)}
            size="sm"
            variant="outline"
            className="hidden sm:flex"
          >
            <QrCode className="mr-2 size-4" />
            ID 카드 발급
          </Button>
          <Button 
            onClick={() => setShowProfileDialog(true)}
            size="sm" 
            variant="ghost"
          >
             <UserCircle className="mr-2 size-4" />
             내 정보
          </Button>
        </div>
      </div>

      <Tabs defaultValue="home" className="h-[calc(100vh-64px)]">
        <TabsList className="w-full justify-start rounded-none border-b bg-gray-50 px-6 h-12">
          <TabsTrigger value="home" className="data-[state=active]:bg-white rounded-t-lg border-b-2 border-transparent data-[state=active]:border-green-600">
            <Users className="mr-2 size-4" />
            아동 관리 ({children.length})
          </TabsTrigger>
          <TabsTrigger value="game" className="data-[state=active]:bg-white rounded-t-lg border-b-2 border-transparent data-[state=active]:border-green-600">
            <Gamepad2 className="mr-2 size-4" />
            게임 진행
          </TabsTrigger>
          <TabsTrigger value="ranking" className="data-[state=active]:bg-white rounded-t-lg border-b-2 border-transparent data-[state=active]:border-green-600">
            <Trophy className="mr-2 size-4" />
            순위표
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="m-0 p-6 bg-gray-50/50 h-[calc(100%-48px)] overflow-auto">
          {/* ... Home Content ... */}
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                 <h3 className="text-xl font-bold mb-3">등록된 아이들</h3>
                 {/* Team Filter Tabs */}
                 <div className="flex flex-wrap gap-2 items-center">
                   <Button
                     variant={selectedTeamFilter === 'all' ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => setSelectedTeamFilter('all')}
                     className={selectedTeamFilter === 'all' ? 'bg-green-600' : 'bg-white'}
                   >
                     전체 보기
                   </Button>
                   {teams.map(team => (
                     <Button
                       key={team}
                       variant={selectedTeamFilter === team ? 'default' : 'outline'}
                       size="sm"
                       onClick={() => setSelectedTeamFilter(team)}
                       className={selectedTeamFilter === team ? 'bg-green-600' : 'bg-white'}
                     >
                       {team}
                     </Button>
                   ))}
                   <div className="h-6 w-px bg-gray-300 mx-1" />
                   <Button
                     variant="ghost"
                     size="sm"
                     className="text-gray-600 hover:text-green-700 hover:bg-green-50"
                     onClick={() => setShowTeamDialog(true)}
                   >
                     <Users className="size-4 mr-1" />
                     팀 관리
                   </Button>
                 </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <Button onClick={() => setShowQrScanner(true)} variant="outline" className="flex-1 md:flex-none">
                  <QrCode className="mr-2 size-4" />
                  QR 스캔
                </Button>
                <Button onClick={() => setShowChildDialog(true)} className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none">
                  <Plus className="mr-2 size-4" />
                  아동 등록
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {children
                .filter(child => selectedTeamFilter === 'all' || child.team === selectedTeamFilter)
                .map((child) => (
                <Card
                  key={child.qrId}
                  className="hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer"
                  onClick={() => {
                    setSelectedChildForDetail(child);
                    setShowChildDetailModal(true);
                  }}
                >
                  {/* Game Team Badge - 게임 팀만 표시 */}
                  {/* className(새 데이터) 또는 team에 "팀"이 포함된 경우(기존 데이터) */}
                  {(child.className || (child.team && child.team.includes('팀'))) && (
                     <div className="absolute top-0 right-0 bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-bl-lg font-bold z-10">
                       {child.className || child.team}
                     </div>
                  )}
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-2xl border border-green-100">
                        👶
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{child.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{child.age ? `${child.age}세` : '정보없음'} • {child.points}점</p>
                      </div>
                    </div>
                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
                        deleteChild(child.qrId, child.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              
              {children.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed">
                  {childrenLoadError ? (
                    <>
                      <div className="text-4xl mb-2">🔌</div>
                      <p className="text-gray-500 font-medium">서버 연결이 없어 children 목록은 비어 있습니다</p>
                      <p className="text-amber-500 text-sm mt-1">(데모 모드)</p>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-2">👶</div>
                      <p className="text-gray-500 font-medium">등록된 아동이 없습니다.</p>
                      <p className="text-gray-400 text-sm mt-1">우측 상단 버튼을 눌러 아이들을 등록해주세요.</p>
                    </>
                  )}
                </div>
              )}
              
              {children.length > 0 && children.filter(child => selectedTeamFilter === 'all' || child.team === selectedTeamFilter).length === 0 && (
                 <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed">
                   <div className="text-4xl mb-2">🔍</div>
                  <p className="text-gray-500 font-medium">'{selectedTeamFilter}' 팀에 소속된 아동이 없습니다.</p>
                 </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="game" className="m-0 h-[calc(100%-48px)] overflow-hidden">
           <GameScreen 
             institutionId={selectedInstitution.id} 
             institutionName={selectedInstitution.name}
             projectId={projectId}
             publicAnonKey={publicAnonKey}
           />
        </TabsContent>

        <TabsContent value="ranking" className="m-0 h-[calc(100%-48px)] overflow-hidden">
           {/* Modified Ranking Screen Logic */}
           <RankingScreen
             isAdmin={true} // Enable scope switching
             // 회원가입 시 입력한 기관명 사용
             currentOrganization={user?.displayName || selectedInstitution.name} 
             scopeLabels={{ 
               region: '기관(전체) 순위', 
               organization: '반(현재) 순위' 
             }}
             // 'region' scope mapped to Institution Data (All)
             regionData={allChildren}
             // 'organization' scope mapped to Class Data (Current) - 포인트가 있는 아이만 표시
             organizationData={children
               .filter(child => (child.points || 0) > 0) // 0점인 아이 제외
               .map(child => ({
                id: child.qrId,
                name: child.name,
                region: user?.displayName || '기관', // 기관 순위용: 기관명
                organization: selectedInstitution?.name || '미지정', // 반 순위용: 반 이름 (selectedInstitution.name이 반 이름)
                gamePoints: 0,
                webcamPoints: 0,
                totalPoints: child.points || 0
              }))}
           />
        </TabsContent>
      </Tabs>

      {/* Dialogs ... (Same as above, included in the return) */}
      <Dialog open={showChildDialog} onOpenChange={setShowChildDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 아동 등록</DialogTitle>
            <DialogDescription>
              QR 코드를 스캔하거나 직접 입력하여 아동을 등록해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">QR 코드 ID (고유번호)</label>
              <div className="flex gap-2">
                <Input 
                  value={scannedQrId} 
                  onChange={(e) => setScannedQrId(e.target.value)}
                  placeholder="ID 카드 스캔 또는 직접 입력"
                />
                <Button size="icon" onClick={startQrScan}>
                  <QrCode className="size-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">이름</label>
              <Input 
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                placeholder="아이 이름"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">나이</label>
              <Input
                type="number"
                value={newChildAge}
                onChange={(e) => setNewChildAge(e.target.value)}
                placeholder="나이 (숫자만 입력)"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">소속 팀 (선택)</label>
              <div className="flex flex-wrap gap-2">
                {teams.map(team => (
                  <button
                    key={team}
                    onClick={() => setNewChildTeam(team === newChildTeam ? '' : team)}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-all ${
                      newChildTeam === team
                        ? 'bg-green-100 text-green-700 border-green-200 ring-2 ring-green-500 ring-offset-1'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {team}
                  </button>
                ))}
                {teams.length === 0 && (
                  <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded w-full text-center">
                    등록된 팀이 없습니다.<br/>'팀 관리' 메뉴에서 팀을 추가해보세요.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2">
               <label className="text-sm font-medium mb-1 block text-gray-500">소속 기관 (반)</label>
               <div className="p-2 bg-gray-100 rounded text-gray-700 font-medium">
                 {user.displayName || user.name} - {selectedInstitution.name}
               </div>
            </div>
            <Button onClick={registerChild} className="w-full" disabled={isRegistering}>
              {isRegistering ? <Loader2 className="animate-spin" /> : '등록하기'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
       <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <UserCircle className="size-6 text-green-600" />
                  프로필 관리
                </DialogTitle>
                <DialogDescription>
                  기관 계정 정보를 확인하고 관리합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">기관 이름</label>
                    <div className="font-medium text-gray-900 mt-1">{user.displayName || user.name || '알 수 없음'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">이메일</label>
                    <div className="font-medium text-gray-900 mt-1">{user.email}</div>
                  </div>
                </div>

                <Button 
                  onClick={() => setShowPasswordDialog(true)} 
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-gray-300 hover:bg-gray-50"
                >
                  <Lock className="size-4" />
                  비밀번호 변경
                </Button>
              </div>
              <div className="flex flex-col gap-3 border-t pt-4">
                 <Button 
                   variant="destructive" 
                   onClick={onLogout}
                   className="w-full"
                 >
                   <LogOut className="mr-2 size-4" />
                   로그아웃
                 </Button>
                 
                 <button
                   onClick={handleDeleteAccount}
                   className="text-xs text-gray-400 hover:text-red-500 hover:underline text-center w-full py-2 transition-colors"
                 >
                   회원 탈퇴하기
                 </button>
              </div>
            </DialogContent>
          </Dialog>

       <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="size-5 text-purple-600" />
                  비밀번호 변경
                </DialogTitle>
                <DialogDescription>
                  안전을 위해 주기적으로 비밀번호를 변경해주세요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">현재 비밀번호</label>
                  <Input 
                    type="password" 
                    placeholder="현재 비밀번호 입력" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">새 비밀번호</label>
                  <Input 
                    type="password" 
                    placeholder="새 비밀번호 (6자 이상)" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">새 비밀번호 확인</label>
                  <Input 
                    type="password" 
                    placeholder="새 비밀번호 다시 입력" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={closePasswordDialog} disabled={isChangingPassword}>
                  취소
                </Button>
                <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                  {isChangingPassword ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  변경하기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      {/* Team Management Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>팀(조) 관리</DialogTitle>
            <DialogDescription>
              아이들을 구분할 팀을 추가하거나 삭제합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input 
                placeholder="새 팀 이름 (예: 토끼팀)" 
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTeam()}
              />
              <Button onClick={addTeam}>추가</Button>
            </div>
            
            <div className="border rounded-lg p-2 max-h-48 overflow-y-auto bg-gray-50">
                {teams.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">등록된 팀이 없습니다.</p>
                ) : (
                  <ul className="space-y-1">
                    {teams.map(team => (
                      <li key={team} className="flex justify-between items-center bg-white px-3 py-2 rounded border shadow-sm">
                        <span className="font-medium text-sm">{team}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-gray-400 hover:text-red-500"
                          onClick={() => deleteTeam(team)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Scanner Overlay */}
      {showQrScanner && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-4 rounded-xl w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">QR 코드 스캔</h3>
              <Button size="icon" variant="ghost" onClick={() => setShowQrScanner(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <div id="qr-reader" className="w-full overflow-hidden rounded-lg"></div>
            <p className="text-center text-sm text-gray-500 mt-4">카메라에 QR 코드를 비춰주세요</p>
          </div>
        </div>
      )}

      {/* ID 카드 생성 전체 화면 오버레이 (팝업 대체) */}
      {showQrGenerateDialog && (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* 공통 헤더 (뒤로가기 버튼) */}
              <div className="absolute top-6 left-6 z-50">
                <Button 
                  onClick={() => setShowQrGenerateDialog(false)}
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white shadow-sm rounded-xl h-12 px-4 gap-2 text-base font-bold text-gray-700"
                >
                  <ArrowLeft className="size-5" />
                  뒤로 가기
                </Button>
              </div>

              {generatedCards.length === 0 ? (
                 // 초기 생성 화면 (전체 화면 중앙 정렬)
                 <div className="flex-1 relative w-full h-full overflow-y-auto bg-slate-50/50">
                    <div className="min-h-full flex flex-col items-center justify-center p-4 py-12">
                      <div className="max-w-2xl w-full bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl text-center border border-gray-100 relative overflow-hidden my-auto">
                        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500" />
                        
                        <div className="mb-8 flex justify-center">
                          <div className="w-32 h-32 bg-purple-50 rounded-full flex items-center justify-center animate-bounce shadow-inner">
                            <span className="text-6xl">🎫</span>
                          </div>
                        </div>
                        <h3 className="text-4xl font-black mb-6 text-gray-800 tracking-tight">ID 카드 발급하기</h3>
                        <p className="text-gray-500 mb-8 text-xl leading-relaxed">
                          아이들의 이름을 입력하면 예쁜 동물 ID 카드가 만들어지고, 아동 목록에 자동 등록돼요!<br/>
                          <span className="text-base bg-gray-100 px-3 py-1.5 rounded-lg mt-3 inline-block font-medium">※ 이름은 한 줄에 한 명씩 입력해주세요</span>
                        </p>
                        
                        <div className="space-y-6 mb-10 text-left max-w-lg mx-auto">
                          {/* Affiliation & Class Info (Read Only) */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">소속 (기관명)</label>
                               <div className="text-lg font-bold text-gray-800 truncate">
                                 {user.displayName || user.name || "소속 없음"}
                               </div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                               <label className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1 block">반 이름</label>
                               <div className="text-lg font-bold text-gray-800 truncate">
                                 {selectedInstitution?.name || "반 선택 안됨"}
                               </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-bold text-gray-700 mb-2 block">아이들 이름 (엔터로 구분)</label>
                            <textarea
                              className="w-full h-48 p-4 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-50 transition-all text-lg resize-none shadow-sm"
                              placeholder={"김민준\n이서윤\n박지호\n최수아..."}
                              value={inputNames}
                              onChange={(e) => setInputNames(e.target.value)}
                            />
                            <p className="text-right text-sm text-gray-400 mt-2">
                              총 {inputNames.split(/[\n,]+/).filter(n => n.trim().length > 0).length}명
                            </p>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={generateIdCards} 
                          className="w-full h-20 text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all rounded-3xl"
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-4 size-8 animate-spin" />
                              카드 만드는 중...
                            </>
                          ) : 'ID 카드 생성 시작 ✨'}
                        </Button>
                      </div>
                    </div>
                 </div>
              ) : (
                // 생성 완료 화면 (좌우 분할 레이아웃 - 전체 화면)
                <div className="flex flex-col lg:flex-row w-full h-full bg-slate-50">
                    {/* Hidden Container for High Quality Export - Single Card Stage */}
                    {/* STRATEGY: Render FULLY OPAQUE (opacity: 1) but hide it behind a white screen. */}
                    {/* This ensures the browser definitely paints it (no optimization culling), avoiding timeouts. */}
                    <div style={{ position: "fixed", top: 0, left: 0, zIndex: 1, width: "320px", height: "480px", pointerEvents: "none" }}>
                      {exportTargetCardId && generatedCards.find(c => c.id === exportTargetCardId) && (
                         (() => {
                            const card = generatedCards.find(c => c.id === exportTargetCardId)!;
                            return (
                              <div 
                                key={card.id}
                                id="print-card-stage"
                                className={`w-[320px] h-[480px] relative bg-white overflow-hidden flex flex-col items-center shadow-lg border-4 border-white ${card.colorClass}`}
                              >
                                {/* Header Info */}
                                <div className="w-full pt-8 px-6 flex flex-col items-start z-10">
                                   <div className="bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm mb-2 border border-white/50">
                                      <span className="text-sm font-extrabold text-gray-600 tracking-tight">{card.affiliation}</span>
                                   </div>
                                   <div className="bg-white/40 backdrop-blur-sm px-3 py-1 rounded-lg">
                                     <span className="text-lg font-bold text-gray-800">{card.className}</span>
                                   </div>
                                </div>

                                {/* Main Avatar */}
                                <div className="flex-1 w-full flex flex-col items-center justify-center relative -mt-4">
                                  <div className="text-[140px] leading-none filter drop-shadow-2xl">
                                    {card.animalEmoji}
                                  </div>
                                </div>

                                {/* Bottom Info Card */}
                                <div className="w-full bg-white rounded-t-[3rem] p-8 pb-10 flex flex-col items-center shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.1)] relative z-20">
                                  {/* Name Label */}
                                  <div className="w-12 h-1 bg-gray-200 rounded-full mb-6 opacity-50" />
                                  
                                  <h2 className="text-4xl font-black text-gray-900 mb-8 tracking-tight leading-none text-center break-keep">
                                    {card.name}
                                  </h2>
                                  
                                  <div className="flex items-center gap-5 bg-gray-50 p-4 rounded-3xl border border-gray-100 w-full">
                                    <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm shrink-0">
                                      <img src={card.qrDataUrl} className="w-20 h-20 object-contain mix-blend-multiply" alt="QR" />
                                    </div>
                                    <div className="flex flex-col items-start overflow-hidden">
                                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Access Code</span>
                                      <span className="font-mono text-lg font-bold text-gray-600 truncate w-full">{card.id}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                         })()
                      )}
                    </div>
                    
                    {/* Hiding Curtain for the Export Stage */}
                    {/* This sits on top of the card stage (z-1) but below the modal (if any). */}
                    {/* It hides the flickering card generation from the user while keeping it visible to the browser. */}
                    {isDownloading && (
                      <div className="fixed inset-0 z-[10] bg-white" />
                    )}

                    {/* Left Sidebar - Fixed Info */}
                    <div className="w-full lg:w-[420px] bg-white border-r border-gray-200 flex flex-col shrink-0 relative z-20 shadow-xl lg:h-full">
                      {/* Mobile Header Spacer */}
                      <div className="h-20 lg:hidden" />

                      <div className="p-8 lg:p-12 flex-1 flex flex-col justify-center overflow-y-auto">
                        <div className="text-center lg:text-left space-y-8">
                          <div className="inline-flex p-5 bg-green-50 rounded-[2rem] mb-2 animate-bounce-slow ring-4 ring-green-100">
                            <span className="text-6xl">🎉</span>
                          </div>
                          
                          <div>
                            <h3 className="text-4xl font-black text-gray-900 leading-tight tracking-tight">
                              <span className="text-green-600 text-6xl block mb-3 font-black">{generatedCards.length}명</span>
                              발급 완료!
                            </h3>
                            <p className="text-gray-500 mt-6 text-xl leading-relaxed font-medium">
                              이제 <strong className="text-gray-900 bg-yellow-100 px-2 rounded mx-1">다운로드</strong>하여<br/>인쇄해주세요.<br/>
                              <span className="text-base text-gray-400 font-normal mt-2 block">QR코드를 스캔하면 아이들이 로그인할 수 있습니다.</span>
                            </p>
                          </div>

                          <div className="space-y-4 pt-8">
                            <Button 
                              onClick={downloadAllCards} 
                              className="w-full h-24 text-2xl font-bold bg-green-600 hover:bg-green-700 shadow-xl hover:shadow-green-200 hover:-translate-y-1 transition-all rounded-3xl flex items-center justify-center gap-4"
                              disabled={isDownloading}
                            >
                              {isDownloading ? (
                                <>
                                  <Loader2 className="size-8 animate-spin" />
                                  압축 중...
                                </>
                              ) : (
                                <>
                                  <div className="bg-green-700 p-3 rounded-2xl">
                                    <Download className="size-8 text-white" />
                                  </div>
                                  전체 다운로드 (ZIP)
                                </>
                              )}
                            </Button>

                            <div className="grid grid-cols-2 gap-4">
                              <Button 
                                onClick={addCard}
                                variant="outline"
                                className="h-16 text-lg font-bold text-blue-600 border-2 border-blue-100 bg-blue-50 hover:bg-blue-100 hover:border-blue-200 rounded-2xl"
                                disabled={isGenerating}
                              >
                                {isGenerating ? <Loader2 className="size-5 animate-spin" /> : <Plus className="mr-2 size-6" />}
                                1명 추가
                              </Button>
                              <Button 
                                onClick={() => {
                                  if(confirm('정말 모든 카드를 지우고 처음으로 돌아가시겠습니까?')) {
                                    setGeneratedCards([]);
                                  }
                                }} 
                                variant="outline"
                                className="h-16 text-lg font-medium text-gray-500 border-2 border-gray-100 hover:bg-gray-50 rounded-2xl"
                              >
                                <RefreshCw className="mr-2 size-5" />
                                초기화
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Content - Slider View */}
                    <div className="flex-1 bg-slate-100/50 relative h-full overflow-hidden flex flex-col justify-center">
                      {/* Top Gradient Shadow */}
                      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-100 to-transparent z-10 pointer-events-none" />
                      
                      <div className="w-full max-w-[1600px] mx-auto px-0 py-10" ref={cardsRef}>
                        <Slider 
                          dots={true}
                          infinite={false}
                          speed={500}
                          slidesToShow={3}
                          slidesToScroll={1}
                          centerMode={true}
                          centerPadding="60px"
                          nextArrow={<NextArrow />}
                          prevArrow={<PrevArrow />}
                          draggable={true}
                          swipeToSlide={true}
                          focusOnSelect={true}
                          className="center-mode-slider"
                          responsive={[
                            {
                              breakpoint: 1536,
                              settings: {
                                slidesToShow: 2,
                                centerPadding: "100px",
                              }
                            },
                            {
                              breakpoint: 1024,
                              settings: {
                                slidesToShow: 1,
                                centerPadding: "120px",
                              }
                            },
                            {
                              breakpoint: 640,
                              settings: {
                                slidesToShow: 1,
                                centerPadding: "40px",
                              }
                            }
                          ]}
                        >
                          {generatedCards.map((card, index) => (
                            <div key={card.id} className="px-6 py-10 outline-none">
                              <div className="group flex flex-col items-center perspective-1000">
                                <div className="relative transform transition-all duration-300 hover:-translate-y-4 hover:rotate-1 hover:scale-105">
                                  
                                  {/* Delete Button (Hover) */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeCard(card.id);
                                    }}
                                    className="absolute -right-5 -top-5 w-12 h-12 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 hover:scale-110 transition-all z-30 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 border-4 border-white cursor-pointer"
                                    title="이 카드 삭제"
                                  >
                                    <Trash2 className="size-6" />
                                  </button>

                                  <div 
                                    className={`relative w-[320px] h-[480px] bg-white rounded-[2.5rem] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] group-hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col items-center border-[8px] border-white select-none transition-all ${card.colorClass}`}
                                  >
                                    {/* Header Info */}
                                    <div className="w-full pt-8 px-6 flex flex-col items-start z-10">
                                       <div className="bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm mb-2 border border-white/50">
                                          <span className="text-sm font-extrabold text-gray-600 tracking-tight">{card.affiliation}</span>
                                       </div>
                                       <div className="bg-white/40 backdrop-blur-sm px-3 py-1 rounded-lg">
                                         <span className="text-lg font-bold text-gray-800">{card.className}</span>
                                       </div>
                                    </div>

                                    {/* Main Avatar */}
                                    <div className="flex-1 w-full flex flex-col items-center justify-center relative -mt-4">
                                      <div className="text-[140px] leading-none filter drop-shadow-2xl animate-bounce-subtle group-hover:scale-110 transition-transform duration-500">
                                        {card.animalEmoji}
                                      </div>
                                    </div>

                                    {/* Bottom Info Card */}
                                    <div className="w-full bg-white rounded-t-[3rem] p-8 pb-10 flex flex-col items-center shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.1)] relative z-20">
                                      {/* Name Label */}
                                      <div className="w-12 h-1 bg-gray-200 rounded-full mb-6 opacity-50" />
                                      
                                      <h2 className="text-4xl font-black text-gray-900 mb-8 tracking-tight leading-none text-center break-keep">
                                        {card.name}
                                      </h2>
                                      
                                      <div className="flex items-center gap-5 bg-gray-50 p-4 rounded-3xl border border-gray-100 w-full group/qr">
                                        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm shrink-0">
                                          <img src={card.qrDataUrl} className="w-20 h-20 object-contain mix-blend-multiply opacity-90 group-hover:opacity-100 transition-opacity" alt="QR" />
                                        </div>
                                        <div className="flex flex-col items-start overflow-hidden">
                                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Access Code</span>
                                          <span className="font-mono text-lg font-bold text-gray-600 truncate w-full group-hover:text-purple-600 transition-colors">{card.id}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Hover Download Button */}
                                  <button
                                    onClick={() => downloadCard(card.id)}
                                    className="absolute -right-5 -bottom-5 w-16 h-16 bg-gray-900 text-white rounded-3xl shadow-2xl flex items-center justify-center hover:bg-green-600 hover:scale-110 hover:rotate-6 transition-all z-20 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none border-4 border-white cursor-pointer"
                                    title="이 카드만 다운로드"
                                  >
                                    <Download className="size-7" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Add Card Placeholder Button Slide */}
                          <div className="px-6 py-10 outline-none flex justify-center items-center h-full">
                            <button 
                              onClick={addCard}
                              className="w-[320px] h-[480px] mx-auto rounded-[2.5rem] border-4 border-dashed border-gray-300 flex flex-col items-center justify-center gap-5 text-gray-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition-all group bg-white/50"
                            >
                              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors shadow-sm">
                                <Plus className="size-10" />
                              </div>
                              <span className="font-bold text-xl">1명 더 추가하기</span>
                            </button>
                          </div>
                        </Slider>
                      </div>
                    </div>
                </div>
              )}
        </div>
      )}

      {/* Child Detail Modal */}
      <ChildDetailModal
        open={showChildDetailModal}
        onOpenChange={setShowChildDetailModal}
        child={selectedChildForDetail}
        teams={teams}
        institutions={institutions} // 반 이동을 위해 전체 institutions 전달
        institutionId={selectedInstitution?.id || ''}
        publicAnonKey={publicAnonKey}
        adminToken={user.adminToken}
        onChildUpdated={() => {
          // 아동 정보가 수정되면 목록 새로고침 (반 이동 포함)
          if (selectedInstitution) {
            loadChildren(selectedInstitution.id);
          }
          loadAllChildren(); // 전체 순위도 새로고침
        }}
      />

    </div>
  );
}
