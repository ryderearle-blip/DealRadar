import test from 'node:test';
import assert from 'node:assert/strict';
import { appleMapsDirectionsUrl, filterMappedStores, googleMapsDirectionsUrl, milesBetween, nearestRetailerDistance, retailerMatchesStore, sortMappedStoresByDistance, storeDistanceLabel } from '../app/map-logic.ts';

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

test('finds the nearest matching retailer only from supplied real stores', () => {
  const mapped = [
    { store: 'Best Buy West', coordinates: [-81.2, 35.2] },
    { store: 'Best Buy East', coordinates: [-81.1, 35.2] },
    { store: 'Target', coordinates: [-81.01, 35.2] },
  ];
  const distance = nearestRetailerDistance('Best Buy', [-81.3, 35.2], mapped);
  assert.ok(distance > 5 && distance < 6);
  assert.equal(nearestRetailerDistance('Amazon', [-81.3, 35.2], mapped), null);
  assert.equal(nearestRetailerDistance('Best Buy', [-81.3, 35.2], []), null);
});

test('orders mapped stores by real distance without mutating the source list', () => {
  const source = [
    { store: 'Far', coordinates: [-80.9, 35.2] },
    { store: 'Unknown' },
    { store: 'Near', coordinates: [-81.29, 35.2] },
  ];
  assert.deepEqual(sortMappedStoresByDistance(source, [-81.3, 35.2]).map(store => store.store), ['Near', 'Far', 'Unknown']);
  assert.equal(source[0].store, 'Far');
});

test('builds Apple and Google driving directions from the saved home area', () => {
  const home = [-81.3, 35.2];
  const store = [-81.1, 35.3];
  assert.equal(appleMapsDirectionsUrl(home, store), 'https://maps.apple.com/?saddr=35.2,-81.3&daddr=35.3,-81.1&dirflg=d');
  assert.equal(googleMapsDirectionsUrl(home, store), 'https://www.google.com/maps/dir/?api=1&origin=35.2,-81.3&destination=35.3,-81.1&travelmode=driving');
});
