export type SavedProductRecord = {
  id: string;
  title: string;
  retailer: string;
  price: number;
  regularPrice: number | null;
  availability: string;
  productUrl: string;
  modelNumber: string | null;
  savedAt: string;
  verifiedAt: string;
};

export type SavedStoreRecord = {
  id: string;
  store: string;
  address: string;
  distance: string;
  detail: string;
  color: string;
  mark: string;
  coordinates?: [number, number];
  savedAt: string;
};

export type SavedSort = 'recent' | 'name' | 'price-low';

export function parseSavedProducts(raw: string | null): SavedProductRecord[] {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedProductRecord => Boolean(
      item && typeof item.id === 'string' && typeof item.title === 'string'
      && typeof item.retailer === 'string' && Number.isFinite(item.price)
      && typeof item.productUrl === 'string' && typeof item.savedAt === 'string',
    ));
  } catch {
    return [];
  }
}

export function parseSavedStores(raw: string | null, knownStores: SavedStoreRecord[] = []): SavedStoreRecord[] {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): SavedStoreRecord[] => {
      if (typeof item === 'string') {
        const known = knownStores.find(store => store.id === item);
        return known ? [known] : [];
      }
      if (!item || typeof item.id !== 'string' || typeof item.store !== 'string') return [];
      return [{
        id: item.id,
        store: item.store,
        address: typeof item.address === 'string' ? item.address : 'Mapped business location',
        distance: typeof item.distance === 'string' ? item.distance : 'Saved store',
        detail: typeof item.detail === 'string' ? item.detail : 'Mapped location',
        color: typeof item.color === 'string' ? item.color : '#176b73',
        mark: typeof item.mark === 'string' ? item.mark : 'S',
        coordinates: Array.isArray(item.coordinates) && item.coordinates.length === 2 ? item.coordinates : undefined,
        savedAt: typeof item.savedAt === 'string' ? item.savedAt : new Date(0).toISOString(),
      }];
    });
  } catch {
    return [];
  }
}

export function toggleSavedProduct(records: SavedProductRecord[], product: SavedProductRecord) {
  return records.some(item => item.id === product.id)
    ? records.filter(item => item.id !== product.id)
    : [product, ...records];
}

export function toggleSavedStore(records: SavedStoreRecord[], store: SavedStoreRecord) {
  return records.some(item => item.id === store.id)
    ? records.filter(item => item.id !== store.id)
    : [store, ...records];
}

export function filterSavedProducts(records: SavedProductRecord[], query: string, sort: SavedSort) {
  const normalized = query.trim().toLowerCase();
  const filtered = records.filter(item => !normalized || [item.title, item.retailer, item.modelNumber ?? ''].some(value => value.toLowerCase().includes(normalized)));
  return [...filtered].sort((first, second) => sort === 'name'
    ? first.title.localeCompare(second.title)
    : sort === 'price-low'
      ? first.price - second.price
      : second.savedAt.localeCompare(first.savedAt));
}

export function filterSavedStores(records: SavedStoreRecord[], query: string, sort: Exclude<SavedSort, 'price-low'>) {
  const normalized = query.trim().toLowerCase();
  const filtered = records.filter(item => !normalized || [item.store, item.address].some(value => value.toLowerCase().includes(normalized)));
  return [...filtered].sort((first, second) => sort === 'name'
    ? first.store.localeCompare(second.store)
    : second.savedAt.localeCompare(first.savedAt));
}
