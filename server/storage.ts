import { users, matches, type User, type InsertUser, type Match, type InsertMatch } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Match methods
  getMatchesByGameweek(gameweek: number, season: string): Promise<Match[]>;
  getMatchesByDateRange(startDate: Date, endDate: Date): Promise<Match[]>;
  getMatchByExternalId(externalId: number): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: number, match: Partial<InsertMatch>): Promise<Match | undefined>;
  getAllMatches(): Promise<Match[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private matches: Map<number, Match>;
  private currentUserId: number;
  private currentMatchId: number;

  constructor() {
    this.users = new Map();
    this.matches = new Map();
    this.currentUserId = 1;
    this.currentMatchId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getMatchesByGameweek(gameweek: number, season: string): Promise<Match[]> {
    return Array.from(this.matches.values()).filter(
      match => match.gameweek === gameweek && match.season === season
    );
  }

  async getMatchesByDateRange(startDate: Date, endDate: Date): Promise<Match[]> {
    return Array.from(this.matches.values()).filter(match => {
      const matchDate = new Date(match.matchDate);
      return matchDate >= startDate && matchDate <= endDate;
    });
  }

  async getMatchByExternalId(externalId: number): Promise<Match | undefined> {
    return Array.from(this.matches.values()).find(
      match => match.externalId === externalId
    );
  }

  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    const id = this.currentMatchId++;
    const match: Match = { ...insertMatch, id };
    this.matches.set(id, match);
    return match;
  }

  async updateMatch(id: number, updates: Partial<InsertMatch>): Promise<Match | undefined> {
    const match = this.matches.get(id);
    if (!match) return undefined;
    
    const updatedMatch = { ...match, ...updates };
    this.matches.set(id, updatedMatch);
    return updatedMatch;
  }

  async getAllMatches(): Promise<Match[]> {
    return Array.from(this.matches.values());
  }
}

export const storage = new MemStorage();
