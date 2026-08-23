export const analyticsEvents = new Set([
  'app_loaded',
  'tab_opened',
  'search_submitted',
  'map_view_changed',
  'saved_item_changed',
  'alert_check_started',
]);

export const errorEvents = new Set([
  'client_error',
  'unhandled_rejection',
]);

export type TelemetryKind = 'analytics' | 'error';

export type TelemetryEvent = {
  kind: TelemetryKind;
  event: string;
  route: string;
  properties: Record<string, string | number | boolean>;
};

const allowedPropertyKeys = new Set([
  'tab',
  'scope',
  'source',
  'resultState',
  'count',
  'enabled',
]);

function cleanRoute(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/';
  return value.split('?')[0].slice(0, 100);
}

function cleanProperties(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (!allowedPropertyKeys.has(key)) continue;
    if (typeof item === 'boolean') cleaned[key] = item;
    if (typeof item === 'number' && Number.isFinite(item)) cleaned[key] = Math.max(-10_000, Math.min(10_000, item));
    if (typeof item === 'string') cleaned[key] = item.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 40);
  }
  return cleaned;
}

export function normalizeTelemetryEvent(value: unknown): TelemetryEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (input.kind !== 'analytics' && input.kind !== 'error') return null;
  if (typeof input.event !== 'string') return null;
  const allowed = input.kind === 'analytics' ? analyticsEvents : errorEvents;
  if (!allowed.has(input.event)) return null;
  return {
    kind: input.kind,
    event: input.event,
    route: cleanRoute(input.route),
    properties: cleanProperties(input.properties),
  };
}

export function telemetryEnvelope(event: TelemetryEvent, recordedAt: string) {
  return {
    schema: 1,
    service: 'shopping-price-map',
    recordedAt,
    ...event,
  };
}
