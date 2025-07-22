// Vercel API route for /api/matches/week/[offset]
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || '';
  const FOOTBALL_API_BASE = 'https://api.football-data.org/v4';

  const { offset } = req.query;
  const offsetNum = parseInt(offset || '0');
  
  try {
    const currentDate = new Date();
    const targetDate = new Date(currentDate.getTime() + offsetNum * 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(targetDate.getTime());

    const dateFrom = weekStart.toISOString().split('T')[0];
    const dateTo = weekEnd.toISOString().split('T')[0];

    console.log(`Fetching matches for ${dateFrom} to ${dateTo}`);

    const response = await fetch(`${FOOTBALL_API_BASE}/competitions/PL/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
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
          offset: offsetNum,
          rateLimited: true,
          message: 'Rate limited - please wait 1 minute before navigating further'
        });
      }
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.matches?.length || 0} matches for ${dateFrom} to ${dateTo}`);
    
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
        offset: offsetNum
      });
    }

    return res.json({
      matches: [],
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      offset: offsetNum
    });
  } catch (error) {
    console.error('Error fetching week matches:', error);
    return res.status(500).json({
      message: error.message || 'Failed to fetch matches',
      matches: [],
      weekStart: new Date().toISOString(),
      weekEnd: new Date().toISOString(),
      offset: offsetNum
    });
  }
}