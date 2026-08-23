import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSortOffers } from '../app/search-logic.ts';

const offers = [
  { id: 'bestbuy', retailer: 'Best Buy', price: 799, availability: 'Available in stores', fulfillment: ['Store pickup', 'Shipping'] },
  { id: 'amazon', retailer: 'Amazon', price: 749, availability: 'Available online', fulfillment: ['Shipping'] },
  { id: 'walmart', retailer: 'Walmart', price: 699, availability: 'Availability not confirmed', fulfillment: ['Store pickup'] },
];

const distanceFor = retailer => ({ 'Best Buy': 14.8, Amazon: null, Walmart: 2.4 })[retailer] ?? null;
const defaults = { sort: 'best', maxPrice: null, maxDistance: null, availability: 'all', fulfillment: 'all', retailers: [] };

test('filters verified offers by price, distance, availability, fulfillment, and retailer', () => {
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, maxPrice: 750 }, distanceFor).map(item => item.id), ['amazon', 'walmart']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, maxDistance: 5 }, distanceFor).map(item => item.id), ['walmart']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, availability: 'available' }, distanceFor).map(item => item.id), ['bestbuy', 'amazon']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, fulfillment: 'shipping' }, distanceFor).map(item => item.id), ['bestbuy', 'amazon']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, retailers: ['Best Buy'] }, distanceFor).map(item => item.id), ['bestbuy']);
});

test('sorts verified offers by price and nearest physical store', () => {
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, sort: 'price-low' }, distanceFor).map(item => item.id), ['walmart', 'amazon', 'bestbuy']);
  assert.deepEqual(filterAndSortOffers(offers, { ...defaults, sort: 'distance' }, distanceFor).map(item => item.id), ['walmart', 'bestbuy', 'amazon']);
});
