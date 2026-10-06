import type { TacticalRequest } from './contracts.js';
import type { TacticalToolDeclaration, TacticalToolResult } from './tools.js';

export type TacticalProviderFailureCode = 'provider_timeout' | 'provider_unavailable' | 'rate_limited';
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
