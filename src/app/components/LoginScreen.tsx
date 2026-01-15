// @ts-nocheck
/* eslint-disable */

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import logoImage from 'figma:asset/08495d2ac9d9702a3eba0824bb37379f02899583.png';
import { auth } from '../../utils/firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendPasswordResetEmail,
  deleteUser
} from 'firebase/auth';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

// Supabase Configuration
const SUPABASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-edd517d1`;

// Terms content
const PRIVACY_TERM = `개인정보 수집 및 이용 동의

본 서비스는 「개인정보 보호법」 등 관련 법령에 따라 이용자의 개인정보를 보호하며, 아래와 같은 목적과 범위 내에서 개인정보를 수집·이용합니다. 이용자는 본 동의를 거부할 권리가 있으나, 필수 항목에 대한 동의를 거부할 경우 서비스 이용이 제한될 수 있습니다.

1. 수집하는 개인정보 항목
• 필수항목: 기관명, 아이디(ID), 이메일, 비밀번호
• 선택항목: 아동 이름, 나이 등 서비스 이용 과정에서 이용자가 직접 입력하거나 생성하는 정보

2. 개인정보의 수집 및 이용 목적
• 회원 가입 및 본인 확인, 계정 관리
• 서비스 제공 및 운영(예: ID 카드 생성 및 관리)
• 고객 문의 응대, 공지사항 및 안내사항 전달
• 서비스 품질 개선 및 오류 대응

3. 개인정보의 보유 및 이용 기간
• 개인정보는 회원 탈퇴 시까지 보유·이용되며, 탈퇴 요청 시 관련 법령에 따라 지체 없이 파기합니다.
• 단, 관계 법령에 따라 일정 기간 보관이 필요한 경우 해당 법령을 따릅니다.

4. 동의의 효력
• 본 동의는 회원 가입 시 이용자가 명시적으로 동의함으로써 효력이 발생합니다.
• 이용자는 언제든지 개인정보 열람, 수정, 삭제 및 처리 정지를 요청할 수 있습니다.`;

const CAMERA_TERM = `카메라 접근 및 초상권 사용 동의

본 서비스는 특정 기능 제공을 위해 카메라 접근 권한 및 초상권 사용에 대한 동의를 요청합니다. 본 동의는 서비스 이용을 위한 필수 절차가 아닌 경우 선택적으로 제공될 수 있습니다.

1. 카메라 접근 권한
• 본 서비스는 ID 카드 생성을 위한 QR 코드 스캔 및 프로필 사진 촬영 기능 제공을 위해 카메라 접근 권한을 요청합니다.
• 카메라 접근 권한은 해당 기능 사용 시에만 활성화되며, 이용자는 기기 설정을 통해 언제든지 권한을 변경할 수 있습니다.

2. 초상권 사용 동의
• 촬영된 사진은 ID 카드 생성 및 서비스 내 표시 목적으로만 사용됩니다.
• 해당 이미지는 외부에 공개되거나 제3자에게 제공되지 않습니다.
• 생성된 ID 카드는 이용자의 선택에 따라 기기에 저장하거나 출력할 수 있습니다.

3. 동의 철회 및 책임 제한
• 이용자는 언제든지 카메라 접근 및 초상권 사용에 대한 동의를 철회할 수 있습니다.
• 동의 철회 시 해당 기능(ID 카드 생성 등)의 이용이 제한될 수 있습니다.
• 본 서비스는 이용자의 명시적 동의 범위를 초과하여 사진을 사용하지 않습니다.`;

interface LoginScreenProps {
  onManualLogin?: (user: any) => void;
}

export function LoginScreen({ onManualLogin }: LoginScreenProps) {
  const [loginId, setLoginId] = useState(''); // 이메일 대신 아이디 사용
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 회원가입 상태
  const [showSignup, setShowSignup] = useState(false);
  const [signupInstitutionName, setSignupInstitutionName] = useState('');
  const [signupId, setSignupId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  
  // 약관 동의 상태
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeCamera, setAgreeCamera] = useState(false);
  
  // 약관 상세 보기 상태
  const [showPrivacyTerm, setShowPrivacyTerm] = useState(false);
  const [showCameraTerm, setShowCameraTerm] = useState(false);
  
  // 비밀번호 찾기 상태
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Firebase 설정 확인
  const isFirebaseValid = auth.app.options.apiKey && auth.app.options.apiKey !== "YOUR_API_KEY";

  useEffect(() => {
    if (!isFirebaseValid) {
      console.log("Firebase API Key is missing. Fallback mode enabled.");
    }
  }, [isFirebaseValid]);

  const handleLogin = async () => {
    if (!loginId.trim() || !password.trim()) {
      alert('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. 아이디로 이메일 조회
      const response = await fetch(`${SUPABASE_URL}/auth/get-email-by-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ id: loginId }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          alert('존재하지 않는 아이디입니다.');
        } else {
          alert('로그인 시스템 오류가 발생했습니다. 관리자에게 문의하세요.');
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (!data.success) {
        alert(data.message || '존재하지 않는 아이디입니다.');
        setIsLoading(false);
        return;
      }

      const email = data.email;

      // 2. 로그인 시도 (Firebase 또는 Fallback)
      if (isFirebaseValid) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (firebaseError: any) {
          // Firebase 설정 문제나 기타 오류 시 Fallback 시도 여부 결정
          if (firebaseError.code === 'auth/api-key-not-valid' || firebaseError.message?.includes('api-key')) {
             await performFallbackLogin(email, password);
          } else {
            throw firebaseError;
          }
        }
      } else {
        // Firebase 키가 없으면 바로 Fallback 로그인
        await performFallbackLogin(email, password);
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/wrong-password') {
        alert('비밀번호가 일치하지 않습니다.');
      } else if (error.code === 'auth/user-not-found') {
        alert('존재하지 않는 계정입니다. (데이터 불일치)');
      } else {
        alert('로그인 중 오류가 발생했습니다.\n' + (error.message || ''));
      }
      setIsLoading(false);
    }
  };

  const performFallbackLogin = async (email: string, password: string) => {
    if (!onManualLogin) {
      throw new Error("데모 모드 진입 불가 (핸들러 없음)");
    }

    // Supabase KV에서 유저 정보 확인
    const kvAuthResponse = await fetch(`${SUPABASE_URL}/auth/login`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${publicAnonKey}`,
       },
       body: JSON.stringify({ email, password }),
    });
    
    const kvAuthData = await kvAuthResponse.json();
    
    if (kvAuthData.success) {
      // alert('백업 시스템으로 로그인합니다.'); // 너무 자주 뜨면 귀찮으므로 제거 또는 토스트로 변경 고려
      onManualLogin({
        uid: `fallback:${email}`, // Use email for consistent UID in fallback mode
        email: email,
        displayName: kvAuthData.user.name,
        isFallback: true
      });
    } else {
      throw new Error(kvAuthData.message || '로그인 실패 (백업 인증)');
    }
  };

  const handleSignup = async () => {
    if (!signupInstitutionName.trim() || !signupId.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (signupPassword.length < 6) {
      alert('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (!agreePrivacy || !agreeCamera) {
      alert('서비스 이용을 위해 모든 필수 약관에 동의해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. 아이디 중복 체크
      const checkResponse = await fetch(`${SUPABASE_URL}/auth/get-email-by-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ id: signupId }),
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.success) {
          alert('이미 사용 중인 아이디입니다.');
          setIsLoading(false);
          return;
        }
      }

      // 2. 회원가입 시도
      let isFallback = !isFirebaseValid;
      let userCredential = null;

      if (isFirebaseValid) {
        try {
          userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
        } catch (firebaseError: any) {
          if (firebaseError.code === 'auth/api-key-not-valid' || firebaseError.message?.includes('api-key')) {
            console.warn('Firebase API Key invalid during signup. Switching to fallback.');
            isFallback = true;
          } else {
            throw firebaseError;
          }
        }
      }

      // Fallback 모드이거나 Firebase 실패 시 Supabase KV에 저장
      if (isFallback) {
        const kvSignupResponse = await fetch(`${SUPABASE_URL}/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ 
            email: signupEmail, 
            password: signupPassword,
            name: signupInstitutionName 
          }),
        });
        
        const kvSignupData = await kvSignupResponse.json();
        if (!kvSignupData.success) {
          throw new Error(kvSignupData.message || '백업 회원가입 실패');
        }
      }

      // 3. Supabase에 ID <-> 이메일 매핑 저장
      const mapResponse = await fetch(`${SUPABASE_URL}/auth/map-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ id: signupId, email: signupEmail }),
      });

      if (!mapResponse.ok) {
        // 매핑 실패 시 롤백
        if (!isFallback && userCredential) {
          await deleteUser(userCredential.user);
        }
        alert('아이디 등록 실패: 서버 통신 오류');
        setIsLoading(false);
        return;
      }

      const mapData = await mapResponse.json();
      if (!mapData.success) {
        if (!isFallback && userCredential) {
          await deleteUser(userCredential.user);
        }
        alert('아이디 등록 실패: ' + mapData.message);
        setIsLoading(false);
        return;
      }

      // 4. 프로필 업데이트 (Firebase인 경우만)
      if (!isFallback && userCredential?.user) {
        await updateProfile(userCredential.user, {
          displayName: signupInstitutionName
        });
      }

      // 5. 로그인 처리
      if (isFallback && onManualLogin) {
        alert('회원가입 완료! (백업 모드)');
        onManualLogin({
          uid: `fallback:${signupEmail}`,
          email: signupEmail,
          displayName: signupInstitutionName,
          isFallback: true
        });
      } else {
        alert('기관 회원가입이 완료되었습니다!\n자동으로 로그인됩니다.');
      }
      
      setShowSignup(false);

    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('이미 등록된 이메일입니다.');
      } else if (error.code === 'auth/invalid-email') {
        alert('올바른 이메일 형식이 아닙니다.');
      } else if (error.code === 'auth/weak-password') {
        alert('비밀번호가 너무 약합니다. 6자 이상 입력해주세요.');
      } else {
        alert('회원가입 중 오류가 발생했습니다.\n' + (error.message || ''));
      }
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      alert('이메일을 입력해주세요.');
      return;
    }

    if (!isFirebaseValid) {
       alert('데모 모드에서는 비밀번호 찾기를 지원하지 않습니다.');
       return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      alert('비밀번호 재설정 링크가 이메일로 전송되었습니다.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error) {
      console.error('Password Reset error:', error);
      alert('비밀번호 재설정 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="size-full bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-green-200/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-56 sm:w-80 h-56 sm:h-80 bg-emerald-200/20 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[600px] h-96 sm:h-[600px] bg-teal-100/15 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm relative z-10 animate-scale-in">
        <CardHeader className="text-center pb-3 sm:pb-4 pt-4 sm:pt-6 px-4 sm:px-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img 
              src={logoImage} 
              alt="쏙쏙분리 똑똑분리 로고" 
              className="h-16 sm:h-20 md:h-24 w-auto animate-slide-up"
            />
          </div>
          <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent font-bold">
            기관 로그인
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-5 pb-5 sm:pb-6 px-4 sm:px-8">
          {/* 아이디/비밀번호 로그인 */}
          <div className="space-y-3">
            <div>
              <Input
                type="text"
                placeholder="기관 아이디"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="h-11 border-2 border-green-200 focus:border-green-500 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="h-11 border-2 border-green-200 focus:border-green-500 rounded-xl"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-green-600 hover:text-green-700 hover:underline"
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>
            </div>
            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">또는</span>
            </div>
          </div>

          {/* 회원가입 버튼 */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              기관 계정이 없으신가요?{' '}
              <button
                onClick={() => setShowSignup(true)}
                className="text-green-600 hover:text-green-700 font-medium hover:underline"
              >
                기관 회원가입
              </button>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 회원가입 다이얼로그 */}
      <Dialog open={showSignup} onOpenChange={setShowSignup}>
        <DialogContent className="bg-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
              기관 회원가입
            </DialogTitle>
            <DialogDescription>
              기관 정보를 입력하여 계정을 생성하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">기관 이름</label>
              <Input
                type="text"
                placeholder="기관 이름을 입력하세요 (예: 쏙쏙유치원)"
                value={signupInstitutionName}
                onChange={(e) => setSignupInstitutionName(e.target.value)}
                className="h-11 border-2 border-green-200 focus:border-green-500 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">아이디</label>
              <Input
                type="text"
                placeholder="사용할 아이디를 입력하세요"
                value={signupId}
                onChange={(e) => setSignupId(e.target.value)}
                className="h-11 border-2 border-green-200 focus:border-green-500 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">이메일</label>
              <Input
                type="email"
                placeholder="로그인에 사용할 이메일을 입력하세요"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="h-11 border-2 border-green-200 focus:border-green-500 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">비밀번호</label>
              <Input
                type="password"
                placeholder="비밀번호를 입력하세요 (최소 6자)"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="h-11 border-2 border-green-200 focus:border-green-500 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">비밀번호 확인</label>
              <Input
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSignup()}
                className="h-11 border-2 border-green-200 focus:border-green-500 rounded-xl"
              />
            </div>

            <div className="space-y-3 py-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="terms1" 
                  checked={agreePrivacy}
                  onCheckedChange={(checked) => setAgreePrivacy(checked as boolean)}
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="terms1" className="text-sm text-gray-600 font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                    [필수] 개인정보 수집 및 이용 동의
                  </Label>
                  <button 
                    onClick={() => setShowPrivacyTerm(true)}
                    className="text-xs text-gray-400 hover:text-green-600 underline text-left w-fit"
                  >
                    내용 보기
                  </button>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="terms2" 
                  checked={agreeCamera}
                  onCheckedChange={(checked) => setAgreeCamera(checked as boolean)}
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="terms2" className="text-sm text-gray-600 font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                    [필수] 카메라 접근 및 초상권 사용 동의
                  </Label>
                  <button 
                    onClick={() => setShowCameraTerm(true)}
                    className="text-xs text-gray-400 hover:text-green-600 underline text-left w-fit"
                  >
                    내용 보기
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setShowSignup(false)}
                variant="outline"
                className="flex-1 h-11"
              >
                취소
              </Button>
              <Button
                onClick={handleSignup}
                disabled={isLoading}
                className="flex-1 h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 비밀번호 찾기 다이얼로그 */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
              비밀번호 찾기
            </DialogTitle>
            <DialogDescription>
              가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">이메일</label>
              <Input
                type="email"
                placeholder="이메일을 입력하세요"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleForgotPassword()}
                className="h-11 border-2 border-green-200 focus:border-green-500 rounded-xl"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setShowForgotPassword(false)}
                variant="outline"
                className="flex-1 h-11"
              >
                취소
              </Button>
              <Button
                onClick={handleForgotPassword}
                className="flex-1 h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                전송
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 약관 상세 보기 다이얼로그 - 개인정보 */}
      <Dialog open={showPrivacyTerm} onOpenChange={setShowPrivacyTerm}>
        <DialogContent className="bg-white max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>개인정보 수집 및 이용 동의</DialogTitle>
            <DialogDescription>
              서비스 이용을 위해 수집하는 개인정보 항목과 목적을 안내합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm text-gray-600 bg-gray-50 p-4 rounded-lg leading-relaxed">
            {PRIVACY_TERM}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setShowPrivacyTerm(false)} className="bg-gray-900 text-white hover:bg-gray-800">
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 약관 상세 보기 다이얼로그 - 카메라 */}
      <Dialog open={showCameraTerm} onOpenChange={setShowCameraTerm}>
        <DialogContent className="bg-white max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>카메라 접근 및 초상권 사용 동의</DialogTitle>
            <DialogDescription>
              서비스 이용을 위한 카메라 접근 권한 및 초상권 사용 목적을 안내합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm text-gray-600 bg-gray-50 p-4 rounded-lg leading-relaxed">
            {CAMERA_TERM}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setShowCameraTerm(false)} className="bg-gray-900 text-white hover:bg-gray-800">
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}