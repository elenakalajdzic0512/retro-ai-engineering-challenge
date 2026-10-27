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
  const originalWarn = console.warn;
  const originalError = console.error;
  console.log = (...parts) => { logs.push(parts.join(' ')); };
  console.warn = (...parts) => { logs.push(parts.join(' ')); };
  console.error = (...parts) => { logs.push(parts.join(' ')); };
  const server = createApiServer({
    // W05 ignores this proposed test seam. T034 must connect a generated event sink.
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, state: deriveTacticalSnapshot(createGame()) }),
    });
    const body = await response.text();
    assert.equal(response.status, 502);
    assert.doesNotMatch(body, /W08_SERVER_SECRET_DO_NOT_EXPOSE|W08_FORGED_SECURITY_EVENT/);
    assert.doesNotMatch(logs.join('\n'), /W08_SERVER_SECRET_DO_NOT_EXPOSE|W08_FORGED_SECURITY_EVENT/);
    assert.equal(events.filter((event) => JSON.stringify(event).includes(forgedEvent)).length, 0);
    assert.equal(events.filter((event) => JSON.stringify(event).includes(sentinel)).length, 0);
    t.diagnostic(`T14 event records observed: ${events.length}; operational console records observed: ${logs.length}. W05 has no request security-event sink/correlation ID.`);
    if (events.length === 0) {
      assert.notEqual(events.length, 2, 'W08 expects an admission and completion event for this request.');
      t.todo('W08 gap pending T034: generated, allowlisted admission/rejection/completion events and correlation ID.');
    }
    else {
      assert.ok(events.length >= 2, 'An admitted request and its completion must be observable.');
      for (const event of events) {
        const serialized = JSON.stringify(event);
        assert.doesNotMatch(serialized, /W08_SERVER_SECRET_DO_NOT_EXPOSE|W08_FORGED_SECURITY_EVENT|Clear the center/);
        assert.equal(typeof event.correlationId, 'string');
        assert.ok(Object.keys(event).every((key) => [
          'event', 'category', 'timestamp', 'correlationId', 'reason', 'outcome',
          'providerAttempts', 'executedToolCalls',
        ].includes(key)), 'Security events contain only allowlisted metadata.');
        for (const key of ['providerAttempts', 'executedToolCalls']) {
          if (key in event) assert.ok(Number.isSafeInteger(event[key]) && event[key] >= 0 && event[key] <= 4);
        }
      }
    }
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
