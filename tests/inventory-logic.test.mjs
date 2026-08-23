import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryDirectionsUrl, normalizeBestBuyInventory, normalizeSku } from '../app/inventory-logic.ts';

test('normalizes official store inventory and sorts the nearest valid locations first', () => {
  const normalized = normalizeBestBuyInventory({ ispuEligible: true, stores: [
    { storeID: '22', name: 'Charlotte', address: '100 Far Rd', city: 'Charlotte', state: 'nc', postalCode: '28201', distance: 19.4, lowStock: false, minPickupHours: 2 },
    { storeID: '11', name: 'Gastonia', address: '3050 E Franklin Blvd', city: 'Gastonia', state: 'NC', postalCode: '28056', distance: 14.8, lowStock: true, minPickupHours: null },
    { storeID: '', name: 'Invalid', distance: -1 },
  ] });
  assert.equal(normalized.ispuEligible, true);
  assert.deepEqual(normalized.stores.map(store => store.storeId), ['11', '22']);
  assert.equal(normalized.stores[0].lowStock, true);
  assert.equal(normalized.stores[1].minPickupHours, 2);
});

test('validates retailer SKUs and creates provider-safe driving links', () => {
  assert.equal(normalizeSku(' 1234567 '), '1234567');
  assert.equal(normalizeSku('12A'), null);
  const store = { address: '3050 E Franklin Blvd', city: 'Gastonia', state: 'NC', postalCode: '28056' };
  assert.match(inventoryDirectionsUrl(store, 'apple'), /^https:\/\/maps\.apple\.com\/\?daddr=/);
  assert.match(inventoryDirectionsUrl(store, 'google'), /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1/);
});
