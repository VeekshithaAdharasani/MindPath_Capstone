import 'dotenv/config';
import { client } from '../src/lib/db/index.ts';

/**
 * MindPath Complete Database Reset Script
 *
 * Safely clears all application records across the 14 application tables in strict
 * reverse-dependency order to preserve relational integrity.
 *
 * Strict Reverse-Dependency Order:
 * 1. chat_messages
 * 2. uploaded_files
 * 3. chat_sessions
 * 4. user_course_lessons
 * 5. course_enrollments
 * 6. quiz_attempts
 * 7. generated_quizzes
 * 8. generated_career_paths
 * 9. tasks
 * 10. milestones
 * 11. reminders
 * 12. career_paths
 * 13. search_cache
 * 14. users
 *
 * CRITICAL SAFETY INVARIANT:
 * - NEVER touch, delete from, or drop __turso_internal_mvcc_meta or any internal sqlite_* table.
 */

export const APPLICATION_TABLES = [
  'chat_messages',
  'uploaded_files',
  'chat_sessions',
  'user_course_lessons',
  'course_enrollments',
  'quiz_attempts',
  'generated_quizzes',
  'generated_career_paths',
  'tasks',
  'milestones',
  'reminders',
  'career_paths',
  'search_cache',
  'users',
] as const;

export type ApplicationTableName = (typeof APPLICATION_TABLES)[number];

export interface TableRowCounts {
  [table: string]: number;
}

export async function getTableRowCounts(): Promise<TableRowCounts> {
  const counts: TableRowCounts = {};
  for (const table of APPLICATION_TABLES) {
    const res = await client.execute(`SELECT COUNT(*) as count FROM ${table};`);
    counts[table] = Number(res.rows[0]?.count ?? 0);
  }
  return counts;
}

export async function resetDatabase(): Promise<{
  beforeCounts: TableRowCounts;
  afterCounts: TableRowCounts;
}> {
  console.log('=============================================================');
  console.log('Starting MindPath Complete Database Reset (14 Tables)');
  console.log('=============================================================');

  // Verify internal tables are protected
  const metaCheck = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
  const foundTables = metaCheck.rows.map((r) => String(r.name));
  console.log(`Discovered ${foundTables.length} total tables in SQLite catalog.`);

  // 1. Snapshot Before Counts
  console.log('\n[1/4] Snapshotting table row counts BEFORE reset...');
  const beforeCounts = await getTableRowCounts();
  for (const table of APPLICATION_TABLES) {
    console.log(`  - ${table.padEnd(25)}: ${beforeCounts[table]} rows`);
  }

  // 2. Disable foreign keys during deletion
  console.log('\n[2/4] Disabling foreign keys temporarily for clean cascading wipe...');
  await client.execute('PRAGMA foreign_keys = OFF;');

  // 3. Clear each table in strict reverse-dependency order
  console.log('\n[3/4] Deleting records in strict reverse-dependency order:');
  for (let i = 0; i < APPLICATION_TABLES.length; i++) {
    const table = APPLICATION_TABLES[i];
    // Safety check against internal tables
    if (table.startsWith('sqlite_') || table.startsWith('__turso_')) {
      throw new Error(`SAFETY VIOLATION: Attempted to touch internal table "${table}"! Aborting immediately.`);
    }

    console.log(`  [${i + 1}/${APPLICATION_TABLES.length}] Clearing table: ${table}...`);
    await client.execute(`DELETE FROM ${table};`);
  }

  // Re-enable foreign keys
  await client.execute('PRAGMA foreign_keys = ON;');

  // 4. Snapshot and Verify After Counts
  console.log('\n[4/4] Snapshotting and verifying table row counts AFTER reset...');
  const afterCounts = await getTableRowCounts();
  let hasFailedTable = false;

  console.log('\n=============================================================');
  console.log('Table Reset Summary (Before vs. After)');
  console.log('=============================================================');
  console.log(
    `${'Table Name'.padEnd(26)} | ${'Before Rows'.padStart(12)} | ${'After Rows'.padStart(12)} | Status`
  );
  console.log('-'.repeat(68));

  for (const table of APPLICATION_TABLES) {
    const before = beforeCounts[table];
    const after = afterCounts[table];
    const isZero = after === 0;
    if (!isZero) hasFailedTable = true;
    const status = isZero ? 'CLEARED (0)' : 'FAILED (!= 0)';
    console.log(
      `${table.padEnd(26)} | ${String(before).padStart(12)} | ${String(after).padStart(12)} | ${status}`
    );
  }
  console.log('=============================================================');

  if (hasFailedTable) {
    throw new Error('Database reset verification failed: One or more tables have non-zero row counts!');
  }

  console.log('\nSUCCESS: All 14 application tables have been completely emptied (0 rows).');
  console.log('System table __turso_internal_mvcc_meta remained completely untouched.');

  return { beforeCounts, afterCounts };
}

// Execute when invoked directly
if (import.meta.main || process.argv[1]?.endsWith('reset-db.ts')) {
  resetDatabase()
    .then(() => {
      console.log('\nReset script execution completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\nFATAL: Database reset encountered an error:', err);
      process.exit(1);
    });
}
