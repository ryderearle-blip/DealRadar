import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('retailer credentials remain server-only by convention and source boundary', async () => {
  const [environmentExample, clientPage, gitignore] = await Promise.all([
    readFile(new URL('../.env.example', import.meta.url), 'utf8'),
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../.gitignore', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(environmentExample, /NEXT_PUBLIC_(BEST_BUY|AMAZON|WALMART|EBAY)/);
  assert.doesNotMatch(clientPage, /process\.env\.(BEST_BUY|AMAZON|WALMART|EBAY)/);
  assert.match(gitignore, /^\.env\*/m);
  assert.match(environmentExample, /^BEST_BUY_API_KEY=/m);
  assert.match(environmentExample, /^EBAY_SANDBOX_CLIENT_SECRET=/m);
  assert.match(environmentExample, /^EBAY_PRODUCTION_CLIENT_SECRET=/m);
});

test('repository source does not contain retailer credential-looking values', async () => {
  const sensitivePatterns = [
    /Ryder[A-Za-z-]+(?:SBX|PRD)-[a-f0-9-]{8,}/,
    /(?:cert|secret|token|api[_-]?key)\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/i,
  ];
  const files = [
    '.env.example',
    'app/api/offers/route.ts',
    'app/ebay-connector.ts',
    'README.md',
    'PARTNER_APPLICATIONS.md',
  ];
  const contents = await Promise.all(files.map(file => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  const combined = contents.join('\n');
  for (const pattern of sensitivePatterns) {
    assert.doesNotMatch(combined, pattern);
  }
});

test('the browser uses the controlled store endpoint before its continuity fallback', async () => {
  const [clientPage, storeRoute] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/stores/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(clientPage, /fetch\(`\/api\/stores\?/);
  assert.match(clientPage, /if \(response\.ok\)/);
  assert.match(storeRoute, /maps\.mail\.ru\/osm\/tools\/overpass\/api\/interpreter/);
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
  for (const className of ['barcode-sheet', 'compare-sheet', 'history-sheet', 'inventory-sheet', 'filter-sheet', 'watch-sheet', 'profile-sheet']) {
    assert.match(clientPage, new RegExp(`<section \\{\\.\\.\\.dialog\\} className="${className}"`));
  }
  assert.match(clientPage, /if \(isDialogDismissKey\(event\.key\)\)/);
  assert.match(clientPage, /previouslyFocused\?\.isConnected/);
});

test('wide map and list views retain real discovery and visible attribution', async () => {
  const clientPage = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(clientPage, /buildStoreDiscoveryWindows\(visibleBounds/);
  assert.match(clientPage, /Promise\.allSettled\(discoveryWindows\.map\(loadWindow\)\)/);
  assert.doesNotMatch(clientPage, /if \(zoom < 9\)/);
  assert.match(clientPage, /© OpenStreetMap contributors/);
  assert.match(clientPage, /https:\/\/www\.openstreetmap\.org\/copyright/);
  assert.match(clientPage, /Tiles by OpenFreeMap/);
  assert.match(clientPage, /new maplibregl\.AttributionControl/);
  assert.match(clientPage, /<MapDataAttribution list\/>/);
});

test('search planning distances come from nearby mapped stores instead of the starter store list', async () => {
  const clientPage = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(clientPage, /useNearbySearchStores\(preferences\.coordinates, localSearchRadius/);
  assert.match(clientPage, /nearestRetailerDistance\(retailer, preferences\.coordinates, mappedSearchStores\)/);
  assert.match(clientPage, /mapped store planning/);
  assert.doesNotMatch(clientPage, /function nearestRetailerDistance\(/);
});

test('search offers a source-backed store path that focuses the exact map location', async () => {
  const clientPage = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(clientPage, /function NearbySearchStoreResults/);
  assert.match(clientPage, /onClick=\{\(\) => onOpen\(store\)\}>Show on map/);
  assert.match(clientPage, />Verify source<\/a>/);
  assert.match(clientPage, /center: initialFocusRef\.current\?\.coordinates \?\? home/);
  assert.match(clientPage, /zoom: initialFocusRef\.current \? 12 : 10\.35/);
});
