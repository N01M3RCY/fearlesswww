import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

async function runMigrations() {
  try {
    const client = await pool.connect();
    await client.query(`
      ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_code TEXT;
      ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_link TEXT;
      
      CREATE TABLE IF NOT EXISTS spells (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        level INTEGER NOT NULL DEFAULT 1,
        scrolls_required INTEGER NOT NULL DEFAULT 1,
        difficulty TEXT NOT NULL DEFAULT 'Kolay',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS character_spells (
        id SERIAL PRIMARY KEY,
        discord_id TEXT NOT NULL,
        spell_name TEXT NOT NULL,
        learned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    client.release();
  } catch (err) {
    console.error("Migration error:", err);
  }
}
runMigrations();

export * from "./schema";
