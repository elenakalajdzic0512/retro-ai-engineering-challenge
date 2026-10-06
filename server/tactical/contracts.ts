export type Zone = 'left' | 'center' | 'right';
export type Style = 'safe' | 'balanced' | 'aggressive';
export type Route = 'direct' | 'portal';
export type RejectionReason = 'none' | 'empty_target' | 'portal_cooldown' | 'portal_center_target';
export type RiskLevel = 'low' | 'medium' | 'high';
export type EvidenceSource = 'tactical_snapshot' | 'strategy_evaluation';
export type TacticalContractCode = 'invalid_input' | 'invalid_tool_arguments' | 'invalid_tool_result' | 'invalid_final_output';

export interface ZoneCounts { left: number; center: number; right: number }
export interface TacticalSnapshot {
  snapshotVersion: 1;
  status: 'ready' | 'playing';
  score: number;
  lives: number;
  bricksRemaining: number;
  normalBricksRemaining: number;
  armoredBricksRemaining: number;
  bricksByZone: ZoneCounts;
  armoredByZone: ZoneCounts;
  ballDirection: { horizontal: 'left' | 'neutral' | 'right'; vertical: 'up' | 'neutral' | 'down' };
  shield: { zone: Zone; direction: 'left' | 'right' };
  portalState: 'available' | 'cooldown';
}
export interface TacticalRequest { goal: string; state: TacticalSnapshot }
export interface CandidateStrategy { targetZone: Zone; style: Style; paddleContact: Zone; route: Route }
export interface StrategyEvaluation {
  candidateAccepted: boolean;
  rejectionReason: RejectionReason;
  targetOpportunity: number;
  armoredTargets: number;
  riskLevel: RiskLevel;
  paddleAligned: boolean;
  shieldInTargetZone: boolean;
  portalAvailable: boolean;
  routeUsable: boolean;
  evidenceCodes: string[];
}
export interface EvidenceReference { source: EvidenceSource; fact: string }
export interface TacticalPlan {
  summary: string;
  strategy: Style;
  targetZone: Zone;
  paddleContact: Zone;
  route: Route;
  actions: string[];
  evidence: EvidenceReference[];
}

export class TacticalContractError extends Error {
  constructor(public readonly code: TacticalContractCode, message: string) {
    super(message);
    this.name = 'TacticalContractError';
  }
}

const ZONES = ['left', 'center', 'right'] as const;
const STYLES = ['safe', 'balanced', 'aggressive'] as const;
const ROUTES = ['direct', 'portal'] as const;
const REASONS = ['none', 'empty_target', 'portal_cooldown', 'portal_center_target'] as const;
const RISKS = ['low', 'medium', 'high'] as const;
const EVIDENCE_CODES = ['target_count', 'armored_count', 'lives', 'paddle_alignment', 'shield_zone', 'portal_state', 'risk_rule'] as const;
const SNAPSHOT_FACTS = new Set([
  'lives', 'bricksRemaining', 'bricksByZone.left', 'bricksByZone.center', 'bricksByZone.right',
  'armoredByZone.left', 'armoredByZone.center', 'armoredByZone.right',
  'ballDirection.horizontal', 'ballDirection.vertical', 'shield.zone', 'shield.direction', 'portalState',
]);
const EVALUATION_FACTS = new Set([
  'targetOpportunity', 'armoredTargets', 'riskLevel', 'paddleAligned',
  'shieldInTargetZone', 'portalAvailable', 'routeUsable',
]);

function fail(code: TacticalContractCode, message: string): never {
  throw new TacticalContractError(code, message);
}

function exactObject(value: unknown, fields: readonly string[], code: TacticalContractCode, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(code, `${label} must be a plain object.`);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || fields.some((field) => !keys.includes(field))) {
    fail(code, `${label} must contain exactly ${fields.join(', ')}.`);
  }
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) fail(code, `${label}.${field} must be a data property.`);
    result[field] = descriptor.value;
  }
  return result;
}

function exactArray(value: unknown, min: number, max: number, code: TacticalContractCode, label: string): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length < min || value.length > max) {
    fail(code, `${label} must be an array of ${min} to ${max} items.`);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1) fail(code, `${label} must contain only indexed items.`);
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) fail(code, `${label}[${index}] must be a data property.`);
    result.push(descriptor.value);
  }
  return result;
}

function enumValue<const T extends readonly string[]>(value: unknown, allowed: T, code: TacticalContractCode, label: string): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) fail(code, `${label} is invalid.`);
  return value as T[number];
}

function integer(value: unknown, min: number, max: number, code: TacticalContractCode, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    fail(code, `${label} must be an integer from ${min} to ${max}.`);
  }
  return value;
}

function text(value: unknown, max: number, code: TacticalContractCode, label: string): string {
  if (typeof value !== 'string') fail(code, `${label} must be a string.`);
  const trimmed = value.trim();
  const length = Array.from(trimmed).length;
  if (length < 1 || length > max) fail(code, `${label} must contain 1 to ${max} Unicode code points.`);
  return trimmed;
}

function zones(value: unknown, label: string): ZoneCounts {
  const counts = exactObject(value, ZONES, 'invalid_input', label);
  return {
    left: integer(counts.left, 0, 40, 'invalid_input', `${label}.left`),
    center: integer(counts.center, 0, 40, 'invalid_input', `${label}.center`),
    right: integer(counts.right, 0, 40, 'invalid_input', `${label}.right`),
  };
}

export function parseTacticalSnapshot(value: unknown): TacticalSnapshot {
  const fields = [
    'snapshotVersion', 'status', 'score', 'lives', 'bricksRemaining', 'normalBricksRemaining',
    'armoredBricksRemaining', 'bricksByZone', 'armoredByZone', 'ballDirection', 'shield', 'portalState',
  ];
  const data = exactObject(value, fields, 'invalid_input', 'state');
  if (data.snapshotVersion !== 1) fail('invalid_input', 'state.snapshotVersion must be 1.');
  const status = enumValue(data.status, ['ready', 'playing'], 'invalid_input', 'state.status');
  const score = integer(data.score, 0, 390, 'invalid_input', 'state.score');
  if (score % 10 !== 0) fail('invalid_input', 'state.score must be a multiple of 10.');
  const lives = integer(data.lives, 1, 3, 'invalid_input', 'state.lives');
  const bricksRemaining = integer(data.bricksRemaining, 1, 40, 'invalid_input', 'state.bricksRemaining');
  const normalBricksRemaining = integer(data.normalBricksRemaining, 0, 32, 'invalid_input', 'state.normalBricksRemaining');
  const armoredBricksRemaining = integer(data.armoredBricksRemaining, 0, 8, 'invalid_input', 'state.armoredBricksRemaining');
  const bricksByZone = zones(data.bricksByZone, 'state.bricksByZone');
  const armoredByZone = zones(data.armoredByZone, 'state.armoredByZone');
  const ball = exactObject(data.ballDirection, ['horizontal', 'vertical'], 'invalid_input', 'state.ballDirection');
  const ballDirection = {
    horizontal: enumValue(ball.horizontal, ['left', 'neutral', 'right'], 'invalid_input', 'state.ballDirection.horizontal'),
    vertical: enumValue(ball.vertical, ['up', 'neutral', 'down'], 'invalid_input', 'state.ballDirection.vertical'),
  };
  const shieldData = exactObject(data.shield, ['zone', 'direction'], 'invalid_input', 'state.shield');
  const shield = {
    zone: enumValue(shieldData.zone, ZONES, 'invalid_input', 'state.shield.zone'),
    direction: enumValue(shieldData.direction, ['left', 'right'], 'invalid_input', 'state.shield.direction'),
  };
  const portalState = enumValue(data.portalState, ['available', 'cooldown'], 'invalid_input', 'state.portalState');
  if (bricksRemaining !== normalBricksRemaining + armoredBricksRemaining ||
      bricksRemaining !== bricksByZone.left + bricksByZone.center + bricksByZone.right ||
      armoredBricksRemaining !== armoredByZone.left + armoredByZone.center + armoredByZone.right ||
      ZONES.some((zone) => armoredByZone[zone] > bricksByZone[zone]) ||
      score !== 10 * (40 - bricksRemaining)) {
    fail('invalid_input', 'state counts and score are inconsistent.');
  }
  return {
    snapshotVersion: 1, status, score, lives, bricksRemaining, normalBricksRemaining,
    armoredBricksRemaining, bricksByZone, armoredByZone, ballDirection, shield, portalState,
  };
}

export function parseTacticalRequest(value: unknown): TacticalRequest {
  const data = exactObject(value, ['goal', 'state'], 'invalid_input', 'request');
  const goal = text(data.goal, 240, 'invalid_input', 'request.goal');
  const state = parseTacticalSnapshot(data.state);
  return { goal, state };
}

export function parseCandidateStrategy(value: unknown): CandidateStrategy {
  const data = exactObject(value, ['targetZone', 'style', 'paddleContact', 'route'], 'invalid_tool_arguments', 'candidate');
  return {
    targetZone: enumValue(data.targetZone, ZONES, 'invalid_tool_arguments', 'candidate.targetZone'),
    style: enumValue(data.style, STYLES, 'invalid_tool_arguments', 'candidate.style'),
    paddleContact: enumValue(data.paddleContact, ZONES, 'invalid_tool_arguments', 'candidate.paddleContact'),
    route: enumValue(data.route, ROUTES, 'invalid_tool_arguments', 'candidate.route'),
  };
}

export function parseStrategyEvaluation(value: unknown): StrategyEvaluation {
  const data = exactObject(value, [
    'candidateAccepted', 'rejectionReason', 'targetOpportunity', 'armoredTargets', 'riskLevel',
    'paddleAligned', 'shieldInTargetZone', 'portalAvailable', 'routeUsable', 'evidenceCodes',
  ], 'invalid_tool_result', 'evaluation');
  const reason = enumValue(data.rejectionReason, REASONS, 'invalid_tool_result', 'evaluation.rejectionReason');
  if (typeof data.candidateAccepted !== 'boolean' || data.candidateAccepted !== (reason === 'none')) {
    fail('invalid_tool_result', 'evaluation acceptance and reason disagree.');
  }
  const targetOpportunity = integer(data.targetOpportunity, 0, Number.MAX_SAFE_INTEGER, 'invalid_tool_result', 'evaluation.targetOpportunity');
  const armoredTargets = integer(data.armoredTargets, 0, targetOpportunity, 'invalid_tool_result', 'evaluation.armoredTargets');
  const riskLevel = enumValue(data.riskLevel, RISKS, 'invalid_tool_result', 'evaluation.riskLevel');
  const flags = ['paddleAligned', 'shieldInTargetZone', 'portalAvailable', 'routeUsable'] as const;
  for (const flag of flags) if (typeof data[flag] !== 'boolean') fail('invalid_tool_result', `evaluation.${flag} must be boolean.`);
  const codes = exactArray(data.evidenceCodes, 7, 7, 'invalid_tool_result', 'evaluation.evidenceCodes');
  if (EVIDENCE_CODES.some((code, index) => codes[index] !== code)) fail('invalid_tool_result', 'evaluation.evidenceCodes are invalid.');
  return {
    candidateAccepted: data.candidateAccepted,
    rejectionReason: reason, targetOpportunity, armoredTargets, riskLevel,
    paddleAligned: data.paddleAligned as boolean,
    shieldInTargetZone: data.shieldInTargetZone as boolean,
    portalAvailable: data.portalAvailable as boolean,
    routeUsable: data.routeUsable as boolean,
    evidenceCodes: [...EVIDENCE_CODES],
  };
}

export function parseTacticalPlan(value: unknown): TacticalPlan {
  const data = exactObject(value, ['summary', 'strategy', 'targetZone', 'paddleContact', 'route', 'actions', 'evidence'], 'invalid_final_output', 'plan');
  const actions = exactArray(data.actions, 1, 3, 'invalid_final_output', 'plan.actions')
    .map((action, index) => text(action, 160, 'invalid_final_output', `plan.actions[${index}]`));
  const references = exactArray(data.evidence, 2, 6, 'invalid_final_output', 'plan.evidence');
  const seen = new Set<string>();
  const evidence = references.map((reference, index): EvidenceReference => {
    const entry = exactObject(reference, ['source', 'fact'], 'invalid_final_output', `plan.evidence[${index}]`);
    const source = enumValue(entry.source, ['tactical_snapshot', 'strategy_evaluation'], 'invalid_final_output', `plan.evidence[${index}].source`);
    const facts = source === 'tactical_snapshot' ? SNAPSHOT_FACTS : EVALUATION_FACTS;
    if (typeof entry.fact !== 'string' || !facts.has(entry.fact)) fail('invalid_final_output', `plan.evidence[${index}].fact is invalid.`);
    const key = `${source}:${entry.fact}`;
    if (seen.has(key)) fail('invalid_final_output', 'plan.evidence contains a duplicate reference.');
    seen.add(key);
    return { source, fact: entry.fact };
  });
  if (!evidence.some((item) => item.source === 'tactical_snapshot') ||
      !evidence.some((item) => item.source === 'strategy_evaluation')) {
    fail('invalid_final_output', 'plan.evidence must cite both tools.');
  }
  const plan: TacticalPlan = {
    summary: text(data.summary, 240, 'invalid_final_output', 'plan.summary'),
    strategy: enumValue(data.strategy, STYLES, 'invalid_final_output', 'plan.strategy'),
    targetZone: enumValue(data.targetZone, ZONES, 'invalid_final_output', 'plan.targetZone'),
    paddleContact: enumValue(data.paddleContact, ZONES, 'invalid_final_output', 'plan.paddleContact'),
    route: enumValue(data.route, ROUTES, 'invalid_final_output', 'plan.route'),
    actions, evidence,
  };
  if (Buffer.byteLength(JSON.stringify(plan), 'utf8') > 4096) fail('invalid_final_output', 'plan exceeds 4096 UTF-8 bytes.');
  return plan;
}

export function parseTacticalPlanForCandidate(value: unknown, candidate: unknown): TacticalPlan {
  const plan = parseTacticalPlan(value);
  const accepted = parseCandidateStrategy(candidate);
  if (plan.targetZone !== accepted.targetZone || plan.strategy !== accepted.style ||
      plan.paddleContact !== accepted.paddleContact || plan.route !== accepted.route) {
    fail('invalid_final_output', 'plan does not match evaluated candidate.');
  }
  return plan;
}
