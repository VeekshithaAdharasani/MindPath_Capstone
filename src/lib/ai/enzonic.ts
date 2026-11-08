import OpenAI from 'openai';

export const enzonic = new OpenAI({
  baseURL: process.env.ENZONIC_ROTATOR_URL || 'http://sgp-two.enzonic.com:25836/v1',
  apiKey: process.env.ENZONIC_API_KEY || 'dummy-key-for-sdk',
  maxRetries: 0, // rotator handles retries across keys
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    'x-app-source': 'personalized-ai-companion',
  },
});

export const ENZONIC_MODEL = process.env.ENZONIC_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';
