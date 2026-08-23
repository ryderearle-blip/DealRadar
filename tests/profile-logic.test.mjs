import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultProfilePreferences,
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
    coordinates: [-81.38, 35.25], searchRadius: 50, fulfillment: 'pickup',
    priceDropNotifications: false, backInStockNotifications: true,
  }));
  assert.equal(parsed.name, 'Ryder Earle');
  assert.equal(parsed.searchRadius, 50);
  assert.equal(parsed.fulfillment, 'pickup');
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
  assert.deepEqual(location, { zipCode: '28086', locationLabel: 'Kings Mountain, NC', coordinates: [-81.3806, 35.2516] });
  await assert.rejects(() => lookupUsZip('123', async () => ({ ok: false })), /valid U.S. ZIP/);
});
