import { buildBestBuyProductFilter, classifyProductMatch } from '../../retailer-logic.ts';
import { applyRetailerProbe, buildRetailerStatuses } from '../../retailer-connections.ts';
import { enforceRequestLimit } from '../request-limit.ts';

type LiveOffer = {
  id: string;
  retailer: string;
  title: string;
  price: number;
  regularPrice: number | null;
  currency: 'USD';
  availability: string;
  fulfillment: string[];
  shippingCost: number | null;
  imageUrl: string | null;
  productUrl: string;
  manufacturer: string | null;
  modelNumber: string | null;
  upc: string | null;
  condition: string | null;
  matchType: 'exact' | 'similar' | 'possible';
  matchReason: string;
  source: 'official-api';
  updatedAt: string;
  sourceUpdatedAt: string | null;
};

type BestBuyProduct = {
  sku?: number;
  name?: string;
  salePrice?: number;
  regularPrice?: number;
  onlineAvailability?: boolean;
  inStoreAvailability?: boolean;
  inStorePickup?: boolean;
  shipping?: boolean;
  shippingCost?: number;
  freeShipping?: boolean;
  freeShippingEligible?: boolean;
  image?: string;
  url?: string;
  mobileUrl?: string;
  manufacturer?: string;
  modelNumber?: string;
  upc?: string;
  condition?: string;
  priceUpdateDate?: string;
};

async function searchBestBuy(query: string): Promise<LiveOffer[]> {
  const apiKey = process.env.BEST_BUY_API_KEY;
  if (!apiKey) return [];

  const filter = buildBestBuyProductFilter(query);
  if (!filter) return [];
  const fields = [
    'sku', 'name', 'salePrice', 'regularPrice', 'onlineAvailability',
    'inStoreAvailability', 'inStorePickup', 'shipping', 'shippingCost', 'freeShipping',
    'freeShippingEligible', 'image', 'url', 'mobileUrl', 'manufacturer', 'modelNumber',
    'upc', 'condition', 'priceUpdateDate',
  ].join(',');
  const endpoint = `https://api.bestbuy.com/v1/products(${filter})?format=json&pageSize=8&show=${fields}&apiKey=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Best Buy returned ${response.status}`);
    const data = await response.json() as { products?: BestBuyProduct[] };
    const checkedAt = new Date().toISOString();

    return (data.products ?? []).flatMap(product => {
      if (!product.sku || !product.name || !Number.isFinite(product.salePrice)) return [];
      const fulfillment = [
        product.inStorePickup ? 'Store pickup' : null,
        product.shipping ? 'Shipping' : null,
      ].filter((item): item is string => Boolean(item));
      const availability = product.inStoreAvailability
        ? 'Available in stores'
        : product.onlineAvailability
          ? 'Available online'
          : 'Availability not confirmed';
      const match = classifyProductMatch(query, product);
      const shippingCost = product.freeShipping || product.freeShippingEligible
        ? 0
        : Number.isFinite(product.shippingCost)
          ? Number(product.shippingCost)
          : null;

      return [{
        id: `bestbuy-${product.sku}`,
        retailer: 'Best Buy',
        title: product.name,
        price: Number(product.salePrice),
        regularPrice: Number.isFinite(product.regularPrice) ? Number(product.regularPrice) : null,
        currency: 'USD' as const,
        availability,
        fulfillment,
        shippingCost,
        imageUrl: product.image ?? null,
        productUrl: product.mobileUrl ?? product.url ?? `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(product.name)}`,
        manufacturer: product.manufacturer ?? null,
        modelNumber: product.modelNumber ?? null,
        upc: product.upc ?? null,
        condition: product.condition ?? null,
        matchType: match.matchType,
        matchReason: match.matchReason,
        source: 'official-api' as const,
        updatedAt: checkedAt,
        sourceUpdatedAt: product.priceUpdateDate ?? null,
      }];
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const limited = enforceRequestLimit(request, { bucket: 'verified-offer-search', limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
  const bestBuyConfigured = Boolean(process.env.BEST_BUY_API_KEY?.trim());
  let retailers = buildRetailerStatuses(bestBuyConfigured);

  if (query.length < 2) {
    return Response.json({ query, offers: [], retailers, error: 'Enter at least two characters.' }, { status: 400 });
  }

  const errors: { retailer: string; message: string }[] = [];
  let offers: LiveOffer[] = [];

  try {
    offers = await searchBestBuy(query);
    if (bestBuyConfigured) retailers = applyRetailerProbe(retailers, 'Best Buy', true, new Date().toISOString());
  } catch {
    errors.push({ retailer: 'Best Buy', message: 'The live price feed is temporarily unavailable.' });
    if (bestBuyConfigured) retailers = applyRetailerProbe(retailers, 'Best Buy', false, new Date().toISOString());
  }

  return Response.json(
    { query, offers, retailers, errors },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
  );
}
