import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { deriveTacticalSnapshot } from '../src/tactical-snapshot.js';
import { createApiServer } from '../dist-server/index.js';
import { createTacticalFakeProvider } from '../dist-server/tactical/fake-provider.js';

test('T14 focused security event sink: newline/fake-event input cannot forge a record', { timeout: 10_000 }, async (t) => {
  const sentinel = 'W08_SERVER_SECRET_DO_NOT_EXPOSE';
  const forgedEvent = 'W08_FORGED_SECURITY_EVENT';
  const goal = `Clear the center.\n{"event":"${forgedEvent}"}`;
  const events = [];
  const logs = [];
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;
  console.log = (...parts) => { logs.push(parts.join(' ')); };
  console.info = (...parts) => { logs.push(parts.join(' ')); };
  console.warn = (...parts) => { logs.push(parts.join(' ')); };
  console.error = (...parts) => { logs.push(parts.join(' ')); };
  const server = createApiServer({
    tacticalSecurityEventSink: (event) => events.push(event),
    tacticalGeminiProviderFactory() { throw new Error('Live Gemini must not be selected.'); },
    tacticalProviderFactory: () => createTacticalFakeProvider({ outcomes: [
      { type: 'failure', code: 'provider_rejected', internal: sentinel },
    ] }),
  });
  try {
    await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${base}/api/tactical-coach`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': 'attacker-controlled' },
      body: JSON.stringify({ goal, state: deriveTacticalSnapshot(createGame()) }),
    });
    const body = await response.text();
    assert.equal(response.status, 502);
    assert.doesNotMatch(body, /W08_SERVER_SECRET_DO_NOT_EXPOSE|W08_FORGED_SECURITY_EVENT/);
    assert.doesNotMatch(logs.join('\n'), /W08_SERVER_SECRET_DO_NOT_EXPOSE|W08_FORGED_SECURITY_EVENT/);
    assert.equal(events.filter((event) => JSON.stringify(event).includes(forgedEvent)).length, 0);
    assert.equal(events.filter((event) => JSON.stringify(event).includes(sentinel)).length, 0);
    assert.equal(events.length, 2, 'One admitted request creates exactly admission and completion events.');
    assert.deepEqual(events.map((event) => event.event), ['agent.run.admitted', 'agent.run.completed']);
    assert.equal(events[0].correlationId, events[1].correlationId);
    assert.match(events[0].correlationId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.notEqual(events[0].correlationId, 'attacker-controlled');
    for (const event of events) {
      const serialized = JSON.stringify(event);
      assert.doesNotMatch(serialized, /W08_SERVER_SECRET_DO_NOT_EXPOSE|W08_FORGED_SECURITY_EVENT|Clear the center|attacker-controlled/);
      assert.equal(typeof event.correlationId, 'string');
      assert.ok(Object.keys(event).every((key) => [
        'event', 'category', 'timestamp', 'correlationId', 'reason', 'outcome',
        'providerAttempts', 'executedToolCalls',
      ].includes(key)), 'Security events contain only allowlisted metadata.');
      for (const key of ['providerAttempts', 'executedToolCalls']) {
        if (key in event) assert.ok(Number.isSafeInteger(event[key]) && event[key] >= 0 && event[key] <= 4);
      }
    }
    assert.deepEqual({ providerAttempts: events[1].providerAttempts, executedToolCalls: events[1].executedToolCalls },
      { providerAttempts: 1, executedToolCalls: 0 });
    // The default operational sink must serialize the same safe, fixed shape.
    const defaultServer = createApiServer({
      tacticalGeminiProviderFactory() { throw new Error('Live Gemini must not be selected.'); },
      tacticalProviderFactory: () => createTacticalFakeProvider({ outcomes: [
        { type: 'failure', code: 'provider_rejected', internal: sentinel },
      ] }),
    });
    await new Promise((resolve, reject) => defaultServer.listen(0, '127.0.0.1', resolve).once('error', reject));
    try {
      const operationalResponse = await fetch(`http://127.0.0.1:${defaultServer.address().port}/api/tactical-coach`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, state: deriveTacticalSnapshot(createGame()) }),
      });
      assert.equal(operationalResponse.status, 502);
      await operationalResponse.text();
    } finally {
      await new Promise((resolve, reject) => defaultServer.close((error) => error ? reject(error) : resolve()));
    }
    assert.equal(logs.length, 2, 'One default operational record per lifecycle event.');
    for (const line of logs) {
      assert.doesNotMatch(line, /W08_SERVER_SECRET_DO_NOT_EXPOSE|W08_FORGED_SECURITY_EVENT|Clear the center/);
      assert.ok(['agent.run.admitted', 'agent.run.completed'].includes(JSON.parse(line).event));
    }
    t.diagnostic(`T14 captured ${events.length} allowlisted events and ${logs.length} default operational records; forged-event count=0.`);
  } finally {
    console.log = originalLog;
    console.info = originalInfo;
    console.warn = originalWarn;
    console.error = originalError;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
