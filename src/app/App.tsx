// @ts-nocheck
/* eslint-disable */

import { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { KidHome } from './components/KidHome';
import { auth } from '../utils/firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// App State Types
type AppView = 'auth' | 'kid-home' | 'dashboard';

export default function App() {
  const [view, setView] = useState<AppView>('auth');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Firebase Auth 상태 변경 시
      if (currentUser) {
        setUser(currentUser);
        setView('dashboard');
      } else {
        // 로그아웃 상태일 때
        setUser(null);
        // kid-home이 아닐 때만 auth로 이동
        if (view !== 'kid-home') {
          setView('auth');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout error (likely demo mode):", e);
    }
    setUser(null);
    setView('auth');
  };

  // 데모 모드/우회 로그인을 위한 핸들러
  const handleManualLogin = (mockUser: any) => {
    console.log("Manual Login (Demo Mode):", mockUser);
    setUser(mockUser);
    setView('dashboard');
  };

  return (
    <div className="w-screen h-screen overflow-hidden">
      {/* 1. 로그인 화면 (기본 진입) */}
      {view === 'auth' && (
        <LoginScreen onManualLogin={handleManualLogin} />
      )}

      {/* 2. 아이들 홈 (비로그인/게스트) */}
      {view === 'kid-home' && (
        <KidHome onLogout={() => setView('auth')} />
      )}

      {/* 3. 기관용 관리자 대시보드 (로그인 후) */}
      {view === 'dashboard' && user && (
        <AdminDashboard onLogout={handleLogout} user={user} />
      )}
    </div>
  );
}