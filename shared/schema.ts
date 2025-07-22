import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  externalId: integer("external_id").notNull().unique(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  homeTeamCrest: text("home_team_crest"),
  awayTeamCrest: text("away_team_crest"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  matchDate: timestamp("match_date").notNull(),
  status: text("status").notNull(), // "FINISHED", "SCHEDULED", "LIVE"
  gameweek: integer("gameweek").notNull(),
  season: text("season").notNull(),
  isGoalless: boolean("is_goalless").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;
