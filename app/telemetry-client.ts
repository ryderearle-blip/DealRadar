'use client';

import type { TelemetryEvent } from './telemetry-logic';

function send(event: TelemetryEvent) {
  const body = JSON.stringify(event);
  if (typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon('/api/telemetry', new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch('/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

function route() {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

export function trackAnalytics(enabled: boolean, event: TelemetryEvent['event'], properties: TelemetryEvent['properties'] = {}) {
  if (!enabled || typeof window === 'undefined') return;
  send({ kind: 'analytics', event, route: route(), properties });
}

export function installClientErrorMonitoring() {
  if (typeof window === 'undefined') return () => undefined;
  const onError = () => send({ kind: 'error', event: 'client_error', route: route(), properties: { source: 'window' } });
  const onRejection = () => send({ kind: 'error', event: 'unhandled_rejection', route: route(), properties: { source: 'promise' } });
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
