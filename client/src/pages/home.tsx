import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings, RefreshCw } from "lucide-react";
import { footballApi, type FootballMatch } from "@/lib/football-api";
import { MatchCard } from "@/components/match-card";
import { WeekSelector } from "@/components/week-selector";
import { LoadingOverlay } from "@/components/loading-overlay";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [checkedMatches, setCheckedMatches] = useState<number[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const { toast } = useToast();

  // Load checked matches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('checkedMatches');
    if (stored) {
      try {
        setCheckedMatches(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading checked matches:', error);
      }
    }
  }, []);

  // Save checked matches to localStorage
  const saveCheckedMatches = (matches: number[]) => {
    setCheckedMatches(matches);
    localStorage.setItem('checkedMatches', JSON.stringify(matches));
  };

  // Check localStorage cache first
  const getCachedMatches = (offset: number) => {
    const cacheKey = `matches_week_${offset}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      // Cache for 24 hours
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return data.matches;
      }
    }
    return null;
  };

  const setCachedMatches = (offset: number, matchesData: any) => {
    const cacheKey = `matches_week_${offset}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      matches: matchesData,
      timestamp: Date.now()
    }));
  };

  // Query for week matches with localStorage cache
  const { data: matchesData, isLoading, error } = useQuery({
    queryKey: ['/api/matches/week', weekOffset],
    queryFn: async () => {
      // Check cache first
      const cached = getCachedMatches(weekOffset);
      if (cached) {
        console.log(`Using cached data for week ${weekOffset}`);
        return cached;
      }
      
      // If not cached, fetch from API
      console.log(`Fetching fresh data for week ${weekOffset}`);
      const result = await footballApi.getWeekMatches(weekOffset);
      
      // Cache successful responses (not rate limited ones)
      if (result && !result.rateLimited && result.matches.length > 0) {
        setCachedMatches(weekOffset, result);
      }
      
      return result;
    },
    staleTime: 24 * 60 * 60 * 1000, // Consider data fresh for 24 hours
    cacheTime: 24 * 60 * 60 * 1000, // Keep in memory for 24 hours
  });

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: footballApi.refreshMatches,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/matches/week'] });
      toast({
        title: "Matches updated",
        description: "Latest match data has been loaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update matches",
        variant: "destructive",
      });
    },
  });

  const matches = matchesData?.matches || [];

  const handleCheckMatch = (matchId: number) => {
    if (!checkedMatches.includes(matchId)) {
      const updated = [...checkedMatches, matchId];
      saveCheckedMatches(updated);
    }
  };

  const handleCheckAllForGoalless = () => {
    const allMatchIds = matches.map(match => match.id);
    const newChecked = Array.from(new Set([...checkedMatches, ...allMatchIds]));
    saveCheckedMatches(newChecked);
  };

  const handleResetAll = () => {
    setCheckedMatches([]);
    localStorage.removeItem('checkedMatches');
  };

  const getWeekInfo = () => {
    if (!matchesData) {
      const currentDate = new Date();
      const weekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        title: "Current Week",
        dateRange: `${weekAgo.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
      };
    }

    const startDate = new Date(matchesData.weekStart);
    const endDate = new Date(matchesData.weekEnd);
    
    let title = "Current Week";
    if (weekOffset < 0) {
      title = `${Math.abs(weekOffset)} Week${Math.abs(weekOffset) > 1 ? 's' : ''} Ago`;
    } else if (weekOffset > 0) {
      title = `${weekOffset} Week${weekOffset > 1 ? 's' : ''} Ahead`;
    }
    
    return {
      title,
      dateRange: `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
    };
  };

  const weekInfo = getWeekInfo();

  const handlePreviousWeek = () => {
    setWeekOffset(prev => prev - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  const handleCurrentWeek = () => {
    setWeekOffset(0);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* Header */}
        <header className="bg-primary text-white shadow-lg sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">PL</span>
                </div>
                <h1 className="text-xl font-bold">Spoiler-Free Scores</h1>
              </div>
              <button className="p-2 rounded-full hover:bg-primary-light transition-colors">
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Error State */}
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-700 mb-2">Failed to load matches</h3>
            <p className="text-neutral-500 mb-4">
              {error instanceof Error ? error.message : "Unable to fetch Premier League data"}
            </p>
            <button 
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-light transition-colors"
            >
              {refreshMutation.isPending ? 'Retrying...' : 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 font-sans">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-primary font-bold text-sm">PL</span>
              </div>
              <h1 className="text-xl font-bold">Spoiler-Free Scores</h1>
            </div>
            <button className="p-2 rounded-full hover:bg-primary-light transition-colors">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Week Selector */}
      <WeekSelector
        currentWeek={weekInfo.title}
        dateRange={weekInfo.dateRange}
        onPrevious={handlePreviousWeek}
        onNext={handleNextWeek}
        onCurrentWeek={handleCurrentWeek}
        isCurrentWeek={weekOffset === 0}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Quick Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              className="flex-1 bg-primary text-white py-3 px-4 rounded-lg font-medium text-sm hover:bg-primary-light transition-colors"
              onClick={handleCheckAllForGoalless}
            >
              Check All for 0-0
            </button>
            <button 
              className="flex-1 bg-neutral-200 text-neutral-700 py-3 px-4 rounded-lg font-medium text-sm hover:bg-neutral-300 transition-colors"
              onClick={handleResetAll}
            >
              Reset All
            </button>
          </div>
        </div>

        {/* Matches Container */}
        {matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                isChecked={checkedMatches.includes(match.id)}
                onCheck={handleCheckMatch}
              />
            ))}
          </div>
        ) : !isLoading ? (
          <div className="text-center py-12">
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              matchesData?.rateLimited 
                ? 'bg-orange-100' 
                : 'bg-neutral-200'
            }`}>
              {matchesData?.rateLimited ? (
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              ) : (
                <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              )}
            </div>
            <h3 className={`text-lg font-medium mb-2 ${
              matchesData?.rateLimited 
                ? 'text-orange-700' 
                : 'text-neutral-700'
            }`}>
              {matchesData?.rateLimited ? 'Rate Limited' : 'No matches this week'}
            </h3>
            <p className={`${
              matchesData?.rateLimited 
                ? 'text-orange-600' 
                : 'text-neutral-500'
            }`}>
              {matchesData?.message || "No Premier League matches found for this week"}
            </p>
          </div>
        ) : null}
      </main>

      {/* Refresh Button */}
      <div className="fixed bottom-4 right-4 z-20">
        <button 
          className="bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary-light transition-colors disabled:opacity-50"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          <RefreshCw className={`w-6 h-6 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading Overlay */}
      <LoadingOverlay 
        isVisible={isLoading} 
        message="Loading matches..."
      />
    </div>
  );
}
