import { GoogleGenAI } from '@google/genai';
import { parseAiProviderRequest, type AiProviderRequest } from './contracts.js';

export const GEMINI_MODEL = 'gemini-3.5-flash-lite';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    hint: { type: 'string', description: 'One short actionable Neon Breaker gameplay hint.' },
    category: { type: 'string', enum: ['movement', 'timing', 'strategy', 'general'] },
  },
  required: ['hint', 'category'],
  additionalProperties: false,
};

export interface GeminiClient {
  models: {
    generateContent(request: unknown): Promise<unknown>;
  };
}

export interface GeminiProviderOptions {
  apiKey?: string;
  client?: GeminiClient;
}

function buildPrompt(input: AiProviderRequest['input']): string {
  return [
    'You are giving one concise, useful gameplay hint for Neon Breaker.',
    'Use only the supplied snapshot values and do not invent hidden game state, positions, or trajectories.',
    'Return only the requested structured JSON result.',
    `Snapshot: status=${input.status}, score=${input.score}, lives=${input.lives}, bricksRemaining=${input.bricksRemaining}.`,
  ].join('\n');
}

function extractText(response: unknown): string {
  if (response !== null && typeof response === 'object' && 'text' in response && typeof response.text === 'string') {
    return response.text;
  }
  return '';
}

export function createGeminiProvider({ apiKey, client }: GeminiProviderOptions = {}) {
  const activeClient: GeminiClient = client ?? new GoogleGenAI({ apiKey: apiKey ?? '' });

  return {
    provider: 'gemini',
    model: GEMINI_MODEL,
    async generate(request: unknown, _toolDeclarations: readonly unknown[] = [], _toolResults: readonly unknown[] = [], options: { signal: AbortSignal }): Promise<unknown> {
      const validatedRequest = parseAiProviderRequest(request);
      const response = await activeClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: buildPrompt(validatedRequest.input),
        config: {
          abortSignal: options.signal,
          maxOutputTokens: validatedRequest.maxOutputTokens,
          responseMimeType: 'application/json',
          responseJsonSchema: RESPONSE_SCHEMA,
        },
      });
      return {
        ok: true,
        provider: 'gemini',
        model: GEMINI_MODEL,
        output: { kind: 'final', output: extractText(response) },
      };
    },
  };
}
