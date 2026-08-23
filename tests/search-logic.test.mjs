import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPredictiveSuggestions, calculateEstimatedTotalCost, filterAndSortOffers, normalizeBarcode, toggleComparison, updatePriceHistory } from '../app/search-logic.ts';

const offers = [
  { id: 'bestbuy', retailer: 'Best Buy', price: 799, availability: 'Available in stores', fulfillment: ['Store pickup', 'Shipping'] },
  { id: 'amazon', retailer: 'Amazon', price: 749, availability: 'Available online', fulfillment: ['Shipping'] },
  { id: 'walmart', retailer: 'Walmart', price: 699, availability: 'Availability not confirmed', fulfillment: ['Store pickup'] },
];

const distanceFor = retailer => ({ 'Best Buy': 14.8, Amazon: null, Walmart: 2.4 })[retailer] ?? null;
const defaults = { sort: 'best', scope: 'both', maxPrice: null, maxDistance: null, availability: 'all', fulfillment: 'all', retailers: [] };

test('filters verified offers by price, distance, availability, fulfillment, and retailer', () => {
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, maxPrice: 750 }, distanceFor).map(item => item.id), ['amazon', 'walmart']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, maxDistance: 5 }, distanceFor).map(item => item.id), ['walmart']);
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
