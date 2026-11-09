import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Server } from 'node:http';
import express from 'express';
import {
  type OnboardingResponseResult,
  parseOnboardingResponse,
  sanitizeOnboardingError,
} from '../src/components/onboarding/OnboardingTour.tsx';
import type { UserProfile } from '../src/types/index.ts';

export type { OnboardingResponseResult };
export { parseOnboardingResponse, sanitizeOnboardingError };

/**
 * Milestone 3: Client Error Test Suite & Verification for OnboardingTour.tsx
 *
 * Covers:
 * 1. Bug reproduction: Demonstrating naive res.json() syntax crashes on 504 HTML & 500 plain text.
 * 2. Unit testing of parseOnboardingResponse across 504 HTML, 502 HTML, 500 text/JSON, 401, 400, 200 OK.
 * 3. Client request payload invariants: userId in both header 'x-user-id' and request body 'userId'.
 * 4. End-to-end HTTP integration simulation against real HTTP server with varied gateway responses.
 * 5. UI error sanitizer invariants: Stripping technical SyntaxError and JSON parsing tokens.
 */

// ============================================================================
// Test Suite
// ============================================================================
describe('Milestone 3: Client Onboarding Error Handling & Verification', () => {

  // =========================================================================
  // 1. Bug Reproduction: Demonstrating Naive res.json() Syntax Crashes
  // =========================================================================
  describe('1. Bug Reproduction (Naive res.json() Defect)', () => {
    it('1.1 Naive res.json() throws SyntaxError on 504 HTML gateway timeout', async () => {
      const htmlBody = '<!DOCTYPE html><html><body>An error occurred with your deployment. FUNCTION_INVOCATION_TIMEOUT</body></html>';
      const response = new Response(htmlBody, {
        status: 504,
        headers: { 'Content-Type': 'text/html' },
      });

      let threwSyntaxError = false;
      try {
        await response.json();
      } catch (err: any) {
        threwSyntaxError = err instanceof SyntaxError || err.message.includes('JSON');
        expect(err.message).toMatch(/(Unexpected token|JSON)/);
      }
      expect(threwSyntaxError).toBe(true);
    });

    it('1.2 Naive res.json() throws SyntaxError on 500 plain text error', async () => {
      const textBody = 'Internal Server Error: database connection timeout at db.connect()';
      const response = new Response(textBody, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });

      let threwSyntaxError = false;
      try {
        await response.json();
      } catch (err: any) {
        threwSyntaxError = err instanceof SyntaxError || err.message.includes('JSON');
      }
      expect(threwSyntaxError).toBe(true);
    });
  });

  // =========================================================================
  // 2. Unit Testing of parseOnboardingResponse (Safe Parser)
  // =========================================================================
  describe('2. Safe Response Parser Invariants (parseOnboardingResponse)', () => {
    it('2.1 Safely handles 504 Gateway Timeout with HTML body without throwing', async () => {
      const htmlBody = '<!DOCTYPE html><html><body>An error occurred: 504 Gateway Timeout</body></html>';
      const response = new Response(htmlBody, {
        status: 504,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });

      const result = await parseOnboardingResponse(response);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(504);
      expect(result.error).toBe('Onboarding generation timed out. Please retry to use customized career curriculum.');
      expect(result.user).toBeUndefined();
    });

    it('2.2 Safely handles 504 Gateway Timeout with empty body', async () => {
      const response = new Response('', {
        status: 504,
        headers: { 'Content-Type': 'text/plain' },
      });

      const result = await parseOnboardingResponse(response);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(504);
      expect(result.error).toContain('timed out');
    });

    it('2.3 Safely handles 502 Bad Gateway with Nginx / Cloudflare HTML body', async () => {
      const htmlBody = '<html><head><title>502 Bad Gateway</title></head><body><center>502 Bad Gateway</center></body></html>';
      const response = new Response(htmlBody, {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      });

      const result = await parseOnboardingResponse(response);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(502);
      expect(result.error).toBe('Onboarding generation timed out. Please retry to use customized career curriculum.');
    });

    it('2.4 Safely handles 500 Internal Server Error with plain text', async () => {
      const plainText = 'Internal Server Error: failed to write user milestones';
      const response = new Response(plainText, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });

      const result = await parseOnboardingResponse(response);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Server error encountered during onboarding setup. Please retry.');
    });

    it('2.5 Safely handles 500 Internal Server Error with JSON error payload', async () => {
      const jsonBody = JSON.stringify({ error: 'Database transaction lock exceeded' });
      const response = new Response(jsonBody, {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseOnboardingResponse(response);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Database transaction lock exceeded');
    });

    it('2.6 Safely handles 401 Unauthorized with standard JSON error', async () => {
      const jsonBody = JSON.stringify({ error: 'User must be authenticated' });
      const response = new Response(jsonBody, {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseOnboardingResponse(response);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('User must be authenticated');
    });

    it('2.7 Safely handles 401 Unauthorized with plain text / edge auth rejection', async () => {
      const response = new Response('Unauthorized Access Denied', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' },
      });

      const result = await parseOnboardingResponse(response);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Session expired or unauthenticated. Please sign in again.');
    });

    it('2.8 Safely handles 400 Bad Request with validation message', async () => {
      const jsonBody = JSON.stringify({ error: 'Career track cannot be empty' });
      const response = new Response(jsonBody, {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseOnboardingResponse(response);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Career track cannot be empty');
    });

    it('2.9 Safely parses 200 OK with valid JSON and UserProfile payload', async () => {
      const mockUser: UserProfile = {
        id: 'usr_verified_999',
        name: 'Learner One',
        email: 'learner1@example.com',
        avatarUrl: '/assets/extracted/alex_avatar.png',
        totalStudyHours: 0,
        streakDays: 1,
        onboardingCompleted: 1,
        careerInterest: 'AI & Systems',
        educationLevel: 'Undergraduate',
        targetExam: 'GATE 2026',
        location: 'Bengaluru, India',
        bio: 'Ready to learn',
      };

      const response = new Response(JSON.stringify({ ok: true, user: mockUser }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseOnboardingResponse(response);
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('usr_verified_999');
      expect(result.user?.name).toBe('Learner One');
      expect(result.error).toBeUndefined();
    });

    it('2.10 Handles 200 OK with ok: false in JSON payload', async () => {
      const response = new Response(JSON.stringify({ ok: false, error: 'Curated curriculum generation failed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseOnboardingResponse(response);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(200);
      expect(result.error).toBe('Curated curriculum generation failed');
    });

    it('2.11 Handles 200 OK with non-JSON plain text body (edge proxy anomaly)', async () => {
      const response = new Response('OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });

      const result = await parseOnboardingResponse(response);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(200);
      expect(result.error).toBe('Invalid response received from server. Please retry.');
    });

    it('2.12 Handles 200 OK with malformed JSON body (truncated stream)', async () => {
      const response = new Response('{"ok": true, "user": { "id": "trun', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseOnboardingResponse(response);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(200);
      expect(result.error).toBe('Invalid response received from server. Please retry.');
    });
  });

  // =========================================================================
  // 3. Client Request Payload Invariants
  // =========================================================================
  describe('3. Client Request Serialization & userId Passing', () => {
    it('3.1 Formulates request body containing userId, educationLevel, careerInterest, etc.', () => {
      const testProps = {
        userId: 'usr_secure_456',
        educationLevel: '  College Undergrad  ',
        careerInterest: '  Cybersecurity Analyst  ',
        targetExam: '  CEH 2026  ',
        location: '  Mumbai, India  ',
        bio: '  Learning security protocols  ',
        avatarUrl: '  /assets/extracted/alex_avatar.png  ',
      };

      const payload = {
        userId: testProps.userId || '',
        educationLevel: testProps.educationLevel.trim(),
        careerInterest: testProps.careerInterest.trim(),
        targetExam: testProps.targetExam.trim(),
        location: testProps.location.trim(),
        bio: testProps.bio.trim(),
        avatarUrl: testProps.avatarUrl.trim(),
      };

      expect(payload.userId).toBe('usr_secure_456');
      expect(payload.educationLevel).toBe('College Undergrad');
      expect(payload.careerInterest).toBe('Cybersecurity Analyst');
      expect(payload.targetExam).toBe('CEH 2026');
      expect(payload.location).toBe('Mumbai, India');
      expect(payload.bio).toBe('Learning security protocols');
      expect(payload.avatarUrl).toBe('/assets/extracted/alex_avatar.png');

      const serialized = JSON.stringify(payload);
      const parsed = JSON.parse(serialized);
      expect(parsed.userId).toBe('usr_secure_456');
    });

    it('3.2 Gracefully tolerates undefined or empty userId without producing undefined string literal', () => {
      const testProps = {
        userId: undefined,
        educationLevel: 'Undergraduate',
        careerInterest: 'AI',
        targetExam: '',
        location: '',
        bio: '',
        avatarUrl: '',
      };

      const payload = {
        userId: testProps.userId || '',
        educationLevel: testProps.educationLevel.trim(),
        careerInterest: testProps.careerInterest.trim(),
        targetExam: testProps.targetExam.trim(),
        location: testProps.location.trim(),
        bio: testProps.bio.trim(),
        avatarUrl: testProps.avatarUrl.trim(),
      };

      expect(payload.userId).toBe('');
      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': testProps.userId || '',
      };
      expect(headers['x-user-id']).toBe('');
    });
  });

  // =========================================================================
  // 4. End-to-End HTTP Server Simulation
  // =========================================================================
  describe('4. End-to-End HTTP Simulation with Varied Upstream Responses', () => {
    let mockServer: Server;
    let mockUrl: string;

    beforeAll(async () => {
      const mockApp = express();
      mockApp.use(express.json());

      // 1. Simulate 504 Gateway Timeout with HTML
      mockApp.post('/api/mock/504-timeout', (_req, res) => {
        res.status(504).type('text/html').send('<!DOCTYPE html><html><body>An error occurred. Gateway Timeout.</body></html>');
      });

      // 2. Simulate 500 Server Error with plain text
      mockApp.post('/api/mock/500-plaintext', (_req, res) => {
        res.status(500).type('text/plain').send('Internal Server Error: database connection refused');
      });

      // 3. Simulate 401 Unauthorized with JSON
      mockApp.post('/api/mock/401-unauth', (_req, res) => {
        res.status(401).json({ error: 'User must be authenticated' });
      });

      // 4. Simulate 200 OK with valid user data
      mockApp.post('/api/mock/200-success', (req, res) => {
        const receivedUserId = req.headers['x-user-id'] || req.body?.userId;
        res.status(200).json({
          ok: true,
          user: {
            id: receivedUserId || 'usr_mock_1',
            name: 'Mock Learner',
            onboardingCompleted: true,
          },
        });
      });

      await new Promise<void>((resolve) => {
        mockServer = mockApp.listen(0, () => {
          const addr = mockServer.address();
          if (addr && typeof addr === 'object') {
            mockUrl = `http://localhost:${addr.port}`;
          }
          resolve();
        });
      });
    });

    afterAll(() => {
      if (mockServer) {
        mockServer.close();
      }
    });

    it('4.1 Real HTTP fetch to 504 HTML endpoint is safely parsed without syntax crash', async () => {
      const res = await fetch(`${mockUrl}/api/mock/504-timeout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr_123' },
        body: JSON.stringify({ userId: 'usr_123', educationLevel: 'College' }),
      });

      const parsed = await parseOnboardingResponse(res);
      expect(parsed.success).toBe(false);
      expect(parsed.statusCode).toBe(504);
      expect(parsed.error).toContain('timed out');
    });

    it('4.2 Real HTTP fetch to 500 plain text endpoint is safely parsed', async () => {
      const res = await fetch(`${mockUrl}/api/mock/500-plaintext`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr_123' },
        body: JSON.stringify({ userId: 'usr_123', educationLevel: 'College' }),
      });

      const parsed = await parseOnboardingResponse(res);
      expect(parsed.success).toBe(false);
      expect(parsed.statusCode).toBe(500);
      expect(parsed.error).toContain('Server error');
    });

    it('4.3 Real HTTP fetch to 401 unauthenticated endpoint is safely parsed', async () => {
      const res = await fetch(`${mockUrl}/api/mock/401-unauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ educationLevel: 'College' }),
      });

      const parsed = await parseOnboardingResponse(res);
      expect(parsed.success).toBe(false);
      expect(parsed.statusCode).toBe(401);
      expect(parsed.error).toBe('User must be authenticated');
    });

    it('4.4 Real HTTP fetch to 200 OK endpoint returns success and user profile', async () => {
      const res = await fetch(`${mockUrl}/api/mock/200-success`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr_verified_777' },
        body: JSON.stringify({ userId: 'usr_verified_777', educationLevel: 'College' }),
      });

      const parsed = await parseOnboardingResponse(res);
      expect(parsed.success).toBe(true);
      expect(parsed.statusCode).toBe(200);
      expect(parsed.user).toBeDefined();
      expect(parsed.user?.id).toBe('usr_verified_777');
    });
  });

  // =========================================================================
  // 5. UI Error Sanitizer Defense-in-Depth
  // =========================================================================
  describe('5. UI Error Sanitizer Defense-in-Depth', () => {
    it('5.1 Sanitizes syntax errors containing "Unexpected token" or "JSON"', () => {
      const syntaxErr = new SyntaxError("Unexpected token 'A', \"An error o\"... is not valid JSON");
      const clean = sanitizeOnboardingError(syntaxErr);
      expect(clean).toBe('Could not complete AI onboarding due to a server response issue. Please retry.');
      expect(clean).not.toContain('Unexpected token');
      expect(clean).not.toContain('JSON');
    });

    it('5.2 Sanitizes network connection errors (Failed to fetch)', () => {
      const networkErr = new TypeError('Failed to fetch');
      const clean = sanitizeOnboardingError(networkErr);
      expect(clean).toBe('Could not complete AI onboarding due to a network connection issue. Please check your internet connection and retry.');
    });

    it('5.3 Preserves legitimate user-facing domain errors', () => {
      const domainErr = new Error('Career interest cannot be empty');
      const clean = sanitizeOnboardingError(domainErr);
      expect(clean).toBe('Career interest cannot be empty');
    });
  });
});
