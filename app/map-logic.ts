export type MapStoreFilters = {
  verifiedOnly: boolean;
  withinMiles: number | null;
};

export type FilterableMapStore = {
  store: string;
  coordinates?: [number, number];
};

export function milesBetween(from: [number, number], to: [number, number]) {
  const radians = (value: number) => value * Math.PI / 180;
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = radians(to[1] - from[1]);
  const longitudeDelta = radians(to[0] - from[0]);
  const calculation = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from[1])) * Math.cos(radians(to[1])) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation));
}

export function storeDistanceLabel(home: [number, number], store: [number, number]) {
  return `~${milesBetween(home, store).toFixed(1)} mi from home`;
}

export function appleMapsDirectionsUrl(home: [number, number], store: [number, number]) {
  return `https://maps.apple.com/?saddr=${home[1]},${home[0]}&daddr=${store[1]},${store[0]}&dirflg=d`;
}

export function googleMapsDirectionsUrl(home: [number, number], store: [number, number]) {
  return `https://www.google.com/maps/dir/?api=1&origin=${home[1]},${home[0]}&destination=${store[1]},${store[0]}&travelmode=driving`;
}

export function retailerMatchesStore(retailer: string, store: string) {
  const retailerName = retailer.toLowerCase().replace(/[^a-z0-9]/g, '');
  const storeName = store.toLowerCase().replace(/[^a-z0-9]/g, '');
  return storeName.includes(retailerName) || retailerName.includes(storeName.replace(/(shelby|belmont|lincolnton|hickory|spartanburg|rockhill|concord|southpark)$/g, ''));
}

export function nearestRetailerDistance<T extends { store: string; coordinates?: [number, number] }>(retailer: string, home: [number, number], stores: T[]) {
  const matchingStores = stores.filter(store => store.coordinates && retailerMatchesStore(retailer, store.store));
  if (!matchingStores.length) return null;
  return Math.min(...matchingStores.map(store => milesBetween(home, store.coordinates!)));
}

export function sortMappedStoresByDistance<T extends { coordinates?: [number, number] }>(stores: T[], home: [number, number]) {
  return [...stores].sort((first, second) => {
    const firstDistance = first.coordinates ? milesBetween(home, first.coordinates) : Infinity;
    const secondDistance = second.coordinates ? milesBetween(home, second.coordinates) : Infinity;
    return firstDistance - secondDistance;
  });
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
