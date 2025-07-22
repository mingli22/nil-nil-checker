// This is a Vercel serverless function that serves as the API entry point
import express from 'express';

// Football API configuration
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || '';
const FOOTBALL_API_BASE = 'https://api.football-data.org/v4';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Routes
app.get('/api/matches/week/:offset?', async (req, res) => {
  try {
    const offset = parseInt(req.params.offset || '0');
    const currentDate = new Date();
    const targetDate = new Date(currentDate.getTime() + offset * 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(targetDate.getTime());

    let response;
    const dateFrom = weekStart.toISOString().split('T')[0];
    const dateTo = weekEnd.toISOString().split('T')[0];

    response = await fetch(`${FOOTBALL_API_BASE}/competitions/PL/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
      headers: {
        'X-Auth-Token': FOOTBALL_API_KEY
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        return res.json({
          matches: [],
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          offset,
          rateLimited: true,
          message: 'Rate limited - please wait 1 minute before navigating further'
        });
      }
      
      response = await fetch(`${FOOTBALL_API_BASE}/competitions/PL/matches?status=FINISHED`, {
        headers: {
          'X-Auth-Token': FOOTBALL_API_KEY
        }
      });
    }

    if (response.ok) {
      const data = await response.json();
      
      if (data.matches && data.matches.length > 0) {
        const weekMatches = data.matches
          .filter((match) => {
            if (match.status !== 'FINISHED' || !match.score?.fullTime) return false;
            const matchDate = new Date(match.utcDate);
            return matchDate >= weekStart && matchDate <= weekEnd;
          })
          .map((match, index) => ({
            id: match.id || Date.now() + index,
            externalId: match.id,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            homeTeamCrest: match.homeTeam.crest,
            awayTeamCrest: match.awayTeam.crest,
            homeScore: match.score.fullTime.home,
            awayScore: match.score.fullTime.away,
            matchDate: match.utcDate,
            status: match.status,
            gameweek: match.matchday || 1,
            season: match.season?.startDate?.substring(0, 4) || '2024',
            isGoalless: match.score.fullTime.home === 0 && match.score.fullTime.away === 0
          }));

        return res.json({
          matches: weekMatches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()),
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          offset
        });
      }
    }

    res.json({
      matches: [],
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      offset
    });
  } catch (error) {
    console.error('Error fetching week matches:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to fetch matches',
      matches: [],
      weekStart: new Date().toISOString(),
      weekEnd: new Date().toISOString(),
      offset: 0
    });
  }
});

export default app;