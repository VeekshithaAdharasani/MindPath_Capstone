export type NavTab =
  | 'home'
  | 'journey'
  | 'career'
  | 'learning'
  | 'quizzes'
  | 'progress'
  | 'reminders'
  | 'reports'
  | 'settings';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  educationLevel: string;
  careerInterest: string;
  streakDays: number;
  totalStudyHours: number;
  onboardingCompleted?: number;
  location?: string;
  targetExam?: string;
  bio?: string;
}

export interface TaskItem {
  id: string;
  user_id?: string;
  title: string;
  time_text: string;
  duration?: string;
  category?: string;
  completed: number; // 0 or 1
  order_index?: number;
}

export interface MilestoneItem {
  id: string;
  title: string;
  time_text: string;
  status: 'completed' | 'active' | 'upcoming';
  icon_type: 'book' | 'assessment' | 'project' | 'exam';
  order_index: number;
  progress?: number;
}

export interface ReminderItem {
  id: string;
  title: string;
  time_text: string;
  category: 'Tasks' | 'Exams' | 'Learning' | string;
  enabled: number; // 0 or 1
}

export interface CareerMatch {
  id: string;
  title: string;
  matchScore: number;
  salary: string;
  scope: string;
  image?: string;
  category: 'Tech' | 'Science' | 'Medicine' | 'Business' | 'Arts';
  description: string;
  requiredSkills: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizTest {
  id: string;
  title: string;
  category: 'Subject Tests' | 'Mock Exams' | 'General';
  questionsCount: number;
  durationMinutes: number;
  iconBg: string;
  image?: string;
  questions: QuizQuestion[];
  createdAt?: number;
}

export interface WhatIfResult {
  selectedPath: string;
  matchScore: number;
  estimatedTimeToReady: string;
  salaryProjection: string;
  keyAdvantages: string[];
  tradeoffsAndRisks: string[];
  recommendedFirstStep: string;
  curatedRoadmap: string[];
}

// New types for live API data
export interface CourseItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  category: string;
  level?: string;
  rating?: number;
  reviews?: number | string;
  tag?: string;
  tagColor?: string;
  progress?: number;
  duration?: string;
  image?: string;
  source:
    | 'youtube'
    | 'archive'
    | 'github'
    | 'arxiv'
    | 'crossref'
    | 'openalex'
    | 'wikipedia'
    | 'mit-ocw'
    | 'open-edx'
    | 'openstax';
  url: string;
  stars?: number;
  views?: number;
  language?: string;
  modules?: CourseModule[];
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: LessonItem[];
}

export interface LessonItem {
  id: string;
  title: string;
  duration?: string;
  type: 'concept' | 'code' | 'project' | 'video';
  summary?: string;
  content?: string;
  codeSnippet?: string;
  keyTakeaway?: string;
  videoUrl?: string;
  videoSource?: 'youtube';
}

export interface UnifiedSearchResult {
  id: string;
  title: string;
  description?: string;
  url: string;
  source:
    | 'youtube'
    | 'archive'
    | 'github'
    | 'arxiv'
    | 'crossref'
    | 'openalex'
    | 'wikipedia'
    | 'mit-ocw'
    | 'open-edx'
    | 'openstax';
  type: 'video' | 'course' | 'lesson' | 'article';
  duration?: number;
  views?: number;
  stars?: number;
  language?: string;
  thumbnail?: string;
}

export interface CareerPathPlan {
  career: string;
  milestones: Array<{
    title: string;
    topics: string[];
    estimatedWeeks: number;
  }>;
  gaps: string[];
}

export interface GeneratedQuiz {
  title: string;
  topic: string;
  questions: QuizQuestion[];
}

export interface CacheEntry {
  query: string;
  results: UnifiedSearchResult[];
  cachedAt: number;
  ttlMs: number;
}