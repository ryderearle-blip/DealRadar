'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildPredictiveSuggestions, calculateEstimatedTotalCost, filterAndSortOffers, formatVerificationFreshness, normalizeBarcode, toggleComparison, updatePriceHistory } from './search-logic';
import { appleMapsDirectionsUrl, filterMappedStores, googleMapsDirectionsUrl, milesBetween, nearestRetailerDistance, retailerMatchesStore, sortMappedStoresByDistance, storeDistanceLabel, type MapStoreFilters } from './map-logic';
import { filterSavedProducts, filterSavedStores, parseSavedProducts, parseSavedStores, toggleSavedProduct, toggleSavedStore as toggleSavedStoreRecord, type SavedProductRecord, type SavedSort, type SavedStoreRecord } from './saved-logic';
import { chooseVerifiedAlertOffer, ensurePriceWatchSettings, evaluatePriceWatch, parsePriceWatchSettings, setPriceWatchSetting, type PriceWatchSetting } from './alert-logic';
import { defaultProfilePreferences, deviceShoppingLocation, fulfillmentLabel, lookupUsZip, normalizeUsZip, parseProfilePreferences, profileInitials, type ProfilePreferences, type ShoppingLocation } from './profile-logic';
import { ONBOARDING_VERSION, onboardingProgress, shouldShowOnboarding } from './onboarding-logic';
import type { RetailerStatus } from './retailer-connections';
import { buildStoreDiscoveryQuery, buildStoreDiscoveryWindows, parseStoreLocations, sampleStoreLocations, storeSearchBounds, type OpenStreetMapElement, type StoreBounds, type StoreLocation } from './store-discovery';
import { dialogWrapTarget, isDialogDismissKey } from './dialog-logic';
import { inventoryDirectionsUrl, inventoryEvidence, type InventoryStore, type VerifiedInventoryCheck } from './inventory-logic';

type Tab = 'Search' | 'Map' | 'Saved' | 'Alerts' | 'Profile';
const tabs: Tab[] = ['Search', 'Map', 'Saved', 'Alerts', 'Profile'];
const icons: Record<Tab, string> = { Search: '⌕', Map: '⌖', Saved: '♡', Alerts: '♧', Profile: '○' };
type Offer = {
  id?: string;
  store: string;
  price: number | null;
  distance: string;
  color: string;
  mark: string;
  detail: string;
  address: string;
  coordinates?: [number, number];
  mapTier?: 1 | 2 | 3;
  sourceUrl?: string;
};

type LivePrice = {
  id: string;
  sku: string;
  retailer: string;
  title: string;
  price: number;
  regularPrice: number | null;
  currency: 'USD';
  availability: string;
  fulfillment: string[];
  shippingCost: number | null;
  imageUrl: string | null;
  productUrl: string;
  manufacturer: string | null;
  modelNumber: string | null;
  upc: string | null;
  condition: string | null;
  matchType: 'exact' | 'similar' | 'possible';
  matchReason: string;
  source: 'official-api';
  updatedAt: string;
  sourceUpdatedAt?: string | null;
};

type RetailerConnection = RetailerStatus;

type PriceSearch = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  offers: LivePrice[];
  retailers: RetailerConnection[];
};

type NearbyStoreSearch = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  stores: StoreLocation[];
};

type SearchFilters = {
  sort: 'best' | 'price-low' | 'price-high' | 'distance' | 'total-cost';
  scope: 'both' | 'local' | 'online';
  maxPrice: number | null;
  maxDistance: number | null;
  availability: 'all' | 'available';
  fulfillment: 'all' | 'pickup' | 'shipping';
  retailers: string[];
};

const emptyFilters: SearchFilters = {
  sort: 'best',
  scope: 'both',
  maxPrice: null,
  maxDistance: null,
  availability: 'all',
  fulfillment: 'all',
  retailers: [],
};

function profileSearchFilters(preferences: ProfilePreferences): SearchFilters {
  return {
    ...emptyFilters,
    maxDistance: preferences.searchRadius,
    fulfillment: preferences.fulfillment === 'both' ? 'all' : preferences.fulfillment,
  };
}

type PriceHistoryPoint = { price: number; recordedAt: string };
type CostBreakdown = { item: number; tax: number; shipping: number | null; travel: number | null; total: number; complete: boolean; method: 'Local pickup' | 'Online' };

const suggestionCatalog = [
  { title: 'Sony 55-inch TV', meta: 'Product type', value: 'Sony 55-inch TV' },
  { title: 'Sony BRAVIA TV', meta: 'Brand and product', value: 'Sony BRAVIA TV' },
  { title: 'Apple AirPods Pro', meta: 'Product', value: 'Apple AirPods Pro' },
  { title: 'Nintendo Switch OLED', meta: 'Model family', value: 'Nintendo Switch OLED' },
  { title: 'Samsung OLED TV', meta: 'Brand and product', value: 'Samsung OLED TV' },
  { title: 'LG OLED evo TV', meta: 'Brand and product', value: 'LG OLED evo TV' },
  { title: 'PlayStation 5', meta: 'Product', value: 'PlayStation 5' },
  { title: 'MacBook Air', meta: 'Product', value: 'MacBook Air' },
];

const offers: Offer[] = [
  { store: 'Walmart', price: null, distance: '2.4 mi', color: '#1674ea', mark: '✦', detail: 'Price feed not connected', address: '1011 Shelby Rd', coordinates: [-81.3625539, 35.2384283], mapTier: 1 },
  { store: 'Best Buy', price: null, distance: '14.8 mi', color: '#f4ce12', mark: 'BEST', detail: 'Official API ready', address: '3050 E Franklin Blvd', coordinates: [-81.122254, 35.260018], mapTier: 1 },
  { store: 'Target', price: null, distance: '14.1 mi', color: '#d92332', mark: '◎', detail: 'No public price API', address: '425 Cox Rd', coordinates: [-81.1388478, 35.2645694], mapTier: 1 },
  { store: 'Walmart Shelby', price: null, distance: '17.6 mi', color: '#1674ea', mark: '✦', detail: 'Price feed not connected', address: '705 E Dixon Blvd', coordinates: [-81.5298412, 35.2773291], mapTier: 2 },
  { store: 'Walmart Belmont', price: null, distance: '24.3 mi', color: '#1674ea', mark: '✦', detail: 'Price feed not connected', address: '701 Hawley Ave', coordinates: [-81.0354725, 35.2554193], mapTier: 2 },
  { store: 'Micro Center', price: null, distance: '35.8 mi', color: '#ed1c24', mark: 'MC', detail: 'No public price API', address: '4744 South Blvd', coordinates: [-80.8777176, 35.1746978], mapTier: 3 },
  { store: 'Apple SouthPark', price: null, distance: '39.2 mi', color: '#1d1d1f', mark: '', detail: 'No public retail API', address: '4400 Sharon Rd', coordinates: [-80.831925, 35.1524576], mapTier: 3 },
  { store: 'Walmart Lincolnton', price: null, distance: '31.4 mi', color: '#1674ea', mark: '✦', detail: 'Price feed not connected', address: '306 N Generals Blvd', coordinates: [-81.2409266, 35.483307], mapTier: 3 },
  { store: 'Best Buy Hickory', price: null, distance: '53.6 mi', color: '#f4ce12', mark: 'BEST', detail: 'Official API ready', address: '1884 Catawba Valley Blvd SE', coordinates: [-81.3099218, 35.7010015], mapTier: 3 },
  { store: 'Target Hickory', price: null, distance: '53.5 mi', color: '#d92332', mark: '◎', detail: 'No public price API', address: '1910 Catawba Valley Blvd SE', coordinates: [-81.3083741, 35.7001696], mapTier: 3 },
  { store: 'Walmart Forest City', price: null, distance: '38.1 mi', color: '#1674ea', mark: '✦', detail: 'Price feed not connected', address: '197 Plaza Dr', coordinates: [-81.8995605, 35.3351939], mapTier: 3 },
  { store: 'Walmart Gaffney', price: null, distance: '25.7 mi', color: '#1674ea', mark: '✦', detail: 'Price feed not connected', address: '165 Walton Dr', coordinates: [-81.6659322, 35.0872774], mapTier: 3 },
  { store: 'Best Buy Spartanburg', price: null, distance: '54.9 mi', color: '#f4ce12', mark: 'BEST', detail: 'Official API ready', address: '110 E Blackstock Rd', coordinates: [-81.9924948, 34.935111], mapTier: 3 },
  { store: 'Best Buy Rock Hill', price: null, distance: '37.3 mi', color: '#f4ce12', mark: 'BEST', detail: 'Official API ready', address: '1775 Chamberside Dr', coordinates: [-80.9771687, 34.9387534], mapTier: 3 },
  { store: 'Target Rock Hill', price: null, distance: '37.1 mi', color: '#d92332', mark: '◎', detail: 'No public price API', address: '1900 Springsteen Rd', coordinates: [-80.9783659, 34.9385821], mapTier: 3 },
  { store: 'Best Buy Concord', price: null, distance: '52.4 mi', color: '#f4ce12', mark: 'BEST', detail: 'Official API ready', address: '8111 Concord Mills Blvd', coordinates: [-80.7188018, 35.3684095], mapTier: 3 },
  { store: 'Target Concord', price: null, distance: '55.2 mi', color: '#d92332', mark: '◎', detail: 'No public price API', address: '6150 Bayfield Pkwy', coordinates: [-80.6792366, 35.4170115], mapTier: 3 },
];

function storeVisual(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes('best buy')) return { mark: 'BEST', color: '#f4ce12' };
  if (normalized.includes('target')) return { mark: '◎', color: '#d92332' };
  if (normalized.includes('walmart')) return { mark: '✦', color: '#1674ea' };
  if (normalized.includes('gamestop')) return { mark: 'GS', color: '#d21f2b' };
  if (normalized.includes('apple')) return { mark: '', color: '#1d1d1f' };
  const mark = name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return { mark: mark || 'S', color: '#176b73' };
}

function mappedStoreOffer(store: StoreLocation, home: [number, number]): Offer {
  const visual = storeVisual(store.name);
  return {
    id: store.id,
    store: store.name,
    price: null,
    distance: storeDistanceLabel(home, store.coordinates),
    color: visual.color,
    mark: visual.mark,
    detail: 'Mapped store · verify price and stock',
    address: store.address,
    coordinates: store.coordinates,
    sourceUrl: store.sourceUrl,
  };
}

const MAPLIBRE_VERSION = '5.24.0';
type MapBounds = { contains: (coordinates: [number, number]) => boolean; getSouth: () => number; getWest: () => number; getNorth: () => number; getEast: () => number };
type MapLibreMap = {
  addControl: (control: unknown, position?: string) => void;
  easeTo: (options: { center: [number, number]; zoom: number; duration: number }) => void;
  getBounds: () => MapBounds;
  getZoom: () => number;
  on: (event: string, handler: () => void) => void;
  once: (event: string, handler: () => void) => void;
  remove: () => void;
  resize: () => void;
};
type MapLibreMarker = { setLngLat: (coordinates: [number, number]) => MapLibreMarker; addTo: (map: MapLibreMap) => MapLibreMarker; remove: () => void };
type MapLibreNamespace = {
  Map: new (options: Record<string, unknown>) => MapLibreMap;
  Marker: new (options: { element: HTMLElement; anchor: string }) => MapLibreMarker;
  NavigationControl: new (options: Record<string, unknown>) => unknown;
  AttributionControl: new (options: Record<string, unknown>) => unknown;
  ScaleControl: new (options: Record<string, unknown>) => unknown;
};
let mapLibraryPromise: Promise<MapLibreNamespace> | null = null;

const DIALOG_FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function useAccessibleDialog(onClose: () => void) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => {
      const preferredFocusable = dialogRef.current?.querySelector<HTMLElement>('[data-dialog-initial-focus]');
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR);
      (preferredFocusable ?? firstFocusable ?? dialogRef.current)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (isDialogDismissKey(event.key)) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR));
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const targetIndex = dialogWrapTarget(currentIndex, focusable.length, event.shiftKey);
    if (targetIndex === null) return;
    event.preventDefault();
    focusable[targetIndex]?.focus();
  };

  return { ref: dialogRef, tabIndex: -1, onKeyDown };
}

function loadMapLibrary() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Map requires a browser'));
  const mapWindow = window as typeof window & { maplibregl?: MapLibreNamespace };
  if (mapWindow.maplibregl) return Promise.resolve(mapWindow.maplibregl);
  if (mapLibraryPromise) return mapLibraryPromise;

  mapLibraryPromise = new Promise<MapLibreNamespace>((resolve, reject) => {
    if (!document.querySelector('link[data-dealradar-map]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
      stylesheet.dataset.dealradarMap = 'true';
      document.head.appendChild(stylesheet);
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-dealradar-map]');
    if (existing) {
      existing.addEventListener('load', () => mapWindow.maplibregl ? resolve(mapWindow.maplibregl) : reject(new Error('Map library did not initialize')), { once: true });
      existing.addEventListener('error', () => reject(new Error('Map library failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
    script.async = true;
    script.dataset.dealradarMap = 'true';
    script.onload = () => mapWindow.maplibregl ? resolve(mapWindow.maplibregl) : reject(new Error('Map library did not initialize'));
    script.onerror = () => reject(new Error('Map library failed to load'));
    document.head.appendChild(script);
  });

  return mapLibraryPromise;
}
function useVerifiedPriceSearch(query: string): PriceSearch {
  const [prices, setPrices] = useState<PriceSearch>({ status: 'idle', offers: [], retailers: [] });

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      const idleTimer = window.setTimeout(() => setPrices({ status: 'idle', offers: [], retailers: [] }), 0);
      return () => window.clearTimeout(idleTimer);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPrices(current => ({ ...current, status: 'loading' }));
      try {
        const response = await fetch(`/api/offers?q=${encodeURIComponent(trimmedQuery)}`, { signal: controller.signal });
        const data = await response.json() as { offers?: LivePrice[]; retailers?: RetailerConnection[] };
        if (!response.ok) throw new Error('Price search failed');
        setPrices({ status: 'ready', offers: data.offers ?? [], retailers: data.retailers ?? [] });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setPrices(current => ({ ...current, status: 'error', offers: [] }));
        }
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return prices;
}

function useNearbySearchStores(home: [number, number], radiusMiles: number, enabled: boolean): NearbyStoreSearch {
  const [result, setResult] = useState<NearbyStoreSearch>({ status: 'idle', stores: [] });

  useEffect(() => {
    if (!enabled) {
      const idleTimer = window.setTimeout(() => setResult({ status: 'idle', stores: [] }), 0);
      return () => window.clearTimeout(idleTimer);
    }
    const bounds = storeSearchBounds(home, radiusMiles);
    if (!bounds) {
      const errorTimer = window.setTimeout(() => setResult({ status: 'error', stores: [] }), 0);
      return () => window.clearTimeout(errorTimer);
    }

    const controller = new AbortController();
    const parameters = new URLSearchParams({
      s: String(bounds.south),
      w: String(bounds.west),
      n: String(bounds.north),
      e: String(bounds.east),
    });
    const loadingTimer = window.setTimeout(() => setResult({ status: 'loading', stores: [] }), 0);
    fetch(`/api/stores?${parameters}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json() as { stores?: StoreLocation[] };
        if (!response.ok) throw new Error('Nearby stores could not be loaded');
        setResult({ status: 'ready', stores: data.stores ?? [] });
      })
      .catch(error => {
        if ((error as Error).name !== 'AbortError') setResult({ status: 'error', stores: [] });
      });
    return () => {
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [enabled, home, radiusMiles]);

  return result;
}

function costForOffer(item: LivePrice, scope: SearchFilters['scope'], preferences: Pick<ProfilePreferences, 'salesTaxPercent' | 'travelCostPerMile'> = defaultProfilePreferences, pickupDistance: number | null = null): CostBreakdown {
  return calculateEstimatedTotalCost(item, scope, pickupDistance, preferences.salesTaxPercent / 100, preferences.travelCostPerMile);
}

function recordVerifiedPriceHistory(items: LivePrice[]) {
  if (typeof window === 'undefined' || !items.length) return;
  const stored = JSON.parse(window.localStorage.getItem('dealradar-price-history') ?? '{}') as Record<string, PriceHistoryPoint[]>;
  const now = new Date().toISOString();
  items.forEach(item => {
    const history = stored[item.id] ?? [];
    stored[item.id] = updatePriceHistory(history, item.price, now);
  });
  window.localStorage.setItem('dealradar-price-history', JSON.stringify(stored));
}

function getVerifiedPriceHistory(itemId: string) {
  if (typeof window === 'undefined') return [];
  const stored = JSON.parse(window.localStorage.getItem('dealradar-price-history') ?? '{}') as Record<string, PriceHistoryPoint[]>;
  return stored[itemId] ?? [];
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('Map');
  const [query, setQuery] = useState('Sony 55-inch TV');
  const [savedQuery, setSavedQuery] = useState('');
  const [offer, setOffer] = useState(offers[0]);
  const [toast, setToast] = useState('');
  const [inventoryItem, setInventoryItem] = useState<LivePrice | null>(null);
  const [inventoryChecks, setInventoryChecks] = useState<Record<string, VerifiedInventoryCheck>>({});
  const [preferences, setPreferencesState] = useState<ProfilePreferences>(defaultProfilePreferences);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [navCounts, setNavCounts] = useState<Record<Tab, number>>({ Search: 0, Map: 0, Saved: 0, Alerts: 0, Profile: 0 });
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 1800); };
  const retainInventoryCheck = useCallback((itemId: string, check: VerifiedInventoryCheck) => setInventoryChecks(current => ({ ...current, [itemId]: check })), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreferencesState(parseProfilePreferences(window.localStorage.getItem('dealradar-profile')));
      setOnboardingOpen(shouldShowOnboarding(window.localStorage.getItem('dealradar-onboarding-version')));
      setOnline(window.navigator.onLine);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  useEffect(() => {
    const products = parseSavedProducts(window.localStorage.getItem('dealradar-saved-products'));
    const stores = parseSavedStores(window.localStorage.getItem('dealradar-saved-stores'));
    const timer = window.setTimeout(() => setNavCounts({
        Search: 0,
        Map: 0,
        Saved: products.length + stores.length,
        Alerts: products.filter(item => window.localStorage.getItem(`dealradar-alert-${item.id}`) === 'true').length,
        Profile: 0,
      }), 0);
    return () => window.clearTimeout(timer);
  }, [tab, toast]);
  const setPreferences = (next: ProfilePreferences) => {
    setPreferencesState(next);
    window.localStorage.setItem('dealradar-profile', JSON.stringify(next));
  };
  const finishOnboarding = (next: ProfilePreferences) => {
    setPreferences(next);
    window.localStorage.setItem('dealradar-onboarding-version', ONBOARDING_VERSION);
    setOnboardingOpen(false);
    setQuery('');
    setTab('Search');
    notify('DealRadar is ready');
  };

  return <main className="stage"><section className="phone" aria-label="DealRadar prototype">
    <div className="status"><b>9:41</b><i/><span>▮▮▮ ))) ▰</span></div>
    {!online && <div className="offline-banner" role="status">Offline · Saved items remain available</div>}
    <header><div><h1>Deal<span>Radar</span></h1>{tab !== 'Profile' && <button onClick={() => setTab('Profile')}>● {preferences.locationLabel} {preferences.zipCode}⌄</button>}</div><button className="circle" onClick={() => tab === 'Profile' ? notify('Profile settings are saved on this device') : setTab('Map')} aria-label={tab === 'Profile' ? 'Profile settings status' : 'Open map'}>{tab === 'Profile' ? '⚙' : '➤'}</button></header>
    <div className="content">
      {tab === 'Search' && <Search query={query} setQuery={setQuery} openMap={store => { if (store) setOffer(store); setTab('Map'); }} openConnections={() => setTab('Profile')} notify={notify} preferences={preferences} onCheckInventory={setInventoryItem} inventoryChecks={inventoryChecks}/>}
      {tab === 'Map' && <Map query={query} setQuery={setQuery} offer={offer} setOffer={setOffer} notify={notify} preferences={preferences} onCheckInventory={setInventoryItem} inventoryChecks={inventoryChecks}/>}
      {tab === 'Saved' && <Saved
        query={savedQuery}
        setQuery={setSavedQuery}
        notify={notify}
        home={preferences.coordinates}
        shopProduct={(title: string) => { setQuery(title); setTab('Search'); }}
        browseStores={() => setTab('Map')}
        openStore={(store: SavedStoreRecord) => { setOffer({ ...store, price: null }); setTab('Map'); }}
      />}
      {tab === 'Alerts' && <Alerts
        notify={notify}
        openSaved={() => setTab('Saved')}
        shopProduct={(title: string) => { setQuery(title); setTab('Search'); }}
        preferences={preferences}
      />}
      {tab === 'Profile' && <Profile preferences={preferences} setPreferences={setPreferences} notify={notify} restartOnboarding={() => setOnboardingOpen(true)}/>}
    </div>
    <nav>{tabs.map(item => <button key={item} aria-label={`Open ${item} tab${navCounts[item] ? `, ${navCounts[item]} items` : ''}`} aria-current={tab === item ? 'page' : undefined} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}><b aria-hidden="true">{icons[item]}</b>{item}{navCounts[item] > 0 && <em>{navCounts[item] > 99 ? '99+' : navCounts[item]}</em>}</button>)}</nav>
    {toast && <div className="toast">{toast}</div>}
    {onboardingOpen && <Onboarding
      preferences={preferences}
      onFinish={finishOnboarding}
      onUseDefaults={() => finishOnboarding(defaultProfilePreferences)}
    />}
    {inventoryItem && <InventorySheet item={inventoryItem} zipCode={preferences.zipCode} onVerified={retainInventoryCheck} onClose={() => setInventoryItem(null)}/>}
  </section><aside><b>DealRadar</b><span>Interactive mobile prototype</span><small>Real U.S. stores • Verified price feeds only</small></aside></main>;
}

function Onboarding({ preferences, onFinish, onUseDefaults }: { preferences: ProfilePreferences; onFinish: (preferences: ProfilePreferences) => void; onUseDefaults: () => void }) {
  const [step, setStep] = useState(0);
  const [zip, setZip] = useState(preferences.zipCode);
  const [radius, setRadius] = useState<ProfilePreferences['searchRadius']>(preferences.searchRadius);
  const [fulfillment, setFulfillment] = useState<ProfilePreferences['fulfillment']>(preferences.fulfillment);
  const [resolvedLocation, setResolvedLocation] = useState<ShoppingLocation>({ zipCode: preferences.zipCode, locationLabel: preferences.locationLabel, coordinates: preferences.coordinates, locationPrecision: preferences.locationPrecision });
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const continueFromLocation = async () => {
    if (locationStatus === 'loading') return;
    setLocationStatus('loading');
    try {
      const location = await lookupUsZip(zip);
      setResolvedLocation(location);
      setLocationStatus('idle');
      setStep(2);
    } catch {
      setLocationStatus('error');
    }
  };
  const finish = () => onFinish({ ...preferences, ...resolvedLocation, searchRadius: radius, fulfillment });

  return <section className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><div className="onboarding-progress"><span style={{ width: `${onboardingProgress(step)}%` }}/></div><div className="onboarding-brand">Deal<span>Radar</span><small>{step + 1} of 3</small></div>
    {step === 0 && <div className="onboarding-step welcome"><div className="onboarding-radar" aria-hidden="true"><i/><i/><i/><b>⌖</b><span className="radar-store one">BEST<em>$</em></span><span className="radar-store two">◎<em>Store</em></span><span className="radar-store three">✦<em>Store</em></span></div><small>LOCAL + ONLINE PRICE DISCOVERY</small><h1 id="onboarding-title">Find it cheaper.<br/>Find it closer.</h1><p>DealRadar combines real U.S. store locations with official retailer price feeds so you can compare before you travel or order.</p><div className="onboarding-trust"><span>✓ Real mapped stores</span><span>✓ Verified prices only</span></div><button className="onboarding-primary" onClick={() => setStep(1)}>Set up DealRadar</button><button className="onboarding-secondary" onClick={onUseDefaults}>Use Kings Mountain defaults</button></div>}
    {step === 1 && <div className="onboarding-step setup"><button className="onboarding-back" onClick={() => setStep(0)}>‹ Back</button><small>PERSONALIZE LOCAL RESULTS</small><h1 id="onboarding-title">Where do you shop from?</h1><p>Your ZIP centers the map and estimates store distance. DealRadar does not need your street address.</p><label className="onboarding-zip"><span>Home ZIP code</span><input autoFocus inputMode="numeric" value={zip} onChange={event => { setZip(event.target.value.replace(/\D/g, '').slice(0, 5)); setLocationStatus('idle'); }} placeholder="28086"/></label>{locationStatus === 'error' && <div className="onboarding-error">Enter a valid U.S. ZIP code.</div>}<fieldset><legend>Shopping radius</legend><div className="onboarding-radius">{([5,10,25,50,100] as const).map(value => <button key={value} className={radius === value ? 'selected' : ''} onClick={() => setRadius(value)}>{value} mi</button>)}</div></fieldset><fieldset><legend>Start Search with</legend><div className="onboarding-fulfillment">{([{ value: 'both', label: 'Both' }, { value: 'pickup', label: 'Pickup' }, { value: 'shipping', label: 'Shipping' }] as const).map(option => <button key={option.value} className={fulfillment === option.value ? 'selected' : ''} onClick={() => setFulfillment(option.value)}>{fulfillment === option.value ? '✓ ' : ''}{option.label}</button>)}</div></fieldset><button className="onboarding-primary" disabled={zip.length !== 5 || locationStatus === 'loading'} onClick={continueFromLocation}>{locationStatus === 'loading' ? 'Finding your area…' : 'Continue'}</button></div>}
    {step === 2 && <div className="onboarding-step trust"><button className="onboarding-back" onClick={() => setStep(1)}>‹ Back</button><small>HONEST BY DESIGN</small><h1 id="onboarding-title">Know what’s verified.</h1><p>DealRadar clearly separates mapped locations from connected prices. If a retailer has no approved feed, the app shows “Price unavailable”—never a guess.</p><div className="onboarding-principles"><article><b>✓</b><span><strong>Official price feeds</strong><small>Prices include their retailer and match quality.</small></span></article><article><b>⌖</b><span><strong>Real U.S. locations</strong><small>Stores come from OpenStreetMap records.</small></span></article><article><b>♢</b><span><strong>Private by default</strong><small>Saved items and preferences stay on this device.</small></span></article></div><div className="onboarding-ready"><span>Home area</span><b>{resolvedLocation.locationLabel} {resolvedLocation.zipCode}</b><small>{radius} miles · {fulfillmentLabel(fulfillment)}</small></div><button className="onboarding-primary" onClick={finish}>Start finding deals</button></div>}
  </section>;
}

function Search({ query, setQuery, openMap, openConnections, notify, preferences, onCheckInventory, inventoryChecks }: { query: string; setQuery: (value: string) => void; openMap: (store?: Offer) => void; openConnections: () => void; notify: (message: string) => void; preferences: ProfilePreferences; onCheckInventory: (item: LivePrice) => void; inventoryChecks: Record<string, VerifiedInventoryCheck> }) {
  const priceSearch = useVerifiedPriceSearch(String(query));
  const defaultFilters = useMemo(() => profileSearchFilters(preferences), [preferences]);
  const [filters, setFilters] = useState<SearchFilters>(() => profileSearchFilters(preferences));
  const [draft, setDraft] = useState<SearchFilters>(() => profileSearchFilters(preferences));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<LivePrice | null>(null);
  const [savedProducts, setSavedProducts] = useState<SavedProductRecord[]>([]);
  const isSearching = String(query).trim().length >= 2;
  const localSearchRadius = filters.maxDistance ?? preferences.searchRadius;
  const nearbyStoreSearch = useNearbySearchStores(preferences.coordinates, localSearchRadius, isSearching && filters.scope !== 'online');
  const mappedSearchStores = useMemo(() => nearbyStoreSearch.stores.map(store => ({ store: store.name, coordinates: store.coordinates })), [nearbyStoreSearch.stores]);
  const nearbySearchOffers = useMemo(() => sortMappedStoresByDistance(nearbyStoreSearch.stores.map(store => mappedStoreOffer(store, preferences.coordinates)), preferences.coordinates).filter(store => store.coordinates && milesBetween(preferences.coordinates, store.coordinates) <= localSearchRadius).slice(0, 6), [localSearchRadius, nearbyStoreSearch.stores, preferences.coordinates]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setRecentSearches(JSON.parse(window.localStorage.getItem('dealradar-recent-searches') ?? '[]')); }
      catch { setRecentSearches([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSavedProducts(parseSavedProducts(window.localStorage.getItem('dealradar-saved-products'))), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setFilters(current => ({
        ...current,
        maxDistance: preferences.searchRadius,
        fulfillment: preferences.fulfillment === 'both' ? 'all' : preferences.fulfillment,
      })), 0);
    return () => window.clearTimeout(timer);
  }, [preferences.fulfillment, preferences.searchRadius]);

  useEffect(() => {
    if (priceSearch.status === 'ready') recordVerifiedPriceHistory(priceSearch.offers);
  }, [priceSearch.offers, priceSearch.status]);

  const commitSearch = (value: string) => {
    const next = value.trim();
    if (!next) return;
    setQuery(next);
    setSuggestionsOpen(false);
    setRecentSearches(current => {
      const updated = [next, ...current.filter(item => item.toLowerCase() !== next.toLowerCase())].slice(0, 6);
      window.localStorage.setItem('dealradar-recent-searches', JSON.stringify(updated));
      return updated;
    });
  };

  const suggestions = useMemo(() => {
    const live = priceSearch.offers.map(item => ({ title: item.title, meta: item.modelNumber ? `Model ${item.modelNumber}` : item.retailer, value: item.title }));
    return buildPredictiveSuggestions(String(query), recentSearches, live, suggestionCatalog);
  }, [priceSearch.offers, query, recentSearches]);

  const pickupEvidenceFor = useCallback((item: LivePrice) => inventoryEvidence(inventoryChecks[item.id], item.sku, preferences.zipCode), [inventoryChecks, preferences.zipCode]);
  const distanceForOffer = useCallback((retailer: string, item?: LivePrice) => {
    if (item) {
      const evidence = pickupEvidenceFor(item);
      if (evidence.state === 'available') return evidence.distance;
      if (evidence.state === 'unavailable') return null;
    }
    return nearestRetailerDistance(retailer, preferences.coordinates, mappedSearchStores);
  }, [mappedSearchStores, pickupEvidenceFor, preferences.coordinates]);

  const filteredOffers = useMemo(() => filterAndSortOffers(
    priceSearch.offers,
    filters,
    distanceForOffer,
    item => costForOffer(item, filters.scope, preferences, distanceForOffer(item.retailer, item)),
  ), [distanceForOffer, filters, preferences, priceSearch.offers]);
  const comparedOffers = compareIds.flatMap(id => priceSearch.offers.find(item => item.id === id) ?? []);

  const appliedCount = [
    filters.sort !== 'best', filters.maxPrice !== null, filters.maxDistance !== null,
    filters.availability !== 'all', filters.fulfillment !== 'all', filters.retailers.length > 0,
  ].filter(Boolean).length;
  const beginFiltering = () => { setDraft(filters); setFiltersOpen(true); };
  const saveProduct = (item: LivePrice) => {
    const alreadySaved = savedProducts.some(saved => saved.id === item.id);
    const record: SavedProductRecord = {
      id: item.id,
      title: item.title,
      retailer: item.retailer,
      price: item.price,
      regularPrice: item.regularPrice,
      availability: item.availability,
      productUrl: item.productUrl,
      modelNumber: item.modelNumber,
      savedAt: new Date().toISOString(),
      verifiedAt: item.updatedAt,
    };
    setSavedProducts(current => {
      const next = toggleSavedProduct(current, record);
      window.localStorage.setItem('dealradar-saved-products', JSON.stringify(next));
      return next;
    });
    notify(alreadySaved ? `${item.title} removed from Saved` : `${item.title} saved`);
  };

  return <section className="page search-page">
    <PredictiveSearchBox value={String(query)} setValue={setQuery} suggestions={suggestions} open={suggestionsOpen} setOpen={setSuggestionsOpen} onSelect={commitSearch} onScan={() => setScannerOpen(true)} onClearRecent={() => { setRecentSearches([]); window.localStorage.removeItem('dealradar-recent-searches'); }}/>
    <div className="search-scope" role="group" aria-label="Search local or online stores">{(['local','both','online'] as const).map(scope => <button key={scope} className={filters.scope === scope ? 'active' : ''} onClick={() => setFilters(current => ({ ...current, scope }))}>{scope === 'local' ? '⌖ Local' : scope === 'online' ? '⌂ Online' : '◉ Both'}</button>)}</div>
    {!isSearching ? <>
      {recentSearches.length > 0 && <><p className="label">RECENT SEARCHES</p><div className="recent-pills">{recentSearches.slice(0, 3).map(item => <button className="pill" key={item} onClick={() => commitSearch(item)}>◷ {item}</button>)}</div></>}
      <h2>Popular near you</h2><div className="categories">{[['▰','TVs'],['▱','Laptops'],['◉','Headphones'],['▣','Gaming']].map(x => <button key={x[1]} onClick={() => commitSearch(x[1])}><b>{x[0]}</b><span>{x[1]}</span><i>›</i></button>)}</div>
    </> : <>
      <div className="search-filter-bar">
        <button className="filter-main" onClick={beginFiltering}><span>☷</span> Filters {appliedCount > 0 && <b>{appliedCount}</b>}</button>
        <button className={filters.fulfillment === 'pickup' ? 'active' : ''} onClick={() => setFilters(current => ({ ...current, fulfillment: current.fulfillment === 'pickup' ? 'all' : 'pickup' }))}>Pickup</button>
        <button className={filters.availability === 'available' ? 'active' : ''} onClick={() => setFilters(current => ({ ...current, availability: current.availability === 'available' ? 'all' : 'available' }))}>In stock</button>
        <button className={filters.maxPrice === 500 ? 'active' : ''} onClick={() => setFilters(current => ({ ...current, maxPrice: current.maxPrice === 500 ? null : 500 }))}>Under $500</button>
      </div>
      <div className="search-result-heading"><div><small>{filters.scope.toUpperCase()} · VERIFIED RETAILER RESULTS</small><h2>{priceSearch.status === 'loading' ? 'Searching…' : `${filteredOffers.length} results`}</h2></div><button onClick={beginFiltering}>{filters.sort === 'best' ? 'Best match' : filters.sort === 'price-low' ? 'Lowest price' : filters.sort === 'price-high' ? 'Highest price' : filters.sort === 'total-cost' ? 'Total cost' : 'Nearest'}⌄</button></div>
      {priceSearch.status === 'ready' && priceSearch.offers.length > 0 && <p className="search-cost-note">Planning totals use your Profile assumptions: {preferences.salesTaxPercent.toFixed(2)}% tax · ${preferences.travelCostPerMile.toFixed(2)}/mi round trip.</p>}
      {priceSearch.status !== 'idle' && filters.scope !== 'online' && <div className={`search-location-evidence ${nearbyStoreSearch.status}`}><i>{nearbyStoreSearch.status === 'loading' ? '◌' : nearbyStoreSearch.status === 'ready' ? '⌖' : '!'}</i><span><b>{nearbyStoreSearch.status === 'loading' ? `Finding real stores near ${preferences.locationLabel}…` : nearbyStoreSearch.status === 'ready' ? `${nearbySearchOffers.length} nearby real stores found` : 'Nearby map data unavailable'}</b><small>{nearbyStoreSearch.status === 'ready' ? `Planning distances use mapped stores within ${localSearchRadius} miles; run Check pickup for live stock.` : nearbyStoreSearch.status === 'error' ? 'Local distance stays hidden until a mapped store or official pickup check is available.' : 'Local results will update when nearby stores load.'}</small></span></div>}
      {priceSearch.status === 'loading' && <div className="search-loading"><span/><b>Checking official price feeds</b><small>Prices are never estimated.</small></div>}
      {priceSearch.status === 'error' && <div className="search-no-results"><b>Search is temporarily unavailable</b><span>Try again in a moment.</span></div>}
      {priceSearch.status === 'ready' && filteredOffers.length > 0 && <div className="search-results">{filteredOffers.map(item => {
        const pickupEvidence = pickupEvidenceFor(item);
        const distance = distanceForOffer(item.retailer, item);
        const cost = costForOffer(item, filters.scope, preferences, distance);
        const freshness = formatVerificationFreshness(item.updatedAt);
        const selected = compareIds.includes(item.id);
        const saved = savedProducts.some(savedItem => savedItem.id === item.id);
        const ships = item.fulfillment.some(option => option.toLowerCase().includes('shipping'));
        const proximity = pickupEvidence.state === 'unavailable' ? 'Online · no pickup stock' : distance === null ? ships ? 'Online · local distance unavailable' : 'Local distance unavailable' : `${distance.toFixed(1)} mi · ${pickupEvidence.state === 'available' ? `retailer pickup near ${preferences.zipCode}` : 'mapped store planning'}`;
        return <article key={item.id} className={selected ? 'selected-for-compare' : ''}><button className="compare-check" aria-label={`${selected ? 'Remove' : 'Add'} ${item.title} ${selected ? 'from' : 'to'} comparison`} onClick={() => setCompareIds(current => toggleComparison(current, item.id))}>{selected ? '✓' : '+'}</button><button className={`save-result ${saved ? 'saved' : ''}`} aria-label={`${saved ? 'Remove' : 'Save'} ${item.title}`} onClick={() => saveProduct(item)}>{saved ? '♥' : '♡'}</button><div className="result-brand">{item.retailer === 'Best Buy' ? 'BEST' : item.retailer.slice(0, 2).toUpperCase()}</div><div className="result-copy"><small>{item.retailer} · {proximity}</small><h3>{item.title}</h3>{item.modelNumber && <span>Model {item.modelNumber}</span>}<span>{item.availability}{item.fulfillment.length ? ` · ${item.fulfillment.join(' & ')}` : ''}</span><div className="result-badges"><b title={item.matchReason} className={`match-${item.matchType}`}>{item.matchType === 'exact' ? '✓ Exact match' : item.matchType === 'similar' ? '≈ Similar model' : '? Possible match'}</b><b className={freshness.stale ? 'verification-stale' : 'verification-fresh'}>{freshness.label}</b>{pickupEvidence.state !== 'unverified' && <b className={pickupEvidence.state === 'available' ? 'inventory-available' : 'inventory-unavailable'}>{pickupEvidence.state === 'available' ? `✓ ${pickupEvidence.storeCount} in-stock ${pickupEvidence.storeCount === 1 ? 'store' : 'stores'}` : 'No nearby pickup stock'}</b>}</div></div><div className="result-price"><strong>${item.price.toFixed(2)}</strong>{item.regularPrice && item.regularPrice > item.price ? <small>was ${item.regularPrice.toFixed(2)}</small> : null}<em>{cost.complete ? `Est. total $${cost.total.toFixed(2)}` : `Partial $${cost.total.toFixed(2)} + shipping`}<span>{cost.method === 'Local pickup' ? pickupEvidence.state === 'available' ? `Retailer distance from ZIP ${preferences.zipCode}` : 'Mapped-store planning · verify pickup' : cost.method}</span></em>{item.fulfillment.some(option => option.toLowerCase().includes('pickup')) && <button className="pickup-check" onClick={() => onCheckInventory(item)}>{pickupEvidence.state === 'available' ? `✓ ${pickupEvidence.storeCount} pickup ${pickupEvidence.storeCount === 1 ? 'store' : 'stores'}` : pickupEvidence.state === 'unavailable' ? '↻ Recheck pickup' : '⌖ Check pickup'}</button>}<button onClick={() => setHistoryItem(item)}>⌁ Price history</button><a href={item.productUrl} target="_blank" rel="noreferrer">View deal ›</a></div></article>;
      })}</div>}
      {priceSearch.status === 'ready' && filteredOffers.length === 0 && <div className="search-no-results"><b>{priceSearch.offers.length ? 'No results match these filters' : 'No verified prices yet'}</b><span>{priceSearch.offers.length ? 'Change or reset your filters to see more options.' : 'An approved retailer feed is still needed for live prices. Nearby real stores remain available below.'}</span>{appliedCount > 0 && <button onClick={() => setFilters(defaultFilters)}>Reset filters</button>}{!priceSearch.offers.length && <button onClick={openConnections}>View retailer status</button>}<button className="map-link" onClick={() => openMap()}>Browse every store on the map</button></div>}
      {(priceSearch.status === 'ready' || priceSearch.status === 'error') && !priceSearch.offers.length && filters.scope !== 'online' && nearbySearchOffers.length > 0 && <NearbySearchStoreResults stores={nearbySearchOffers} home={preferences.coordinates} radius={localSearchRadius} onOpen={openMap}/>}
    </>}
    {filtersOpen && <SearchFilterSheet
      draft={draft}
      setDraft={setDraft}
      resetFilters={defaultFilters}
      onClose={() => setFiltersOpen(false)}
      onApply={() => { setFilters(draft); setFiltersOpen(false); }}
    />}
    {scannerOpen && <BarcodeScanner
      onClose={() => setScannerOpen(false)}
      onFound={code => { commitSearch(code); setScannerOpen(false); }}
    />}
    {compareIds.length > 0 && <div className="compare-tray"><span><b>{compareIds.length}</b> selected</span><button disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)}>Compare {compareIds.length < 2 ? 'one more item' : `${compareIds.length} items`}</button><button aria-label="Clear comparison" onClick={() => setCompareIds([])}>×</button></div>}
    {compareOpen && <CompareSheet
      items={comparedOffers}
      scope={filters.scope}
      preferences={preferences}
      inventoryChecks={inventoryChecks}
      mappedStores={mappedSearchStores}
      onClose={() => setCompareOpen(false)}
    />}
    {historyItem && <PriceHistorySheet
      item={historyItem}
      onClose={() => setHistoryItem(null)}
    />}
  </section>;
}

function NearbySearchStoreResults({ stores, home, radius, onOpen }: { stores: Offer[]; home: [number, number]; radius: number; onOpen: (store: Offer) => void }) {
  return <section className="nearby-search-stores" aria-labelledby="nearby-search-title"><div className="nearby-search-head"><div><small>REAL MAPPED LOCATIONS</small><h2 id="nearby-search-title">Nearby stores to check</h2></div><span>Within {radius} mi</span></div><p>These electronics and department stores may carry the item. Their location is mapped, but price and stock are not verified.</p><div className="nearby-search-list">{stores.map(store => <article key={store.id ?? store.store}><b className="nearby-store-logo" style={{ background: store.color }}>{store.mark}</b><span><strong>{store.store}</strong><small>{store.coordinates ? storeDistanceLabel(home, store.coordinates) : store.distance}</small><em>{store.address}</em><nav><button onClick={() => onOpen(store)}>Show on map</button>{store.coordinates && <><a href={appleMapsDirectionsUrl(home, store.coordinates)} target="_blank" rel="noreferrer">Apple Maps</a><a href={googleMapsDirectionsUrl(home, store.coordinates)} target="_blank" rel="noreferrer">Google Maps</a></>}{store.sourceUrl && <a href={store.sourceUrl} target="_blank" rel="noreferrer">Verify source</a>}</nav></span></article>)}</div><MapDataAttribution list/></section>;
}

function PredictiveSearchBox({ value, setValue, suggestions, open, setOpen, onSelect, onScan, onClearRecent }: { value: string; setValue: (value: string) => void; suggestions: { title: string; meta: string; value: string }[]; open: boolean; setOpen: (open: boolean) => void; onSelect: (value: string) => void; onScan: () => void; onClearRecent: () => void }) {
  return <div className="predictive-search"><div className="searchbox"><b aria-hidden="true">⌕</b><input aria-label="Search products, brands, models, or UPCs" value={value} onChange={event => { setValue(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={event => { if (event.key === 'Enter') onSelect(value); if (event.key === 'Escape') setOpen(false); }} placeholder="Product, brand, model, or UPC" autoComplete="off" enterKeyHint="search"/><button type="button" className="scan-button" onMouseDown={event => event.preventDefault()} onClick={onScan} aria-label="Scan a product barcode">▥<span>Scan</span></button></div>
    {open && suggestions.length > 0 && <div className="search-suggestions" role="listbox" aria-label="Search suggestions"><div><b>{suggestions.some(item => item.meta === 'Recent search') ? 'Suggestions and recent searches' : 'Suggestions'}</b>{suggestions.some(item => item.meta === 'Recent search') && <button onMouseDown={event => event.preventDefault()} onClick={onClearRecent}>Clear recent</button>}</div>{suggestions.map(item => <button role="option" aria-selected="false" key={`${item.meta}-${item.value}`} onMouseDown={event => event.preventDefault()} onClick={() => onSelect(item.value)}><span>{item.meta === 'Recent search' ? '◷' : item.meta.startsWith('Model') ? '▦' : '⌕'}</span><b>{item.title}<small>{item.meta}</small></b><em>›</em></button>)}</div>}
  </div>;
}

type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

function BarcodeScanner({ onClose, onFound }: { onClose: () => void; onFound: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState('Starting camera…');
  const dialog = useAccessibleDialog(onClose);

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;
    let scanTimer = 0;

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!active || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const Detector = (window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
        if (!Detector) {
          setStatus('Camera preview ready. Enter the UPC below on this device.');
          return;
        }
        const detector = new Detector({ formats: ['upc_a', 'upc_e', 'ean_13', 'ean_8'] });
        setStatus('Center the barcode inside the frame');
        const scan = async () => {
          if (!active || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            const code = normalizeBarcode(results[0]?.rawValue ?? '');
            if (code) { onFound(code); return; }
          } catch { /* Keep scanning while individual frames are unreadable. */ }
          scanTimer = window.setTimeout(scan, 350);
        };
        scan();
      } catch {
        if (active) setStatus('Camera access is unavailable. Enter the UPC manually.');
      }
    };
    start();
    return () => {
      active = false;
      window.clearTimeout(scanTimer);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [onFound]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const code = normalizeBarcode(manualCode);
    if (code) onFound(code);
    else setStatus('Enter a valid 8–14 digit UPC or EAN code.');
  };

  return <div className="filter-backdrop scanner-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section {...dialog} className="barcode-sheet" role="dialog" aria-modal="true" aria-labelledby="scanner-title"><div className="filter-sheet-head"><div><small>EXACT PRODUCT SEARCH</small><h2 id="scanner-title">Scan barcode</h2></div><button onClick={onClose} aria-label="Close barcode scanner">×</button></div><div className="camera-view"><video ref={videoRef} muted playsInline/><span/><b>UPC / EAN</b></div><p role="status" aria-live="polite">{status}</p><form onSubmit={submit}><label><span>Enter barcode manually</span><input inputMode="numeric" autoComplete="off" value={manualCode} onChange={event => setManualCode(event.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="8–14 digit code"/></label><button type="submit">Search exact product</button></form><small className="privacy-note">Camera video stays on this device and is never uploaded.</small></section></div>;
}

function CompareSheet({ items, scope, preferences, inventoryChecks, mappedStores, onClose }: { items: LivePrice[]; scope: SearchFilters['scope']; preferences: ProfilePreferences; inventoryChecks: Record<string, VerifiedInventoryCheck>; mappedStores: Array<{ store: string; coordinates: [number, number] }>; onClose: () => void }) {
  const dialog = useAccessibleDialog(onClose);
  return <div className="filter-backdrop compare-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section {...dialog} className="compare-sheet" role="dialog" aria-modal="true" aria-labelledby="compare-title"><div className="filter-sheet-head"><div><small>SIDE-BY-SIDE</small><h2 id="compare-title">Compare {items.length} deals</h2></div><button onClick={onClose} aria-label="Close comparison">×</button></div><div className="compare-grid">{items.map(item => {
    const pickupEvidence = inventoryEvidence(inventoryChecks[item.id], item.sku, preferences.zipCode);
    const distance = pickupEvidence.state === 'available' ? pickupEvidence.distance : pickupEvidence.state === 'unavailable' ? null : nearestRetailerDistance(item.retailer, preferences.coordinates, mappedStores);
    const cost = costForOffer(item, scope, preferences, distance);
    const freshness = formatVerificationFreshness(item.updatedAt);
    return <article key={item.id}><div className="compare-brand">{item.retailer}</div><h3>{item.title}</h3><dl><div><dt>Item price</dt><dd>${item.price.toFixed(2)}</dd></div><div className="total"><dt>{cost.complete ? 'Estimated total' : 'Partial total'}</dt><dd>${cost.total.toFixed(2)}{!cost.complete && ' + shipping'}</dd></div><div><dt>Price verified</dt><dd className={freshness.stale ? 'stale-copy' : ''}>{freshness.label.replace(/^Verified /, '')}</dd></div><div><dt>Pickup inventory</dt><dd className={pickupEvidence.state === 'available' ? 'confirmed-copy' : pickupEvidence.state === 'unavailable' ? 'stale-copy' : ''}>{pickupEvidence.state === 'available' ? `${pickupEvidence.storeCount} in-stock ${pickupEvidence.storeCount === 1 ? 'store' : 'stores'}` : pickupEvidence.state === 'unavailable' ? 'None near ZIP' : 'Not checked'}</dd></div><div><dt>Tax estimate</dt><dd>${cost.tax.toFixed(2)}</dd></div><div><dt>Shipping</dt><dd>{cost.shipping === null ? 'Not provided' : cost.shipping === 0 ? 'Free' : `$${cost.shipping.toFixed(2)}`}</dd></div><div><dt>Round-trip travel</dt><dd>{cost.travel === null ? 'Not applicable' : `$${cost.travel.toFixed(2)}`}</dd></div><div><dt>Distance</dt><dd>{distance === null ? 'Online' : `${distance.toFixed(1)} mi${pickupEvidence.state === 'available' ? ' verified' : ' planning'}`}</dd></div><div><dt>Availability</dt><dd>{item.availability}</dd></div><div><dt>Fulfillment</dt><dd>{item.fulfillment.join(' / ') || 'Not provided'}</dd></div><div><dt>Model match</dt><dd>{item.matchType}</dd></div><div><dt>Returns</dt><dd><a href={item.productUrl} target="_blank" rel="noreferrer">See retailer policy</a></dd></div></dl></article>;
  })}</div><p className="cost-disclaimer">Totals use verified item prices, official shipping when supplied, your {preferences.salesTaxPercent.toFixed(2)}% tax assumption, and ${preferences.travelCostPerMile.toFixed(2)} per round-trip mile. Pickup totals use the nearest mapped retailer for planning; run Check pickup to verify an in-stock store. Confirm final tax and shipping at checkout.</p></section></div>;
}

type InventoryLookup = {
  status: 'loading' | 'ready' | 'error';
  stores: InventoryStore[];
  checkedAt: string | null;
  ispuEligible: boolean;
  message: string;
};

function InventorySheet({ item, zipCode, onVerified, onClose }: { item: LivePrice; zipCode: string; onVerified: (itemId: string, check: VerifiedInventoryCheck) => void; onClose: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [lookup, setLookup] = useState<InventoryLookup>({ status: 'loading', stores: [], checkedAt: null, ispuEligible: true, message: '' });
  const dialog = useAccessibleDialog(onClose);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/inventory?sku=${encodeURIComponent(item.sku)}&zip=${encodeURIComponent(zipCode)}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const data = await response.json() as { stores?: InventoryStore[]; checkedAt?: string; ispuEligible?: boolean; error?: string };
        if (!response.ok) throw new Error(data.error || 'Pickup availability could not be checked.');
        if (!data.checkedAt || !Number.isFinite(Date.parse(data.checkedAt))) throw new Error('Pickup verification time was unavailable.');
        const check: VerifiedInventoryCheck = { sku: item.sku, zipCode, checkedAt: data.checkedAt, ispuEligible: data.ispuEligible !== false, stores: data.stores ?? [] };
        setLookup({ status: 'ready', stores: check.stores, checkedAt: check.checkedAt, ispuEligible: check.ispuEligible, message: '' });
        onVerified(item.id, check);
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setLookup({ status: 'error', stores: [], checkedAt: null, ispuEligible: true, message: error instanceof Error ? error.message : 'Pickup availability could not be checked.' });
      });
    return () => controller.abort();
  }, [attempt, item.id, item.sku, onVerified, zipCode]);

  const freshness = formatVerificationFreshness(lookup.checkedAt);
  const retry = () => {
    setLookup({ status: 'loading', stores: [], checkedAt: null, ispuEligible: true, message: '' });
    setAttempt(current => current + 1);
  };
  return <div className="filter-backdrop inventory-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section {...dialog} className="inventory-sheet" role="dialog" aria-modal="true" aria-labelledby="inventory-title"><div className="filter-sheet-head"><div><small>OFFICIAL STORE INVENTORY</small><h2 id="inventory-title">Pickup near {zipCode}</h2></div><button onClick={onClose} aria-label="Close pickup availability">×</button></div><h3>{item.title}</h3><div className="inventory-price"><span><small>CATALOG PRICE</small><strong>${item.price.toFixed(2)}</strong></span><b className={lookup.status === 'ready' ? 'ready' : ''}>{lookup.status === 'loading' ? 'Checking stores…' : lookup.status === 'ready' ? freshness.label : 'Check unavailable'}</b></div>{lookup.status === 'loading' && <div className="inventory-loading" role="status"><i/><span>Checking Best Buy’s official store inventory</span></div>}{lookup.status === 'error' && <div className="inventory-error" role="status"><b>Pickup check unavailable</b><span>{lookup.message}</span><button onClick={retry}>Try again</button></div>}{lookup.status === 'ready' && !lookup.ispuEligible && <div className="inventory-empty" role="status"><b>Pickup is not offered for this item</b><span>The official feed does not list this product as store-pickup eligible.</span></div>}{lookup.status === 'ready' && lookup.ispuEligible && lookup.stores.length === 0 && <div className="inventory-empty" role="status"><b>No pickup stores reported</b><span>No in-stock Best Buy location was returned within 250 miles of {zipCode}.</span></div>}{lookup.status === 'ready' && lookup.stores.length > 0 && <div className="inventory-store-list">{lookup.stores.slice(0, 12).map(store => <article key={store.storeId}><div><span><b>{store.name.startsWith('Best Buy') ? store.name : `Best Buy ${store.name}`}</b>{store.lowStock && <em>Low stock</em>}</span><small>{store.distance.toFixed(1)} mi · {store.address}</small><small>{store.city}, {store.state} {store.postalCode}</small><p>{store.minPickupHours === null ? 'Pickup timing shown by retailer at checkout' : store.minPickupHours === 0 ? 'Pickup may be available today' : `Ready in at least ${store.minPickupHours} ${store.minPickupHours === 1 ? 'hour' : 'hours'}`}</p></div><nav aria-label={`Directions to ${store.name}`}><a href={inventoryDirectionsUrl(store, 'apple')} target="_blank" rel="noreferrer">Apple Maps</a><a href={inventoryDirectionsUrl(store, 'google')} target="_blank" rel="noreferrer">Google Maps</a></nav></article>)}</div>}<a className="inventory-product-link" href={item.productUrl} target="_blank" rel="noreferrer">Confirm and reserve at Best Buy ›</a><p className="inventory-disclaimer">Only stores reported in stock by the official retailer feed are shown. Inventory can change before arrival; confirm pickup and final price with the retailer.</p></section></div>;
}

function PriceHistorySheet({ item, onClose }: { item: LivePrice; onClose: () => void }) {
  const [history] = useState<PriceHistoryPoint[]>(() => getVerifiedPriceHistory(item.id));
  const [alertOn, setAlertOn] = useState(() => window.localStorage.getItem(`dealradar-alert-${item.id}`) === 'true');
  const dialog = useAccessibleDialog(onClose);
  const prices = history.map(point => point.price);
  const minimum = Math.min(...prices, item.price);
  const maximum = Math.max(...prices, item.price);
  const spread = Math.max(1, maximum - minimum);
  const toggleAlert = () => {
    const next = !alertOn;
    setAlertOn(next);
    window.localStorage.setItem(`dealradar-alert-${item.id}`, String(next));
    if (next) {
      const saved = parseSavedProducts(window.localStorage.getItem('dealradar-saved-products'));
      if (!saved.some(product => product.id === item.id)) {
        const record: SavedProductRecord = {
          id: item.id,
          title: item.title,
          retailer: item.retailer,
          price: item.price,
          regularPrice: item.regularPrice,
          availability: item.availability,
          productUrl: item.productUrl,
          modelNumber: item.modelNumber,
          savedAt: new Date().toISOString(),
          verifiedAt: item.updatedAt,
        };
        window.localStorage.setItem('dealradar-saved-products', JSON.stringify([record, ...saved]));
      }
    }
  };

  return <div className="filter-backdrop history-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section {...dialog} className="history-sheet" role="dialog" aria-modal="true" aria-labelledby="history-title"><div className="filter-sheet-head"><div><small>VERIFIED OBSERVATIONS</small><h2 id="history-title">Price history</h2></div><button onClick={onClose} aria-label="Close price history">×</button></div><h3>{item.title}</h3><div className="history-current"><span>Current official price</span><strong>${item.price.toFixed(2)}</strong></div>{history.length > 1 ? <><div className="history-chart" aria-label={`${history.length} saved price observations`}>{history.map((point, index) => <i key={`${point.recordedAt}-${index}`} style={{ height: `${24 + ((point.price - minimum) / spread) * 58}%` }} title={`${new Date(point.recordedAt).toLocaleDateString()}: $${point.price.toFixed(2)}`}/>)}</div><div className="history-range"><span>Low ${minimum.toFixed(2)}</span><span>High ${maximum.toFixed(2)}</span></div></> : <div className="history-empty"><b>First verified price saved</b><span>DealRadar will build this chart as official prices are observed over time.</span></div>}<button className={`history-alert ${alertOn ? 'active' : ''}`} onClick={toggleAlert}>{alertOn ? '✓ Price alert active' : '♧ Alert me when the price drops'}</button><p>Turning on an alert also saves this verified product. History is recorded from connected official retailer feeds on this device; no past prices are invented.</p></section></div>;
}

function SearchFilterSheet({ draft, setDraft, resetFilters, onClose, onApply }: { draft: SearchFilters; setDraft: (filters: SearchFilters) => void; resetFilters: SearchFilters; onClose: () => void; onApply: () => void }) {
  const retailerOptions = ['Best Buy', 'Walmart', 'Amazon', 'Target', 'Apple', 'Micro Center'];
  const dialog = useAccessibleDialog(onClose);
  const update = (change: Partial<SearchFilters>) => setDraft({ ...draft, ...change });
  const toggleRetailer = (retailer: string) => update({ retailers: draft.retailers.includes(retailer) ? draft.retailers.filter(item => item !== retailer) : [...draft.retailers, retailer] });

  return <div className="filter-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section {...dialog} className="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title"><div className="filter-sheet-head"><div><small>REFINE RESULTS</small><h2 id="filter-title">Search filters</h2></div><button onClick={onClose} aria-label="Close filters">×</button></div>
    <label className="filter-field"><span>Sort results</span><select value={draft.sort} onChange={event => update({ sort: event.target.value as SearchFilters['sort'] })}><option value="best">Best match</option><option value="total-cost">Estimated total cost</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="distance">Distance: nearest first</option></select></label>
    <div className="filter-grid"><label className="filter-field"><span>Maximum price</span><select value={draft.maxPrice ?? ''} onChange={event => update({ maxPrice: event.target.value ? Number(event.target.value) : null })}><option value="">Any price</option><option value="100">Under $100</option><option value="250">Under $250</option><option value="500">Under $500</option><option value="1000">Under $1,000</option><option value="2000">Under $2,000</option></select></label><label className="filter-field"><span>Local store distance</span><select value={draft.maxDistance ?? ''} onChange={event => update({ maxDistance: event.target.value ? Number(event.target.value) : null })}><option value="">Any distance</option><option value="5">Within 5 miles</option><option value="10">Within 10 miles</option><option value="25">Within 25 miles</option><option value="50">Within 50 miles</option></select></label></div>
    <fieldset><legend>Availability</legend><div className="filter-options">{[['all','Any availability'],['available','In stock only']].map(option => <button key={option[0]} className={draft.availability === option[0] ? 'selected' : ''} onClick={() => update({ availability: option[0] as SearchFilters['availability'] })}>{draft.availability === option[0] ? '✓ ' : ''}{option[1]}</button>)}</div></fieldset>
    <fieldset><legend>Fulfillment</legend><div className="filter-options">{[['all','Any'],['pickup','Pickup'],['shipping','Shipping']].map(option => <button key={option[0]} className={draft.fulfillment === option[0] ? 'selected' : ''} onClick={() => update({ fulfillment: option[0] as SearchFilters['fulfillment'] })}>{draft.fulfillment === option[0] ? '✓ ' : ''}{option[1]}</button>)}</div></fieldset>
    <fieldset><legend>Retailers</legend><div className="retailer-options">{retailerOptions.map(retailer => <button key={retailer} className={draft.retailers.includes(retailer) ? 'selected' : ''} onClick={() => toggleRetailer(retailer)}>{draft.retailers.includes(retailer) ? '✓ ' : ''}{retailer}</button>)}</div></fieldset>
    <div className="filter-actions"><button onClick={() => setDraft(resetFilters)}>Reset to Profile</button><button className="apply" onClick={onApply}>Show results</button></div>
  </section></div>;
}
function SearchBox({ value, setValue, placeholder }: { value: string; setValue: (value: string) => void; placeholder?: string }) { return <label className="searchbox"><b aria-hidden="true">⌕</b><input aria-label={placeholder || 'Search products'} value={value} onChange={event => setValue(event.target.value)} placeholder={placeholder}/></label> }
type MapView = { radius: number; count: number };
type MapFocusRequest = { id: string; coordinates: [number, number]; nonce: number } | null;

function MapDataAttribution({ list = false }: { list?: boolean }) {
  return <div className={`map-data-attribution${list ? ' list-attribution' : ''}`} aria-label="Map data attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a><span>·</span><a href="https://openfreemap.org/" target="_blank" rel="noreferrer">Tiles by OpenFreeMap</a></div>;
}

function InteractiveMap({ offer, setOffer, view, setView, filters, verifiedRetailers, onVisibleStores, active, focusRequest, home, homePrecision }: { offer: Offer; setOffer: (offer: Offer) => void; view: MapView; setView: (view: MapView) => void; filters: MapStoreFilters; verifiedRetailers: string[]; onVisibleStores: (stores: Offer[]) => void; active: boolean; focusRequest: MapFocusRequest; home: [number, number]; homePrecision: ProfilePreferences['locationPrecision'] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const initialFocusRef = useRef(focusRequest);
  const selectedOfferRef = useRef(offer);
  const filtersRef = useRef(filters);
  const verifiedRetailersRef = useRef(verifiedRetailers);
  const visibleStoresCallbackRef = useRef(onVisibleStores);
  const visibilityUpdaterRef = useRef<() => void>(() => undefined);
  const refreshStoresRef = useRef<() => void>(() => undefined);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [needsZoom, setNeedsZoom] = useState(false);
  const [discoveryError, setDiscoveryError] = useState(false);

  useEffect(() => {
    selectedOfferRef.current = offer;
  }, [offer]);

  useEffect(() => {
    filtersRef.current = filters;
    verifiedRetailersRef.current = verifiedRetailers;
    visibleStoresCallbackRef.current = onVisibleStores;
    visibilityUpdaterRef.current();
  }, [filters, onVisibleStores, verifiedRetailers]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => mapRef.current?.resize(), 0);
    return () => window.clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    if (!focusRequest || !mapRef.current) return;
    mapRef.current.easeTo({ center: focusRequest.coordinates, zoom: Math.max(mapRef.current.getZoom(), 12), duration: 650 });
  }, [focusRequest]);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    const markers: { marker: MapLibreMarker; element: HTMLElement; offer?: Offer }[] = [];
    let liveMarkers: { marker: MapLibreMarker; element: HTMLElement; offer?: Offer }[] = [];
    let searchController: AbortController | null = null;
    let refreshTimer = 0;
    const storeCache = new globalThis.Map<string, Offer[]>();

    loadMapLibrary().then((maplibregl) => {
      if (cancelled || !containerRef.current) return;

      const activeMap = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: initialFocusRef.current?.coordinates ?? home,
        zoom: initialFocusRef.current ? 12 : 10.35,
        minZoom: 3.4,
        maxZoom: 18,
        maxBounds: [[-171, 18], [-66, 72]],
        renderWorldCopies: false,
        attributionControl: false,
      });
      map = activeMap;
      mapRef.current = activeMap;
      activeMap.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
      activeMap.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      activeMap.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'imperial' }), 'bottom-left');

      const homeMarker = document.createElement('div');
      homeMarker.className = `map-home-marker${homePrecision === 'device' ? ' precise' : ''}`;
      homeMarker.setAttribute('aria-label', homePrecision === 'device' ? 'Precise device distance origin' : 'Saved ZIP-center distance origin');
      homeMarker.innerHTML = `<span>${homePrecision === 'device' ? '•' : '⌂'}</span>`;
      markers.push({ marker: new maplibregl.Marker({ element: homeMarker, anchor: 'center' }).setLngLat(home).addTo(activeMap), element: homeMarker });

      const createOfferMarker = (item: Offer, live = false) => {
        const marker = document.createElement('button');
        marker.type = 'button';
        marker.className = `price-marker${live ? ' live-store-marker' : ''}${item.price === null ? ' no-price' : ''}`;
        marker.dataset.offerId = item.id ?? item.store;
        const priceLabel = item.price === null ? 'price feed unavailable' : `$${item.price}`;
        const distanceLabel = item.coordinates ? storeDistanceLabel(home, item.coordinates) : item.distance;
        marker.setAttribute('aria-label', `${item.store}, ${priceLabel}, ${distanceLabel}`);
        marker.style.setProperty('--marker-color', item.color);
        const brand = document.createElement('span');
        brand.textContent = item.mark;
        const price = document.createElement('strong');
        price.textContent = item.price === null ? 'Store' : `$${item.price}`;
        marker.appendChild(brand);
        marker.appendChild(price);
        marker.addEventListener('click', () => setOffer(item));
        return { marker: new maplibregl.Marker({ element: marker, anchor: 'bottom' }).setLngLat(item.coordinates!).addTo(activeMap), element: marker, offer: item };
      };

      offers.filter(item => item.coordinates).forEach((item) => {
        markers.push(createOfferMarker(item));
      });

      const getRadius = () => {
        const zoom = activeMap.getZoom();
        return zoom >= 10.2 ? 20
          : zoom >= 9.2 ? 30
            : zoom >= 8.2 ? 45
              : zoom >= 7 ? 80
                : zoom >= 5.5 ? 250
                  : zoom >= 4 ? 600
                    : 1500;
      };

      const updateVisibleStores = () => {
        const bounds = activeMap.getBounds();
        const visibleCandidates = [...markers, ...liveMarkers].flatMap(entry => entry.offer?.coordinates && bounds.contains(entry.offer.coordinates) ? [entry.offer] : []);
        const filteredOffers = filterMappedStores(
          visibleCandidates,
          filtersRef.current,
          verifiedRetailersRef.current,
          item => item.coordinates ? milesBetween(home, item.coordinates) : null,
        );
        const visibleIds = new Set(filteredOffers.map(item => item.id ?? item.store));
        markers.forEach(entry => {
          if (!entry.offer) return;
          const hidden = !entry.offer.coordinates || !bounds.contains(entry.offer.coordinates) || !visibleIds.has(entry.offer.id ?? entry.offer.store);
          entry.element.classList.toggle('marker-hidden', hidden);
          entry.element.hidden = hidden;
          entry.element.setAttribute('aria-hidden', String(hidden));
        });
        liveMarkers.forEach(entry => {
          if (!entry.offer) return;
          const hidden = !entry.offer.coordinates || !bounds.contains(entry.offer.coordinates) || !visibleIds.has(entry.offer.id ?? entry.offer.store);
          entry.element.hidden = hidden;
          entry.element.setAttribute('aria-hidden', String(hidden));
        });

        const selectedId = selectedOfferRef.current.id ?? selectedOfferRef.current.store;
        if (filteredOffers.length && !filteredOffers.some(item => (item.id ?? item.store) === selectedId)) {
          const pricedOffers = filteredOffers.filter(item => item.price !== null);
          const bestVisibleOffer = pricedOffers.length
            ? pricedOffers.reduce((best, item) => Number(item.price) < Number(best.price) ? item : best)
            : filteredOffers[0];
          selectedOfferRef.current = bestVisibleOffer;
          setOffer(bestVisibleOffer);
        }
        visibleStoresCallbackRef.current(filteredOffers);
        setView({ radius: getRadius(), count: filteredOffers.length });
      };
      visibilityUpdaterRef.current = updateVisibleStores;

      const refreshRealStores = async () => {
        if (cancelled) return;
        const zoom = activeMap.getZoom();
        searchController?.abort();
        setDiscoveryError(false);
        setRefreshing(true);
        const bounds = activeMap.getBounds();
        const visibleBounds: StoreBounds = {
          south: Math.max(18, bounds.getSouth()),
          west: Math.max(-171, bounds.getWest()),
          north: Math.min(72, bounds.getNorth()),
          east: Math.min(-66, bounds.getEast()),
        };
        const discoveryWindows = buildStoreDiscoveryWindows(visibleBounds, zoom >= 9 ? 1 : zoom >= 6.5 ? 4 : 6);
        const detailedWindow = discoveryWindows.length === 1
          && Math.abs(discoveryWindows[0].south - visibleBounds.south) < .001
          && Math.abs(discoveryWindows[0].west - visibleBounds.west) < .001
          && Math.abs(discoveryWindows[0].north - visibleBounds.north) < .001
          && Math.abs(discoveryWindows[0].east - visibleBounds.east) < .001;
        const overviewMode = !detailedWindow;
        setNeedsZoom(overviewMode);
        const requestController = new AbortController();
        searchController = requestController;

        const loadWindow = async (requestBounds: StoreBounds) => {
          const cacheKey = `${overviewMode ? 'overview' : 'detail'}:${[requestBounds.south, requestBounds.west, requestBounds.north, requestBounds.east].map(value => value.toFixed(2)).join(':')}`;
          const cached = storeCache.get(cacheKey);
          if (cached) return cached;

          const params = new URLSearchParams({
            s: requestBounds.south.toFixed(4),
            w: requestBounds.west.toFixed(4),
            n: requestBounds.north.toFixed(4),
            e: requestBounds.east.toFixed(4),
          });
          let discoveredStores: StoreLocation[];
          const response = await fetch(`/api/stores?${params}`, { signal: requestController.signal, headers: { Accept: 'application/json' } });
          if (response.ok) {
            const data = await response.json() as { stores?: StoreLocation[] };
            discoveredStores = data.stores ?? [];
          } else if (!overviewMode) {
            const query = buildStoreDiscoveryQuery(requestBounds);
            const fallback = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, {
              signal: requestController.signal,
              headers: { Accept: 'application/json' },
            });
            if (!fallback.ok) throw new Error('Store search unavailable');
            const data = await fallback.json() as { elements?: OpenStreetMapElement[] };
            discoveredStores = parseStoreLocations(data.elements ?? [], requestBounds);
          } else {
            throw new Error('Representative store search unavailable');
          }

          const displayStores = overviewMode ? sampleStoreLocations(discoveredStores, 10) : discoveredStores;
          const realStores = displayStores.flatMap((store) => {
            const [longitude, latitude] = store.coordinates;
            const duplicate = offers.some(item => item.coordinates && item.store.toLowerCase().includes(store.name.toLowerCase()) && Math.abs(item.coordinates[0] - longitude) < .01 && Math.abs(item.coordinates[1] - latitude) < .01);
            if (duplicate) return [];
            return [mappedStoreOffer(store, home)];
          });
          storeCache.set(cacheKey, realStores);
          return realStores;
        };

        try {
          if (!discoveryWindows.length) throw new Error('Map is outside the supported U.S. area');
          const results = await Promise.allSettled(discoveryWindows.map(loadWindow));
          if (requestController.signal.aborted) return;
          const successfulWindows = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
          if (!successfulWindows.length) throw new Error('Store search unavailable');
          const realStores = [...new globalThis.Map(successfulWindows.flat().map(store => [store.id ?? store.store, store])).values()];

          if (cancelled) return;
          liveMarkers.forEach(entry => entry.marker.remove());
          liveMarkers = realStores.map((item: Offer) => createOfferMarker(item, true));
          updateVisibleStores();
          setDiscoveryError(false);
          setRefreshing(false);
        } catch (error) {
          if ((error as Error).name === 'AbortError') return;
          if (!cancelled) {
            updateVisibleStores();
            setDiscoveryError(true);
            setRefreshing(false);
          }
        }
      };
      refreshStoresRef.current = () => { void refreshRealStores(); };

      const scheduleRefresh = () => {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(refreshRealStores, 320);
      };

      activeMap.on('movestart', () => { searchController?.abort(); setRefreshing(true); });
      activeMap.on('moveend', scheduleRefresh);

      activeMap.once('load', () => {
        if (!cancelled) {
          setStatus('ready');
          refreshRealStores();
        }
      });
    }).catch(() => {
      if (!cancelled) setStatus('error');
    });

    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimer);
      searchController?.abort();
      markers.forEach(entry => entry.marker.remove());
      liveMarkers.forEach(entry => entry.marker.remove());
      map?.remove();
      mapRef.current = null;
      visibilityUpdaterRef.current = () => undefined;
      refreshStoresRef.current = () => undefined;
    };
  }, [home, homePrecision, setOffer, setView]);

  useEffect(() => {
    containerRef.current?.querySelectorAll<HTMLElement>('.price-marker').forEach(marker => {
      marker.classList.toggle('chosen', marker.dataset.offerId === (offer.id ?? offer.store));
    });
  }, [offer.id, offer.store, status]);

  const recenter = () => mapRef.current?.easeTo({ center: home, zoom: 10.35, duration: 700 });

  return <div className="map-shell">
    <div ref={containerRef} className="map" aria-label="Interactive DealRadar store map" />
    {status === 'loading' && <div className="map-loading"><span />Loading detailed map…</div>}
    {status === 'error' && <div className="map-loading map-error">Map unavailable. Check your connection.</div>}
    <div className="map-guide">Drag to explore · Scroll or pinch to zoom</div>
    <button className="recenter" onClick={recenter} aria-label={`Recenter map on ${homePrecision === 'device' ? 'device location' : 'saved ZIP area'}`}>⌖ <span>Recenter</span></button>
    {discoveryError
      ? <button className="sample-badge store-retry" onClick={() => refreshStoresRef.current()}><b>Store search paused</b><span>Tap to retry real locations</span></button>
      : <div className={`sample-badge ${refreshing ? 'refreshing' : ''}`}><b>{refreshing ? 'Searching area…' : needsZoom ? `${view.count} representative stores` : `${view.count} real stores`}</b><span>{refreshing ? 'Checking mapped retailers' : needsZoom ? 'Zoom in for denser real locations' : 'U.S. mapped locations only'}</span></div>}
    <MapDataAttribution/>
  </div>;
}

function Map({ query, setQuery, offer, setOffer, notify, preferences, onCheckInventory, inventoryChecks }: { query: string; setQuery: (value: string) => void; offer: Offer; setOffer: (offer: Offer) => void; notify: (message: string) => void; preferences: ProfilePreferences; onCheckInventory: (item: LivePrice) => void; inventoryChecks: Record<string, VerifiedInventoryCheck> }) {
  const [view, setView] = useState<MapView>({ radius: 20, count: 3 });
  const prices = useVerifiedPriceSearch(String(query));
  const [display, setDisplay] = useState<'map' | 'list'>('map');
  const [mapFilters, setMapFilters] = useState<MapStoreFilters>({ verifiedOnly: false, withinMiles: null });
  const [visibleStores, setVisibleStores] = useState<Offer[]>([]);
  const [focusRequest, setFocusRequest] = useState<MapFocusRequest>(() => offer.id && offer.coordinates ? { id: offer.id, coordinates: offer.coordinates, nonce: Date.now() } : null);
  const [savedStores, setSavedStores] = useState<SavedStoreRecord[]>([]);
  const verifiedRetailers = useMemo(() => [...new Set(prices.offers.map(item => item.retailer))], [prices.offers]);
  const selectedSearch = useMemo(() => ({ ...prices, offers: prices.offers.filter(item => retailerMatchesStore(item.retailer, offer.store)) }), [offer.store, prices]);
  const receiveVisibleStores = useCallback((stores: Offer[]) => setVisibleStores(stores), []);
  const selectedStoreId = offer.id ?? offer.store;
  const selectedSaved = savedStores.some(store => store.id === selectedStoreId);
  const selectedDistance = offer.coordinates ? storeDistanceLabel(preferences.coordinates, offer.coordinates) : offer.distance;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const knownStores: SavedStoreRecord[] = offers.map(store => ({
        id: store.id ?? store.store,
        store: store.store,
        address: store.address,
        distance: store.distance,
        detail: store.detail,
        color: store.color,
        mark: store.mark,
        coordinates: store.coordinates,
        savedAt: new Date(0).toISOString(),
      }));
      setSavedStores(parseSavedStores(window.localStorage.getItem('dealradar-saved-stores'), knownStores));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setMapFilters(current => ({ ...current, withinMiles: current.withinMiles === null ? null : preferences.searchRadius })), 0);
    return () => window.clearTimeout(timer);
  }, [preferences.searchRadius]);

  const chooseStore = (store: Offer) => {
    setOffer(store);
    if (store.coordinates) setFocusRequest({ id: store.id ?? store.store, coordinates: store.coordinates, nonce: Date.now() });
    setDisplay('map');
  };
  const toggleSavedStore = () => {
    const record: SavedStoreRecord = {
      id: selectedStoreId,
      store: offer.store,
      address: offer.address,
      distance: offer.coordinates ? storeDistanceLabel(preferences.coordinates, offer.coordinates) : offer.distance,
      detail: offer.detail,
      color: offer.color,
      mark: offer.mark,
      coordinates: offer.coordinates,
      savedAt: new Date().toISOString(),
    };
    setSavedStores(current => {
      const next = toggleSavedStoreRecord(current, record);
      window.localStorage.setItem('dealradar-saved-stores', JSON.stringify(next));
      return next;
    });
    notify(selectedSaved ? `${offer.store} removed from Saved` : `${offer.store} saved`);
  };

  return <section className="page map-page">
    <div className="map-top"><SearchBox value={query} setValue={setQuery}/><div className="map-control-row"><div className="chips"><button className={mapFilters.verifiedOnly ? 'on' : ''} onClick={() => setMapFilters(current => ({ ...current, verifiedOnly: !current.verifiedOnly }))}>✓ Price connected</button><button className={mapFilters.withinMiles === preferences.searchRadius ? 'on' : ''} onClick={() => setMapFilters(current => ({ ...current, withinMiles: current.withinMiles === preferences.searchRadius ? null : preferences.searchRadius }))}>⌖ Within {preferences.searchRadius} mi</button><button disabled>~{view.radius} mi view</button></div><div className="map-list-toggle" role="group" aria-label="Show map or store list"><button className={display === 'map' ? 'active' : ''} onClick={() => setDisplay('map')}>Map</button><button className={display === 'list' ? 'active' : ''} onClick={() => setDisplay('list')}>List {visibleStores.length}</button></div></div></div>
    <div className={display === 'map' ? 'map-display active' : 'map-display'}><InteractiveMap offer={offer} setOffer={setOffer} view={view} setView={setView} filters={mapFilters} verifiedRetailers={verifiedRetailers} onVisibleStores={receiveVisibleStores} active={display === 'map'} focusRequest={focusRequest} home={preferences.coordinates} homePrecision={preferences.locationPrecision}/></div>
    {display === 'list' && <MapStoreList
      stores={visibleStores}
      selected={offer}
      verifiedRetailers={verifiedRetailers}
      filters={mapFilters}
      home={preferences.coordinates}
      onSelect={chooseStore}
      onClearFilters={() => setMapFilters({ verifiedOnly: false, withinMiles: null })}
    />}
    <article className="sheet"><i/>
      <div className="sheet-head"><div><small>{view.count} matching stores in this map area</small><h2>{display === 'list' ? 'Selected store' : 'Deals near this store'}</h2></div><button className={selectedSaved ? 'saved' : ''} onClick={toggleSavedStore} aria-label={`${selectedSaved ? 'Remove' : 'Save'} selected store`}>{selectedSaved ? '♥' : '♡'}</button></div>
      {view.count > 0 ? <div className="deal"><b className="logo" style={{background:offer.color}}>{offer.mark}</b><span><h3>{offer.store}</h3><small>{selectedDistance} · {offer.detail}</small><small className="address">{offer.address}</small><em>{verifiedRetailers.some(retailer => retailerMatchesStore(retailer, offer.store)) ? 'Price feed connected' : 'Mapped location'}{offer.sourceUrl && <a className="store-source" href={offer.sourceUrl} target="_blank" rel="noreferrer">Verify on OpenStreetMap ↗</a>}</em></span><strong className="no-price">{selectedSearch.offers.length ? 'Catalog price below' : 'Price unavailable'}{offer.coordinates ? <span className="store-direction-links"><a className="store-directions" href={appleMapsDirectionsUrl(preferences.coordinates, offer.coordinates)} target="_blank" rel="noreferrer">Apple Maps ›</a><a className="store-directions secondary" href={googleMapsDirectionsUrl(preferences.coordinates, offer.coordinates)} target="_blank" rel="noreferrer">Google Maps ›</a></span> : null}</strong></div> : <div className="area-empty"><b>No stores match these controls</b><span>Turn off a filter, zoom in, or move the map to another U.S. area.</span></div>}
      {view.count > 0 && <LivePriceResults
        query={query}
        search={selectedSearch}
        storeName={offer.store}
        onCheckInventory={onCheckInventory}
        inventoryChecks={inventoryChecks}
        zipCode={preferences.zipCode}
      />}
      <div className="deal-note"><span>✓</span><p><b>Verified prices only</b><small>Unconnected retailers never receive an estimated price</small></p></div>
    </article>
  </section>;
}

function MapStoreList({ stores, selected, verifiedRetailers, filters, home, onSelect, onClearFilters }: { stores: Offer[]; selected: Offer; verifiedRetailers: string[]; filters: MapStoreFilters; home: [number, number]; onSelect: (store: Offer) => void; onClearFilters: () => void }) {
  const sorted = useMemo(() => [...stores].sort((first, second) => {
    const firstDistance = first.coordinates ? milesBetween(home, first.coordinates) : Infinity;
    const secondDistance = second.coordinates ? milesBetween(home, second.coordinates) : Infinity;
    return firstDistance - secondDistance;
  }), [home, stores]);

  return <section className="map-store-list" aria-label="Stores visible on the map"><div className="map-store-list-head"><div><small>VISIBLE MAP AREA</small><h2>{stores.length} stores</h2></div><span>Nearest first</span></div>{sorted.length ? <div className="map-store-rows">{sorted.map(store => {
    const distance = store.coordinates ? milesBetween(home, store.coordinates) : null;
    const connected = verifiedRetailers.some(retailer => retailerMatchesStore(retailer, store.store));
    const active = (selected.id ?? selected.store) === (store.id ?? store.store);
    return <button key={store.id ?? store.store} className={active ? 'active' : ''} onClick={() => onSelect(store)}><b className="store-list-logo" style={{ background: store.color }}>{store.mark}</b><span><strong>{store.store}</strong><small>{distance === null ? store.distance : storeDistanceLabel(home, store.coordinates!)} · {store.address}</small><em className={connected ? 'connected' : ''}>{connected ? '✓ Price connected' : 'Mapped store'}</em></span><i>›</i></button>;
  })}</div> : <div className="map-list-empty"><b>No stores match</b><span>{filters.verifiedOnly ? 'No connected retailer price feeds are visible in this area yet.' : 'Move the map or broaden the distance filter.'}</span><button onClick={onClearFilters}>Clear map filters</button></div>}<MapDataAttribution list/></section>;
}

function LivePriceResults({ query, search, storeName, onCheckInventory, inventoryChecks, zipCode }: { query: string; search: PriceSearch; storeName?: string; onCheckInventory: (item: LivePrice) => void; inventoryChecks: Record<string, VerifiedInventoryCheck>; zipCode: string }) {
  if (search.status === 'idle') return <div className="price-feed-state"><b>Search for a product</b><span>DealRadar will check connected official retailer feeds.</span></div>;
  if (search.status === 'loading') return <div className="price-feed-state loading"><b>Checking official price feeds…</b><span>Looking for “{query}”</span></div>;
  if (search.status === 'error') return <div className="price-feed-state error"><b>Price search is unavailable</b><span>Please try again in a moment.</span></div>;

  if (search.offers.length) {
    return <section className="live-prices" aria-label="Verified live prices"><div className="live-prices-title"><b>Verified catalog prices</b><a className="official-feed-link" href="https://developer.bestbuy.com/" target="_blank" rel="noreferrer" aria-label="Powered by the Best Buy Developer API">Official API ↗</a></div>{search.offers.slice(0, 2).map(item => {
      const freshness = formatVerificationFreshness(item.updatedAt);
      const pickupEvidence = inventoryEvidence(inventoryChecks[item.id], item.sku, zipCode);
      return <article key={item.id}><span><b>{item.title}</b><small>{item.retailer} · {item.matchType === 'exact' ? 'Exact match' : item.matchType === 'similar' ? 'Similar model' : 'Possible match'}</small><small className={freshness.stale ? 'stale-copy' : 'map-price-freshness'}>{freshness.label}</small>{pickupEvidence.state !== 'unverified' && <small className={pickupEvidence.state === 'available' ? 'map-inventory-ready' : 'stale-copy'}>{pickupEvidence.state === 'available' ? `${pickupEvidence.storeCount} in-stock ${pickupEvidence.storeCount === 1 ? 'store' : 'stores'} near ${zipCode}` : `No pickup stock near ${zipCode}`}</small>}</span><strong>${item.price.toFixed(2)}{item.fulfillment.some(option => option.toLowerCase().includes('pickup')) && <button onClick={() => onCheckInventory(item)}>{pickupEvidence.state === 'available' ? 'Pickup checked ✓' : pickupEvidence.state === 'unavailable' ? 'Recheck pickup' : 'Check pickup'}</button>}<a href={item.productUrl} target="_blank" rel="noreferrer">View ›</a></strong></article>;
    })}{storeName && <p className="inventory-caveat">Catalog price shown. Confirm inventory for {storeName} before traveling.</p>}</section>;
  }

  const connected = search.retailers.filter(item => item.state === 'connected').length;
  const ready = search.retailers.find(item => item.state === 'needs_credentials');
  return <div className="price-feed-state"><b>{connected ? `No verified ${storeName ? `${storeName} ` : ''}price` : 'Retailer access needed'}</b><span>{connected ? `No connected feed matched “${query}” for this store.` : `${ready?.retailer ?? 'Retailer'} integration is built and waiting for approved credentials.`}</span><small>{search.retailers.filter(item => item.state === 'partner_access').map(item => item.retailer).join(' and ')} require partner approval.</small></div>;
}

function Saved({ query, setQuery, notify, home, shopProduct, browseStores, openStore }: { query: string; setQuery: (value: string) => void; notify: (message: string) => void; home: [number, number]; shopProduct: (title: string) => void; browseStores: () => void; openStore: (store: SavedStoreRecord) => void }) {
  const [section, setSection] = useState<'products' | 'stores'>('products');
  const [sort, setSort] = useState<SavedSort>('recent');
  const [savedProducts, setSavedProducts] = useState<SavedProductRecord[]>([]);
  const [savedStores, setSavedStores] = useState<SavedStoreRecord[]>([]);
  const [alertIds, setAlertIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const knownStores: SavedStoreRecord[] = offers.map(store => ({
        id: store.id ?? store.store,
        store: store.store,
        address: store.address,
        distance: store.distance,
        detail: store.detail,
        color: store.color,
        mark: store.mark,
        coordinates: store.coordinates,
        savedAt: new Date(0).toISOString(),
      }));
      const products = parseSavedProducts(window.localStorage.getItem('dealradar-saved-products'));
      setSavedProducts(products);
      setSavedStores(parseSavedStores(window.localStorage.getItem('dealradar-saved-stores'), knownStores));
      setAlertIds(products.filter(item => window.localStorage.getItem(`dealradar-alert-${item.id}`) === 'true').map(item => item.id));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleProducts = useMemo(() => filterSavedProducts(savedProducts, query, sort), [query, savedProducts, sort]);
  const storeSort = sort === 'name' ? 'name' : 'recent';
  const visibleStores = useMemo(() => filterSavedStores(savedStores, query, storeSort), [query, savedStores, storeSort]);
  const removeProduct = (item: SavedProductRecord) => {
    const next = savedProducts.filter(product => product.id !== item.id);
    setSavedProducts(next);
    setAlertIds(current => current.filter(id => id !== item.id));
    window.localStorage.setItem('dealradar-saved-products', JSON.stringify(next));
    window.localStorage.removeItem(`dealradar-alert-${item.id}`);
    notify(`${item.title} removed from Saved`);
  };
  const removeStore = (item: SavedStoreRecord) => {
    const next = savedStores.filter(store => store.id !== item.id);
    setSavedStores(next);
    window.localStorage.setItem('dealradar-saved-stores', JSON.stringify(next));
    notify(`${item.store} removed from Saved`);
  };
  const toggleAlert = (item: SavedProductRecord) => {
    const active = alertIds.includes(item.id);
    const next = active ? alertIds.filter(id => id !== item.id) : [...alertIds, item.id];
    setAlertIds(next);
    window.localStorage.setItem(`dealradar-alert-${item.id}`, String(!active));
    notify(active ? `Price watch turned off for ${item.title}` : `Watching ${item.title} for a verified price drop`);
  };

  return <section className="page saved-page">
    <div className="saved-title"><div><small>YOUR SHORTLIST</small><h2>Saved</h2></div><span>{savedProducts.length + savedStores.length} total</span></div>
    <SearchBox value={query} setValue={setQuery} placeholder={`Search saved ${section}`}/>
    <div className="segments" role="group" aria-label="Saved item type"><button className={section === 'products' ? 'on' : ''} onClick={() => { setSection('products'); setSort('recent'); }}>Products <b>{savedProducts.length}</b></button><button className={section === 'stores' ? 'on' : ''} onClick={() => { setSection('stores'); setSort('recent'); }}>Stores <b>{savedStores.length}</b></button></div>
    <div className="saved-toolbar"><span>{section === 'products' ? `${visibleProducts.length} saved products` : `${visibleStores.length} saved stores`}</span><select aria-label="Sort saved items" value={sort} onChange={event => setSort(event.target.value as SavedSort)}><option value="recent">Recently saved</option><option value="name">Name A–Z</option>{section === 'products' && <option value="price-low">Lowest price</option>}</select></div>
    {section === 'products' && <>
      <div className="summary saved-watch-summary"><b>♧</b><span><strong>{alertIds.length} active price {alertIds.length === 1 ? 'watch' : 'watches'}</strong><small>Only verified retailer prices can trigger an alert.</small></span></div>
      {visibleProducts.length > 0 ? <div className="saved-product-list">{visibleProducts.map(item => {
        const alertActive = alertIds.includes(item.id);
        const discounted = item.regularPrice !== null && item.regularPrice > item.price;
        const freshness = formatVerificationFreshness(item.verifiedAt);
        return <article key={item.id} className={freshness.stale ? 'saved-price-stale' : ''}><div className="saved-product-brand">{item.retailer === 'Best Buy' ? 'BEST' : item.retailer.slice(0, 2).toUpperCase()}</div><div className="saved-product-copy"><small className={freshness.stale ? 'stale-copy' : ''}>{item.retailer} · {freshness.label}</small><h3>{item.title}</h3>{item.modelNumber && <span>Model {item.modelNumber}</span>}<div><strong>${item.price.toFixed(2)}</strong>{discounted && <em>Save ${(item.regularPrice! - item.price).toFixed(2)}</em>}</div><span>{item.availability}{freshness.stale ? ' · Recheck before buying' : ''}</span><div className="saved-product-actions"><button className={alertActive ? 'active' : ''} onClick={() => toggleAlert(item)}>{alertActive ? '✓ Watching' : '♧ Watch price'}</button><button onClick={() => shopProduct(item.title)}>{freshness.stale ? 'Recheck price' : 'Search again'}</button><a href={item.productUrl} target="_blank" rel="noreferrer">View deal ›</a></div></div><button className="saved-remove" onClick={() => removeProduct(item)} aria-label={`Remove ${item.title} from Saved`}>♥</button></article>;
      })}</div> : <SavedEmpty filtered={Boolean(query)} type="products" clear={() => setQuery('')} browse={() => shopProduct('')}/>}
    </>}
    {section === 'stores' && <>{visibleStores.length > 0 ? <div className="saved-store-list">{visibleStores.map(item => <article key={item.id}><b className="saved-store-logo" style={{ background: item.color }}>{item.mark}</b><span><small>{item.coordinates ? storeDistanceLabel(home, item.coordinates) : item.distance} · SAVED STORE</small><h3>{item.store}</h3><p>{item.address}</p><div><button onClick={() => openStore(item)}>Show on map</button>{item.coordinates && <><a href={appleMapsDirectionsUrl(home, item.coordinates)} target="_blank" rel="noreferrer">Apple Maps ›</a><a href={googleMapsDirectionsUrl(home, item.coordinates)} target="_blank" rel="noreferrer">Google Maps ›</a></>}</div></span><button className="saved-remove" onClick={() => removeStore(item)} aria-label={`Remove ${item.store} from Saved`}>♥</button></article>)}</div> : <SavedEmpty filtered={Boolean(query)} type="stores" clear={() => setQuery('')} browse={browseStores}/>}</>}
  </section>;
}

function SavedEmpty({ filtered, type, clear, browse }: { filtered: boolean; type: 'products' | 'stores'; clear: () => void; browse: () => void }) {
  return <div className="saved-empty"><b>{filtered ? 'No saved matches' : `No saved ${type} yet`}</b><span>{filtered ? 'Try another search or clear the search box.' : type === 'products' ? 'Tap the heart on a verified Search result to keep it here.' : 'Tap the heart on a real Map location to keep it here.'}</span><button onClick={filtered ? clear : browse}>{filtered ? 'Clear search' : type === 'products' ? 'Find products' : 'Explore stores'}</button></div>;
}
type AlertCheckState = {
  status: 'idle' | 'checking' | 'ready' | 'error';
  offers: Record<string, LivePrice | null>;
  connections: Record<string, RetailerStatus | null>;
  checkedAt: string | null;
};

function Alerts({ notify, openSaved, shopProduct, preferences }: { notify: (message: string) => void; openSaved: () => void; shopProduct: (title: string) => void; preferences: ProfilePreferences }) {
  const [products, setProducts] = useState<SavedProductRecord[]>([]);
  const [settings, setSettings] = useState<PriceWatchSetting[]>([]);
  const [check, setCheck] = useState<AlertCheckState>({ status: 'idle', offers: {}, connections: {}, checkedAt: null });
  const [editing, setEditing] = useState<SavedProductRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = parseSavedProducts(window.localStorage.getItem('dealradar-saved-products'));
      const watched = saved.filter(item => window.localStorage.getItem(`dealradar-alert-${item.id}`) === 'true');
      const nextSettings = ensurePriceWatchSettings(watched, parsePriceWatchSettings(window.localStorage.getItem('dealradar-alert-settings')), new Date().toISOString());
      setProducts(watched);
      setSettings(nextSettings);
      window.localStorage.setItem('dealradar-alert-settings', JSON.stringify(nextSettings));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const checkFeeds = async () => {
    if (!products.length || check.status === 'checking') return;
    setCheck(current => ({ ...current, status: 'checking' }));
    try {
      const entries = await Promise.all(products.map(async product => {
        try {
          const response = await fetch(`/api/offers?q=${encodeURIComponent(product.modelNumber || product.title)}`);
          if (!response.ok) return [product.id, null, null] as const;
          const data = await response.json() as { offers?: LivePrice[]; retailers?: RetailerStatus[] };
          const current = chooseVerifiedAlertOffer(product, data.offers ?? []) as LivePrice | null;
          if (current) recordVerifiedPriceHistory([current]);
          const connection = data.retailers?.find(item => item.retailer.toLowerCase() === product.retailer.toLowerCase()) ?? null;
          return [product.id, current, connection] as const;
        } catch {
          return [product.id, null, null] as const;
        }
      }));
      const checkedAt = new Date().toISOString();
      const nextSettings = settings.map(item => ({ ...item, lastCheckedAt: checkedAt }));
      const nextOffers = Object.fromEntries(entries.map(([id, offer]) => [id, offer]));
      const nextConnections = Object.fromEntries(entries.map(([id, , connection]) => [id, connection]));
      const triggered = products.filter(product => {
        const setting = nextSettings.find(item => item.productId === product.id);
        const effective = setting ? { ...setting, backInStock: setting.backInStock && preferences.backInStockNotifications } : null;
        return effective && evaluatePriceWatch(product, nextOffers[product.id], effective).status === 'triggered';
      }).length;
      setSettings(nextSettings);
      setCheck({ status: 'ready', offers: nextOffers, connections: nextConnections, checkedAt });
      window.localStorage.setItem('dealradar-alert-settings', JSON.stringify(nextSettings));
      notify(triggered ? `${triggered} verified ${triggered === 1 ? 'deal' : 'deals'} found` : 'Verified price check complete');
    } catch {
      setCheck(current => ({ ...current, status: 'error' }));
    }
  };

  const disableWatch = (product: SavedProductRecord) => {
    const nextProducts = products.filter(item => item.id !== product.id);
    const nextSettings = settings.filter(item => item.productId !== product.id);
    setProducts(nextProducts);
    setSettings(nextSettings);
    window.localStorage.setItem(`dealradar-alert-${product.id}`, 'false');
    window.localStorage.setItem('dealradar-alert-settings', JSON.stringify(nextSettings));
    notify(`Price watch turned off for ${product.title}`);
  };
  const saveSetting = (next: PriceWatchSetting) => {
    const nextSettings = setPriceWatchSetting(settings, next);
    setSettings(nextSettings);
    window.localStorage.setItem('dealradar-alert-settings', JSON.stringify(nextSettings));
    setEditing(null);
    notify('Price-watch settings saved');
  };

  const evaluations = products.map(product => {
    const setting = settings.find(item => item.productId === product.id) ?? ensurePriceWatchSettings([product], [], new Date().toISOString())[0];
    const current = check.offers[product.id] ?? null;
    const effective = { ...setting, backInStock: setting.backInStock && preferences.backInStockNotifications };
    return { product, setting, current, connection: check.connections[product.id] ?? null, evaluation: evaluatePriceWatch(product, current, effective) };
  });
  const triggeredCount = check.status === 'ready' ? evaluations.filter(item => item.evaluation.status === 'triggered').length : 0;

  return <section className="page alerts-page">
    <div className="alerts-title"><div><small>VERIFIED RETAILER MONITORING</small><h2>Price alerts</h2></div><span>{products.length} active</span></div>
    {products.length === 0 ? <div className="alerts-empty"><b>♧</b><h3>No active price watches</h3><p>Save a verified product, then turn on Watch price to monitor it here.</p><button onClick={openSaved}>Open Saved products</button></div> : <>
      <article className={`alert-summary ${triggeredCount ? 'has-deals' : ''}`}><div><b>{triggeredCount ? '✓' : '♧'}</b><span><small>{triggeredCount ? 'VERIFIED DEAL FOUND' : 'PRICE WATCHES READY'}</small><h3>{triggeredCount ? `${triggeredCount} ${triggeredCount === 1 ? 'price drop meets' : 'price drops meet'} your target` : `${products.length} ${products.length === 1 ? 'product' : 'products'} being watched`}</h3><p>{check.checkedAt ? `Last checked ${new Date(check.checkedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Check connected feeds for the latest official prices.'}</p></span></div><button disabled={check.status === 'checking'} onClick={checkFeeds}>{check.status === 'checking' ? 'Checking official feeds…' : 'Check verified feeds'}</button><small>{preferences.priceDropNotifications ? 'Checks use official retailer results only while this prototype is open.' : 'Price-drop notifications are paused in Profile; verified checks still work.'} DealRadar never invents a price drop.</small></article>
      {check.status === 'error' && <div className="alert-check-error">Price feeds could not be checked. Try again in a moment.</div>}
      <div className="alerts-list-head"><h3>Watching</h3><span>{products.length} active</span></div>
      <div className="watch-list">{evaluations.map(({ product, setting, current, connection, evaluation }) => {
        const ready = check.status === 'ready';
        const targetLabel = setting.targetPrice === null ? 'Any verified drop' : `$${setting.targetPrice.toFixed(2)} or less`;
        const unavailableMessage = !connection ? 'Retailer status unavailable' : connection.health === 'failed' ? 'Retailer live check failed' : connection.state === 'needs_credentials' ? 'Retailer credentials needed' : connection.state === 'partner_access' ? 'Partner access required' : connection.state === 'unavailable' ? 'No public price API · location only' : 'No exact verified match returned';
        return <article key={product.id} className={ready && evaluation.status === 'triggered' ? 'triggered' : ''}><div className="watch-brand">{product.retailer === 'Best Buy' ? 'BEST' : product.retailer.slice(0, 2).toUpperCase()}</div><div className="watch-copy"><small>{product.retailer} · {targetLabel}</small><h3>{product.title}</h3><div className="watch-prices"><span><small>Saved at</small><b>${product.price.toFixed(2)}</b></span><i>→</i><span><small>Latest verified</small><b>{ready && current ? `$${current.price.toFixed(2)}` : '—'}</b></span></div><p className={`watch-state ${ready ? evaluation.status : 'idle'}`}>{check.status === 'checking' ? 'Checking retailer feed…' : !ready ? 'Ready for a verified check' : evaluation.status === 'triggered' ? `Target met${evaluation.savings ? ` · Save $${evaluation.savings.toFixed(2)}` : ' · Back in stock'}` : evaluation.status === 'unavailable' ? unavailableMessage : 'Watching · Target not reached'}</p><div className="watch-actions"><button onClick={() => setEditing(product)}>Adjust target</button><button onClick={() => shopProduct(product.title)}>Search product</button>{current ? <a href={current.productUrl} target="_blank" rel="noreferrer">View deal ›</a> : <a href={product.productUrl} target="_blank" rel="noreferrer">Saved deal ›</a>}</div></div><button className="watch-menu" onClick={() => disableWatch(product)} aria-label={`Turn off price watch for ${product.title}`}>×</button></article>;
      })}</div>
    </>}
    {editing && <PriceWatchSheet
      product={editing}
      setting={settings.find(item => item.productId === editing.id) ?? ensurePriceWatchSettings([editing], [], new Date().toISOString())[0]}
      onClose={() => setEditing(null)}
      onSave={saveSetting}
    />}
  </section>;
}

function PriceWatchSheet({ product, setting, onClose, onSave }: { product: SavedProductRecord; setting: PriceWatchSetting; onClose: () => void; onSave: (setting: PriceWatchSetting) => void }) {
  const fivePercent = Number((product.price * .95).toFixed(2));
  const tenPercent = Number((product.price * .90).toFixed(2));
  const initialMode = setting.targetPrice === null ? 'any' : setting.targetPrice === fivePercent ? 'five' : setting.targetPrice === tenPercent ? 'ten' : 'custom';
  const [mode, setMode] = useState<'any' | 'five' | 'ten' | 'custom'>(initialMode);
  const [custom, setCustom] = useState(setting.targetPrice === null ? '' : setting.targetPrice.toFixed(2));
  const [backInStock, setBackInStock] = useState(setting.backInStock);
  const dialog = useAccessibleDialog(onClose);
  const customPrice = Number(custom);
  const validCustom = mode !== 'custom' || (Number.isFinite(customPrice) && customPrice > 0 && customPrice < product.price);
  const submit = () => {
    if (!validCustom) return;
    const targetPrice = mode === 'any' ? null : mode === 'five' ? fivePercent : mode === 'ten' ? tenPercent : Number(customPrice.toFixed(2));
    onSave({ ...setting, targetPrice, backInStock });
  };

  return <div className="filter-backdrop watch-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section {...dialog} className="watch-sheet" role="dialog" aria-modal="true" aria-labelledby="watch-settings-title"><div className="filter-sheet-head"><div><small>VERIFIED PRICE WATCH</small><h2 id="watch-settings-title">Set your target</h2></div><button onClick={onClose} aria-label="Close price-watch settings">×</button></div><h3>{product.title}</h3><p>Saved verified price <b>${product.price.toFixed(2)}</b></p><div className="watch-targets"><button className={mode === 'any' ? 'selected' : ''} onClick={() => setMode('any')}>Any drop<small>Below ${product.price.toFixed(2)}</small></button><button className={mode === 'five' ? 'selected' : ''} onClick={() => setMode('five')}>5% off<small>${fivePercent.toFixed(2)}</small></button><button className={mode === 'ten' ? 'selected' : ''} onClick={() => setMode('ten')}>10% off<small>${tenPercent.toFixed(2)}</small></button><button className={mode === 'custom' ? 'selected' : ''} onClick={() => setMode('custom')}>Custom<small>Your price</small></button></div>{mode === 'custom' && <label className="custom-target"><span>Notify me at or below</span><div>$ <input inputMode="decimal" value={custom} onChange={event => setCustom(event.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00"/></div>{!validCustom && <small>Enter a price below ${product.price.toFixed(2)}.</small>}</label>}<label className="stock-watch"><span><b>Back-in-stock alert</b><small>Notify when an official feed reports it available again.</small></span><input type="checkbox" checked={backInStock} onChange={event => setBackInStock(event.target.checked)}/><i/></label><button className="save-watch" disabled={!validCustom} onClick={submit}>Save watch settings</button><small className="watch-disclaimer">Alerts are evaluated only when DealRadar receives a matching official retailer price.</small></section></div>;
}
type ProfilePanel = 'name' | 'location' | 'radius' | 'fulfillment' | 'costs' | 'connections' | 'privacy' | null;

function Profile({ preferences, setPreferences, notify, restartOnboarding }: { preferences: ProfilePreferences; setPreferences: (preferences: ProfilePreferences) => void; notify: (message: string) => void; restartOnboarding: () => void }) {
  const [panel, setPanel] = useState<ProfilePanel>(null);
  const update = (change: Partial<ProfilePreferences>, message: string) => {
    setPreferences({ ...preferences, ...change });
    notify(message);
  };

  return <section className="page profile-page">
    <div className="profile-title"><div><small>SHOPPING SETUP</small><h2>Profile</h2></div><span>Saved on device</span></div>
    <article className="profile-identity"><i>{profileInitials(preferences.name)}</i><span><small>DEALRADAR SHOPPER</small><h3>{preferences.name}</h3><button onClick={() => setPanel('name')}>Edit display name ›</button></span><b>✓</b></article>
    <div className="profile-home-card"><span>{preferences.locationPrecision === 'device' ? '●' : '⌂'}</span><div><small>{preferences.locationPrecision === 'device' ? 'PRECISE DISTANCE ORIGIN' : 'HOME SHOPPING AREA'}</small><b>{preferences.locationLabel}</b><em>{preferences.zipCode} · {preferences.locationPrecision === 'device' ? 'Device location' : 'ZIP-center origin'}</em></div><button onClick={() => setPanel('location')}>Change</button></div>
    <RetailerConnectionCard onOpen={() => setPanel('connections')}/>
    <div className="profile-section-head"><h3>Shopping preferences</h3><small>Used in Search and Map</small></div>
    <div className="profile-settings shopping-settings"><button onClick={() => setPanel('radius')}><i>⌾</i><span><b>Shopping radius</b><small>Default Search distance and Map quick filter</small></span><em>{preferences.searchRadius} mi ›</em></button><button onClick={() => setPanel('fulfillment')}><i>▣</i><span><b>Preferred fulfillment</b><small>Sets the starting Search filter</small></span><em>{fulfillmentLabel(preferences.fulfillment)} ›</em></button><button onClick={() => setPanel('costs')}><i>$</i><span><b>Cost assumptions</b><small>Tax and driving estimates for total cost</small></span><em>{preferences.salesTaxPercent.toFixed(2)}% · ${preferences.travelCostPerMile.toFixed(2)}/mi ›</em></button></div>
    <div className="profile-section-head"><h3>Notifications</h3><small>Device preferences</small></div>
    <div className="profile-settings profile-toggles"><label><i>♧</i><span><b>Price-drop alerts</b><small>Allow verified target alerts</small></span><input type="checkbox" checked={preferences.priceDropNotifications} onChange={event => update({ priceDropNotifications: event.target.checked }, event.target.checked ? 'Price-drop notifications enabled' : 'Price-drop notifications paused')}/><em/></label><label><i>▣</i><span><b>Back-in-stock alerts</b><small>Allow verified availability alerts</small></span><input type="checkbox" checked={preferences.backInStockNotifications} onChange={event => update({ backInStockNotifications: event.target.checked }, event.target.checked ? 'Back-in-stock notifications enabled' : 'Back-in-stock notifications paused')}/><em/></label></div>
    <button className="profile-privacy" onClick={() => setPanel('privacy')}><i>♢</i><span><b>Privacy & shopping data</b><small>Export or clear device-local DealRadar data</small></span><em>›</em></button>
    <button className="profile-tour" onClick={restartOnboarding}>◎ <span><b>How DealRadar works</b><small>Replay the three-step welcome tour</small></span><em>›</em></button>
    <p className="profile-device-note">Your profile, saved items, watches, and observed price history stay in this browser for the current prototype.</p>
    {panel === 'name' && <NameProfileSheet
      current={preferences.name}
      onClose={() => setPanel(null)}
      onSave={name => { update({ name }, 'Display name updated'); setPanel(null); }}
    />}
    {panel === 'location' && <LocationProfileSheet
      current={{ zipCode: preferences.zipCode, locationLabel: preferences.locationLabel, coordinates: preferences.coordinates, locationPrecision: preferences.locationPrecision }}
      onClose={() => setPanel(null)}
      onSave={location => { update(location, `Home area changed to ${location.locationLabel}`); setPanel(null); }}
    />}
    {panel === 'radius' && <RadiusProfileSheet
      current={preferences.searchRadius}
      onClose={() => setPanel(null)}
      onSave={searchRadius => { update({ searchRadius }, `Shopping radius set to ${searchRadius} miles`); setPanel(null); }}
    />}
    {panel === 'fulfillment' && <FulfillmentProfileSheet
      current={preferences.fulfillment}
      onClose={() => setPanel(null)}
      onSave={fulfillment => { update({ fulfillment }, `Default changed to ${fulfillmentLabel(fulfillment)}`); setPanel(null); }}
    />}
    {panel === 'costs' && <CostAssumptionsProfileSheet
      salesTaxPercent={preferences.salesTaxPercent}
      travelCostPerMile={preferences.travelCostPerMile}
      onClose={() => setPanel(null)}
      onSave={costs => { update(costs, 'Total-cost assumptions updated'); setPanel(null); }}
    />}
    {panel === 'privacy' && <PrivacyProfileSheet
      preferences={preferences}
      onClose={() => setPanel(null)}
      onCleared={() => notify('Saved shopping data cleared from this device')}
    />}
    {panel === 'connections' && <RetailerConnectionsSheet onClose={() => setPanel(null)}/>}
  </section>;
}

type RetailerStatusResponse = {
  retailers: RetailerStatus[];
  checkedAt: string | null;
  summary: { verified: number; configured: number; actionRequired: number; locationOnly: number };
};

function RetailerConnectionCard({ onOpen }: { onOpen: () => void }) {
  const [data, setData] = useState<RetailerStatusResponse | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/retailers', { signal: controller.signal }).then(async response => response.ok ? await response.json() as RetailerStatusResponse : null).then(result => { if (result) setData(result); }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  const connected = (data?.summary.verified ?? 0) + (data?.summary.configured ?? 0);
  return <button className="retailer-connection-card" onClick={onOpen}><i>{connected ? '✓' : '◎'}</i><span><small>RETAILER PRICE FEEDS</small><b>{connected ? `${connected} connector ${data?.summary.verified ? 'live verified' : 'configured'}` : 'Connection setup needed'}</b><em>{data ? `${data.summary.actionRequired} require action · ${data.summary.locationOnly} location only` : 'Checking connection status…'}</em></span><strong>View ›</strong></button>;
}

function retailerHealthCopy(status: RetailerStatus) {
  if (status.health === 'verified') return { label: 'Live verified', className: 'verified' };
  if (status.health === 'configured') return { label: 'Configured · check live', className: 'configured' };
  if (status.health === 'failed') return { label: 'Live check failed', className: 'failed' };
  if (status.health === 'location_only') return { label: 'Locations only', className: 'location-only' };
  return { label: status.state === 'partner_access' ? 'Partner approval' : 'Credentials needed', className: 'action' };
}

function RetailerConnectionsSheet({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<RetailerStatusResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'checking' | 'error'>('loading');
  const load = async (probe = false) => {
    setStatus(probe ? 'checking' : 'loading');
    try {
      const response = await fetch(`/api/retailers${probe ? '?probe=1' : ''}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Connection status unavailable');
      setData(await response.json());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const configured = (data?.summary.verified ?? 0) + (data?.summary.configured ?? 0);

  return <ProfileSheetFrame eyebrow="SERVER-SIDE STATUS" title="Retailer connections" onClose={onClose}><p className="profile-sheet-copy">A mapped store is not automatically a price-connected retailer. This screen shows exactly which official feeds are usable.</p>{data && <div className="connection-summary"><span><b>{data.summary.verified}</b><small>Live verified</small></span><span><b>{data.summary.configured}</b><small>Configured</small></span><span><b>{data.summary.locationOnly}</b><small>Location only</small></span></div>}{status === 'loading' && <div className="connections-loading"><i/>Loading retailer status…</div>}{status === 'error' && <div className="connections-error">Connection status could not be loaded.<button onClick={() => load()}>Try again</button></div>}{data && <div className="retailer-status-list">{data.retailers.map(retailer => {
    const health = retailerHealthCopy(retailer);
    return <article key={retailer.retailer}><div className="retailer-status-mark">{retailer.retailer === 'Best Buy' ? 'BEST' : retailer.retailer.slice(0, 2).toUpperCase()}</div><div><div className="retailer-status-title"><b>{retailer.retailer}</b><em className={health.className}>{health.label}</em></div><p>{retailer.message}</p><small>{retailer.requirement}</small>{retailer.checkedAt && <small>Checked {new Date(retailer.checkedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>}{retailer.signupUrl && <a href={retailer.signupUrl} target="_blank" rel="noreferrer">Official access information ›</a>}</div></article>;
  })}</div>}<button className="connection-check" disabled={!configured || status === 'checking'} onClick={() => load(true)}>{status === 'checking' ? 'Checking official feed…' : configured ? 'Run live connection check' : 'Add server credentials to test'}</button><small className="profile-sheet-note">Credentials stay on the server and are never sent to the browser. Live checks do not reveal secret values.</small></ProfileSheetFrame>;
}

function ProfileSheetFrame({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children: React.ReactNode }) {
  const dialog = useAccessibleDialog(onClose);
  return <div className="filter-backdrop profile-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section {...dialog} className="profile-sheet" role="dialog" aria-modal="true" aria-labelledby="profile-sheet-title"><div className="filter-sheet-head"><div><small>{eyebrow}</small><h2 id="profile-sheet-title">{title}</h2></div><button onClick={onClose} aria-label={`Close ${title}`}>×</button></div>{children}</section></div>;
}

function NameProfileSheet({ current, onClose, onSave }: { current: string; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(current);
  const valid = name.trim().length > 0;
  return <ProfileSheetFrame eyebrow="PROFILE" title="Display name" onClose={onClose}><label className="profile-field"><span>Name shown in DealRadar</span><input autoFocus data-dialog-initial-focus maxLength={40} value={name} onChange={event => setName(event.target.value)} placeholder="Your name"/></label><button className="profile-save" disabled={!valid} onClick={() => valid && onSave(name.trim())}>Save name</button></ProfileSheetFrame>;
}

function LocationProfileSheet({ current, onClose, onSave }: { current: ShoppingLocation; onClose: () => void; onSave: (location: ShoppingLocation) => void }) {
  const [zip, setZip] = useState(current.zipCode);
  const [status, setStatus] = useState<'idle' | 'zip-loading' | 'locating' | 'zip-error' | 'location-error'>('idle');
  const saveZip = async () => {
    const normalized = normalizeUsZip(zip);
    if (!normalized || status === 'zip-loading') { setStatus('zip-error'); return; }
    setStatus('zip-loading');
    try {
      onSave(await lookupUsZip(normalized));
    } catch {
      setStatus('zip-error');
    }
  };
  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setStatus('location-error'); return; }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(position => {
      try {
        onSave(deviceShoppingLocation(position.coords.longitude, position.coords.latitude, current));
      } catch {
        setStatus('location-error');
      }
    }, () => setStatus('location-error'), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 });
  };
  return <ProfileSheetFrame eyebrow="UNITED STATES" title="Distance origin" onClose={onClose}><p className="profile-sheet-copy">Choose how DealRadar measures store distance and driving cost. Your retailer-inventory area remains ZIP {current.zipCode}.</p><button autoFocus data-dialog-initial-focus className="profile-device-location" disabled={status === 'locating'} onClick={useCurrentLocation}><i>●</i><span><b>{status === 'locating' ? 'Finding your location…' : 'Use current device location'}</b><small>More precise distance and trip-cost estimates</small></span><em>{current.locationPrecision === 'device' ? 'Active ✓' : 'Use ›'}</em></button>{status === 'location-error' && <p className="profile-field-error">Location could not be used. Allow location access and make sure you are within the U.S., or use a ZIP-center origin below.</p>}<div className="profile-location-divider"><span>or use ZIP center</span></div><label className="profile-field"><span>5-digit ZIP code</span><input inputMode="numeric" value={zip} onChange={event => { setZip(event.target.value.replace(/\D/g, '').slice(0, 5)); setStatus('idle'); }} placeholder="28086"/></label>{status === 'zip-error' && <p className="profile-field-error">Enter a valid U.S. ZIP code and try again.</p>}<button className="profile-save" disabled={zip.length !== 5 || status === 'zip-loading' || status === 'locating'} onClick={saveZip}>{status === 'zip-loading' ? 'Finding ZIP…' : 'Use ZIP-center origin'}</button><small className="profile-sheet-note">Precise coordinates are saved in this browser and can be cleared under Privacy. Map providers receive the area you view; retailer inventory receives only your ZIP. ZIP lookup uses Zippopotam.us.</small></ProfileSheetFrame>;
}

function RadiusProfileSheet({ current, onClose, onSave }: { current: ProfilePreferences['searchRadius']; onClose: () => void; onSave: (radius: ProfilePreferences['searchRadius']) => void }) {
  const [radius, setRadius] = useState(current);
  const values: ProfilePreferences['searchRadius'][] = [5, 10, 25, 50, 100];
  return <ProfileSheetFrame eyebrow="LOCAL SHOPPING" title="Shopping radius" onClose={onClose}><p className="profile-sheet-copy">This becomes the default local Search distance and the Map’s distance quick filter. You can still explore stores across the U.S.</p><div className="profile-choice-grid">{values.map(value => <button key={value} className={radius === value ? 'selected' : ''} onClick={() => setRadius(value)}>{radius === value ? '✓ ' : ''}{value} miles</button>)}</div><button className="profile-save" onClick={() => onSave(radius)}>Save radius</button></ProfileSheetFrame>;
}

function FulfillmentProfileSheet({ current, onClose, onSave }: { current: ProfilePreferences['fulfillment']; onClose: () => void; onSave: (fulfillment: ProfilePreferences['fulfillment']) => void }) {
  const [value, setValue] = useState(current);
  const options: Array<{ value: ProfilePreferences['fulfillment']; title: string; note: string }> = [{ value: 'both', title: 'Pickup & shipping', note: 'Compare every verified option' }, { value: 'pickup', title: 'Pickup first', note: 'Start with local pickup results' }, { value: 'shipping', title: 'Shipping first', note: 'Start with shippable online results' }];
  return <ProfileSheetFrame eyebrow="SEARCH DEFAULT" title="Preferred fulfillment" onClose={onClose}><div className="profile-choice-list">{options.map(option => <button key={option.value} className={value === option.value ? 'selected' : ''} onClick={() => setValue(option.value)}><i>{value === option.value ? '✓' : ''}</i><span><b>{option.title}</b><small>{option.note}</small></span></button>)}</div><button className="profile-save" onClick={() => onSave(value)}>Save preference</button></ProfileSheetFrame>;
}

function CostAssumptionsProfileSheet({ salesTaxPercent, travelCostPerMile, onClose, onSave }: { salesTaxPercent: number; travelCostPerMile: number; onClose: () => void; onSave: (costs: Pick<ProfilePreferences, 'salesTaxPercent' | 'travelCostPerMile'>) => void }) {
  const [tax, setTax] = useState(salesTaxPercent.toFixed(2));
  const [travel, setTravel] = useState(travelCostPerMile.toFixed(2));
  const taxValue = Number(tax);
  const travelValue = Number(travel);
  const valid = Number.isFinite(taxValue) && taxValue >= 0 && taxValue <= 15 && Number.isFinite(travelValue) && travelValue >= 0 && travelValue <= 5;
  return <ProfileSheetFrame eyebrow="ESTIMATED TOTAL" title="Cost assumptions" onClose={onClose}><p className="profile-sheet-copy">Use rates that fit your shopping area and vehicle. DealRadar applies them consistently when ranking local pickup against online delivery.</p><div className="cost-assumption-fields"><label className="profile-field"><span>Sales tax assumption (%)</span><input autoFocus data-dialog-initial-focus inputMode="decimal" value={tax} onChange={event => setTax(event.target.value.replace(/[^0-9.]/g, ''))} aria-describedby="tax-range"/><small id="tax-range">0%–15%. Confirm the actual rate at checkout.</small></label><label className="profile-field"><span>Driving cost per mile ($)</span><input inputMode="decimal" value={travel} onChange={event => setTravel(event.target.value.replace(/[^0-9.]/g, ''))} aria-describedby="travel-range"/><small id="travel-range">$0–$5, applied to the round trip.</small></label></div>{!valid && <p className="profile-field-error">Enter a tax rate from 0% to 15% and a driving cost from $0 to $5 per mile.</p>}<button className="profile-save" disabled={!valid} onClick={() => valid && onSave({ salesTaxPercent: Math.round(taxValue * 100) / 100, travelCostPerMile: Math.round(travelValue * 100) / 100 })}>Save assumptions</button><small className="profile-sheet-note">These are planning estimates saved only on this device—not quotes from a retailer or tax authority.</small></ProfileSheetFrame>;
}

function PrivacyProfileSheet({ preferences, onClose, onCleared }: { preferences: ProfilePreferences; onClose: () => void; onCleared: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const savedProducts = parseSavedProducts(window.localStorage.getItem('dealradar-saved-products')).length;
  const savedStores = parseSavedStores(window.localStorage.getItem('dealradar-saved-stores')).length;
  let historyCount = 0;
  try { historyCount = Object.keys(JSON.parse(window.localStorage.getItem('dealradar-price-history') ?? '{}')).length; } catch { historyCount = 0; }
  const exportData = () => {
    const data: Record<string, unknown> = {};
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith('dealradar-')) {
        const raw = window.localStorage.getItem(key);
        try { data[key] = JSON.parse(raw ?? 'null'); } catch { data[key] = raw; }
      }
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `dealradar-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const clearShoppingData = () => {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)).filter((key): key is string => Boolean(key?.startsWith('dealradar-') && key !== 'dealradar-profile' && key !== 'dealradar-onboarding-version'));
    keys.forEach(key => window.localStorage.removeItem(key));
    window.localStorage.setItem('dealradar-profile', JSON.stringify(preferences));
    setConfirming(false);
    onCleared();
  };
  return <ProfileSheetFrame eyebrow="DEVICE-LOCAL DATA" title="Privacy & data" onClose={onClose}><p className="profile-sheet-copy">DealRadar stores prototype data in this browser. Retailer searches are sent only when you search or check an alert.</p><div className="profile-data-counts"><span><b>{savedProducts}</b><small>Saved products</small></span><span><b>{savedStores}</b><small>Saved stores</small></span><span><b>{historyCount}</b><small>Price histories</small></span></div><button className="profile-data-action" onClick={exportData}>⇩ <span><b>Export my DealRadar data</b><small>Download a readable JSON backup</small></span></button>{confirming ? <div className="profile-clear-confirm"><b>Clear saved shopping activity?</b><p>This removes saved products, stores, watches, history, and recent searches. Your Profile settings stay.</p><div><button onClick={() => setConfirming(false)}>Cancel</button><button onClick={clearShoppingData}>Clear data</button></div></div> : <button className="profile-data-action danger" onClick={() => setConfirming(true)}>× <span><b>Clear shopping data</b><small>Profile settings will be kept</small></span></button>}<small className="profile-sheet-note">The production app will need account controls and a published privacy policy before launch.</small></ProfileSheetFrame>;
}
