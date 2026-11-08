import 'dotenv/config';
import { client } from '../src/lib/db/index.ts';

async function migrate() {
  console.log('Migrating Turso DB for chat history and uploaded files...');
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

  console.log('✅ Migration succeeded: chat_sessions, chat_messages, uploaded_files created with indices.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
