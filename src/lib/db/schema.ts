import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url').default('/assets/extracted/default_avatar.svg'),
  educationLevel: text('education_level').default('Class 12'),
  careerInterest: text('career_interest').default('Computer Science'),
  streakDays: integer('streak_days').default(1),
  totalStudyHours: integer('total_study_hours').default(0),
  onboardingCompleted: integer('onboarding_completed').default(0),
  location: text('location').default(''),
  targetExam: text('target_exam').default(''),
  bio: text('bio').default(''),
  createdAt: integer('created_at').notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  timeText: text('time_text').notNull(),
  category: text('category').default('Tasks'),
  completed: integer('completed').notNull().default(0), // 0 or 1
  orderIndex: integer('order_index').default(0),
  createdAt: integer('created_at').notNull(),
});

export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  timeText: text('time_text').notNull(),
  status: text('status').notNull().default('active'), // completed, active, upcoming
  iconType: text('icon_type').notNull().default('book'), // book, assessment, project, exam
  orderIndex: integer('order_index').notNull().default(0),
});

export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  timeText: text('time_text').notNull(),
  category: text('category').notNull().default('Tasks'), // Tasks, Exams, Learning
  enabled: integer('enabled').notNull().default(1),
  createdAt: integer('created_at').notNull(),
});

export const quizAttempts = sqliteTable('quiz_attempts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  quizTitle: text('quiz_title').notNull(),
  category: text('category').notNull(),
  score: integer('score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  weakTopics: text('weak_topics').default(''),
  completedAt: integer('completed_at').notNull(),
});

export const careerPaths = sqliteTable('career_paths', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  matchScore: integer('match_score').notNull(),
  salaryRange: text('salary_range').notNull(),
  scope: text('scope').notNull(),
  description: text('description').notNull(),
  skills: text('skills').notNull(), // JSON array
});

export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  attachments: text('attachments').default('[]'), // JSON array of LocalAttachment
  citations: text('citations').default('[]'), // JSON array of WebCitation
  createdAt: integer('created_at').notNull(),
});

export const uploadedFiles = sqliteTable('uploaded_files', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  sessionId: text('session_id').default(''),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  fileUrl: text('file_url').notNull(),
  storageKey: text('storage_key').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const generatedQuizzes = sqliteTable('generated_quizzes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  topic: text('topic').notNull(),
  level: text('level').notNull().default('intermediate'),
  title: text('title').notNull(),
  questionsJson: text('questions_json').notNull(),
  category: text('category').notNull().default('Subject Tests'),
  createdAt: integer('created_at').notNull(),
});

