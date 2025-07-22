import type { Express } from "express";
import { createServer, type Server } from "http";
// COMMENTED OUT: Database storage - uncomment to re-enable
// import { storage } from "./storage";
// import { insertMatchSchema } from "@shared/schema";
// import { z } from "zod";

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY || "";
const FOOTBALL_API_BASE = "https://api.football-data.org/v4";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get matches by week offset (0 = current week, -1 = previous week, etc.)
  app.get("/api/matches/week/:offset?", async (req, res) => {
    try {
      const offset = parseInt(req.params.offset || "0");
      
      // Calculate date range for the week
      const currentDate = new Date();
      const targetDate = new Date(currentDate.getTime() + (offset * 7 * 24 * 60 * 60 * 1000));
      const weekStart = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(targetDate.getTime());

      // COMMENTED OUT: Database caching - uncomment to re-enable
      // let storedMatches = await storage.getMatchesByDateRange(weekStart, weekEnd);
      // if (storedMatches.length === 0) {
      
      // Fetch directly from API (no caching)
        try {
          // For recent weeks, try to fetch from current season first
          let response;
          const dateFrom = weekStart.toISOString().split('T')[0];
          const dateTo = weekEnd.toISOString().split('T')[0];
          
          // First try with specific date range
          response = await fetch(`${FOOTBALL_API_BASE}/competitions/PL/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
            headers: {
              'X-Auth-Token': FOOTBALL_API_KEY
            }
          });

          if (!response.ok) {
            if (response.status === 429) {
              console.log(`Rate limited, returning empty for ${dateFrom} to ${dateTo}`);
              // Return rate limit notification
              res.json({
                matches: [],
                weekStart: weekStart.toISOString(),
                weekEnd: weekEnd.toISOString(),
                offset,
                rateLimited: true,
                message: "Rate limited - please wait 1 minute before navigating further"
              });
              return;
            }
            
            console.log(`Date range API failed: ${response.status} ${response.statusText}`);
            // Try fetching all recent matches if date range fails (but not if rate limited)
            response = await fetch(`${FOOTBALL_API_BASE}/competitions/PL/matches?status=FINISHED`, {
              headers: {
                'X-Auth-Token': FOOTBALL_API_KEY
              }
            });
          }

          if (response.ok) {
            const data = await response.json();
            console.log(`Fetched ${data.matches?.length || 0} matches for ${dateFrom} to ${dateTo}`);
            
            if (data.matches && data.matches.length > 0) {
              // Filter and transform matches for the requested week (no database storage)
              const weekMatches = data.matches
                .filter((match: any) => {
                  if (match.status !== "FINISHED" || !match.score?.fullTime) return false;
                  const matchDate = new Date(match.utcDate);
                  return matchDate >= weekStart && matchDate <= weekEnd;
                })
                .map((match: any, index: number) => ({
                  id: match.id || Date.now() + index, // Use external ID or generate unique ID
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
                  season: match.season?.startDate?.substring(0, 4) || "2024",
                  isGoalless: match.score.fullTime.home === 0 && match.score.fullTime.away === 0
                }));

              // COMMENTED OUT: Database storage - uncomment to re-enable
              // await storage.createMatch(matchData);
              
              // Return matches directly from API
              res.json({
                matches: weekMatches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()),
                weekStart: weekStart.toISOString(),
                weekEnd: weekEnd.toISOString(),
                offset
              });
              return;
            }
          } else {
            const errorText = await response.text();
            console.log(`API response not OK: ${response.status} ${response.statusText} - ${errorText}`);
          }
        } catch (apiError) {
          console.log('API fetch failed:', apiError);
        }

      // Return empty result if no matches found
      res.json({
        matches: [],
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        offset
      });
    } catch (error) {
      console.error('Error fetching week matches:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch matches",
        matches: [],
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        offset: 0
      });
    }
  });

  // Get current gameweek matches  
  app.get("/api/matches/current", async (req, res) => {
    try {
      // Fetch current Premier League matches from Football-Data API
      const response = await fetch(`${FOOTBALL_API_BASE}/competitions/PL/matches?status=FINISHED`, {
        headers: {
          'X-Auth-Token': FOOTBALL_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`Football API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Get current week's matches (last 7 days)
      const currentDate = new Date();
      const weekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const currentWeekMatches = data.matches
        .filter((match: any) => {
          const matchDate = new Date(match.utcDate);
          return matchDate >= weekAgo && matchDate <= currentDate && match.status === "FINISHED";
        })
        .map((match: any) => ({
          externalId: match.id,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          homeTeamCrest: match.homeTeam.crest,
          awayTeamCrest: match.awayTeam.crest,
          homeScore: match.score.fullTime.home,
          awayScore: match.score.fullTime.away,
          matchDate: new Date(match.utcDate),
          status: match.status,
          gameweek: match.matchday || 1,
          season: match.season.startDate.substring(0, 4),
          isGoalless: match.score.fullTime.home === 0 && match.score.fullTime.away === 0
        }));

      // Store matches in our storage
      for (const matchData of currentWeekMatches) {
        const existingMatch = await storage.getMatchByExternalId(matchData.externalId);
        if (!existingMatch) {
          await storage.createMatch(matchData);
        }
      }

      // Return matches from our storage
      const storedMatches = await storage.getAllMatches();
      const filteredMatches = storedMatches.filter(match => {
        const matchDate = new Date(match.matchDate);
        return matchDate >= weekAgo && matchDate <= currentDate && match.status === "FINISHED";
      });

      res.json(filteredMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch matches",
        matches: []
      });
    }
  });

  // Get matches by gameweek
  app.get("/api/matches/gameweek/:gameweek", async (req, res) => {
    try {
      const gameweek = parseInt(req.params.gameweek);
      const season = req.query.season as string || "2024";
      
      if (isNaN(gameweek)) {
        return res.status(400).json({ message: "Invalid gameweek number" });
      }

      const matches = await storage.getMatchesByGameweek(gameweek, season);
      res.json(matches);
    } catch (error) {
      console.error('Error fetching gameweek matches:', error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  // Refresh matches data
  app.post("/api/matches/refresh", async (req, res) => {
    try {
      // Fetch latest matches from API
      const response = await fetch(`${FOOTBALL_API_BASE}/competitions/PL/matches?status=FINISHED`, {
        headers: {
          'X-Auth-Token': FOOTBALL_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`Football API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Update our storage with latest data
      for (const match of data.matches) {
        if (match.status === "FINISHED") {
          const matchData = {
            externalId: match.id,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            homeTeamCrest: match.homeTeam.crest,
            awayTeamCrest: match.awayTeam.crest,
            homeScore: match.score.fullTime.home,
            awayScore: match.score.fullTime.away,
            matchDate: new Date(match.utcDate),
            status: match.status,
            gameweek: match.matchday || 1,
            season: match.season.startDate.substring(0, 4),
            isGoalless: match.score.fullTime.home === 0 && match.score.fullTime.away === 0
          };

          const existingMatch = await storage.getMatchByExternalId(match.id);
          if (existingMatch) {
            await storage.updateMatch(existingMatch.id, matchData);
          } else {
            await storage.createMatch(matchData);
          }
        }
      }

      res.json({ message: "Matches refreshed successfully" });
    } catch (error) {
      console.error('Error refreshing matches:', error);
      res.status(500).json({ message: "Failed to refresh matches" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
