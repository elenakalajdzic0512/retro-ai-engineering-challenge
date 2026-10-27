import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFakeProvider } from './ai/fake-provider.js';
import { createGeminiProvider } from './ai/gemini-provider.js';
import {
  AiOrchestrationError,
  getAiOrchestrationErrorResponse,
  getAiOrchestrationHttpStatus,
  runGameAssistant,
} from './ai/orchestrator.js';
import { ContractError, parseAiRequest } from './contracts.js';
import { invokeReadOnlyTool } from './tools.js';
import { parseTacticalRequest } from './tactical/contracts.js';
import { createTacticalFakeProvider } from './tactical/fake-provider.js';
import { createTacticalCoachGeminiProvider } from './tactical/gemini-provider.js';
import {
  TacticalCoachError,
  getTacticalCoachErrorResponse,
  runTacticalCoach,
  type RunTacticalCoachOptions,
} from './tactical/orchestrator.js';
import { invokeTacticalTool } from './tactical/tools.js';
import {
  createTacticalAdmission,
  type TacticalAdmission,
  type TacticalAdmissionLease,
} from './tactical/admission.js';
import {
  createTacticalCorrelationId,
  defaultTacticalSecurityEventSink,
  emitTacticalSecurityEvent,
  type TacticalSecurityEventSink,
} from './tactical/security-events.js';

const MAX_REQUEST_BODY_BYTES = 1_024;
const MAX_TACTICAL_REQUEST_BODY_BYTES = 4_096;

class RequestBodyTooLargeError extends Error {}

type OrchestrationOptions = NonNullable<Parameters<typeof runGameAssistant>[1]>;
type Provider = NonNullable<OrchestrationOptions['provider']>;
type TacticalProvider = NonNullable<RunTacticalCoachOptions['provider']>;

interface ApiServerOptions {
  provider?: Provider;
  providerFactory?: () => Provider | null;
  toolExecutor?: OrchestrationOptions['toolExecutor'];
  orchestrationOptions?: Omit<OrchestrationOptions, 'provider' | 'toolExecutor'>;
  tacticalProvider?: TacticalProvider;
  tacticalProviderFactory?: () => TacticalProvider | null;
  tacticalGeminiProviderFactory?: () => TacticalProvider;
  tacticalToolExecutor?: RunTacticalCoachOptions['toolExecutor'];
  tacticalOrchestrationOptions?: Omit<RunTacticalCoachOptions, 'provider' | 'signal' | 'toolExecutor'>;
  tacticalAdmissionClock?: () => number;
  tacticalAdmission?: TacticalAdmission;
  tacticalSecurityEventSink?: TacticalSecurityEventSink;
  tacticalCorrelationIdFactory?: () => string;
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function readRequestBody(request: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;

    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
      } else if (!tooLarge) {
        chunks.push(chunk);
      }
    });
    request.on('end', () => {
      if (tooLarge) rejectBody(new RequestBodyTooLargeError());
      else resolveBody(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', rejectBody);
    request.on('aborted', () => rejectBody(new Error('Request aborted.')));
  });
}

function createLocalFakeProvider(): Provider {
  return createFakeProvider({
    outcomes: [{ type: 'final', output: '{"hint":"Keep the ball in play.","category":"general"}' }],
  });
}

function createConfiguredProvider(): Provider | null {
  const providerName = process.env.AI_PROVIDER ?? 'fake';
  if (providerName === 'fake') return createLocalFakeProvider();
  if (providerName === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    return apiKey ? createGeminiProvider({ apiKey }) : null;
  }
  return null;
}

function createLocalTacticalFakeProvider(): TacticalProvider {
  return createTacticalFakeProvider({ outcomes: [
    { type: 'tool_call', toolName: 'get_tactical_snapshot', arguments: {} },
    { type: 'tool_call', toolName: 'evaluate_tactical_strategy', arguments: {
      targetZone: 'center', style: 'balanced', paddleContact: 'center', route: 'direct',
    } },
    { type: 'final', output: {
      summary: 'Clear the center with controlled bounces.', strategy: 'balanced',
      targetZone: 'center', paddleContact: 'center', route: 'direct',
      actions: ['Aim for a center paddle bounce when the ball returns.'],
      evidence: [
        { source: 'tactical_snapshot', fact: 'bricksByZone.center' },
        { source: 'strategy_evaluation', fact: 'targetOpportunity' },
      ],
    } },
  ] });
}

function createConfiguredTacticalProviderFactory(geminiFactory: () => TacticalProvider): () => TacticalProvider {
  const mode = process.env.TACTICAL_AI_PROVIDER ?? 'gemini';
  if (mode === 'fake') return createLocalTacticalFakeProvider;
  if (mode === 'gemini') return geminiFactory;
  return () => ({ async generate() { return { type: 'failure', code: 'provider_not_configured' }; } });
}

function tacticalHttpStatus(code: TacticalCoachError['code']): number {
  if (code === 'invalid_input') return 400;
  if (code === 'rate_limited') return 429;
  if (code === 'provider_unavailable' || code === 'provider_not_configured') return 503;
  if (code === 'provider_rejected') return 502;
  if (code === 'provider_timeout' || code === 'tool_timeout' || code === 'deadline') return 504;
  if (code === 'cancelled') return 499;
  return 502;
}

async function handleTacticalCoachRequest(
  request: IncomingMessage,
  response: ServerResponse,
  providerFactory: () => TacticalProvider | null,
  toolExecutor: NonNullable<RunTacticalCoachOptions['toolExecutor']>,
  orchestrationOptions: ApiServerOptions['tacticalOrchestrationOptions'],
  admission: TacticalAdmission,
  eventSink: TacticalSecurityEventSink,
  correlationIdFactory: () => string,
): Promise<void> {
  const correlationId = correlationIdFactory();
  const emit = (
    event: Parameters<typeof emitTacticalSecurityEvent>[1],
    reason: Parameters<typeof emitTacticalSecurityEvent>[3],
    outcome: Parameters<typeof emitTacticalSecurityEvent>[4],
    providerAttempts?: number,
    executedToolCalls?: number,
  ) => emitTacticalSecurityEvent(eventSink, event, correlationId, reason, outcome, providerAttempts, executedToolCalls);
  const rejectInvalid = () => emit('agent.run.rejected', 'INVALID_REQUEST', 'rejected');
  const controller = new AbortController();
  const abort = () => controller.abort();
  const onClose = () => { if (!response.writableEnded) abort(); };
  request.on('aborted', abort);
  response.on('close', onClose);
  const canWrite = () => !controller.signal.aborted && !response.destroyed && !response.writableEnded;
  let lease: TacticalAdmissionLease | undefined;
  let outcome: 'success' | 'failed' | 'aborted' = 'aborted';
  let providerAttempts = 0;
  let executedToolCalls = 0;
  let providerInFlight = false;
  let requestFinished = false;
  const releaseCapacityWhenSettled = () => {
    if (requestFinished && !providerInFlight) lease?.release();
  };
  try {
    if (request.method !== 'POST') {
      rejectInvalid();
      response.setHeader('Allow', 'POST');
      writeJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
      return;
    }
    const contentType = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
      rejectInvalid();
      writeJson(response, 415, getTacticalCoachErrorResponse(new TacticalCoachError('invalid_input')));
      return;
    }
    let body: string;
    try { body = await readRequestBody(request, MAX_TACTICAL_REQUEST_BODY_BYTES); }
    catch (error) {
      if (!canWrite()) return;
      rejectInvalid();
      const status = error instanceof RequestBodyTooLargeError ? 413 : 400;
      writeJson(response, status, getTacticalCoachErrorResponse(new TacticalCoachError('invalid_input')));
      return;
    }
    if (!canWrite()) return;
    let input;
    try { input = parseTacticalRequest(JSON.parse(body)); }
    catch {
      rejectInvalid();
      writeJson(response, 400, getTacticalCoachErrorResponse(new TacticalCoachError('invalid_input')));
      return;
    }
    if (!canWrite()) return;
    const decision = admission.tryAdmit();
    if (!decision.admitted) {
      emit('agent.run.rejected', decision.reason, 'rejected');
      writeJson(response, 429, getTacticalCoachErrorResponse(new TacticalCoachError('rate_limited')));
      return;
    }
    lease = decision.lease;
    emit('agent.run.admitted', 'ADMITTED', 'admitted');
    try {
      const provider = providerFactory();
      const trackedProvider: TacticalProvider | null = provider && {
        generate(call) {
          // A timed-out attempt may ignore abort. Keep its admission reservation
          // and do not start a retry until the underlying promise settles.
          if (providerInFlight) return Promise.resolve({ type: 'failure', code: 'provider_timeout' } as const);
          providerAttempts++;
          providerInFlight = true;
          try {
            return Promise.resolve(provider.generate(call)).finally(() => {
              providerInFlight = false;
              releaseCapacityWhenSettled();
            });
          } catch (error) {
            providerInFlight = false;
            releaseCapacityWhenSettled();
            throw error;
          }
        },
      };
      const result = await runTacticalCoach(input, {
        ...orchestrationOptions,
        provider: trackedProvider,
        toolExecutor(name, args, context) {
          executedToolCalls++;
          return toolExecutor(name, args, context);
        },
        signal: controller.signal,
      });
      if (canWrite()) {
        writeJson(response, 200, result);
        outcome = 'success';
      }
    } catch (error) {
      if (!canWrite()) return;
      const safe = error instanceof TacticalCoachError ? error : new TacticalCoachError('provider_unavailable');
      writeJson(response, tacticalHttpStatus(safe.code), getTacticalCoachErrorResponse(safe));
      outcome = 'failed';
    }
  } finally {
    if (lease) {
      requestFinished = true;
      releaseCapacityWhenSettled();
      emit('agent.run.completed', outcome === 'success' ? 'COMPLETED' : outcome === 'failed' ? 'FAILED' : 'ABORTED',
        outcome, providerAttempts, executedToolCalls);
    }
    request.off('aborted', abort);
    response.off('close', onClose);
  }
}

export function createApiServer({
  provider,
  providerFactory = createConfiguredProvider,
  toolExecutor = invokeReadOnlyTool,
  orchestrationOptions = {},
  tacticalProvider,
  tacticalProviderFactory,
  tacticalGeminiProviderFactory = createTacticalCoachGeminiProvider,
  tacticalToolExecutor = invokeTacticalTool,
  tacticalOrchestrationOptions = {},
  tacticalAdmissionClock,
  tacticalAdmission,
  tacticalSecurityEventSink = defaultTacticalSecurityEventSink,
  tacticalCorrelationIdFactory = createTacticalCorrelationId,
}: ApiServerOptions = {}) {
  const activeTacticalProviderFactory = tacticalProviderFactory
    ?? createConfiguredTacticalProviderFactory(tacticalGeminiProviderFactory);
  const admission = tacticalAdmission ?? createTacticalAdmission(tacticalAdmissionClock);
  return createHttpServer(async (request: IncomingMessage, response: ServerResponse) => {
    let pathname: string;
    try {
      pathname = new URL(request.url ?? '', 'http://localhost').pathname;
    } catch {
      writeJson(response, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } });
      return;
    }

    if (pathname === '/api/tactical-coach') {
      await handleTacticalCoachRequest(
        request, response, () => tacticalProvider ?? activeTacticalProviderFactory(),
        tacticalToolExecutor, tacticalOrchestrationOptions,
        admission, tacticalSecurityEventSink, tacticalCorrelationIdFactory,
      );
      return;
    }
    if (pathname !== '/api/ai') {
      writeJson(response, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } });
      return;
    }
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      writeJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
      return;
    }

    const contentType = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
      writeJson(response, 415, { error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json' } });
      return;
    }

    let validatedRequest;
    try {
      const body = await readRequestBody(request, MAX_REQUEST_BODY_BYTES);
      validatedRequest = parseAiRequest(JSON.parse(body));
    } catch (error: unknown) {
      if (response.destroyed || response.writableEnded) return;
      if (error instanceof RequestBodyTooLargeError) {
        writeJson(response, 413, { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } });
      } else if (error instanceof SyntaxError || error instanceof ContractError) {
        writeJson(response, 400, { error: { code: 'INVALID_REQUEST', message: 'Invalid request' } });
      } else {
        writeJson(response, 500, { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
      }
      return;
    }

    try {
      const activeProvider = provider ?? providerFactory();
      const publicResponse = await runGameAssistant(validatedRequest, {
        ...orchestrationOptions,
        provider: activeProvider,
        toolExecutor,
      });
      writeJson(response, 200, publicResponse);
    } catch (error: unknown) {
      if (response.destroyed || response.writableEnded) return;
      if (error instanceof AiOrchestrationError) {
        writeJson(response, getAiOrchestrationHttpStatus(error), getAiOrchestrationErrorResponse(error));
      } else {
        writeJson(response, 500, { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
      }
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3001);
  createApiServer().listen(port, '127.0.0.1', () => {
    console.log(`Local API listening on http://127.0.0.1:${port}`);
  });
}
