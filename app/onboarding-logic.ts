export const ONBOARDING_VERSION = '1';

export function shouldShowOnboarding(savedVersion: string | null) {
  return savedVersion !== ONBOARDING_VERSION;
}

export function onboardingProgress(step: number) {
  const safeStep = Math.min(2, Math.max(0, Math.trunc(step)));
  return ((safeStep + 1) / 3) * 100;
}
