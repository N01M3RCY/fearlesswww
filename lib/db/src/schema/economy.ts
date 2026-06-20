import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  fromDiscordId: text("from_discord_id"),
  toDiscordId: text("to_discord_id"),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const finesTable = pgTable("fines", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  issuedBy: text("issued_by").notNull(),
  isPaid: text("is_paid").notNull().default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export const insertFineSchema = createInsertSchema(finesTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertFine = z.infer<typeof insertFineSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
export type Fine = typeof finesTable.$inferSelect;
