import type { SavedProductRecord } from './saved-logic';

export type PriceWatchSetting = {
  productId: string;
  targetPrice: number | null;
  backInStock: boolean;
  createdAt: string;
  lastCheckedAt: string | null;
};

export type VerifiedAlertOffer = {
  id: string;
  retailer: string;
  title: string;
  price: number;
  availability: string;
  modelNumber: string | null;
};

export function parsePriceWatchSettings(raw: string | null): PriceWatchSetting[] {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PriceWatchSetting => Boolean(
      item && typeof item.productId === 'string'
      && (item.targetPrice === null || Number.isFinite(item.targetPrice))
      && typeof item.backInStock === 'boolean'
      && typeof item.createdAt === 'string'
      && (item.lastCheckedAt === null || typeof item.lastCheckedAt === 'string'),
    ));
  } catch {
    return [];
  }
}

export function ensurePriceWatchSettings(products: SavedProductRecord[], settings: PriceWatchSetting[], now: string) {
  const productIds = new Set(products.map(item => item.id));
  const retained = settings.filter(item => productIds.has(item.productId));
  const retainedIds = new Set(retained.map(item => item.productId));
  return [
    ...retained,
    ...products.filter(item => !retainedIds.has(item.id)).map(item => ({
      productId: item.id,
      targetPrice: null,
      backInStock: true,
      createdAt: now,
      lastCheckedAt: null,
    } satisfies PriceWatchSetting)),
  ];
}

export function chooseVerifiedAlertOffer(product: SavedProductRecord, offers: VerifiedAlertOffer[]) {
  const retailer = product.retailer.toLowerCase();
  const retailerOffers = offers.filter(item => item.retailer.toLowerCase() === retailer);
  return retailerOffers.find(item => item.id === product.id)
    ?? retailerOffers.find(item => Boolean(product.modelNumber) && item.modelNumber?.toLowerCase() === product.modelNumber?.toLowerCase())
    ?? retailerOffers.find(item => item.title.toLowerCase() === product.title.toLowerCase())
    ?? null;
}

export function evaluatePriceWatch(product: SavedProductRecord, current: VerifiedAlertOffer | null, setting: PriceWatchSetting) {
  if (!current) return { status: 'unavailable' as const, savings: 0 };
  const savedAvailability = product.availability.toLowerCase();
  const currentAvailability = current.availability.toLowerCase();
  const restocked = setting.backInStock
    && !savedAvailability.includes('in stock')
    && currentAvailability.includes('in stock');
  const meetsDrop = current.price < product.price
    && (setting.targetPrice === null || current.price <= setting.targetPrice);
  if (meetsDrop || restocked) return { status: 'triggered' as const, savings: Math.max(0, product.price - current.price) };
  return { status: 'monitoring' as const, savings: Math.max(0, product.price - current.price) };
}

export function setPriceWatchSetting(settings: PriceWatchSetting[], next: PriceWatchSetting) {
  return settings.some(item => item.productId === next.productId)
    ? settings.map(item => item.productId === next.productId ? next : item)
    : [...settings, next];
}
