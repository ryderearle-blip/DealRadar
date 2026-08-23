import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMappedStores, retailerMatchesStore } from '../app/map-logic.ts';

const stores = [
  { store: 'Best Buy Hickory', miles: 14 },
  { store: 'Walmart Shelby', miles: 3 },
  { store: 'Target', miles: 18 },
];

test('matches retailer feeds to branded store locations', () => {
  assert.equal(retailerMatchesStore('Best Buy', 'Best Buy Hickory'), true);
  assert.equal(retailerMatchesStore('Walmart', 'Walmart Shelby'), true);
  assert.equal(retailerMatchesStore('Amazon', 'Best Buy Hickory'), false);
});

test('filters mapped stores by connected price feed and real distance', () => {
  const distanceFor = store => store.miles;
  assert.deepEqual(filterMappedStores(stores, { verifiedOnly: true, withinMiles: null }, ['Best Buy'], distanceFor).map(store => store.store), ['Best Buy Hickory']);
  assert.deepEqual(filterMappedStores(stores, { verifiedOnly: false, withinMiles: 10 }, ['Best Buy'], distanceFor).map(store => store.store), ['Walmart Shelby']);
  assert.deepEqual(filterMappedStores(stores, { verifiedOnly: true, withinMiles: 20 }, ['Target'], distanceFor).map(store => store.store), ['Target']);
});
