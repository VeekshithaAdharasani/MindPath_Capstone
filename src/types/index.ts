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
  growthTag: string;
  image: string;
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
