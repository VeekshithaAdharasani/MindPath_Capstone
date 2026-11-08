import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

const dbUrl = process.env.TURSO_DATABASE_URL || 'libsql://nova-ai-aztech1729.aws-ap-south-1.turso.io';
const dbAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!dbAuthToken) {
  throw new Error('FATAL: TURSO_AUTH_TOKEN must be provided in environment variables.');
}

export const client = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

export const db = drizzle(client, { schema });

// Auto-seed initial tables and data if not present
export async function initDatabase() {
  try {
    // Create tables if they do not exist
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT,
        avatar_url TEXT DEFAULT '/assets/extracted/default_avatar.svg',
        education_level TEXT DEFAULT 'Class 12',
        career_interest TEXT DEFAULT 'Computer Science',
        streak_days INTEGER DEFAULT 1,
        total_study_hours INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        time_text TEXT NOT NULL,
        category TEXT DEFAULT 'Tasks',
        completed INTEGER NOT NULL DEFAULT 0,
        order_index INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        time_text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        icon_type TEXT NOT NULL DEFAULT 'book',
        order_index INTEGER NOT NULL DEFAULT 0
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        time_text TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Tasks',
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        quiz_title TEXT NOT NULL,
        category TEXT NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        weak_topics TEXT DEFAULT '',
        completed_at INTEGER NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS career_paths (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        match_score INTEGER NOT NULL,
        salary_range TEXT NOT NULL,
        scope TEXT NOT NULL,
        description TEXT NOT NULL,
        skills TEXT NOT NULL
      );
    `);

    console.log('✅ Turso Database schema verified (zero mock data seeded).');
  } catch (err: any) {
    console.error('Database init error:', err?.message || err);
  }
}
