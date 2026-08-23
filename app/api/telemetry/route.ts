import { enforceRequestLimit } from '../request-limit.ts';
import { normalizeTelemetryEvent, telemetryEnvelope } from '../../telemetry-logic.ts';

async function forwardTelemetry(payload: ReturnType<typeof telemetryEnvelope>) {
  const endpoint = process.env.OBSERVABILITY_ENDPOINT?.trim();
  if (!endpoint) {
    console.info(JSON.stringify(payload));
    return;
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = process.env.OBSERVABILITY_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal });
  } catch {
    console.error(JSON.stringify({ ...payload, forwardingFailed: true }));
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const limited = enforceRequestLimit(request, { bucket: 'telemetry', limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 4096) return Response.json({ error: 'Telemetry payload is too large.' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: 'Telemetry payload must be valid JSON.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const event = normalizeTelemetryEvent(input);
  if (!event) return Response.json({ error: 'Telemetry event is not allowed.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  await forwardTelemetry(telemetryEnvelope(event, new Date().toISOString()));
  return new Response(null, { status: 202, headers: { 'Cache-Control': 'no-store' } });
}
