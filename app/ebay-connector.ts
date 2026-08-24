import { classifyProductMatch } from './retailer-logic.ts';

export type EbayEnvironment = 'sandbox' | 'production';

export type EbayCredentials = {
  environment: EbayEnvironment;
  clientId: string;
  clientSecret: string;
  devId: string;
  campaignId: string;
};

export type EbayOffer = {
  id: string;
  sku: string;
  retailer: 'eBay';
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

type EbayTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type EbayItemSummary = {
  itemId?: string;
  title?: string;
  price?: { value?: string; currency?: string };
  currentBidPrice?: { value?: string; currency?: string };
  itemWebUrl?: string;
  image?: { imageUrl?: string };
  condition?: string;
  buyingOptions?: string[];
  itemLocation?: { country?: string };
  shippingOptions?: Array<{
    shippingCostType?: string;
    shippingCost?: { value?: string; currency?: string };
  }>;
  additionalImages?: Array<{ imageUrl?: string }>;
};

type EbaySearchResponse = {
  itemSummaries?: EbayItemSummary[];
};

type EbayTokenCache = {
  environment: EbayEnvironment;
  clientId: string;
  accessToken: string;
  expiresAt: number;
};

let tokenCache: EbayTokenCache | null = null;

export function getEbayCredentials(env = process.env): EbayCredentials | null {
  const environment = env.EBAY_ENVIRONMENT?.trim().toLowerCase() === 'production' ? 'production' : 'sandbox';
  const prefix = environment === 'production' ? 'EBAY_PRODUCTION' : 'EBAY_SANDBOX';
  const clientId = env[`${prefix}_CLIENT_ID`]?.trim() ?? '';
  const clientSecret = env[`${prefix}_CLIENT_SECRET`]?.trim() ?? '';
  const devId = env[`${prefix}_DEV_ID`]?.trim() ?? '';
  const campaignId = env.EBAY_CAMPAIGN_ID?.trim() ?? '';

  if (!clientId || !clientSecret || !devId) return null;
  return { environment, clientId, clientSecret, devId, campaignId };
}

export function ebayIsConfigured(env = process.env) {
  return Boolean(getEbayCredentials(env));
}

function ebayBaseUrl(environment: EbayEnvironment) {
  return environment === 'production' ? 'https://api.ebay.com' : 'https://api.sandbox.ebay.com';
}

function ebayMarketplaceId(environment: EbayEnvironment) {
  return environment === 'production' ? 'EBAY_US' : 'EBAY_US';
}

function numberFromAmount(amount: { value?: string; currency?: string } | undefined) {
  if (amount?.currency && amount.currency !== 'USD') return null;
  const value = Number(amount?.value);
  return Number.isFinite(value) ? value : null;
}

function shippingCostFor(item: EbayItemSummary) {
  const costs = (item.shippingOptions ?? []).map(option => {
    if (option.shippingCostType === 'FREE') return 0;
    return numberFromAmount(option.shippingCost);
  }).filter((value): value is number => value !== null);
  if (!costs.length) return null;
  return Math.min(...costs);
}

function affiliateUrl(itemUrl: string, campaignId: string) {
  if (!campaignId) return itemUrl;
  const url = new URL(itemUrl);
  url.searchParams.set('campid', campaignId);
  return url.toString();
}

function mapEbayItem(query: string, item: EbayItemSummary, checkedAt: string, campaignId: string): EbayOffer | null {
  const price = numberFromAmount(item.price) ?? numberFromAmount(item.currentBidPrice);
  if (!item.itemId || !item.title || price === null || !item.itemWebUrl) return null;
  const shippingCost = shippingCostFor(item);
  const match = classifyProductMatch(query, { name: item.title });
  const fixedPrice = item.buyingOptions?.includes('FIXED_PRICE');
  const auction = item.buyingOptions?.includes('AUCTION');

  return {
    id: `ebay-${item.itemId}`,
    sku: item.itemId,
    retailer: 'eBay',
    title: item.title,
    price,
    regularPrice: null,
    currency: 'USD',
    availability: fixedPrice ? 'Buy It Now listing' : auction ? 'Auction listing' : 'Listing availability not confirmed',
    fulfillment: ['Shipping'],
    shippingCost,
    imageUrl: item.image?.imageUrl ?? item.additionalImages?.find(image => image.imageUrl)?.imageUrl ?? null,
    productUrl: affiliateUrl(item.itemWebUrl, campaignId),
    manufacturer: null,
    modelNumber: null,
    upc: null,
    condition: item.condition ?? null,
    matchType: match.matchType,
    matchReason: match.matchReason,
    source: 'official-api',
    updatedAt: checkedAt,
    sourceUpdatedAt: null,
  };
}

export async function getEbayApplicationToken(credentials: EbayCredentials, now = Date.now()) {
  if (
    tokenCache &&
    tokenCache.environment === credentials.environment &&
    tokenCache.clientId === credentials.clientId &&
    tokenCache.expiresAt - 60_000 > now
  ) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'https://api.ebay.com/oauth/api_scope',
  });
  const authorization = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
  const response = await fetch(`${ebayBaseUrl(credentials.environment)}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authorization}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  if (!response.ok) throw new Error(`eBay token request failed with ${response.status}`);
  const data = await response.json() as EbayTokenResponse;
  if (!data.access_token) throw new Error('eBay token response did not include an access token');

  tokenCache = {
    environment: credentials.environment,
    clientId: credentials.clientId,
    accessToken: data.access_token,
    expiresAt: now + Math.max(0, (data.expires_in ?? 0) - 60) * 1000,
  };
  return data.access_token;
}

export async function searchEbayOffers(query: string, credentials: EbayCredentials): Promise<EbayOffer[]> {
  const token = await getEbayApplicationToken(credentials);
  const endpoint = new URL(`${ebayBaseUrl(credentials.environment)}/buy/browse/v1/item_summary/search`);
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('limit', '8');
  endpoint.searchParams.set('filter', 'priceCurrency:USD');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': ebayMarketplaceId(credentials.environment),
      },
    });
    if (!response.ok) throw new Error(`eBay Browse API returned ${response.status}`);
    const data = await response.json() as EbaySearchResponse;
    const checkedAt = new Date().toISOString();
    return (data.itemSummaries ?? [])
      .map(item => mapEbayItem(query, item, checkedAt, credentials.campaignId))
      .filter((offer): offer is EbayOffer => Boolean(offer));
  } finally {
    clearTimeout(timeout);
  }
}
