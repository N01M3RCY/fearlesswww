import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const houseCupTable = pgTable("house_cup", {
  id: serial("id").primaryKey(),
  house: text("house").notNull().unique(),
  points: integer("points").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const owlMailTable = pgTable("owl_mail", {
  id: serial("id").primaryKey(),
  fromDiscordId: text("from_discord_id").notNull(),
  toDiscordId: text("to_discord_id").notNull(),
  message: text("message").notNull(),
  deliverAt: timestamp("deliver_at", { withTimezone: true }).notNull(),
  isDelivered: boolean("is_delivered").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wandSpellLogTable = pgTable("wand_spell_log", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull(),
  spell: text("spell").notNull(),
  target: text("target"),
  isDarkMagic: boolean("is_dark_magic").notNull().default(false),
  castAt: timestamp("cast_at", { withTimezone: true }).notNull().defaultNow(),
});

export const skillsTable = pgTable("skills", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  tılsım: integer("tilsim").notNull().default(0),
  bicimDegistirme: integer("bicim_degistirme").notNull().default(0),
  ksks: integer("ksks").notNull().default(0),
  iksir: integer("iksir").notNull().default(0),
  quidditch: integer("quidditch").notNull().default(0),
  zihnefend: integer("zihnefend").notNull().default(0),
  zihnebend: integer("zihnebend").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const sortingApplicationsTable = pgTable("sorting_applications", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull(),
  discordUsername: text("discord_username").notNull(),
  oocName: text("ooc_name").notNull(),
  oocAge: integer("ooc_age").notNull(),
  bloodStatus: text("blood_status").notNull(),
  gender: text("gender").notNull(),
  answers: text("answers").notNull(),
  suggestedHouse: text("suggested_house").notNull(),
  status: text("status").notNull().default("beklemede"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const characterIntroTable = pgTable("character_intro", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull(),
  icName: text("ic_name").notNull(),
  icAge: integer("ic_age").notNull(),
  icStory: text("ic_story").notNull(),
  status: text("status").notNull().default("beklemede"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHouseCupSchema = createInsertSchema(houseCupTable).omit({ id: true, updatedAt: true });
export const insertOwlMailSchema = createInsertSchema(owlMailTable).omit({ id: true, createdAt: true });
export const insertSkillsSchema = createInsertSchema(skillsTable).omit({ id: true, updatedAt: true });
export const insertSortingAppSchema = createInsertSchema(sortingApplicationsTable).omit({ id: true, createdAt: true });
export const insertCharacterIntroSchema = createInsertSchema(characterIntroTable).omit({ id: true, createdAt: true });

export type HouseCup = typeof houseCupTable.$inferSelect;
export type OwlMail = typeof owlMailTable.$inferSelect;
export type WandSpellLog = typeof wandSpellLogTable.$inferSelect;
export type Skills = typeof skillsTable.$inferSelect;
export type SortingApplication = typeof sortingApplicationsTable.$inferSelect;
export type CharacterIntro = typeof characterIntroTable.$inferSelect;
