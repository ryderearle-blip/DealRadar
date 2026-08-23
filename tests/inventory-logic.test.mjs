import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryDirectionsUrl, inventoryEvidence, normalizeBestBuyInventory, normalizeSku } from '../app/inventory-logic.ts';

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

test('uses only fresh SKU-and-ZIP inventory as local availability evidence', () => {
  const now = Date.parse('2026-08-23T12:00:00.000Z');
  const check = { sku: '1234567', zipCode: '28086', checkedAt: '2026-08-23T11:55:00.000Z', ispuEligible: true, stores: [
    { storeId: '11', name: 'Gastonia', address: '3050 E Franklin Blvd', city: 'Gastonia', state: 'NC', postalCode: '28056', distance: 14.8, lowStock: true, minPickupHours: 1 },
  ] };
  assert.deepEqual(inventoryEvidence(check, '1234567', '28086', now), { state: 'available', distance: 14.8, storeCount: 1, lowStock: true });
  assert.equal(inventoryEvidence({ ...check, stores: [] }, '1234567', '28086', now).state, 'unavailable');
  assert.equal(inventoryEvidence({ ...check, checkedAt: '2026-08-23T11:40:00.000Z' }, '1234567', '28086', now).state, 'unverified');
  assert.equal(inventoryEvidence(check, '1234567', '90210', now).state, 'unverified');
});
