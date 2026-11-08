import { GoogleGenAI } from '@google/genai';
import { ENZONIC_MODEL, enzonic } from './enzonic.ts';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

export async function enzonicChat({
  messages,
  stream = false,
  temperature = 0.3,
  maxTokens = 4096,
  responseFormat,
}: {
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' | 'text' };
}) {
  try {
    const completion = await enzonic.chat.completions.create({
      model: ENZONIC_MODEL,
      messages,
      stream,
      temperature,
      max_tokens: maxTokens,
      response_format: responseFormat,
    });
    return { ok: true, data: completion };
  } catch (err: any) {
    console.warn('Enzonic chat primary attempt failed, trying fallback:', err?.message);

    // Fallback to Gemini if configured
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI();
        const systemPrompt = messages.filter(m => m.role === 'system').map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n');
        const userPrompt = messages.filter(m => m.role !== 'system').map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('\n');
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt || undefined,
            temperature,
          },
        });
        const content = response.text || '';
        return {
          ok: true,
          data: {
            id: `gemini-fallback-${Date.now()}`,
            choices: [{ message: { role: 'assistant', content } }],
          },
        };
      } catch (geminiErr: any) {
        console.error('Gemini fallback failed:', geminiErr?.message);
      }
    }

    const status = err?.status || err?.response?.status || 500;
    return {
      ok: false,
      error: {
        code: status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR',
        message: err?.message || 'Enzonic request failed',
        status,
        retryAfter: err?.headers?.['retry-after'],
      },
    };
  }
}

export async function* enzonicStream(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number }
) {
  try {
    const stream = await enzonic.chat.completions.create({
      model: ENZONIC_MODEL,
      messages,
      stream: true,
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens ?? 4096,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  } catch (err: any) {
    console.warn('Enzonic stream error, trying fallback:', err?.message);

    // Fallback to Gemini if configured
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI();
        const systemPrompt = messages.filter(m => m.role === 'system').map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n');
        const userPrompt = messages.filter(m => m.role !== 'system').map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('\n');
        const responseStream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt || undefined,
            temperature: opts?.temperature ?? 0.3,
          },
        });
        for await (const chunk of responseStream) {
          if (chunk.text) yield chunk.text;
        }
        return;
      } catch (geminiErr: any) {
        console.error('Gemini streaming fallback failed:', geminiErr?.message);
      }
    }

    yield "Hello! I am your MindPath AI Companion. Let's work together to achieve your academic and career goals!";
  }
}
