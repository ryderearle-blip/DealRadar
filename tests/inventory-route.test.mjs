import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/inventory/route.ts';

test('inventory route returns normalized official pickup locations without exposing credentials', async () => {
  const originalKey = process.env.BEST_BUY_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.BEST_BUY_API_KEY = 'server-only-test-key';
  globalThis.fetch = async url => {
    assert.match(String(url), /products\/1234567\/stores\.json\?postalCode=28086/);
    return Response.json({ ispuEligible: true, stores: [{ storeID: '11', name: 'Gastonia', address: '3050 E Franklin Blvd', city: 'Gastonia', state: 'NC', postalCode: '28056', distance: 14.8, lowStock: false, minPickupHours: 1 }] });
  };
  try {
    const response = await GET(new Request('https://dealradar.test/api/inventory?sku=1234567&zip=28086', { headers: { 'CF-Connecting-IP': '203.0.113.80' } }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const body = await response.json();
    assert.equal(body.stores[0].storeId, '11');
    assert.equal(body.stores[0].distance, 14.8);
    assert.doesNotMatch(JSON.stringify(body), /server-only-test-key/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.BEST_BUY_API_KEY;
    else process.env.BEST_BUY_API_KEY = originalKey;
  }
});

test('inventory route rejects malformed identifiers before contacting a retailer', async () => {
  const response = await GET(new Request('https://dealradar.test/api/inventory?sku=bad&zip=123', { headers: { 'CF-Connecting-IP': '203.0.113.81' } }));
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('inventory route reports an honest connection requirement when credentials are absent', async () => {
  const originalKey = process.env.BEST_BUY_API_KEY;
  delete process.env.BEST_BUY_API_KEY;
  try {
    const response = await GET(new Request('https://dealradar.test/api/inventory?sku=1234567&zip=28086', { headers: { 'CF-Connecting-IP': '203.0.113.82' } }));
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.state, 'needs_credentials');
    assert.deepEqual(body.stores, []);
  } finally {
    if (originalKey !== undefined) process.env.BEST_BUY_API_KEY = originalKey;
  }
});
