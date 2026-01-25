import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trophy, MapPin, Building2, Calculator, Plus, Minus } from 'lucide-react';

export interface RankingUser {
  id: string | number;
  name: string;
  region?: string;
  organization?: string;
  gamePoints: number;
  webcamPoints: number;
  totalPoints: number;
}

interface RankingScreenProps {
  currentRegion?: string;
  currentOrganization?: string;
  isAdmin?: boolean;
  regionData?: RankingUser[];
  organizationData?: RankingUser[];
  onUpdatePoints?: (id: string | number, delta: number) => void;
  scopeLabels?: {
    region: string;
    organization: string;
  };
}

// Mock Data Generation (Fallback)
const generateMockData = (type: 'region' | 'organization'): RankingUser[] => {
  const regions = ['서울', '경기', '부산', '대구', '인천'];
  const orgs = ['평택대', '서울초', '경기중', '환경동아리', '녹색어머니회'];
  const names = ['김철수', '이영희', '박민수', '최지우', '정다은', '강호동', '유재석', '아이유', '장원영', '카리나'];

  return Array.from({ length: 50 }, (_, i) => {
    const total = Math.floor(Math.random() * 2000);
    return {
      id: i + 1,
      name: names[i % names.length] + (Math.floor(i / names.length) + 1),
      region: regions[Math.floor(Math.random() * regions.length)],
      organization: orgs[Math.floor(Math.random() * orgs.length)],
      gamePoints: 0,
      webcamPoints: 0,
      totalPoints: total,
    };
  });
};

export function RankingScreen({ 
  currentRegion = '경기', 
  currentOrganization = '평택대',
  isAdmin = false,
  regionData,
  organizationData,
  onUpdatePoints,
  scopeLabels = { region: '지역 랭킹', organization: '소속 랭킹' }
}: RankingScreenProps) {
  // Admin defaults to organization view (Class), User defaults to region view
  const [scope, setScope] = useState<'region' | 'organization'>(isAdmin ? 'organization' : 'region');
  const [displayData, setDisplayData] = useState<RankingUser[]>([]);

  // Load Data based on scope
  useEffect(() => {
    let data: RankingUser[] = [];
    
    if (scope === 'region') {
      data = regionData || generateMockData('region').filter(u => u.region === currentRegion);
    } else {
      data = organizationData || generateMockData('organization').filter(u => u.organization === currentOrganization);
    }

    // Sort by Total Points
    const sorted = [...data].sort((a, b) => b.totalPoints - a.totalPoints);

    setDisplayData(sorted);
  }, [scope, regionData, organizationData, currentRegion, currentOrganization]);

  const getScopeIcon = () => {
    if (scope === 'region') return <MapPin className="size-4" />;
    return <Building2 className="size-4" />;
  };

  return (
    <Card className="border-4 border-yellow-200 shadow-2xl rounded-3xl overflow-hidden h-full flex flex-col">
      <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white shrink-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Trophy className="size-6 animate-bounce" />
            {isAdmin ? '순위 관리' : (scope === 'region' ? scopeLabels.region : scopeLabels.organization)}
          </CardTitle>
          <div className="text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
             {scope === 'region' ? (isAdmin ? '전체 기관' : currentRegion) : currentOrganization}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 bg-gradient-to-b from-white to-orange-50 overflow-hidden">
        
        {/* Scope Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-4 shrink-0">
          <button
            onClick={() => setScope('region')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              scope === 'region' 
                ? 'bg-white text-orange-600 shadow-md' 
                : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            <MapPin className="size-4" />
            {scopeLabels.region}
          </button>
          <button
            onClick={() => setScope('organization')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              scope === 'organization' 
                ? 'bg-white text-orange-600 shadow-md' 
                : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Building2 className="size-4" />
            {scopeLabels.organization}
          </button>
        </div>

        {/* Ranking List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {displayData.length > 0 ? (
            // 모든 사용자가 0점인지 확인
            displayData.every(user => user.totalPoints === 0) ? (
              <div className="text-center py-10 text-gray-500">
                <div className="text-4xl mb-2">🌱</div>
                <p className="font-medium">아직 점수가 없어요!</p>
                <p className="text-sm mt-1">게임에 참여해서 포인트를 모아보세요</p>
              </div>
            ) : (
              displayData.map((user, index) => {
                // 0점인 사용자는 순위 번호 대신 '-' 표시
                const hasPoints = user.totalPoints > 0;
                const rankDisplay = hasPoints
                  ? (index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1)
                  : '-';

                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 rounded-2xl transition-all hover:scale-[1.02] ${
                      !hasPoints
                        ? 'bg-gray-50 border border-gray-100 opacity-60'
                        : index === 0
                        ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-400 shadow-md'
                        : index === 1
                        ? 'bg-gradient-to-r from-gray-100 to-slate-200 border-2 border-slate-300 shadow-md'
                        : index === 2
                        ? 'bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-300 shadow-md'
                        : 'bg-white border border-gray-100 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank Badge */}
                      <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg ${
                        !hasPoints ? 'bg-gray-100 text-gray-400' : index < 3 ? 'bg-white/80 shadow-sm' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {rankDisplay}
                      </div>

                      {/* User Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{user.name}</span>
                          {hasPoints && index < 3 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">TOP {index + 1}</span>}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          {getScopeIcon()}
                          {scope === 'region' ? (user.region || '지역') : (user.organization || '기관')}
                        </div>
                      </div>
                    </div>

                    {/* Score & Admin Controls */}
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className={`flex items-center justify-end gap-1 font-bold text-lg ${hasPoints ? 'text-gray-800' : 'text-gray-400'}`}>
                          <Calculator className={`size-4 ${hasPoints ? 'text-orange-500' : 'text-gray-400'}`} />
                          {hasPoints ? user.totalPoints.toLocaleString() : '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {hasPoints ? '총점' : '점수 없음'}
                        </div>
                      </div>

                      {/* Admin Point Controls */}
                      {isAdmin && onUpdatePoints && (
                        <div className="flex flex-col gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-6 h-6"
                            onClick={() => onUpdatePoints(user.id, 10)}
                          >
                            <Plus className="size-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-6 h-6"
                            onClick={() => onUpdatePoints(user.id, -10)}
                          >
                            <Minus className="size-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            <div className="text-center py-10 text-gray-500">
              <div className="text-4xl mb-2">🍃</div>
              <p>해당 순위 데이터가 없습니다.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
