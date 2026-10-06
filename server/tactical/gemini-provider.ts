import { FunctionCallingConfigMode, GoogleGenAI, type Content, type GenerateContentParameters, type Part } from '@google/genai';
import { parseCandidateStrategy } from './contracts.js';
import type { TacticalProvider, TacticalProviderCall, TacticalProviderOutcome } from './provider-contracts.js';
import { getTacticalToolDeclarations, parseTacticalToolResult, type TacticalToolName, type TacticalToolResult } from './tools.js';

export const TACTICAL_GEMINI_MODEL = 'gemini-3.5-flash-lite';

const SYSTEM_INSTRUCTION = 'You are Neon Breaker Tactical Coach. Follow the current server-provided tool or JSON-output instruction. Use only validated tool responses as arena evidence. Follow three stages in order: first request the snapshot, then propose one strategy evaluation candidate, and only after a validated evaluation response produce the final plan. Never claim an exact trajectory or future outcome.';
const SNAPSHOT_INSTRUCTION = 'First call get_tactical_snapshot with exactly {}. Do not provide a plan yet.';
const EVALUATION_INSTRUCTION = 'Use the snapshot function result to choose exactly one targetZone, style, paddleContact and route. Call evaluate_tactical_strategy with only those four fields.';
const FINAL_INSTRUCTION = [
  'Return only one JSON TacticalPlan with exactly these top-level keys: summary, strategy, targetZone, paddleContact, route, actions, evidence; no extra keys.',
  'Preserve the exact accepted evaluated candidate: final.targetZone = candidate.targetZone; final.strategy = candidate.style; final.paddleContact = candidate.paddleContact; final.route = candidate.route. Do not revise the candidate.',
  'Evidence entries contain only {source,fact}; do not author value, confidence, success, completed, provider, model, explanation, or any extra field. The application materializes evidence values.',
  'Use exactly tactical_snapshot and strategy_evaluation as evidence sources, with at least one tactical_snapshot reference and at least one strategy_evaluation reference. Evidence references must be unique by source + fact.',
  'tactical_snapshot facts: lives, bricksRemaining, bricksByZone.left, bricksByZone.center, bricksByZone.right, armoredByZone.left, armoredByZone.center, armoredByZone.right, ballDirection.horizontal, ballDirection.vertical, shield.zone, shield.direction, portalState; no others.',
  'strategy_evaluation facts: targetOpportunity, armoredTargets, riskLevel, paddleAligned, shieldInTargetZone, portalAvailable, routeUsable; no others.',
  'Cite only facts actually present in the validated function responses already provided. Do not invent evidence, infer new fact names from prose, or turn values into fact names.',
  'The summary must be nonblank and at most 240 Unicode code points; provide 1 to 3 actions, each nonblank and at most 160 Unicode code points; provide 2 to 6 evidence references.',
  'Keep the normalized plan compact for the application 4096-byte limit; the application validates the bound.',
].join(' ');

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    strategy: { type: 'string', enum: ['safe', 'balanced', 'aggressive'] },
    targetZone: { type: 'string', enum: ['left', 'center', 'right'] },
    paddleContact: { type: 'string', enum: ['left', 'center', 'right'] },
    route: { type: 'string', enum: ['direct', 'portal'] },
    actions: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
    evidence: {
      type: 'array', minItems: 2, maxItems: 6,
      items: {
        type: 'object',
        properties: { source: { type: 'string', enum: ['tactical_snapshot', 'strategy_evaluation'] }, fact: { type: 'string' } },
        required: ['source', 'fact'], additionalProperties: false,
      },
    },
  },
  required: ['summary', 'strategy', 'targetZone', 'paddleContact', 'route', 'actions', 'evidence'],
  additionalProperties: false,
} as const;

export interface TacticalGeminiClient {
  models: { generateContent(request: GenerateContentParameters): Promise<unknown> };
}

export interface TacticalGeminiProviderOptions {
  apiKey?: string;
  client?: TacticalGeminiClient;
}

type Candidate = { finishReason?: unknown; content?: { parts?: unknown; role?: unknown } };
type Response = { candidates?: unknown; promptFeedback?: { blockReason?: unknown } };
type PendingCall = { name: TacticalToolName; id?: string };
type ToolProposal = Extract<TacticalProviderOutcome, { type: 'tool_call' }>;

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function isRefusal(value: unknown): boolean {
  return value === 'SAFETY' || value === 'BLOCKLIST' || value === 'PROHIBITED_CONTENT' ||
    value === 'SPII' || value === 'RECITATION' || value === 'LANGUAGE' || value === 'IMAGE_SAFETY' ||
    value === 'IMAGE_PROHIBITED_CONTENT';
}

function singleCandidate(response: unknown): Candidate | null {
  const envelope = object(response) as Response | null;
  if (!envelope || !Array.isArray(envelope.candidates) || envelope.candidates.length !== 1) return null;
  return object(envelope.candidates[0]) as Candidate | null;
}

function refused(response: unknown): boolean {
  const envelope = object(response) as Response | null;
  if (!envelope) return false;
  if (isRefusal(envelope.promptFeedback?.blockReason) || envelope.promptFeedback?.blockReason === 'OTHER' ||
      envelope.promptFeedback?.blockReason === 'MODEL_ARMOR') return true;
  const candidate = singleCandidate(response);
  return isRefusal(candidate?.finishReason);
}

function toolProposal(response: unknown, expected: TacticalToolName): { proposal: ToolProposal; modelPart: Part; id?: string } | null {
  const candidate = singleCandidate(response);
  if (candidate?.finishReason !== undefined && candidate.finishReason !== 'STOP') return null;
  if (candidate?.content?.role !== undefined && candidate.content.role !== 'model') return null;
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts) || parts.length !== 1) return null;
  const part = object(parts[0]);
  if (!part || Reflect.ownKeys(part).some((key) => key !== 'functionCall' && key !== 'thoughtSignature')) return null;
  const functionCall = object(part?.functionCall);
  if (!functionCall || functionCall.name !== expected) return null;
  if (Reflect.ownKeys(functionCall).some((key) => key !== 'name' && key !== 'args' && key !== 'id')) return null;
  const id = functionCall.id;
  if (id !== undefined && (typeof id !== 'string' || id.length === 0 || id.length > 256)) return null;
  let args: Record<string, unknown>;
  if (functionCall.args === null || typeof functionCall.args !== 'object' ||
      Object.getPrototypeOf(functionCall.args) !== Object.prototype) return null;
  if (expected === 'get_tactical_snapshot') {
    if (Reflect.ownKeys(functionCall.args).length !== 0) return null;
    args = {};
  } else {
    try { args = { ...parseCandidateStrategy(functionCall.args) }; }
    catch { return null; }
  }
  const signature = part?.thoughtSignature;
  if (signature !== undefined && typeof signature !== 'string') return null;
  const modelPart: Part = {
    functionCall: { name: expected, args, ...(id === undefined ? {} : { id }) },
    ...(signature === undefined ? {} : { thoughtSignature: signature }),
  };
  return { proposal: { type: 'tool_call', toolName: expected, arguments: args }, modelPart, ...(id === undefined ? {} : { id }) };
}

function finalProposal(response: unknown): TacticalProviderOutcome | null {
  const candidate = singleCandidate(response);
  if (candidate?.finishReason !== undefined && candidate.finishReason !== 'STOP') return null;
  if (candidate?.content?.role !== undefined && candidate.content.role !== 'model') return null;
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts) || parts.length !== 1) return null;
  const part = object(parts[0]);
  if (!part || typeof part.text !== 'string' ||
      Reflect.ownKeys(part).some((key) => key !== 'text' && key !== 'thoughtSignature')) return null;
  let output: unknown;
  try { output = JSON.parse(part.text); }
  catch { return null; }
  if (output === null || typeof output !== 'object' || Array.isArray(output)) return null;
  return { type: 'final', output };
}

function failureFromError(error: unknown, signal?: AbortSignal): TacticalProviderOutcome {
  // A caller/attempt abort belongs to the orchestrator, which distinguishes cancellation from timeout.
  if (signal?.aborted) throw error;
  const data = object(error);
  const status = data?.status ?? data?.statusCode;
  if (status === 401 || status === 403 || status === 404) return { type: 'failure', code: 'provider_not_configured' };
  if (status === 400 || status === 422) return { type: 'failure', code: 'provider_rejected' };
  if (status === 429) return { type: 'failure', code: 'rate_limited' };
  if (status === 408 || status === 504) return { type: 'failure', code: 'provider_timeout' };
  if (data?.name === 'AbortError' || data?.code === 'ETIMEDOUT') return { type: 'failure', code: 'provider_timeout' };
  return { type: 'failure', code: 'provider_unavailable' };
}

function validateToolResultSequence(
  values: unknown,
  phase: number,
  acceptedSnapshot: string | null,
): TacticalToolResult[] | null {
  if (!Array.isArray(values) || values.length !== phase || phase > 2) return null;
  let validated: TacticalToolResult[];
  try { validated = values.map(parseTacticalToolResult); }
  catch { return null; }
  if (phase >= 1) {
    if (validated[0].toolName !== 'get_tactical_snapshot') return null;
    if (acceptedSnapshot !== null && JSON.stringify(validated[0].result) !== acceptedSnapshot) return null;
  }
  if (phase === 2 && (validated[1].toolName !== 'evaluate_tactical_strategy' || acceptedSnapshot === null)) return null;
  return validated;
}

export function createTacticalCoachGeminiProvider(options: TacticalGeminiProviderOptions = {}): TacticalProvider {
  // Injected clients bypass environment-key lookup entirely, keeping stub tests key-free.
  let client: TacticalGeminiClient | null = options.client ?? null;
  if (!client) {
    const configuredKey = options.apiKey === undefined ? process.env.GEMINI_API_KEY : options.apiKey;
    const apiKey = typeof configuredKey === 'string' ? configuredKey.trim() : '';
    if (apiKey) {
      try { client = new GoogleGenAI({ apiKey }); }
      catch { client = null; }
    }
  }
  const declarations = getTacticalToolDeclarations();
  const history: Content[] = [];
  let pending: PendingCall | null = null;
  let completedResults = 0;
  let acceptedSnapshot: string | null = null;
  let goal: string | null = null;
  let finished = false;

  return {
    async generate(call: TacticalProviderCall): Promise<unknown> {
      if (!client) return { type: 'failure', code: 'provider_not_configured' };
      if (finished || !Array.isArray(call.toolResults)) return null;
      const step = history.length === 0 ? 0 : completedResults + 1;
      if (step > 2 || call.toolResults.length !== step || (step > 0 && !pending)) return null;
      if (goal !== null && goal !== call.input.goal) return null;
      const validatedResults = validateToolResultSequence(call.toolResults, step, acceptedSnapshot);
      if (!validatedResults) return null;
      if (step === 1 && acceptedSnapshot === null) acceptedSnapshot = JSON.stringify(validatedResults[0].result);
      const contents: Content[] = step === 0
        ? [{ role: 'user', parts: [{ text: call.input.goal }] }]
        : structuredClone(history);
      if (step > 0) {
        const validated = validatedResults[step - 1];
        if (validated.toolName !== pending!.name) return null;
        const functionResponse = {
          name: pending!.name,
          ...(pending!.id === undefined ? {} : { id: pending!.id }),
          response: { output: validated.result },
        };
        contents.push({ role: 'user', parts: [{ functionResponse }] });
      }
      const expected: TacticalToolName | null = step === 0 ? 'get_tactical_snapshot'
        : step === 1 ? 'evaluate_tactical_strategy' : null;
      const config: NonNullable<GenerateContentParameters['config']> = {
        abortSignal: call.signal,
        automaticFunctionCalling: { disable: true },
        systemInstruction: `${SYSTEM_INSTRUCTION} ${step === 0 ? SNAPSHOT_INSTRUCTION : step === 1 ? EVALUATION_INSTRUCTION : FINAL_INSTRUCTION}`,
        candidateCount: 1,
        ...(expected ? {
          tools: [{ functionDeclarations: declarations.filter((item) => item.name === expected)
            .map((item) => ({ name: item.name, description: item.description, parametersJsonSchema: item.inputSchema })) }],
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: [expected] } },
        } : {
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.NONE } },
          responseMimeType: 'application/json',
          responseJsonSchema: PLAN_SCHEMA,
        }),
      };
      let response: unknown;
      try { response = await client.models.generateContent({ model: TACTICAL_GEMINI_MODEL, contents, config }); }
      catch (error) { return failureFromError(error, call.signal); }
      if (refused(response)) return { type: 'failure', code: 'provider_rejected' };
      if (expected) {
        const normalized = toolProposal(response, expected);
        if (!normalized) return null;
        history.splice(0, history.length, ...contents, { role: 'model', parts: [normalized.modelPart] });
        pending = { name: expected, ...(normalized.id === undefined ? {} : { id: normalized.id }) };
        completedResults = step;
        goal = call.input.goal;
        return normalized.proposal;
      }
      const normalized = finalProposal(response);
      if (normalized) finished = true;
      return normalized;
    },
  };
}
