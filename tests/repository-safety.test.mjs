import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('retailer credentials remain server-only by convention and source boundary', async () => {
  const [environmentExample, clientPage, gitignore] = await Promise.all([
    readFile(new URL('../.env.example', import.meta.url), 'utf8'),
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../.gitignore', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(environmentExample, /NEXT_PUBLIC_(BEST_BUY|AMAZON|WALMART)/);
  assert.doesNotMatch(clientPage, /process\.env\.(BEST_BUY|AMAZON|WALMART)/);
  assert.match(gitignore, /^\.env\*/m);
  assert.match(environmentExample, /^BEST_BUY_API_KEY=/m);
});

test('the browser uses the controlled store endpoint before its continuity fallback', async () => {
  const [clientPage, storeRoute] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/stores/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(clientPage, /fetch\(`\/api\/stores\?/);
  assert.match(clientPage, /if \(response\.ok\)/);
  assert.match(storeRoute, /overpass\.private\.coffee\/api\/interpreter/);
  assert.match(storeRoute, /overpass-api\.de\/api\/interpreter/);
});
