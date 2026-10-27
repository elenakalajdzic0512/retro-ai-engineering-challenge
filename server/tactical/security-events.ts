import { randomUUID } from 'node:crypto';
import { MAX_PROVIDER_CALLS, MAX_TOOL_CALLS } from './orchestrator.js';

export type TacticalSecurityEventName = 'agent.run.admitted' | 'agent.run.rejected' | 'agent.run.completed';
export type TacticalSecurityReason =
  | 'ACTIVE_LIMIT' | 'RATE_LIMIT' | 'INVALID_REQUEST' | 'ADMITTED' | 'COMPLETED' | 'FAILED' | 'ABORTED';
export type TacticalSecurityOutcome = 'admitted' | 'rejected' | 'success' | 'failed' | 'aborted';

export interface TacticalSecurityEvent {
  event: TacticalSecurityEventName;
  timestamp: number;
  correlationId: string;
  reason: TacticalSecurityReason;
  outcome: TacticalSecurityOutcome;
  providerAttempts?: number;
  executedToolCalls?: number;
}

export type TacticalSecurityEventSink = (event: Readonly<TacticalSecurityEvent>) => void;

export function defaultTacticalSecurityEventSink(event: Readonly<TacticalSecurityEvent>): void {
  console.info(JSON.stringify(event));
}

// Build every record from fixed fields. No caller/provider object is serialized.
export function emitTacticalSecurityEvent(
  sink: TacticalSecurityEventSink,
  event: TacticalSecurityEventName,
  correlationId: string,
  reason: TacticalSecurityReason,
  outcome: TacticalSecurityOutcome,
  providerAttempts?: number,
  executedToolCalls?: number,
): void {
  const record: TacticalSecurityEvent = { event, timestamp: Date.now(), correlationId, reason, outcome };
  if (providerAttempts !== undefined && Number.isSafeInteger(providerAttempts) &&
      providerAttempts >= 0 && providerAttempts <= MAX_PROVIDER_CALLS) {
    record.providerAttempts = providerAttempts;
  }
  if (executedToolCalls !== undefined && Number.isSafeInteger(executedToolCalls) &&
      executedToolCalls >= 0 && executedToolCalls <= MAX_TOOL_CALLS) {
    record.executedToolCalls = executedToolCalls;
  }
  try { sink(Object.freeze(record)); }
  catch { /* A logging failure must not change admission or the public response. */ }
}

export const createTacticalCorrelationId = randomUUID;
