import { useState, useEffect } from "react";
import type { FootballMatch } from "@/lib/football-api";

interface MatchCardProps {
  match: FootballMatch;
  isChecked: boolean;
  onCheck: (matchId: number) => void;
}

export function MatchCard({ match, isChecked, onCheck }: MatchCardProps) {
  const [showResult, setShowResult] = useState(isChecked);
  
  // Update local state when isChecked prop changes
  useEffect(() => {
    setShowResult(isChecked);
  }, [isChecked]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: '2-digit',
      month: 'short'
    }).toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const getTeamAbbreviation = (teamName: string) => {
    const abbreviations: Record<string, string> = {
      "Manchester United": "MUN",
      "Manchester City": "MCI",
      "Liverpool": "LIV",
      "Chelsea": "CHE",
      "Arsenal": "ARS",
      "Tottenham Hotspur": "TOT",
      "Brighton & Hove Albion": "BHA",
      "Crystal Palace": "CRY",
      "Sheffield United": "SHU",
      "Newcastle United": "NEW",
      "West Ham United": "WHU",
      "Aston Villa": "AVL",
      "Wolverhampton Wanderers": "WOL",
      "Everton": "EVE",
      "Burnley": "BUR",
      "Brentford": "BRE",
      "Fulham": "FUL",
      "Luton Town": "LUT",
      "Nottingham Forest": "NFO",
      "Bournemouth": "BOU"
    };
    return abbreviations[teamName] || teamName.substring(0, 3).toUpperCase();
  };

  const handleCheckGoalless = () => {
    setShowResult(true);
    onCheck(match.id);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            {formatDate(match.matchDate)}
          </span>
          <span className="text-xs font-medium text-neutral-500">
            {formatTime(match.matchDate)}
          </span>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-white border border-neutral-200">
              {match.homeTeamCrest ? (
                <img 
                  src={match.homeTeamCrest} 
                  alt={`${match.homeTeam} badge`}
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    // Fallback to abbreviation if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling!.classList.remove('hidden');
                  }}
                />
              ) : null}
              <span className={`text-xs font-bold text-neutral-600 ${match.homeTeamCrest ? 'hidden' : ''}`}>
                {getTeamAbbreviation(match.homeTeam)}
              </span>
            </div>
            <span className="font-medium text-neutral-700 text-sm sm:text-base">
              {match.homeTeam}
            </span>
          </div>
          
          <div className="px-4 text-center">
            <div className="text-sm font-medium text-neutral-400">
              {showResult && match.isGoalless ? (
                <span className="text-2xl font-bold text-green-600">0 - 0</span>
              ) : (
                <>
                  <span className="text-2xl">?</span> - <span className="text-2xl">?</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3 flex-1 justify-end">
            <span className="font-medium text-neutral-700 text-sm sm:text-base text-right">
              {match.awayTeam}
            </span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-white border border-neutral-200">
              {match.awayTeamCrest ? (
                <img 
                  src={match.awayTeamCrest} 
                  alt={`${match.awayTeam} badge`}
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    // Fallback to abbreviation if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling!.classList.remove('hidden');
                  }}
                />
              ) : null}
              <span className={`text-xs font-bold text-neutral-600 ${match.awayTeamCrest ? 'hidden' : ''}`}>
                {getTeamAbbreviation(match.awayTeam)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-neutral-500">Finished</span>
          </div>
          
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
              showResult 
                ? 'bg-gray-400 text-white cursor-not-allowed opacity-50' 
                : 'bg-accent text-white hover:bg-orange-600'
            }`}
            onClick={handleCheckGoalless}
            disabled={showResult}
          >
            {showResult ? 'Checked' : 'Check if 0-0'}
          </button>
        </div>
        
        {showResult && (
          <div className={`mt-3 p-3 rounded-lg border-l-4 ${
            match.isGoalless 
              ? 'border-green-500 bg-green-50' 
              : 'border-blue-500 bg-blue-50'
          }`}>
            <p className={`text-sm font-medium ${
              match.isGoalless ? 'text-green-700' : 'text-blue-700'
            }`}>
              {match.isGoalless 
                ? 'This was a goalless draw! ⚽' 
                : 'This match had goals scored 🥅'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
