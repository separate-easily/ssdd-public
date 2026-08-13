import { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Camera, X, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { CAMERA_FEATURE_ENABLED } from '../config';

interface WebcamScreenProps {
  onClose: () => void;
}

export function WebcamScreen({ onClose }: WebcamScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      if (!CAMERA_FEATURE_ENABLED) {
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };
    startCamera();

    return () => {
      // Cleanup stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      const items = ['플라스틱', '캔', '유리병', '종이', '일반쓰레기'];
      setResult(items[Math.floor(Math.random() * items.length)]);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative flex-1 bg-black overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 pointer-events-none p-8 flex flex-col items-center justify-center">
          <div className="w-64 h-64 border-2 border-white/50 relative rounded-2xl">
             <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 -mt-1 -ml-1 rounded-tl-lg"></div>
             <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 -mt-1 -mr-1 rounded-tr-lg"></div>
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 -mb-1 -ml-1 rounded-bl-lg"></div>
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 -mb-1 -mr-1 rounded-br-lg"></div>
          </div>
        </div>

        <Button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 p-0"
        >
          <X className="text-white" />
        </Button>
      </div>

      <div className="bg-black p-8 pb-12 flex flex-col items-center gap-6 rounded-t-3xl -mt-6 relative z-10">
        <div className="w-12 h-1 bg-gray-700 rounded-full absolute top-3" />
        
        {result ? (
          <Card className="w-full max-w-sm bg-white p-6 animate-slide-up text-center rounded-3xl">
            <div className="text-6xl mb-4 animate-bounce">
              {result === '플라스틱' ? '🥤' : 
               result === '캔' ? '🥫' : 
               result === '유리병' ? '🍶' : 
               result === '종이' ? '📰' : '🗑️'}
            </div>
            <h3 className="text-2xl font-bold mb-2">분석 결과: <span className="text-green-600">{result}</span></h3>
            <p className="text-gray-600 mb-6 text-lg">
              이 물건은 <strong className="text-black">{result}</strong>으로<br/>분리배출 해주세요!
            </p>
            <Button onClick={() => setResult(null)} size="lg" className="w-full text-lg h-14 bg-green-600 hover:bg-green-700 rounded-2xl">
              <RefreshCw className="mr-2 size-5" />
              다시 찍기
            </Button>
          </Card>
        ) : (
          <>
            <p className="text-white/80 text-center text-lg">
              {isAnalyzing ? 'AI가 쓰레기를 분석하고 있어요...' : '쓰레기를 네모 상자 안에 맞춰주세요'}
            </p>
            <Button 
              onClick={handleCapture}
              disabled={isAnalyzing}
              className="w-24 h-24 rounded-full bg-white hover:scale-105 transition-transform border-4 border-gray-200 p-0 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
              {isAnalyzing ? (
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="size-10 text-black" />
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
