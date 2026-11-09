import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Server } from 'node:http';
import { client } from '../src/lib/db/index.ts';

let server: Server;
let baseUrl: string;
const createdUserEmails: string[] = [];

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
  try {
    await client.execute({
      sql: "DELETE FROM users WHERE email LIKE '%@mindpath.test' OR email LIKE '%challenger%'",
      args: [],
    });
  } catch (err) {
    console.error('Challenger cleanup error', err);
  }
  if (server) {
    server.close();
  }
});

function track(email: string): string {
  createdUserEmails.push(email);
  return email;
}

describe('Challenger M1 Adversarial Stress Harness', () => {

  // =========================================================================
  // 1. Route Alias Parity Oracle
  // =========================================================================
  describe('1. Route Alias Parity Oracle', () => {
    const regEndpoints = ['/api/user/create', '/api/user/register', '/api/register'];
    const loginEndpoints = ['/api/user/login', '/api/login'];

    for (const regPath of regEndpoints) {
      it(`1.1 Registration via alias ${regPath} creates user and enforces contract schema`, async () => {
        const email = track(`challenger_alias_${Date.now()}_${regPath.replace(/\//g, '_')}@mindpath.test`);
        const payload = {
          name: 'Alias Test User',
          email,
          password: 'Password123!',
          educationLevel: 'Postgraduate',
          careerInterest: 'Data Science',
          location: 'San Francisco',
          targetExam: 'GRE',
          bio: 'Challenger verification bio',
        };

        const res = await fetch(`${baseUrl}${regPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(typeof data.user?.id).toBe('string');
        expect(data.user.id.startsWith('user_')).toBe(true);
        expect(data.user.name).toBe('Alias Test User');
        expect(data.user.email).toBe(email.toLowerCase().trim());
        expect(data.user.streakDays).toBe(1);
        expect(data.user.totalStudyHours).toBe(0);
        expect(data.user.onboardingCompleted).toBe(0);
        expect(data.user.educationLevel).toBe('Postgraduate');
        expect(data.user.careerInterest).toBe('Data Science');
        expect(data.user.location).toBe('San Francisco');
        expect(data.user.targetExam).toBe('GRE');
        expect(data.user.bio).toBe('Challenger verification bio');

        // Test duplicate detection on all other aliases
        for (const dupPath of regEndpoints) {
          const dupRes = await fetch(`${baseUrl}${dupPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          expect(dupRes.status).toBe(409);
          const dupData = await dupRes.json();
          expect(dupData.error).toBe('User with this email already exists');
        }

        // Test login on both login aliases
        for (const loginPath of loginEndpoints) {
          const loginRes = await fetch(`${baseUrl}${loginPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: payload.password }),
          });
          expect(loginRes.status).toBe(200);
          const loginData = await loginRes.json();
          expect(loginData.ok).toBe(true);
          expect(loginData.user.id).toBe(data.user.id);
          expect(loginData.user.streakDays).toBe(1);
          expect(loginData.user.bio).toBe('Challenger verification bio');
        }
      });
    }

    for (const loginPath of loginEndpoints) {
      it(`1.2 Login via alias ${loginPath} rejects invalid password with 401`, async () => {
        const email = track(`challenger_badpass_${Date.now()}_${loginPath.replace(/\//g, '_')}@mindpath.test`);
        // Register user
        await fetch(`${baseUrl}/api/user/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Bad Pass Tester', email, password: 'CorrectPassword123!' }),
        });

        const res = await fetch(`${baseUrl}${loginPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'WrongPassword123!' }),
        });
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe('Invalid email or password');
      });
    }
  });

  // =========================================================================
  // 2. Whitespace & Case Normalization Combinatorics
  // =========================================================================
  describe('2. Whitespace & Case Normalization Combinatorics', () => {
    it('2.1 Combinatorial permutations of mixed-case and whitespace-padded email', async () => {
      const ts = Date.now();
      const rawEmail = `  Challenger.Combinatorial_${ts}@MindPath.TEST  `;
      const normalizedEmail = `challenger.combinatorial_${ts}@mindpath.test`;
      track(normalizedEmail);

      const regRes = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '   Combinatorial Tester   ',
          email: rawEmail,
          password: 'ValidPassword123!',
        }),
      });
      expect(regRes.status).toBe(200);
      const regData = await regRes.json();
      expect(regData.user.name).toBe('Combinatorial Tester'); // Trimmed
      expect(regData.user.email).toBe(normalizedEmail);

      // Matrix of login emails: all must succeed with 200
      const emailLoginVariations = [
        normalizedEmail,
        normalizedEmail.toUpperCase(),
        `   ${normalizedEmail}   `,
        `\t${normalizedEmail.toUpperCase()}\n`,
        `  Challenger.Combinatorial_${ts}@mindpath.test  `,
      ];

      for (const candidateEmail of emailLoginVariations) {
        const res = await fetch(`${baseUrl}/api/user/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: candidateEmail, password: 'ValidPassword123!' }),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.user.email).toBe(normalizedEmail);
      }
    });

    it('2.2 Whitespace in password: leading, trailing, and mixed spacing tolerance', async () => {
      const email = track(`challenger_pass_ws_${Date.now()}@mindpath.test`);
      const corePassword = 'Secure#P@ssword2026';
      const paddedPassword = `   ${corePassword}   `;

      const regRes = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Pass WS User',
          email,
          password: paddedPassword,
        }),
      });
      expect(regRes.status).toBe(200);

      // Login permutations that MUST succeed:
      const validVariations = [
        corePassword,
        `   ${corePassword}   `,
        `${corePassword} `,
        ` ${corePassword}`,
        `    ${corePassword}`,
        `${corePassword}    `,
      ];

      for (const passVar of validVariations) {
        const res = await fetch(`${baseUrl}/api/user/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: passVar }),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
      }

      // Password case sensitivity check (MUST FAIL with 401)
      const wrongCasePass = corePassword.toLowerCase();
      const resCase = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: wrongCasePass }),
      });
      expect(resCase.status).toBe(401);
    });

    it('2.3 Passwords with INTERNAL whitespace are preserved and not mangled', async () => {
      const email = track(`challenger_internal_ws_${Date.now()}@mindpath.test`);
      const phrasePass = '  phrase with spaces inside 2026!  ';
      const cleanPhrase = 'phrase with spaces inside 2026!';

      const regRes = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Internal Space User', email, password: phrasePass }),
      });
      expect(regRes.status).toBe(200);

      // Exact internal spaces succeed
      const resExact = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: cleanPhrase }),
      });
      expect(resExact.status).toBe(200);

      // Untrimmed internal spaces succeed
      const resPadded = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: phrasePass }),
      });
      expect(resPadded.status).toBe(200);

      // Tampered internal spaces fail
      const resTampered = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'phrase  with  spaces  inside 2026!' }),
      });
      expect(resTampered.status).toBe(401);
    });
  });

  // =========================================================================
  // 3. Rapid Sequential & Concurrent Stress
  // =========================================================================
  describe('3. Rapid Sequential & Concurrent Stress', () => {
    it('3.1 Rapid burst of 10 sequential registrations and immediate logins', async () => {
      const burstCount = 10;
      const baseTs = Date.now();

      for (let i = 0; i < burstCount; i++) {
        const email = track(`rapid_seq_${baseTs}_${i}@mindpath.test`);
        const password = `RapidSeqPass_${i}_!`;

        // 1. Register
        const rReg = await fetch(`${baseUrl}/api/user/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Rapid User ${i}`,
            email,
            password,
            bio: `Rapid Bio ${i}`,
          }),
        });
        expect(rReg.status).toBe(200);
        const dReg = await rReg.json();
        expect(dReg.ok).toBe(true);
        expect(dReg.user.streakDays).toBe(1);

        // 2. Login immediately
        const rLogin = await fetch(`${baseUrl}/api/user/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        expect(rLogin.status).toBe(200);
        const dLogin = await rLogin.json();
        expect(dLogin.ok).toBe(true);
        expect(dLogin.user.streakDays).toBe(1);
      }
    });

    it('3.2 Concurrent duplicate registration attempts guarantee mutual exclusion', async () => {
      const email = track(`concurrent_dup_${Date.now()}@mindpath.test`);
      const payload = {
        name: 'Concurrent Dup User',
        email,
        password: 'Password123!',
      };

      // Dispatch 5 simultaneous registration requests for the same email
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          fetch(`${baseUrl}/api/user/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).then(async (r) => ({
            status: r.status,
            data: await r.json(),
          }))
        )
      );

      // Exactly 1 must succeed with 200 (or if all race before insert, 200 for the first to commit)
      const successCount = results.filter((r) => r.status === 200).length;
      const conflictCount = results.filter((r) => r.status === 409).length;

      // No server 500 error allowed
      const error500 = results.filter((r) => r.status >= 500);
      expect(error500.length).toBe(0);

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(4);

      // Direct DB verification: exactly one record exists in Turso DB
      const dbCheck = await client.execute({
        sql: 'SELECT COUNT(*) as count FROM users WHERE LOWER(TRIM(email)) = ?',
        args: [email.toLowerCase()],
      });
      expect(Number(dbCheck.rows[0].count)).toBe(1);
    });

    it('3.3 Concurrent registrations for distinct users succeed without ID collisions', async () => {
      const count = 5;
      const ts = Date.now();
      const distinctUsers = Array.from({ length: count }, (_, i) => ({
        name: `Distinct User ${i}`,
        email: track(`concurrent_dist_${ts}_${i}@mindpath.test`),
        password: `DistinctPass_${i}_!`,
      }));

      const results = await Promise.all(
        distinctUsers.map((u) =>
          fetch(`${baseUrl}/api/user/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(u),
          }).then(async (r) => ({
            status: r.status,
            data: await r.json(),
          }))
        )
      );

      for (const r of results) {
        expect(r.status).toBe(200);
        expect(r.data.ok).toBe(true);
      }

      // Verify all created IDs are unique
      const ids = results.map((r) => r.data.user.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(count);
    });
  });

  // =========================================================================
  // 4. Adversarial Payload & Boundary Rejections
  // =========================================================================
  describe('4. Adversarial Payload & Boundary Rejections', () => {
    it('4.1 Registration rejects malformed, empty, or wrong-type inputs with 400', async () => {
      const badInputs = [
        { payload: {}, desc: 'Empty object' },
        { payload: { name: '   ', email: 'valid@mindpath.test', password: 'Password123!' }, desc: 'Whitespace name' },
        { payload: { name: 12345, email: 'valid@mindpath.test', password: 'Password123!' }, desc: 'Numeric name' },
        { payload: { name: 'Valid Name', email: 'not-an-email', password: 'Password123!' }, desc: 'Invalid email format' },
        { payload: { name: 'Valid Name', email: 12345, password: 'Password123!' }, desc: 'Numeric email' },
        { payload: { name: 'Valid Name', email: 'valid@mindpath.test', password: 123456 }, desc: 'Numeric password' },
        { payload: { name: 'Valid Name', email: 'valid@mindpath.test', password: null }, desc: 'Null password' },
        { payload: { name: 'Valid Name', email: 'valid@mindpath.test', password: '123' }, desc: 'Password too short (<6)' },
        { payload: { name: 'Valid Name', email: 'valid@mindpath.test', password: 'a'.repeat(129) }, desc: 'Password too long (>128)' },
        { payload: { name: 'a'.repeat(81), email: 'valid@mindpath.test', password: 'Password123!' }, desc: 'Name too long (>80)' },
      ];

      for (const { payload, desc } of badInputs) {
        const res = await fetch(`${baseUrl}/api/user/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(typeof data.error).toBe('string');
        expect(data.error.length).toBeGreaterThan(0);
      }
    });

    it('4.2 Login rejects malformed, empty, or wrong-type inputs with 400', async () => {
      const badLogins = [
        { payload: {}, desc: 'Empty object' },
        { payload: { email: '', password: 'Password123!' }, desc: 'Empty email' },
        { payload: { email: 'not-an-email', password: 'Password123!' }, desc: 'Invalid email format' },
        { payload: { email: 'test@mindpath.test', password: '' }, desc: 'Empty password' },
        { payload: { email: 'test@mindpath.test', password: null }, desc: 'Null password' },
        { payload: { email: 'test@mindpath.test', password: 123456 }, desc: 'Numeric password' },
      ];

      for (const { payload, desc } of badLogins) {
        const res = await fetch(`${baseUrl}/api/user/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(typeof data.error).toBe('string');
      }
    });

    it('4.3 Non-existent user login returns 401 with generic error (no account enumeration)', async () => {
      const res = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `nonexistent_${Date.now()}@mindpath.test`, password: 'Password123!' }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid email or password');
    });

    it('4.4 Request with no Content-Type or non-JSON body returns 400 gracefully without 500 TypeError', async () => {
      const res = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'just raw plain text',
      });
      // req.body is undefined or empty object, so destructuring handles it and field check returns 400
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('required');
    });
  });
});
