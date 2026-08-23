import { buildHealthPayload } from '../../health-logic.ts';

export function GET() {
  return Response.json(
    buildHealthPayload(Boolean(process.env.BEST_BUY_API_KEY?.trim()), new Date().toISOString()),
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
