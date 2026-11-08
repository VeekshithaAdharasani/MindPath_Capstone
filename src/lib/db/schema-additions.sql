-- Add these tables to Turso database for course/career persistence

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

CREATE TABLE IF NOT EXISTS generated_career_paths (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  path_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_lessons_user ON user_course_lessons(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_generated_career_paths_user ON generated_career_paths(user_id);