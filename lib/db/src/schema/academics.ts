import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  professorDiscordId: text("professor_discord_id").notNull(),
  subject: text("subject").notNull(),
  description: text("description"),
  classYear: integer("class_year").notNull().default(1),
  isLive: boolean("is_live").notNull().default(false),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  channelId: text("channel_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessonEnrollmentsTable = pgTable("lesson_enrollments", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
});

export const examsTable = pgTable("exams", {
  id: serial("id").primaryKey(),
  professorDiscordId: text("professor_discord_id").notNull(),
  subject: text("subject").notNull(),
  classYear: integer("class_year").notNull(),
  type: text("type").notNull().default("vize"),
  isActive: boolean("is_active").notNull().default(false),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const examResultsTable = pgTable("exam_results", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull(),
  examId: integer("exam_id").notNull(),
  score: integer("score"),
  isPassed: boolean("is_passed"),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true, createdAt: true });
export const insertEnrollmentSchema = createInsertSchema(lessonEnrollmentsTable).omit({ id: true, enrolledAt: true });
export const insertExamSchema = createInsertSchema(examsTable).omit({ id: true, createdAt: true });
export const insertExamResultSchema = createInsertSchema(examResultsTable).omit({ id: true, createdAt: true });

export type Lesson = typeof lessonsTable.$inferSelect;
export type LessonEnrollment = typeof lessonEnrollmentsTable.$inferSelect;
export type Exam = typeof examsTable.$inferSelect;
export type ExamResult = typeof examResultsTable.$inferSelect;
