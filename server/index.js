import { createServer as createHttpServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFakeProvider } from './ai/fake-provider.js';
import {
  AiOrchestrationError,
  getAiOrchestrationErrorResponse,
  getAiOrchestrationHttpStatus,
  runGameAssistant,
} from './ai/orchestrator.js';
import { ContractError, parseAiRequest } from './contracts.js';
import { invokeReadOnlyTool } from './tools.js';

const MAX_REQUEST_BODY_BYTES = 16 * 1024;

class RequestBodyTooLargeError extends Error {}

function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function readRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BODY_BYTES) {
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

function createLocalFakeProvider() {
  return createFakeProvider({
    outcomes: [{ type: 'final', output: { answer: 'Local fake provider response.' } }],
  });
}

export function createApiServer({
  provider,
  providerFactory = createLocalFakeProvider,
  toolExecutor = invokeReadOnlyTool,
  orchestrationOptions = {},
} = {}) {
  return createHttpServer(async (request, response) => {
    let pathname;
    try {
      pathname = new URL(request.url, 'http://localhost').pathname;
    } catch {
      writeJson(response, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } });
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
      const body = await readRequestBody(request);
      validatedRequest = parseAiRequest(JSON.parse(body));
    } catch (error) {
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
    } catch (error) {
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