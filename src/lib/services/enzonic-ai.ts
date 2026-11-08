import OpenAI from 'openai';

export const enzonicAI = new OpenAI({
  baseURL: process.env.ENZONIC_ROTATOR_URL || 'http://sgp-two.enzonic.com:25836/v1',
  apiKey: process.env.ENZONIC_API_KEY || 'dummy-key-for-sdk',
  maxRetries: 0,
});

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
  numQuestions = 10
): Promise<GeneratedQuiz> {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, level, numQuestions }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.quiz;
  }

  const completion = await enzonicAI.chat.completions.create({
    model: ENZONIC_MODEL,
    messages: [
      {
        role: 'system',
        content: `Generate ${numQuestions} multiple choice quiz questions for "${topic}" at ${level} level.
        Output as JSON only with keys: title, topic, questions (array of {question, options: string[4], correctIndex: number, explanation}).`,
      },
      { role: 'user', content: `Generate quiz questions for: ${topic}` },
    ],
    max_tokens: 4096,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(content);
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