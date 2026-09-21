import {
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const vibedeoUsersTable = pgTable("vibedeo_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  credits: integer("credits").notNull().default(20),
  plan: text("plan").notNull().default("creator"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const charactersTable = pgTable("vibedeo_characters", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => vibedeoUsersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sourceDescription: text("source_description"),
  lockedDescription: text("locked_description"),
  style: text("style").notNull(),
  referenceImageUrl: text("reference_image_url"),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const generationsTable = pgTable("vibedeo_generations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => vibedeoUsersTable.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  enhancedPrompt: text("enhanced_prompt"),
  finalPrompt: text("final_prompt").notNull(),
  type: text("type").notNull(),
  style: text("style").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  resolution: text("resolution").notNull(),
  creditsUsed: integer("credits_used").notNull(),
  status: text("status").notNull().default("processing"),
  progress: integer("progress").notNull().default(8),
  characterId: text("character_id").references(() => charactersTable.id, {
    onDelete: "set null",
  }),
  outputUrl: text("output_url"),
  thumbnailUrl: text("thumbnail_url"),
  errorMessage: text("error_message"),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type VibedeoUser = typeof vibedeoUsersTable.$inferSelect;
export type CharacterRecord = typeof charactersTable.$inferSelect;
export type GenerationRecord = typeof generationsTable.$inferSelect;