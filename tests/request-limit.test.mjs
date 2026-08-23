import test from 'node:test';
import assert from 'node:assert/strict';
import { FixedWindowRequestLimiter, enforceRequestLimit } from '../app/api/request-limit.ts';
import { GET as getOffers } from '../app/api/offers/route.ts';
import { GET as getRetailers } from '../app/api/retailers/route.ts';
import { GET as getStores } from '../app/api/stores/route.ts';

test('allows a bounded number of requests and reports a retry window', () => {
  const limiter = new FixedWindowRequestLimiter();
  const policy = { limit: 2, windowMs: 60_000 };

  assert.deepEqual(limiter.check('offers:one', policy, 1_000), {
    allowed: true,
    limit: 2,
    remaining: 1,
    retryAfterSeconds: 60,
  });
  assert.equal(limiter.check('offers:one', policy, 2_000).allowed, true);
  assert.deepEqual(limiter.check('offers:one', policy, 3_000), {
    allowed: false,
    limit: 2,
    remaining: 0,
    retryAfterSeconds: 58,
  });
});

test('keeps endpoint and client windows independent and resets expired windows', () => {
  const limiter = new FixedWindowRequestLimiter();
  const policy = { limit: 1, windowMs: 1_000 };

  assert.equal(limiter.check('offers:one', policy, 5_000).allowed, true);
  assert.equal(limiter.check('offers:one', policy, 5_100).allowed, false);
  assert.equal(limiter.check('offers:two', policy, 5_100).allowed, true);
  assert.equal(limiter.check('stores:one', policy, 5_100).allowed, true);
  assert.equal(limiter.check('offers:one', policy, 6_000).allowed, true);
});

test('returns a secret-free, non-cacheable 429 response after a route limit', async () => {
  const request = new Request('https://dealradar.test/api/offers?q=television', {
    headers: { 'CF-Connecting-IP': '203.0.113.17' },
  });
  const policy = { bucket: 'test-limit', limit: 1, windowMs: 60_000 };

  assert.equal(enforceRequestLimit(request, policy), null);
  const response = enforceRequestLimit(request, policy);
  assert.ok(response);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-DealRadar-RateLimit-Limit'), '1');
  assert.equal(response.headers.get('X-DealRadar-RateLimit-Remaining'), '0');
  assert.ok(Number(response.headers.get('Retry-After')) >= 1);
  assert.deepEqual(await response.json(), { error: 'Too many requests. Try again shortly.' });
});

test('expensive routes enforce their own request budgets', async () => {
  const makeRequest = (path, address) => new Request(`https://dealradar.test${path}`, {
    headers: { 'CF-Connecting-IP': address },
  });

  let response;
  for (let index = 0; index < 31; index += 1) {
    response = await getOffers(makeRequest('/api/offers?q=a', '203.0.113.31'));
  }
  assert.equal(response.status, 429);

  for (let index = 0; index < 7; index += 1) {
    response = await getRetailers(makeRequest('/api/retailers?probe=1', '203.0.113.32'));
  }
  assert.equal(response.status, 429);

  for (let index = 0; index < 61; index += 1) {
    response = await getStores(makeRequest('/api/stores', '203.0.113.33'));
  }
  assert.equal(response.status, 429);
});
