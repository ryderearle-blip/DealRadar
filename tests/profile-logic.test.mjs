import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultProfilePreferences,
  deviceShoppingLocation,
  fulfillmentLabel,
  lookupUsZip,
  normalizeUsZip,
  parseProfilePreferences,
  profileInitials,
} from '../app/profile-logic.ts';

test('profile settings fall back safely and retain valid preferences', () => {
  assert.deepEqual(parseProfilePreferences('bad json'), defaultProfilePreferences);
  const parsed = parseProfilePreferences(JSON.stringify({
    name: 'Ryder Earle', zipCode: '28086', locationLabel: 'Kings Mountain, NC',
    coordinates: [-81.38, 35.25], locationPrecision: 'device', searchRadius: 50, fulfillment: 'pickup',
    salesTaxPercent: 7.25, travelCostPerMile: 0.64,
    priceDropNotifications: false, backInStockNotifications: true,
  }));
  assert.equal(parsed.name, 'Ryder Earle');
  assert.equal(parsed.searchRadius, 50);
  assert.equal(parsed.fulfillment, 'pickup');
  assert.equal(parsed.locationPrecision, 'device');
  assert.equal(parsed.salesTaxPercent, 7.25);
  assert.equal(parsed.travelCostPerMile, 0.64);
  const bounded = parseProfilePreferences(JSON.stringify({ salesTaxPercent: 20, travelCostPerMile: -1 }));
  assert.equal(bounded.salesTaxPercent, defaultProfilePreferences.salesTaxPercent);
  assert.equal(bounded.travelCostPerMile, defaultProfilePreferences.travelCostPerMile);
  assert.equal(parseProfilePreferences(JSON.stringify({ coordinates: [2.35, 48.86], locationPrecision: 'device' })).locationPrecision, 'zip');
});

test('US ZIP input and profile initials are normalized', () => {
  assert.equal(normalizeUsZip('28086-1234'), '28086');
  assert.equal(normalizeUsZip('2808'), null);
  assert.equal(profileInitials('Ryder Earle'), 'RE');
  assert.equal(profileInitials(''), 'DR');
});

test('fulfillment preferences use shopper-friendly labels', () => {
  assert.equal(fulfillmentLabel('both'), 'Pickup & shipping');
  assert.equal(fulfillmentLabel('pickup'), 'Pickup first');
  assert.equal(fulfillmentLabel('shipping'), 'Shipping first');
});

test('ZIP lookup accepts only resolved U.S. postal data', async () => {
  const location = await lookupUsZip('28086', async () => ({
    ok: true,
    json: async () => ({ places: [{ 'place name': 'Kings Mountain', 'state abbreviation': 'NC', longitude: '-81.3806', latitude: '35.2516' }] }),
  }));
  assert.deepEqual(location, { zipCode: '28086', locationLabel: 'Kings Mountain, NC', coordinates: [-81.3806, 35.2516], locationPrecision: 'zip' });
  await assert.rejects(() => lookupUsZip('123', async () => ({ ok: false })), /valid U.S. ZIP/);
});

test('device coordinates retain the inventory ZIP and reject locations outside the U.S.', () => {
  assert.deepEqual(deviceShoppingLocation(-81.37, 35.24, { zipCode: '28086', locationLabel: 'Kings Mountain, NC' }), {
    zipCode: '28086', locationLabel: 'Kings Mountain, NC', coordinates: [-81.37, 35.24], locationPrecision: 'device',
  });
  assert.throws(() => deviceShoppingLocation(2.35, 48.86, { zipCode: '28086', locationLabel: 'Kings Mountain, NC' }), /United States/);
});
