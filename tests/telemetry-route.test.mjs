import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/telemetry/route.ts';

test('telemetry route accepts a small allowed event without returning its contents', async () => {
  const response = await POST(new Request('https://example.test/api/telemetry', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.3' },
    body: JSON.stringify({ kind: 'analytics', event: 'tab_opened', route: '/', properties: { tab: 'Map' } }),
  }));
  assert.equal(response.status, 202);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), '');
});

test('telemetry route rejects arbitrary event names', async () => {
  const response = await POST(new Request('https://example.test/api/telemetry', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.4' },
    body: JSON.stringify({ kind: 'analytics', event: 'search_text', properties: { query: 'private' } }),
  }));
  assert.equal(response.status, 400);
});
