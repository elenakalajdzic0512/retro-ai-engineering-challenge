import type { TacticalRequest } from './contracts.js';
import type { TacticalToolDeclaration, TacticalToolResult } from './tools.js';

export const MAX_PROVIDER_OUTCOME_BYTES = 8192;

// Post-SDK/application data bound; this does not limit bytes received by the transport.
export function isWithinProviderByteLimit(value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === 'string' && Buffer.byteLength(serialized, 'utf8') <= MAX_PROVIDER_OUTCOME_BYTES;
  } catch { return false; }
}

export type TacticalProviderFailureCode =
  | 'provider_timeout' | 'provider_unavailable' | 'rate_limited'
  | 'provider_rejected' | 'provider_not_configured';
export type TacticalProviderOutcome =
  | { type: 'tool_call'; toolName: string; arguments: unknown }
  | { type: 'final'; output: unknown }
  | { type: 'failure'; code: TacticalProviderFailureCode };

export interface TacticalProviderCall {
  input: TacticalRequest;
  toolDeclarations: TacticalToolDeclaration[];
  toolResults: TacticalToolResult[];
  timeoutMs: number;
  signal?: AbortSignal;
}

export type TacticalProviderCallRecord = Omit<TacticalProviderCall, 'signal'>;

export interface TacticalProvider {
  generate(call: TacticalProviderCall): Promise<unknown>;
}
