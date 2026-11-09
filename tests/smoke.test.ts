import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Server } from 'node:http';
import { parseOnboardingResponse, sanitizeOnboardingError } from '../src/components/onboarding/OnboardingTour.tsx';
import { client } from '../src/lib/db/index.ts';
import {
  generateCareerPath,
  generateQuiz,
  getCuratedCareerPath,
  getCuratedQuiz,
  withTimeout,
} from '../src/lib/services/enzonic-ai.ts';

/**
 * End-to-End Smoke Test Suite
 *
 * Verifies the complete MindPath application core flows:
 * 1. User registration across aliases (/api/user/create, /api/user/register) with email normalization & duplicate prevention.
 * 2. User authentication (/api/user/login) with correct password verification and safe 401 rejection.
 * 3. Onboarding completion (/api/onboarding/complete) updating profile and generating/persisting roadmaps, quizzes, milestones, and tasks.
 * 4. Resilient timeout fallback mechanism guaranteeing sub-7s completion and rich curated fallbacks.
 * 5. Client response parsing robustness against 504 Gateway Timeout, 502, 500, and non-JSON HTML payloads.
 * 6. Regression fix verification for /api/user/export-data querying quiz_attempts instead of non-existent assessments.
 */

let server: Server;
let baseUrl: string;
const createdUserIds: string[] = [];

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const { app } = await import('../server.ts');
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://localhost:${address.port}`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  // Clean up test data hermetically
  for (const uid of createdUserIds) {
    try {
      await client.execute({ sql: 'DELETE FROM tasks WHERE user_id = ?', args: [uid] });
      await client.execute({ sql: 'DELETE FROM milestones WHERE user_id = ?', args: [uid] });
      await client.execute({ sql: 'DELETE FROM generated_career_paths WHERE user_id = ?', args: [uid] });
      await client.execute({ sql: 'DELETE FROM generated_quizzes WHERE user_id = ?', args: [uid] });
      await client.execute({ sql: 'DELETE FROM quiz_attempts WHERE user_id = ?', args: [uid] });
      await client.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [uid] });
    } catch (err) {
      console.warn(`Teardown warning for user ${uid}:`, err);
    }
  }

  try {
    await client.execute({
      sql: "DELETE FROM users WHERE email LIKE '%@smoke.test'",
      args: [],
    });
  } catch (err) {
    console.warn('Catch-all test user cleanup error:', err);
  }

  if (server) {
    server.close();
  }
});

describe('MindPath End-to-End Smoke Test Suite', () => {
  const timestamp = Date.now();
  const testUserA = {
    name: 'Smoke Tester Alpha',
    email: `alpha_${timestamp}@smoke.test`,
    password: 'SecurePassword123!',
    educationLevel: 'Undergraduate',
    careerInterest: 'Computer Science',
  };

  const testUserB = {
    name: 'Smoke Tester Beta',
    email: `beta_${timestamp}@smoke.test`,
    password: 'BetaStrongPass987!',
    educationLevel: 'Postgraduate',
    careerInterest: 'AI & Data Science',
  };

  let createdUserAId: string;
  let createdUserBId: string;

  // =========================================================================
  // 1. User Registration Flow
  // =========================================================================
  describe('1. User Registration Flow', () => {
    it('1.1 registers a new user via /api/user/create with email normalization and returns valid user schema', async () => {
      const paddedEmail = `  ${testUserA.email.toUpperCase()}  `;
      const res = await fetch(`${baseUrl}/api/user/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: testUserA.name,
          email: paddedEmail,
          password: testUserA.password,
          educationLevel: testUserA.educationLevel,
          careerInterest: testUserA.careerInterest,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.id).toMatch(/^user_\d+/);
      expect(data.user.email).toBe(testUserA.email.toLowerCase());
      expect(data.user.name).toBe(testUserA.name);
      expect(data.user.streakDays).toBe(1);
      expect(data.user.onboardingCompleted).toBe(0);

      createdUserAId = data.user.id;
      createdUserIds.push(createdUserAId);
    });

    it('1.2 registers another user via alias /api/user/register', async () => {
      const res = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUserB),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.user.id).toBeDefined();
      expect(data.user.email).toBe(testUserB.email.toLowerCase());

      createdUserBId = data.user.id;
      createdUserIds.push(createdUserBId);
    });

    it('1.3 rejects duplicate registration with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Attempt',
          email: testUserA.email,
          password: 'AnyPassword123!',
        }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe('User with this email already exists');
    });

    it('1.4 rejects registration with invalid email or short password (< 6 chars) with 400', async () => {
      const badEmailRes = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bad Email',
          email: 'not-an-email',
          password: 'ValidPassword123!',
        }),
      });
      expect(badEmailRes.status).toBe(400);

      const shortPassRes = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Short Pass',
          email: `shortpass_${timestamp}@smoke.test`,
          password: '12345',
        }),
      });
      expect(shortPassRes.status).toBe(400);
    });
  });

  // =========================================================================
  // 2. Authentication & Login Flow
  // =========================================================================
  describe('2. Authentication & Login Flow', () => {
    it('2.1 logs in successfully with valid credentials and returns complete user object', async () => {
      const res = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserA.email,
          password: testUserA.password,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(createdUserAId);
      expect(data.user.email).toBe(testUserA.email.toLowerCase());
      expect(data.user.streakDays).toBeGreaterThanOrEqual(1);
    });

    it('2.2 supports login with whitespace-padded email (case-insensitive)', async () => {
      const res = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `   ${testUserA.email.toUpperCase()}   `,
          password: testUserA.password,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.user.id).toBe(createdUserAId);
    });

    it('2.3 rejects login with incorrect password with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserA.email,
          password: 'WrongPassword999!',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid email or password');
    });

    it('2.4 rejects login for non-existent user with 401 Unauthorized without account enumeration', async () => {
      const res = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `nonexistent_${Date.now()}@smoke.test`,
          password: 'AnyPassword123!',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid email or password');
    });
  });

  // =========================================================================
  // 3. Onboarding Completion & State Transitions
  // =========================================================================
  describe('3. Onboarding Completion & State Transitions', () => {
    it('3.1 completes onboarding with userId in header and body, updating profile and generating career artifacts', async () => {
      const startTime = Date.now();
      const res = await fetch(`${baseUrl}/api/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': createdUserAId,
        },
        body: JSON.stringify({
          userId: createdUserAId,
          educationLevel: 'B.Tech Computer Science',
          careerInterest: 'Software Development & Cloud',
          targetExam: 'GATE CSE',
          location: 'Bengaluru, India',
          bio: 'Passionate student preparing for software engineering roles.',
        }),
      });

      const elapsed = Date.now() - startTime;
      expect(res.status).toBe(200);
      // Route must complete well within the serverless 10s ceiling
      expect(elapsed).toBeLessThan(8000);

      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(createdUserAId);
      expect(data.user.onboardingCompleted).toBe(1);
      expect(data.user.educationLevel).toBe('B.Tech Computer Science');
      expect(data.user.careerInterest).toBe('Software Development & Cloud');
    }, 15000);

    it('3.2 confirms onboarding completion and related artifacts in Turso database', async () => {
      // 1. Check user table
      const userCheck = await client.execute({
        sql: 'SELECT onboarding_completed, education_level, career_interest FROM users WHERE id = ?',
        args: [createdUserAId],
      });
      expect(userCheck.rows.length).toBe(1);
      expect(Number(userCheck.rows[0].onboarding_completed)).toBe(1);
      expect(String(userCheck.rows[0].education_level)).toBe('B.Tech Computer Science');

      // 2. Check generated career path
      const pathCheck = await client.execute({
        sql: 'SELECT goal, path_json FROM generated_career_paths WHERE user_id = ?',
        args: [createdUserAId],
      });
      expect(pathCheck.rows.length).toBeGreaterThanOrEqual(1);
      const parsedPlan = JSON.parse(String(pathCheck.rows[0].path_json));
      expect(parsedPlan.milestones).toBeDefined();
      expect(Array.isArray(parsedPlan.milestones)).toBe(true);
      expect(parsedPlan.milestones.length).toBeGreaterThanOrEqual(3);

      // 3. Check milestones
      const milestonesCheck = await client.execute({
        sql: 'SELECT id, title, status FROM milestones WHERE user_id = ? ORDER BY order_index ASC',
        args: [createdUserAId],
      });
      expect(milestonesCheck.rows.length).toBeGreaterThanOrEqual(1);
      expect(milestonesCheck.rows[0].status).toBe('active');

      // 4. Check generated quiz
      const quizCheck = await client.execute({
        sql: 'SELECT topic, questions_json FROM generated_quizzes WHERE user_id = ?',
        args: [createdUserAId],
      });
      expect(quizCheck.rows.length).toBeGreaterThanOrEqual(1);
      const parsedQuestions = JSON.parse(String(quizCheck.rows[0].questions_json));
      expect(Array.isArray(parsedQuestions)).toBe(true);
      expect(parsedQuestions.length).toBeGreaterThanOrEqual(3);

      // 5. Check tasks
      const tasksCheck = await client.execute({
        sql: 'SELECT title, completed FROM tasks WHERE user_id = ?',
        args: [createdUserAId],
      });
      expect(tasksCheck.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('3.3 rejects onboarding request without authenticated user ID with 401', async () => {
      const res = await fetch(`${baseUrl}/api/onboarding/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          educationLevel: 'Undergraduate',
          careerInterest: 'Computer Science',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('User must be authenticated');
    });
  });

  // =========================================================================
  // 4. Timeout Fallback & Curated Engine Invariants
  // =========================================================================
  describe('4. Timeout Fallback & Curated Engine Invariants', () => {
    it('4.1 withTimeout utility resolves fast promises before timeout trigger', async () => {
      const fastPromise = new Promise<{ status: string }>((resolve) =>
        setTimeout(() => resolve({ status: 'fast_success' }), 20)
      );
      const result = await withTimeout(fastPromise, 300, { status: 'fallback_val' });
      expect(result.status).toBe('fast_success');
    });

    it('4.2 withTimeout utility returns fallback object when promise exceeds timeout', async () => {
      const hangingPromise = new Promise<{ status: string }>(() => {});
      const fallbackObj = { status: 'safe_fallback' };
      const result = await withTimeout(hangingPromise, 50, fallbackObj);
      expect(result).toBe(fallbackObj);
    });

    it('4.3 withTimeout utility rejects when fallback parameter is Error or error string', async () => {
      const hangingPromise = new Promise<string>(() => {});
      let errorThrown = false;
      try {
        await withTimeout(hangingPromise, 50, new Error('Custom timeout error'));
      } catch (err: any) {
        errorThrown = true;
        expect(err.message).toBe('Custom timeout error');
      }
      expect(errorThrown).toBe(true);

      let stringErrorThrown = false;
      try {
        await withTimeout(hangingPromise, 50, 'Timeout string error message');
      } catch (err: any) {
        stringErrorThrown = true;
        expect(err.message).toBe('Timeout string error message');
      }
      expect(stringErrorThrown).toBe(true);
    });

    it('4.4 getCuratedCareerPath generates complete structured roadmaps across 5 major domains', () => {
      const domains = [
        'Computer Science',
        'Machine Learning & Data Science',
        'DevOps & Cloud Engineering',
        'Full Stack Web Development',
        'Cybersecurity & Ethical Hacking',
      ];

      for (const d of domains) {
        const plan = getCuratedCareerPath(d);
        expect(plan.career).toBe(d);
        expect(plan.milestones.length).toBeGreaterThanOrEqual(6);
        for (const m of plan.milestones) {
          expect(typeof m.title).toBe('string');
          expect(m.title.length).toBeGreaterThan(0);
          expect(Array.isArray(m.topics)).toBe(true);
          expect(m.topics.length).toBeGreaterThanOrEqual(2);
          expect(m.estimatedWeeks).toBeGreaterThan(0);
        }
      }
    });

    it('4.5 getCuratedQuiz generates valid diagnostic quizzes with complete question options and explanations', () => {
      const quiz = getCuratedQuiz('Computer Science', 'intermediate', 5);
      expect(quiz.title).toContain('Computer Science');
      expect(quiz.questions.length).toBeGreaterThanOrEqual(5);
      for (const q of quiz.questions) {
        expect(q.question.length).toBeGreaterThan(10);
        expect(q.options.length).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
        expect(q.explanation.length).toBeGreaterThan(0);
      }
    });

    it('4.6 generateCareerPath and generateQuiz fall back seamlessly under tight timeout budget without throwing', async () => {
      const start = Date.now();
      const [path, quiz] = await Promise.all([
        generateCareerPath('AI Research', 50),
        generateQuiz('Cloud Architecture', 'intermediate', 4, 50),
      ]);
      const duration = Date.now() - start;

      // Both should complete within reasonable timeout budget
      expect(duration).toBeLessThan(2000);
      expect(path).toBeDefined();
      expect(path.milestones.length).toBeGreaterThanOrEqual(6);
      expect(quiz).toBeDefined();
      expect(quiz.questions.length).toBeGreaterThanOrEqual(4);
    });
  });

  // =========================================================================
  // 5. Safe Client Response Parsing & Error Invariants (Zero-Crash Verification)
  // =========================================================================
  describe('5. Safe Client Response Parsing & Error Invariants', () => {
    it('5.1 parseOnboardingResponse handles 200 OK with valid JSON', async () => {
      const mockRes = new Response(
        JSON.stringify({
          ok: true,
          user: { id: 'user_1', name: 'Tester', streakDays: 1, onboardingCompleted: 1 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const parsed = await parseOnboardingResponse(mockRes);
      expect(parsed.success).toBe(true);
      expect(parsed.statusCode).toBe(200);
      expect(parsed.user?.id).toBe('user_1');
    });

    it('5.2 parseOnboardingResponse safely handles 504 Gateway Timeout HTML page without JSON syntax crash', async () => {
      const htmlBody = `<!DOCTYPE html><html><head><title>504 Gateway Time-out</title></head><body><center><h1>504 Gateway Time-out</h1></center><hr><center>cloudflare / vercel</center></body></html>`;
      const mockRes = new Response(htmlBody, {
        status: 504,
        headers: { 'Content-Type': 'text/html' },
      });

      const parsed = await parseOnboardingResponse(mockRes);
      expect(parsed.success).toBe(false);
      expect(parsed.statusCode).toBe(504);
      expect(parsed.error).toContain('timed out');
    });

    it('5.3 parseOnboardingResponse safely handles 502 Bad Gateway HTML page without crash', async () => {
      const htmlBody = `<html><body>Bad Gateway</body></html>`;
      const mockRes = new Response(htmlBody, {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      });

      const parsed = await parseOnboardingResponse(mockRes);
      expect(parsed.success).toBe(false);
      expect(parsed.statusCode).toBe(502);
      expect(parsed.error).toBeDefined();
    });

    it('5.4 parseOnboardingResponse safely handles 500 Internal Server Error with plain text', async () => {
      const mockRes = new Response('An error occurred on the server', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });

      const parsed = await parseOnboardingResponse(mockRes);
      expect(parsed.success).toBe(false);
      expect(parsed.statusCode).toBe(500);
      expect(parsed.error).toContain('Server error');
    });

    it('5.5 parseOnboardingResponse safely handles 401 Unauthorized', async () => {
      const mockRes = new Response(JSON.stringify({ error: 'User must be authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });

      const parsed = await parseOnboardingResponse(mockRes);
      expect(parsed.success).toBe(false);
      expect(parsed.statusCode).toBe(401);
      expect(parsed.error).toBe('User must be authenticated');
    });

    it('5.6 sanitizeOnboardingError converts cryptic SyntaxError / JSON parsing tokens into clear user guidance', () => {
      const syntaxErr = new SyntaxError("Unexpected token 'A', 'An error o'... is not valid JSON");
      const sanitized = sanitizeOnboardingError(syntaxErr);
      expect(sanitized).toBe('Could not complete AI onboarding due to a server response issue. Please retry.');
      expect(sanitized).not.toContain('Unexpected token');
      expect(sanitized).not.toContain('SyntaxError');
    });
  });

  // =========================================================================
  // 6. Regression Check: Data Export & Relational Integrity
  // =========================================================================
  describe('6. Regression Check: Data Export & Relational Integrity', () => {
    it('6.1 /api/user/export-data successfully queries quiz_attempts without assessment table defect', async () => {
      const res = await fetch(`${baseUrl}/api/user/export-data?userId=${createdUserAId}`, {
        method: 'GET',
        headers: { 'x-user-id': createdUserAId },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.exportTimestamp).toBeDefined();
      expect(data.studentProfile).toBeDefined();
      expect(Array.isArray(data.tasks)).toBe(true);
      expect(Array.isArray(data.milestones)).toBe(true);
      expect(Array.isArray(data.assessments)).toBe(true);
    });
  });
});
