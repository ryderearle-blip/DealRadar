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

export type ZipLocation = Pick<ProfilePreferences, 'zipCode' | 'locationLabel' | 'coordinates'>;

export async function lookupUsZip(value: string, fetcher: typeof fetch = fetch): Promise<ZipLocation> {
  const zipCode = normalizeUsZip(value);
  if (!zipCode) throw new Error('Enter a valid U.S. ZIP code');
  const response = await fetcher(`https://api.zippopotam.us/us/${zipCode}`);
  if (!response.ok) throw new Error('ZIP code not found');
  const data = await response.json() as { places?: Array<{ 'place name': string; 'state abbreviation': string; longitude: string; latitude: string }> };
  const place = data.places?.[0];
  const longitude = Number(place?.longitude);
  const latitude = Number(place?.latitude);
  if (!place || !Number.isFinite(longitude) || !Number.isFinite(latitude)) throw new Error('ZIP location unavailable');
  return {
    zipCode,
    locationLabel: `${place['place name']}, ${place['state abbreviation']}`,
    coordinates: [longitude, latitude],
  };
}
