import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBestBuyProductFilter, classifyProductMatch } from '../app/retailer-logic.ts';

test('builds an exact UPC query for a scanned barcode', () => {
  assert.equal(buildBestBuyProductFilter('012345678905'), 'upc=012345678905');
  assert.equal(buildBestBuyProductFilter('Sony 55 inch TV'), 'search=Sony&search=55&search=inch&search=TV');
});

test('labels UPC and model-number matches exactly and weaker results honestly', () => {
  assert.deepEqual(classifyProductMatch('012345678905', { upc: '012345678905', name: 'Television' }), { matchType: 'exact', matchReason: 'Exact UPC match' });
  assert.equal(classifyProductMatch('K-55XR50', { modelNumber: 'K-55XR50', name: 'Sony TV' }).matchType, 'exact');
  assert.equal(classifyProductMatch('Sony television', { manufacturer: 'Sony', name: 'Sony BRAVIA television' }).matchType, 'similar');
  assert.equal(classifyProductMatch('Nintendo Switch', { manufacturer: 'Sony', name: 'Television' }).matchType, 'possible');
});
