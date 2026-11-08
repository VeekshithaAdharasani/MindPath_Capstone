import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { enzonicChat, enzonicStream } from './src/lib/ai/chat.ts';
import { ProfileUpdateSchema, WhatIfScenarioSchema } from './src/lib/ai/schemas.ts';
import {
  addStudyTaskDirectly,
  analyzeSkillGaps,
  generateConceptDiagram,
  getCareerMarketData,
  getFrontierAIModelsData,
  getStudentProfileContext,
  performWebSearch,
  reviewResumeProject,
  setStudyReminderDirectly,
  simulateMockInterview,
  solveAcademicCalculation,
} from './src/lib/ai/tools.ts';
import { client, initDatabase } from './src/lib/db/index.ts';
import { uploadToR2 } from './src/lib/storage/r2.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Disable server identity header
app.disable('x-powered-by');

// Enable Gzip/Deflate compression for fast loading of all JS, CSS, JSON, and HTML
app.use(
  compression({
    threshold: 512,
  })
);

// High-speed caching for public static assets
app.use(
  '/assets',
  express.static(path.resolve(__dirname, 'public/assets'), {
    maxAge: '7d',
    etag: true,
  })
);

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite development and internal styles/scripts
    crossOriginEmbedderPolicy: false,
  })
);

// Standard JSON body parser with safe limit
app.use(express.json({ limit: '5mb' }));

// -------------------------------------------------------------
// RATE LIMITING PROTECTION (DDoS / Resource Exhaustion Guard)
// -------------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in a minute.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 45,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit reached. Please wait a few seconds before trying again.' },
});

const storageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'File upload rate limit reached. Please try again shortly.' },
});

app.use('/api/', apiLimiter);
app.use('/api/ai/', aiLimiter);
app.use('/api/storage/', storageLimiter);

// Initialize DB schema & seed data
initDatabase().catch(console.error);

function getUserId(req: express.Request): string {
  const rawId =
    (req.query.userId as string) ||
    (req.headers['x-user-id'] as string) ||
    (req.body?.userId as string) ||
    '';
  // Sanitize user ID to safe characters
  return String(rawId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
}

function resolveUserId(req: express.Request): string {
  return getUserId(req);
}

// -------------------------------------------------------------
// PASSWORD CRYPTOGRAPHY HELPERS (scrypt + timingSafeEqual)
// -------------------------------------------------------------
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash?.includes(':')) return false;
  try {
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// USER / AUTH / PROFILE APIS (Turso DB)
// -------------------------------------------------------------
app.get('/api/users', async (_req, res) => {
  try {
    const result = await client.execute('SELECT id, name, email, avatar_url as avatarUrl, education_level as educationLevel, career_interest as careerInterest, streak_days as streakDays, total_study_hours as totalStudyHours, created_at as createdAt FROM users ORDER BY created_at DESC');
    return res.json(result.rows);
  } catch (err: any) {
    console.error('Fetch users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/user/create', async (req, res) => {
  try {
    const { name, email, password, educationLevel, careerInterest, avatarUrl } = req.body;
    if (!name || typeof name !== 'string' || !name.trim() || name.length > 80) {
      return res.status(400).json({ error: 'Valid name (1-80 characters) is required' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 120) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Password is required and must be between 6 and 128 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if account already exists
    const existing = await client.execute({
      sql: 'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
      args: [cleanEmail],
    });
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const cleanAvatar = (avatarUrl && typeof avatarUrl === 'string' && (/^\/assets\//.test(avatarUrl) || /^https:\/\//.test(avatarUrl)))
      ? avatarUrl.slice(0, 300)
      : '/assets/extracted/default_avatar.svg';

    const passwordHash = hashPassword(password);
    const id = `user_${Date.now()}`;
    await client.execute({
      sql: 'INSERT INTO users (id, name, email, password_hash, avatar_url, education_level, career_interest, streak_days, total_study_hours, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)',
      args: [
        id,
        name.trim(),
        cleanEmail,
        passwordHash,
        cleanAvatar,
        String(educationLevel || 'Class 12').slice(0, 50),
        String(careerInterest || 'Computer Science').slice(0, 50),
        Date.now(),
      ],
    });
    return res.json({
      ok: true,
      user: {
        id,
        name: name.trim(),
        email: cleanEmail,
        avatarUrl: cleanAvatar,
        educationLevel: educationLevel || 'Class 12',
        careerInterest: careerInterest || 'Computer Science',
        streakDays: 1,
        totalStudyHours: 0,
      },
    });
  } catch (err: any) {
    console.error('Create user error:', err);
    return res.status(500).json({ error: 'Failed to create user account' });
  }
});

app.post('/api/user/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required to sign in' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
      args: [cleanEmail],
    });
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const u: any = result.rows[0];

    // If user has a password_hash, verify it
    if (u.password_hash) {
      const isValid = verifyPassword(password, u.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    return res.json({
      ok: true,
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatar_url,
        educationLevel: u.education_level,
        careerInterest: u.career_interest,
        streakDays: u.streak_days,
        totalStudyHours: u.total_study_hours,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

app.get('/api/user', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(404).json({ error: 'User ID required' });
  }
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [userId],
    });
    if (result.rows.length > 0) {
      const u = result.rows[0];
      return res.json({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatar_url,
        educationLevel: u.education_level,
        careerInterest: u.career_interest,
        streakDays: u.streak_days,
        totalStudyHours: u.total_study_hours,
      });
    }
    return res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/user', async (req, res) => {
  const userId = getUserId(req);
  try {
    const parsed = ProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }
    const { name, email, educationLevel, careerInterest, avatarUrl } = parsed.data;

    await client.execute({
      sql: `UPDATE users SET name = ?, email = ?, education_level = ?, career_interest = ?${avatarUrl ? ', avatar_url = ?' : ''} WHERE id = ?`,
      args: avatarUrl
        ? [name, email, educationLevel, careerInterest, avatarUrl, userId]
        : [name, email, educationLevel, careerInterest, userId],
    });

    return res.json({ ok: true, message: 'Profile updated in Turso' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Change Password API with scrypt cryptographic verification
app.post('/api/user/change-password', async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'Current password is required' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const result = await client.execute({
      sql: 'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
      args: [userId],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const u: any = result.rows[0];
    if (u.password_hash) {
      const isValid = verifyPassword(currentPassword, u.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password does not match' });
      }
    }

    const newHash = hashPassword(newPassword);
    await client.execute({
      sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
      args: [newHash, userId],
    });

    return res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Data Export API (Download student learning records)
app.get('/api/user/export-data', async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const userRes = await client.execute({ sql: 'SELECT id, name, email, education_level, career_interest, streak_days, total_study_hours, created_at FROM users WHERE id = ?', args: [userId] });
    const tasksRes = await client.execute({ sql: 'SELECT * FROM tasks WHERE user_id = ?', args: [userId] });
    const milestonesRes = await client.execute({ sql: 'SELECT * FROM milestones WHERE user_id = ?', args: [userId] });
    const remindersRes = await client.execute({ sql: 'SELECT * FROM reminders WHERE user_id = ?', args: [userId] });
    const testsRes = await client.execute({ sql: 'SELECT * FROM assessments WHERE user_id = ?', args: [userId] });

    return res.json({
      exportTimestamp: new Date().toISOString(),
      studentProfile: userRes.rows[0] || null,
      tasks: tasksRes.rows,
      milestones: milestonesRes.rows,
      reminders: remindersRes.rows,
      assessments: testsRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// TASKS APIS (Turso DB)
// -------------------------------------------------------------
app.get('/api/tasks', async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM tasks WHERE user_id = ? ORDER BY order_index ASC',
      args: [userId],
    });
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/toggle', async (req, res) => {
  const userId = await resolveUserId(req);
  const { id, completed } = req.body;
  if (!id) return res.status(400).json({ error: 'Task ID is required' });
  try {
    await client.execute({
      sql: 'UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?',
      args: [completed ? 1 : 0, id, userId],
    });
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('Task toggle error:', err);
    return res.status(500).json({ error: 'Failed to update task state' });
  }
});

app.post('/api/tasks', async (req, res) => {
  const userId = await resolveUserId(req);
  const { title, timeText, duration, category } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required' });
  }
  const id = `task-${Date.now()}`;
  const effectiveTime = String(timeText || duration || 'Today • 30 min').slice(0, 50);
  try {
    await client.execute({
      sql: 'INSERT INTO tasks (id, user_id, title, time_text, category, completed, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [id, userId, title.trim().slice(0, 200), effectiveTime, String(category || 'Tasks').slice(0, 50), 0, 99, Date.now()],
    });
    return res.json({ ok: true, id, title: title.trim(), time_text: effectiveTime, category: category || 'Tasks', completed: 0 });
  } catch (err: any) {
    console.error('Create task error:', err);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const userId = await resolveUserId(req);
  const { id } = req.params;
  try {
    await client.execute({
      sql: 'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('Delete task error:', err);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});

// -------------------------------------------------------------
// MILESTONES / ROADMAP APIS (Turso DB)
// -------------------------------------------------------------
app.get('/api/milestones', async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM milestones WHERE user_id = ? ORDER BY order_index ASC',
      args: [userId],
    });
    return res.json(result.rows);
  } catch (err: any) {
    console.error('Fetch milestones error:', err);
    return res.status(500).json({ error: 'Failed to fetch milestones' });
  }
});

app.post('/api/milestones', async (req, res) => {
  const userId = await resolveUserId(req);
  const { title, timeText, iconType, status } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Milestone title is required' });
  }
  const id = `ms-${Date.now()}`;
  try {
    await client.execute({
      sql: 'INSERT INTO milestones (id, user_id, title, time_text, status, icon_type, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, userId, title.trim().slice(0, 200), String(timeText || 'Target: 4 weeks').slice(0, 50), String(status || 'active').slice(0, 20), String(iconType || 'book').slice(0, 20), 99],
    });
    return res.json({ ok: true, id });
  } catch (err: any) {
    console.error('Create milestone error:', err);
    return res.status(500).json({ error: 'Failed to create milestone' });
  }
});

// -------------------------------------------------------------
// REMINDERS APIS (Turso DB)
// -------------------------------------------------------------
app.get('/api/reminders', async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM reminders WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    });
    return res.json(result.rows);
  } catch (err: any) {
    console.error('Fetch reminders error:', err);
    return res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

app.post('/api/reminders', async (req, res) => {
  const userId = await resolveUserId(req);
  const { title, timeText, category } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Reminder title is required' });
  }
  const id = `rem-${Date.now()}`;
  try {
    await client.execute({
      sql: 'INSERT INTO reminders (id, user_id, title, time_text, category, enabled, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
      args: [id, userId, title.trim().slice(0, 200), String(timeText || '').slice(0, 50), String(category || 'Tasks').slice(0, 50), Date.now()],
    });
    return res.json({ ok: true, id });
  } catch (err: any) {
    console.error('Create reminder error:', err);
    return res.status(500).json({ error: 'Failed to create reminder' });
  }
});

app.post('/api/reminders/toggle', async (req, res) => {
  const userId = await resolveUserId(req);
  const { id, enabled } = req.body;
  if (!id) return res.status(400).json({ error: 'Reminder ID is required' });
  try {
    await client.execute({
      sql: 'UPDATE reminders SET enabled = ? WHERE id = ? AND user_id = ?',
      args: [enabled ? 1 : 0, id, userId],
    });
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('Toggle reminder error:', err);
    return res.status(500).json({ error: 'Failed to toggle reminder' });
  }
});

app.delete('/api/reminders/:id', async (req, res) => {
  const userId = await resolveUserId(req);
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'Reminder ID is required' });
  try {
    await client.execute({
      sql: 'DELETE FROM reminders WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('Delete reminder error:', err);
    return res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

// -------------------------------------------------------------
// QUIZ ATTEMPTS & PROGRESS APIS (Turso DB)
// -------------------------------------------------------------
app.get('/api/quizzes/attempts', async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY completed_at DESC',
      args: [userId],
    });
    return res.json(result.rows);
  } catch (err: any) {
    console.error('Fetch quiz attempts error:', err);
    return res.status(500).json({ error: 'Failed to fetch quiz attempts' });
  }
});

app.post('/api/quizzes/clear', async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    await client.execute({
      sql: 'DELETE FROM quiz_attempts WHERE user_id = ?',
      args: [userId],
    });
    return res.json({ ok: true, message: 'All quiz attempts cleared' });
  } catch (err: any) {
    console.error('Clear quiz attempts error:', err);
    return res.status(500).json({ error: 'Failed to clear quiz attempts' });
  }
});

app.post('/api/quizzes/attempt', async (req, res) => {
  const userId = getUserId(req);
  const { quizTitle, category, score, totalQuestions, weakTopics } = req.body;
  if (!quizTitle || typeof score !== 'number' || typeof totalQuestions !== 'number' || totalQuestions <= 0 || score < 0) {
    return res.status(400).json({ error: 'Valid quiz Title, score, and totalQuestions are required' });
  }
  const id = `attempt-${Date.now()}`;
  const weakStr = Array.isArray(weakTopics) ? weakTopics.join(',') : (typeof weakTopics === 'string' ? weakTopics : '');
  try {
    await client.execute({
      sql: 'INSERT INTO quiz_attempts (id, user_id, quiz_title, category, score, total_questions, weak_topics, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [id, userId, String(quizTitle).slice(0, 150), String(category || 'General').slice(0, 50), Math.round(score), Math.round(totalQuestions), weakStr.slice(0, 300), Date.now()],
    });
    return res.json({ ok: true, id });
  } catch (err: any) {
    console.error('Save quiz attempt error:', err);
    return res.status(500).json({ error: 'Failed to save quiz attempt' });
  }
});

// -------------------------------------------------------------
// CLOUDFLARE R2 FILE STORAGE API (Hardened Multi-Layer Verification)
// -------------------------------------------------------------
function validateImageBufferSignature(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;
  if (mime === 'image/jpeg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  if (mime === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }
  if (mime === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

app.post('/api/storage/upload', async (req, res) => {
  try {
    const { filename, base64Data, contentType } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ error: 'filename and base64Data required' });
    }

    const mime = String(contentType || 'image/png').toLowerCase().trim();
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_MIME.includes(mime)) {
      return res.status(400).json({ error: 'Only image/jpeg, image/png, and image/webp are permitted' });
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Restrict avatar file size to 2MB to prevent storage DOS
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum 2MB avatar limit' });
    }

    // Verify true magic byte signature
    if (!validateImageBufferSignature(buffer, mime)) {
      return res.status(400).json({ error: 'Uploaded file signature does not match allowed image formats' });
    }

    const safeBase = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 50);
    const key = `avatars/${Date.now()}_${safeBase}`;

    const uploadRes = await uploadToR2(key, buffer, mime);
    return res.json({
      ok: true,
      url: uploadRes.url,
      key: uploadRes.key,
    });
  } catch (err: any) {
    console.error('R2 upload failed:', err);
    return res.status(500).json({ error: 'Failed to securely process and upload file to R2' });
  }
});

// -------------------------------------------------------------
// ENZONIC NVIDIA ROTATOR & AI APIS
// -------------------------------------------------------------
app.get('/api/ai/health', async (_req, res) => {
  try {
    const statusUrl = process.env.ENZONIC_STATUS_URL || 'http://sgp-two.enzonic.com:25836/status';
    const resp = await fetch(statusUrl);
    const data = await resp.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(503).json({ error: 'Rotator health probe failed', message: err?.message });
  }
});

app.get('/api/ai/search', async (req, res) => {
  const q = (req.query.q as string) || '';
  if (!q.trim()) return res.status(400).json({ error: 'Query q required' });
  try {
    const results = await performWebSearch(q);
    return res.json({ query: q, results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  const userId = getUserId(req);
  const { messages, stream, temperature, maxTokens, responseFormat, enableWebSearch, attachments } = req.body;

  if (!messages?.length) {
    return res.status(400).json({ error: 'messages required' });
  }

  // Extract latest user inquiry for intent analysis
  const rawLatest = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
  const latestUserMsg = typeof rawLatest === 'string'
    ? rawLatest
    : (Array.isArray(rawLatest) ? rawLatest.map((p: any) => p.text || '').join(' ') : String(rawLatest || ''));

  let searchResults: any[] = [];
  const toolEvents: any[] = [];
  let augmentedMessages = [...messages];
  let injectedContext = '';

  // 0. Handle Attachments (Multimodal Images & Code/Document Files)
  if (Array.isArray(attachments) && attachments.length > 0) {
    // Process text / code files
    for (const att of attachments) {
      if (att?.dataUrl && !att.type?.startsWith('image/')) {
        try {
          let text = '';
          if (att.dataUrl.includes('base64,')) {
            text = Buffer.from(att.dataUrl.split('base64,')[1], 'base64').toString('utf-8');
          } else {
            text = att.dataUrl;
          }
          injectedContext += `\n\n[USER ATTACHED FILE - "${att.name || 'document'}"]:\n\`\`\`\n${text.slice(0, 15000)}\n\`\`\`\nPlease carefully inspect, analyze, debug, or evaluate this attached file in your answer.\n`;
          toolEvents.push({
            type: 'file_attached',
            query: `Attached: ${att.name || 'file'}`,
          });
        } catch (fErr: any) {
          console.warn('File decode warning:', fErr?.message);
        }
      }
    }

    // Process visual images for multimodal vision models
    const imageParts = attachments
      .filter((a: any) => a?.dataUrl && (a.type?.startsWith('image/') || a.dataUrl.startsWith('data:image/')))
      .map((a: any) => ({
        type: 'image_url',
        image_url: { url: a.dataUrl },
      }));

    if (imageParts.length > 0) {
      injectedContext += `\n\n[USER ATTACHED ${imageParts.length} VISUAL IMAGE(S)]: The user has attached visual image(s)/screenshot(s). Provide visual inspection, analyze code or equations in the image, and provide complete, step-by-step guidance.\n`;
      toolEvents.push({
        type: 'image_attached',
        query: `${imageParts.length} Image(s) Attached for Visual Analysis`,
      });

      // Augment last user message with image parts for vision-capable models
      for (let i = augmentedMessages.length - 1; i >= 0; i--) {
        if (augmentedMessages[i].role === 'user') {
          const originalText = typeof augmentedMessages[i].content === 'string'
            ? augmentedMessages[i].content
            : JSON.stringify(augmentedMessages[i].content);
          augmentedMessages[i] = {
            ...augmentedMessages[i],
            content: [
              { type: 'text', text: originalText },
              ...imageParts,
            ],
          };
          break;
        }
      }
    }
  }

  // 1. Academic Calculator Tool
  if (/\b(cgpa|calculate|math|percentile|percentage|formula|\d+\s*[+\-*/]\s*\d+)\b/i.test(latestUserMsg)) {
    const calc = solveAcademicCalculation(latestUserMsg);
    if (calc.result && !calc.result.includes('Could not calculate')) {
      injectedContext += `\n\n[ACADEMIC SOLVER / CALCULATOR RESULT]:\nInput: ${calc.expression}\nResult: ${calc.result}\nIncorporate this precise calculation directly into your explanation.\n`;
      toolEvents.push({
        type: 'academic',
        query: latestUserMsg,
        citations: [{ title: 'Academic Calculator', url: '#calculator', snippet: calc.result, source: 'academic' }],
      });
    }
  }

  // 2. Direct Task Creation Tool (Turso Cloud DB)
  if (/\b(add task|create task|schedule task|new task|add to my tasks|put on my todo)\b/i.test(latestUserMsg)) {
    const rawTitle = latestUserMsg.replace(/^.*?\b(add task|create task|schedule task|new task|add to my tasks|put on my todo)\s*(:|-|to|for)?\s*/i, '').trim();
    const taskTitle = (rawTitle.split(/[\n.]/)[0] || 'Study Focus Session').slice(0, 100);
    try {
      const created = await addStudyTaskDirectly(userId, taskTitle, 'Today • 45 min', 'Tasks');
      injectedContext += `\n\n[TOOL EXECUTED - TURSO DATABASE TASK CREATED]:\nTask ID: ${created.id}\nTitle: "${created.title}"\nDirectly confirm to the student that you have committed this task into their official MindPath study tasks list.\n`;
      toolEvents.push({
        type: 'task_created',
        title: created.title,
        query: `Study Task Created: "${created.title}"`,
      });
    } catch (tErr: any) {
      console.warn('Add task error:', tErr?.message);
    }
  }

  // 3. Direct Reminder Scheduling Tool (Turso Cloud DB)
  if (/\b(remind me|set reminder|create reminder|schedule reminder)\b/i.test(latestUserMsg)) {
    const rawTitle = latestUserMsg.replace(/^.*?\b(remind me|set reminder|create reminder|schedule reminder)\s*(:|-|to|for)?\s*/i, '').trim();
    const reminderTitle = (rawTitle.split(/[\n.]/)[0] || 'Review Study Target').slice(0, 100);
    try {
      const created = await setStudyReminderDirectly(userId, reminderTitle, 'Today at 6:00 PM', 'Study Target');
      injectedContext += `\n\n[TOOL EXECUTED - TURSO DATABASE REMINDER SCHEDULED]:\nReminder ID: ${created.id}\nTitle: "${created.title}"\nTime: Today at 6:00 PM\nDirectly confirm to the student that you have scheduled this reminder in their MindPath reminders list.\n`;
      toolEvents.push({
        type: 'reminder_created',
        title: created.title,
        time: 'Today at 6:00 PM',
        query: `Reminder Scheduled: "${created.title}"`,
      });
    } catch (rErr: any) {
      console.warn('Set reminder error:', rErr?.message);
    }
  }

  // 4. Skill Gap Analyzer Tool
  if (/\b(skill gap|readiness|benchmark|skills for|am i ready for|gap analysis)\b/i.test(latestUserMsg)) {
    try {
      const targetRole = latestUserMsg.toLowerCase().includes('data')
        ? 'Data Scientist'
        : (latestUserMsg.toLowerCase().includes('cyber') ? 'Cyber Security' : 'AI / Machine Learning Engineer');
      const studentData = await getStudentProfileContext(userId);
      const userTasks = studentData.activeTasks.map((t: any) => t.title);
      const gapData = analyzeSkillGaps(userTasks, targetRole);
      injectedContext += `\n\n[SKILL GAP ANALYZER BENCHMARK]:\nTarget Role: ${gapData.targetRole}\nReadiness Score: ${gapData.readinessScore}\nCompensation: ${gapData.compensationBenchmark}\nMatched Skills: ${gapData.matchedSkills.join(', ') || 'Foundational Concepts'}\nMissing Skills: ${gapData.missingCriticalSkills.join(', ')}\n3-Month Plan:\n${gapData.threeMonthRoadmap.join('\n')}\nIncorporate these exact metrics and roadmap recommendations.\n`;
      toolEvents.push({
        type: 'skill_gap',
        query: `Skill Gap Analysis: ${gapData.targetRole} (${gapData.readinessScore} Match)`,
      });
    } catch (gapErr: any) {
      console.warn('Skill gap error:', gapErr?.message);
    }
  }

  // 5. Mock Interview Simulator Tool
  if (/\b(mock interview|interview me|interview questions?|technical interview)\b/i.test(latestUserMsg)) {
    const role = latestUserMsg.toLowerCase().includes('data')
      ? 'Data Scientist'
      : (latestUserMsg.toLowerCase().includes('react') || latestUserMsg.toLowerCase().includes('web') ? 'Full Stack Developer' : 'AI / Machine Learning Engineer');
    const interviewData = simulateMockInterview(role);
    injectedContext += `\n\n[MOCK INTERVIEW SIMULATOR TOOL]:\nFormat: ${interviewData.interviewFormat} for ${interviewData.role}\nQuestions to present:\n${interviewData.questions.map((q, i) => `${i + 1}. [${q.focus}] ${q.q}\nEvaluation key: ${q.keyPoints.join('; ')}`).join('\n\n')}\nConduct the interview with the student, presenting one question and guiding their response.\n`;
    toolEvents.push({
      type: 'interview_sim',
      query: `Mock Interview Simulator for ${interviewData.role}`,
    });
  }

  // 6. ATS Resume Project Reviewer Tool
  if (/\b(review (my )?resume|review (my )?project|ats score|bullet point)\b/i.test(latestUserMsg)) {
    const review = reviewResumeProject(latestUserMsg, 'AI & Software Engineer');
    injectedContext += `\n\n[ATS RESUME / PROJECT REVIEWER TOOL]:\nATS Impact Score: ${review.atsScore}\nKey Action Items:\n${review.keyImprovements.join('\n')}\nRecommended Bullet Point Rewrite:\n${review.recommendedRewrite}\nProvide this ATS review clearly formatted in markdown.\n`;
    toolEvents.push({
      type: 'resume_review',
      query: `ATS Project Reviewer (Score: ${review.atsScore})`,
    });
  }

  // 7. Concept Diagram Generator Tool
  if (/\b(diagram|flowchart|architecture diagram|mermaid)\b/i.test(latestUserMsg)) {
    const diagram = generateConceptDiagram(latestUserMsg);
    injectedContext += `\n\n[CONCEPT DIAGRAM GENERATOR TOOL]:\n${diagram}\nPresent this diagram to the user with a concise explanation.\n`;
    toolEvents.push({
      type: 'diagram_gen',
      query: `Architecture Diagram Generator`,
    });
  }

  // 8. Student Database Context Tool
  if (/\b(streak|tasks?|my roadmap|my progress|how am i doing|my score|study hours)\b/i.test(latestUserMsg)) {
    try {
      const studentData = await getStudentProfileContext(userId);
      injectedContext += `\n\n[TURSO STUDENT DATABASE RECORD]:\nStudent: ${studentData.name} (${studentData.educationLevel})\nCareer Focus: ${studentData.careerInterest}\nStreak: ${studentData.streakDays} Days\nStudy Hours: ${studentData.totalStudyHours}h\nActive Tasks: ${JSON.stringify(studentData.activeTasks)}\nMilestones: ${JSON.stringify(studentData.milestones || [])}\nRecent Scores: ${JSON.stringify(studentData.recentQuizScores || [])}\nIncorporate these exact live student metrics into your advice.\n`;
      toolEvents.push({
        type: 'database',
        query: 'Turso DB Student Profile',
        citations: [{ title: 'Live Turso Database', url: '#turso-db', snippet: `${studentData.streakDays}d Streak • ${studentData.totalStudyHours}h Study Time`, source: 'academic' }],
      });
    } catch (dbErr: any) {
      console.warn('DB context error:', dbErr?.message);
    }
  }

  // 9. Career Market Intelligence Tool
  if (/\b(compare|salary|market|hiring|role|engineer|developer|data scientist|doctor|ai\/ml)\b/i.test(latestUserMsg)) {
    const careerData = getCareerMarketData(latestUserMsg);
    injectedContext += `\n\n[CAREER MARKET INTELLIGENCE BENCHMARKS]:\nRole: ${careerData.role}\nAverage Salary (India): ${careerData.averageSalaryIndia}\nAverage Salary (US): ${careerData.averageSalaryUS}\nTop Skills: ${careerData.topSkills.join(', ')}\nGrowth Rate: ${careerData.growthRate}\nTop Hiring Companies: ${careerData.topCompanies.join(', ')}\nUse these real-time compensation & skillset figures when advising.\n`;
  }

  // 10. Frontier AI Models Benchmark Tool (Real-time current models)
  if (/\b(todays? ai|current ai|latest ai|best ai|ai models?|llms?|leaderboard|chatbot arena|frontier models?|claude 3\.7|deepseek|gpt-4\.5|o3|o1|gemini 2\.5|what are the todays)\b/i.test(latestUserMsg)) {
    const aiData = getFrontierAIModelsData();
    injectedContext += `\n\n[OFFICIAL 2025/2026 FRONTIER AI MODELS BENCHMARKS & LEADERBOARD]:\n` +
      `Present the CURRENT frontier models:\n` +
      `1. Claude 3.7 Sonnet (Anthropic): Flagship hybrid reasoning, #1 on SWE-bench Verified (70.3%), complex coding.\n` +
      `2. DeepSeek-R1 (DeepSeek): Open-weights reasoning, rivals o1 on AIME & MATH-500 at ultra-low API cost.\n` +
      `3. OpenAI o3-mini & o1 / GPT-4.5 (OpenAI): Test-time compute scaling, Codeforces grandmaster reasoning & frontier synthesis.\n` +
      `4. Gemini 2.5 Pro & Flash (Google DeepMind): 2M context window, native multimodal audio/video understanding.\n` +
      `5. Llama 3.3 70B (Meta): Leading open-weight foundation model.\n` +
      `6. Qwen 2.5 Coder 32B (Alibaba): Top open coding model.\n` +
      `Format this with a clean, well-aligned Markdown table and category winners. Do NOT cite old or hallucinated domains; use official sources.\n` +
      JSON.stringify(aiData, null, 2) + `\n`;

    searchResults = aiData.realSources;
    toolEvents.push({
      type: 'web_search',
      query: 'Frontier AI Models & LMSYS Chatbot Arena Rankings',
      citations: aiData.realSources,
    });
  }

  // 11. Custom Quiz Generator Tool
  if (/\b(create quiz|generate quiz|make (a )?quiz|build quiz|test me on|quiz on|quiz me)\b/i.test(latestUserMsg)) {
    const topic = latestUserMsg.replace(/^.*?\b(create quiz|generate quiz|make (a )?quiz|build quiz|test me on|quiz on|quiz me)\s*(:|-|about|for)?\s*/i, '').trim().slice(0, 60) || 'Custom Assessment';
    injectedContext += `\n\n[TOOL EXECUTED - INTERACTIVE QUIZ ARCHITECT]:\n` +
      `The student requested an interactive quiz on "${topic}".\n` +
      `Generate 3 to 4 multiple-choice questions with 4 distinct choices, marking the correct answer and providing a detailed explanation for each.\n` +
      `Present it cleanly in markdown.\n`;
    toolEvents.push({
      type: 'quiz_created',
      title: `Practice Quiz: ${topic}`,
      query: `Generated Interactive Quiz on ${topic}`,
    });
  }

  // 12. Custom Course & Syllabus Architect Tool
  if (/\b(create course|generate course|make (a )?course|build course|teach me|roadmap for|syllabus for)\b/i.test(latestUserMsg)) {
    const courseTitle = latestUserMsg.replace(/^.*?\b(create course|generate course|make (a )?course|build course|teach me|roadmap for|syllabus for)\s*(:|-|about|for)?\s*/i, '').trim().slice(0, 70) || 'Personalized Skill Track';
    injectedContext += `\n\n[TOOL EXECUTED - CUSTOM COURSE ARCHITECT]:\n` +
      `The student requested a structured course on "${courseTitle}".\n` +
      `Provide a structured curriculum with Module 1 (Foundations), Module 2 (Advanced Applications), and a Capstone Project with actionable code examples.\n`;
    toolEvents.push({
      type: 'course_created',
      title: `Course: ${courseTitle}`,
      query: `Synthesized Curriculum for ${courseTitle}`,
    });
  }

  // 13. Intelligent Web Search (Auto use web search ONLY when required)
  const cleanTrimmed = latestUserMsg.trim().toLowerCase();
  const isGreetingOrCasual =
    /^(hi|hey|hello|hola|yo|sup|thanks|thank you|thx|k|ok|okay|cool|good morning|good evening|good afternoon|bye|goodbye|who are you|how are you|what is your name)\b[\s!.?]*$/i.test(
      cleanTrimmed
    ) || (cleanTrimmed.length < 4 && !cleanTrimmed.includes('?'));

  const isExplicitRealtimeQuery =
    /\b(search|lookup|find|latest|news|current|2025|2026|today|cutoff|exam|salaries|salary|placement|companies|ranking|trends?|syllabus|dates|eligibility|admissions?|notification)\b/i.test(
      latestUserMsg
    );

  // Auto use web search ONLY when required:
  // Greetings and casual chit-chat NEVER trigger web search, regardless of toggle.
  // Only trigger if explicit realtime keywords are present, OR if toggle is ON and the user is asking an informational question.
  const needsWebSearch =
    searchResults.length === 0 &&
    !isGreetingOrCasual &&
    !/\b(todays? ai|ai models?|llms?|leaderboard)\b/i.test(latestUserMsg) &&
    Boolean(isExplicitRealtimeQuery || (enableWebSearch && (latestUserMsg.includes('?') || latestUserMsg.length >= 18)));

  if (needsWebSearch && latestUserMsg) {
    try {
      searchResults = await performWebSearch(latestUserMsg);
      if (searchResults.length > 0) {
        injectedContext +=
          `\n\n[LIVE REAL-TIME WEB SEARCH KNOWLEDGE BASE - Date: ${new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}]:\n` +
          searchResults
            .map(
              (r, i) =>
                `Source [${i + 1}]: "${r.title}"\nURL: ${r.url}\nExcerpt: ${r.snippet.slice(0, 250)}`
            )
            .join('\n\n') +
          `\n\nInstructions: You have access to real-time live web search results above. Directly incorporate facts, salaries, and trends. Output well-structured markdown with bullet points, bold key terms, and markdown link citations. Be concise and fast.`;

        toolEvents.push({
          type: 'web_search',
          query: latestUserMsg,
          citations: searchResults,
        });
      }
    } catch (searchErr: any) {
      console.warn('Web search enrichment error:', searchErr?.message);
    }
  }

  // Inject all tools context into system prompt
  if (injectedContext) {
    let injected = false;
    augmentedMessages = augmentedMessages.map((m) => {
      if (m.role === 'system' && !injected) {
        injected = true;
        return { ...m, content: m.content + injectedContext };
      }
      return m;
    });
    if (!injected) {
      augmentedMessages.unshift({ role: 'system', content: injectedContext });
    }
  }

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      // Send tool event header if any tools yielded events
      for (const tEvent of toolEvents) {
        res.write(`data: ${JSON.stringify({ toolEvent: tEvent })}\n\n`);
      }

      for await (const delta of enzonicStream(augmentedMessages, { temperature: temperature ?? 0.3, maxTokens: maxTokens ?? 1200 })) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
    return;
  }

  const result = await enzonicChat({ messages: augmentedMessages, temperature, maxTokens, responseFormat });
  if (!result.ok) {
    return res.status(result.error?.code === 'RATE_LIMITED' ? 429 : 502).json({ error: result.error });
  }
  return res.json({
    ...result.data,
    citations: searchResults,
  });
});

// What-If Simulation API
app.post('/api/ai/what-if', async (req, res) => {
  const { pathName, userProfile } = req.body;
  const cleanPath = String(pathName || 'Software Engineering').replace(/[^a-zA-Z0-9 &+._/-]/g, '').slice(0, 80);
  const studentName = String(userProfile?.name || 'Student').slice(0, 60);
  try {
    const prompt = `You are the MindPath Scenario & Decision Agent. The student ${studentName} is exploring the career path: "${cleanPath}".
Context: ${studentName} has Python & Math fundamentals, wants to prepare for placements/high growth.
Analyze this option and return JSON matching:
{
  "selectedPath": "${cleanPath}",
  "matchScore": number (80-99),
  "estimatedTimeToReady": string (e.g. "6-9 Months"),
  "salaryProjection": string (e.g. "₹12L - ₹25L"),
  "keyAdvantages": [3 strings],
  "tradeoffsAndRisks": [2 strings],
  "recommendedFirstStep": string,
  "curatedRoadmap": [4 step strings]
}`;

    const result = await enzonicChat({
      messages: [
        { role: 'system', content: 'You are an intelligent educational career advisor. Output ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.2,
    });

    const dataObj: any = result.data;
    if (result.ok && dataObj?.choices?.[0]?.message?.content) {
      try {
        const parsed = JSON.parse(dataObj.choices[0].message.content);
        const validated = WhatIfScenarioSchema.safeParse(parsed);
        if (validated.success) {
          return res.json(validated.data);
        }
      } catch (_pe) {
        // Fallback to static model below
      }
    }

    // Default high-value response if upstream model throttled
    return res.json({
      selectedPath: pathName,
      matchScore: pathName.includes('AI') ? 98 : 95,
      estimatedTimeToReady: '6 Months',
      salaryProjection: pathName.includes('AI') ? '₹14L - ₹28L' : '₹10L - ₹20L',
      keyAdvantages: [
        'Extremely high industry demand across tech and enterprise sectors',
        'Direct alignment with your existing Python and analytical coursework',
        'Strong trajectory toward senior architecture and leadership roles',
      ],
      tradeoffsAndRisks: [
        'Requires continuous revision of linear algebra and probability models',
        'Practical portfolio projects take 15-20 hours weekly commitment',
      ],
      recommendedFirstStep: 'Complete the Advanced Python roadmap module and take the Assessment Quiz tomorrow',
      curatedRoadmap: [
        'Phase 1: Advanced Data Structures & Algorithmic Problem Solving (4 weeks)',
        'Phase 2: Applied Machine Learning & Scikit-Learn Pipelines (6 weeks)',
        'Phase 3: Deep Neural Networks & Production Inference (8 weeks)',
        'Phase 4: Capstone Project & Mock Placement Technical Interviews (4 weeks)',
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// VITE DEV SERVER INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 MindPath Server running on http://localhost:${port}`);
  });
}

startServer();
