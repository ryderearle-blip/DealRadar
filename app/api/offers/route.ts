type RetailerState = 'connected' | 'needs_credentials' | 'partner_access' | 'unavailable';

type RetailerStatus = {
  retailer: string;
  state: RetailerState;
  message: string;
  signupUrl?: string;
};

type LiveOffer = {
  id: string;
  retailer: string;
  title: string;
  price: number;
  regularPrice: number | null;
  currency: 'USD';
  availability: string;
  fulfillment: string[];
  imageUrl: string | null;
  productUrl: string;
  source: 'official-api';
  updatedAt: string;
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
  image?: string;
  url?: string;
  mobileUrl?: string;
};

const retailerStatuses = (): RetailerStatus[] => [
  {
    retailer: 'Best Buy',
    state: process.env.BEST_BUY_API_KEY ? 'connected' : 'needs_credentials',
    message: process.env.BEST_BUY_API_KEY ? 'Official catalog connected' : 'API key required',
    signupUrl: 'https://developer.bestbuy.com/',
  },
  {
    retailer: 'Amazon',
    state: 'partner_access',
    message: 'Approved Associates and Creators API access required',
    signupUrl: 'https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction',
  },
  {
    retailer: 'Walmart',
    state: 'partner_access',
    message: 'Marketplace partner approval and OAuth credentials required',
    signupUrl: 'https://developer.walmart.com/us-marketplace/docs/integrate-with-marketplace-apis',
  },
  {
    retailer: 'Target',
    state: 'unavailable',
    message: 'No public consumer catalog and price API is documented',
    signupUrl: 'https://developer.target.com/',
  },
  {
    retailer: 'Apple',
    state: 'unavailable',
    message: 'No public Apple Store hardware price API is documented',
  },
  {
    retailer: 'Micro Center',
    state: 'unavailable',
    message: 'No public product and store inventory API is documented',
  },
];

function queryTerms(query: string) {
  return (query.match(/[a-zA-Z0-9][a-zA-Z0-9.'-]*/g) ?? [])
    .slice(0, 8)
    .map(term => term.slice(0, 40));
}

async function searchBestBuy(query: string): Promise<LiveOffer[]> {
  const apiKey = process.env.BEST_BUY_API_KEY;
  if (!apiKey) return [];

  const terms = queryTerms(query);
  if (!terms.length) return [];

  const filter = terms.map(term => `search=${encodeURIComponent(term)}`).join('&');
  const fields = [
    'sku', 'name', 'salePrice', 'regularPrice', 'onlineAvailability',
    'inStoreAvailability', 'inStorePickup', 'shipping', 'image', 'url', 'mobileUrl',
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
    const updatedAt = new Date().toISOString();

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

      return [{
        id: `bestbuy-${product.sku}`,
        retailer: 'Best Buy',
        title: product.name,
        price: Number(product.salePrice),
        regularPrice: Number.isFinite(product.regularPrice) ? Number(product.regularPrice) : null,
        currency: 'USD' as const,
        availability,
        fulfillment,
        imageUrl: product.image ?? null,
        productUrl: product.mobileUrl ?? product.url ?? `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(product.name)}`,
        source: 'official-api' as const,
        updatedAt,
      }];
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
  const retailers = retailerStatuses();

  if (query.length < 2) {
    return Response.json({ query, offers: [], retailers, error: 'Enter at least two characters.' }, { status: 400 });
  }

  const errors: { retailer: string; message: string }[] = [];
  let offers: LiveOffer[] = [];

  try {
    offers = await searchBestBuy(query);
  } catch {
    errors.push({ retailer: 'Best Buy', message: 'The live price feed is temporarily unavailable.' });
  }

  return Response.json(
    { query, offers, retailers, errors },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
  );
}
