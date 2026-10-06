const zones = new Set(['left', 'center', 'right']);
const styles = new Set(['safe', 'balanced', 'aggressive']);
const routes = new Set(['direct', 'portal']);
const factTypes = {
  tactical_snapshot: {
    lives: 'number', bricksRemaining: 'number',
    'bricksByZone.left': 'number', 'bricksByZone.center': 'number', 'bricksByZone.right': 'number',
    'armoredByZone.left': 'number', 'armoredByZone.center': 'number', 'armoredByZone.right': 'number',
    'ballDirection.horizontal': 'string', 'ballDirection.vertical': 'string',
    'shield.zone': 'string', 'shield.direction': 'string', portalState: 'string',
  },
  strategy_evaluation: {
    targetOpportunity: 'number', armoredTargets: 'number', riskLevel: 'string',
    paddleAligned: 'boolean', shieldInTargetZone: 'boolean',
    portalAvailable: 'boolean', routeUsable: 'boolean',
  },
};

function invalid() { throw new TypeError('Invalid Tactical Coach response'); }

function fields(value, names) {
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) invalid();
  const keys = Reflect.ownKeys(value);
  if (keys.length !== names.length || names.some((name) => !keys.includes(name))) invalid();
  const result = {};
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid();
    result[name] = descriptor.value;
  }
  return result;
}

function text(value, limit) {
  if (typeof value !== 'string' || !value.trim() || [...value].length > limit) invalid();
  return value;
}

function list(value, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max) invalid();
  return value;
}

function reference(value) {
  const item = fields(value, ['source', 'fact']);
  if (typeof item.source !== 'string' || !Object.hasOwn(factTypes, item.source) ||
      typeof item.fact !== 'string' || !Object.hasOwn(factTypes[item.source], item.fact)) invalid();
  return { source: item.source, fact: item.fact };
}

export function parseTacticalCoachResponse(value) {
  const top = fields(value, ['plan', 'evidence']);
  const planInput = fields(top.plan, ['summary', 'strategy', 'targetZone', 'paddleContact', 'route', 'actions', 'evidence']);
  if (!styles.has(planInput.strategy) || !zones.has(planInput.targetZone) ||
      !zones.has(planInput.paddleContact) || !routes.has(planInput.route)) invalid();
  const plan = {
    summary: text(planInput.summary, 240), strategy: planInput.strategy,
    targetZone: planInput.targetZone, paddleContact: planInput.paddleContact, route: planInput.route,
    actions: list(planInput.actions, 1, 3).map((action) => text(action, 160)),
    evidence: list(planInput.evidence, 2, 6).map(reference),
  };
  const seen = new Set();
  for (const item of plan.evidence) {
    const key = `${item.source}:${item.fact}`;
    if (seen.has(key)) invalid();
    seen.add(key);
  }
  if (!plan.evidence.some((item) => item.source === 'tactical_snapshot') ||
      !plan.evidence.some((item) => item.source === 'strategy_evaluation')) invalid();
  const evidence = list(top.evidence, plan.evidence.length, plan.evidence.length).map((value, index) => {
    const item = fields(value, ['source', 'fact', 'value']);
    const ref = reference({ source: item.source, fact: item.fact });
    if (ref.source !== plan.evidence[index].source || ref.fact !== plan.evidence[index].fact) invalid();
    if (typeof item.value !== factTypes[ref.source][ref.fact]) invalid();
    if (typeof item.value === 'number' && (!Number.isFinite(item.value) || !Number.isInteger(item.value))) invalid();
    return { ...ref, value: item.value };
  });
  const result = { plan, evidence };
  if (new TextEncoder().encode(JSON.stringify(result)).length > 4096) invalid();
  return result;
}
