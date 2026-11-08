import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const courseEnrollments = sqliteTable('course_enrollments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  courseId: text('course_id').notNull(),
  courseTitle: text('course_title').notNull(),
  source: text('source').notNull(),
  progress: integer('progress').default(0),
  enrolledAt: integer('enrolled_at').notNull(),
  completedAt: integer('completed_at'),
});

export const userCourseLessons = sqliteTable('user_course_lessons', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  courseId: text('course_id').notNull(),
  lessonId: text('lesson_id').notNull(),
  lessonTitle: text('lesson_title').notNull(),
  videoUrl: text('video_url'),
  videoSource: text('video_source'),
  completed: integer('completed').default(0),
  completedAt: integer('completed_at'),
});

export const generatedCareerPaths = sqliteTable('generated_career_paths', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  goal: text('goal').notNull(),
  pathJson: text('path_json').notNull(),
  createdAt: integer('created_at').notNull(),
});