import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const charactersTable = pgTable("characters", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  discordUsername: text("discord_username").notNull(),
  oocName: text("ooc_name").notNull(),
  oocAge: integer("ooc_age").notNull(),
  icName: text("ic_name"),
  icAge: integer("ic_age"),
  bloodStatus: text("blood_status").notNull().default("melez"),
  gender: text("gender").notNull().default("büyücü"),
  house: text("house"),
  classYear: integer("class_year").notNull().default(1),
  walletGalleons: integer("wallet_galleons").notNull().default(0),
  bankGalleons: integer("bank_galleons").notNull().default(0),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  skillPoints: integer("skill_points").notNull().default(0),
  wandWood: text("wand_wood"),
  wandCore: text("wand_core"),
  wandLength: text("wand_length"),
  wandFlexibility: text("wand_flexibility"),
  wandDurability: integer("wand_durability").notNull().default(100),
  isAzkaban: boolean("is_azkaban").notNull().default(false),
  azkabanUntil: timestamp("azkaban_until", { withTimezone: true }),
  savedRoles: text("saved_roles").array(),
  warnCount: integer("warn_count").notNull().default(0),
  isWanted: boolean("is_wanted").notNull().default(false),
  icStory: text("ic_story"),
  icStoryApproved: boolean("ic_story_approved"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCharacterSchema = createInsertSchema(charactersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof charactersTable.$inferSelect;
