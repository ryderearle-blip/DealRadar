export type InventoryStore = {
  storeId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  distance: number;
  lowStock: boolean;
  minPickupHours: number | null;
};

export type VerifiedInventoryCheck = {
  sku: string;
  zipCode: string;
  checkedAt: string;
  ispuEligible: boolean;
  stores: InventoryStore[];
};

export type InventoryEvidence = {
  state: 'unverified' | 'available' | 'unavailable';
  distance: number | null;
  storeCount: number;
  lowStock: boolean;
};

const INVENTORY_FRESH_MS = 15 * 60 * 1000;

export function inventoryEvidence(check: VerifiedInventoryCheck | undefined, sku: string, zipCode: string, now = Date.now()): InventoryEvidence {
  if (!check || check.sku !== sku || check.zipCode !== zipCode) return { state: 'unverified', distance: null, storeCount: 0, lowStock: false };
  const checkedAt = Date.parse(check.checkedAt);
  const age = now - checkedAt;
  if (!Number.isFinite(checkedAt) || age < -5 * 60 * 1000 || age > INVENTORY_FRESH_MS) return { state: 'unverified', distance: null, storeCount: 0, lowStock: false };
  if (!check.ispuEligible || !check.stores.length) return { state: 'unavailable', distance: null, storeCount: 0, lowStock: false };
  return {
    state: 'available',
    distance: check.stores[0].distance,
    storeCount: check.stores.length,
    lowStock: check.stores[0].lowStock,
  };
}

export type BestBuyInventoryPayload = {
  ispuEligible?: boolean;
  stores?: unknown[];
};

export function normalizeSku(value: string) {
  const sku = value.trim();
  return /^\d{3,12}$/.test(sku) ? sku : null;
}

export function normalizeBestBuyInventory(payload: BestBuyInventoryPayload) {
  const stores = (Array.isArray(payload.stores) ? payload.stores : []).flatMap((raw): InventoryStore[] => {
    if (!raw || typeof raw !== 'object') return [];
    const store = raw as Record<string, unknown>;
    const storeId = String(store.storeID ?? store.storeId ?? '').trim();
    const name = String(store.name ?? '').trim();
    const address = String(store.address ?? '').trim();
    const city = String(store.city ?? '').trim();
    const state = String(store.state ?? '').trim().slice(0, 2).toUpperCase();
    const postalCode = String(store.postalCode ?? '').trim().slice(0, 10);
    const distance = Number(store.distance);
    if (!storeId || !name || !address || !city || !state || !Number.isFinite(distance) || distance < 0 || distance > 250) return [];
    const pickupHours = store.minPickupHours === null ? null : Number(store.minPickupHours);
    return [{
      storeId,
      name: name.slice(0, 80),
      address: address.slice(0, 120),
      city: city.slice(0, 80),
      state,
      postalCode,
      distance,
      lowStock: store.lowStock === true,
      minPickupHours: Number.isFinite(pickupHours) && pickupHours! >= 0 ? pickupHours : null,
    }];
  }).sort((first, second) => first.distance - second.distance);

  return { ispuEligible: payload.ispuEligible === true, stores };
}

export function inventoryDirectionsUrl(store: Pick<InventoryStore, 'address' | 'city' | 'state' | 'postalCode'>, provider: 'apple' | 'google') {
  const destination = `${store.address}, ${store.city}, ${store.state} ${store.postalCode}`.trim();
  return provider === 'apple'
    ? `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}
