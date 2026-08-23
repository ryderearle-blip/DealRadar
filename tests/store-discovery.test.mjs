import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStoreDiscoveryQuery, buildStoreDiscoveryWindows, normalizeStoreBounds, parseStoreLocations, sampleStoreLocations, storeBoundsKey } from '../app/store-discovery.ts';

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

test('uses one detailed window nearby and bounded representative windows nationwide', () => {
  assert.deepEqual(buildStoreDiscoveryWindows(bounds), [bounds]);
  const nationwide = buildStoreDiscoveryWindows({ south: 18, west: -171, north: 72, east: -66 }, 6);
  assert.equal(nationwide.length, 6);
  assert.equal(new Set(nationwide.map(storeBoundsKey)).size, 6);
  assert.equal(nationwide.every(window => window.south >= 18 && window.north <= 72 && window.west >= -171 && window.east <= -66), true);
  assert.equal(nationwide.every(window => window.north - window.south <= 5 && window.east - window.west <= 8), true);
  const regional = buildStoreDiscoveryWindows({ south: 30, west: -100, north: 42, east: -80 }, 4);
  assert.equal(regional.length, 4);
  assert.equal(new Set(regional.map(window => (window.south + window.north) / 2)).size, 2);
  assert.equal(new Set(regional.map(window => (window.west + window.east) / 2)).size, 2);
});

test('samples a wide view with retailer variety before repeated brands', () => {
  const stores = [
    ['best-one', 'Best Buy Charlotte'],
    ['best-two', 'Best Buy Seattle'],
    ['target-one', 'Target Austin'],
    ['walmart-one', 'Walmart Denver'],
  ].map(([id, name], index) => ({ id, name, address: 'Mapped business location', coordinates: [-100 + index, 35], source: 'openstreetmap', sourceUrl: `https://www.openstreetmap.org/node/${index + 1}` }));
  const sampled = sampleStoreLocations(stores, 3);
  assert.equal(sampled.length, 3);
  assert.deepEqual(new Set(sampled.map(store => store.name.split(' ')[0])), new Set(['Best', 'Target', 'Walmart']));
});
