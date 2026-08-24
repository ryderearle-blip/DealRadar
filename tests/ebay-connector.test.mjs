import test from 'node:test';
import assert from 'node:assert/strict';
import { getEbayCredentials } from '../app/ebay-connector.ts';

test('eBay Browse API credentials do not require an unused Dev ID', () => {
  assert.deepEqual(getEbayCredentials({
    EBAY_ENVIRONMENT: 'sandbox',
    EBAY_SANDBOX_CLIENT_ID: 'sandbox-client',
    EBAY_SANDBOX_CLIENT_SECRET: 'sandbox-secret',
    EBAY_MARKETPLACE_ID: 'EBAY_GB',
  }), {
    environment: 'sandbox',
    clientId: 'sandbox-client',
    clientSecret: 'sandbox-secret',
    marketplaceId: 'EBAY_GB',
    campaignId: '',
  });
});

test('eBay credentials still require both the client ID and client secret', () => {
  assert.equal(getEbayCredentials({
    EBAY_ENVIRONMENT: 'sandbox',
    EBAY_SANDBOX_CLIENT_ID: 'sandbox-client',
  }), null);
});
