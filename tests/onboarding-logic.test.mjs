import test from 'node:test';
import assert from 'node:assert/strict';
import { ONBOARDING_VERSION, onboardingProgress, shouldShowOnboarding } from '../app/onboarding-logic.ts';

test('onboarding appears once per saved experience version', () => {
  assert.equal(shouldShowOnboarding(null), true);
  assert.equal(shouldShowOnboarding('0'), true);
  assert.equal(shouldShowOnboarding(ONBOARDING_VERSION), false);
});

test('onboarding progress is clamped to three steps', () => {
  assert.ok(Math.abs(onboardingProgress(-1) - (100 / 3)) < 0.000001);
  assert.ok(Math.abs(onboardingProgress(1) - (200 / 3)) < 0.000001);
  assert.equal(onboardingProgress(99), 100);
});
