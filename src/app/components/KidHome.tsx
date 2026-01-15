import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { IDCard } from './IDCard';
import { WebcamScreen } from './WebcamScreen';
import { Camera, LogOut } from 'lucide-react';
import logoImage from 'figma:asset/08495d2ac9d9702a3eba0824bb37379f02899583.png';

interface KidHomeProps {
  onLogout: () => void;
}

export function KidHome({ onLogout }: KidHomeProps) {
  const [generatedId, setGeneratedId] = useState<{name: string, character: string, color: string} | null>(null);
  const [view, setView] = useState<'card' | 'menu'>('card');
  const [showWebcam, setShowWebcam] = useState(false);

  useEffect(() => {
    generateNewId();
  }, []);

  const generateNewId = () => {
    const adj = ['씩씩한', '용감한', '똑똑한', '날쌘', '튼튼한', '신나는', '행복한', '부지런한', '착한', '귀여운'];
    const animals = ['호랑이', '사자', '토끼', '다람쥐', '강아지', '고양이', '곰돌이', '판다', '여우', '펭귄'];
    const chars = ['🐯', '🦁', '🐰', '🐿️', '🐶', '🐱', '🐻', '🐼', '🦊', '🐧'];
    const colors = [
      'bg-gradient-to-br from-red-400 to-orange-400',
      'bg-gradient-to-br from-yellow-400 to-amber-400',
      'bg-gradient-to-br from-green-400 to-emerald-400',
      'bg-gradient-to-br from-blue-400 to-cyan-400',
      'bg-gradient-to-br from-purple-400 to-pink-400',
    ];

    const randomAdj = adj[Math.floor(Math.random() * adj.length)];
    const animalIdx = Math.floor(Math.random() * animals.length);
    
    setGeneratedId({
      name: `${randomAdj} ${animals[animalIdx]}`,
      character: chars[animalIdx],
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  };

  if (showWebcam) {
    return <WebcamScreen onClose={() => setShowWebcam(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-6 flex flex-col items-center justify-center relative overflow-hidden">
       {/* Deco */}
       <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-200/20 to-transparent pointer-events-none" />
       
       {view === 'card' && generatedId && (
         <div className="w-full max-w-md space-y-8 animate-slide-up relative z-10">
           <div className="text-center space-y-2">
             <img src={logoImage} alt="logo" className="h-16 mx-auto mb-4" />
             <h1 className="text-3xl font-bold text-gray-800">나의 환경지킴이 카드</h1>
             <p className="text-gray-600">오늘 함께할 친구를 소개할게요!</p>
           </div>
           
           <IDCard 
             name={generatedId.name}
             character={generatedId.character}
             color={generatedId.color}
             onRegenerate={generateNewId}
           />

           <Button 
             onClick={() => setView('menu')}
             className="w-full text-xl h-16 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-xl transform transition-all hover:scale-105"
           >
             환경 지키러 가기! 🚀
           </Button>
         </div>
       )}

       {view === 'menu' && (
         <div className="w-full max-w-md space-y-6 animate-slide-up relative z-10">
            <div className="flex justify-between items-center mb-4">
              <Button onClick={() => setView('card')} variant="ghost">
                &larr; 내 카드 보기
              </Button>
              <Button onClick={onLogout} variant="ghost" className="text-red-500">
                <LogOut className="mr-2 size-4" />
                종료
              </Button>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800">무엇을 할까요?</h1>
              <p className="text-gray-600 mt-2">원하는 활동을 선택해주세요!</p>
            </div>

            <div className="grid gap-4">
              <button
                onClick={() => setShowWebcam(true)}
                className="group relative h-40 rounded-3xl overflow-hidden shadow-xl transition-transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400" />
                <div className="absolute inset-0 p-6 flex items-center justify-between">
                  <div className="text-left text-white">
                    <h2 className="text-2xl font-bold mb-1">AI 분리수거</h2>
                    <p className="opacity-90">카메라로 쓰레기를 찍어요</p>
                  </div>
                  <div className="bg-white/20 p-4 rounded-full backdrop-blur-md">
                    <Camera className="size-10 text-white" />
                  </div>
                </div>
              </button>
            </div>
         </div>
       )}
    </div>
  );
}
