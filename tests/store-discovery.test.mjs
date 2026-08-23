import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStoreDiscoveryQuery, normalizeStoreBounds, parseStoreLocations, storeBoundsKey } from '../app/store-discovery.ts';

const bounds = { south: 35, west: -81.5, north: 35.5, east: -80.8 };

test('normalizes a detailed map area within U.S. limits', () => {
  const params = new URLSearchParams({ s: '17', w: '-172', n: '20.00004', e: '-169.00004' });
  assert.deepEqual(normalizeStoreBounds(params), { south: 18, west: -171, north: 20, east: -169 });
});

test('rejects malformed, inverted, and overly broad store searches', () => {
  assert.equal(normalizeStoreBounds(new URLSearchParams({ s: 'x', w: '-81', n: '36', e: '-80' })), null);
  assert.equal(normalizeStoreBounds(new URLSearchParams({ s: '36', w: '-81', n: '35', e: '-80' })), null);
  assert.equal(normalizeStoreBounds(new URLSearchParams({ s: '25', w: '-90', n: '40', e: '-70' })), null);
});

test('builds a bounded retailer query and stable cache key', () => {
  const query = buildStoreDiscoveryQuery(bounds);
  assert.match(query, /shop/);
  assert.match(query, /35\.0000,-81\.5000,35\.5000,-80\.8000/);
  assert.match(query, /out center 80/);
  assert.equal(storeBoundsKey(bounds), '35.000:-81.500:35.500:-80.800');
});

test('keeps real named records, cleans text, and removes nearby duplicates', () => {
  const stores = parseStoreLocations([
    { id: 10, type: 'node', lat: 35.2, lon: -81.1, tags: { name: 'Best\u0000 Buy', 'addr:housenumber': '3050', 'addr:street': 'E Franklin Blvd', 'addr:city': 'Gastonia', 'addr:state': 'NC' } },
    { id: 11, type: 'way', center: { lat: 35.2002, lon: -81.1002 }, tags: { brand: 'Best Buy' } },
    { id: 12, type: 'node', lat: 34, lon: -81.1, tags: { name: 'Outside' } },
    { id: 13, type: 'node', lat: 35.3, lon: -81.2, tags: {} },
  ], bounds);

  assert.deepEqual(stores, [{
    id: 'osm-node-10',
    name: 'Best Buy',
    address: '3050 E Franklin Blvd · Gastonia, NC',
    coordinates: [-81.1, 35.2],
    source: 'openstreetmap',
    sourceUrl: 'https://www.openstreetmap.org/node/10',
  }]);
});
