import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('legal routes disclose DealRadar current data practices and limits', async () => {
  const [privacy, terms, affiliate, profile] = await Promise.all([
    read('app/privacy/page.tsx'),
    read('app/terms/page.tsx'),
    read('app/affiliate-disclosure/page.tsx'),
    read('app/page.tsx'),
  ]);

  assert.match(privacy, /precise device location/i);
  assert.match(privacy, /Camera frames are analyzed on your device/i);
  assert.match(privacy, /does not currently sell personal information/i);
  assert.match(privacy, /browser local storage/i);
  assert.match(terms, /retailer—not DealRadar—sets the final price/i);
  assert.match(terms, /planning estimates/i);
  assert.match(affiliate, /not currently earning affiliate commissions/i);
  assert.match(affiliate, /will not turn an unverified offer into a verified one/i);
  assert.match(profile, /href="\/privacy"/);
  assert.match(profile, /href="\/terms"/);
  assert.match(profile, /href="\/affiliate-disclosure"/);
});
