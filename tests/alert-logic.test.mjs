import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseVerifiedAlertOffer,
  ensurePriceWatchSettings,
  evaluatePriceWatch,
  parsePriceWatchSettings,
  setPriceWatchSetting,
} from '../app/alert-logic.ts';

const product = {
  id: 'bestbuy-1', title: 'Sony OLED TV', retailer: 'Best Buy', price: 999.99,
  regularPrice: 1199.99, availability: 'In stock', productUrl: 'https://example.com/tv',
  modelNumber: 'XR55', savedAt: '2026-08-23T12:00:00.000Z', verifiedAt: '2026-08-23T11:00:00.000Z',
};
const setting = { productId: product.id, targetPrice: 950, backInStock: true, createdAt: '2026-08-23T12:00:00.000Z', lastCheckedAt: null };

test('watch settings parse safely and are created only for watched products', () => {
  assert.deepEqual(parsePriceWatchSettings('{bad'), []);
  const settings = ensurePriceWatchSettings([product], [], '2026-08-23T12:00:00.000Z');
  assert.equal(settings.length, 1);
  assert.equal(settings[0].targetPrice, null);
  assert.deepEqual(ensurePriceWatchSettings([], settings, '2026-08-23T13:00:00.000Z'), []);
});

test('verified alert matching requires the same retailer and exact product evidence', () => {
  const wrongRetailer = { id: product.id, title: product.title, retailer: 'Walmart', price: 899, availability: 'In stock', modelNumber: 'XR55' };
  const modelMatch = { ...wrongRetailer, id: 'bestbuy-2', retailer: 'Best Buy' };
  assert.equal(chooseVerifiedAlertOffer(product, [wrongRetailer, modelMatch]), modelMatch);
  assert.equal(chooseVerifiedAlertOffer(product, [wrongRetailer]), null);
});

test('a watch triggers only after a verified target price or restock is observed', () => {
  const aboveTarget = { id: product.id, title: product.title, retailer: product.retailer, price: 975, availability: 'In stock', modelNumber: 'XR55' };
  const belowTarget = { ...aboveTarget, price: 925 };
  assert.equal(evaluatePriceWatch(product, aboveTarget, setting).status, 'monitoring');
  assert.deepEqual(evaluatePriceWatch(product, belowTarget, setting), { status: 'triggered', savings: 74.99000000000001 });
  assert.equal(evaluatePriceWatch(product, null, setting).status, 'unavailable');
});

test('watch settings update one product without duplicating it', () => {
  const updated = setPriceWatchSetting([setting], { ...setting, targetPrice: 900 });
  assert.equal(updated.length, 1);
  assert.equal(updated[0].targetPrice, 900);
});
