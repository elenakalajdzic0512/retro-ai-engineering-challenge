import {
  parseCandidateStrategy,
  parseStrategyEvaluation,
  parseTacticalSnapshot,
  type CandidateStrategy,
  type RiskLevel,
  type StrategyEvaluation,
  type Style,
  type TacticalSnapshot,
} from './contracts.js';

const RISK: Readonly<Record<1 | 2 | 3, Readonly<Record<Style, RiskLevel>>>> = {
  1: { safe: 'high', balanced: 'high', aggressive: 'high' },
  2: { safe: 'low', balanced: 'medium', aggressive: 'high' },
  3: { safe: 'low', balanced: 'low', aggressive: 'medium' },
};

const EVIDENCE_CODES = [
  'target_count', 'armored_count', 'lives', 'paddle_alignment', 'shield_zone', 'portal_state', 'risk_rule',
];

export function evaluateTacticalStrategy(snapshot: TacticalSnapshot, candidate: CandidateStrategy): StrategyEvaluation {
  const state = parseTacticalSnapshot(snapshot);
  const choice = parseCandidateStrategy(candidate);
  const targetOpportunity = state.bricksByZone[choice.targetZone];
  const armoredTargets = state.armoredByZone[choice.targetZone];
  const portalAvailable = state.portalState === 'available';
  const routeUsable = choice.route === 'direct' || (portalAvailable && choice.targetZone !== 'center');
  const rejectionReason = targetOpportunity === 0 ? 'empty_target'
    : choice.route === 'portal' && !portalAvailable ? 'portal_cooldown'
      : choice.route === 'portal' && choice.targetZone === 'center' ? 'portal_center_target'
        : 'none';
  return parseStrategyEvaluation({
    candidateAccepted: rejectionReason === 'none',
    rejectionReason,
    targetOpportunity,
    armoredTargets,
    riskLevel: RISK[state.lives as 1 | 2 | 3][choice.style],
    paddleAligned: choice.paddleContact === choice.targetZone,
    shieldInTargetZone: state.shield.zone === choice.targetZone,
    portalAvailable,
    routeUsable,
    evidenceCodes: EVIDENCE_CODES,
  });
}
