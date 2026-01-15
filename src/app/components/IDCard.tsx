import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Download, RefreshCw, QrCode } from 'lucide-react';
import QRCodeLib from 'qrcode';

interface IDCardProps {
  name: string;
  character: string;
  color: string;
  onRegenerate: () => void;
}

export function IDCard({ name, character, color, onRegenerate }: IDCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    generateQr();
  }, [name]);

  const generateQr = async () => {
    try {
      // QR code contains the generated name/ID for later scanning
      const url = await QRCodeLib.toDataURL(name, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(url);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadCard = () => {
    // Simple download logic - in a real app might use html2canvas
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `id-card-${name}.png`;
    link.click();
  };

  return (
    <Card className={`w-full max-w-sm mx-auto overflow-hidden border-4 shadow-2xl transform transition-all hover:scale-105 ${color} border-white`}>
      <CardHeader className="text-center bg-white/30 backdrop-blur-sm p-6">
        <CardTitle className="text-3xl font-bold text-gray-800 flex flex-col items-center gap-2">
          <span className="text-sm bg-white/50 px-3 py-1 rounded-full text-gray-600">
            환경지킴이 요원증
          </span>
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 text-center bg-white/40 backdrop-blur-md">
        <div className="text-9xl mb-6 drop-shadow-xl animate-bounce">
          {character}
        </div>
        
        {qrCodeUrl && (
          <div className="bg-white p-4 rounded-xl shadow-lg mx-auto w-48 h-48 flex items-center justify-center mb-6">
            <img src={qrCodeUrl} alt="QR Code" className="w-full h-full" />
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button 
            onClick={onRegenerate}
            variant="outline"
            className="bg-white/50 hover:bg-white/80 border-2 border-white"
          >
            <RefreshCw className="mr-2 size-4" />
            새로 만들기
          </Button>
          <Button 
            onClick={downloadCard}
            className="bg-white text-black hover:bg-gray-100 shadow-lg"
          >
            <Download className="mr-2 size-4" />
            저장하기
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
