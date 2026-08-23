import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTelemetryEvent, telemetryEnvelope } from '../app/telemetry-logic.ts';

test('telemetry accepts only named events and non-sensitive properties', () => {
  const event = normalizeTelemetryEvent({
    kind: 'analytics',
    event: 'search_submitted',
    route: '/search?query=private',
    properties: { scope: 'both', count: 4, query: 'Sony TV', zip: '28086' },
  });
  assert.deepEqual(event, {
    kind: 'analytics', event: 'search_submitted', route: '/search', properties: { scope: 'both', count: 4 },
  });
  assert.equal(normalizeTelemetryEvent({ kind: 'analytics', event: 'unknown', route: '/', properties: {} }), null);
});

test('error telemetry cannot carry messages, stacks, or full URLs', () => {
  const event = normalizeTelemetryEvent({
    kind: 'error', event: 'client_error', route: '/saved?item=private',
    properties: { source: 'window', message: 'secret', stack: 'private', url: 'https://example.com/private' },
  });
  assert.deepEqual(event, { kind: 'error', event: 'client_error', route: '/saved', properties: { source: 'window' } });
  const envelope = telemetryEnvelope(event, '2026-08-23T12:00:00.000Z');
  assert.equal(envelope.service, 'shopping-price-map');
  assert.equal(JSON.stringify(envelope).includes('secret'), false);
});
