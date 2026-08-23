import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/stores/route.ts';

test('store endpoint rejects unsafe map areas without contacting an upstream service', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('unexpected request');
  };
  try {
    const response = await GET(new Request('https://dealradar.test/api/stores?s=20&w=-160&n=50&e=-70'));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(called, false);
    assert.deepEqual(await response.json(), { stores: [], error: 'Use a valid U.S. map area and zoom in to search for stores.' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('store endpoint fails over, caches a normalized area, and exposes no upstream internals', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) return new Response('busy', { status: 503 });
    return Response.json({ elements: [{ id: 77, type: 'node', lat: 35.2, lon: -81.1, tags: { name: 'Best Buy', shop: 'electronics' } }] });
  };
  try {
    const request = new Request('https://dealradar.test/api/stores?s=35.1&w=-81.2&n=35.3&e=-81');
    const response = await GET(request);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('X-DealRadar-Cache'), 'MISS');
    assert.match(response.headers.get('Cache-Control') ?? '', /s-maxage=21600/);
    const payload = await response.json();
    assert.equal(payload.source, 'OpenStreetMap');
    assert.deepEqual(payload.stores, [{
      id: 'osm-node-77',
      name: 'Best Buy',
      category: 'electronics',
      address: 'Mapped business location',
      coordinates: [-81.1, 35.2],
      source: 'openstreetmap',
      sourceUrl: 'https://www.openstreetmap.org/node/77',
    }]);
    assert.equal(Object.hasOwn(payload, 'endpoint'), false);
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /maps\.mail\.ru/);
    assert.match(calls[1].url, /overpass\.private\.coffee/);
    assert.match(String(calls[0].options.headers['User-Agent']), /DealRadar/);

    const cachedResponse = await GET(request);
    assert.equal(cachedResponse.headers.get('X-DealRadar-Cache'), 'HIT');
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('store endpoint returns a retryable, non-cacheable outage response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('busy', { status: 503 });
  try {
    const response = await GET(new Request('https://dealradar.test/api/stores?s=36&w=-82&n=36.2&e=-81.8'));
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Retry-After'), '30');
    assert.deepEqual(await response.json(), { stores: [], error: 'Store discovery is temporarily unavailable.' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
