import { describe, expect, test } from 'bun:test';

interface Attempt {
  id: string;
  quiz_id?: string;
  quiz_title: string;
  score: number;
  total_questions: number;
}

interface QuizItem {
  id: string;
  title: string;
}

function findQuizAttempt(quiz: QuizItem, attempts: Attempt[]): Attempt | undefined {
  return attempts.find((a) => {
    if (a.quiz_id && quiz.id) {
      return a.quiz_id === quiz.id;
    }
    return !a.quiz_id && a.quiz_title.toLowerCase().trim() === quiz.title.toLowerCase().trim();
  });
}

describe('Quiz Attempt Matching Pipeline', () => {
  test('matches quiz attempt strictly by quiz_id when present', () => {
    const quiz1: QuizItem = { id: 'quiz-001', title: 'Intermediate Cybersecurity Quiz' };
    const quiz2: QuizItem = { id: 'quiz-002', title: 'Intermediate Cybersecurity Quiz' };

    const attempts: Attempt[] = [
      {
        id: 'attempt-1',
        quiz_id: 'quiz-001',
        quiz_title: 'Intermediate Cybersecurity Quiz',
        score: 40,
        total_questions: 100,
      },
    ];

    const matchForQuiz1 = findQuizAttempt(quiz1, attempts);
    const matchForQuiz2 = findQuizAttempt(quiz2, attempts);

    expect(matchForQuiz1).toBeDefined();
    expect(matchForQuiz1?.id).toBe('attempt-1');

    // Quiz 2 MUST NOT be marked completed even though titles match!
    expect(matchForQuiz2).toBeUndefined();
  });

  test('falls back to title matching only when quiz_id is missing (legacy attempts)', () => {
    const legacyQuiz: QuizItem = { id: 'quiz-legacy', title: 'Legacy Data Structures Quiz' };
    const modernQuiz: QuizItem = { id: 'quiz-modern', title: 'Modern Data Structures Quiz' };

    const attempts: Attempt[] = [
      {
        id: 'attempt-legacy',
        quiz_title: 'legacy data structures quiz',
        score: 80,
        total_questions: 100,
      },
    ];

    const matchLegacy = findQuizAttempt(legacyQuiz, attempts);
    const matchModern = findQuizAttempt(modernQuiz, attempts);

    expect(matchLegacy).toBeDefined();
    expect(matchModern).toBeUndefined();
  });

  test('preserves individual attempts for distinct quizzes with different subtopics', () => {
    const quizA: QuizItem = { id: 'quiz-net', title: 'Network Defense & Packet Analysis Diagnostic' };
    const quizB: QuizItem = { id: 'quiz-mem', title: 'Memory Safety & Exploit Mitigation Assessment' };

    const attempts: Attempt[] = [
      {
        id: 'attempt-net',
        quiz_id: 'quiz-net',
        quiz_title: 'Network Defense & Packet Analysis Diagnostic',
        score: 90,
        total_questions: 100,
      },
    ];

    expect(findQuizAttempt(quizA, attempts)?.score).toBe(90);
    expect(findQuizAttempt(quizB, attempts)).toBeUndefined();
  });
});
