import test from 'node:test';
import assert from 'node:assert/strict';
import { appleMapsDirectionsUrl, filterMappedStores, googleMapsDirectionsUrl, milesBetween, retailerMatchesStore, storeDistanceLabel } from '../app/map-logic.ts';

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

test('calculates an honest home-to-store distance label', () => {
  assert.ok(Math.abs(milesBetween([0, 0], [0, 1]) - 69.1) < 0.1);
  assert.equal(storeDistanceLabel([0, 0], [0, 1]), '~69.1 mi from home');
});

test('builds Apple and Google driving directions from the saved home area', () => {
  const home = [-81.3, 35.2];
  const store = [-81.1, 35.3];
  assert.equal(appleMapsDirectionsUrl(home, store), 'https://maps.apple.com/?saddr=35.2,-81.3&daddr=35.3,-81.1&dirflg=d');
  assert.equal(googleMapsDirectionsUrl(home, store), 'https://www.google.com/maps/dir/?api=1&origin=35.2,-81.3&destination=35.3,-81.1&travelmode=driving');
});
