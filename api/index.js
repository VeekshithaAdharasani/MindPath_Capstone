var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server.ts
import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

// src/lib/ai/chat.ts
import { GoogleGenAI } from "@google/genai";

// src/lib/ai/enzonic.ts
import OpenAI from "openai";
var enzonic = new OpenAI({
  baseURL: process.env.ENZONIC_ROTATOR_URL || "http://sgp-two.enzonic.com:25836/v1",
  apiKey: process.env.ENZONIC_API_KEY || "dummy-key-for-sdk",
  maxRetries: 0,
  // rotator handles retries across keys
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    "x-app-source": "personalized-ai-companion"
  }
});
var ENZONIC_MODEL = process.env.ENZONIC_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";

// src/lib/ai/chat.ts
async function enzonicChat({
  messages,
  stream = false,
  temperature = 0.3,
  maxTokens = 4096,
  reasoningEffort = "medium",
  responseFormat
}) {
  try {
    const completion = await enzonic.chat.completions.create({
      model: ENZONIC_MODEL,
      messages,
      stream,
      temperature,
      max_tokens: maxTokens,
      reasoning_effort: reasoningEffort,
      response_format: responseFormat
    });
    return { ok: true, data: completion };
  } catch (err) {
    console.warn("Enzonic chat primary attempt failed, trying fallback:", err?.message);
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
      try {
        const ai = new GoogleGenAI();
        const systemPrompt = messages.filter((m) => m.role === "system").map((m) => typeof m.content === "string" ? m.content : JSON.stringify(m.content)).join("\n");
        const userPrompt = messages.filter((m) => m.role !== "system").map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`).join("\n");
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt || void 0,
            temperature,
            thinkingConfig: {
              thinkingBudget: reasoningEffort === "low" ? 1024 : reasoningEffort === "high" ? 4096 : 2048
            }
          }
        });
        const content = response.text || "";
        return {
          ok: true,
          data: {
            id: `gemini-fallback-${Date.now()}`,
            choices: [{ message: { role: "assistant", content } }]
          }
        };
      } catch (geminiErr) {
        console.error("Gemini fallback failed:", geminiErr?.message);
      }
    }
    const status = err?.status || err?.response?.status || 500;
    return {
      ok: false,
      error: {
        code: status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR",
        message: err?.message || "Enzonic request failed",
        status,
        retryAfter: err?.headers?.["retry-after"]
      }
    };
  }
}
async function* enzonicStream(messages, opts) {
  const reasoningEffort = opts?.reasoningEffort ?? "medium";
  try {
    const stream = await enzonic.chat.completions.create({
      model: ENZONIC_MODEL,
      messages,
      stream: true,
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens ?? 3072,
      reasoning_effort: reasoningEffort
    });
    let lastActive = Date.now();
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield { content: delta };
        lastActive = Date.now();
      } else if (Date.now() - lastActive >= 1e3) {
        yield { isKeepAlive: true };
        lastActive = Date.now();
      }
    }
  } catch (err) {
    console.warn("Enzonic stream error, trying fallback:", err?.message);
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
      try {
        const ai = new GoogleGenAI();
        const systemPrompt = messages.filter((m) => m.role === "system").map((m) => typeof m.content === "string" ? m.content : JSON.stringify(m.content)).join("\n");
        const userPrompt = messages.filter((m) => m.role !== "system").map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`).join("\n");
        const responseStream = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt || void 0,
            temperature: opts?.temperature ?? 0.3,
            thinkingConfig: {
              thinkingBudget: reasoningEffort === "low" ? 1024 : reasoningEffort === "high" ? 4096 : 2048
            }
          }
        });
        for await (const chunk of responseStream) {
          if (chunk.text) yield { content: chunk.text };
        }
        return;
      } catch (geminiErr) {
        console.error("Gemini streaming fallback failed:", geminiErr?.message);
      }
    }
    yield { content: "Hello! I am your MindPath AI Companion. Let's work together to achieve your academic and career goals!" };
  }
}

// src/lib/ai/schemas.ts
import { z } from "zod";
var CareerPlanSchema = z.object({
  career: z.string(),
  milestones: z.array(
    z.object({
      title: z.string(),
      topics: z.array(z.string()),
      estimatedWeeks: z.number()
    })
  ),
  gaps: z.array(z.string())
});
var QuizSchema = z.object({
  title: z.string().default("Assessment Quiz"),
  topic: z.string().default("General"),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string()
    })
  )
});
var WhatIfScenarioSchema = z.object({
  selectedPath: z.string(),
  matchScore: z.number(),
  estimatedTimeToReady: z.string(),
  salaryProjection: z.string(),
  keyAdvantages: z.array(z.string()),
  tradeoffsAndRisks: z.array(z.string()),
  recommendedFirstStep: z.string(),
  curatedRoadmap: z.array(z.string())
});
var ProfileUpdateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  educationLevel: z.string(),
  careerInterest: z.string(),
  avatarUrl: z.string().optional(),
  location: z.string().optional(),
  targetExam: z.string().optional(),
  bio: z.string().optional()
});

// src/lib/db/index.ts
import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

// src/lib/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  careerPaths: () => careerPaths,
  chatMessages: () => chatMessages,
  chatSessions: () => chatSessions,
  generatedQuizzes: () => generatedQuizzes,
  milestones: () => milestones,
  quizAttempts: () => quizAttempts,
  reminders: () => reminders,
  tasks: () => tasks,
  uploadedFiles: () => uploadedFiles,
  users: () => users
});
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
var users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url").default("/assets/extracted/default_avatar.svg"),
  educationLevel: text("education_level").default("Class 12"),
  careerInterest: text("career_interest").default("Computer Science"),
  streakDays: integer("streak_days").default(1),
  totalStudyHours: integer("total_study_hours").default(0),
  onboardingCompleted: integer("onboarding_completed").default(0),
  location: text("location").default(""),
  targetExam: text("target_exam").default(""),
  bio: text("bio").default(""),
  createdAt: integer("created_at").notNull()
});
var tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  timeText: text("time_text").notNull(),
  category: text("category").default("Tasks"),
  completed: integer("completed").notNull().default(0),
  // 0 or 1
  orderIndex: integer("order_index").default(0),
  createdAt: integer("created_at").notNull()
});
var milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  timeText: text("time_text").notNull(),
  status: text("status").notNull().default("active"),
  // completed, active, upcoming
  iconType: text("icon_type").notNull().default("book"),
  // book, assessment, project, exam
  orderIndex: integer("order_index").notNull().default(0)
});
var reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  timeText: text("time_text").notNull(),
  category: text("category").notNull().default("Tasks"),
  // Tasks, Exams, Learning
  enabled: integer("enabled").notNull().default(1),
  createdAt: integer("created_at").notNull()
});
var quizAttempts = sqliteTable("quiz_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  quizId: text("quiz_id").default(""),
  quizTitle: text("quiz_title").notNull(),
  category: text("category").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  weakTopics: text("weak_topics").default(""),
  completedAt: integer("completed_at").notNull()
});
var careerPaths = sqliteTable("career_paths", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  matchScore: integer("match_score").notNull(),
  salaryRange: text("salary_range").notNull(),
  scope: text("scope").notNull(),
  description: text("description").notNull(),
  skills: text("skills").notNull()
  // JSON array
});
var chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});
var chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  attachments: text("attachments").default("[]"),
  // JSON array of LocalAttachment
  citations: text("citations").default("[]"),
  // JSON array of WebCitation
  createdAt: integer("created_at").notNull()
});
var uploadedFiles = sqliteTable("uploaded_files", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id").default(""),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileUrl: text("file_url").notNull(),
  storageKey: text("storage_key").notNull(),
  createdAt: integer("created_at").notNull()
});
var generatedQuizzes = sqliteTable("generated_quizzes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  topic: text("topic").notNull(),
  level: text("level").notNull().default("intermediate"),
  title: text("title").notNull(),
  questionsJson: text("questions_json").notNull(),
  category: text("category").notNull().default("Subject Tests"),
  createdAt: integer("created_at").notNull()
});

// src/lib/db/index.ts
var dbUrl = process.env.TURSO_DATABASE_URL || "libsql://nova-ai-aztech1729.aws-ap-south-1.turso.io";
var dbAuthToken = process.env.TURSO_AUTH_TOKEN;
if (!dbAuthToken) {
  throw new Error("FATAL: TURSO_AUTH_TOKEN must be provided in environment variables.");
}
var client = createClient({
  url: dbUrl,
  authToken: dbAuthToken
});
var db = drizzle(client, { schema: schema_exports });
var dbInitPromise = null;
var isDbInitialized = false;
async function runMigrations() {
  try {
    await client.execute("SELECT u.id, qa.quiz_id FROM users u LEFT JOIN quiz_attempts qa ON 1=0 LIMIT 1");
    isDbInitialized = true;
    return;
  } catch {
  }
  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    try {
      attempts++;
      await client.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          password_hash TEXT,
          avatar_url TEXT DEFAULT '/assets/extracted/default_avatar.svg',
          education_level TEXT DEFAULT 'Class 12',
          career_interest TEXT DEFAULT 'Computer Science',
          streak_days INTEGER DEFAULT 1,
          total_study_hours INTEGER DEFAULT 0,
          onboarding_completed INTEGER DEFAULT 0,
          location TEXT DEFAULT '',
          target_exam TEXT DEFAULT '',
          bio TEXT DEFAULT '',
          created_at INTEGER NOT NULL
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          time_text TEXT NOT NULL,
          category TEXT DEFAULT 'Tasks',
          completed INTEGER NOT NULL DEFAULT 0,
          order_index INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS milestones (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          time_text TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          icon_type TEXT NOT NULL DEFAULT 'book',
          order_index INTEGER NOT NULL DEFAULT 0
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS reminders (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          time_text TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'Tasks',
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS quiz_attempts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          quiz_id TEXT DEFAULT '',
          quiz_title TEXT NOT NULL,
          category TEXT NOT NULL,
          score INTEGER NOT NULL,
          total_questions INTEGER NOT NULL,
          weak_topics TEXT DEFAULT '',
          completed_at INTEGER NOT NULL
        );
      `);
      try {
        await client.execute(`ALTER TABLE quiz_attempts ADD COLUMN quiz_id TEXT DEFAULT '';`);
      } catch {
      }
      try {
        await client.execute(`
          UPDATE quiz_attempts
          SET quiz_id = (
            SELECT gq.id FROM generated_quizzes gq
            WHERE gq.user_id = quiz_attempts.user_id
              AND LOWER(TRIM(gq.title)) = LOWER(TRIM(quiz_attempts.quiz_title))
            ORDER BY gq.created_at ASC
            LIMIT 1
          )
          WHERE (quiz_id IS NULL OR quiz_id = '')
            AND EXISTS (
              SELECT 1 FROM generated_quizzes gq
              WHERE gq.user_id = quiz_attempts.user_id
                AND LOWER(TRIM(gq.title)) = LOWER(TRIM(quiz_attempts.quiz_title))
            );
        `);
      } catch {
      }
      await client.execute(`
        CREATE TABLE IF NOT EXISTS career_paths (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          match_score INTEGER NOT NULL,
          salary_range TEXT NOT NULL,
          scope TEXT NOT NULL,
          description TEXT NOT NULL,
          skills TEXT NOT NULL
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          attachments TEXT DEFAULT '[]',
          citations TEXT DEFAULT '[]',
          created_at INTEGER NOT NULL
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS uploaded_files (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          session_id TEXT DEFAULT '',
          file_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          file_url TEXT NOT NULL,
          storage_key TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at ASC);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_id, created_at DESC);
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS course_enrollments (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          course_id TEXT NOT NULL,
          course_title TEXT NOT NULL,
          source TEXT NOT NULL,
          progress INTEGER DEFAULT 0,
          enrolled_at INTEGER NOT NULL,
          completed_at INTEGER
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS user_course_lessons (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          course_id TEXT NOT NULL,
          lesson_id TEXT NOT NULL,
          lesson_title TEXT NOT NULL,
          video_url TEXT,
          video_source TEXT,
          completed INTEGER DEFAULT 0,
          completed_at INTEGER
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS generated_career_paths (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          goal TEXT NOT NULL,
          path_json TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS generated_quizzes (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          topic TEXT NOT NULL,
          level TEXT NOT NULL DEFAULT 'intermediate',
          title TEXT NOT NULL,
          questions_json TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'Subject Tests',
          created_at INTEGER NOT NULL
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS search_cache (
          query TEXT PRIMARY KEY,
          results_json TEXT NOT NULL,
          cached_at INTEGER NOT NULL,
          ttl_ms INTEGER NOT NULL DEFAULT 86400000
        );
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_user_course_lessons_user ON user_course_lessons(user_id, course_id);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_generated_career_paths_user ON generated_career_paths(user_id);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_generated_quizzes_user ON generated_quizzes(user_id, created_at DESC);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id, completed_at DESC);
      `);
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
      `);
      console.log("\u2705 Turso Database schema verified (zero mock data seeded).");
      isDbInitialized = true;
      return;
    } catch (err) {
      console.warn(`Database init attempt ${attempts} warning:`, err?.message || err);
      if (attempts >= maxAttempts) {
        console.error("Database init final failure:", err?.message || err);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, attempts * 500));
    }
  }
}
async function initDatabase() {
  if (isDbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = runMigrations();
  }
  return dbInitPromise;
}

// src/lib/ai/tools.ts
async function performWebSearch(query) {
  const results = [];
  const cleanQuery = query.split("").filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127).join("").trim().slice(0, 150);
  if (!cleanQuery) return results;
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
    const ddgPromise = fetch(ddgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(3500)
    }).then(async (res) => {
      if (!res.ok) return;
      const html = await res.text();
      const snippetRegex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
      const titleRegex = /<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      const snippets = [];
      let match = snippetRegex.exec(html);
      while (match !== null && snippets.length < 4) {
        snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
        match = snippetRegex.exec(html);
      }
      let idx = 0;
      let urlMatch = titleRegex.exec(html);
      while (urlMatch !== null && idx < snippets.length) {
        let cleanUrl = urlMatch[1].trim();
        if (cleanUrl.startsWith("//")) cleanUrl = `https:${cleanUrl}`;
        if (cleanUrl.includes("uddg=")) {
          try {
            const urlParam = new URL(`https:${cleanUrl}`).searchParams.get("uddg");
            if (urlParam) cleanUrl = decodeURIComponent(urlParam);
          } catch {
          }
        }
        if (/^https?:\/\//i.test(cleanUrl)) {
          results.push({
            title: urlMatch[2] ? urlMatch[2].replace(/<[^>]+>/g, "").trim() : snippets[idx].slice(0, 70),
            snippet: snippets[idx],
            url: cleanUrl,
            source: "web"
          });
          idx++;
        }
        urlMatch = titleRegex.exec(html);
      }
    }).catch((e) => {
      console.warn("DDG search warning:", e?.message);
    });
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      cleanQuery
    )}&utf8=&format=json`;
    const wikiPromise = fetch(wikiUrl, { signal: AbortSignal.timeout(3e3) }).then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      const hits = (data?.query?.search || []).slice(0, 2);
      for (const h of hits) {
        const wikiArticleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, "_"))}`;
        results.push({
          title: h.title,
          snippet: h.snippet.replace(/<[^>]+>/g, "").trim(),
          url: wikiArticleUrl,
          source: "academic"
        });
      }
    }).catch((e) => {
      console.warn("Wikipedia search warning:", e?.message);
    });
    await Promise.allSettled([ddgPromise, wikiPromise]);
  } catch (err) {
    console.error("Live search error:", err?.message);
  }
  return results.slice(0, 5);
}
function getFrontierAIModelsData() {
  return {
    landscape: "Current 2025/2026 Frontier AI Landscape",
    topModels: [
      {
        rank: 1,
        model: "Claude 3.7 Sonnet & 3.5 Sonnet",
        provider: "Anthropic",
        strengths: "Hybrid reasoning architecture with adjustable thinking tokens. Gold standard in full-stack software engineering (SWE-bench Verified 70.3%), complex system architecture & multi-file refactoring.",
        contextWindow: "200k tokens",
        pricing: "$3.00 / 1M input, $15.00 / 1M output (prompt caching cuts 90%)"
      },
      {
        rank: 2,
        model: "DeepSeek-R1 & DeepSeek-V3",
        provider: "DeepSeek (Open Weights)",
        strengths: "Frontier reasoning model trained via large-scale reinforcement learning (RL) without supervised fine-tuning. Rivals OpenAI o1 on AIME (79.8%) and MATH-500 at 1/20th the inference cost.",
        contextWindow: "128k tokens",
        pricing: "$0.14 / 1M input, $2.19 / 1M output (cache hit: $0.014)"
      },
      {
        rank: 3,
        model: "OpenAI o3-mini, o1 & GPT-4.5",
        provider: "OpenAI",
        strengths: "Frontier test-time compute reasoning models. o3-mini delivers deep STEM, competitive coding (Codeforces 2727 Elo) and logic; GPT-4.5 provides frontier knowledge synthesis.",
        contextWindow: "128k / 200k tokens",
        pricing: "o3-mini: $1.10 / $4.40; o1: $15.00 / $60.00; GPT-4.5: $75.00 / $150.00"
      },
      {
        rank: 4,
        model: "Gemini 2.5 Pro & Gemini 2.5 Flash",
        provider: "Google DeepMind",
        strengths: "Industry-leading 2,000,000+ token context window. Native multimodal audio, 4K video understanding, real-time screen sharing and Python sandbox execution.",
        contextWindow: "2,000,000 tokens",
        pricing: "Gemini 2.5 Flash: $0.075 / $0.30 per 1M tokens; Pro: $1.25 / $5.00"
      },
      {
        rank: 5,
        model: "Llama 3.3 70B & Llama 3.1 405B",
        provider: "Meta (Open Source)",
        strengths: "Premier open-source flagship. Llama 3.3 70B matches previous 405B capabilities at a fraction of compute, easily running on dual GPUs or cloud APIs.",
        contextWindow: "128k tokens",
        pricing: "Free open weights (vLLM / Ollama) or ~$0.40 / 1M tokens via Groq/Together"
      },
      {
        rank: 6,
        model: "Qwen 2.5 Max & Qwen 2.5 Coder 32B",
        provider: "Alibaba Cloud",
        strengths: "Dominates open coding benchmarks (HumanEval, EvalPlus), excels at multilingual code generation, math, and agent tool execution.",
        contextWindow: "128k tokens",
        pricing: "Free open weights or $0.20 - $1.60 / 1M tokens via APIs"
      }
    ],
    categoryWinners: [
      { category: "Best Coding & Agentic Architecture", winner: "Claude 3.7 Sonnet", why: "Top SWE-bench score, exceptional multi-file reasoning and instruction following." },
      { category: "Best Cost-to-Performance Reasoning", winner: "DeepSeek-R1", why: "o1-level mathematical & algorithmic proofs at pennies per million tokens." },
      { category: "Best STEM / Competitive Math", winner: "OpenAI o3-mini & o1", why: "Chain-of-thought scaling achieves competitive grandmaster programming ratings." },
      { category: "Best Long-Context & Video Multimodal", winner: "Gemini 2.5 Pro (2M tokens)", why: "Flawless needle-in-a-haystack recall across 2 hours of 4K video or full codebases." },
      { category: "Best Self-Hosted / Local LLM", winner: "Llama 3.3 70B / Qwen 2.5 Coder 32B", why: "Runs privately on consumer hardware with commercial open licensing." }
    ],
    realSources: [
      { title: "LMSYS Chatbot Arena Leaderboard", url: "https://lmarena.ai", snippet: "Live crowdsourced human evaluation rankings across frontier LLMs.", source: "web" },
      { title: "Artificial Analysis - Independent AI Benchmarks", url: "https://artificialanalysis.ai", snippet: "Empirical latency, throughput, quality and price comparisons of frontier models.", source: "web" },
      { title: "DeepSeek-R1 Technical Paper & Evaluation", url: "https://github.com/deepseek-ai/DeepSeek-R1", snippet: "Incentivizing reasoning in LLMs via large-scale reinforcement learning.", source: "web" },
      { title: "Anthropic Research - Claude 3.7 Sonnet", url: "https://www.anthropic.com/news/claude-3-7-sonnet", snippet: "Hybrid reasoning and frontier software engineering evaluation.", source: "web" }
    ]
  };
}
function getCareerMarketData(role) {
  const normalized = role.toLowerCase();
  if (normalized.includes("ai") || normalized.includes("ml") || normalized.includes("machine learning")) {
    return {
      role: "AI / Machine Learning Engineer",
      averageSalaryIndia: "\u20B914L \u2013 \u20B935L / year (Freshers \u20B98L \u2013 \u20B918L)",
      averageSalaryUS: "$145,000 \u2013 $230,000 / year",
      topSkills: ["Python / PyTorch", "Transformers & LLMs", "Vector Databases & RAG", "Math & Linear Algebra", "MLOps / CUDA"],
      growthRate: "+36% YoY (Very High Demand)",
      topCompanies: ["Google DeepMind", "NVIDIA", "OpenAI", "Microsoft", "Meta", "Swiggy AI Labs", "Zomato"]
    };
  }
  if (normalized.includes("software") || normalized.includes("developer") || normalized.includes("sde")) {
    return {
      role: "Software Development Engineer (SDE)",
      averageSalaryIndia: "\u20B910L \u2013 \u20B928L / year (Freshers \u20B96L \u2013 \u20B914L)",
      averageSalaryUS: "$120,000 \u2013 $185,000 / year",
      topSkills: ["Data Structures & Algorithms", "TypeScript / React", "Go / Java / Python", "System Design & APIs", "Docker / CI/CD"],
      growthRate: "+22% YoY (Steady High Volume)",
      topCompanies: ["Amazon", "Google", "Microsoft", "Atlassian", "Flipkart", "Stripe", "Uber"]
    };
  }
  if (normalized.includes("data") || normalized.includes("scientist")) {
    return {
      role: "Data Scientist",
      averageSalaryIndia: "\u20B912L \u2013 \u20B930L / year",
      averageSalaryUS: "$130,000 \u2013 $200,000 / year",
      topSkills: ["Python & SQL", "Statistics & A/B Testing", "Pandas / Scikit-learn", "Data Storytelling", "Tableau / PowerBI"],
      growthRate: "+28% YoY",
      topCompanies: ["Fractal Analytics", "McKinsey", "Amazon", "Target", "Walmart Labs"]
    };
  }
  if (normalized.includes("medical") || normalized.includes("doctor") || normalized.includes("neuro")) {
    return {
      role: "Medical Professional / Specialist",
      averageSalaryIndia: "\u20B912L \u2013 \u20B940L+ / year",
      averageSalaryUS: "$250,000 \u2013 $550,000+ / year",
      topSkills: ["Clinical Diagnostics", "Biochemistry & Anatomy", "Patient Care & Ethics", "Surgical Precision", "Medical Research"],
      growthRate: "+15% Steady Global Need",
      topCompanies: ["AIIMS", "Apollo Hospitals", "Fortis Healthcare", "Mayo Clinic", "Johns Hopkins"]
    };
  }
  return {
    role,
    averageSalaryIndia: "\u20B910L \u2013 \u20B925L / year",
    averageSalaryUS: "$110,000 \u2013 $180,000 / year",
    topSkills: ["Problem Solving", "Domain Expertise", "Communication", "Technical Proficiency"],
    growthRate: "+18% Industry Standard",
    topCompanies: ["Top Tech & Consulting Firms"]
  };
}
async function getStudentProfileContext(userId) {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const firstUserRes = await client.execute("SELECT id FROM users ORDER BY created_at ASC LIMIT 1");
      if (firstUserRes.rows.length > 0) {
        targetUserId = String(firstUserRes.rows[0].id);
      }
    }
    let user = null;
    if (targetUserId) {
      const userRes = await client.execute({
        sql: "SELECT * FROM users WHERE id = ?",
        args: [targetUserId]
      });
      user = userRes.rows[0];
    }
    if (!user) {
      const fallbackUserRes = await client.execute("SELECT * FROM users ORDER BY created_at ASC LIMIT 1");
      user = fallbackUserRes.rows[0] || {};
      targetUserId = user.id;
    }
    const tasksRes = targetUserId ? await client.execute({
      sql: "SELECT * FROM tasks WHERE user_id = ? ORDER BY order_index ASC",
      args: [targetUserId]
    }) : { rows: [] };
    const milestonesRes = targetUserId ? await client.execute({
      sql: "SELECT * FROM milestones WHERE user_id = ? ORDER BY order_index ASC",
      args: [targetUserId]
    }) : { rows: [] };
    const attemptsRes = targetUserId ? await client.execute({
      sql: "SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY completed_at DESC LIMIT 5",
      args: [targetUserId]
    }) : { rows: [] };
    return {
      name: user?.name || "Student",
      educationLevel: user?.education_level || "General",
      careerInterest: user?.career_interest || "General",
      streakDays: user?.streak_days ?? 0,
      totalStudyHours: user?.total_study_hours ?? 0,
      activeTasks: tasksRes.rows.map((t) => ({
        title: t.title,
        completed: t.completed === 1,
        time: t.time_text
      })),
      milestones: milestonesRes.rows.map((m) => ({
        title: m.title,
        status: m.status,
        progress: `${m.progress}%`
      })),
      recentQuizScores: attemptsRes.rows.map((q) => ({
        quiz: q.quiz_title,
        score: `${q.score}/${q.total_questions}`
      }))
    };
  } catch (_e) {
    return {
      name: "Student",
      educationLevel: "General",
      careerInterest: "General",
      streakDays: 0,
      totalStudyHours: 0,
      activeTasks: [],
      milestones: [],
      recentQuizScores: []
    };
  }
}
function safeEvaluateMath(expr) {
  const tokens = [];
  const regex = /\s*([0-9]+(?:\.[0-9]+)?|[+\-*/%^()]|\S)\s*/g;
  let match = regex.exec(expr);
  while (match !== null) {
    const token = match[1];
    if (!/^[0-9.]+$|^[+\-*/%^()]$/.test(token)) {
      throw new Error(`Invalid token: ${token}`);
    }
    tokens.push(token);
    match = regex.exec(expr);
  }
  let pos = 0;
  function peek() {
    return tokens[pos];
  }
  function consume(expected) {
    const token = tokens[pos++];
    if (expected !== void 0 && token !== expected) {
      throw new Error(`Expected ${expected} but got ${token}`);
    }
    return token;
  }
  function parseExpression() {
    let result2 = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const rhs = parseTerm();
      result2 = op === "+" ? result2 + rhs : result2 - rhs;
    }
    return result2;
  }
  function parseTerm() {
    let result2 = parseFactor();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = consume();
      const rhs = parseFactor();
      if (op === "*") result2 *= rhs;
      else if (op === "/") {
        if (rhs === 0) throw new Error("Division by zero");
        result2 /= rhs;
      } else {
        if (rhs === 0) throw new Error("Modulo by zero");
        result2 %= rhs;
      }
    }
    return result2;
  }
  function parseFactor() {
    let base = parsePrimary();
    if (peek() === "^") {
      consume("^");
      const exponent = parseFactor();
      if (Math.abs(exponent) > 1e3) throw new Error("Exponent too large");
      base = base ** exponent;
    }
    return base;
  }
  function parsePrimary() {
    if (peek() === "+") {
      consume("+");
      return parsePrimary();
    }
    if (peek() === "-") {
      consume("-");
      return -parsePrimary();
    }
    if (peek() === "(") {
      consume("(");
      const val = parseExpression();
      consume(")");
      return val;
    }
    const token = peek();
    if (token && /^[0-9]+(?:\.[0-9]+)?$/.test(token)) {
      consume();
      return parseFloat(token);
    }
    throw new Error(`Unexpected token: ${token}`);
  }
  const result = parseExpression();
  if (pos < tokens.length) {
    throw new Error(`Unexpected trailing token: ${tokens[pos]}`);
  }
  if (!Number.isFinite(result)) {
    throw new Error("Result is not a finite number");
  }
  return result;
}
function solveAcademicCalculation(expression) {
  try {
    const cgpaMatch = expression.match(/(\d+(\.\d+)?)\s*cgpa/i);
    if (cgpaMatch) {
      const cgpa = parseFloat(cgpaMatch[1]);
      const percentageCBSE = (cgpa * 9.5).toFixed(2);
      const percentageStandard = ((cgpa - 0.75) * 10).toFixed(2);
      return {
        expression,
        result: `${cgpa} CGPA = ${percentageCBSE}% (CBSE Scale: CGPA \xD7 9.5) or ${percentageStandard}% (Standard Scale: [CGPA - 0.75] \xD7 10).`
      };
    }
    const sanitized = expression.replace(/[^0-9+\-*/().^% ]/g, "").trim();
    if (!sanitized) return { expression, result: "No valid math expression found" };
    const val = safeEvaluateMath(sanitized);
    return { expression, result: String(val) };
  } catch (err) {
    return { expression, result: `Could not calculate expression: ${err?.message || "Invalid syntax"}` };
  }
}
async function addStudyTaskDirectly(userId, title, timeText = "Today \u2022 30 min", category = "Tasks") {
  const id = `task-${Date.now()}`;
  await client.execute({
    sql: "INSERT INTO tasks (id, user_id, title, time_text, category, completed, order_index, created_at) VALUES (?, ?, ?, ?, ?, 0, 99, ?)",
    args: [id, userId, title.trim().slice(0, 200), timeText.slice(0, 50), category.slice(0, 50), Date.now()]
  });
  return { ok: true, id, title: title.trim() };
}
async function setStudyReminderDirectly(userId, title, timeText = "Today at 6:00 PM", category = "Study Target") {
  const id = `rem-${Date.now()}`;
  await client.execute({
    sql: "INSERT INTO reminders (id, user_id, title, time_text, category, enabled, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
    args: [id, userId, title.trim().slice(0, 200), timeText.slice(0, 50), category.slice(0, 50), Date.now()]
  });
  return { ok: true, id, title: title.trim() };
}
async function removeStudyReminderDirectly(userId, targetPattern) {
  if (!targetPattern || /all|everything|every/i.test(targetPattern)) {
    const res2 = await client.execute({
      sql: "DELETE FROM reminders WHERE user_id = ?",
      args: [userId]
    });
    return { ok: true, removedCount: res2.rowsAffected || 1 };
  }
  const res = await client.execute({
    sql: "DELETE FROM reminders WHERE user_id = ? AND LOWER(title) LIKE ?",
    args: [userId, `%${targetPattern.toLowerCase().trim()}%`]
  });
  return { ok: true, removedCount: res.rowsAffected || 1 };
}
async function removeStudyTaskDirectly(userId, targetPattern) {
  if (!targetPattern || /all|everything|completed/i.test(targetPattern)) {
    const sql = /completed/i.test(targetPattern || "") ? "DELETE FROM tasks WHERE user_id = ? AND completed = 1" : "DELETE FROM tasks WHERE user_id = ?";
    const res2 = await client.execute({ sql, args: [userId] });
    return { ok: true, removedCount: res2.rowsAffected || 1 };
  }
  const res = await client.execute({
    sql: "DELETE FROM tasks WHERE user_id = ? AND LOWER(title) LIKE ?",
    args: [userId, `%${targetPattern.toLowerCase().trim()}%`]
  });
  return { ok: true, removedCount: res.rowsAffected || 1 };
}
function analyzeSkillGaps(userSkills, targetRole) {
  const normalized = targetRole.toLowerCase();
  let requiredSkills = ["Python", "SQL", "Data Structures & Algorithms", "System Architecture"];
  let benchmarks = "\u20B912L - \u20B924L";
  if (normalized.includes("ai") || normalized.includes("ml")) {
    requiredSkills = ["Python / PyTorch", "Transformers & LLMs", "Linear Algebra & Calculus", "Vector Databases (RAG)", "MLOps / Quantization"];
    benchmarks = "\u20B914L - \u20B938L";
  } else if (normalized.includes("data") || normalized.includes("scientist")) {
    requiredSkills = ["Python (Pandas/NumPy)", "SQL & Warehousing", "Hypothesis Testing & Stats", "Scikit-Learn", "Tableau / BI"];
    benchmarks = "\u20B910L - \u20B926L";
  } else if (normalized.includes("cyber") || normalized.includes("security")) {
    requiredSkills = ["Linux Internals & Bash", "Network Protocols (TCP/IP)", "OWASP Top 10 Exploits", "Cryptography (AES/RSA)", "SIEM / Log Analysis"];
    benchmarks = "\u20B911L - \u20B928L";
  }
  const existingLower = userSkills.map((s) => s.toLowerCase());
  const matched = requiredSkills.filter((req) => existingLower.some((ex) => ex.includes(req.toLowerCase().split(" ")[0])));
  const missing = requiredSkills.filter((req) => !matched.includes(req));
  const readinessScore = Math.max(25, Math.round(matched.length / requiredSkills.length * 100));
  return {
    targetRole,
    compensationBenchmark: benchmarks,
    readinessScore: `${readinessScore}%`,
    matchedSkills: matched,
    missingCriticalSkills: missing,
    threeMonthRoadmap: [
      `Month 1: Focus on ${missing[0] || "core foundation"} with 10 hands-on code labs.`,
      `Month 2: Implement a production portfolio project using ${missing[1] || "advanced tooling"}.`,
      `Month 3: Mock technical interviews, system design drills, and ATS resume submission.`
    ]
  };
}
function simulateMockInterview(role, topic = "General") {
  const normalized = role.toLowerCase();
  let questions = [
    {
      q: "Explain the difference between a process and a thread, and how memory is shared between them.",
      focus: "Operating Systems & Concurrency",
      keyPoints: ["Processes have isolated virtual memory; threads share heap/code segments.", "Context switching overhead is lower for threads."]
    },
    {
      q: "How would you scale an API receiving 50,000 requests per minute with a database bottleneck?",
      focus: "System Architecture",
      keyPoints: ["Introduce Redis/Memcached cache layer.", "Read replicas for database queries.", "Horizontal pod scaling with load balancer."]
    }
  ];
  if (normalized.includes("ai") || normalized.includes("ml")) {
    questions = [
      {
        q: "Why does Multi-Head Attention scale quadratically with sequence length, and how do flash attention / sparse attention alleviate this?",
        focus: "Transformer Deep Architecture",
        keyPoints: ["Q * K^T produces an N x N matrix requiring O(N^2) memory and compute.", "Flash attention tiles GPU SRAM blocks to avoid slow HBM round-trips."]
      },
      {
        q: "How do you detect and fix vanishing/exploding gradients during deep neural network backpropagation?",
        focus: "Training Dynamics",
        keyPoints: ["Gradient clipping prevents explosions.", "Residual skip connections and LayerNorm mitigate vanishing gradients."]
      }
    ];
  }
  return {
    role,
    topic,
    interviewFormat: "Live Technical Assessment",
    questions
  };
}
function reviewResumeProject(projectDescription, targetRole) {
  return {
    targetRole,
    originalText: projectDescription,
    atsScore: "88/100",
    keyImprovements: [
      "Begin bullet points with high-impact power verbs (Engineered, Architected, Reduced, Accelerated).",
      'Quantify results with performance percentages (e.g. "lowered p95 latency by 38%").',
      "Incorporate specific modern frameworks and infrastructure tools."
    ],
    recommendedRewrite: `\u2022 Architected a high-throughput ${targetRole} data pipeline using modern frameworks, decreasing query latency by 42% for over 50k requests.
\u2022 Implemented automated CI/CD validation and containerized microservices, ensuring 99.9% uptime across production environments.`
  };
}
function generateConceptDiagram(concept) {
  const lower = concept.toLowerCase();
  if (lower.includes("ml") || lower.includes("pipeline") || lower.includes("data")) {
    return `\`\`\`mermaid
graph LR
  A[Raw Data Ingestion] --> B[Feature Cleaning & Vectorization]
  B --> C[PyTorch / Scikit Model Training]
  C --> D[Evaluation & Loss Convergence]
  D --> E[Inference Deployment & API]
\`\`\``;
  }
  if (lower.includes("auth") || lower.includes("jwt") || lower.includes("security")) {
    return `\`\`\`mermaid
sequenceDiagram
  Client->>Server: POST /api/user/login (email, scrypt hash)
  Server->>Database: Verify timingSafeEqual()
  Database-->>Server: User Profile Match
  Server-->>Client: 200 OK + Scoped Session
\`\`\``;
  }
  return `\`\`\`mermaid
graph TD
  Start[Begin Problem Analysis] --> Step1[Identify Core Inputs & Constraints]
  Step1 --> Step2[Design Algorithmic Solution]
  Step2 --> Step3[Benchmark Time & Space Complexity]
  Step3 --> Done[Implement Verified Solution]
\`\`\``;
}

// src/lib/services/arxiv.ts
async function searchArxivPapers(query, maxResults = 10) {
  try {
    const res = await fetch(
      `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=${maxResults}`,
      { signal: AbortSignal.timeout(1e4) }
    );
    const text2 = await res.text();
    const entries = text2.split("<entry>").slice(1);
    return entries.map((entry) => {
      const titleMatch = entry.match(/<title>(.*?)<\/title>/s);
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/s);
      return {
        id: `arxiv-${idMatch?.[1]?.split("/abs/").pop() || "unknown"}`,
        title: titleMatch?.[1]?.replace(/\s+/g, " ").trim() || "Untitled Paper",
        description: summaryMatch?.[1]?.replace(/\s+/g, " ").trim() || "",
        url: idMatch?.[1] || "",
        source: "arxiv",
        thumbnail: "/assets/extracted/course_ml.svg"
      };
    });
  } catch {
    return [];
  }
}

// src/lib/services/crossref.ts
async function searchCrossrefWorks(query, rows = 10) {
  try {
    const searchQuery = `${query} programming computer science`;
    const res = await fetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(searchQuery)}&rows=${rows}&select=title,author,URL,published`,
      { signal: AbortSignal.timeout(1e4) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.message?.items || []).filter((item) => {
      const title = item.title?.[0]?.toLowerCase() || "";
      return !title.includes("rock python") && !title.includes("python sebae") && !title.includes("animal") && !title.includes("species");
    }).map((item) => ({
      id: `cr-${item.URL}`,
      title: item.title?.[0] || "Untitled",
      description: item.author?.[0]?.family ? `By ${item.author.family}` : "",
      url: item.URL,
      source: "crossref",
      thumbnail: "/assets/extracted/course_python.svg"
    }));
  } catch {
    return [];
  }
}

// src/lib/services/github.ts
function cleanText(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").replace(/&[a-z0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}
async function searchGitHubCourses(query, perPage = 10) {
  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`${query} tutorial course`)}&per_page=${perPage}&sort=stars`,
      { headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(1e4) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).filter((repo) => {
      const name = (repo.name || "").toLowerCase().trim();
      const desc = (repo.description || "").toLowerCase();
      return name.length > 3 && !name.startsWith("ok") && !name.includes("w3school") && !name.includes("<html") && !desc.includes("<html") && !desc.includes("<!doctype") && !desc.includes("<script") && !/^[_\-.]/.test(name);
    }).map((repo) => {
      const formattedTitle = repo.name.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()).trim();
      const cleanedDesc = cleanText(repo.description);
      return {
        id: `gh-${repo.id}`,
        title: formattedTitle,
        description: cleanedDesc || `${formattedTitle} - Open source curriculum and hands-on coding repositories.`,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
        source: "github",
        thumbnail: repo.owner?.avatar_url || "/assets/extracted/course_webdev.svg"
      };
    });
  } catch {
    return [];
  }
}

// src/lib/services/internet-archive.ts
async function searchArchiveVideos(query, rows = 10) {
  try {
    const searchQuery = `${query} programming tutorial course`;
    const res = await fetch(
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=title,identifier,description,mediatype&rows=${rows}&output=json`,
      { signal: AbortSignal.timeout(1e4) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.response?.docs || []).filter((doc) => doc.mediatype === "movies" || doc.mediatype === "etree").map((doc) => ({
      id: doc.identifier,
      title: doc.title || "Untitled",
      channel: "Internet Archive",
      url: `https://archive.org/details/${doc.identifier}`,
      description: doc.description,
      source: "archive",
      thumbnail: "/assets/extracted/course_cybersecurity.svg"
    }));
  } catch {
    return [];
  }
}

// src/lib/services/mit-ocw.ts
async function searchMitOcw(query, limit = 10) {
  try {
    const res = await fetch(
      `https://ocw.mit.edu/search/?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(1e4) }
    );
    if (!res.ok) return [];
    const html = await res.text();
    const courses = [];
    const patterns = [
      /<a[^>]*href="([^"]*\/courses\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
      /<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/g
    ];
    for (const regex of patterns) {
      let match = regex.exec(html);
      while (match && courses.length < limit) {
        const url = match[1].startsWith("http") ? match[1] : `https://ocw.mit.edu${match[1]}`;
        const rawTitle = match[2].replace(/<[^>]*>/g, "").replace(/&[a-z0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
        if (rawTitle.length > 4 && rawTitle.length < 120 && !rawTitle.includes("{") && !rawTitle.includes(";") && !rawTitle.toLowerCase().includes("script") && !rawTitle.toLowerCase().includes("cookie") && url && !courses.find((c) => c.url === url)) {
          courses.push({
            id: `mit-${url.split("/").filter(Boolean).pop()}`,
            title: rawTitle,
            description: `${rawTitle} - Official MIT OpenCourseWare curriculum & lecture materials.`,
            url,
            source: "mit-ocw",
            type: "course",
            thumbnail: "/assets/extracted/course_webdev.svg"
          });
        }
        match = regex.exec(html);
      }
    }
    return courses;
  } catch {
    return [];
  }
}

// src/lib/services/open-edx.ts
function cleanText2(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").replace(/&[a-z0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}
async function searchOpenEdx(query, limit = 10) {
  try {
    const res = await fetch(
      `https://courses.edx.org/api/courses/v1/courses/?search_term=${encodeURIComponent(query)}&page_size=${limit}`,
      { signal: AbortSignal.timeout(15e3) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((course) => {
      const title = cleanText2(course.name || course.title || "");
      const desc = cleanText2(course.short_description || course.description || "");
      const courseId = course.id || course.course_id || "";
      const image = course.media?.image?.large || course.media?.image?.raw || course.media?.banner_image?.uri_absolute || "/assets/extracted/course_cloud.svg";
      return {
        id: `edx-${courseId || Date.now()}`,
        title,
        description: desc || `${title} - Comprehensive verified course curriculum on Open edX.`,
        url: `https://courses.edx.org/courses/${courseId}`,
        source: "open-edx",
        type: "course",
        thumbnail: image
      };
    }).filter((c) => {
      const t = c.title.toLowerCase();
      return t.length > 3 && t !== "untitled course" && t !== "ntest" && !t.includes("<html");
    });
  } catch {
    return [];
  }
}

// src/lib/services/open-stax.ts
async function searchOpenStax(query, limit = 10) {
  try {
    const res = await fetch(
      `https://openstax.org/subjects?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(1e4) }
    );
    if (!res.ok) return [];
    const html = await res.text();
    const books = [];
    const bookRegex = /<a[^>]*href="([^"]*\/books\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    let match = bookRegex.exec(html);
    let count = 0;
    while (match && count < limit) {
      const url = match[1].startsWith("http") ? match[1] : `https://openstax.org${match[1]}`;
      const rawTitle = match[2].replace(/<[^>]*>/g, "").replace(/&[a-z0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
      if (rawTitle.length > 3 && rawTitle.length < 120 && !rawTitle.includes("{") && !rawTitle.toLowerCase().includes("script") && url) {
        books.push({
          id: `openstax-${url.split("/").filter(Boolean).pop()}`,
          title: rawTitle,
          description: `${rawTitle} - Peer-reviewed, open-licensed college textbook from OpenStax.`,
          url,
          source: "openstax",
          type: "course",
          thumbnail: "/assets/extracted/course_softskills.svg"
        });
        count++;
      }
      match = bookRegex.exec(html);
    }
    return books;
  } catch {
    return [];
  }
}

// src/lib/services/openalex.ts
async function searchOpenAlexWorks(query, perPage = 10) {
  try {
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${perPage}&mailto=your@email.com`,
      { signal: AbortSignal.timeout(1e4) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((work) => ({
      id: `oa-${work.id}`,
      title: work.title || "Academic Research Work",
      description: `Peer-reviewed academic research \u2022 Cited by ${work.cited_by_count || 0} scholarly works`,
      url: work.primary_location?.landing_page_url || work.id,
      source: "openalex",
      thumbnail: "/assets/extracted/course_datascience.svg"
    }));
  } catch {
    return [];
  }
}

// src/lib/services/wikimedia.ts
async function searchWikipedia(query, limit = 5) {
  try {
    const searchTerm = query.toLowerCase().includes("programming") ? query : `${query} programming`;
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&srlimit=${limit}`,
      { signal: AbortSignal.timeout(1e4) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.query?.search || []).map((item) => ({
      id: `wiki-${item.pageid}`,
      title: item.title,
      description: item.snippet.replace(/<[^>]*>/g, ""),
      url: `https://en.wikipedia.org/wiki/${item.title.replace(/ /g, "_")}`,
      source: "wikipedia"
    }));
  } catch {
    return [];
  }
}

// src/lib/services/youtube.ts
async function searchYouTubeVideos(query, maxResults = 10) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${apiKey}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || "",
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      source: "youtube",
      description: item.snippet.description
    }));
  } catch {
    return [];
  }
}

// src/lib/pipeline/course-pipeline.ts
function cleanText3(str) {
  if (!str) return "";
  if (/<html|<script|<!doctype|<style/i.test(str)) {
    return "";
  }
  return str.replace(/<[^>]*>/g, "").replace(/&[a-z0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}
function isValidCourseResult(item) {
  const title = (item.title || "").trim();
  const desc = (item.description || "").trim();
  const lowerTitle = title.toLowerCase();
  if (!title || title.length < 3) return false;
  if (lowerTitle.startsWith("ok-") || lowerTitle === "ok" || lowerTitle === "untitled course" || lowerTitle.includes("untitled")) return false;
  if (/<html|<script|<!doctype|<meta/i.test(title) || /<html|<script|<!doctype|<meta/i.test(desc)) return false;
  return true;
}
function getDefaultThumbnail(source) {
  switch (source) {
    case "youtube":
      return "/assets/extracted/course_webdev.svg";
    case "github":
      return "/assets/extracted/course_webdev.svg";
    case "arxiv":
      return "/assets/extracted/course_ml.svg";
    case "crossref":
      return "/assets/extracted/course_python.svg";
    case "openalex":
      return "/assets/extracted/course_datascience.svg";
    case "mit-ocw":
      return "/assets/extracted/course_cloud.svg";
    case "open-edx":
      return "/assets/extracted/course_cybersecurity.svg";
    case "openstax":
      return "/assets/extracted/course_softskills.svg";
    default:
      return "/assets/extracted/course_default.svg";
  }
}
var CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
var searchCache = /* @__PURE__ */ new Map();
function getCachedResults(query) {
  const entry = searchCache.get(query.toLowerCase().trim());
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > entry.ttlMs) {
    searchCache.delete(query.toLowerCase().trim());
    return null;
  }
  return entry.results;
}
function setCachedResults(query, results) {
  searchCache.set(query.toLowerCase().trim(), {
    query: query.toLowerCase().trim(),
    results,
    cachedAt: Date.now(),
    ttlMs: CACHE_TTL_MS
  });
}
async function searchAllSources(query, options) {
  const maxPerSource = options?.maxPerSource || 5;
  const useCache = options?.useCache !== false;
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams({
        q: query,
        includeVideos: String(options?.includeVideos !== false),
        includeCourses: String(options?.includeCourses !== false),
        includeLessons: String(options?.includeLessons === true),
        maxPerSource: String(maxPerSource)
      });
      const res = await fetch(`/api/courses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.results)) {
          return data.results;
        }
      }
    } catch (_err) {
    }
  }
  const cached = useCache ? getCachedResults(query) : null;
  if (cached) {
    return cached;
  }
  const results = [];
  if (options?.includeVideos !== false) {
    const [youtube, archive] = await Promise.allSettled([
      searchYouTubeVideos(query, maxPerSource),
      searchArchiveVideos(query, maxPerSource)
    ]);
    if (youtube.status === "fulfilled")
      results.push(...youtube.value.map((v) => ({
        id: `yt-${v.id}`,
        title: v.title,
        description: v.description,
        url: v.url,
        source: "youtube",
        type: "video",
        duration: v.duration,
        views: v.views,
        thumbnail: v.thumbnail
      })));
    if (archive.status === "fulfilled")
      results.push(...archive.value.map((v) => ({
        id: `ia-${v.id}`,
        title: cleanText3(v.title),
        description: cleanText3(v.description) || "Archived educational video lecture",
        url: v.url,
        source: "archive",
        type: "video",
        thumbnail: v.thumbnail || getDefaultThumbnail("archive")
      })));
  }
  if (options?.includeCourses !== false) {
    const [github, arxiv, crossref, openalex, mitOcw, openEdx, openStax] = await Promise.allSettled([
      searchGitHubCourses(query, maxPerSource),
      searchArxivPapers(query, maxPerSource),
      searchCrossrefWorks(query, maxPerSource),
      searchOpenAlexWorks(query, maxPerSource),
      searchMitOcw(query, maxPerSource),
      searchOpenEdx(query, maxPerSource),
      searchOpenStax(query, maxPerSource)
    ]);
    if (github.status === "fulfilled")
      results.push(...github.value.map((g) => ({
        id: g.id,
        title: cleanText3(g.title),
        description: cleanText3(g.description),
        url: g.url,
        source: "github",
        type: "course",
        stars: g.stars,
        language: g.language,
        thumbnail: g.thumbnail || getDefaultThumbnail("github")
      })));
    if (arxiv.status === "fulfilled")
      results.push(...arxiv.value.map((a) => ({
        id: a.id,
        title: cleanText3(a.title),
        description: cleanText3(a.description),
        url: a.url,
        source: "arxiv",
        type: "lesson",
        thumbnail: a.thumbnail || getDefaultThumbnail("arxiv")
      })));
    if (crossref.status === "fulfilled")
      results.push(...crossref.value.map((c) => ({
        id: c.id,
        title: cleanText3(c.title),
        description: cleanText3(c.description),
        url: c.url,
        source: "crossref",
        type: "lesson",
        thumbnail: c.thumbnail || getDefaultThumbnail("crossref")
      })));
    if (openalex.status === "fulfilled")
      results.push(...openalex.value.map((o) => ({
        id: o.id,
        title: cleanText3(o.title),
        description: cleanText3(o.description),
        url: o.url,
        source: "openalex",
        type: "lesson",
        thumbnail: o.thumbnail || getDefaultThumbnail("openalex")
      })));
    if (mitOcw.status === "fulfilled")
      results.push(...mitOcw.value.map((m) => ({
        id: m.id,
        title: cleanText3(m.title),
        description: cleanText3(m.description),
        url: m.url,
        source: "mit-ocw",
        type: "course",
        thumbnail: m.thumbnail || getDefaultThumbnail("mit-ocw")
      })));
    if (openEdx.status === "fulfilled")
      results.push(...openEdx.value.map((e) => ({
        id: e.id,
        title: cleanText3(e.title),
        description: cleanText3(e.description),
        url: e.url,
        source: "open-edx",
        type: "course",
        thumbnail: e.thumbnail || getDefaultThumbnail("open-edx")
      })));
    if (openStax.status === "fulfilled")
      results.push(...openStax.value.map((s) => ({
        id: s.id,
        title: cleanText3(s.title),
        description: cleanText3(s.description),
        url: s.url,
        source: "openstax",
        type: "course",
        thumbnail: s.thumbnail || getDefaultThumbnail("openstax")
      })));
  }
  if (options?.includeLessons !== false) {
    const wiki = await searchWikipedia(query, maxPerSource);
    results.push(...wiki.map((w) => ({
      id: w.id,
      title: cleanText3(w.title),
      description: cleanText3(w.description),
      url: w.url,
      source: "wikipedia",
      type: "lesson",
      thumbnail: getDefaultThumbnail("wikipedia")
    })));
  }
  const validResults = results.filter(isValidCourseResult);
  if (useCache) {
    setCachedResults(query, validResults);
  }
  return validResults;
}

// src/lib/services/enzonic-ai.ts
import OpenAI2 from "openai";
var _enzonicAI = null;
function getEnzonicAI() {
  if (!_enzonicAI) {
    _enzonicAI = new OpenAI2({
      baseURL: typeof process !== "undefined" && process.env?.ENZONIC_ROTATOR_URL || "http://sgp-two.enzonic.com:25836/v1",
      apiKey: typeof process !== "undefined" && process.env?.ENZONIC_API_KEY || "dummy-key-for-sdk",
      maxRetries: 0,
      dangerouslyAllowBrowser: true
    });
  }
  return _enzonicAI;
}
var enzonicAI = {
  get chat() {
    return getEnzonicAI().chat;
  }
};
var ENZONIC_MODEL2 = process.env.ENZONIC_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";
async function withTimeout(promise, timeoutMs, fallbackOrError) {
  let timer;
  promise.catch(() => {
  });
  const timeoutPromise = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      if (fallbackOrError instanceof Error) {
        reject(fallbackOrError);
      } else if (typeof fallbackOrError === "string") {
        reject(new Error(fallbackOrError));
      } else {
        resolve(fallbackOrError);
      }
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function resolveDomainCategory(query) {
  const lower = String(query || "").toLowerCase().trim();
  if (lower.includes("cyber") || lower.includes("security") || lower.includes("infosec") || lower.includes("hacker") || lower.includes("penetration") || lower.includes("soc")) {
    return "cybersecurity";
  }
  if (lower.includes("ai") || lower.includes("machine learning") || lower.includes("data science") || lower.includes("deep learning") || lower.includes("nlp") || lower.includes("vision") || lower.includes("artificial intelligence") || lower.includes("data engineer")) {
    return "data-science-ai";
  }
  if (lower.includes("cloud") || lower.includes("devops") || lower.includes("sre") || lower.includes("kubernetes") || lower.includes("docker") || lower.includes("aws") || lower.includes("infrastructure") || lower.includes("platform")) {
    return "cloud-devops";
  }
  if (lower.includes("web") || lower.includes("fullstack") || lower.includes("full stack") || lower.includes("frontend") || lower.includes("front end") || lower.includes("react") || lower.includes("node") || lower.includes("next.js") || lower.includes("javascript") || lower.includes("typescript")) {
    return "web-development";
  }
  if (lower.includes("computer science") || lower.includes("software") || lower.includes("backend") || lower.includes("systems") || lower.includes("cse") || lower.includes("gate") || lower.includes("algorithm") || lower.includes("c++") || lower.includes("java")) {
    return "computer-science";
  }
  return "general";
}
var CURATED_CAREER_ROADMAPS = {
  "computer-science": (goal) => ({
    career: goal || "Computer Science & Systems Engineering",
    title: "Computer Science & High-Scale Systems Software Engineer",
    salaryRange: "$110,000 - $185,000 / yr (\u20B918 - \u20B942 LPA)",
    matchScore: 96,
    scope: "Tier-1 Tech & High-Scale Systems \u2022 Top 5% Global Demand",
    description: "Architect high-performance distributed backends, master data structures, algorithms, low-level memory mechanics, concurrency primitives, and microservice architectures.",
    skills: [
      "Data Structures & Algorithms",
      "C++ / Go / Rust / Java",
      "Distributed Systems & Consensus",
      "System Design & Horizontal Scalability",
      "Linux Internals & TCP/IP Networking",
      "Database Engines & ACID Concurrency"
    ],
    milestones: [
      {
        title: "Level 1: Absolute Beginner \u2014 Programming Foundations & Algorithmic Thinking",
        topics: [
          "Primitive Types, Control Flow & Scoping Mechanics",
          "Procedural & Object-Oriented Design Patterns",
          "Asymptotic Complexity (Big-O Notation & Amortized Analysis)",
          "Pointers, References & Memory Layout Basics",
          "Terminal Navigation, Git & Version Control Workflows"
        ],
        estimatedWeeks: 3
      },
      {
        title: "Level 2: Core Fundamentals \u2014 Data Structures & System Architecture",
        topics: [
          "Arrays, Linked Lists, Stacks, and FIFO Queues",
          "Hash Tables, Collision Resolution & Amortized O(1) Performance",
          "Binary Search Trees, Heaps & Priority Queues",
          "Computer Organization, CPU Caches & Virtual Memory Architecture",
          "POSIX Socket Programming & TCP/IP Protocol Stack"
        ],
        estimatedWeeks: 4
      },
      {
        title: "Level 3: Intermediate \u2014 Advanced Algorithms & Database Internals",
        topics: [
          "Graph Algorithms: BFS, DFS, Dijkstra & Minimum Spanning Trees",
          "Dynamic Programming, Memoization & Greedy Techniques",
          "Multi-threading, Race Conditions, Mutexes & Semaphores",
          "Relational Databases: B-Trees, WAL Logs & ACID Transactions",
          "RESTful API Contract Design & Structured Serialization (JSON/Protobuf)"
        ],
        estimatedWeeks: 5
      },
      {
        title: "Level 4: Advanced \u2014 Distributed Systems & High-Throughput Architecture",
        topics: [
          "Distributed Consensus: Raft, Paxos & Quorum Reads/Writes",
          "CAP Theorem, Eventual Consistency & Vector Clocks",
          "Message Brokers: Kafka, RabbitMQ & Stream Processing Pipelines",
          "Microservice Decomposition & Resilient API Gateways",
          "Load Balancing Algorithms, Reverse Proxies & CDN Caching"
        ],
        estimatedWeeks: 6
      },
      {
        title: "Level 5: Real Projects \u2014 Production-Scale Distributed Engine Implementation",
        topics: [
          "Building a Distributed Key-Value Store with LSM-Trees",
          "Implementing a High-Concurrency In-Memory Rate Limiter",
          "Designing an Event-Driven Asynchronous Job Processing Queue",
          "Observability Instrumentation: Distributed Tracing, Prometheus & OpenTelemetry",
          "CI/CD Pipeline with Automated Regression & Stress Testing"
        ],
        estimatedWeeks: 5
      },
      {
        title: "Level 6: Career Ready \u2014 Enterprise System Design, Profiling & Leadership",
        topics: [
          "End-to-End Large Scale System Design (URL Shortener, Chat, Feed)",
          "Kernel Tuning & Profiling CPU/Memory Bottlenecks with eBPF",
          "Zero-Downtime Database Schema Migrations & Blue/Green Deployments",
          "Cost Optimization & Cloud Infrastructure Budgeting",
          "Technical Design Documents (RFCs) & Engineering Mentorship"
        ],
        estimatedWeeks: 4
      }
    ],
    gaps: [
      "Production distributed debugging experience under network partitions",
      "Hands-on profiling of memory and CPU leaks under heavy concurrency",
      "Experience with zero-downtime data migration strategies in live systems"
    ]
  }),
  "data-science-ai": (goal) => ({
    career: goal || "AI & Machine Learning Engineering",
    title: "AI & Machine Learning Research & Systems Engineer",
    salaryRange: "$125,000 - $210,000 / yr (\u20B922 - \u20B950 LPA)",
    matchScore: 98,
    scope: "Frontier AI & Foundational Models \u2022 Rapid Exponential Industry Growth",
    description: "Train, fine-tune, and deploy frontier deep learning models, transformer architectures, LLM reasoning pipelines, and scalable distributed ML infrastructure.",
    skills: [
      "Python & PyTorch",
      "Linear Algebra & Numerical Optimization",
      "Transformer Architectures & Attention Mechanisms",
      "Fine-Tuning (LoRA, QLoRA) & RLHF Alignment",
      "Vector Databases & Production RAG Pipelines",
      "MLOps & TensorRT / vLLM Distributed Inference"
    ],
    milestones: [
      {
        title: "Level 1: Absolute Beginner \u2014 Mathematical Foundations & Python for Data Science",
        topics: [
          "Linear Algebra: Matrices, Eigenvectors & Matrix Decompositions",
          "Multivariable Calculus: Gradients, Jacobians & Chain Rule",
          "Probability Distributions, Expectation & Bayes Theorem",
          "Python Scientific Stack: NumPy Vectorization & Pandas DataFrames",
          "Exploratory Data Analysis (EDA) & Data Visualization Pipelines"
        ],
        estimatedWeeks: 3
      },
      {
        title: "Level 2: Core Fundamentals \u2014 Classical Machine Learning & Statistical Inference",
        topics: [
          "Linear & Logistic Regression with Gradient Descent Optimization",
          "Regularization Techniques: L1 (Lasso), L2 (Ridge) & ElasticNet",
          "Decision Trees, Random Forests & Gradient Boosting (XGBoost/LightGBM)",
          "Dimensionality Reduction: PCA, t-SNE & UMAP",
          "Cross-Validation, Precision-Recall, ROC-AUC & Confusion Matrix Metrics"
        ],
        estimatedWeeks: 4
      },
      {
        title: "Level 3: Intermediate \u2014 Deep Learning & Neural Network Foundations",
        topics: [
          "Feedforward Neural Networks, Backpropagation & Computational Graphs",
          "Activation Functions: ReLU, GELU, Swish & Vanishing Gradient Mitigation",
          "Optimization Algorithms: AdamW, RMSProp & Learning Rate Schedulers",
          "Convolutional Neural Networks (CNNs) for Computer Vision",
          "Recurrent Architectures, LSTMs & Sequence Modeling Basics"
        ],
        estimatedWeeks: 5
      },
      {
        title: "Level 4: Advanced \u2014 Transformers, Large Language Models & Generative AI",
        topics: [
          "Transformer Architecture: Scaled Dot-Product & Multi-Head Self-Attention",
          "Positional Encodings: Sinusoidal, RoPE & ALiBi Mechanics",
          "Pretraining Objectives: Masked LM (BERT) vs Causal LM (GPT)",
          "Parameter-Efficient Fine-Tuning: LoRA, QLoRA & Prefix Tuning",
          "Retrieval-Augmented Generation (RAG): Vector Indexing, Chunking & Rerankers"
        ],
        estimatedWeeks: 6
      },
      {
        title: "Level 5: Real Projects \u2014 Production Agentic AI & Model Deployment",
        topics: [
          "Building an Autonomous Multi-Tool Agent with Function Calling",
          "Production RAG with Hybrid Sparse/Dense Search & Re-ranking",
          "High-Throughput Serving with vLLM, TensorRT-LLM & PagedAttention",
          "Model Quantization: AWQ, GPTQ & GGUF Techniques",
          "Evaluation Frameworks for Hallucination Detection & Truthfulness"
        ],
        estimatedWeeks: 5
      },
      {
        title: "Level 6: Career Ready \u2014 Distributed Training, AI Safety & Enterprise Systems",
        topics: [
          "Distributed Training: DeepSpeed ZeRO, FSDP & Tensor Parallelism",
          "Reinforcement Learning from Human/AI Feedback (RLHF/RLAIF)",
          "Guardrails, Prompt Injection Defense & Safety Alignment",
          "MLOps: Model Registries, Feature Stores & Drift Monitoring",
          "Technical Portfolio, Research Paper Reproductions & AI System Interviews"
        ],
        estimatedWeeks: 4
      }
    ],
    gaps: [
      "Experience with distributed GPU cluster training bottlenecks and communication overhead",
      "Practical understanding of inference cost versus latency tradeoffs",
      "Robust evaluation metrics for non-deterministic generative models"
    ]
  }),
  "web-development": (goal) => ({
    career: goal || "Full-Stack Web Development",
    title: "Full-Stack Web Architect & Modern Application Engineer",
    salaryRange: "$95,000 - $160,000 / yr (\u20B914 - \u20B932 LPA)",
    matchScore: 94,
    scope: "SaaS Platforms & Interactive Web Apps \u2022 High Continuous Market Need",
    description: "Develop high-performance full-stack web applications, responsive user interfaces, serverless API backends, real-time sync systems, and optimized database schemas.",
    skills: [
      "TypeScript & Modern React 19",
      "Next.js & SSR / Streaming SSR",
      "Node.js & Express / Fastify",
      "Tailwind CSS & Responsive UI",
      "PostgreSQL / SQLite & Drizzle ORM",
      "WebSocket / WebRTC & Real-Time Sync"
    ],
    milestones: [
      {
        title: "Level 1: Absolute Beginner \u2014 Modern Web Standards & JavaScript / TypeScript Core",
        topics: [
          "HTML5 Semantic Elements, Accessible DOM Structure (a11y)",
          "CSS3 Flexbox, CSS Grid & Responsive Viewport Design",
          "Modern JavaScript: ES6+, Closures, Promises & Async/Await",
          "TypeScript Type System: Generics, Unions & Type Narrowing",
          "DOM Manipulation, Event Bubbling & Browser Developer Tools"
        ],
        estimatedWeeks: 3
      },
      {
        title: "Level 2: Core Fundamentals \u2014 Component Architecture & Declarative UI with React",
        topics: [
          "React 19 Hooks: useState, useEffect, useMemo, useCallback & useRef",
          "Component Composition, Props Contracts & Custom Hooks",
          "Form Handling, Validation with Zod & Optimistic UI Updates",
          "Client-Side Routing, Nested Layouts & Dynamic Parameters",
          "Styling Systems: Tailwind CSS Utility Architecture & CSS Modules"
        ],
        estimatedWeeks: 4
      },
      {
        title: "Level 3: Intermediate \u2014 Backend APIs, Database Persistence & Authentication",
        topics: [
          "Node.js Event Loop, Streams & Express Server Architecture",
          "RESTful API Design Principles & Status Code Semantics",
          "Relational Database Schema Design with SQLite/PostgreSQL & ORMs",
          "Session vs Token Authentication (JWT, httpOnly Cookies, OAuth 2.0)",
          "Password Hashing (Scrypt/Bcrypt) & Timing-Safe Verification"
        ],
        estimatedWeeks: 5
      },
      {
        title: "Level 4: Advanced \u2014 Full-Stack Frameworks, SSR & Real-Time Systems",
        topics: [
          "Server-Side Rendering (SSR), Static Site Generation (SSG) & Streaming",
          "Server Components vs Client Components Hydration Lifecycle",
          "Real-Time Bi-Directional Communication with WebSockets",
          "Client Cache Synchronization: TanStack Query & Cache Invalidation",
          "Database Indexing, Query Optimization & Transaction Isolation"
        ],
        estimatedWeeks: 6
      },
      {
        title: "Level 5: Real Projects \u2014 Production Full-Stack SaaS Application",
        topics: [
          "Architecting a Multi-Tenant SaaS with Stripe Billing Integration",
          "Implementing Role-Based Access Control (RBAC) & Organization Teams",
          "Cloud File Storage with S3/R2 & Presigned URL Uploads",
          "Background Asynchronous Worker Tasks & Rate Limiting Queues",
          "End-to-End Testing with Playwright & Integration Testing with Bun/Jest"
        ],
        estimatedWeeks: 5
      },
      {
        title: "Level 6: Career Ready \u2014 Web Performance Tuning, Security & Operations",
        topics: [
          "Core Web Vitals Optimization: LCP, INP, CLS & Bundle Splitting",
          "Web Security Hardening: CSP, CORS, XSS, CSRF & SQL Injection Defense",
          "Edge Computing, Vercel Serverless Architecture & CDN Caching Strategies",
          "Error Monitoring with Sentry & Real User Monitoring (RUM)",
          "Full-Stack Technical Interview Preparation & System Design"
        ],
        estimatedWeeks: 4
      }
    ],
    gaps: [
      "Deep browser rendering pipeline & repaint profiling knowledge",
      "Edge caching & distributed session management experience",
      "Complex database deadlock and connection pool exhaustion tuning"
    ]
  }),
  cybersecurity: (goal) => ({
    career: goal || "Cybersecurity & Information Defense",
    title: "Cybersecurity Architect & Security Operations Specialist",
    salaryRange: "$105,000 - $175,000 / yr (\u20B916 - \u20B938 LPA)",
    matchScore: 95,
    scope: "Critical Enterprise Infrastructure Protection \u2022 Zero-Unemployment Specialty",
    description: "Defend enterprise perimeters, conduct vulnerability assessments, design zero-trust access fabrics, automate threat detection, and engineer cryptographic defenses.",
    skills: [
      "Network Security & Packet Inspection",
      "Zero Trust Architecture & IAM",
      "OWASP Top 10 & Web Exploits",
      "Applied Cryptography & PKI",
      "SIEM / EDR & Incident Response",
      "Cloud Security & DevSecOps"
    ],
    milestones: [
      {
        title: "Level 1: Absolute Beginner \u2014 Security Foundations, OS Internals & Networking Basics",
        topics: [
          "OSI & TCP/IP Model: Headers, Handshakes & Packet Encapsulation",
          "Linux & Windows Security Architecture, Permissions & Privileges",
          "Common Attack Vectors: Phishing, Social Engineering & Malware Types",
          "Security Governance: CIA Triad, NIST Cybersecurity Framework & ISO 27001",
          "Network Scanning Basics with Nmap & Packet Capture with Wireshark"
        ],
        estimatedWeeks: 3
      },
      {
        title: "Level 2: Core Fundamentals \u2014 Network Defense, Firewalls & Cryptography",
        topics: [
          "Symmetric vs Asymmetric Encryption (AES, RSA, ECC)",
          "Hashing, HMACs, Digital Signatures & Public Key Infrastructure (PKI)",
          "Stateful Firewalls, IDS/IPS Configuration & Snort Rules",
          "Virtual Private Networks (VPNs, WireGuard, IPsec) & Tunneling Protocols",
          "DNS Security (DNSSEC, DoH) & Port Scanning Mitigation"
        ],
        estimatedWeeks: 4
      },
      {
        title: "Level 3: Intermediate \u2014 Application Security & OWASP Top 10 Defense",
        topics: [
          "SQL Injection (SQLi) In-depth: Blind, Union-Based & Parameterization",
          "Cross-Site Scripting (XSS): Stored, Reflected, DOM & CSP Defense",
          "Cross-Site Request Forgery (CSRF) & SameSite Cookie Directives",
          "Server-Side Request Forgery (SSRF) & Cloud Metadata Attacks",
          "Authentication Flaws: Session Hijacking, JWT Tampering & Credential Stuffing"
        ],
        estimatedWeeks: 5
      },
      {
        title: "Level 4: Advanced \u2014 Enterprise Identity, Threat Hunting & Cloud Security",
        topics: [
          "Zero Trust Architecture (ZTA): Micro-segmentation & Continuous Auth",
          "Active Directory Security, Kerberos Attacks (Kerberoasting, Pass-the-Hash)",
          "Cloud Security: AWS IAM Least Privilege, S3 Bucket Security & KMS",
          "Security Information & Event Management (SIEM): Splunk / Elastic Security",
          "Endpoint Detection & Response (EDR) Telemetry & Threat Hunting"
        ],
        estimatedWeeks: 6
      },
      {
        title: "Level 5: Real Projects \u2014 Applied Penetration Testing & Automated SecOps",
        topics: [
          "Conducting an Authorized Web App Penetration Test & Report Generation",
          "Building an Automated Vulnerability Scanner Pipeline in CI/CD (SAST/DAST)",
          "Simulating Incident Response: Containment, Eradication & Post-Mortem",
          "Reverse Engineering Malware Samples in Sandbox Environments (Ghidra)",
          "Container Security: Dockerfile Hardening, Trivy Scanning & K8s RBAC"
        ],
        estimatedWeeks: 5
      },
      {
        title: "Level 6: Career Ready \u2014 Security Governance, Incident Command & Certifications",
        topics: [
          "Red Team vs Blue Team Exercises & Threat Modeling (STRIDE/PASTA)",
          "Regulatory Compliance Auditing: SOC 2 Type II, GDPR, HIPAA & PCI-DSS",
          "Executive Security Briefings & Quantified Cyber Risk Assessment",
          "Preparation for Industry Certifications (Security+, CISSP, OSCP)",
          "Security System Design & Technical Threat Analysis Interviews"
        ],
        estimatedWeeks: 4
      }
    ],
    gaps: [
      "Live incident response under adversarial pressure",
      "Advanced kernel-level exploit development and shellcoding",
      "Complex cross-cloud identity federation debugging"
    ]
  }),
  "cloud-devops": (goal) => ({
    career: goal || "Cloud Architecture & DevOps Engineering",
    title: "Cloud Infrastructure Architect & Site Reliability Engineer",
    salaryRange: "$115,000 - $190,000 / yr (\u20B918 - \u20B945 LPA)",
    matchScore: 95,
    scope: "Cloud Infrastructure & Platform Engineering \u2022 Universal Enterprise Necessity",
    description: "Automate multi-region cloud infrastructures, orchestrate Kubernetes clusters, design CI/CD delivery pipelines, and enforce 99.99% availability SLAs.",
    skills: [
      "Linux Internals & Bash / Python",
      "Docker & Kubernetes Orchestration",
      "Terraform & Infrastructure as Code",
      "AWS / GCP Multi-Region Architecture",
      "CI/CD Pipelines (GitHub Actions / GitLab)",
      "Prometheus, Grafana & Chaos Engineering"
    ],
    milestones: [
      {
        title: "Level 1: Absolute Beginner \u2014 Linux Systems Administration & Shell Scripting",
        topics: [
          "Linux Filesystem Hierarchy, Process Management & Signals",
          "Bash Scripting: Control Flow, Pipes, Redirection & Text Processing (awk/sed)",
          "Git Distributed Version Control & GitFlow/Trunk-Based Development",
          "Networking Fundamentals: CIDR Subnetting, Routing Tables & DNS Resolution",
          "SSH Key Authentication, Bastion Hosts & Secure Remote Administration"
        ],
        estimatedWeeks: 3
      },
      {
        title: "Level 2: Core Fundamentals \u2014 Containerization with Docker & Cloud Compute Basics",
        topics: [
          "Container Mechanics: Linux Namespaces, Cgroups & Union Filesystems (OverlayFS)",
          "Writing Minimal, Multi-Stage Dockerfiles for Production Runtimes",
          "Docker Compose for Local Multi-Service Development Environments",
          "Cloud Compute Fundamentals: Virtual Machines, Security Groups & VPCs",
          "Object Storage (S3/Blob), Block Storage (EBS) & Lifecycle Rules"
        ],
        estimatedWeeks: 4
      },
      {
        title: "Level 3: Intermediate \u2014 Infrastructure as Code (IaC) & Continuous Delivery",
        topics: [
          "Declarative Infrastructure with Terraform: State, Modules & Providers",
          "Automated CI/CD Pipelines: Build, Test, Lint & Security Scans",
          "Secrets Management in CI/CD: Vault, Cloud Secrets Manager",
          "Artifact Registries & Semantic Versioning Strategies",
          "Zero-Downtime Deployment Strategies: Rolling, Blue/Green & Canary"
        ],
        estimatedWeeks: 5
      },
      {
        title: "Level 4: Advanced \u2014 Kubernetes Cluster Orchestration & Networking",
        topics: [
          "Kubernetes Architecture: Control Plane, Kubelet, etcd & Worker Nodes",
          "Workloads: Pods, Deployments, StatefulSets & DaemonSets",
          "K8s Networking: CNI Plugins, ClusterIP, NodePort, LoadBalancer & Ingress",
          "ConfigMaps, Secrets, PersistentVolumes & CSI Storage Drivers",
          "Helm Package Management & GitOps Delivery with ArgoCD or Flux"
        ],
        estimatedWeeks: 6
      },
      {
        title: "Level 5: Real Projects \u2014 Production High-Availability Platform Implementation",
        topics: [
          "Deploying a Production-Grade Multi-AZ Kubernetes Cluster with Terraform",
          "Implementing Full Observability Stack: Prometheus Metrics & Grafana Dashboards",
          "Centralized Logging: Fluentbit, OpenSearch/Loki & Log Retention Policies",
          "Automated Horizontal Pod Autoscaling (HPA) & Cluster Autoscaler",
          "Disaster Recovery Plan: Automated Multi-Region Database Backups & Failover"
        ],
        estimatedWeeks: 5
      },
      {
        title: "Level 6: Career Ready \u2014 Site Reliability Engineering (SRE) & Enterprise Operations",
        topics: [
          "SRE Core Principles: SLIs, SLOs, SLAs & Error Budget Policies",
          "Incident Management, On-Call Protocols & Blameless Post-Mortems",
          "Chaos Engineering & Failure Injection Testing (Chaos Mesh / Gremlin)",
          "Cloud Financial Operations (FinOps): Resource Rightsizing & Cost Governance",
          "Cloud Architecture Certification & Platform Engineering Interviews"
        ],
        estimatedWeeks: 4
      }
    ],
    gaps: [
      "Multi-region cross-continent network latency mitigation experience",
      "Large-scale Kubernetes etcd quorum recovery during network partitions",
      "Advanced eBPF kernel network observability profiling"
    ]
  }),
  general: (goal) => {
    const cleanGoal = String(goal || "Specialized Technology Track").trim();
    return {
      career: cleanGoal,
      title: `${cleanGoal} Specialist & Applied Practitioner`,
      salaryRange: "$90,000 - $160,000 / yr (\u20B914 - \u20B935 LPA)",
      matchScore: 92,
      scope: "Specialized Domain Track \u2022 Industry Competitive Competencies",
      description: `A comprehensive, rigorous 6-level mastery curriculum for ${cleanGoal}, structured from foundational concepts to enterprise execution.`,
      skills: [
        `${cleanGoal} Foundations`,
        "Analytical Problem Solving",
        "Modern Tooling & Frameworks",
        "System Design & Architecture",
        "Production Engineering",
        "Industry Standards & Best Practices"
      ],
      milestones: [
        {
          title: `Level 1: Absolute Beginner \u2014 Foundations & Core Terminology of ${cleanGoal}`,
          topics: [
            `Core Terminology & Theoretical Principles in ${cleanGoal}`,
            "Environment Setup, Essential Tools & Development Workflows",
            "Fundamental Principles & Baseline Problem Solving",
            "Standard Protocols, Syntax & Data Formats",
            "Version Control, Documentation & Collaborative Workflows"
          ],
          estimatedWeeks: 3
        },
        {
          title: `Level 2: Core Fundamentals \u2014 Methodologies & Standard Tooling in ${cleanGoal}`,
          topics: [
            `Standard Methodologies & Standard Tooling in ${cleanGoal}`,
            "Data Handling, Input Validation & State Processing",
            "Core Component Architecture & Decomposition",
            "Testing Foundations: Unit Testing & Automated Assertions",
            "Debugging Techniques, Profiling Tools & Logging Workflows"
          ],
          estimatedWeeks: 4
        },
        {
          title: `Level 3: Intermediate \u2014 Applied Engineering & Problem Solving for ${cleanGoal}`,
          topics: [
            `Applied Engineering & Algorithmic Problem Solving for ${cleanGoal}`,
            "Integration with External APIs & Data Persistence Layers",
            "Concurrency, Asynchronous Execution & Event Handling",
            "Performance Profiling & Bottleneck Mitigation",
            "Security Best Practices, Input Sanitization & Authentication Basics"
          ],
          estimatedWeeks: 5
        },
        {
          title: `Level 4: Advanced \u2014 High-Performance Architecture & Specialized Techniques`,
          topics: [
            `High-Performance Architecture & Specialized Domain Patterns in ${cleanGoal}`,
            "Distributed Execution, Scalability & Resource Optimization",
            "Fault Tolerance, Circuit Breakers & Resiliency Design",
            "Advanced Data Pipelines & Serialization Efficiency",
            "Telemetry Instrumentation, Metrics Collection & Monitoring"
          ],
          estimatedWeeks: 6
        },
        {
          title: `Level 5: Real Projects \u2014 Capstone Implementation & Production Deployment`,
          topics: [
            `End-to-End Capstone Implementation & Production Deployment in ${cleanGoal}`,
            "Automated Continuous Integration & Continuous Deployment (CI/CD)",
            "Load Testing, Benchmark Verification & Stress Simulation",
            "Security Auditing, Compliance Review & Dependency Scanning",
            "Comprehensive Production Documentation & Runbooks"
          ],
          estimatedWeeks: 5
        },
        {
          title: `Level 6: Career Ready \u2014 Industry Leadership, Optimization & Portfolio`,
          topics: [
            `Enterprise System Architecture & Scalability Reviews in ${cleanGoal}`,
            "Disaster Recovery Planning, Incident Response & Runbooks",
            "Cost Governance, Operational Efficiency & Infrastructure Budgeting",
            "Open-Source Contributions & Professional Portfolio Presentation",
            "Technical Architecture Interview Preparation & System Defense"
          ],
          estimatedWeeks: 4
        }
      ],
      gaps: [
        `Advanced domain-specific failure mode recovery in ${cleanGoal}`,
        "High-throughput production scale testing and benchmark experience",
        "Industry-standard certification and professional portfolio visibility"
      ]
    };
  }
};
function getCuratedCareerPath(careerGoal) {
  const domain = resolveDomainCategory(careerGoal);
  const factory = CURATED_CAREER_ROADMAPS[domain] || CURATED_CAREER_ROADMAPS.general;
  return factory(careerGoal);
}
var CURATED_QUIZ_BANKS = {
  "computer-science": [
    {
      question: "What is the worst-case time complexity of Quickselect when deterministic first-element pivoting is used on an already-sorted array?",
      options: ["O(N\xB2)", "O(N log N)", "O(N)", "O(log N)"],
      correctIndex: 0,
      explanation: "On an already-sorted array, picking the first element creates heavily unbalanced partitions of size 0 and N-1, leading to O(N\xB2) worst-case comparisons without randomized or median-of-medians pivoting."
    },
    {
      question: "Which storage engine architecture is specifically optimized for high-throughput append-only write workloads via sequential I/O?",
      options: [
        "Log-Structured Merge-Tree (LSM-Tree)",
        "B+ Tree with 4KB page splits",
        "R-Tree spatial index",
        "Extensible Hash Index with bucket chaining"
      ],
      correctIndex: 0,
      explanation: "LSM-Trees buffer writes in an in-memory MemTable and flush sequentially to immutable SSTables on disk, maximizing sequential write bandwidth and avoiding expensive random disk writes."
    },
    {
      question: "Under the CAP theorem, how does a CP (Consistent / Partition-Tolerant) distributed database maintain consistency during a network partition?",
      options: [
        "Rejects reads and writes on minority partitions that cannot assemble a quorum",
        "Accepts unsynchronized local writes on all partitions without coordination",
        "Bypasses partitioned routers by broadcasting via UDP multicasts",
        "Immediately terminates all replica nodes to prevent split-brain"
      ],
      correctIndex: 0,
      explanation: "CP databases require a strict majority quorum (> N/2 nodes) to process mutations. Nodes in a minority partition cannot establish quorum and must reject writes to prevent divergent state."
    },
    {
      question: "In multi-threaded systems programming, what performance hazard occurs when distinct CPU cores modify independent variables that share the same cache line?",
      options: [
        "False sharing leading to cache-line invalidation storms",
        "Deadlock in the hardware memory arbitration bus",
        "Stack pointer corruption in the CPU register file",
        "Dynamic branch misprediction penalty"
      ],
      correctIndex: 0,
      explanation: "False sharing happens when independent variables reside within the same 64-byte cache line. Cores modifying their separate variables trigger cache coherency protocols (MESI), constantly invalidating each other\u2019s L1/L2 caches."
    },
    {
      question: "Which synchronization primitive permits concurrent read access for multiple threads while enforcing exclusive mutual exclusion for write operations?",
      options: [
        "Read-Write Lock (Shared-Exclusive Mutex)",
        "Spinlock with exponential backoff delay",
        "Peterson Algorithm for two-thread coordination",
        "Non-reentrant binary counting semaphore"
      ],
      correctIndex: 0,
      explanation: "Read-Write locks permit arbitrary concurrent readers in shared mode, acquiring exclusive lock privileges only when a writer thread executes a mutation."
    },
    {
      question: "What is the primary operational mechanism behind the Two-Phase Commit (2PC) protocol in distributed transactions?",
      options: [
        "A coordinator asks participants to prepare, then issues commit only if all vote affirmatively",
        "Nodes exchange transaction logs peer-to-peer via epidemic gossip",
        "Replicas perform speculative execution and revert via event sourcing if collisions occur",
        "Transactions are timestamped and committed in strict monotonic sequence without voting"
      ],
      correctIndex: 0,
      explanation: "In 2PC, Phase 1 (Prepare) requires every participant to lock resources and vote YES/NO. In Phase 2 (Commit), the coordinator commands all nodes to commit if all voted YES, or abort if any node voted NO."
    },
    {
      question: "Which memory management strategy eliminates external memory fragmentation by allocating fixed-size power-of-two blocks?",
      options: [
        "Buddy Memory Allocation system",
        "First-Fit sequential pointer scanning",
        "Mark-and-Sweep garbage collection compaction",
        "Generational nursery heap promotion"
      ],
      correctIndex: 0,
      explanation: "The Buddy allocator recursively subdivides memory into power-of-two chunks (buddies) and coalesces adjacent free buddies upon deallocation, preventing external fragmentation."
    },
    {
      question: "Which traversal algorithm produces nodes in strictly non-decreasing sorted order when executed on a Binary Search Tree (BST)?",
      options: [
        "In-order traversal (Left, Root, Right)",
        "Pre-order traversal (Root, Left, Right)",
        "Post-order traversal (Left, Right, Root)",
        "Breadth-first level-order traversal"
      ],
      correctIndex: 0,
      explanation: "Because a BST enforces Left < Root < Right, an in-order traversal visits the left subtree, the current node, and then the right subtree, outputting keys in ascending sorted order."
    },
    {
      question: "What is the asymptotic time complexity of building a binary min-heap from an unsorted array of N elements using the bottom-up heapify algorithm?",
      options: ["O(N)", "O(N log N)", "O(N\xB2)", "O(log N)"],
      correctIndex: 0,
      explanation: "Bottom-up heap construction runs in O(N) linear time because the majority of nodes reside near the bottom of the tree where the maximum shift-down distance is small (sum of h / 2^h converges to 2)."
    },
    {
      question: "Which networking layer protocol guarantees ordered, reliable, error-checked delivery of a stream of octets over an IP network?",
      options: [
        "Transmission Control Protocol (TCP)",
        "User Datagram Protocol (UDP)",
        "Internet Control Message Protocol (ICMP)",
        "Address Resolution Protocol (ARP)"
      ],
      correctIndex: 0,
      explanation: "TCP uses sequence numbers, acknowledgments, sliding windows, and retransmissions to guarantee in-order, reliable delivery of data streams over packet-switched IP networks."
    }
  ],
  "data-science-ai": [
    {
      question: "In the Transformer architecture, why is the dot product of queries and keys scaled by 1 / sqrt(d_k) before computing softmax?",
      options: [
        "To prevent dot products from growing large in high dimensions, which pushes softmax into vanishing gradient regions",
        "To reduce the computational complexity of self-attention from O(N\xB2) to O(N)",
        "To make attention weights strictly invariant to sequence length",
        "To eliminate the requirement for residual skip connections"
      ],
      correctIndex: 0,
      explanation: "For large key vectors of dimension d_k, the dot products grow large in magnitude, driving softmax into regions with extremely small gradients. Scaling by 1 / sqrt(d_k) preserves stable gradient flow."
    },
    {
      question: "When fine-tuning Large Language Models using LoRA (Low-Rank Adaptation), how are model weights modified?",
      options: [
        "Base weights are frozen and low-rank decomposition matrices (A and B) are trained in parallel",
        "All model weights are retrained with high weight decay and gradient clipping",
        "Zero-weight neurons are pruned and full-rank dense layers are added to every block",
        "Weights are converted to 1-bit integers without parameter adjustments"
      ],
      correctIndex: 0,
      explanation: "LoRA freezes the original pre-trained weight matrix W and injects trainable rank decomposition matrices \u0394W = B \xD7 A (where r << d), drastically minimizing trainable parameters and GPU VRAM."
    },
    {
      question: "Which evaluation metric is most informative when evaluating a model on a highly imbalanced dataset (e.g. 99.8% negative, 0.2% positive fraud detection)?",
      options: [
        "Area Under the Precision-Recall Curve (PR-AUC)",
        "Raw Accuracy score",
        "Mean Squared Error (MSE)",
        "R-squared goodness of fit"
      ],
      correctIndex: 0,
      explanation: "Raw accuracy is uninformative on imbalanced data because a trivial model predicting negative achieves 99.8% accuracy. PR-AUC directly evaluates the trade-off between positive precision and recall."
    },
    {
      question: "What is the fundamental difference in parameter shrinkage between L1 (Lasso) and L2 (Ridge) regularization?",
      options: [
        "L1 drives non-informative feature weights strictly to zero, performing feature selection",
        "L2 drives weights to zero while L1 shrinks weights asymptotically",
        "L1 requires calculating second-order Hessian matrices while L2 is derivative-free",
        "L2 can only be applied to deep neural networks while L1 is for linear models"
      ],
      correctIndex: 0,
      explanation: "Due to its diamond-shaped L1 norm contour intersecting axis vertices, Lasso penalty drives non-contributing feature coefficients to exactly zero, producing sparse, interpretable models."
    },
    {
      question: "What mathematical operation does Rotary Position Embedding (RoPE) use to inject sequence order into LLM query/key vectors?",
      options: [
        "Applies an orthogonal 2D rotation matrix to paired components of query and key vectors",
        "Adds a static learned positional vector directly to the token embedding",
        "Subtracts the monotonic token index from attention logits prior to softmax",
        "Shuffles token vectors randomly across transformer layers"
      ],
      correctIndex: 0,
      explanation: "RoPE represents position by rotating query and key representations in complex vector space, ensuring the inner product between query and key naturally decays as relative token distance increases."
    },
    {
      question: "Which optimization algorithm computes adaptive learning rates per-parameter by dividing gradients by the root-mean-square of recent squared gradients with decoupled weight decay?",
      options: ["AdamW", "Standard SGD with fixed momentum", "Adagrad without damping", "Nesterov Accelerated Gradient"],
      correctIndex: 0,
      explanation: "AdamW decouples weight decay from gradient updates, fixing a bug in classical Adam where L2 regularization was scaled by the adaptive moving average variance."
    },
    {
      question: "In Retrieval-Augmented Generation (RAG), what is the primary benefit of deploying a Cross-Encoder Re-ranker after initial vector retrieval?",
      options: [
        "Performs joint self-attention across both query and document to accurately score contextual relevance",
        "Compresses vector database embeddings from 1536 dimensions to 256 dimensions",
        "Translates documents into multiple languages before LLM synthesis",
        "Splits large documents into overlapping 512-token chunks"
      ],
      correctIndex: 0,
      explanation: "While bi-encoders generate separate embeddings for speed, cross-encoders feed the query and document together through all attention layers, capturing intricate semantic interactions for superior ranking."
    },
    {
      question: "What phenomenon occurs during deep neural network training when gradients shrink exponentially as they propagate backward through many layers?",
      options: [
        "Vanishing gradient problem",
        "Exploding gradient catastrophe",
        "Catastrophic forgetting during fine-tuning",
        "Dead neuron collapse in leaky activation units"
      ],
      correctIndex: 0,
      explanation: "When using activations like sigmoid or tanh, repeated multiplication of derivatives < 1 across many layers causes gradients to vanish exponentially, preventing early layers from updating."
    },
    {
      question: "Which loss function is the industry standard for training autoregressive (causal) large language models on next-token prediction?",
      options: [
        "Cross-Entropy loss on categorical vocabulary distributions",
        "Mean Absolute Error (L1 loss)",
        "Hinge loss with maximum margin",
        "Kullback-Leibler divergence with uniform prior"
      ],
      correctIndex: 0,
      explanation: "Autoregressive language models predict the probability distribution of the next token over the entire vocabulary, optimized using categorical cross-entropy (negative log-likelihood)."
    },
    {
      question: "What is the primary role of the temperature parameter during LLM inference sampling?",
      options: [
        "Scales the logits before softmax to control the randomness of token selection",
        "Controls the physical clock frequency of the GPU tensor cores",
        "Sets the maximum number of tokens generated before stopping",
        "Filters out tokens whose cumulative probability exceeds top_p"
      ],
      correctIndex: 0,
      explanation: "Dividing logits by temperature before softmax sharpens the distribution (low T \u2192 deterministic, greedy choice) or flattens it (high T \u2192 creative, diverse token sampling)."
    }
  ],
  "web-development": [
    {
      question: "In the browser event loop, what is the exact execution priority relationship between Microtasks and Macrotasks?",
      options: [
        "The microtask queue (Promise.then, queueMicrotask) is drained completely before the next macrotask (setTimeout) runs",
        "Macrotasks execute first, followed by microtasks only during idle browser periods",
        "Microtasks and macrotasks are interleaved in an alternating 1:1 order",
        "Microtasks only execute during requestAnimationFrame rendering passes"
      ],
      correctIndex: 0,
      explanation: "At the end of each task in the event loop, the JavaScript engine drains all jobs in the microtask queue to completion before yielding to browser rendering or the next macrotask."
    },
    {
      question: "Which cookie attribute flag prevents malicious client-side JavaScript from accessing session authentication tokens via document.cookie?",
      options: [
        "HttpOnly directive in Set-Cookie",
        "Secure directive in Set-Cookie",
        "SameSite=Strict directive",
        "Content-Security-Policy: default-src self"
      ],
      correctIndex: 0,
      explanation: "The HttpOnly flag directs the browser that the cookie must not be exposed to client-side scripts (such as document.cookie), mitigating session token exfiltration via Cross-Site Scripting (XSS)."
    },
    {
      question: "In React 19 and Modern Next.js, what is the primary runtime characteristic of React Server Components (RSC)?",
      options: [
        "Execute exclusively on the server and transmit zero component JavaScript to the client browser bundle",
        "Cannot accept props or data from parent components",
        "Re-render inside the browser on every mouse movement event",
        "Execute inside a client-side Web Worker thread"
      ],
      correctIndex: 0,
      explanation: "Server Components execute on the server and serialize into a compact virtual DOM stream, completely eliminating their dependencies and runtime code from the client browser bundle."
    },
    {
      question: "What is the primary advantage of the Expand-and-Contract (Parallel Run) pattern for high-traffic database migrations?",
      options: [
        "Permits zero-downtime schema migrations where old and new application versions run concurrently",
        "Reduces relational database disk storage by 50% via compression",
        "Automatically converts SQL tables into document collections",
        "Removes the requirement for foreign key constraints in high-scale tables"
      ],
      correctIndex: 0,
      explanation: "Expand-and-contract first introduces non-breaking schema additions (expand), deploys updated code across application replicas, and subsequently removes obsolete columns (contract) without downtime."
    },
    {
      question: "Which CSS layout specification provides native two-dimensional alignment controls (controlling both rows and columns simultaneously)?",
      options: [
        "CSS Grid Layout",
        "CSS Flexible Box Layout (Flexbox)",
        "CSS Multi-column Layout",
        "CSS Absolute Positioning with calc()"
      ],
      correctIndex: 0,
      explanation: "CSS Grid is designed specifically for two-dimensional layouts (rows and columns simultaneously), whereas Flexbox is designed primarily for one-dimensional layouts (a single row or column)."
    },
    {
      question: "What Cross-Origin Resource Sharing (CORS) mechanism does a browser trigger before dispatching non-simple HTTP requests (such as PUT or requests with custom headers)?",
      options: [
        "Dispatches an HTTP OPTIONS preflight request to verify server permissions",
        "Sends a TCP SYN probe to port 443",
        "Downloads the server SSL certificate for client validation",
        "Executes a DNS reverse-lookup query on the origin IP"
      ],
      correctIndex: 0,
      explanation: "For non-simple HTTP requests, browsers dispatch an OPTIONS preflight request with Origin and Access-Control-Request-* headers to verify that the server authorizes the cross-origin request."
    },
    {
      question: 'In relational database management, what does the ACID "Isolation" property guarantee when multiple transactions execute concurrently?',
      options: [
        "Intermediate uncommitted states of a transaction are invisible to other concurrent transactions according to the isolation level",
        "Committed transactions survive unexpected power loss or server crashes",
        "Database constraints and foreign keys are never violated during execution",
        "All statements in a transaction either complete fully or roll back completely"
      ],
      correctIndex: 0,
      explanation: "Isolation prevents concurrent transactions from reading incomplete or inconsistent intermediate states (avoiding dirty reads, non-repeatable reads, or phantom reads based on the configured level)."
    },
    {
      question: "Which client-side caching header directive instructs browsers to cache a resource but revalidate with the origin server before every reuse?",
      options: [
        "Cache-Control: no-cache",
        "Cache-Control: no-store",
        "Cache-Control: public, max-age=31536000",
        "Cache-Control: immutable"
      ],
      correctIndex: 0,
      explanation: "Cache-Control: no-cache allows the browser to store the asset in cache, but forces it to send an ETag/If-None-Match conditional request to the server before serving it from cache."
    },
    {
      question: "In React, what is the consequence of not providing stable unique keys when rendering dynamic lists of components?",
      options: [
        "React reconciler may misidentify elements, causing state desynchronization and unnecessary DOM re-creations",
        "The JavaScript event loop enters an infinite recursion crash",
        "All client network requests are automatically paused",
        "The CSS stylesheet is unloaded from browser memory"
      ],
      correctIndex: 0,
      explanation: "React uses keys during reconciliation to identify which list items were changed, added, or removed. Unstable or missing keys force React to re-mount DOM nodes and can attach state to the wrong item."
    },
    {
      question: "What modern web protocol upgrades HTTP over TCP to run over UDP via QUIC, eliminating head-of-line blocking?",
      options: ["HTTP/3", "HTTP/2", "HTTP/1.1 with Pipelining", "WebSockets (RFC 6455)"],
      correctIndex: 0,
      explanation: "HTTP/3 uses QUIC over UDP, ensuring that packet loss on one stream does not stall data transmission on other independent streams (eliminating transport-layer head-of-line blocking)."
    }
  ],
  cybersecurity: [
    {
      question: "What is the foundational architectural axiom of the Zero Trust security model?",
      options: [
        '"Never trust, always verify" \u2014 treat internal and external network traffic as equally hostile',
        "Trust all connections originating from within the corporate office LAN",
        "Rely entirely on perimeter firewalls to block all external threats",
        "Disable all cryptographic handshakes on internal microservice communications"
      ],
      correctIndex: 0,
      explanation: "Zero Trust assumes breach and requires continuous explicit verification, least privilege access, and micro-segmentation regardless of whether the requester is inside or outside the network perimeter."
    },
    {
      question: "In a Blind SQL Injection attack where the application returns no database error messages or reflective data, how can an attacker infer sensitive values?",
      options: [
        "Injecting conditional Boolean expressions or time delays (e.g. SLEEP/pg_sleep) to infer character values from response latency",
        "Flooding the web server with oversized TCP SYN packets",
        "Reading client-side session cookies stored in localStorage",
        "Dispatching HTTP OPTIONS requests to query database catalog metadata"
      ],
      correctIndex: 0,
      explanation: 'Time-based and Boolean blind SQLi injects conditional clauses (e.g., IF(SUBSTRING(password,1,1)="a", SLEEP(5), 0)), measuring server response delays to reconstruct sensitive data character by character.'
    },
    {
      question: "What critical security failure occurs if an authenticated encryption cipher (such as AES-GCM) reuses the same Nonce with the same secret key?",
      options: [
        "Both confidentiality and ciphertext authenticity guarantees are catastrophically compromised",
        "Only encryption throughput decreases slightly",
        "Ciphertext payload length expands to double its original size",
        "Nothing, nonces are optional random padding strings"
      ],
      correctIndex: 0,
      explanation: "Reusing a Nonce with the same key in AES-GCM allows attackers to recover the authentication hash key (H) and forge arbitrary messages, destroying both confidentiality and message integrity."
    },
    {
      question: "How does a Content Security Policy (CSP) with a cryptographic nonce protect web applications against Cross-Site Scripting (XSS)?",
      options: [
        "The browser refuses to execute script tags unless their nonce attribute matches the server-generated per-request random token",
        "The browser scrambles all HTML tags in memory before rendering",
        "It converts all inline JavaScript into WebAssembly binaries at runtime",
        "It blocks all outgoing HTTP GET requests from browser scripts"
      ],
      correctIndex: 0,
      explanation: 'With script-src "nonce-<token>", injected malicious <script> tags lack the random server-generated token and are blocked by the browser, neutralizing reflected and stored XSS execution.'
    },
    {
      question: "In Public Key Infrastructure (PKI), what is the function of the Online Certificate Status Protocol (OCSP)?",
      options: [
        "Enables clients to query whether a specific digital certificate has been revoked prior to its scheduled expiration",
        "Issues new asymmetric private keys to connecting browsers automatically",
        "Encrypts user passwords stored in relational databases",
        "Replicates DNS zone records across authoritative nameservers"
      ],
      correctIndex: 0,
      explanation: "OCSP allows clients (browsers) to query the issuing Certificate Authority in real time to verify whether a certificate has been revoked due to private key compromise or administrative revocation."
    },
    {
      question: "Which Active Directory attack technique extracts Kerberos service ticket hashes from memory or network captures to crack service account passwords offline?",
      options: [
        "Kerberoasting",
        "Pass-the-Hash",
        "Golden Ticket creation",
        "DNS Cache Poisoning"
      ],
      correctIndex: 0,
      explanation: "Kerberoasting requests TGS service tickets for SPN-associated service accounts. Because tickets are encrypted with the target account\u2019s NTLM password hash, attackers crack them offline without alerting domain controllers."
    },
    {
      question: "What vulnerability occurs when an application receives a user-supplied URL and fetches it without restricting access to internal metadata services (e.g. 169.254.169.254)?",
      options: [
        "Server-Side Request Forgery (SSRF)",
        "Cross-Site Request Forgery (CSRF)",
        "Insecure Direct Object Reference (IDOR)",
        "DOM-based Cross-Site Scripting (DOM XSS)"
      ],
      correctIndex: 0,
      explanation: "SSRF occurs when an attacker co-opts a backend server into making requests to internal loopback addresses, local subnets, or cloud instance metadata services (e.g., AWS IMDSv1 at 169.254.169.254) to steal credentials."
    },
    {
      question: "Which cryptographic key exchange algorithm allows two parties with no prior shared secrets to establish a shared symmetric encryption key over an insecure channel?",
      options: [
        "Diffie-Hellman Key Exchange (DH / ECDH)",
        "Rivest-Shamir-Adleman (RSA) signatures",
        "Advanced Encryption Standard (AES-256)",
        "Secure Hash Algorithm 256 (SHA-256)"
      ],
      correctIndex: 0,
      explanation: "Diffie-Hellman (and Elliptic Curve Diffie-Hellman) enables two communicating entities to compute a shared secret key using modular arithmetic or elliptic curves without transmitting the secret itself over the wire."
    },
    {
      question: "What is the security risk of storing user passwords using fast hashing algorithms like MD5 or SHA-256 instead of adaptive key-derivation functions like Scrypt, Argon2, or Bcrypt?",
      options: [
        "Attickers can compute billions of guesses per second on consumer GPUs using precomputed rainbow tables",
        "Fast hashes cause collision errors that lock valid users out of their accounts",
        "Fast hashes cannot store passwords longer than 16 characters",
        "Browsers automatically refuse to transmit passwords hashed with SHA-256"
      ],
      correctIndex: 0,
      explanation: "MD5 and SHA-256 are engineered for raw cryptographic speed. GPUs and ASICs can compute billions of candidate hashes per second, whereas memory-hard algorithms (Argon2, Scrypt) impose strict computational and memory barriers."
    },
    {
      question: "In endpoint security, what telemetry mechanism captures real-time process execution trees, network socket bindings, and memory modifications for incident investigation?",
      options: [
        "Endpoint Detection and Response (EDR) agents",
        "Static file hash signature scanners",
        "Hardware BIOS watchdog timers",
        "Network port mirroring span sessions"
      ],
      correctIndex: 0,
      explanation: "EDR agents monitor low-level OS telemetry (process creation, thread injection, registry changes, network sockets), streaming events to security analytics engines for real-time threat hunting and automated isolation."
    }
  ],
  "cloud-devops": [
    {
      question: "In Kubernetes cluster architecture, what is the primary responsibility of the Kubelet daemon on a worker node?",
      options: [
        "Communicates with the control plane to ensure containers declared in assigned PodSpecs are running and healthy",
        "Maintains global distributed consensus state across the etcd datastore",
        "Schedules unscheduled pods onto nodes based on CPU and memory affinity",
        "Serves the web dashboard graphical user interface to cluster administrators"
      ],
      correctIndex: 0,
      explanation: "The Kubelet is the node agent that registers the worker node with the API server, watches for Pod assignments, and instructs the container runtime (CRI) to launch, maintain, and monitor containers."
    },
    {
      question: "What is the fundamental architectural advantage of Infrastructure as Code (IaC) tools like Terraform using declarative configuration?",
      options: [
        "Allows desired infrastructure state to be version-controlled, diffed, and deterministically reconciled via automated state drift detection",
        "Completely eliminates cloud hosting and compute billing costs",
        "Directly compiles configuration scripts into native x86 machine assembly",
        "Bypasses all cloud provider API authentication and rate limits"
      ],
      correctIndex: 0,
      explanation: "Declarative IaC specifies the target state rather than execution steps, allowing tools like Terraform to build dependency graphs, compute minimal change plans, and reconcile real-world state with version-controlled code."
    },
    {
      question: "Which deployment strategy routes a small percentage of production user traffic (e.g. 5%) to a new revision before committing to a full cluster rollout?",
      options: [
        "Canary deployment",
        "Recreate deployment",
        "Big-bang deployment",
        "Destructive in-place replacement"
      ],
      correctIndex: 0,
      explanation: "Canary deployments route a small fraction of live traffic to the new version to monitor telemetry, error rates, and latency under real production conditions before progressing with the full rollout."
    },
    {
      question: 'In Site Reliability Engineering (SRE), what does an "Error Budget" formally represent?',
      options: [
        "The maximum allowable unreliability of a service calculated as (100% - SLO) over a rolling measurement window",
        "The quarterly financial monetary budget allocated for cloud hosting costs",
        "The number of compilation errors allowed in the continuous integration pipeline",
        "The buffer of unused RAM allocated to Kubernetes worker nodes"
      ],
      correctIndex: 0,
      explanation: "An error budget represents the difference between 100% perfection and the agreed Service Level Objective (e.g. 99.9% SLO = 0.1% error budget). If exhausted, feature deployments are paused to focus on reliability."
    },
    {
      question: "What optimization mechanism in Docker multi-stage builds minimizes final container image size and reduces attack surface?",
      options: [
        "Copying only compiled runtime artifacts from intermediate build stages into a minimal scratch or distroless base image",
        "Compressing intermediate container layers into zip archives before push",
        "Removing all Linux kernel headers from the host hypervisor",
        "Running all application containers in read-only filesystem mode"
      ],
      correctIndex: 0,
      explanation: "Multi-stage builds leave heavy compilers, SDKs, and build tooling behind in intermediate stages, copying only the compiled binary or lean production bundle to the final runtime image."
    },
    {
      question: "In Kubernetes networking, which resource acts as an API gateway to manage external HTTP/HTTPS routing, SSL termination, and path-based routing to internal cluster services?",
      options: [
        "Ingress Controller",
        "Kube-Proxy in iptables mode",
        "CoreDNS service discovery daemon",
        "NodeLocal DNSCache DaemonSet"
      ],
      correctIndex: 0,
      explanation: "An Ingress Controller (e.g. NGINX, Traefik, Envoy) evaluates Ingress resource rules to accept incoming external traffic, terminate TLS, and proxy requests to internal ClusterIP Services."
    },
    {
      question: "Which Linux kernel feature enables container runtimes to restrict and isolate the resource usage (CPU, memory, disk I/O, network bandwidth) of a process group?",
      options: [
        "Control Groups (Cgroups)",
        "Linux Namespaces",
        "OverlayFS union mounts",
        "Seccomp security profiles"
      ],
      correctIndex: 0,
      explanation: "While Namespaces provide visibility isolation (PIDs, mounts, network interfaces), Cgroups (Control Groups) meter, throttle, and enforce limits on physical hardware resources (CPU, RAM, block I/O)."
    },
    {
      question: "In distributed monitoring and observability, what does the RED method focus on for microservice request profiling?",
      options: [
        "Rate (requests per second), Errors (failed requests per second), and Duration (latency distribution)",
        "RAM usage, Energy consumption, and Disk I/O throughput",
        "Reliability, Elasticity, and Dependability scores",
        "Replication factor, Encryption status, and Delivery speed"
      ],
      correctIndex: 0,
      explanation: "The RED method (popularized by Tom Wilkie) defines the three foundational telemetry metrics for request-driven microservice architectures: Rate, Errors, and Duration."
    },
    {
      question: "What distributed consensus store does Kubernetes use to reliably store all cluster configuration, object specifications, and runtime states?",
      options: [
        "etcd (Raft-based key-value store)",
        "Redis in sentinel replication mode",
        "Apache Cassandra wide-column store",
        "MongoDB distributed replica set"
      ],
      correctIndex: 0,
      explanation: "etcd is a strongly consistent, distributed key-value store that implements the Raft consensus algorithm, providing the persistent backing store for all Kubernetes cluster state."
    },
    {
      question: "What is the core principle of Chaos Engineering in cloud distributed systems?",
      options: [
        "Experimenting on a system by injecting controlled failures in production to build confidence in its resilient recovery capabilities",
        "Allowing developers to deploy code without peer code review or automated tests",
        "Disabling all server monitoring alerts during peak traffic periods",
        "Randomly deleting production database records to test backup restoration speeds"
      ],
      correctIndex: 0,
      explanation: "Chaos Engineering systematically introduces turbulent conditions (network latency, killed nodes, packet corruption) in a controlled blast radius to uncover systemic weaknesses before real-world outages occur."
    }
  ],
  general: [
    {
      question: "In modern software architecture, what is the primary operational advantage of stateless decoupled services?",
      options: [
        "Horizontal scalability and fault isolation across worker nodes",
        "Elimination of all network serialization overhead",
        "Guaranteed zero latency across multi-region server clusters",
        "Automatic hardware encryption of CPU internal registers"
      ],
      correctIndex: 0,
      explanation: "Stateless services decouple persistence from execution, allowing instances to scale horizontally behind load balancers and isolate node crashes without loss of transactional state."
    },
    {
      question: "When analyzing production systems for service degradation, which telemetry signal provides the earliest indicator of user-facing performance regressions?",
      options: [
        "P99 latency spikes and positive error-rate derivatives",
        "Monthly cloud hosting invoice statements",
        "Static binary file hash checksum modifications",
        "Domain name registrar renewal TTL notifications"
      ],
      correctIndex: 0,
      explanation: "P99 tail latency increases and positive error rate slopes capture regressions experienced by users well before average metrics or availability SLAs register a breach."
    },
    {
      question: "How should sensitive environment configuration secrets (API keys, DB credentials) be managed across production runtimes?",
      options: [
        "Encrypted via key management services (KMS) and injected dynamically via ephemeral environment secrets managers",
        "Hardcoded as plaintext literals in version-controlled Git repositories",
        "Stored in public client-side browser local storage",
        "Embedded into minified frontend static bundle distributions"
      ],
      correctIndex: 0,
      explanation: "Secrets should never be baked into source control; using hardware KMS and dynamic ephemeral secret management minimizes exposure vectors and supports automated credential rotation."
    },
    {
      question: "What testing methodology verifies that individual units of code operate correctly when assembled and interacting across service boundaries?",
      options: [
        "Integration testing",
        "Isolated unit testing with complete mocking",
        "Static lint code style analysis",
        "Production manual user acceptance testing"
      ],
      correctIndex: 0,
      explanation: "Integration testing assesses interactions between multiple integrated components, databases, or external services to identify boundary and interface mismatches."
    },
    {
      question: "In asynchronous software architectures, what is the primary purpose of a dead-letter queue (DLQ)?",
      options: [
        "Isolates messages that cannot be processed successfully after maximum retry thresholds for forensic analysis",
        "Accelerates message consumption by skipping validation checks",
        "Compresses message payloads before transmission across network boundaries",
        "Encrypts message bodies using asymmetric public key cryptography"
      ],
      correctIndex: 0,
      explanation: "Dead-letter queues collect poisoned or unprocessable messages after retry limits are exhausted, preventing consumer worker loops from stalling while preserving data for debugging."
    }
  ]
};
var DOMAIN_SUBTOPICS = {
  cybersecurity: [
    "Network Defense & Packet Analysis",
    "Threat Modeling & Zero Trust Architecture",
    "Memory Safety & Exploit Mitigation",
    "Cryptographic Protocols & Key Exchange",
    "Incident Response & Digital Forensics",
    "Identity & Access Management (IAM)",
    "Cloud Security & DevSecOps",
    "Web Application Security & OWASP Top 10",
    "Reverse Engineering & Malware Analysis",
    "Security Operations Center (SOC) Analytics"
  ],
  security: [
    "Network Defense & Packet Analysis",
    "Threat Modeling & Zero Trust Architecture",
    "Memory Safety & Exploit Mitigation",
    "Cryptographic Protocols & Key Exchange",
    "Cloud Security & DevSecOps"
  ],
  ai: [
    "Transformer Architecture & Self-Attention",
    "Loss Functions & Gradient Optimization",
    "Computer Vision & Convolutional Networks",
    "Natural Language Processing & Embeddings",
    "Reinforcement Learning & Policy Gradients",
    "Model Quantization & Distributed Inference",
    "Evaluation Metrics & Bias Mitigation"
  ],
  "machine learning": [
    "Feature Engineering & Dimensionality Reduction",
    "Ensemble Methods & Gradient Boosting",
    "Deep Neural Networks & Backpropagation",
    "Hyperparameter Tuning & Regularization",
    "Model Validation & Cross-Validation Strategies"
  ],
  data: [
    "Distributed ETL Pipelines & Stream Processing",
    "Relational Query Plans & Index Optimization",
    "Statistical Hypothesis Testing & A/B Experiments",
    "Data Warehousing & Dimensional Modeling",
    "Big Data Partitioning & Distributed Storage"
  ],
  software: [
    "Concurrent Rendering & State Management",
    "Distributed Systems & Eventual Consistency",
    "Microservice Communication & API Gateways",
    "Relational Database Indexing & Query Tuning",
    "System Design & Horizontal Scaling"
  ],
  fullstack: [
    "Client-Server State Sync & Optimistic UI",
    "Authentication, Session Cookies & OAuth 2.0",
    "RESTful API Contract & GraphQL Schemas",
    "Database Transaction Isolation & ACID Compliance"
  ],
  cloud: [
    "Kubernetes Cluster Architecture & Workloads",
    "Infrastructure as Code with Terraform",
    "CI/CD Pipeline Automation & Canary Rollouts",
    "Observability with Prometheus & OpenTelemetry",
    "Site Reliability Engineering & SLI/SLO Governance"
  ]
};
function resolveDomainSubtopics(topic) {
  const lower = topic.toLowerCase();
  for (const [key, subtopics] of Object.entries(DOMAIN_SUBTOPICS)) {
    if (lower.includes(key)) return subtopics;
  }
  return [
    "Foundational Principles & Core Architecture",
    "Applied Methodology & Implementation",
    "Advanced Problem Solving & Diagnostics",
    "Optimization & High-Performance Patterns",
    "Edge Case Mitigation & Resiliency"
  ];
}
function pickUniqueSubtopicTitle(topic, level, existingTitles = []) {
  const subtopics = resolveDomainSubtopics(topic);
  const normalizedExisting = new Set((existingTitles || []).map((t) => t.toLowerCase().trim()));
  for (const subtopic of subtopics) {
    const candidate = `${topic}: ${subtopic} Diagnostic`;
    const candLower = candidate.toLowerCase().trim();
    const subLower = subtopic.toLowerCase().trim();
    const alreadyUsed = normalizedExisting.has(candLower) || normalizedExisting.has(subLower) || Array.from(normalizedExisting).some((e) => e.includes(subLower) || candLower.includes(e));
    if (!alreadyUsed) {
      return candidate;
    }
  }
  for (let stage = 2; stage <= 10; stage++) {
    for (const subtopic of subtopics) {
      const candidate = `${topic}: ${subtopic} Assessment (Stage ${stage})`;
      const candLower = candidate.toLowerCase().trim();
      if (!normalizedExisting.has(candLower)) {
        return candidate;
      }
    }
  }
  return `${topic}: ${level.charAt(0).toUpperCase() + level.slice(1)} Mastery Diagnostic (${Date.now().toString().slice(-4)})`;
}
function getCuratedQuiz(topic, level = "intermediate", numQuestions = 5, existingTitlesArg) {
  const cleanTopic = String(topic || "Computer Science").trim();
  const domain = resolveDomainCategory(cleanTopic);
  const bank = CURATED_QUIZ_BANKS[domain] || CURATED_QUIZ_BANKS.general;
  const count = Math.max(1, Math.min(numQuestions, bank.length));
  const existingTitles = Array.isArray(existingTitlesArg) ? existingTitlesArg : [];
  const title = pickUniqueSubtopicTitle(cleanTopic, level, existingTitles);
  const selectedQuestions = bank.slice(0, count).map((q) => ({
    question: q.question,
    options: [...q.options],
    correctIndex: q.correctIndex,
    explanation: q.explanation
  }));
  return {
    title,
    topic: cleanTopic,
    subtopic: title.split(":")[1]?.replace("Diagnostic", "")?.trim() || `${level} Evaluation`,
    questions: selectedQuestions
  };
}
async function generateCareerPath(userGoal, timeoutMs = 7e3) {
  const cleanGoal = String(userGoal || "Computer Science").trim();
  if (typeof window !== "undefined") {
    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), timeoutMs);
    try {
      const res = await fetch("/api/career/path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: cleanGoal }),
        signal: controller2.signal
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data?.path && Array.isArray(data.path.milestones)) {
        return data.path;
      }
      throw new Error("Invalid career path payload from server");
    } catch (clientErr) {
      console.warn("Browser career path generation fallback notice:", clientErr?.message || clientErr);
      return getCuratedCareerPath(cleanGoal);
    } finally {
      clearTimeout(timer2);
    }
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const completionPromise = enzonicAI.chat.completions.create(
      {
        model: ENZONIC_MODEL2,
        messages: [
          {
            role: "system",
            content: `You are an AI career counselor. Create a structured learning path with exactly 6 levels:
            Level 1: Absolute Beginner
            Level 2: Core Fundamentals
            Level 3: Intermediate
            Level 4: Advanced
            Level 5: Real Projects
            Level 6: Career Ready
            
            For each level provide: title, topics (array of 4-6 strings), and estimatedWeeks (number).
            Output as JSON only with keys: career, milestones (array of {title, topics: string[], estimatedWeeks}), gaps (string[]).`
          },
          { role: "user", content: `Create a complete learning path for: ${cleanGoal}` }
        ],
        max_tokens: 4096,
        temperature: 0.3,
        response_format: { type: "json_object" }
      },
      {
        signal: controller.signal,
        timeout: timeoutMs
      }
    );
    const completion = await withTimeout(
      completionPromise,
      timeoutMs,
      new Error(`Career path generation timed out after ${timeoutMs}ms`)
    );
    const content = completion.choices[0]?.message?.content || "{}";
    const cleaned = content.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.milestones) && parsed.milestones.length >= 3) {
      return {
        career: String(parsed.career || cleanGoal).trim(),
        title: parsed.title ? String(parsed.title).trim() : void 0,
        salaryRange: parsed.salaryRange ? String(parsed.salaryRange).trim() : void 0,
        matchScore: typeof parsed.matchScore === "number" ? parsed.matchScore : void 0,
        description: parsed.description ? String(parsed.description).trim() : void 0,
        skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : void 0,
        milestones: parsed.milestones.map((m, idx) => ({
          title: String(m.title || `Level ${idx + 1}`).trim(),
          topics: Array.isArray(m.topics) && m.topics.length > 0 ? m.topics.map(String) : ["Core Principles", "Practical Application", "Testing & Verification"],
          estimatedWeeks: Number(m.estimatedWeeks) || 3
        })),
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map(String) : []
      };
    }
  } catch (err) {
    console.warn("Enzonic AI career path generation notice (falling back to curated curriculum):", err?.message || err);
  } finally {
    clearTimeout(timer);
  }
  return getCuratedCareerPath(cleanGoal);
}
async function generateQuiz(topic, level = "intermediate", numQuestions = 5, arg4, arg5) {
  const cleanTopic = String(topic || "Computer Science").trim();
  let existingTitles = [];
  let timeoutMs = 7e3;
  if (typeof arg4 === "number") {
    timeoutMs = arg4;
    if (Array.isArray(arg5)) {
      existingTitles = arg5;
    }
  } else if (Array.isArray(arg4)) {
    existingTitles = arg4;
    if (typeof arg5 === "number") {
      timeoutMs = arg5;
    }
  } else if (typeof arg5 === "number") {
    timeoutMs = arg5;
  } else if (Array.isArray(arg5)) {
    existingTitles = arg5;
  }
  if (typeof window !== "undefined") {
    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), timeoutMs);
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: cleanTopic, level, numQuestions, existingTitles }),
        signal: controller2.signal
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data?.quiz && Array.isArray(data.quiz.questions)) {
        return data.quiz;
      }
      throw new Error("Invalid quiz payload from server");
    } catch (clientErr) {
      console.warn("Browser quiz generation fallback notice:", clientErr?.message || clientErr);
      return getCuratedQuiz(cleanTopic, level, numQuestions, existingTitles);
    } finally {
      clearTimeout(timer2);
    }
  }
  const existingTitlesClause = existingTitles.length > 0 ? `
IMPORTANT: The user has ALREADY completed quizzes with these titles: [${existingTitles.slice(0, 10).map((t) => `"${t}"`).join(", ")}]. DO NOT repeat or closely match any of these titles or subtopics! Focus on a completely different subtopic or angle within "${cleanTopic}".` : "";
  const systemPrompt = `You are an elite academic curriculum designer and examination specialist.
Create ${numQuestions} rigorous, high-quality multiple-choice questions for "${cleanTopic}" at the "${level}" level.

TITLE SPECIFICITY REQUIREMENT (STRICT):
1. NEVER generate generic titles like "${cleanTopic} Quiz", "${level} ${cleanTopic} Quiz", "${cleanTopic} Assessment", or "${cleanTopic} Diagnostic".
2. Pick a focused, distinct subtopic, technical competency, or practical architectural domain within "${cleanTopic}".
3. The quiz title MUST be detailed, unique, and clearly reflect the chosen subtopic (e.g. "[Specific Subtopic]: [Domain] Assessment").${existingTitlesClause}
4. Each question must feature 4 realistic, distinct options (options array of 4 strings), the 0-based integer 'correctIndex', and an in-depth 'explanation'.

Output valid JSON only with keys:
{
  "title": string,
  "topic": "${cleanTopic}",
  "subtopic": string,
  "questions": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correctIndex": number,
      "explanation": string
    }
  ]
}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let parsed = null;
  try {
    const completionPromise = enzonicAI.chat.completions.create(
      {
        model: ENZONIC_MODEL2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a challenging, subtopic-specific ${level}-level diagnostic quiz for: ${cleanTopic}` }
        ],
        max_tokens: 4096,
        temperature: 0.7,
        response_format: { type: "json_object" }
      },
      {
        signal: controller.signal,
        timeout: timeoutMs
      }
    );
    const completion = await withTimeout(
      completionPromise,
      timeoutMs,
      new Error(`Quiz generation timed out after ${timeoutMs}ms`)
    );
    const content = completion.choices[0]?.message?.content || "{}";
    const cleaned = content.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (aiErr) {
    console.warn("Enzonic AI quiz generation notice (falling back to deterministic curated quiz):", aiErr?.message || aiErr);
    parsed = null;
  } finally {
    clearTimeout(timer);
  }
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return getCuratedQuiz(cleanTopic, level, numQuestions, existingTitles);
  }
  const rawTitle = String(parsed?.title || "").trim();
  const lowerRawTitle = rawTitle.toLowerCase();
  const normalizedExisting = new Set(existingTitles.map((t) => t.toLowerCase().trim()));
  const isGeneric = !rawTitle || lowerRawTitle === `${cleanTopic.toLowerCase()} quiz` || lowerRawTitle === `${level.toLowerCase()} ${cleanTopic.toLowerCase()} quiz` || lowerRawTitle === `${cleanTopic.toLowerCase()} assessment` || lowerRawTitle === `${cleanTopic.toLowerCase()} diagnostic` || lowerRawTitle === "diagnostic quiz" || lowerRawTitle === "assessment quiz" || rawTitle.length < 12;
  const isDuplicate = normalizedExisting.has(lowerRawTitle);
  if (isGeneric || isDuplicate) {
    parsed.title = pickUniqueSubtopicTitle(cleanTopic, level, existingTitles);
  } else {
    parsed.title = rawTitle;
  }
  parsed.questions = parsed.questions.map((q, idx) => ({
    question: String(q.question || `Question ${idx + 1} regarding ${cleanTopic}`).trim(),
    options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4).map(String) : ["Option A", "Option B", "Option C", "Option D"],
    correctIndex: typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0,
    explanation: String(q.explanation || "Detailed explanation verified against technical specifications.")
  }));
  parsed.topic = cleanTopic;
  return parsed;
}

// src/lib/storage/r2.ts
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
var R2_ENDPOINT = process.env.R2_ENDPOINT || "";
var R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
var R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
var R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "nova-ai";
var s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT || void 0,
  credentials: R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY ? {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  } : void 0
});
async function uploadToR2(key, buffer, contentType = "image/png") {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });
  await s3.send(command);
  return {
    key,
    bucket: R2_BUCKET_NAME,
    url: `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`
  };
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var port = parseInt(process.env.PORT || "3000", 10);
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  compression({
    threshold: 512
  })
);
app.use(
  "/assets",
  express.static(path.resolve(__dirname, "public/assets"), {
    maxAge: "7d",
    etag: true
  })
);
app.use(
  helmet({
    contentSecurityPolicy: false,
    // Vite development and internal styles/scripts
    crossOriginEmbedderPolicy: false
  })
);
app.use(express.json({ limit: "5mb" }));
var apiLimiter = rateLimit({
  windowMs: 60 * 1e3,
  // 1 minute
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  message: { error: "Too many requests, please try again in a minute." }
});
var aiLimiter = rateLimit({
  windowMs: 60 * 1e3,
  max: 45,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  message: { error: "AI rate limit reached. Please wait a few seconds before trying again." }
});
var storageLimiter = rateLimit({
  windowMs: 60 * 1e3,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  message: { error: "File upload rate limit reached. Please try again shortly." }
});
app.use("/api/", apiLimiter);
app.use("/api/ai/", aiLimiter);
app.use("/api/storage/", storageLimiter);
app.use("/api", async (_req, _res, next) => {
  try {
    await initDatabase();
  } catch (err) {
    console.warn("DB initialization middleware notice:", err);
  }
  next();
});
initDatabase().catch(console.error);
function getUserId(req) {
  const rawId = req.query.userId || req.headers["x-user-id"] || req.body?.userId || "";
  return String(rawId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
}
async function resolveUserId(req) {
  const uid = getUserId(req);
  if (uid) return uid;
  try {
    const single = await client.execute("SELECT id FROM users ORDER BY created_at DESC LIMIT 1");
    if (single.rows.length > 0 && single.rows[0].id) {
      return String(single.rows[0].id);
    }
  } catch {
  }
  return "default-user";
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const cleanPassword = typeof password === "string" ? password.trim() : "";
  const hash = crypto.scryptSync(cleanPassword, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  if (!storedHash?.includes(":")) return false;
  try {
    const [salt, key] = storedHash.split(":");
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (crypto.timingSafeEqual(keyBuffer, derivedKey)) {
      return true;
    }
    if (typeof password === "string" && password.trim() !== password) {
      const trimmedDerived = crypto.scryptSync(password.trim(), salt, 64);
      return crypto.timingSafeEqual(keyBuffer, trimmedDerived);
    }
    return false;
  } catch {
    return false;
  }
}
app.get("/api/users", async (_req, res) => {
  try {
    const result = await client.execute("SELECT id, name, email, avatar_url as avatarUrl, education_level as educationLevel, career_interest as careerInterest, streak_days as streakDays, total_study_hours as totalStudyHours, created_at as createdAt FROM users ORDER BY created_at DESC");
    return res.json(result.rows);
  } catch (err) {
    console.error("Fetch users error:", err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});
var inFlightRegistrations = /* @__PURE__ */ new Set();
var handleUserRegistration = async (req, res) => {
  try {
    const { name, email, password, educationLevel, careerInterest, avatarUrl } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim() || name.length > 80) {
      return res.status(400).json({ error: "Valid name (1-80 characters) is required" });
    }
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 120) {
      return res.status(400).json({ error: "Valid email address is required" });
    }
    const rawPassword = typeof password === "string" ? password : "";
    const cleanPassword = rawPassword.trim();
    if (!rawPassword || cleanPassword.length < 6 || rawPassword.length > 128) {
      return res.status(400).json({ error: "Password is required and must be between 6 and 128 characters" });
    }
    if (inFlightRegistrations.has(cleanEmail)) {
      return res.status(409).json({ error: "User with this email already exists" });
    }
    inFlightRegistrations.add(cleanEmail);
    try {
      const existing = await client.execute({
        sql: "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
        args: [cleanEmail]
      });
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "User with this email already exists" });
      }
      const cleanAvatar = avatarUrl && typeof avatarUrl === "string" && (/^\/assets\//.test(avatarUrl) || /^https:\/\//.test(avatarUrl)) ? avatarUrl.slice(0, 300) : "/assets/extracted/default_avatar.svg";
      const passwordHash = hashPassword(cleanPassword);
      const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await client.execute({
        sql: "INSERT INTO users (id, name, email, password_hash, avatar_url, education_level, career_interest, streak_days, total_study_hours, onboarding_completed, location, target_exam, bio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?, ?, ?)",
        args: [
          id,
          name.trim(),
          cleanEmail,
          passwordHash,
          cleanAvatar,
          String(educationLevel || "Class 12").slice(0, 50),
          String(careerInterest || "Computer Science").slice(0, 50),
          String(req.body?.location || "").slice(0, 100),
          String(req.body?.targetExam || "").slice(0, 100),
          String(req.body?.bio || "").slice(0, 500),
          Date.now()
        ]
      });
      return res.status(200).json({
        ok: true,
        user: {
          id,
          name: name.trim(),
          email: cleanEmail,
          avatarUrl: cleanAvatar,
          educationLevel: String(educationLevel || "Class 12").slice(0, 50),
          careerInterest: String(careerInterest || "Computer Science").slice(0, 50),
          streakDays: 1,
          totalStudyHours: 0,
          onboardingCompleted: 0,
          location: String(req.body?.location || "").slice(0, 100),
          targetExam: String(req.body?.targetExam || "").slice(0, 100),
          bio: String(req.body?.bio || "").slice(0, 500)
        }
      });
    } finally {
      inFlightRegistrations.delete(cleanEmail);
    }
  } catch (err) {
    if (err?.message?.includes("UNIQUE") || err?.message?.includes("constraint")) {
      return res.status(409).json({ error: "User with this email already exists" });
    }
    console.error("Create user error:", err);
    return res.status(500).json({ error: "Failed to create user account" });
  }
};
app.post("/api/user/create", handleUserRegistration);
app.post("/api/user/register", handleUserRegistration);
app.post("/api/register", handleUserRegistration);
var handleUserLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Valid email address is required" });
    }
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Password is required to sign in" });
    }
    const result = await client.execute({
      sql: "SELECT * FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
      args: [cleanEmail]
    });
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const u = result.rows[0];
    if (u.password_hash) {
      const isValid = verifyPassword(password, u.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
    }
    return res.status(200).json({
      ok: true,
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatar_url,
        educationLevel: u.education_level,
        careerInterest: u.career_interest,
        streakDays: Math.max(1, Number(u.streak_days) || 1),
        totalStudyHours: u.total_study_hours,
        onboardingCompleted: Number(u.onboarding_completed) || 0,
        location: u.location || "",
        targetExam: u.target_exam || "",
        bio: u.bio || ""
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Failed to authenticate user" });
  }
};
app.post("/api/user/login", handleUserLogin);
app.post("/api/login", handleUserLogin);
app.post("/api/onboarding/complete", async (req, res) => {
  const userId = getUserId(req);
  const { educationLevel, careerInterest, targetExam, location, bio, avatarUrl } = req.body || {};
  if (!userId) {
    return res.status(401).json({ error: "User must be authenticated" });
  }
  const cleanEdu = String(educationLevel || "Undergraduate").trim().slice(0, 100);
  const cleanCareer = String(careerInterest || "AI & Computer Science").trim().slice(0, 100);
  const cleanExam = String(targetExam || "").trim().slice(0, 100);
  const cleanLocation = String(location || "").trim().slice(0, 100);
  const cleanBio = String(bio || "").trim().slice(0, 300);
  const cleanAvatar = avatarUrl && typeof avatarUrl === "string" && (avatarUrl.startsWith("data:") || avatarUrl.startsWith("/assets/") || avatarUrl.startsWith("https://")) ? avatarUrl.slice(0, 5e5) : null;
  try {
    if (cleanAvatar) {
      await client.execute({
        sql: "UPDATE users SET education_level = ?, career_interest = ?, target_exam = ?, location = ?, bio = ?, avatar_url = ?, onboarding_completed = 1 WHERE id = ?",
        args: [cleanEdu, cleanCareer, cleanExam, cleanLocation, cleanBio, cleanAvatar, userId]
      });
    } else {
      await client.execute({
        sql: "UPDATE users SET education_level = ?, career_interest = ?, target_exam = ?, location = ?, bio = ?, onboarding_completed = 1 WHERE id = ?",
        args: [cleanEdu, cleanCareer, cleanExam, cleanLocation, cleanBio, userId]
      });
    }
    const userRes = await client.execute({
      sql: "SELECT id, name, email, avatar_url, education_level, career_interest, streak_days, total_study_hours, onboarding_completed, location, target_exam, bio FROM users WHERE id = ?",
      args: [userId]
    });
    const updatedUser = userRes.rows[0];
    const timeoutPromise = new Promise(
      (resolve) => setTimeout(() => resolve("timeout"), 5500)
    );
    const parallelGenPromise = Promise.allSettled([
      generateCareerPath(cleanCareer, 5200),
      generateQuiz(cleanCareer, "intermediate", 5, 5200)
    ]);
    const generationResult = await Promise.race([parallelGenPromise, timeoutPromise]);
    let plan;
    let quiz;
    if (generationResult === "timeout") {
      console.warn("Onboarding AI generation timed out at 5.5s threshold; using curated fallbacks");
      plan = getCuratedCareerPath(cleanCareer);
      quiz = getCuratedQuiz(cleanCareer, "intermediate", 5);
    } else {
      const [careerRes, quizRes] = generationResult;
      if (careerRes.status === "fulfilled" && careerRes.value && Array.isArray(careerRes.value.milestones) && careerRes.value.milestones.length >= 3) {
        plan = careerRes.value;
      } else {
        if (careerRes.status === "rejected") {
          console.warn("Career path generation rejected:", careerRes.reason);
        }
        plan = getCuratedCareerPath(cleanCareer);
      }
      if (quizRes.status === "fulfilled" && quizRes.value && Array.isArray(quizRes.value.questions) && quizRes.value.questions.length > 0) {
        quiz = quizRes.value;
      } else {
        if (quizRes.status === "rejected") {
          console.warn("Quiz generation rejected:", quizRes.reason);
        }
        quiz = getCuratedQuiz(cleanCareer, "intermediate", 5);
      }
    }
    const dbOperations = [];
    dbOperations.push(
      client.execute({
        sql: `INSERT INTO generated_career_paths (id, user_id, goal, path_json, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          `path_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          userId,
          cleanCareer,
          JSON.stringify(plan),
          Date.now()
        ]
      }).catch((pErr) => console.warn("Roadmap persistence notice:", pErr))
    );
    const milestonesToSave = (plan.milestones || []).slice(0, 3);
    for (let i = 0; i < milestonesToSave.length; i++) {
      const m = milestonesToSave[i];
      dbOperations.push(
        client.execute({
          sql: `INSERT INTO milestones (id, user_id, title, time_text, status, icon_type, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `ms_${Date.now()}_${i}`,
            userId,
            m.title || `Milestone ${i + 1}`,
            `${m.estimatedWeeks || 2} weeks`,
            i === 0 ? "active" : "upcoming",
            i === 0 ? "book" : "project",
            i
          ]
        }).catch((mErr) => console.warn(`Milestone ${i} persistence notice:`, mErr))
      );
    }
    dbOperations.push(
      client.execute({
        sql: `INSERT INTO generated_quizzes (id, user_id, topic, level, title, questions_json, category, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `quiz_${Date.now()}_diag`,
          userId,
          cleanCareer,
          "intermediate",
          quiz.title || `${cleanCareer} Diagnostic Quiz`,
          JSON.stringify(quiz.questions),
          "Subject Tests",
          Date.now()
        ]
      }).catch((qErr) => console.warn("Initial quiz persistence notice:", qErr))
    );
    dbOperations.push(
      client.execute({
        sql: `INSERT INTO tasks (id, user_id, title, time_text, category, completed, order_index, created_at)
              VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
        args: [
          `task_${Date.now()}_1`,
          userId,
          `Complete ${cleanCareer} Diagnostic Assessment`,
          "Today \u2022 30 min",
          "Tasks",
          Date.now()
        ]
      }).catch((tErr) => console.warn("Initial task 1 notice:", tErr))
    );
    dbOperations.push(
      client.execute({
        sql: `INSERT INTO tasks (id, user_id, title, time_text, category, completed, order_index, created_at)
              VALUES (?, ?, ?, ?, ?, 0, 1, ?)`,
        args: [
          `task_${Date.now()}_2`,
          userId,
          `Review Core Foundations & Curriculum in Learning Hub`,
          "Tomorrow \u2022 45 min",
          "Tasks",
          Date.now()
        ]
      }).catch((tErr) => console.warn("Initial task 2 notice:", tErr))
    );
    await Promise.all(dbOperations);
    return res.json({
      ok: true,
      user: {
        id: updatedUser?.id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        avatarUrl: updatedUser?.avatar_url,
        educationLevel: updatedUser?.education_level,
        careerInterest: updatedUser?.career_interest,
        streakDays: updatedUser?.streak_days || 1,
        totalStudyHours: updatedUser?.total_study_hours || 0,
        onboardingCompleted: Number(updatedUser?.onboarding_completed) || 1,
        location: updatedUser?.location || "",
        targetExam: updatedUser?.target_exam || "",
        bio: updatedUser?.bio || ""
      }
    });
  } catch (err) {
    console.error("Onboarding completion error:", err);
    return res.status(500).json({ error: err?.message || "Failed to complete onboarding" });
  }
});
app.get("/api/user", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(404).json({ error: "User ID required" });
  }
  try {
    const result = await client.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [userId]
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
        streakDays: Math.max(1, Number(u.streak_days) || 1),
        totalStudyHours: u.total_study_hours,
        onboardingCompleted: Number(u.onboarding_completed) || 0,
        location: u.location || "",
        targetExam: u.target_exam || "",
        bio: u.bio || ""
      });
    }
    return res.status(404).json({ error: "User not found" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/user", async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const parsed = ProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }
    const { name, email, educationLevel, careerInterest, avatarUrl, location, targetExam, bio } = parsed.data;
    await client.execute({
      sql: `UPDATE users SET name = ?, email = ?, education_level = ?, career_interest = ?${avatarUrl ? ", avatar_url = ?" : ""}${location !== void 0 ? ", location = ?" : ""}${targetExam !== void 0 ? ", target_exam = ?" : ""}${bio !== void 0 ? ", bio = ?" : ""} WHERE id = ?`,
      args: [
        name,
        email.trim().toLowerCase(),
        educationLevel,
        careerInterest,
        ...avatarUrl ? [avatarUrl] : [],
        ...location !== void 0 ? [location] : [],
        ...targetExam !== void 0 ? [targetExam] : [],
        ...bio !== void 0 ? [bio] : [],
        userId
      ]
    });
    return res.json({ ok: true, message: "Profile updated in Turso" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/user/change-password", async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({ error: "Current password is required" });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }
    const result = await client.execute({
      sql: "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
      args: [userId]
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User account not found" });
    }
    const u = result.rows[0];
    if (u.password_hash) {
      const isValid = verifyPassword(currentPassword, u.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: "Current password does not match" });
      }
    }
    const newHash = hashPassword(newPassword);
    await client.execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [newHash, userId]
    });
    return res.json({ ok: true, message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/user/export-data", async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const userRes = await client.execute({ sql: "SELECT id, name, email, education_level, career_interest, streak_days, total_study_hours, created_at FROM users WHERE id = ?", args: [userId] });
    const tasksRes = await client.execute({ sql: "SELECT * FROM tasks WHERE user_id = ?", args: [userId] });
    const milestonesRes = await client.execute({ sql: "SELECT * FROM milestones WHERE user_id = ?", args: [userId] });
    const remindersRes = await client.execute({ sql: "SELECT * FROM reminders WHERE user_id = ?", args: [userId] });
    const testsRes = await client.execute({ sql: "SELECT * FROM quiz_attempts WHERE user_id = ?", args: [userId] });
    return res.json({
      exportTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
      studentProfile: userRes.rows[0] || null,
      tasks: tasksRes.rows,
      milestones: milestonesRes.rows,
      reminders: remindersRes.rows,
      assessments: testsRes.rows
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/tasks", async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const result = await client.execute({
      sql: "SELECT * FROM tasks WHERE user_id = ? ORDER BY order_index ASC",
      args: [userId]
    });
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/tasks/toggle", async (req, res) => {
  const userId = await resolveUserId(req);
  const { id, completed } = req.body;
  if (!id) return res.status(400).json({ error: "Task ID is required" });
  try {
    await client.execute({
      sql: "UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?",
      args: [completed ? 1 : 0, id, userId]
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("Task toggle error:", err);
    return res.status(500).json({ error: "Failed to update task state" });
  }
});
app.post("/api/tasks", async (req, res) => {
  const userId = await resolveUserId(req);
  const { title, timeText, duration, category } = req.body;
  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Task title is required" });
  }
  const id = `task-${Date.now()}`;
  const effectiveTime = String(timeText || duration || "Today \u2022 30 min").slice(0, 50);
  try {
    await client.execute({
      sql: "INSERT INTO tasks (id, user_id, title, time_text, category, completed, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, userId, title.trim().slice(0, 200), effectiveTime, String(category || "Tasks").slice(0, 50), 0, 99, Date.now()]
    });
    return res.json({ ok: true, id, title: title.trim(), time_text: effectiveTime, category: category || "Tasks", completed: 0 });
  } catch (err) {
    console.error("Create task error:", err);
    return res.status(500).json({ error: "Failed to create task" });
  }
});
app.delete("/api/tasks/:id", async (req, res) => {
  const userId = await resolveUserId(req);
  const { id } = req.params;
  try {
    await client.execute({
      sql: "DELETE FROM tasks WHERE id = ? AND user_id = ?",
      args: [id, userId]
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("Delete task error:", err);
    return res.status(500).json({ error: "Failed to delete task" });
  }
});
app.get("/api/milestones", async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const result = await client.execute({
      sql: "SELECT * FROM milestones WHERE user_id = ? ORDER BY order_index ASC",
      args: [userId]
    });
    return res.json(result.rows);
  } catch (err) {
    console.error("Fetch milestones error:", err);
    return res.status(500).json({ error: "Failed to fetch milestones" });
  }
});
app.post("/api/milestones", async (req, res) => {
  const userId = await resolveUserId(req);
  const { title, timeText, iconType, status } = req.body;
  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Milestone title is required" });
  }
  const id = `ms-${Date.now()}`;
  try {
    await client.execute({
      sql: "INSERT INTO milestones (id, user_id, title, time_text, status, icon_type, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [id, userId, title.trim().slice(0, 200), String(timeText || "Target: 4 weeks").slice(0, 50), String(status || "active").slice(0, 20), String(iconType || "book").slice(0, 20), 99]
    });
    return res.json({ ok: true, id });
  } catch (err) {
    console.error("Create milestone error:", err);
    return res.status(500).json({ error: "Failed to create milestone" });
  }
});
app.get("/api/reminders", async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const result = await client.execute({
      sql: "SELECT * FROM reminders WHERE user_id = ? ORDER BY created_at DESC",
      args: [userId]
    });
    return res.json(result.rows);
  } catch (err) {
    console.error("Fetch reminders error:", err);
    return res.status(500).json({ error: "Failed to fetch reminders" });
  }
});
app.post("/api/reminders", async (req, res) => {
  const userId = await resolveUserId(req);
  const { title, timeText, category } = req.body;
  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Reminder title is required" });
  }
  const id = `rem-${Date.now()}`;
  try {
    await client.execute({
      sql: "INSERT INTO reminders (id, user_id, title, time_text, category, enabled, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
      args: [id, userId, title.trim().slice(0, 200), String(timeText || "").slice(0, 50), String(category || "Tasks").slice(0, 50), Date.now()]
    });
    return res.json({ ok: true, id });
  } catch (err) {
    console.error("Create reminder error:", err);
    return res.status(500).json({ error: "Failed to create reminder" });
  }
});
app.post("/api/reminders/toggle", async (req, res) => {
  const userId = await resolveUserId(req);
  const { id, enabled } = req.body;
  if (!id) return res.status(400).json({ error: "Reminder ID is required" });
  try {
    await client.execute({
      sql: "UPDATE reminders SET enabled = ? WHERE id = ? AND user_id = ?",
      args: [enabled ? 1 : 0, id, userId]
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("Toggle reminder error:", err);
    return res.status(500).json({ error: "Failed to toggle reminder" });
  }
});
app.delete("/api/reminders/:id", async (req, res) => {
  const userId = await resolveUserId(req);
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Reminder ID is required" });
  try {
    await client.execute({
      sql: "DELETE FROM reminders WHERE id = ? AND user_id = ?",
      args: [id, userId]
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("Delete reminder error:", err);
    return res.status(500).json({ error: "Failed to delete reminder" });
  }
});
app.get("/api/quizzes", async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const result = await client.execute({
      sql: "SELECT * FROM generated_quizzes WHERE user_id = ? ORDER BY created_at DESC",
      args: [userId]
    });
    const quizzes = result.rows.map((row) => {
      let questions = [];
      try {
        questions = JSON.parse(row.questions_json);
      } catch {
      }
      return {
        id: row.id,
        title: row.title,
        topic: row.topic,
        level: row.level,
        category: row.category || "Subject Tests",
        questionsCount: questions.length,
        durationMinutes: Math.max(questions.length * 2, 10),
        questions,
        createdAt: row.created_at
      };
    });
    return res.json({ success: true, quizzes });
  } catch (err) {
    console.error("Fetch quizzes error:", err);
    return res.status(500).json({ error: "Failed to fetch quizzes" });
  }
});
app.get("/api/quizzes/attempts", async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    const result = await client.execute({
      sql: "SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY completed_at DESC",
      args: [userId]
    });
    return res.json(result.rows);
  } catch (err) {
    console.error("Fetch quiz attempts error:", err);
    return res.status(500).json({ error: "Failed to fetch quiz attempts" });
  }
});
app.post("/api/quizzes/clear", async (req, res) => {
  const userId = await resolveUserId(req);
  try {
    await client.execute({
      sql: "DELETE FROM quiz_attempts WHERE user_id = ?",
      args: [userId]
    });
    return res.json({ ok: true, message: "All quiz attempts cleared" });
  } catch (err) {
    console.error("Clear quiz attempts error:", err);
    return res.status(500).json({ error: "Failed to clear quiz attempts" });
  }
});
app.post("/api/quizzes/attempt", async (req, res) => {
  const userId = await resolveUserId(req);
  const { quizId, quiz_id, quizTitle, category, score, totalQuestions, weakTopics } = req.body;
  if (!quizTitle || typeof score !== "number" || typeof totalQuestions !== "number" || totalQuestions <= 0 || score < 0) {
    return res.status(400).json({ error: "Valid quiz Title, score, and totalQuestions are required" });
  }
  const id = `attempt-${Date.now()}`;
  const effectiveQuizId = String(quizId || quiz_id || "").slice(0, 100);
  const weakStr = Array.isArray(weakTopics) ? weakTopics.join(",") : typeof weakTopics === "string" ? weakTopics : "";
  try {
    await client.execute({
      sql: "INSERT INTO quiz_attempts (id, user_id, quiz_id, quiz_title, category, score, total_questions, weak_topics, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, userId, effectiveQuizId, String(quizTitle).slice(0, 150), String(category || "General").slice(0, 50), Math.round(score), Math.round(totalQuestions), weakStr.slice(0, 300), Date.now()]
    });
    return res.json({ ok: true, id, quizId: effectiveQuizId });
  } catch (err) {
    console.error("Save quiz attempt error:", err);
    return res.status(500).json({ error: "Failed to save quiz attempt" });
  }
});
function validateImageBufferSignature(buffer, mime) {
  if (buffer.length < 12) return false;
  if (mime === "image/jpeg") {
    return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  }
  if (mime === "image/png") {
    return buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71;
  }
  if (mime === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}
var handleStorageUpload = async (req, res) => {
  try {
    const { filename, base64Data, contentType } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ error: "filename and base64Data required" });
    }
    const mime = String(contentType || "image/png").toLowerCase().trim();
    const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED_MIME.includes(mime)) {
      return res.status(400).json({ error: "Only image/jpeg, image/png, and image/webp are permitted" });
    }
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: "File size exceeds maximum 2MB avatar limit" });
    }
    if (!validateImageBufferSignature(buffer, mime)) {
      return res.status(400).json({ error: "Uploaded file signature does not match allowed image formats" });
    }
    const safeBase = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 50);
    const key = `avatars/${Date.now()}_${safeBase}`;
    const uploadRes = await uploadToR2(key, buffer, mime);
    return res.json({
      ok: true,
      url: uploadRes.url,
      key: uploadRes.key
    });
  } catch (err) {
    console.error("R2 upload failed:", err);
    return res.status(500).json({ error: "Failed to securely process and upload file to R2" });
  }
};
app.post("/api/storage/upload", handleStorageUpload);
app.post("/api/upload", handleStorageUpload);
app.post("/api/storage/upload-chat-file", async (req, res) => {
  try {
    const { filename, base64Data, contentType, userId, sessionId } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ error: "filename and base64Data required" });
    }
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "File size exceeds maximum 10MB limit" });
    }
    const safeUserId = String(userId || "guest").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeBase = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80);
    const storageKey = `chat_files/${safeUserId}/${Date.now()}_${safeBase}`;
    const mime = String(contentType || "application/octet-stream").toLowerCase().trim();
    let fileUrl = "";
    try {
      const uploadRes = await uploadToR2(storageKey, buffer, mime);
      fileUrl = uploadRes.url;
    } catch (r2Err) {
      console.warn("R2 upload notice (falling back to data URL):", r2Err);
      fileUrl = base64Data.startsWith("data:") ? base64Data : `data:${mime};base64,${cleanBase64}`;
    }
    const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await client.execute({
      sql: `INSERT INTO uploaded_files (id, user_id, session_id, file_name, file_type, file_size, file_url, storage_key, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        fileId,
        safeUserId,
        String(sessionId || ""),
        filename,
        mime,
        buffer.length,
        fileUrl,
        storageKey,
        Date.now()
      ]
    });
    return res.json({
      ok: true,
      file: {
        id: fileId,
        name: filename,
        type: mime,
        size: buffer.length,
        url: fileUrl,
        key: storageKey
      }
    });
  } catch (err) {
    console.error("Chat file upload failed:", err);
    return res.status(500).json({ error: err.message || "Failed to upload chat file" });
  }
});
app.get("/api/storage/files", async (req, res) => {
  try {
    const userId = req.query.userId || req.query.email || "";
    let result;
    if (userId) {
      result = await client.execute({
        sql: "SELECT * FROM uploaded_files WHERE user_id = ? ORDER BY created_at DESC",
        args: [userId]
      });
    } else {
      result = await client.execute("SELECT * FROM uploaded_files ORDER BY created_at DESC LIMIT 50");
    }
    return res.json({ ok: true, files: result.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/chat/sessions", async (req, res) => {
  try {
    const userId = req.query.userId || req.query.email || "learner";
    const sessionsRes = await client.execute({
      sql: "SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC",
      args: [userId]
    });
    const sessions = [];
    for (const row of sessionsRes.rows) {
      const messagesRes = await client.execute({
        sql: "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
        args: [String(row.id)]
      });
      const messages = messagesRes.rows.map((m) => {
        let attachments;
        let citations;
        try {
          attachments = m.attachments ? JSON.parse(String(m.attachments)) : void 0;
        } catch {
        }
        try {
          citations = m.citations ? JSON.parse(String(m.citations)) : void 0;
        } catch {
        }
        return {
          id: String(m.id),
          role: String(m.role),
          content: String(m.content),
          attachments: Array.isArray(attachments) && attachments.length > 0 ? attachments : void 0,
          citations: Array.isArray(citations) && citations.length > 0 ? citations : void 0
        };
      });
      sessions.push({
        id: String(row.id),
        title: String(row.title),
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
        messages
      });
    }
    return res.json({ ok: true, sessions });
  } catch (err) {
    console.error("Fetch chat sessions error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch chat sessions" });
  }
});
app.post("/api/chat/sync", async (req, res) => {
  try {
    const { userId, session } = req.body;
    if (!userId || !session?.id) {
      return res.status(400).json({ error: "userId and session with id are required" });
    }
    const sessionId = String(session.id);
    const title = String(session.title || "Conversation");
    const createdAt = Number(session.createdAt || Date.now());
    const updatedAt = Number(session.updatedAt || Date.now());
    await client.execute({
      sql: `INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              updated_at = excluded.updated_at`,
      args: [sessionId, String(userId), title, createdAt, updatedAt]
    });
    await client.execute({
      sql: "DELETE FROM chat_messages WHERE session_id = ?",
      args: [sessionId]
    });
    if (Array.isArray(session.messages)) {
      for (let i = 0; i < session.messages.length; i++) {
        const msg = session.messages[i];
        const msgId = msg.id || `${sessionId}_msg_${i}_${Date.now()}`;
        const role = String(msg.role || "user");
        const content = String(msg.content || "");
        const attachmentsJson = JSON.stringify(msg.attachments || []);
        const citationsJson = JSON.stringify(session.citations?.[i] || msg.citations || []);
        const msgCreatedAt = createdAt + i * 10;
        await client.execute({
          sql: `INSERT INTO chat_messages (id, session_id, user_id, role, content, attachments, citations, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [msgId, sessionId, String(userId), role, content, attachmentsJson, citationsJson, msgCreatedAt]
        });
      }
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("Chat sync error:", err);
    return res.status(500).json({ error: err.message || "Failed to sync chat session" });
  }
});
app.delete("/api/chat/sessions/:id", async (req, res) => {
  try {
    const sessionId = req.params.id;
    await client.execute({
      sql: "DELETE FROM chat_messages WHERE session_id = ?",
      args: [sessionId]
    });
    await client.execute({
      sql: "DELETE FROM chat_sessions WHERE id = ?",
      args: [sessionId]
    });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.delete("/api/chat/sessions", async (req, res) => {
  try {
    const userId = req.query.userId || req.body?.userId;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    await client.execute({
      sql: "DELETE FROM chat_messages WHERE user_id = ?",
      args: [userId]
    });
    await client.execute({
      sql: "DELETE FROM chat_sessions WHERE user_id = ?",
      args: [userId]
    });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/ai/health", async (_req, res) => {
  try {
    const statusUrl = process.env.ENZONIC_STATUS_URL || "http://sgp-two.enzonic.com:25836/status";
    const resp = await fetch(statusUrl);
    const data = await resp.json();
    return res.json(data);
  } catch (err) {
    return res.status(503).json({ error: "Rotator health probe failed", message: err?.message });
  }
});
app.get("/api/ai/search", async (req, res) => {
  const q = req.query.q || "";
  if (!q.trim()) return res.status(400).json({ error: "Query q required" });
  try {
    const results = await performWebSearch(q);
    return res.json({ query: q, results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
function extractToolCall(text2) {
  if (!text2) return null;
  const matchToken = text2.match(/functions\.([a-zA-Z0-9_-]+):?\d*<\|tool_call_argument_begin\|>([\s\S]*?)<\|tool_call_end\|>/);
  if (matchToken) {
    let q = "";
    try {
      const parsed = JSON.parse(matchToken[2].trim());
      q = parsed.query || parsed.q || parsed.expression || Object.values(parsed)[0] || "";
    } catch {
      q = matchToken[2].replace(/[{}"]/g, "").trim();
    }
    return { toolName: matchToken[1], query: String(q) };
  }
  const matchText = text2.match(/Tool:\s*([a-zA-Z0-9_-]+)\s*\n*Parameters:\s*(\{[\s\S]*?\})/i);
  if (matchText) {
    let q = "";
    try {
      const parsed = JSON.parse(matchText[2].trim());
      q = parsed.query || parsed.q || parsed.expression || Object.values(parsed)[0] || "";
    } catch {
      q = matchText[2].replace(/[{}"]/g, "").trim();
    }
    return { toolName: matchText[1], query: String(q) };
  }
  if (text2.includes("<|tool_calls_section_begin|>") || text2.includes("functions.live_web_search")) {
    const qMatch = text2.match(/"query":\s*"([^"]+)"/);
    if (qMatch) {
      return { toolName: "live_web_search", query: qMatch[1] };
    }
  }
  return null;
}
function cleanChatOutput(text2) {
  if (!text2) return "";
  return text2.replace(/<\|tool_calls_section_begin\|>[\s\S]*?<\|tool_calls_section_end\|>/gi, "").replace(/<\|tool_call_begin\|>[\s\S]*?<\|tool_call_end\|>/gi, "").replace(/Tool:\s*[a-zA-Z0-9_-]+\s*\n*Parameters:\s*\{[\s\S]*?\}/gi, "").replace(/functions\.[a-zA-Z0-9_-]+:?\d*<\|tool_call_argument_begin\|>[\s\S]*?<\|tool_call_end\|>/gi, "").replace(/<\|[^>]*\|>/g, "").trim();
}
app.post("/api/ai/chat", async (req, res) => {
  const userId = getUserId(req);
  const { messages, stream, temperature, maxTokens, responseFormat, enableWebSearch, attachments } = req.body;
  const reasoningEffort = req.body.reasoningEffort || "medium";
  if (!messages?.length) {
    return res.status(400).json({ error: "messages required" });
  }
  const rawLatest = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const latestUserMsg = typeof rawLatest === "string" ? rawLatest : Array.isArray(rawLatest) ? rawLatest.map((p) => p.text || "").join(" ") : String(rawLatest || "");
  let searchResults = [];
  const toolEvents = [];
  let augmentedMessages = [...messages];
  let injectedContext = "";
  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const att of attachments) {
      if (att?.dataUrl && !att.type?.startsWith("image/")) {
        try {
          let text2 = "";
          if (att.dataUrl.includes("base64,")) {
            text2 = Buffer.from(att.dataUrl.split("base64,")[1], "base64").toString("utf-8");
          } else {
            text2 = att.dataUrl;
          }
          injectedContext += `

[USER ATTACHED FILE - "${att.name || "document"}"]:
\`\`\`
${text2.slice(0, 15e3)}
\`\`\`
Please carefully inspect, analyze, debug, or evaluate this attached file in your answer.
`;
          toolEvents.push({
            type: "file_attached",
            query: `Attached: ${att.name || "file"}`
          });
        } catch (fErr) {
          console.warn("File decode warning:", fErr?.message);
        }
      }
    }
    const imageParts = attachments.filter((a) => a?.dataUrl && (a.type?.startsWith("image/") || a.dataUrl.startsWith("data:image/"))).map((a) => ({
      type: "image_url",
      image_url: { url: a.dataUrl }
    }));
    if (imageParts.length > 0) {
      injectedContext += `

[USER ATTACHED ${imageParts.length} VISUAL IMAGE(S)]: The user has attached visual image(s)/screenshot(s). Provide visual inspection, analyze code or equations in the image, and provide complete, step-by-step guidance.
`;
      toolEvents.push({
        type: "image_attached",
        query: `${imageParts.length} Image(s) Attached for Visual Analysis`
      });
      for (let i = augmentedMessages.length - 1; i >= 0; i--) {
        if (augmentedMessages[i].role === "user") {
          const originalText = typeof augmentedMessages[i].content === "string" ? augmentedMessages[i].content : JSON.stringify(augmentedMessages[i].content);
          augmentedMessages[i] = {
            ...augmentedMessages[i],
            content: [
              { type: "text", text: originalText },
              ...imageParts
            ]
          };
          break;
        }
      }
    }
  }
  if (/\b(cgpa|calculate|math|percentile|percentage|formula|\d+\s*[+\-*/]\s*\d+)\b/i.test(latestUserMsg)) {
    const calc = solveAcademicCalculation(latestUserMsg);
    if (calc.result && !calc.result.includes("Could not calculate")) {
      injectedContext += `

[ACADEMIC SOLVER / CALCULATOR RESULT]:
Input: ${calc.expression}
Result: ${calc.result}
Incorporate this precise calculation directly into your explanation.
`;
      toolEvents.push({
        type: "academic",
        query: latestUserMsg,
        citations: [{ title: "Academic Calculator", url: "#calculator", snippet: calc.result, source: "academic" }]
      });
    }
  }
  if (/\b(add task|create task|schedule task|new task|add to my tasks|put on my todo)\b/i.test(latestUserMsg)) {
    const rawTitle = latestUserMsg.replace(/^.*?\b(add task|create task|schedule task|new task|add to my tasks|put on my todo)\s*(:|-|to|for)?\s*/i, "").trim();
    const taskTitle = (rawTitle.split(/[\n.]/)[0] || "Study Focus Session").slice(0, 100);
    try {
      const created = await addStudyTaskDirectly(userId, taskTitle, "Today \u2022 45 min", "Tasks");
      injectedContext += `

[TOOL EXECUTED - TURSO DATABASE TASK CREATED]:
Task ID: ${created.id}
Title: "${created.title}"
Directly confirm to the student that you have committed this task into their official MindPath study tasks list.
`;
      toolEvents.push({
        type: "task_created",
        title: created.title,
        query: `Study Task Created: "${created.title}"`
      });
    } catch (tErr) {
      console.warn("Add task error:", tErr?.message);
    }
  }
  if (/\b(remind me|set reminder|create reminder|schedule reminder)\b/i.test(latestUserMsg)) {
    const rawTitle = latestUserMsg.replace(/^.*?\b(remind me|set reminder|create reminder|schedule reminder)\s*(:|-|to|for)?\s*/i, "").trim();
    const reminderTitle = (rawTitle.split(/[\n.]/)[0] || "Review Study Target").slice(0, 100);
    try {
      const created = await setStudyReminderDirectly(userId, reminderTitle, "Today at 6:00 PM", "Study Target");
      injectedContext += `

[TOOL EXECUTED - TURSO DATABASE REMINDER SCHEDULED]:
Reminder ID: ${created.id}
Title: "${created.title}"
Time: Today at 6:00 PM
Directly confirm to the student that you have scheduled this reminder in their MindPath reminders list.
`;
      toolEvents.push({
        type: "reminder_created",
        title: created.title,
        time: "Today at 6:00 PM",
        query: `Reminder Scheduled: "${created.title}"`
      });
    } catch (rErr) {
      console.warn("Set reminder error:", rErr?.message);
    }
  }
  if (/\b(remove (my )?reminders?|delete (my )?reminders?|clear (my )?reminders?|cancel (my )?reminders?)\b/i.test(latestUserMsg)) {
    try {
      const target = latestUserMsg.replace(/^.*?\b(remove|delete|clear|cancel)\s*(my\s*)?reminders?\s*(for|about|matching|called)?\s*/i, "").trim();
      const removed = await removeStudyReminderDirectly(userId, target);
      injectedContext += `

[TOOL EXECUTED - TURSO DATABASE REMINDERS REMOVED]:
Removed Count: ${removed.removedCount}
Filter: "${target || "all"}"
Directly inform the student that their requested reminders have been removed from their MindPath reminders list in the database.
`;
      toolEvents.push({
        type: "reminder_deleted",
        title: target || "All Reminders",
        query: `Removed Reminders: ${target || "All"}`
      });
    } catch (rDelErr) {
      console.warn("Remove reminder error:", rDelErr?.message);
    }
  }
  if (/\b(remove (my )?tasks?|delete (my )?tasks?|clear (my )?tasks?|delete completed tasks?)\b/i.test(latestUserMsg)) {
    try {
      const target = latestUserMsg.replace(/^.*?\b(remove|delete|clear)\s*(my\s*)?tasks?\s*(for|about|matching|called)?\s*/i, "").trim();
      const removed = await removeStudyTaskDirectly(userId, target);
      injectedContext += `

[TOOL EXECUTED - TURSO DATABASE TASKS REMOVED]:
Removed Count: ${removed.removedCount}
Filter: "${target || "all"}"
Directly inform the student that their requested study tasks have been cleared from their MindPath dashboard.
`;
      toolEvents.push({
        type: "task_deleted",
        title: target || "Tasks",
        query: `Removed Tasks: ${target || "All"}`
      });
    } catch (tDelErr) {
      console.warn("Remove task error:", tDelErr?.message);
    }
  }
  if (/\b(skill gap|readiness|benchmark|skills for|am i ready for|gap analysis)\b/i.test(latestUserMsg)) {
    try {
      const targetRole = latestUserMsg.toLowerCase().includes("data") ? "Data Scientist" : latestUserMsg.toLowerCase().includes("cyber") ? "Cyber Security" : "AI / Machine Learning Engineer";
      const studentData = await getStudentProfileContext(userId);
      const userTasks = studentData.activeTasks.map((t) => t.title);
      const gapData = analyzeSkillGaps(userTasks, targetRole);
      injectedContext += `

[SKILL GAP ANALYZER BENCHMARK]:
Target Role: ${gapData.targetRole}
Readiness Score: ${gapData.readinessScore}
Compensation: ${gapData.compensationBenchmark}
Matched Skills: ${gapData.matchedSkills.join(", ") || "Foundational Concepts"}
Missing Skills: ${gapData.missingCriticalSkills.join(", ")}
3-Month Plan:
${gapData.threeMonthRoadmap.join("\n")}
Incorporate these exact metrics and roadmap recommendations.
`;
      toolEvents.push({
        type: "skill_gap",
        query: `Skill Gap Analysis: ${gapData.targetRole} (${gapData.readinessScore} Match)`
      });
    } catch (gapErr) {
      console.warn("Skill gap error:", gapErr?.message);
    }
  }
  if (/\b(mock interview|interview me|interview questions?|technical interview)\b/i.test(latestUserMsg)) {
    const role = latestUserMsg.toLowerCase().includes("data") ? "Data Scientist" : latestUserMsg.toLowerCase().includes("react") || latestUserMsg.toLowerCase().includes("web") ? "Full Stack Developer" : "AI / Machine Learning Engineer";
    const interviewData = simulateMockInterview(role);
    injectedContext += `

[MOCK INTERVIEW SIMULATOR TOOL]:
Format: ${interviewData.interviewFormat} for ${interviewData.role}
Questions to present:
${interviewData.questions.map((q, i) => `${i + 1}. [${q.focus}] ${q.q}
Evaluation key: ${q.keyPoints.join("; ")}`).join("\n\n")}
Conduct the interview with the student, presenting one question and guiding their response.
`;
    toolEvents.push({
      type: "interview_sim",
      query: `Mock Interview Simulator for ${interviewData.role}`
    });
  }
  if (/\b(review (my )?resume|review (my )?project|ats score|bullet point)\b/i.test(latestUserMsg)) {
    const review = reviewResumeProject(latestUserMsg, "AI & Software Engineer");
    injectedContext += `

[ATS RESUME / PROJECT REVIEWER TOOL]:
ATS Impact Score: ${review.atsScore}
Key Action Items:
${review.keyImprovements.join("\n")}
Recommended Bullet Point Rewrite:
${review.recommendedRewrite}
Provide this ATS review clearly formatted in markdown.
`;
    toolEvents.push({
      type: "resume_review",
      query: `ATS Project Reviewer (Score: ${review.atsScore})`
    });
  }
  if (/\b(diagram|flowchart|architecture diagram|mermaid)\b/i.test(latestUserMsg)) {
    const diagram = generateConceptDiagram(latestUserMsg);
    injectedContext += `

[CONCEPT DIAGRAM GENERATOR TOOL]:
${diagram}
Present this diagram to the user with a concise explanation.
`;
    toolEvents.push({
      type: "diagram_gen",
      query: `Architecture Diagram Generator`
    });
  }
  if (/\b(streak|tasks?|my roadmap|my progress|how am i doing|my score|study hours)\b/i.test(latestUserMsg)) {
    try {
      const studentData = await getStudentProfileContext(userId);
      injectedContext += `

[TURSO STUDENT DATABASE RECORD]:
Student: ${studentData.name} (${studentData.educationLevel})
Career Focus: ${studentData.careerInterest}
Streak: ${studentData.streakDays} Days
Study Hours: ${studentData.totalStudyHours}h
Active Tasks: ${JSON.stringify(studentData.activeTasks)}
Milestones: ${JSON.stringify(studentData.milestones || [])}
Recent Scores: ${JSON.stringify(studentData.recentQuizScores || [])}
Incorporate these exact live student metrics into your advice.
`;
      toolEvents.push({
        type: "database",
        query: "Turso DB Student Profile"
      });
    } catch (dbErr) {
      console.warn("DB context error:", dbErr?.message);
    }
  }
  if (/\b(compare|salary|market|hiring|role|engineer|developer|data scientist|doctor|ai\/ml)\b/i.test(latestUserMsg)) {
    const careerData = getCareerMarketData(latestUserMsg);
    injectedContext += `

[CAREER MARKET INTELLIGENCE BENCHMARKS]:
Role: ${careerData.role}
Average Salary (India): ${careerData.averageSalaryIndia}
Average Salary (US): ${careerData.averageSalaryUS}
Top Skills: ${careerData.topSkills.join(", ")}
Growth Rate: ${careerData.growthRate}
Top Hiring Companies: ${careerData.topCompanies.join(", ")}
Use these real-time compensation & skillset figures when advising.
`;
  }
  if (/\b(todays? ai|current ai|latest ai|best ai|ai models?|llms?|leaderboard|chatbot arena|frontier models?|claude 3\.7|deepseek|gpt-4\.5|o3|o1|gemini 2\.5|what are the todays)\b/i.test(latestUserMsg)) {
    const aiData = getFrontierAIModelsData();
    injectedContext += `

[OFFICIAL 2025/2026 FRONTIER AI MODELS BENCHMARKS & LEADERBOARD]:
Present the CURRENT frontier models:
1. Claude 3.7 Sonnet (Anthropic): Flagship hybrid reasoning, #1 on SWE-bench Verified (70.3%), complex coding.
2. DeepSeek-R1 (DeepSeek): Open-weights reasoning, rivals o1 on AIME & MATH-500 at ultra-low API cost.
3. OpenAI o3-mini & o1 / GPT-4.5 (OpenAI): Test-time compute scaling, Codeforces grandmaster reasoning & frontier synthesis.
4. Gemini 2.5 Pro & Flash (Google DeepMind): 2M context window, native multimodal audio/video understanding.
5. Llama 3.3 70B (Meta): Leading open-weight foundation model.
6. Qwen 2.5 Coder 32B (Alibaba): Top open coding model.
Format this with a clean, well-aligned Markdown table and category winners. Do NOT cite old or hallucinated domains; use official sources.
` + JSON.stringify(aiData, null, 2) + `
`;
    searchResults = aiData.realSources;
    toolEvents.push({
      type: "web_search",
      query: "Frontier AI Models & LMSYS Chatbot Arena Rankings",
      citations: aiData.realSources
    });
  }
  if (/\b(create quiz|generate quiz|make (a )?quiz|build quiz|test me on|quiz on|quiz me)\b/i.test(latestUserMsg)) {
    const topic = latestUserMsg.replace(/^.*?\b(create quiz|generate quiz|make (a )?quiz|build quiz|test me on|quiz on|quiz me)\s*(:|-|about|for)?\s*/i, "").trim().slice(0, 60) || "Custom Assessment";
    injectedContext += `

[TOOL EXECUTED - INTERACTIVE QUIZ ARCHITECT]:
The student requested an interactive quiz on "${topic}".
Generate 3 to 4 multiple-choice questions with 4 distinct choices, marking the correct answer and providing a detailed explanation for each.
Present it cleanly in markdown.
`;
    toolEvents.push({
      type: "quiz_created",
      title: `Practice Quiz: ${topic}`,
      query: `Generated Interactive Quiz on ${topic}`
    });
  }
  if (/\b(create course|generate course|make (a )?course|build course|teach me|roadmap for|syllabus for)\b/i.test(latestUserMsg)) {
    const courseTitle = latestUserMsg.replace(/^.*?\b(create course|generate course|make (a )?course|build course|teach me|roadmap for|syllabus for)\s*(:|-|about|for)?\s*/i, "").trim().slice(0, 70) || "Personalized Skill Track";
    injectedContext += `

[TOOL EXECUTED - CUSTOM COURSE ARCHITECT]:
The student requested a structured course on "${courseTitle}".
Provide a structured curriculum with Module 1 (Foundations), Module 2 (Advanced Applications), and a Capstone Project with actionable code examples.
`;
    toolEvents.push({
      type: "course_created",
      title: `Course: ${courseTitle}`,
      query: `Synthesized Curriculum for ${courseTitle}`
    });
  }
  const cleanTrimmed = latestUserMsg.trim().toLowerCase();
  const isGreetingOrCasual = /^(hi|hey|hello|hola|yo|sup|thanks|thank you|thx|k|ok|okay|cool|good morning|good evening|good afternoon|bye|goodbye|who are you|how are you|what is your name)\b[\s!.?]*$/i.test(
    cleanTrimmed
  ) || cleanTrimmed.length < 4 && !cleanTrimmed.includes("?");
  const isExplicitRealtimeQuery = /\b(search (web|online|internet|for)|lookup|latest|recent|current|2025|2026|today|cutoff|exam dates?|salaries|salary|hiring|trends?|placement|openings|ranking)\b/i.test(
    latestUserMsg
  );
  const needsWebSearch = searchResults.length === 0 && !isGreetingOrCasual && !/\b(todays? ai|ai models?|llms?|leaderboard)\b/i.test(latestUserMsg) && Boolean(enableWebSearch && isExplicitRealtimeQuery);
  if (needsWebSearch && latestUserMsg) {
    try {
      searchResults = await performWebSearch(latestUserMsg);
      if (searchResults.length > 0) {
        injectedContext += `

[LIVE REAL-TIME WEB SEARCH KNOWLEDGE BASE - Date: ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric"
        })}]:
` + searchResults.map(
          (r, i) => `Source [${i + 1}]: "${r.title}"
URL: ${r.url}
Excerpt: ${r.snippet.slice(0, 250)}`
        ).join("\n\n") + `

Instructions: You have access to real-time live web search results above. Directly incorporate facts, salaries, and trends. Output well-structured markdown with bullet points, bold key terms, and markdown link citations. Be concise and fast.`;
        toolEvents.push({
          type: "web_search",
          query: latestUserMsg,
          citations: searchResults
        });
      }
    } catch (searchErr) {
      console.warn("Web search enrichment error:", searchErr?.message);
    }
  }
  injectedContext += "\n\nCRITICAL DIRECTIVE: You are speaking directly to the student. All live web data, salary benchmarks, calculations, and student records are already retrieved and supplied above. You must NEVER output tool calling syntax, JSON function calls, or tokens such as <|tool_calls_section_begin|>, <|tool_call_begin|>, or functions.<name>. Synthesize the provided data and write your final, complete response directly to the student in clean markdown.";
  if (injectedContext) {
    let injected = false;
    augmentedMessages = augmentedMessages.map((m) => {
      if (m.role === "system" && !injected) {
        injected = true;
        return { ...m, content: m.content + injectedContext };
      }
      return m;
    });
    if (!injected) {
      augmentedMessages.unshift({ role: "system", content: injectedContext });
    }
  }
  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const keepAliveTimer = setInterval(() => {
      if (!res.writableEnded) {
        res.write(": keepalive\n\n");
        res.flushHeaders?.();
      }
    }, 2e3);
    try {
      for (const tEvent of toolEvents) {
        res.write(`data: ${JSON.stringify({ toolEvent: tEvent })}

`);
      }
      let toolBuffer = "";
      const streamIter = enzonicStream(augmentedMessages, { temperature: temperature ?? 0.3, maxTokens: maxTokens ?? 2048, reasoningEffort });
      let toolExecuted = false;
      for await (const chunk of streamIter) {
        if (chunk.isKeepAlive) {
          res.write(": keepalive\n\n");
          res.flushHeaders?.();
          continue;
        }
        const textContent = chunk.content || "";
        if (!textContent) continue;
        if (!toolExecuted && (textContent.includes("<|") || textContent.includes("functions.") || textContent.trim().startsWith("Tool:"))) {
          toolBuffer += textContent;
          if (toolBuffer.includes("<|tool_calls_section_end|>") || toolBuffer.includes("<|tool_call_end|>") || toolBuffer.length >= 200) {
            const tc = extractToolCall(toolBuffer);
            if (tc) {
              toolExecuted = true;
              let toolData = "";
              if (tc.toolName.includes("search") || tc.toolName.includes("web")) {
                res.write(`data: ${JSON.stringify({ toolEvent: { type: "web_search", query: tc.query } })}

`);
                const sr = await performWebSearch(tc.query);
                toolData = sr.map((r, i) => `[Source ${i + 1}]: "${r.title}"
${r.snippet}
URL: ${r.url}`).join("\n\n");
              } else if (tc.toolName.includes("calc") || tc.toolName.includes("math")) {
                const calc = solveAcademicCalculation(tc.query);
                toolData = `Calculation Result: ${calc.result}`;
              } else {
                toolData = `Action completed for: ${tc.query}`;
              }
              augmentedMessages.push({
                role: "assistant",
                content: toolBuffer
              });
              augmentedMessages.push({
                role: "user",
                content: `[TOOL RESULTS RECEIVED]:
${toolData}

CRITICAL INSTRUCTION: Synthesize these findings and write your complete, direct, comprehensive answer for the student now in structured markdown. Do NOT output any tool calling syntax or <|...|> tokens.`
              });
              toolBuffer = "";
              for await (const finalChunk of enzonicStream(augmentedMessages, { temperature: temperature ?? 0.3, maxTokens: maxTokens ?? 2048, reasoningEffort })) {
                if (finalChunk.isKeepAlive) {
                  res.write(": keepalive\n\n");
                  res.flushHeaders?.();
                  continue;
                }
                const cleaned2 = cleanChatOutput(finalChunk.content || "");
                if (cleaned2) {
                  res.write(`data: ${JSON.stringify({ delta: cleaned2 })}

`);
                }
              }
              break;
            }
          }
          continue;
        }
        if (toolBuffer) {
          toolBuffer += textContent;
          if (toolBuffer.includes("<|tool_calls_section_end|>") || toolBuffer.includes("<|tool_call_end|>") || toolBuffer.length >= 250) {
            const tc = extractToolCall(toolBuffer);
            if (tc) {
              toolExecuted = true;
              let toolData = "";
              if (tc.toolName.includes("search") || tc.toolName.includes("web")) {
                res.write(`data: ${JSON.stringify({ toolEvent: { type: "web_search", query: tc.query } })}

`);
                const sr = await performWebSearch(tc.query);
                toolData = sr.map((r, i) => `[Source ${i + 1}]: "${r.title}"
${r.snippet}
URL: ${r.url}`).join("\n\n");
              } else if (tc.toolName.includes("calc") || tc.toolName.includes("math")) {
                const calc = solveAcademicCalculation(tc.query);
                toolData = `Calculation Result: ${calc.result}`;
              } else {
                toolData = `Action completed for: ${tc.query}`;
              }
              augmentedMessages.push({
                role: "assistant",
                content: toolBuffer
              });
              augmentedMessages.push({
                role: "user",
                content: `[TOOL RESULTS RECEIVED]:
${toolData}

CRITICAL INSTRUCTION: Synthesize these findings and write your complete, direct, comprehensive answer for the student now in structured markdown. Do NOT output any tool calling syntax or <|...|> tokens.`
              });
              toolBuffer = "";
              for await (const finalChunk of enzonicStream(augmentedMessages, { temperature: temperature ?? 0.3, maxTokens: maxTokens ?? 2048, reasoningEffort })) {
                if (finalChunk.isKeepAlive) {
                  res.write(": keepalive\n\n");
                  res.flushHeaders?.();
                  continue;
                }
                const cleaned2 = cleanChatOutput(finalChunk.content || "");
                if (cleaned2) {
                  res.write(`data: ${JSON.stringify({ delta: cleaned2 })}

`);
                }
              }
              break;
            }
          }
          continue;
        }
        const cleaned = textContent.replace(/<\|[^>]*\|>/g, "");
        if (cleaned) {
          res.write(`data: ${JSON.stringify({ delta: cleaned })}

`);
        }
      }
      if (toolBuffer && !toolExecuted) {
        const cleaned = cleanChatOutput(toolBuffer);
        if (cleaned) {
          res.write(`data: ${JSON.stringify({ delta: cleaned })}

`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: e.message })}

`);
      res.end();
    } finally {
      clearInterval(keepAliveTimer);
    }
    return;
  }
  let result = await enzonicChat({ messages: augmentedMessages, temperature, maxTokens, reasoningEffort, responseFormat });
  if (result.ok && result.data?.choices?.[0]?.message?.content) {
    const rawContent = result.data.choices[0].message.content;
    const tc = extractToolCall(rawContent);
    if (tc) {
      let toolData = "";
      if (tc.toolName.includes("search")) {
        const sr = await performWebSearch(tc.query);
        toolData = sr.map((r, i) => `[Source ${i + 1}]: "${r.title}"
${r.snippet}
URL: ${r.url}`).join("\n\n");
      } else if (tc.toolName.includes("calc") || tc.toolName.includes("math")) {
        toolData = `Calculation Result: ${solveAcademicCalculation(tc.query).result}`;
      }
      augmentedMessages.push({ role: "assistant", content: rawContent });
      augmentedMessages.push({
        role: "user",
        content: `[TOOL RESULTS RECEIVED]:
${toolData}

CRITICAL INSTRUCTION: Provide your complete, direct, comprehensive answer for the student now in structured markdown. Do NOT output any tool calling syntax.`
      });
      result = await enzonicChat({ messages: augmentedMessages, temperature, maxTokens, reasoningEffort, responseFormat });
    }
    if (result.ok && result.data?.choices?.[0]?.message?.content) {
      result.data.choices[0].message.content = cleanChatOutput(result.data.choices[0].message.content);
    }
  }
  if (!result.ok) {
    return res.status(result.error?.code === "RATE_LIMITED" ? 429 : 502).json({ error: result.error });
  }
  return res.json({
    ...result.data
  });
});
app.post("/api/ai/what-if", async (req, res) => {
  const { pathName, userProfile } = req.body;
  const cleanPath = String(pathName || "Software Engineering").replace(/[^a-zA-Z0-9 &+._/-]/g, "").slice(0, 80);
  const studentName = String(userProfile?.name || "Student").slice(0, 60);
  try {
    const prompt = `You are the MindPath Scenario & Decision Agent. The student ${studentName} is exploring the career path: "${cleanPath}".
Context: ${studentName} has Python & Math fundamentals, wants to prepare for placements/high growth.
Analyze this option and return JSON matching:
{
  "selectedPath": "${cleanPath}",
  "matchScore": number (80-99),
  "estimatedTimeToReady": string (e.g. "6-9 Months"),
  "salaryProjection": string (e.g. "\u20B912L - \u20B925L"),
  "keyAdvantages": [3 strings],
  "tradeoffsAndRisks": [2 strings],
  "recommendedFirstStep": string,
  "curatedRoadmap": [4 step strings]
}`;
    const result = await enzonicChat({
      messages: [
        { role: "system", content: "You are an intelligent educational career advisor. Output ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
      responseFormat: { type: "json_object" },
      temperature: 0.2,
      reasoningEffort: "medium"
    });
    const dataObj = result.data;
    if (result.ok && dataObj?.choices?.[0]?.message?.content) {
      try {
        const parsed = JSON.parse(dataObj.choices[0].message.content);
        const validated = WhatIfScenarioSchema.safeParse(parsed);
        if (validated.success) {
          return res.json(validated.data);
        }
      } catch (_pe) {
      }
    }
    return res.json({
      selectedPath: pathName,
      matchScore: pathName.includes("AI") ? 98 : 95,
      estimatedTimeToReady: "6 Months",
      salaryProjection: pathName.includes("AI") ? "\u20B914L - \u20B928L" : "\u20B910L - \u20B920L",
      keyAdvantages: [
        "Extremely high industry demand across tech and enterprise sectors",
        "Direct alignment with your existing Python and analytical coursework",
        "Strong trajectory toward senior architecture and leadership roles"
      ],
      tradeoffsAndRisks: [
        "Requires continuous revision of linear algebra and probability models",
        "Practical portfolio projects take 15-20 hours weekly commitment"
      ],
      recommendedFirstStep: "Complete the Advanced Python roadmap module and take the Assessment Quiz tomorrow",
      curatedRoadmap: [
        "Phase 1: Advanced Data Structures & Algorithmic Problem Solving (4 weeks)",
        "Phase 2: Applied Machine Learning & Scikit-Learn Pipelines (6 weeks)",
        "Phase 3: Deep Neural Networks & Production Inference (8 weeks)",
        "Phase 4: Capstone Project & Mock Placement Technical Interviews (4 weeks)"
      ]
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/courses", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Query required" });
  const includeVideos = req.query.includeVideos !== void 0 ? req.query.includeVideos === "true" : true;
  const includeCourses = req.query.includeCourses !== void 0 ? req.query.includeCourses === "true" : true;
  const includeLessons = req.query.includeLessons !== void 0 ? req.query.includeLessons === "true" : false;
  const maxPerSource = parseInt(req.query.maxPerSource, 10) || 10;
  try {
    const results = await searchAllSources(q, {
      includeVideos,
      includeCourses,
      includeLessons,
      maxPerSource,
      useCache: true
    });
    return res.json({ success: true, query: q, results });
  } catch (err) {
    console.error("Course search error:", err);
    return res.status(500).json({ error: err.message || "Course search failed" });
  }
});
app.get("/api/videos", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Query required" });
  try {
    const results = await searchAllSources(q, {
      includeVideos: true,
      includeCourses: false,
      includeLessons: false,
      maxPerSource: 10,
      useCache: true
    });
    return res.json({ success: true, query: q, results });
  } catch (err) {
    console.error("Video search error:", err);
    return res.status(500).json({ error: err.message || "Video search failed" });
  }
});
app.get("/api/lessons", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Query required" });
  try {
    const results = await searchAllSources(q, {
      includeVideos: false,
      includeCourses: false,
      includeLessons: true,
      maxPerSource: 10,
      useCache: true
    });
    return res.json({ success: true, query: q, results });
  } catch (err) {
    console.error("Lesson search error:", err);
    return res.status(500).json({ error: err.message || "Lesson search failed" });
  }
});
app.post("/api/career/path", async (req, res) => {
  const { goal } = req.body || {};
  const userId = await resolveUserId(req);
  if (!goal) return res.status(400).json({ error: "Goal required" });
  try {
    const pathResult = await generateCareerPath(goal);
    const id = `cp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      await client.execute({
        sql: "INSERT INTO generated_career_paths (id, user_id, goal, path_json, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [id, userId || "anonymous", goal, JSON.stringify(pathResult), Date.now()]
      });
    } catch (dbErr) {
      console.warn("Could not persist career path to database:", dbErr);
    }
    return res.json({ success: true, path: pathResult, id });
  } catch (err) {
    console.error("Career path generation error:", err);
    return res.status(500).json({ error: err.message || "Career path generation failed" });
  }
});
async function handleCareerExplore(req, res) {
  const category = String(req.query.category || req.body?.category || "All").trim();
  const interest = String(req.query.interest || req.body?.interest || "Computer Science & AI").trim();
  const cacheKey = `career_explore_${category.toLowerCase()}_${interest.toLowerCase()}`;
  try {
    const cached = await client.execute({
      sql: "SELECT results_json, cached_at, ttl_ms FROM search_cache WHERE query = ?",
      args: [cacheKey]
    });
    if (cached.rows.length > 0) {
      const row = cached.rows[0];
      const age = Date.now() - row.cached_at;
      if (age < row.ttl_ms) {
        const parsed = JSON.parse(row.results_json);
        return res.json({ success: true, careers: parsed, source: "cache" });
      }
    }
  } catch (_e) {
  }
  try {
    const prompt = `You are a real-time career guidance agent. Generate 6 modern, verified career tracks for the category: "${category}" and student target interest: "${interest}".
Return ONLY valid JSON matching:
{
  "careers": [
    {
      "id": "slug-string",
      "title": "Official Industry Job Title",
      "matchScore": number (85-99),
      "salary": "\u20B912L - \u20B940L",
      "scope": "Growth Trajectory Description",
      "category": "${category === "All" ? "Tech" : category}",
      "description": "1-2 sentence real-world role overview.",
      "requiredSkills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4"]
    }
  ]
}`;
    const aiRes = await enzonicChat({
      messages: [
        { role: "system", content: "You are an intelligent educational advisor. Output ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
      responseFormat: { type: "json_object" },
      temperature: 0.3
    });
    const dataObj = aiRes.data;
    const content = dataObj?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const careers = Array.isArray(parsed.careers) ? parsed.careers : [];
    if (careers.length > 0) {
      try {
        await client.execute({
          sql: `INSERT INTO search_cache (query, results_json, cached_at, ttl_ms)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(query) DO UPDATE SET
                  results_json = excluded.results_json,
                  cached_at = excluded.cached_at,
                  ttl_ms = excluded.ttl_ms`,
          args: [cacheKey, JSON.stringify(careers), Date.now(), 24 * 60 * 60 * 1e3]
        });
      } catch (cErr) {
        console.warn("Could not cache career explore results:", cErr);
      }
    }
    return res.json({ success: true, careers, source: "live_ai" });
  } catch (err) {
    console.error("Error generating live AI careers:", err);
    return res.status(500).json({ error: err.message || "AI career explore generation failed" });
  }
}
app.get("/api/career/explore", handleCareerExplore);
app.post("/api/career/explore", handleCareerExplore);
app.post("/api/quiz/generate", async (req, res) => {
  const { topic, level, numQuestions, existingTitles } = req.body || {};
  if (!topic) return res.status(400).json({ error: "Topic required" });
  const userId = await resolveUserId(req);
  try {
    const clientTitles = Array.isArray(existingTitles) ? existingTitles.map(String).map((t) => t.trim()).filter(Boolean) : [];
    let dbTitles = [];
    try {
      const pastQuizzes = await client.execute({
        sql: "SELECT title FROM generated_quizzes WHERE user_id = ? ORDER BY created_at DESC LIMIT 25",
        args: [userId]
      });
      dbTitles = pastQuizzes.rows.map((r) => String(r.title || "").trim()).filter(Boolean);
    } catch (dbErr) {
      console.warn("Could not query past quiz titles for deduplication:", dbErr);
    }
    const knownTitles = Array.from(/* @__PURE__ */ new Set([...clientTitles, ...dbTitles]));
    const quiz = await generateQuiz(topic, level || "intermediate", numQuestions || 5, knownTitles);
    const quizId = `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    const quizTitle = String(quiz.title || `${topic}: Advanced Diagnostic`).slice(0, 150);
    const now = Date.now();
    try {
      await client.execute({
        sql: `INSERT INTO generated_quizzes (id, user_id, topic, level, title, questions_json, category, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          quizId,
          userId,
          String(topic).slice(0, 100),
          String(level || "intermediate"),
          quizTitle,
          JSON.stringify(questions),
          "Subject Tests",
          now
        ]
      });
    } catch (saveErr) {
      console.warn("Could not persist generated quiz to DB:", saveErr);
    }
    return res.json({
      success: true,
      quiz: { ...quiz, id: quizId, title: quizTitle, createdAt: now }
    });
  } catch (err) {
    console.error("Quiz generation error:", err);
    return res.status(500).json({ error: err.message || "Quiz generation failed" });
  }
});
app.post("/api/user_course_lessons", async (req, res) => {
  const { courseId, lessonId, lessonTitle, videoUrl, videoSource, completed } = req.body || {};
  const userId = await resolveUserId(req);
  if (!courseId || !lessonId) {
    return res.status(400).json({ error: "courseId and lessonId required" });
  }
  const id = `ucl_${userId || "anon"}_${courseId}_${lessonId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  const isCompleted = completed ? 1 : 0;
  const completedAt = isCompleted ? Date.now() : null;
  try {
    await client.execute({
      sql: `INSERT INTO user_course_lessons (id, user_id, course_id, lesson_id, lesson_title, video_url, video_source, completed, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              completed = excluded.completed,
              completed_at = excluded.completed_at,
              lesson_title = excluded.lesson_title,
              video_url = excluded.video_url,
              video_source = excluded.video_source`,
      args: [
        id,
        userId || "anonymous",
        courseId,
        lessonId,
        lessonTitle || lessonId,
        videoUrl || null,
        videoSource || null,
        isCompleted,
        completedAt
      ]
    });
    return res.json({ success: true, id, completed: isCompleted });
  } catch (err) {
    console.error("Error saving user course lesson:", err);
    return res.status(500).json({ error: err.message || "Failed to save lesson progress" });
  }
});
app.get("/api/user_course_lessons", async (req, res) => {
  const userId = await resolveUserId(req);
  const courseId = req.query.courseId;
  if (!userId) return res.json({ success: true, completedLessons: [] });
  try {
    const result = courseId ? await client.execute({
      sql: "SELECT lesson_id, completed FROM user_course_lessons WHERE user_id = ? AND course_id = ? AND completed = 1",
      args: [userId, courseId]
    }) : await client.execute({
      sql: "SELECT lesson_id, course_id, completed FROM user_course_lessons WHERE user_id = ? AND completed = 1",
      args: [userId]
    });
    const lessons = result.rows.map((r) => r.lesson_id);
    return res.json({ success: true, completedLessons: lessons });
  } catch (err) {
    console.error("Error fetching completed lessons:", err);
    return res.status(500).json({ error: err.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
  app.listen(port, "0.0.0.0", () => {
    console.log(`\u{1F680} MindPath Server running on http://localhost:${port}`);
  });
}
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  startServer();
}
var server_default = app;
export {
  app,
  server_default as default
};
