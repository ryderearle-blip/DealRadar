import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHealthPayload } from '../app/health-logic.ts';
import { GET } from '../app/api/health/route.ts';

test('health payload separates app readiness from optional retailer setup', () => {
  const checkedAt = '2026-08-23T12:00:00.000Z';
  assert.deepEqual(buildHealthPayload(false, checkedAt), {
    status: 'operational',
    service: 'shopping-price-map',
    checkedAt,
    checks: {
      application: { status: 'ready' },
      storeDiscovery: { status: 'ready', source: 'OpenStreetMap', cacheSeconds: 21600 },
      retailerPrices: { status: 'setup_required', connectedRetailers: 0 },
      shopperData: { status: 'ready', mode: 'device-local' },
    },
  });
  assert.equal(buildHealthPayload(true, checkedAt).checks.retailerPrices.status, 'configured');
  assert.equal(buildHealthPayload(true, checkedAt).checks.retailerPrices.connectedRetailers, 1);
});

test('health route is non-cacheable and exposes no credential values', async () => {
  const originalKey = process.env.BEST_BUY_API_KEY;
  process.env.BEST_BUY_API_KEY = 'test-secret-value';
  try {
    const response = GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const body = await response.json();
    assert.equal(body.status, 'operational');
    assert.equal(body.checks.retailerPrices.status, 'configured');
    assert.doesNotMatch(JSON.stringify(body), /test-secret-value|api.?key|credential/i);
  } finally {
    if (originalKey === undefined) delete process.env.BEST_BUY_API_KEY;
    else process.env.BEST_BUY_API_KEY = originalKey;
  }
});
