export interface FootballMatch {
  id: number;
  externalId: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamCrest?: string;
  awayTeamCrest?: string;
  homeScore: number | null;
  awayScore: number | null;
  matchDate: string;
  status: string;
  gameweek: number;
  season: string;
  isGoalless: boolean;
}

export interface MatchesResponse {
  matches: FootballMatch[];
  message?: string;
}

export interface WeekMatchesResponse {
  matches: FootballMatch[];
  weekStart: string;
  weekEnd: string;
  offset: number;
  message?: string;
}

export const footballApi = {
  getCurrentMatches: async (): Promise<MatchesResponse> => {
    const response = await fetch('/api/matches/current');
    return response.json();
  },

  getWeekMatches: async (offset: number = 0): Promise<WeekMatchesResponse> => {
    const response = await fetch(`/api/matches/week/${offset}`);
    return response.json();
  },

  getGameweekMatches: async (gameweek: number, season: string = "2024"): Promise<FootballMatch[]> => {
    const response = await fetch(`/api/matches/gameweek/${gameweek}?season=${season}`);
    return response.json();
  },

  refreshMatches: async (): Promise<{ message: string }> => {
    const response = await fetch('/api/matches/refresh', {
      method: 'POST',
    });
    return response.json();
  },
};
