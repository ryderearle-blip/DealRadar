import {
  buildStoreDiscoveryQuery,
  normalizeStoreBounds,
  parseStoreLocations,
  storeBoundsKey,
  type OpenStreetMapElement,
  type StoreLocation,
} from '../../store-discovery.ts';

type StorePayload = {
  stores: StoreLocation[];
  source: 'OpenStreetMap';
  fetchedAt: string;
};

const OVERPASS_ENDPOINTS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
] as const;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const storeCache = new Map<string, { expiresAt: number; payload: StorePayload }>();

function cachePayload(key: string, payload: StorePayload) {
  if (storeCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = storeCache.keys().next().value;
    if (oldest) storeCache.delete(oldest);
  }
  storeCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
}

async function fetchOpenStreetMapElements(query: string) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'DealRadar/0.1 (https://github.com/ryderearle-blip/DealRadar)',
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!response.ok) continue;
      const data = await response.json() as { elements?: OpenStreetMapElement[] };
      return data.elements ?? [];
    } catch {
      // A second documented public instance is tried below.
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error('All store discovery sources are unavailable');
}

export async function GET(request: Request) {
  const bounds = normalizeStoreBounds(new URL(request.url).searchParams);
  if (!bounds) {
    return Response.json(
      { stores: [], error: 'Use a valid U.S. map area and zoom in to search for stores.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const cacheKey = storeBoundsKey(bounds);
  const cached = storeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json(cached.payload, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400', 'X-DealRadar-Cache': 'HIT' },
    });
  }
  if (cached) storeCache.delete(cacheKey);

  try {
    const elements = await fetchOpenStreetMapElements(buildStoreDiscoveryQuery(bounds));
    const payload: StorePayload = {
      stores: parseStoreLocations(elements, bounds),
      source: 'OpenStreetMap',
      fetchedAt: new Date().toISOString(),
    };
    cachePayload(cacheKey, payload);

    return Response.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400', 'X-DealRadar-Cache': 'MISS' },
    });
  } catch {
    return Response.json(
      { stores: [], error: 'Store discovery is temporarily unavailable.' },
      { status: 502, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' } },
    );
  }
}
