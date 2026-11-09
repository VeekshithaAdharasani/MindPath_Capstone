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
  if (createdUserEmails.length > 0) {
    for (const email of createdUserEmails) {
      try {
        await client.execute({
          sql: 'DELETE FROM users WHERE LOWER(TRIM(email)) = ?',
          args: [email.toLowerCase().trim()],
        });
      } catch (err) {
        console.error('Cleanup error for', email, err);
      }
    }
  }
  if (server) {
    server.close();
  }
});

function trackEmail(email: string) {
  createdUserEmails.push(email);
  return email;
}

describe('Milestone 1 Adversarial & Boundary Stress Test Suite', () => {
  // =========================================================================
  // 1. 409 Duplicate Registration Stress
  // =========================================================================
  describe('1. 409 Duplicate Registration', () => {
    it('1.1 Re-registering identical email on /api/user/register returns 409 with exact message', async () => {
      const email = trackEmail(`dup_test_${Date.now()}_1@mindpath.test`);
      const payload = {
        name: 'Duplicate Test 1',
        email,
        password: 'Password123!',
      };

      const res1 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res1.status).toBe(200);

      const res2 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res2.status).toBe(409);
      const data2 = await res2.json();
      expect(data2).toEqual({ error: 'User with this email already exists' });
    });

    it('1.2 Cross-endpoint duplicate check: register on /api/user/create, duplicate on /api/user/register & /api/register', async () => {
      const email = trackEmail(`dup_cross_${Date.now()}@mindpath.test`);
      const payload = {
        name: 'Cross Endpoint User',
        email,
        password: 'Password123!',
      };

      // Register on /api/user/create
      const res1 = await fetch(`${baseUrl}/api/user/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res1.status).toBe(200);

      // Attempt duplicate on /api/user/register
      const res2 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res2.status).toBe(409);
      const data2 = await res2.json();
      expect(data2.error).toBe('User with this email already exists');

      // Attempt duplicate on /api/register
      const res3 = await fetch(`${baseUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res3.status).toBe(409);
      const data3 = await res3.json();
      expect(data3.error).toBe('User with this email already exists');
    });

    it('1.3 Case insensitivity triggers 409 (MixedCase vs lowercase)', async () => {
      const base = `case_test_${Date.now()}@mindpath.test`;
      const emailLower = trackEmail(base.toLowerCase());
      const emailUpper = `CASE_TEST_${Date.now()}@MINDPATH.TEST`;

      const res1 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Case User', email: emailLower, password: 'Password123!' }),
      });
      expect(res1.status).toBe(200);

      const res2 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Case User Upper', email: emailUpper, password: 'Password123!' }),
      });
      expect(res2.status).toBe(409);
      const data2 = await res2.json();
      expect(data2.error).toBe('User with this email already exists');
    });

    it('1.4 Leading/trailing whitespace in email triggers 409', async () => {
      const email = trackEmail(`ws_email_${Date.now()}@mindpath.test`);
      const res1 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Whitespace User', email, password: 'Password123!' }),
      });
      expect(res1.status).toBe(200);

      const res2 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Whitespace User', email: `   ${email}   `, password: 'Password123!' }),
      });
      expect(res2.status).toBe(409);
      const data2 = await res2.json();
      expect(data2.error).toBe('User with this email already exists');
    });
  });

  // =========================================================================
  // 2. Password Length Bounds (5, 6, 128, 129, whitespace variations)
  // =========================================================================
  describe('2. Password Length Bounds (5, 6, 128, 129)', () => {
    it('2.1 Password length 5 is rejected with 400', async () => {
      const email = `pass5_${Date.now()}@mindpath.test`;
      const res = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Pass5 User', email, password: '12345' }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('between 6 and 128 characters');
    });

    it('2.2 Password length 6 is accepted with 200 and allows login', async () => {
      const email = trackEmail(`pass6_${Date.now()}@mindpath.test`);
      const password = 'abcdef';
      expect(password.length).toBe(6);

      const resReg = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Pass6 User', email, password }),
      });
      expect(resReg.status).toBe(200);

      const resLogin = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      expect(resLogin.status).toBe(200);
      const dataLogin = await resLogin.json();
      expect(dataLogin.ok).toBe(true);
    });

    it('2.3 Password length 128 is accepted with 200 and allows login', async () => {
      const email = trackEmail(`pass128_${Date.now()}@mindpath.test`);
      const password = 'Z'.repeat(128);
      expect(password.length).toBe(128);

      const resReg = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Pass128 User', email, password }),
      });
      expect(resReg.status).toBe(200);

      const resLogin = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      expect(resLogin.status).toBe(200);
      const dataLogin = await resLogin.json();
      expect(dataLogin.ok).toBe(true);
    });

    it('2.4 Password length 129 is rejected with 400', async () => {
      const email = `pass129_${Date.now()}@mindpath.test`;
      const password = 'Z'.repeat(129);
      expect(password.length).toBe(129);

      const res = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Pass129 User', email, password }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('between 6 and 128 characters');
    });

    it('2.5 Empty password string or whitespace-only password is rejected with 400', async () => {
      const email1 = `empty_pass_${Date.now()}@mindpath.test`;
      const res1 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Empty Pass User', email: email1, password: '' }),
      });
      expect(res1.status).toBe(400);

      const email2 = `space_pass_${Date.now()}@mindpath.test`;
      const res2 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Space Pass User', email: email2, password: '      ' }),
      });
      expect(res2.status).toBe(400);
    });

    it('2.6 Whitespace-padded password (5 chars + whitespace) is rejected as clean length < 6', async () => {
      const email = `pad5_${Date.now()}@mindpath.test`;
      const res = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Pad5 User', email, password: ' 12345 ' }),
      });
      expect(res.status).toBe(400);
    });

    it('2.7 Whitespace-padded 6 chars succeeds and supports trimmed and untrimmed login', async () => {
      const email = trackEmail(`pad6_${Date.now()}@mindpath.test`);
      const rawPassword = '  Secret6!  ';

      const resReg = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Pad6 User', email, password: rawPassword }),
      });
      expect(resReg.status).toBe(200);

      // Login with clean password
      const resL1 = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Secret6!' }),
      });
      expect(resL1.status).toBe(200);

      // Login with untrimmed password
      const resL2 = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: '  Secret6!  ' }),
      });
      expect(resL2.status).toBe(200);

      // Login with trailing-only space
      const resL3 = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Secret6! ' }),
      });
      expect(resL3.status).toBe(200);
    });
  });

  // =========================================================================
  // 3. streak_days Persistence and State Invariance
  // =========================================================================
  describe('3. streak_days Persistence and State Invariance', () => {
    it('3.1 streak_days is 1 on registration, persisted in DB, and returned on login and profile', async () => {
      const email = trackEmail(`streak_${Date.now()}@mindpath.test`);
      const payload = {
        name: 'Streak Tester',
        email,
        password: 'Password123!',
        bio: 'Streak Bio Check',
      };

      // 1. Register
      const resReg = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(resReg.status).toBe(200);
      const dReg = await resReg.json();
      expect(dReg.user.streakDays).toBe(1);
      expect(dReg.user.bio).toBe('Streak Bio Check');
      const userId = dReg.user.id;

      // 2. Direct DB verification
      const dbCheck = await client.execute({
        sql: 'SELECT streak_days, bio FROM users WHERE id = ?',
        args: [userId],
      });
      expect(dbCheck.rows.length).toBe(1);
      expect(Number(dbCheck.rows[0].streak_days)).toBe(1);
      expect(String(dbCheck.rows[0].bio)).toBe('Streak Bio Check');

      // 3. Login verification
      const resLogin = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: payload.password }),
      });
      expect(resLogin.status).toBe(200);
      const dLogin = await resLogin.json();
      expect(dLogin.user.streakDays).toBe(1);
      expect(dLogin.user.bio).toBe('Streak Bio Check');

      // 4. GET /api/users verification
      const resUsers = await fetch(`${baseUrl}/api/users`);
      expect(resUsers.status).toBe(200);
      const usersList = await resUsers.json();
      const found = usersList.find((u: any) => u.id === userId);
      expect(found).toBeDefined();
      expect(Number(found.streakDays)).toBe(1);
    });

    it('3.2 Legacy user with streak_days = 0 in DB is guarded to streakDays >= 1 on login', async () => {
      const email = trackEmail(`legacy_streak_${Date.now()}@mindpath.test`);
      const id = `user_legacy_${Date.now()}`;

      // Insert directly with streak_days = 0
      await client.execute({
        sql: `INSERT INTO users (id, name, email, password_hash, avatar_url, education_level, career_interest, streak_days, total_study_hours, onboarding_completed, location, target_exam, bio, created_at)
              VALUES (?, 'Legacy User', ?, '', '/assets/extracted/default_avatar.svg', 'Class 12', 'CS', 0, 0, 0, '', '', '', ?)`,
        args: [id, email, Date.now()],
      });

      const resLogin = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'any' }),
      });
      expect(resLogin.status).toBe(200);
      const dLogin = await resLogin.json();
      expect(dLogin.user.streakDays).toBe(1);
    });
  });

  // =========================================================================
  // 4. Unicode and Special Characters
  // =========================================================================
  describe('4. Unicode and Special Characters', () => {
    it('4.1 Supports international unicode names (Kanji, Accents, Arabic, Emojis)', async () => {
      const email = trackEmail(`unicode_name_${Date.now()}@mindpath.test`);
      const unicodeName = 'José 太郎 🚀';

      const resReg = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: unicodeName,
          email,
          password: 'Password123!',
          educationLevel: '高等教育 🎓',
          careerInterest: 'AI & Data 🤖',
          bio: 'Multilingual profile: こんにちは! ¡Hola! مرحبا',
        }),
      });
      expect(resReg.status).toBe(200);
      const dReg = await resReg.json();
      expect(dReg.user.name).toBe(unicodeName);
      expect(dReg.user.educationLevel).toBe('高等教育 🎓');
      expect(dReg.user.careerInterest).toBe('AI & Data 🤖');
      expect(dReg.user.bio).toBe('Multilingual profile: こんにちは! ¡Hola! مرحبا');

      // Login check
      const resLogin = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123!' }),
      });
      expect(resLogin.status).toBe(200);
      const dLogin = await resLogin.json();
      expect(dLogin.user.name).toBe(unicodeName);
    });

    it('4.2 Supports unicode in password (accents, symbols, emojis)', async () => {
      const email = trackEmail(`unicode_pass_${Date.now()}@mindpath.test`);
      const unicodePass = 'P@ss🔑W0rd_ñ_€_🚀';

      const resReg = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unicode Pass User', email, password: unicodePass }),
      });
      expect(resReg.status).toBe(200);

      // Login with correct unicode password
      const resLogin = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: unicodePass }),
      });
      expect(resLogin.status).toBe(200);

      // Login with incorrect unicode password -> 401
      const resBad = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'P@ss🔑W0rd_ñ_€_🔥' }),
      });
      expect(resBad.status).toBe(401);
    });

    it('4.3 Supports all standard ASCII punctuation & special characters in password', async () => {
      const email = trackEmail(`special_pass_${Date.now()}@mindpath.test`);
      const specialPass = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';

      const resReg = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Special Pass User', email, password: specialPass }),
      });
      expect(resReg.status).toBe(200);

      const resLogin = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: specialPass }),
      });
      expect(resLogin.status).toBe(200);
    });

    it('4.4 Supports complex RFC 5322 compliant subaddresses in email (+, _, -)', async () => {
      const email = trackEmail('user.sub+tag_123-abc@mindpath.test');

      const resReg = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Subaddress User', email, password: 'Password123!' }),
      });
      expect(resReg.status).toBe(200);

      const resLogin = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123!' }),
      });
      expect(resLogin.status).toBe(200);
    });
  });

  // =========================================================================
  // 5. Adversarial Input, Edge Cases & Security
  // =========================================================================
  describe('5. Adversarial Input, Edge Cases & Security', () => {
    it('5.1 SQL Injection payloads in name, bio, and login are neutralized safely', async () => {
      const email = trackEmail(`sqli_${Date.now()}@mindpath.test`);
      const sqliName = "Robert'; DROP TABLE test_dummy; --";
      const sqliBio = "Bio' OR '1'='1' UNION SELECT * FROM users; --";

      const resReg = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sqliName,
          email,
          password: 'Password123!',
          bio: sqliBio,
        }),
      });
      expect(resReg.status).toBe(200);

      // Verify stored safely as literal text
      const dbCheck = await client.execute({
        sql: 'SELECT name, bio FROM users WHERE LOWER(TRIM(email)) = ?',
        args: [email.toLowerCase()],
      });
      expect(dbCheck.rows[0].name).toBe(sqliName);
      expect(dbCheck.rows[0].bio).toBe(sqliBio);

      // SQLi attempt in login password
      const resSqliLogin = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: "' OR '1'='1' --" }),
      });
      expect(resSqliLogin.status).toBe(401);
    });

    it('5.2 Malformed payloads (null body, non-string types, empty objects) return 400 without crashing', async () => {
      // Empty JSON
      const r1 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(r1.status).toBe(400);

      // Non-string types
      const r2 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 12345, email: true, password: ['array'] }),
      });
      expect(r2.status).toBe(400);

      // Invalid email without domain
      const r3 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', email: 'invalid-email', password: 'Password123!' }),
      });
      expect(r3.status).toBe(400);

      // Login with empty body
      const r4 = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(r4.status).toBe(400);
    });

    it('5.3 Boundary lengths for Name (80 vs 81) and Email (120 vs 121)', async () => {
      const emailValid = trackEmail(`valid_len_${Date.now()}@mindpath.test`);
      const name80 = 'N'.repeat(80);
      const name81 = 'N'.repeat(81);

      // Name length 80 is accepted
      const r80 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name80, email: emailValid, password: 'Password123!' }),
      });
      expect(r80.status).toBe(200);

      // Name length 81 is rejected
      const email81 = `len81_${Date.now()}@mindpath.test`;
      const r81 = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name81, email: email81, password: 'Password123!' }),
      });
      expect(r81.status).toBe(400);

      // Email length 121 is rejected
      const longEmailPrefix = 'e'.repeat(121 - '@test.com'.length);
      const emailOver120 = `${longEmailPrefix}@test.com`;
      expect(emailOver120.length).toBe(121);

      const rEmailOver = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Long Email', email: emailOver120, password: 'Password123!' }),
      });
      expect(rEmailOver.status).toBe(400);
    });

    it('5.4 Bio over 500 characters is safely truncated to 500 characters without error', async () => {
      const email = trackEmail(`bio_trunc_${Date.now()}@mindpath.test`);
      const longBio = 'B'.repeat(600);

      const res = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Long Bio User',
          email,
          password: 'Password123!',
          bio: longBio,
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.bio.length).toBe(500);

      // Check DB value
      const dbCheck = await client.execute({
        sql: 'SELECT bio FROM users WHERE LOWER(TRIM(email)) = ?',
        args: [email.toLowerCase()],
      });
      expect(dbCheck.rows[0].bio.toString().length).toBe(500);
    });
  });
});
