import { applyRetailerProbe, buildRetailerStatuses } from '../../retailer-connections';

async function probeBestBuy(apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const endpoint = `https://api.bestbuy.com/v1/products(search=television)?format=json&pageSize=1&show=sku&apiKey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return false;
    const data = await response.json() as { products?: Array<{ sku?: number }> };
    return Array.isArray(data.products);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const apiKey = process.env.BEST_BUY_API_KEY?.trim() ?? '';
  let retailers = buildRetailerStatuses(Boolean(apiKey));
  const probe = new URL(request.url).searchParams.get('probe') === '1';
  if (probe && apiKey) {
    const checkedAt = new Date().toISOString();
    retailers = applyRetailerProbe(retailers, 'Best Buy', await probeBestBuy(apiKey), checkedAt);
  }
  return Response.json({
    retailers,
    checkedAt: probe ? new Date().toISOString() : null,
    summary: {
      verified: retailers.filter(item => item.health === 'verified').length,
      configured: retailers.filter(item => item.health === 'configured').length,
      actionRequired: retailers.filter(item => item.health === 'action_required' || item.health === 'failed').length,
      locationOnly: retailers.filter(item => item.health === 'location_only').length,
    },
  }, { headers: { 'Cache-Control': probe ? 'no-store' : 'private, max-age=60' } });
}
