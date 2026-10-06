import { parseTacticalRequest } from './contracts.js';
import { parseTacticalToolResult } from './tools.js';
import type { TacticalProvider, TacticalProviderCall, TacticalProviderCallRecord } from './provider-contracts.js';

export class FakeProviderExhaustedError extends Error {
  constructor() {
    super('Tactical fake provider script is exhausted.');
    this.name = 'FakeProviderExhaustedError';
  }
}

export class TacticalFakeProvider implements TacticalProvider {
  static readonly MAX_CALL_HISTORY = 16;
  readonly #outcomes: unknown[];
  readonly #calls: TacticalProviderCallRecord[] = [];
  #callCount = 0;
  #next = 0;

  constructor(options: { outcomes: readonly unknown[] }) {
    this.#outcomes = structuredClone([...options.outcomes]);
  }

  get callCount(): number { return this.#callCount; }
  get calls(): TacticalProviderCallRecord[] { return structuredClone(this.#calls); }

  async generate(call: TacticalProviderCall): Promise<unknown> {
    const input = parseTacticalRequest(call.input);
    if (!Array.isArray(call.toolDeclarations) || !Array.isArray(call.toolResults) ||
        call.toolResults.length > 2 || !Number.isInteger(call.timeoutMs) ||
        call.timeoutMs < 1 || call.timeoutMs > 30_000) {
      throw new TypeError('Invalid tactical fake provider call.');
    }
    const toolDeclarations = structuredClone(call.toolDeclarations);
    const toolResults = call.toolResults.map(parseTacticalToolResult);
    this.#callCount++;
    this.#calls.push({ input, toolDeclarations, toolResults, timeoutMs: call.timeoutMs });
    if (this.#calls.length > TacticalFakeProvider.MAX_CALL_HISTORY) this.#calls.shift();
    if (this.#next >= this.#outcomes.length) throw new FakeProviderExhaustedError();
    return structuredClone(this.#outcomes[this.#next++]);
  }
}

export function createTacticalFakeProvider(options: { outcomes: readonly unknown[] }): TacticalFakeProvider {
  return new TacticalFakeProvider(options);
}
