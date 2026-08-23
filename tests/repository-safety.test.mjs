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

test('the application proxy applies the centralized browser security policy', async () => {
  const proxySource = await readFile(new URL('../proxy.ts', import.meta.url), 'utf8');
  assert.match(proxySource, /applySecurityHeaders\(response\.headers/);
  assert.match(proxySource, /NextResponse\.next\(\)/);
});

test('every interactive product sheet uses the shared accessible dialog behavior', async () => {
  const clientPage = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  for (const className of ['barcode-sheet', 'compare-sheet', 'history-sheet', 'filter-sheet', 'watch-sheet', 'profile-sheet']) {
    assert.match(clientPage, new RegExp(`<section \\{\\.\\.\\.dialog\\} className="${className}"`));
  }
  assert.match(clientPage, /if \(isDialogDismissKey\(event\.key\)\)/);
  assert.match(clientPage, /previouslyFocused\?\.isConnected/);
});
