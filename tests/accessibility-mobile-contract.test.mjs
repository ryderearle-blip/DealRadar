import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const layout = await readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const responsive = await readFile(new URL('../app/responsive.css', import.meta.url), 'utf8');
const globals = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
const accessibility = await readFile(new URL('../app/accessibility.css', import.meta.url), 'utf8');
const mapStyles = await readFile(new URL('../app/map.css', import.meta.url), 'utf8');

test('onboarding prevents background keyboard interaction', () => {
  assert.match(page, /header inert=\{onboardingOpen\} aria-hidden=\{onboardingOpen\}/);
  assert.match(page, /className="content" inert=\{onboardingOpen\} aria-hidden=\{onboardingOpen\}/);
  assert.match(page, /nav inert=\{onboardingOpen\} aria-hidden=\{onboardingOpen\}/);
});

test('mobile shell retains safe areas and device viewport metadata', () => {
  assert.match(layout, /width: 'device-width'/);
  assert.match(layout, /viewportFit: 'cover'/);
  assert.match(`${responsive}\n${globals}`, /safe-area-inset-bottom/);
  assert.match(`${responsive}\n${globals}`, /100dvh/);
});

test('keyboard, reduced motion, and small map controls have explicit safeguards', () => {
  assert.match(accessibility, /:focus-visible/);
  assert.match(accessibility, /prefers-reduced-motion/);
  assert.match(mapStyles, /map-data-attribution a \{ min-height: 24px/);
  assert.match(mapStyles, /sheet-head > button \{ width: 44px; height: 44px; \}/);
});

test('saved tab keeps its dedicated search field', () => {
  assert.match(page, /placeholder=\{`Search saved \$\{section\}`\}/);
});
