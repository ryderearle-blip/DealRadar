import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterSavedProducts,
  filterSavedStores,
  parseSavedProducts,
  parseSavedStores,
  toggleSavedProduct,
  toggleSavedStore,
} from '../app/saved-logic.ts';

const product = {
  id: 'bestbuy-1', title: 'Sony OLED TV', retailer: 'Best Buy', price: 999.99,
  regularPrice: 1199.99, availability: 'In stock', productUrl: 'https://example.com/tv',
  modelNumber: 'XR55', savedAt: '2026-08-23T12:00:00.000Z', verifiedAt: '2026-08-23T11:00:00.000Z',
};
const store = {
  id: 'best-buy-gastonia', store: 'Best Buy', address: '3050 E Franklin Blvd',
  distance: '14.8 mi', detail: 'Official API ready', color: '#f4ce12', mark: 'BEST',
  coordinates: [-81.122254, 35.260018], savedAt: '2026-08-23T12:00:00.000Z',
};

test('saved products parse safely and toggle without duplicates', () => {
  assert.deepEqual(parseSavedProducts('not-json'), []);
  const added = toggleSavedProduct([], product);
  assert.deepEqual(added, [product]);
  assert.deepEqual(toggleSavedProduct(added, product), []);
});

test('saved products search retailer and sort by verified price', () => {
  const other = { ...product, id: 'walmart-1', title: 'Nintendo Switch', retailer: 'Walmart', price: 299.99 };
  assert.deepEqual(filterSavedProducts([product, other], 'best buy', 'recent').map(item => item.id), ['bestbuy-1']);
  assert.deepEqual(filterSavedProducts([product, other], '', 'price-low').map(item => item.id), ['walmart-1', 'bestbuy-1']);
});

test('saved stores migrate known legacy ids and support search', () => {
  assert.deepEqual(parseSavedStores('["best-buy-gastonia"]', [store]), [store]);
  assert.deepEqual(filterSavedStores([store], 'franklin', 'recent'), [store]);
  assert.deepEqual(toggleSavedStore([store], store), []);
});
