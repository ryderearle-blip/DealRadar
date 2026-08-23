export type FilterValues = {
  sort: 'best' | 'price-low' | 'price-high' | 'distance' | 'total-cost';
  scope: 'both' | 'local' | 'online';
  maxPrice: number | null;
  maxDistance: number | null;
  availability: 'all' | 'available';
  fulfillment: 'all' | 'pickup' | 'shipping';
  retailers: string[];
};

type FilterableOffer = {
  retailer: string;
  price: number;
  availability: string;
  fulfillment: string[];
};

export type EstimatedCost = {
  item: number;
  tax: number;
  shipping: number | null;
  travel: number | null;
  total: number;
  complete: boolean;
  method: 'Local pickup' | 'Online';
};

export type SearchSuggestion = { title: string; meta: string; value: string };

export type VerificationFreshness = {
  label: string;
  stale: boolean;
  ageMs: number | null;
};

const STALE_PRICE_AGE_MS = 24 * 60 * 60 * 1000;

export function formatVerificationFreshness(verifiedAt: string | null | undefined, now = Date.now()): VerificationFreshness {
  const timestamp = verifiedAt ? Date.parse(verifiedAt) : Number.NaN;
  if (!Number.isFinite(timestamp)) return { label: 'Verification time unavailable', stale: true, ageMs: null };
  const ageMs = Math.max(0, now - timestamp);
  const stale = ageMs > STALE_PRICE_AGE_MS;
  const minutes = Math.floor(ageMs / 60_000);
  const hours = Math.floor(ageMs / 3_600_000);
  const days = Math.floor(ageMs / 86_400_000);
  if (minutes < 1) return { label: 'Verified just now', stale, ageMs };
  if (minutes < 60) return { label: `Verified ${minutes} min ago`, stale, ageMs };
  if (hours < 24) return { label: `Verified ${hours} hr ago`, stale, ageMs };
  if (days < 7) return { label: `Verified ${days} ${days === 1 ? 'day' : 'days'} ago`, stale, ageMs };
  return { label: `Last verified ${new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, stale, ageMs };
}

export function buildPredictiveSuggestions(query: string, recent: string[], live: SearchSuggestion[], catalog: SearchSuggestion[]) {
  const typed = query.trim().toLowerCase();
  const recentSuggestions = recent.map(item => ({ title: item, meta: 'Recent search', value: item }));
  const seen = new Set<string>();
  return [...recentSuggestions, ...live, ...catalog].filter(item => {
    const key = item.value.toLowerCase();
    if (seen.has(key)) return false;
    if (typed && !`${item.title} ${item.meta}`.toLowerCase().includes(typed)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

export function normalizeBarcode(value: string) {
  const digits = value.replace(/\D/g, '');
  return /^\d{8,14}$/.test(digits) ? digits : null;
}

export function toggleComparison(ids: string[], id: string, maximum = 3) {
  if (ids.includes(id)) return ids.filter(current => current !== id);
  return ids.length < maximum ? [...ids, id] : ids;
}

export function updatePriceHistory<T extends { price: number; recordedAt: string }>(history: T[], price: number, recordedAt: string) {
  const updated = [...history] as { price: number; recordedAt: string }[];
  const last = updated.at(-1);
  if (last?.recordedAt.slice(0, 10) === recordedAt.slice(0, 10)) updated[updated.length - 1] = { price, recordedAt };
  else updated.push({ price, recordedAt });
  return updated.slice(-30);
}

export function calculateEstimatedTotalCost(item: { price: number; shippingCost: number | null; fulfillment: string[] }, scope: FilterValues['scope'], distance: number | null, taxRate: number, travelCostPerMile: number): EstimatedCost {
  const tax = item.price * taxRate;
  const canPickup = item.fulfillment.some(option => option.toLowerCase().includes('pickup')) && distance !== null;
  const canShip = item.fulfillment.some(option => option.toLowerCase().includes('shipping'));
  const localTravel = canPickup && distance !== null ? distance * 2 * travelCostPerMile : null;
  const local = canPickup && localTravel !== null
    ? { item: item.price, tax, shipping: 0, travel: localTravel, total: item.price + tax + localTravel, complete: true, method: 'Local pickup' as const }
    : null;
  const online = canShip
    ? { item: item.price, tax, shipping: item.shippingCost, travel: 0, total: item.price + tax + (item.shippingCost ?? 0), complete: item.shippingCost !== null, method: 'Online' as const }
    : null;

  if (scope === 'local' && local) return local;
  if (scope === 'online' && online) return online;
  if (local && online) {
    if (!online.complete) return local;
    return local.total <= online.total ? local : online;
  }
  if (local) return local;
  if (online) return online;
  return { item: item.price, tax, shipping: null, travel: null, total: item.price + tax, complete: false, method: scope === 'local' ? 'Local pickup' : 'Online' };
}

export function filterAndSortOffers<T extends FilterableOffer>(offers: T[], filters: FilterValues, distanceFor: (retailer: string) => number | null, totalFor?: (item: T) => number | Pick<EstimatedCost, 'total' | 'complete'>) {
  const matches = offers.filter(item => {
    const distance = distanceFor(item.retailer);
    const hasPickup = item.fulfillment.some(option => option.toLowerCase().includes('pickup')) && distance !== null;
    const hasShipping = item.fulfillment.some(option => option.toLowerCase().includes('shipping'));
    if (filters.scope === 'local' && !hasPickup) return false;
    if (filters.scope === 'online' && !hasShipping) return false;
    if (filters.maxPrice !== null && item.price > filters.maxPrice) return false;
    if (filters.maxDistance !== null && (distance === null || distance > filters.maxDistance)) return false;
    if (filters.availability === 'available' && item.availability.toLowerCase().includes('not confirmed')) return false;
    if (filters.fulfillment !== 'all' && !item.fulfillment.some(option => option.toLowerCase().includes(filters.fulfillment))) return false;
    if (filters.retailers.length && !filters.retailers.includes(item.retailer)) return false;
    return true;
  });

  return [...matches].sort((first, second) => {
    if (filters.sort === 'price-low') return first.price - second.price;
    if (filters.sort === 'price-high') return second.price - first.price;
    if (filters.sort === 'distance') return (distanceFor(first.retailer) ?? Infinity) - (distanceFor(second.retailer) ?? Infinity);
    if (filters.sort === 'total-cost') {
      const firstValue = totalFor?.(first) ?? first.price;
      const secondValue = totalFor?.(second) ?? second.price;
      const firstCost = typeof firstValue === 'number' ? { total: firstValue, complete: true } : firstValue;
      const secondCost = typeof secondValue === 'number' ? { total: secondValue, complete: true } : secondValue;
      if (firstCost.complete !== secondCost.complete) return firstCost.complete ? -1 : 1;
      return firstCost.total - secondCost.total;
    }
    return 0;
  });
}
