export type StoreBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type StoreCategory = 'electronics' | 'department_store' | 'computer' | 'appliance' | 'video_games' | 'other';

export type StoreLocation = {
  id: string;
  name: string;
  category: StoreCategory;
  address: string;
  coordinates: [number, number];
  source: 'openstreetmap';
  sourceUrl: string;
};

export type OpenStreetMapElement = {
  id?: number;
  type?: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

const USA_LIMITS = { south: 18, west: -171, north: 72, east: -66 } as const;
const MAX_LATITUDE_SPAN = 5;
const MAX_LONGITUDE_SPAN = 8;
const STORE_CATEGORY_ORDER: StoreCategory[] = ['electronics', 'department_store', 'computer', 'appliance', 'video_games'];

export function storeCategoryLabel(category: StoreCategory) {
  return category === 'department_store' ? 'Department store'
    : category === 'video_games' ? 'Video game store'
      : category === 'computer' ? 'Computer store'
        : category === 'appliance' ? 'Appliance store'
          : category === 'electronics' ? 'Electronics store' : 'Retail store';
}

export function storeCategoriesForProductQuery(query: string): StoreCategory[] {
  const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const categories = new Set<StoreCategory>();
  const add = (...values: StoreCategory[]) => values.forEach(value => categories.add(value));
  if (/\b(game|gaming|playstation|ps5|xbox|nintendo|switch|console)\b/.test(normalized)) add('video_games', 'electronics', 'department_store');
  if (/\b(laptop|computer|pc|macbook|monitor|keyboard|printer|tablet)\b/.test(normalized)) add('computer', 'electronics', 'department_store');
  if (/\b(appliance|refrigerator|fridge|washer|dryer|microwave|oven|dishwasher|vacuum)\b/.test(normalized)) add('appliance', 'department_store');
  if (/\b(tv|television|oled|qled|audio|headphone|headphones|earbud|earbuds|speaker|phone|smartphone|camera|drone)\b/.test(normalized)) add('electronics', 'department_store');
  return categories.size ? STORE_CATEGORY_ORDER.filter(category => categories.has(category)) : [...STORE_CATEGORY_ORDER];
}

export function storeSearchBounds(home: [number, number], radiusMiles: number): StoreBounds | null {
  const [longitude, latitude] = home;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)
    || longitude < USA_LIMITS.west || longitude > USA_LIMITS.east
    || latitude < USA_LIMITS.south || latitude > USA_LIMITS.north
    || !Number.isFinite(radiusMiles) || radiusMiles <= 0) return null;

  const boundedRadius = Math.min(100, radiusMiles);
  const latitudeRadius = Math.min(MAX_LATITUDE_SPAN / 2, boundedRadius / 69);
  const longitudeMilesPerDegree = 69 * Math.max(.25, Math.cos(latitude * Math.PI / 180));
  const longitudeRadius = Math.min(MAX_LONGITUDE_SPAN / 2, boundedRadius / longitudeMilesPerDegree);
  return boundedWindow(latitude, longitude, latitudeRadius * 2, longitudeRadius * 2);
}

function boundedWindow(centerLatitude: number, centerLongitude: number, latitudeSpan: number, longitudeSpan: number): StoreBounds {
  let south = centerLatitude - latitudeSpan / 2;
  let north = centerLatitude + latitudeSpan / 2;
  let west = centerLongitude - longitudeSpan / 2;
  let east = centerLongitude + longitudeSpan / 2;

  if (south < USA_LIMITS.south) { north += USA_LIMITS.south - south; south = USA_LIMITS.south; }
  if (north > USA_LIMITS.north) { south -= north - USA_LIMITS.north; north = USA_LIMITS.north; }
  if (west < USA_LIMITS.west) { east += USA_LIMITS.west - west; west = USA_LIMITS.west; }
  if (east > USA_LIMITS.east) { west -= east - USA_LIMITS.east; east = USA_LIMITS.east; }

  return {
    south: Number(south.toFixed(4)),
    west: Number(west.toFixed(4)),
    north: Number(north.toFixed(4)),
    east: Number(east.toFixed(4)),
  };
}

export function buildStoreDiscoveryWindows(bounds: StoreBounds, maximumWindows = 6) {
  const south = Math.max(USA_LIMITS.south, bounds.south);
  const west = Math.max(USA_LIMITS.west, bounds.west);
  const north = Math.min(USA_LIMITS.north, bounds.north);
  const east = Math.min(USA_LIMITS.east, bounds.east);
  if (south >= north || west >= east || maximumWindows < 1) return [];

  const latitudeSpan = north - south;
  const longitudeSpan = east - west;
  if (latitudeSpan <= MAX_LATITUDE_SPAN && longitudeSpan <= MAX_LONGITUDE_SPAN) {
    return [{ south, west, north, east }].map(window => ({
      south: Number(window.south.toFixed(4)),
      west: Number(window.west.toFixed(4)),
      north: Number(window.north.toFixed(4)),
      east: Number(window.east.toFixed(4)),
    }));
  }

  const requested = maximumWindows >= 6 ? 6 : maximumWindows >= 4 ? 4 : 1;
  const widerThanTall = longitudeSpan / MAX_LONGITUDE_SPAN >= latitudeSpan / MAX_LATITUDE_SPAN;
  const columns = requested === 6 ? (widerThanTall ? 3 : 2) : requested === 4 ? 2 : 1;
  const rows = Math.ceil(requested / columns);
  const windowLatitudeSpan = Math.min(MAX_LATITUDE_SPAN, latitudeSpan / rows);
  const windowLongitudeSpan = Math.min(MAX_LONGITUDE_SPAN, longitudeSpan / columns);
  const windows: StoreBounds[] = [];

  for (let row = 0; row < rows && windows.length < requested; row += 1) {
    for (let column = 0; column < columns && windows.length < requested; column += 1) {
      const rawLatitude = south + ((row + .5) / rows) * latitudeSpan;
      const rawLongitude = west + ((column + .5) / columns) * longitudeSpan;
      const centerLatitude = Math.round(rawLatitude * 2) / 2;
      const centerLongitude = Math.round(rawLongitude);
      windows.push(boundedWindow(centerLatitude, centerLongitude, windowLatitudeSpan, windowLongitudeSpan));
    }
  }

  return [...new Map(windows.map(window => [storeBoundsKey(window), window])).values()];
}

function storeFamily(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const knownFamilies = ['best buy', 'micro center', 'walmart', 'target', 'gamestop', 'apple'];
  return knownFamilies.find(family => normalized.includes(family)) ?? normalized.split(' ')[0] ?? normalized;
}

export function sampleStoreLocations(stores: StoreLocation[], maximum: number) {
  if (maximum <= 0) return [];
  const ordered = [...stores].sort((first, second) => first.name.localeCompare(second.name) || first.id.localeCompare(second.id));
  const selected: StoreLocation[] = [];
  const selectedIds = new Set<string>();
  const families = new Set<string>();

  for (const store of ordered) {
    const family = storeFamily(store.name);
    if (families.has(family)) continue;
    families.add(family);
    selected.push(store);
    selectedIds.add(store.id);
    if (selected.length === maximum) return selected;
  }

  for (const store of ordered) {
    if (selectedIds.has(store.id)) continue;
    selected.push(store);
    if (selected.length === maximum) break;
  }
  return selected;
}

function cleanText(value: string | undefined, maximumLength: number) {
  return (value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximumLength);
}

function coordinate(value: string | null) {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeStoreBounds(searchParams: URLSearchParams): StoreBounds | null {
  const requested = {
    south: coordinate(searchParams.get('s')),
    west: coordinate(searchParams.get('w')),
    north: coordinate(searchParams.get('n')),
    east: coordinate(searchParams.get('e')),
  };

  if (Object.values(requested).some(value => value === null)) return null;
  const south = Math.max(USA_LIMITS.south, Number(requested.south));
  const west = Math.max(USA_LIMITS.west, Number(requested.west));
  const north = Math.min(USA_LIMITS.north, Number(requested.north));
  const east = Math.min(USA_LIMITS.east, Number(requested.east));
  if (south >= north || west >= east) return null;
  if (north - south > MAX_LATITUDE_SPAN || east - west > MAX_LONGITUDE_SPAN) return null;

  return {
    south: Number(south.toFixed(4)),
    west: Number(west.toFixed(4)),
    north: Number(north.toFixed(4)),
    east: Number(east.toFixed(4)),
  };
}

export function storeBoundsKey(bounds: StoreBounds) {
  return [bounds.south, bounds.west, bounds.north, bounds.east].map(value => value.toFixed(3)).join(':');
}

export function buildStoreDiscoveryQuery(bounds: StoreBounds) {
  const box = `${bounds.south.toFixed(4)},${bounds.west.toFixed(4)},${bounds.north.toFixed(4)},${bounds.east.toFixed(4)}`;
  return `[out:json][timeout:15];nwr["shop"~"^(electronics|department_store|computer|appliance|video_games)$"](${box});out center 80;`;
}

export function parseStoreLocations(elements: OpenStreetMapElement[], bounds: StoreBounds): StoreLocation[] {
  const locations = new Map<string, StoreLocation>();

  for (const element of elements) {
    if (!element.id || !element.type || !['node', 'way', 'relation'].includes(element.type)) continue;
    const tags = element.tags ?? {};
    const name = cleanText(tags.name || tags.brand, 100);
    const latitude = Number(element.lat ?? element.center?.lat);
    const longitude = Number(element.lon ?? element.center?.lon);
    if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (latitude < bounds.south || latitude > bounds.north || longitude < bounds.west || longitude > bounds.east) continue;

    const streetAddress = [cleanText(tags['addr:housenumber'], 20), cleanText(tags['addr:street'], 80)].filter(Boolean).join(' ');
    const locality = [cleanText(tags['addr:city'], 60), cleanText(tags['addr:state'], 30)].filter(Boolean).join(', ');
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const duplicateKey = `${normalizedName}:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
    if (locations.has(duplicateKey)) continue;

    locations.set(duplicateKey, {
      id: `osm-${element.type}-${element.id}`,
      name,
      category: STORE_CATEGORY_ORDER.includes(tags.shop as StoreCategory) ? tags.shop as StoreCategory : 'other',
      address: [streetAddress, locality].filter(Boolean).join(' · ') || 'Mapped business location',
      coordinates: [longitude, latitude],
      source: 'openstreetmap',
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    });
  }

  return [...locations.values()];
}
