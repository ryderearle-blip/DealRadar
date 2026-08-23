import { normalizeBestBuyInventory, normalizeSku } from '../../inventory-logic.ts';
import { normalizeUsZip } from '../../profile-logic.ts';
import { enforceRequestLimit } from '../request-limit.ts';

export async function GET(request: Request) {
  const limited = enforceRequestLimit(request, { bucket: 'verified-store-inventory', limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(request.url);
  const sku = normalizeSku(url.searchParams.get('sku') ?? '');
  const zipCode = normalizeUsZip(url.searchParams.get('zip') ?? '');
  if (!sku || !zipCode) {
    return Response.json({ error: 'A valid retailer SKU and U.S. ZIP code are required.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const apiKey = process.env.BEST_BUY_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ state: 'needs_credentials', stores: [], error: 'Store inventory is ready but the official retailer connection is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const endpoint = `https://api.bestbuy.com/v1/products/${encodeURIComponent(sku)}/stores.json?postalCode=${encodeURIComponent(zipCode)}&apiKey=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Inventory service returned ${response.status}`);
    const inventory = normalizeBestBuyInventory(await response.json());
    return Response.json({
      retailer: 'Best Buy',
      sku,
      zipCode,
      checkedAt: new Date().toISOString(),
      ispuEligible: inventory.ispuEligible,
      stores: inventory.stores,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ stores: [], error: 'Official store inventory is temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  } finally {
    clearTimeout(timeout);
  }
}
