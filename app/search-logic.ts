export type FilterValues = {
  sort: 'best' | 'price-low' | 'price-high' | 'distance';
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

export function filterAndSortOffers<T extends FilterableOffer>(offers: T[], filters: FilterValues, distanceFor: (retailer: string) => number | null) {
  const matches = offers.filter(item => {
    const distance = distanceFor(item.retailer);
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
    return 0;
  });
}
