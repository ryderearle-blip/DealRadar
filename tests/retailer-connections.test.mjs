import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRetailerProbe, buildRetailerStatuses } from '../app/retailer-connections.ts';

test('retailer status distinguishes connectors, partner access, and mapped locations', () => {
  const statuses = buildRetailerStatuses(false);
  assert.deepEqual(statuses.map(item => [item.retailer, item.state]), [
    ['Best Buy', 'needs_credentials'],
    ['Amazon', 'partner_access'],
    ['Walmart', 'partner_access'],
    ['Target', 'unavailable'],
    ['Apple', 'unavailable'],
    ['Micro Center', 'unavailable'],
  ]);
  assert.equal(statuses.find(item => item.retailer === 'Target').capability, 'locations-only');
});

test('a configured connector becomes live only after a successful probe', () => {
  const configured = buildRetailerStatuses(true);
  assert.equal(configured[0].health, 'configured');
  const verified = applyRetailerProbe(configured, 'Best Buy', true, '2026-08-23T12:00:00.000Z');
  assert.equal(verified[0].health, 'verified');
  assert.equal(verified[0].checkedAt, '2026-08-23T12:00:00.000Z');
  const failed = applyRetailerProbe(configured, 'Best Buy', false, '2026-08-23T12:00:00.000Z');
  assert.equal(failed[0].health, 'failed');
  assert.equal(failed[0].state, 'needs_credentials');
});
