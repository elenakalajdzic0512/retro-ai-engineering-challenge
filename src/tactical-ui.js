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

const evidenceLabels = {
  lives: 'Lives remaining',
  bricksRemaining: 'Bricks remaining',
  'bricksByZone.left': 'Bricks on left',
  'bricksByZone.center': 'Bricks in center',
  'bricksByZone.right': 'Bricks on right',
  'armoredByZone.left': 'Armored bricks on left',
  'armoredByZone.center': 'Armored bricks in center',
  'armoredByZone.right': 'Armored bricks on right',
  'ballDirection.horizontal': 'Ball moving horizontally',
  'ballDirection.vertical': 'Ball moving vertically',
  'shield.zone': 'Shield position',
  'shield.direction': 'Shield movement',
  portalState: 'Portal status',
  targetOpportunity: 'Targets in chosen zone',
  armoredTargets: 'Armored targets',
  riskLevel: 'Risk level',
  paddleAligned: 'Paddle aligned',
  shieldInTargetZone: 'Shield in target zone',
  portalAvailable: 'Portal available',
  routeUsable: 'Route usable',
};

const displayValues = new Set([
  'low', 'medium', 'high', 'left', 'center', 'right', 'up', 'down',
  'neutral', 'available', 'cooldown',
]);

export function formatTacticalEvidenceLabel(fact) {
  if (Object.hasOwn(evidenceLabels, fact)) return evidenceLabels[fact];
  const readable = String(fact).replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ').trim().toLowerCase();
  return readable ? readable[0].toUpperCase() + readable.slice(1) : 'Fact';
}

export function formatTacticalEvidenceValue(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && displayValues.has(value)) {
    return value[0].toUpperCase() + value.slice(1);
  }
  return String(value);
}

function appendText(doc, parent, tag, value, className = '') {
  const node = doc.createElement(tag);
  node.className = className;
  node.textContent = value;
  parent.append(node);
  return node;
}

export function renderTacticalCoachResult({ plan, evidence }, container, doc = document) {
  container.replaceChildren();
  appendText(doc, container, 'h3', 'Recommended move');
  appendText(doc, container, 'p', plan.summary, 'coach-recommendation');

  const badges = doc.createElement('div');
  badges.className = 'coach-badges';
  for (const label of [
    `${{ safe: 'Safe', balanced: 'Balanced', aggressive: 'Aggressive' }[plan.strategy]} approach`,
    `Target ${plan.targetZone}`,
    `${{ left: 'Left', center: 'Center', right: 'Right' }[plan.paddleContact]} paddle contact`,
    `${{ direct: 'Direct', portal: 'Portal' }[plan.route]} route`,
  ]) {
    appendText(doc, badges, 'span', label, 'coach-badge');
  }
  container.append(badges);

  appendText(doc, container, 'h3', 'What to do next');
  const actions = doc.createElement('ol');
  actions.className = 'coach-actions';
  for (const action of plan.actions) appendText(doc, actions, 'li', action);
  container.append(actions);

  appendText(doc, container, 'h3', 'Why this plan');
  const facts = doc.createElement('dl');
  facts.className = 'coach-evidence';
  for (const item of evidence) {
    const row = doc.createElement('div');
    row.className = 'coach-evidence-row';
    appendText(doc, row, 'dt', formatTacticalEvidenceLabel(item.fact));
    appendText(doc, row, 'dd', formatTacticalEvidenceValue(item.value));
    facts.append(row);
  }
  container.append(facts);
}

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

export function createTacticalCoachRequestController({
  button, status, result, render, pageWindow, fetchRequest = fetch,
}) {
  let active = null;
  let generation = 0;

  function cancel() {
    generation++;
    const previous = active;
    active = null;
    previous?.controller.abort();
    result.replaceChildren();
    status.textContent = '';
    button.disabled = false;
  }

  async function submit(goal, state) {
    cancel();
    const current = { id: ++generation, controller: new AbortController() };
    active = current;
    const isCurrent = () => active === current && generation === current.id && !current.controller.signal.aborted;
    button.disabled = true;
    status.textContent = 'Analyzing arena...';
    try {
      const response = await fetchRequest('/api/tactical-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, state }),
        signal: current.controller.signal,
      });
      if (!isCurrent()) return;
      if (!response.ok) throw new Error('Tactical Coach request failed.');
      const parsed = parseTacticalCoachResponse(await response.json());
      if (!isCurrent()) return;
      render(parsed);
      status.textContent = 'Tactical plan ready.';
    } catch {
      if (!isCurrent()) return;
      result.replaceChildren();
      status.textContent = 'Tactical Coach is unavailable. Please try again.';
    } finally {
      if (isCurrent()) {
        active = null;
        button.disabled = false;
      }
    }
  }

  function beforeGameLaunch(gameStatus) {
    if (gameStatus === 'won' || gameStatus === 'lost') cancel();
  }

  pageWindow.addEventListener('pagehide', cancel);
  return { submit, cancel, beforeGameLaunch };
}
