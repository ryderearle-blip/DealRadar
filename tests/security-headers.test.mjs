import test from 'node:test';
import assert from 'node:assert/strict';
import { applySecurityHeaders, buildContentSecurityPolicy, securityHeaders } from '../app/security-headers.ts';

test('production policy denies framing and permits only required map services', () => {
  const policy = buildContentSecurityPolicy(false);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /script-src 'self' 'unsafe-inline' https:\/\/unpkg\.com/);
  assert.match(policy, /worker-src 'self' blob:/);
  assert.match(policy, /https:\/\/api\.zippopotam\.us/);
  assert.match(policy, /https:\/\/overpass-api\.de/);
  assert.match(policy, /https:\/\/tiles\.openfreemap\.org/);
  assert.match(policy, /upgrade-insecure-requests/);
  assert.doesNotMatch(policy, /unsafe-eval/);
  const developmentPolicy = buildContentSecurityPolicy(true);
  assert.match(developmentPolicy, /unsafe-eval/);
  assert.doesNotMatch(developmentPolicy, /upgrade-insecure-requests/);
});

test('security headers retain barcode camera access while disabling unrelated sensors', () => {
  const expected = securityHeaders(false);
  const headers = applySecurityHeaders(new Headers(), false);
  assert.equal(headers.get('Content-Security-Policy'), expected['Content-Security-Policy']);
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.get('Permissions-Policy'), 'camera=(self), geolocation=(), microphone=(), payment=()');
});
