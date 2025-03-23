import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// GitHub OAuth users
export const githubUsers = pgTable("github_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  accessToken: text("access_token").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGithubUserSchema = createInsertSchema(githubUsers).pick({
  id: true,
  username: true,
  accessToken: true,
});

// Repositories
export const repositories = pgTable("repositories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRepositorySchema = createInsertSchema(repositories).pick({
  name: true,
  fullName: true,
  url: true,
  description: true,
});

// Analysis Results
export const analysisResults = pgTable("analysis_results", {
  id: text("id").primaryKey(),
  repoUrl: text("repo_url").notNull(),
  repoName: text("repo_name").notNull(),
  model: text("model").notNull(),
  dimensions: text("dimensions").notNull(), // JSON stored as text
  languages: text("languages").default("[]").notNull(), // JSON stored as text
  frameworks: text("frameworks").default("[]").notNull(), // JSON stored as text
  hostingRecommendation: text("hosting_recommendation"), // JSON stored as text, optional
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analysisResults).pick({
  repoUrl: true,
  repoName: true,
  model: true,
  dimensions: true,
  languages: true,
  frameworks: true,
  hostingRecommendation: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGithubUser = z.infer<typeof insertGithubUserSchema>;
export type GithubUser = typeof githubUsers.$inferSelect;

export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositories.$inferSelect;

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type AnalysisResult = typeof analysisResults.$inferSelect;
