export type MapStoreFilters = {
  verifiedOnly: boolean;
  withinMiles: number | null;
};

export type FilterableMapStore = {
  store: string;
  coordinates?: [number, number];
};

export function retailerMatchesStore(retailer: string, store: string) {
  const retailerName = retailer.toLowerCase().replace(/[^a-z0-9]/g, '');
  const storeName = store.toLowerCase().replace(/[^a-z0-9]/g, '');
  return storeName.includes(retailerName) || retailerName.includes(storeName.replace(/(shelby|belmont|lincolnton|hickory|spartanburg|rockhill|concord|southpark)$/g, ''));
}

export function filterMappedStores<T extends FilterableMapStore>(stores: T[], filters: MapStoreFilters, verifiedRetailers: string[], distanceFor: (store: T) => number | null) {
  return stores.filter(store => {
    if (filters.verifiedOnly && !verifiedRetailers.some(retailer => retailerMatchesStore(retailer, store.store))) return false;
    if (filters.withinMiles !== null) {
      const distance = distanceFor(store);
      if (distance === null || distance > filters.withinMiles) return false;
    }
    return true;
  });
}
