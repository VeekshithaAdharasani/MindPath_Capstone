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
  const parsed = JSON.parse(content);

  // Fallback title safety check: ensure title is not generic or empty
  const lowerTitle = String(parsed.title || '').toLowerCase().trim();
  if (
    !parsed.title ||
    lowerTitle === `${topic.toLowerCase()} quiz` ||
    lowerTitle === `${level.toLowerCase()} ${topic.toLowerCase()} quiz` ||
    lowerTitle === `${topic.toLowerCase()} assessment`
  ) {
    const subtopic = parsed.subtopic || `${level.charAt(0).toUpperCase() + level.slice(1)} Competency`;
    parsed.title = `${topic}: ${subtopic} Diagnostic`;
  }

  return parsed;
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