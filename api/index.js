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
  responseFormat
}) {
  try {
    const completion = await enzonic.chat.completions.create({
      model: ENZONIC_MODEL,
      messages,
      stream,
      temperature,
      max_tokens: maxTokens,
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
            temperature
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
  try {
    const stream = await enzonic.chat.completions.create({
      model: ENZONIC_MODEL,
      messages,
      stream: true,
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens ?? 4096
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
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
            temperature: opts?.temperature ?? 0.3
          }
        });
        for await (const chunk of responseStream) {
          if (chunk.text) yield chunk.text;
        }
        return;
      } catch (geminiErr) {
        console.error("Gemini streaming fallback failed:", geminiErr?.message);
      }
    }
    yield "Hello! I am your MindPath AI Companion. Let's work together to achieve your academic and career goals!";
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
  avatarUrl: z.string().optional()
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
async function initDatabase() {
  try {
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
        quiz_title TEXT NOT NULL,
        category TEXT NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        weak_topics TEXT DEFAULT '',
        completed_at INTEGER NOT NULL
      );
    `);
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
    console.log("\u2705 Turso Database schema verified (zero mock data seeded).");
  } catch (err) {
    console.error("Database init error:", err?.message || err);
  }
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
  message: { error: "Too many requests, please try again in a minute." }
});
var aiLimiter = rateLimit({
  windowMs: 60 * 1e3,
  max: 45,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI rate limit reached. Please wait a few seconds before trying again." }
});
var storageLimiter = rateLimit({
  windowMs: 60 * 1e3,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "File upload rate limit reached. Please try again shortly." }
});
app.use("/api/", apiLimiter);
app.use("/api/ai/", aiLimiter);
app.use("/api/storage/", storageLimiter);
initDatabase().catch(console.error);
function getUserId(req) {
  const rawId = req.query.userId || req.headers["x-user-id"] || req.body?.userId || "";
  return String(rawId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
}
function resolveUserId(req) {
  return getUserId(req);
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  if (!storedHash?.includes(":")) return false;
  try {
    const [salt, key] = storedHash.split(":");
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
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
app.post("/api/user/create", async (req, res) => {
  try {
    const { name, email, password, educationLevel, careerInterest, avatarUrl } = req.body;
    if (!name || typeof name !== "string" || !name.trim() || name.length > 80) {
      return res.status(400).json({ error: "Valid name (1-80 characters) is required" });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 120) {
      return res.status(400).json({ error: "Valid email address is required" });
    }
    if (!password || typeof password !== "string" || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: "Password is required and must be between 6 and 128 characters" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = await client.execute({
      sql: "SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1",
      args: [cleanEmail]
    });
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "An account with this email already exists. Please sign in." });
    }
    const cleanAvatar = avatarUrl && typeof avatarUrl === "string" && (/^\/assets\//.test(avatarUrl) || /^https:\/\//.test(avatarUrl)) ? avatarUrl.slice(0, 300) : "/assets/extracted/default_avatar.svg";
    const passwordHash = hashPassword(password);
    const id = `user_${Date.now()}`;
    await client.execute({
      sql: "INSERT INTO users (id, name, email, password_hash, avatar_url, education_level, career_interest, streak_days, total_study_hours, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)",
      args: [
        id,
        name.trim(),
        cleanEmail,
        passwordHash,
        cleanAvatar,
        String(educationLevel || "Class 12").slice(0, 50),
        String(careerInterest || "Computer Science").slice(0, 50),
        Date.now()
      ]
    });
    return res.json({
      ok: true,
      user: {
        id,
        name: name.trim(),
        email: cleanEmail,
        avatarUrl: cleanAvatar,
        educationLevel: educationLevel || "Class 12",
        careerInterest: careerInterest || "Computer Science",
        streakDays: 1,
        totalStudyHours: 0
      }
    });
  } catch (err) {
    console.error("Create user error:", err);
    return res.status(500).json({ error: "Failed to create user account" });
  }
});
app.post("/api/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Valid email address is required" });
    }
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Password is required to sign in" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const result = await client.execute({
      sql: "SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1",
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
        totalStudyHours: u.total_study_hours
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Failed to authenticate user" });
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
        streakDays: u.streak_days,
        totalStudyHours: u.total_study_hours
      });
    }
    return res.status(404).json({ error: "User not found" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/user", async (req, res) => {
  const userId = getUserId(req);
  try {
    const parsed = ProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }
    const { name, email, educationLevel, careerInterest, avatarUrl } = parsed.data;
    await client.execute({
      sql: `UPDATE users SET name = ?, email = ?, education_level = ?, career_interest = ?${avatarUrl ? ", avatar_url = ?" : ""} WHERE id = ?`,
      args: avatarUrl ? [name, email, educationLevel, careerInterest, avatarUrl, userId] : [name, email, educationLevel, careerInterest, userId]
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
    const testsRes = await client.execute({ sql: "SELECT * FROM assessments WHERE user_id = ?", args: [userId] });
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
  const userId = getUserId(req);
  const { quizTitle, category, score, totalQuestions, weakTopics } = req.body;
  if (!quizTitle || typeof score !== "number" || typeof totalQuestions !== "number" || totalQuestions <= 0 || score < 0) {
    return res.status(400).json({ error: "Valid quiz Title, score, and totalQuestions are required" });
  }
  const id = `attempt-${Date.now()}`;
  const weakStr = Array.isArray(weakTopics) ? weakTopics.join(",") : typeof weakTopics === "string" ? weakTopics : "";
  try {
    await client.execute({
      sql: "INSERT INTO quiz_attempts (id, user_id, quiz_title, category, score, total_questions, weak_topics, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, userId, String(quizTitle).slice(0, 150), String(category || "General").slice(0, 50), Math.round(score), Math.round(totalQuestions), weakStr.slice(0, 300), Date.now()]
    });
    return res.json({ ok: true, id });
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
app.post("/api/ai/chat", async (req, res) => {
  const userId = getUserId(req);
  const { messages, stream, temperature, maxTokens, responseFormat, enableWebSearch, attachments } = req.body;
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
        query: "Turso DB Student Profile",
        citations: [{ title: "Live Turso Database", url: "#turso-db", snippet: `${studentData.streakDays}d Streak \u2022 ${studentData.totalStudyHours}h Study Time`, source: "academic" }]
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
  const isExplicitRealtimeQuery = /\b(search|lookup|find|latest|news|current|2025|2026|today|cutoff|exam|salaries|salary|placement|companies|ranking|trends?|syllabus|dates|eligibility|admissions?|notification)\b/i.test(
    latestUserMsg
  );
  const needsWebSearch = searchResults.length === 0 && !isGreetingOrCasual && !/\b(todays? ai|ai models?|llms?|leaderboard)\b/i.test(latestUserMsg) && Boolean(isExplicitRealtimeQuery || enableWebSearch && (latestUserMsg.includes("?") || latestUserMsg.length >= 18));
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
    try {
      for (const tEvent of toolEvents) {
        res.write(`data: ${JSON.stringify({ toolEvent: tEvent })}

`);
      }
      for await (const delta of enzonicStream(augmentedMessages, { temperature: temperature ?? 0.3, maxTokens: maxTokens ?? 1200 })) {
        res.write(`data: ${JSON.stringify({ delta })}

`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: e.message })}

`);
      res.end();
    }
    return;
  }
  const result = await enzonicChat({ messages: augmentedMessages, temperature, maxTokens, responseFormat });
  if (!result.ok) {
    return res.status(result.error?.code === "RATE_LIMITED" ? 429 : 502).json({ error: result.error });
  }
  return res.json({
    ...result.data,
    citations: searchResults
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
      temperature: 0.2
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
if (!process.env.VERCEL) {
  startServer();
}
var server_default = app;
export {
  server_default as default
};
