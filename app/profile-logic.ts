export type FulfillmentPreference = 'both' | 'pickup' | 'shipping';

export type ProfilePreferences = {
  name: string;
  zipCode: string;
  locationLabel: string;
  coordinates: [number, number];
  searchRadius: 5 | 10 | 25 | 50 | 100;
  fulfillment: FulfillmentPreference;
  priceDropNotifications: boolean;
  backInStockNotifications: boolean;
};

export const defaultProfilePreferences: ProfilePreferences = {
  name: 'Ryder',
  zipCode: '28086',
  locationLabel: 'Kings Mountain, NC',
  coordinates: [-81.3806, 35.2516],
  searchRadius: 25,
  fulfillment: 'both',
  priceDropNotifications: true,
  backInStockNotifications: true,
};

const radii = new Set([5, 10, 25, 50, 100]);
const fulfillmentOptions = new Set(['both', 'pickup', 'shipping']);

export function normalizeUsZip(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 5);
  return digits.length === 5 ? digits : null;
}

export function parseProfilePreferences(raw: string | null): ProfilePreferences {
  try {
    const parsed = JSON.parse(raw ?? '{}');
    const coordinates = Array.isArray(parsed.coordinates)
      && parsed.coordinates.length === 2
      && parsed.coordinates.every(Number.isFinite)
      && parsed.coordinates[0] >= -171 && parsed.coordinates[0] <= -66
      && parsed.coordinates[1] >= 18 && parsed.coordinates[1] <= 72
      ? parsed.coordinates as [number, number]
      : defaultProfilePreferences.coordinates;
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim().slice(0, 40) : defaultProfilePreferences.name,
      zipCode: normalizeUsZip(String(parsed.zipCode ?? '')) ?? defaultProfilePreferences.zipCode,
      locationLabel: typeof parsed.locationLabel === 'string' && parsed.locationLabel.trim() ? parsed.locationLabel.trim().slice(0, 80) : defaultProfilePreferences.locationLabel,
      coordinates,
      searchRadius: radii.has(parsed.searchRadius) ? parsed.searchRadius : defaultProfilePreferences.searchRadius,
      fulfillment: fulfillmentOptions.has(parsed.fulfillment) ? parsed.fulfillment : defaultProfilePreferences.fulfillment,
      priceDropNotifications: typeof parsed.priceDropNotifications === 'boolean' ? parsed.priceDropNotifications : defaultProfilePreferences.priceDropNotifications,
      backInStockNotifications: typeof parsed.backInStockNotifications === 'boolean' ? parsed.backInStockNotifications : defaultProfilePreferences.backInStockNotifications,
    };
  } catch {
    return defaultProfilePreferences;
  }
}

export function profileInitials(name: string) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return initials || 'DR';
}

export function fulfillmentLabel(value: FulfillmentPreference) {
  return value === 'pickup' ? 'Pickup first' : value === 'shipping' ? 'Shipping first' : 'Pickup & shipping';
}
