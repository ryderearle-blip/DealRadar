import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPredictiveSuggestions, calculateEstimatedTotalCost, filterAndSortOffers, formatVerificationFreshness, normalizeBarcode, recommendationEvidenceIsTrustworthy, recommendBestOffer, toggleComparison, updatePriceHistory } from '../app/search-logic.ts';

const offers = [
  { id: 'bestbuy', retailer: 'Best Buy', price: 799, availability: 'Available in stores', fulfillment: ['Store pickup', 'Shipping'] },
  { id: 'amazon', retailer: 'Amazon', price: 749, availability: 'Available online', fulfillment: ['Shipping'] },
  { id: 'walmart', retailer: 'Walmart', price: 699, availability: 'Availability not confirmed', fulfillment: ['Store pickup'] },
];

const distanceFor = retailer => ({ 'Best Buy': 14.8, Amazon: null, Walmart: 2.4 })[retailer] ?? null;
const defaults = { sort: 'best', scope: 'both', maxPrice: null, maxDistance: null, availability: 'all', fulfillment: 'all', retailers: [] };

test('filters verified offers by price, distance, availability, fulfillment, and retailer', () => {
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, maxPrice: 750 }, distanceFor).map(item => item.id), ['amazon', 'walmart']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, maxDistance: 5 }, distanceFor).map(item => item.id), ['bestbuy', 'amazon', 'walmart']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, scope: 'local', maxDistance: 5 }, distanceFor).map(item => item.id), ['walmart']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, availability: 'available' }, distanceFor).map(item => item.id), ['bestbuy', 'amazon']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, fulfillment: 'shipping' }, distanceFor).map(item => item.id), ['bestbuy', 'amazon']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, retailers: ['Best Buy'] }, distanceFor).map(item => item.id), ['bestbuy']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, scope: 'local' }, distanceFor).map(item => item.id), ['bestbuy', 'walmart']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, scope: 'online' }, distanceFor).map(item => item.id), ['bestbuy', 'amazon']);
});

test('sorts verified offers by price and nearest physical store', () => {
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, sort: 'price-low' }, distanceFor).map(item => item.id), ['walmart', 'amazon', 'bestbuy']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, sort: 'distance' }, distanceFor).map(item => item.id), ['walmart', 'bestbuy', 'amazon']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, sort: 'total-cost' }, distanceFor, item => ({ bestbuy: 860, amazon: 810, walmart: 830 })[item.id]).map(item => item.id), ['amazon', 'walmart', 'bestbuy']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, sort: 'total-cost' }, distanceFor, item => item.id === 'amazon' ? { total: 700, complete: false } : { total: item.price + 50, complete: true }).map(item => item.id), ['walmart', 'bestbuy', 'amazon']);
  const inventoryDistance = (retailer, item) => item?.id === 'bestbuy' ? 1.2 : distanceFor(retailer);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, sort: 'distance' }, inventoryDistance).map(item => item.id), ['bestbuy', 'walmart', 'amazon']);
  const unavailablePickup = (retailer, item) => item?.id === 'bestbuy' ? null : distanceFor(retailer);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, scope: 'local' }, unavailablePickup).map(item => item.id), ['walmart']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, fulfillment: 'pickup' }, unavailablePickup).map(item => item.id), ['walmart']);
});

test('labels price verification age and flags saved observations after 24 hours', () => {
  const now = Date.parse('2026-08-23T12:00:00.000Z');
  assert.deepEqual(formatVerificationFreshness('2026-08-23T11:48:00.000Z', now), { label: 'Verified 12 min ago', stale: false, ageMs: 720_000 });
  assert.equal(formatVerificationFreshness('2026-08-22T11:59:00.000Z', now).stale, true);
  assert.deepEqual(formatVerificationFreshness('not-a-date', now), { label: 'Verification time unavailable', stale: true, ageMs: null });
});

test('calculates total cost from item price, tax, verified shipping, and round-trip travel', () => {
  const local = calculateEstimatedTotalCost({ price: 799, shippingCost: 0, fulfillment: ['Store pickup'] }, 'local', 14.8, 0.0675, 0.70);
  assert.equal(local.method, 'Local pickup');
  assert.equal(local.complete, true);
  assert.ok(Math.abs(local.tax - 53.9325) < 0.0001);
  assert.ok(Math.abs(local.travel - 20.72) < 0.0001);
  assert.ok(Math.abs(local.total - 873.6525) < 0.0001);

  const online = calculateEstimatedTotalCost({ price: 749, shippingCost: 10, fulfillment: ['Shipping'] }, 'online', null, 0.0675, 0.70);
  assert.equal(online.method, 'Online');
  assert.equal(online.shipping, 10);
  assert.equal(online.complete, true);
  assert.ok(Math.abs(online.total - 809.5575) < 0.0001);
});

test('recommends only complete eligible totals for exact product matches', () => {
  const candidates = [
    { id: 'exact-complete', matchType: 'exact' },
    { id: 'exact-incomplete', matchType: 'exact' },
    { id: 'similar-cheaper', matchType: 'similar' },
    { id: 'exact-runner', matchType: 'exact' },
  ];
  const costs = {
    'exact-complete': { total: 810, complete: true },
    'exact-incomplete': { total: 700, complete: false },
    'similar-cheaper': { total: 750, complete: true },
    'exact-runner': { total: 835, complete: true },
  };
  const recommendation = recommendBestOffer(candidates, item => ({ ...costs[item.id], item: 0, tax: 0, shipping: 0, travel: 0, method: 'Online' }));
  assert.equal(recommendation.item.id, 'exact-complete');
  assert.equal(recommendation.matchType, 'exact');
  assert.equal(recommendation.comparedCount, 2);
  assert.equal(recommendation.savings, 25);
});

test('withholds a recommendation when every complete option fails trust eligibility', () => {
  const candidates = [{ id: 'stale', matchType: 'exact' }, { id: 'missing-shipping', matchType: 'exact' }];
  const recommendation = recommendBestOffer(
    candidates,
    item => ({ item: 0, tax: 0, shipping: item.id === 'stale' ? 0 : null, travel: 0, total: 700, complete: item.id === 'stale', method: 'Online' }),
    item => item.id !== 'stale',
  );
  assert.equal(recommendation, null);
  assert.equal(recommendBestOffer([{ id: 'similar', matchType: 'similar' }], () => ({ item: 0, tax: 0, shipping: 0, travel: 0, total: 650, complete: true, method: 'Online' })), null);
});

test('trusts fresh online totals but requires confirmed inventory for a local pick', () => {
  const now = Date.parse('2026-08-23T12:00:00.000Z');
  assert.equal(recommendationEvidenceIsTrustworthy('2026-08-23T11:30:00.000Z', 'Online', false, now), true);
  assert.equal(recommendationEvidenceIsTrustworthy('2026-08-23T11:30:00.000Z', 'Local pickup', false, now), false);
  assert.equal(recommendationEvidenceIsTrustworthy('2026-08-23T11:30:00.000Z', 'Local pickup', true, now), true);
  assert.equal(recommendationEvidenceIsTrustworthy('2026-08-22T11:30:00.000Z', 'Online', true, now), false);
});

test('builds deduplicated predictive suggestions from recent, live, and catalog terms', () => {
  const suggestions = buildPredictiveSuggestions('sony', ['Sony 55-inch TV'], [{ title: 'Sony BRAVIA 5', meta: 'Model K-55XR50', value: 'Sony BRAVIA 5' }], [{ title: 'Sony 55-inch TV', meta: 'Product type', value: 'Sony 55-inch TV' }]);
  assert.deepEqual(suggestions.map(item => item.value), ['Sony 55-inch TV', 'Sony BRAVIA 5']);
});

test('validates scanned UPC/EAN codes and retains genuine observed history only', () => {
  assert.equal(normalizeBarcode('01234 5678905'), '012345678905');
  assert.equal(normalizeBarcode('1234'), null);
  const sameDay = updatePriceHistory([{ price: 799, recordedAt: '2026-08-21T10:00:00Z' }], 749, '2026-08-21T18:00:00Z');
  assert.deepEqual(sameDay, [{ price: 749, recordedAt: '2026-08-21T18:00:00Z' }]);
  const nextDay = updatePriceHistory(sameDay, 729, '2026-08-22T10:00:00Z');
  assert.equal(nextDay.length, 2);
  assert.equal(nextDay[1].price, 729);
  assert.deepEqual(toggleComparison([], 'one'), ['one']);
  assert.deepEqual(toggleComparison(['one'], 'one'), []);
  assert.deepEqual(toggleComparison(['one', 'two', 'three'], 'four'), ['one', 'two', 'three']);
});
