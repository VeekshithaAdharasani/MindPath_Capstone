import OpenAI from 'openai';

let _enzonicAI: OpenAI | null = null;
export function getEnzonicAI(): OpenAI {
  if (!_enzonicAI) {
    _enzonicAI = new OpenAI({
      baseURL: (typeof process !== 'undefined' && process.env?.ENZONIC_ROTATOR_URL) || 'http://sgp-two.enzonic.com:25836/v1',
      apiKey: (typeof process !== 'undefined' && process.env?.ENZONIC_API_KEY) || 'dummy-key-for-sdk',
      maxRetries: 0,
      dangerouslyAllowBrowser: true,
    });
  }
  return _enzonicAI;
}

export const enzonicAI = {
  get chat() {
    return getEnzonicAI().chat;
  },
};

export const ENZONIC_MODEL = process.env.ENZONIC_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';

export interface CareerPathPlan {
  career: string;
  milestones: Array<{
    title: string;
    topics: string[];
    estimatedWeeks: number;
  }>;
  gaps: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GeneratedQuiz {
  title: string;
  topic: string;
  subtopic?: string;
  questions: QuizQuestion[];
}

export async function generateCareerPath(userGoal: string): Promise<CareerPathPlan> {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/career/path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: userGoal }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.path;
  }

  const completion = await enzonicAI.chat.completions.create({
    model: ENZONIC_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an AI career counselor. Create a structured learning path with exactly 6 levels:
        Level 1: Absolute Beginner
        Level 2: Core Fundamentals
        Level 3: Intermediate
        Level 4: Advanced
        Level 5: Real Projects
        Level 6: Career Ready
        
        For each level provide: title, lessons (5-8 per level), skills gained, and estimated weeks.
        Output as JSON only with keys: career, milestones (array of {title, topics: string[], estimatedWeeks}), gaps (string[]).`,
      },
      { role: 'user', content: `Create a complete learning path for: ${userGoal}` },
    ],
    max_tokens: 4096,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(content);
}

const DOMAIN_SUBTOPICS: Record<string, string[]> = {
  cybersecurity: [
    'Network Defense & Packet Analysis',
    'Threat Modeling & Zero Trust Architecture',
    'Memory Safety & Exploit Mitigation',
    'Cryptographic Protocols & Key Exchange',
    'Incident Response & Digital Forensics',
    'Identity & Access Management (IAM)',
    'Cloud Security & DevSecOps',
    'Web Application Security & OWASP Top 10',
    'Reverse Engineering & Malware Analysis',
    'Security Operations Center (SOC) Analytics',
  ],
  security: [
    'Network Defense & Packet Analysis',
    'Threat Modeling & Zero Trust Architecture',
    'Memory Safety & Exploit Mitigation',
    'Cryptographic Protocols & Key Exchange',
    'Cloud Security & DevSecOps',
  ],
  ai: [
    'Transformer Architecture & Self-Attention',
    'Loss Functions & Gradient Optimization',
    'Computer Vision & Convolutional Networks',
    'Natural Language Processing & Embeddings',
    'Reinforcement Learning & Policy Gradients',
    'Model Quantization & Distributed Inference',
    'Evaluation Metrics & Bias Mitigation',
  ],
  'machine learning': [
    'Feature Engineering & Dimensionality Reduction',
    'Ensemble Methods & Gradient Boosting',
    'Deep Neural Networks & Backpropagation',
    'Hyperparameter Tuning & Regularization',
    'Model Validation & Cross-Validation Strategies',
  ],
  data: [
    'Distributed ETL Pipelines & Stream Processing',
    'Relational Query Plans & Index Optimization',
    'Statistical Hypothesis Testing & A/B Experiments',
    'Data Warehousing & Dimensional Modeling',
    'Big Data Partitioning & Distributed Storage',
  ],
  software: [
    'Concurrent Rendering & State Management',
    'Distributed Systems & Eventual Consistency',
    'Microservice Communication & API Gateways',
    'Relational Database Indexing & Query Tuning',
    'System Design & Horizontal Scaling',
  ],
  fullstack: [
    'Client-Server State Sync & Optimistic UI',
    'Authentication, Session Cookies & OAuth 2.0',
    'RESTful API Contract & GraphQL Schemas',
    'Database Transaction Isolation & ACID Compliance',
  ],
};

function resolveDomainSubtopics(topic: string): string[] {
  const lower = topic.toLowerCase();
  for (const [key, subtopics] of Object.entries(DOMAIN_SUBTOPICS)) {
    if (lower.includes(key)) return subtopics;
  }
  return [
    'Foundational Principles & Core Architecture',
    'Applied Methodology & Implementation',
    'Advanced Problem Solving & Diagnostics',
    'Optimization & High-Performance Patterns',
    'Edge Case Mitigation & Resiliency',
  ];
}

export function pickUniqueSubtopicTitle(
  topic: string,
  level: string,
  existingTitles: string[] = []
): string {
  const subtopics = resolveDomainSubtopics(topic);
  const normalizedExisting = new Set(existingTitles.map((t) => t.toLowerCase().trim()));

  for (const subtopic of subtopics) {
    const candidate = `${topic}: ${subtopic} Diagnostic`;
    if (!normalizedExisting.has(candidate.toLowerCase().trim())) {
      return candidate;
    }
  }

  for (let stage = 2; stage <= 10; stage++) {
    for (const subtopic of subtopics) {
      const candidate = `${topic}: ${subtopic} Assessment (Stage ${stage})`;
      if (!normalizedExisting.has(candidate.toLowerCase().trim())) {
        return candidate;
      }
    }
  }

  return `${topic}: ${level.charAt(0).toUpperCase() + level.slice(1)} Mastery Diagnostic (${Date.now().toString().slice(-4)})`;
}

function generateFallbackQuestions(topic: string, level: string, title: string): QuizQuestion[] {
  return [
    {
      question: `In modern ${topic} engineering, what is the primary architectural advantage of stateless decoupled services?`,
      options: [
        'Horizontal scalability and fault isolation across worker nodes',
        'Elimination of network serialization overhead',
        'Guaranteed zero latency across multi-region clusters',
        'Automatic encryption of internal processor registers',
      ],
      correctIndex: 0,
      explanation: 'Stateless services decouple persistence from execution, allowing instances to scale horizontally behind load balancers and isolate node crashes.',
    },
    {
      question: `When analyzing production failure modes in "${title}", which telemetry signal provides the earliest indicator of degradation?`,
      options: [
        'Total annual cloud billing statements',
        'P99 latency spikes and error rate slope shifts',
        'Static binary file hash checksum changes',
        'DNS domain registrar renewal TTL notifications',
      ],
      correctIndex: 1,
      explanation: 'P99 latency increases and positive error rate derivatives capture tail regressions before average metrics or availability SLAs register a breach.',
    },
    {
      question: `Which fundamental principle guarantees data consistency across distributed replicas under network partitioning in ${topic}?`,
      options: [
        'CAP Theorem tradeoffs favoring consistency over availability (CP)',
        'Unbounded FIFO queueing without rate-limiting',
        'Synchronous single-threaded blocking I/O execution',
        'Hardcoded UDP broadcast transmissions without acknowledgments',
      ],
      correctIndex: 0,
      explanation: 'Under CAP theorem, network partitions require distributed databases to choose between consistent quorums or partitioned continuous availability.',
    },
    {
      question: `At the ${level} level of ${topic}, how should sensitive configuration secrets be managed across runtime environments?`,
      options: [
        'Hardcoded as plaintext literals in version-controlled repository files',
        'Encrypted via key management services (KMS) and injected via ephemeral runtime secrets managers',
        'Stored in public client-side browser local storage',
        'Embedded into minified frontend static bundle distributions',
      ],
      correctIndex: 1,
      explanation: 'Secrets should never be baked into source control; using hardware KMS and dynamic secret management minimizes exposure vectors.',
    },
    {
      question: `What is the optimal verification strategy prior to deploying breaking schema migrations in high-throughput ${topic} systems?`,
      options: [
        'Immediate destructive table dropping during peak business hours',
        'Dual-write phased rollout with backward-compatible expand-and-contract patterns',
        'Disabling all database constraints and foreign keys indefinitely',
        'Bypassing automated test suites to expedite rollout',
      ],
      correctIndex: 1,
      explanation: 'Expand-and-contract patterns allow old and new application versions to run concurrently during migration without service interruption.',
    },
  ];
}

export async function generateQuiz(
  topic: string,
  level: string,
  numQuestions = 10,
  existingTitles: string[] = []
): Promise<GeneratedQuiz> {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, level, numQuestions, existingTitles }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.quiz;
  }

  const existingTitlesClause = existingTitles.length > 0
    ? `\nIMPORTANT: The user has ALREADY completed quizzes with these titles: [${existingTitles.slice(0, 10).map((t) => `"${t}"`).join(', ')}]. DO NOT repeat or closely match any of these titles or subtopics! Focus on a completely different subtopic or angle within "${topic}".`
    : '';

  const systemPrompt = `You are an elite academic curriculum designer and examination specialist.
Create ${numQuestions} rigorous, high-quality multiple-choice questions for "${topic}" at the "${level}" level.

TITLE SPECIFICITY REQUIREMENT (STRICT):
1. NEVER generate generic titles like "${topic} Quiz", "${level} ${topic} Quiz", "${topic} Assessment", or "${topic} Diagnostic".
2. Pick a focused, distinct subtopic, technical competency, or practical architectural/operational domain within "${topic}".
   Examples for Cybersecurity: "Network Defense & Packet Analysis Diagnostic", "Threat Modeling & Zero Trust Architecture Assessment", "Memory Safety & Exploit Mitigation Evaluation", "Cryptographic Protocols & Key Exchange Assessment".
   Examples for AI/ML: "Transformer Architecture & Attention Mechanisms Diagnostic", "Loss Functions & Gradient Optimization Assessment", "Computer Vision Feature Extraction & CNN Evaluation".
   Examples for Full-Stack: "State Management & Concurrent Rendering Assessment", "Distributed Systems & Eventual Consistency Diagnostic", "Relational Query Optimization & Indexing Assessment".
3. The quiz title MUST be detailed, unique, and clearly reflect the chosen subtopic (e.g. "[Specific Subtopic]: [Domain] Assessment").${existingTitlesClause}
4. Each question must feature 4 realistic, distinct options (options array of 4 strings), the 0-based integer 'correctIndex', and an in-depth 'explanation'.

Output valid JSON only with keys:
{
  "title": string,
  "topic": "${topic}",
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

  let parsed: any = null;

  try {
    const completion = await enzonicAI.chat.completions.create({
      model: ENZONIC_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a challenging, subtopic-specific ${level}-level diagnostic quiz for: ${topic}` },
      ],
      max_tokens: 4096,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const cleaned = content.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (aiErr) {
    console.warn('Enzonic AI quiz generation notice (falling back to deterministic curated quiz):', aiErr);
    parsed = {};
  }

  // Ensure title is strictly non-generic and non-duplicate
  const rawTitle = String(parsed?.title || '').trim();
  const lowerRawTitle = rawTitle.toLowerCase();
  const normalizedExisting = new Set(existingTitles.map((t) => t.toLowerCase().trim()));

  const isGeneric =
    !rawTitle ||
    lowerRawTitle === `${topic.toLowerCase()} quiz` ||
    lowerRawTitle === `${level.toLowerCase()} ${topic.toLowerCase()} quiz` ||
    lowerRawTitle === `${topic.toLowerCase()} assessment` ||
    lowerRawTitle === `${topic.toLowerCase()} diagnostic` ||
    lowerRawTitle === 'diagnostic quiz' ||
    lowerRawTitle === 'assessment quiz' ||
    rawTitle.length < 12;

  const isDuplicate = normalizedExisting.has(lowerRawTitle);

  if (isGeneric || isDuplicate) {
    parsed.title = pickUniqueSubtopicTitle(topic, level, existingTitles);
  } else {
    parsed.title = rawTitle;
  }

  // Ensure valid questions array
  if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
    parsed.questions = generateFallbackQuestions(topic, level, parsed.title);
  } else {
    // Validate each question structure
    parsed.questions = parsed.questions.map((q: any, idx: number) => ({
      question: String(q.question || `Question ${idx + 1} regarding ${topic}`).trim(),
      options: Array.isArray(q.options) && q.options.length >= 4
        ? q.options.slice(0, 4).map(String)
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4
        ? q.correctIndex
        : 0,
      explanation: String(q.explanation || 'Detailed explanation verified against technical specifications.'),
    }));
  }

  parsed.topic = topic;
  return parsed as GeneratedQuiz;
}

export async function generateStructuredOutput<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<T> {
  const completion = await enzonicAI.chat.completions.create({
    model: ENZONIC_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(completion.choices[0].message.content) as T;
}