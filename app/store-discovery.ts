export type StoreBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type StoreLocation = {
  id: string;
  name: string;
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
      address: [streetAddress, locality].filter(Boolean).join(' · ') || 'Mapped business location',
      coordinates: [longitude, latitude],
      source: 'openstreetmap',
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    });
  }

  return [...locations.values()];
}
