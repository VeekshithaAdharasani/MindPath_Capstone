import { z } from 'zod';

export const CareerPlanSchema = z.object({
  career: z.string(),
  milestones: z.array(
    z.object({
      title: z.string(),
      topics: z.array(z.string()),
      estimatedWeeks: z.number(),
    })
  ),
  gaps: z.array(z.string()),
});

export const QuizSchema = z.object({
  title: z.string().default('Assessment Quiz'),
  topic: z.string().default('General'),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string(),
    })
  ),
});

export const WhatIfScenarioSchema = z.object({
  selectedPath: z.string(),
  matchScore: z.number(),
  estimatedTimeToReady: z.string(),
  salaryProjection: z.string(),
  keyAdvantages: z.array(z.string()),
  tradeoffsAndRisks: z.array(z.string()),
  recommendedFirstStep: z.string(),
  curatedRoadmap: z.array(z.string()),
});

export const ProfileUpdateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  educationLevel: z.string(),
  careerInterest: z.string(),
  avatarUrl: z.string().optional(),
  location: z.string().optional(),
  targetExam: z.string().optional(),
  bio: z.string().optional(),
});
