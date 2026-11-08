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

let dbInitPromise: Promise<void> | null = null;
let isDbInitialized = false;

async function runMigrations(): Promise<void> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      attempts++;

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
          onboarding_completed INTEGER DEFAULT 0,
          location TEXT DEFAULT '',
          target_exam TEXT DEFAULT '',
          bio TEXT DEFAULT '',
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

      await client.execute(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          attachments TEXT DEFAULT '[]',
          citations TEXT DEFAULT '[]',
          created_at INTEGER NOT NULL
        );
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS uploaded_files (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          session_id TEXT DEFAULT '',
          file_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          file_url TEXT NOT NULL,
          storage_key TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);

      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at ASC);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_id, created_at DESC);
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS course_enrollments (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          course_id TEXT NOT NULL,
          course_title TEXT NOT NULL,
          source TEXT NOT NULL,
          progress INTEGER DEFAULT 0,
          enrolled_at INTEGER NOT NULL,
          completed_at INTEGER
        );
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS user_course_lessons (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          course_id TEXT NOT NULL,
          lesson_id TEXT NOT NULL,
          lesson_title TEXT NOT NULL,
          video_url TEXT,
          video_source TEXT,
          completed INTEGER DEFAULT 0,
          completed_at INTEGER
        );
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS generated_career_paths (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          goal TEXT NOT NULL,
          path_json TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS generated_quizzes (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          topic TEXT NOT NULL,
          level TEXT NOT NULL DEFAULT 'intermediate',
          title TEXT NOT NULL,
          questions_json TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'Subject Tests',
          created_at INTEGER NOT NULL
        );
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS search_cache (
          query TEXT PRIMARY KEY,
          results_json TEXT NOT NULL,
          cached_at INTEGER NOT NULL,
          ttl_ms INTEGER NOT NULL DEFAULT 86400000
        );
      `);

      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_user_course_lessons_user ON user_course_lessons(user_id, course_id);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_generated_career_paths_user ON generated_career_paths(user_id);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_generated_quizzes_user ON generated_quizzes(user_id, created_at DESC);
      `);

      console.log('✅ Turso Database schema verified (zero mock data seeded).');
      isDbInitialized = true;
      return;
    } catch (err: any) {
      console.warn(`Database init attempt ${attempts} warning:`, err?.message || err);
      if (attempts >= maxAttempts) {
        console.error('Database init final failure:', err?.message || err);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, attempts * 500));
    }
  }
}

// Auto-seed initial tables and data if not present with exponential backoff retry
export async function initDatabase(): Promise<void> {
  if (isDbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = runMigrations();
  }
  return dbInitPromise;
}
