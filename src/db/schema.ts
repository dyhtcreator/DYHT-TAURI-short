import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Transcripts table for storing audio transcriptions
export const transcripts = sqliteTable("transcripts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull().default(sql`CURRENT_TIMESTAMP`),
  filePath: text("file_path"), // Optional - for file-based transcriptions
  duration: integer("duration"), // Optional - duration in milliseconds
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Settings table for storing user preferences and trigger configurations
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Audio triggers table for storing configured sound triggers
export const audioTriggers = sqliteTable("audio_triggers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  triggerType: text("trigger_type").notNull(), // 'sound' or 'vocal'
  triggerValue: text("trigger_value").notNull(), // sound type or phrase
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type AudioTrigger = typeof audioTriggers.$inferSelect;
export type NewAudioTrigger = typeof audioTriggers.$inferInsert;