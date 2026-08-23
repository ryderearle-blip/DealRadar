'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { filterAndSortOffers } from './search-logic';

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
};

type LivePrice = {
  id: string;
  retailer: string;
  title: string;
  price: number;
  regularPrice: number | null;
  currency: 'USD';
  availability: string;
  fulfillment: string[];
  imageUrl: string | null;
  productUrl: string;
  source: 'official-api';
  updatedAt: string;
};

type RetailerConnection = {
  retailer: string;
  state: 'connected' | 'needs_credentials' | 'partner_access' | 'unavailable';
  message: string;
  signupUrl?: string;
};

type PriceSearch = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  offers: LivePrice[];
  retailers: RetailerConnection[];
};

type SearchFilters = {
  sort: 'best' | 'price-low' | 'price-high' | 'distance';
  maxPrice: number | null;
  maxDistance: number | null;
  availability: 'all' | 'available';
  fulfillment: 'all' | 'pickup' | 'shipping';
  retailers: string[];
};

const emptyFilters: SearchFilters = {
  sort: 'best',
  maxPrice: null,
  maxDistance: null,
  availability: 'all',
  fulfillment: 'all',
  retailers: [],
};

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

const HOME: [number, number] = [-81.3627789, 35.2444756];
const MAPLIBRE_VERSION = '5.24.0';
let mapLibraryPromise: Promise<any> | null = null;

function loadMapLibrary() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Map requires a browser'));
  const mapWindow = window as typeof window & { maplibregl?: any };
  if (mapWindow.maplibregl) return Promise.resolve(mapWindow.maplibregl);
  if (mapLibraryPromise) return mapLibraryPromise;

  mapLibraryPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-dealradar-map]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
      stylesheet.dataset.dealradarMap = 'true';
      document.head.appendChild(stylesheet);
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-dealradar-map]');
    if (existing) {
      existing.addEventListener('load', () => resolve(mapWindow.maplibregl), { once: true });
      existing.addEventListener('error', () => reject(new Error('Map library failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
    script.async = true;
    script.dataset.dealradarMap = 'true';
    script.onload = () => resolve(mapWindow.maplibregl);
    script.onerror = () => reject(new Error('Map library failed to load'));
    document.head.appendChild(script);
  });

  return mapLibraryPromise;
}
const products = [
  ['Sony 55-inch TV', 'Waiting for live prices', '', '▰'],
  ['Apple AirPods Pro', 'Waiting for live prices', '', '◉'],
  ['Nintendo Switch OLED', 'Waiting for live prices', '', '▣'],
];

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

function milesBetween(from: [number, number], to: [number, number]) {
  const radians = (value: number) => value * Math.PI / 180;
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = radians(to[1] - from[1]);
  const longitudeDelta = radians(to[0] - from[0]);
  const calculation = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from[1])) * Math.cos(radians(to[1])) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation));
}

function nearestRetailerDistance(retailer: string) {
  const normalized = retailer.toLowerCase();
  const matchingStores = offers.filter(item => item.coordinates && item.store.toLowerCase().includes(normalized));
  if (!matchingStores.length) return null;
  return Math.min(...matchingStores.map(item => milesBetween(HOME, item.coordinates!)));
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('Map');
  const [query, setQuery] = useState('Sony 55-inch TV');
  const [savedQuery, setSavedQuery] = useState('');
  const [offer, setOffer] = useState(offers[0]);
  const [toast, setToast] = useState('');
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 1800); };
  const filtered = useMemo(() => products.filter(p => p[0].toLowerCase().includes(savedQuery.toLowerCase())), [savedQuery]);

  return <main className="stage"><section className="phone" aria-label="DealRadar prototype">
    <div className="status"><b>9:41</b><i/><span>▮▮▮ ))) ▰</span></div>
    <header><div><h1>Deal<span>Radar</span></h1>{tab !== 'Profile' && <button onClick={() => notify('Location set to 28086')}>● Kings Mountain, NC 28086⌄</button>}</div><button className="circle">{tab === 'Profile' ? '⚙' : '➤'}</button></header>
    <div className="content">
      {tab === 'Search' && <Search query={query} setQuery={setQuery} open={() => setTab('Map')}/>} 
      {tab === 'Map' && <Map query={query} setQuery={setQuery} offer={offer} setOffer={setOffer} notify={notify}/>} 
      {tab === 'Saved' && <Saved query={savedQuery} setQuery={setSavedQuery} products={filtered} notify={notify}/>} 
      {tab === 'Alerts' && <Alerts notify={notify}/>} 
      {tab === 'Profile' && <Profile notify={notify}/>} 
    </div>
    <nav>{tabs.map(item => <button key={item} aria-label={`Open ${item} tab`} aria-current={tab === item ? 'page' : undefined} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}><b aria-hidden="true">{icons[item]}</b>{item}</button>)}</nav>
    {toast && <div className="toast">{toast}</div>}
  </section><aside><b>DealRadar</b><span>Interactive mobile prototype</span><small>Real U.S. stores • Verified price feeds only</small></aside></main>;
}

function Search({ query, setQuery, open }: any) {
  const priceSearch = useVerifiedPriceSearch(String(query));
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [draft, setDraft] = useState<SearchFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isSearching = String(query).trim().length >= 2;

  const filteredOffers = useMemo(() => filterAndSortOffers(priceSearch.offers, filters, nearestRetailerDistance), [filters, priceSearch.offers]);

  const appliedCount = [
    filters.sort !== 'best', filters.maxPrice !== null, filters.maxDistance !== null,
    filters.availability !== 'all', filters.fulfillment !== 'all', filters.retailers.length > 0,
  ].filter(Boolean).length;
  const beginFiltering = () => { setDraft(filters); setFiltersOpen(true); };

  return <section className="page search-page">
    <SearchBox value={query} setValue={setQuery} placeholder="What are you shopping for?"/>
    {!isSearching ? <>
      <p className="label">RECENT SEARCH</p><button className="pill" onClick={() => setQuery('Sony 55-inch TV')}>◷ Sony 55-inch TV</button>
      <h2>Popular near you</h2><div className="categories">{[['▰','TVs'],['▱','Laptops'],['◉','Headphones'],['▣','Gaming']].map(x => <button key={x[1]} onClick={() => setQuery(x[1])}><b>{x[0]}</b><span>{x[1]}</span><i>›</i></button>)}</div>
    </> : <>
      <div className="search-filter-bar">
        <button className="filter-main" onClick={beginFiltering}><span>☷</span> Filters {appliedCount > 0 && <b>{appliedCount}</b>}</button>
        <button className={filters.fulfillment === 'pickup' ? 'active' : ''} onClick={() => setFilters(current => ({ ...current, fulfillment: current.fulfillment === 'pickup' ? 'all' : 'pickup' }))}>Pickup</button>
        <button className={filters.availability === 'available' ? 'active' : ''} onClick={() => setFilters(current => ({ ...current, availability: current.availability === 'available' ? 'all' : 'available' }))}>In stock</button>
        <button className={filters.maxPrice === 500 ? 'active' : ''} onClick={() => setFilters(current => ({ ...current, maxPrice: current.maxPrice === 500 ? null : 500 }))}>Under $500</button>
      </div>
      <div className="search-result-heading"><div><small>VERIFIED RETAILER RESULTS</small><h2>{priceSearch.status === 'loading' ? 'Searching…' : `${filteredOffers.length} results`}</h2></div><button onClick={beginFiltering}>{filters.sort === 'best' ? 'Best match' : filters.sort === 'price-low' ? 'Lowest price' : filters.sort === 'price-high' ? 'Highest price' : 'Nearest'}⌄</button></div>
      {priceSearch.status === 'loading' && <div className="search-loading"><span/><b>Checking official price feeds</b><small>Prices are never estimated.</small></div>}
      {priceSearch.status === 'error' && <div className="search-no-results"><b>Search is temporarily unavailable</b><span>Try again in a moment.</span></div>}
      {priceSearch.status === 'ready' && filteredOffers.length > 0 && <div className="search-results">{filteredOffers.map(item => {
        const distance = nearestRetailerDistance(item.retailer);
        return <article key={item.id}><div className="result-brand">{item.retailer === 'Best Buy' ? 'BEST' : item.retailer.slice(0, 2).toUpperCase()}</div><div className="result-copy"><small>{item.retailer} · {distance === null ? 'Online' : `${distance.toFixed(1)} mi`}</small><h3>{item.title}</h3><span>{item.availability}{item.fulfillment.length ? ` · ${item.fulfillment.join(' & ')}` : ''}</span><b>Official API</b></div><div className="result-price"><strong>${item.price.toFixed(2)}</strong>{item.regularPrice && item.regularPrice > item.price ? <small>was ${item.regularPrice.toFixed(2)}</small> : null}<a href={item.productUrl} target="_blank" rel="noreferrer">View deal ›</a></div></article>;
      })}</div>}
      {priceSearch.status === 'ready' && filteredOffers.length === 0 && <div className="search-no-results"><b>{priceSearch.offers.length ? 'No results match these filters' : 'Retailer connection needed'}</b><span>{priceSearch.offers.length ? 'Change or reset your filters to see more options.' : 'The search and filters are ready. Live results will appear after an approved retailer feed is connected.'}</span>{appliedCount > 0 && <button onClick={() => setFilters(emptyFilters)}>Reset filters</button>}<button className="map-link" onClick={open}>Browse real stores on the map</button></div>}
    </>}
    {filtersOpen && <SearchFilterSheet
      draft={draft}
      setDraft={setDraft}
      onClose={() => setFiltersOpen(false)}
      onApply={() => { setFilters(draft); setFiltersOpen(false); }}
    />}
  </section>;
}

function SearchFilterSheet({ draft, setDraft, onClose, onApply }: { draft: SearchFilters; setDraft: (filters: SearchFilters) => void; onClose: () => void; onApply: () => void }) {
  const retailerOptions = ['Best Buy', 'Walmart', 'Amazon', 'Target', 'Apple', 'Micro Center'];
  const update = (change: Partial<SearchFilters>) => setDraft({ ...draft, ...change });
  const toggleRetailer = (retailer: string) => update({ retailers: draft.retailers.includes(retailer) ? draft.retailers.filter(item => item !== retailer) : [...draft.retailers, retailer] });

  return <div className="filter-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title"><div className="filter-sheet-head"><div><small>REFINE RESULTS</small><h2 id="filter-title">Search filters</h2></div><button onClick={onClose} aria-label="Close filters">×</button></div>
    <label className="filter-field"><span>Sort results</span><select value={draft.sort} onChange={event => update({ sort: event.target.value as SearchFilters['sort'] })}><option value="best">Best match</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="distance">Distance: nearest first</option></select></label>
    <div className="filter-grid"><label className="filter-field"><span>Maximum price</span><select value={draft.maxPrice ?? ''} onChange={event => update({ maxPrice: event.target.value ? Number(event.target.value) : null })}><option value="">Any price</option><option value="100">Under $100</option><option value="250">Under $250</option><option value="500">Under $500</option><option value="1000">Under $1,000</option><option value="2000">Under $2,000</option></select></label><label className="filter-field"><span>Store distance</span><select value={draft.maxDistance ?? ''} onChange={event => update({ maxDistance: event.target.value ? Number(event.target.value) : null })}><option value="">Any distance</option><option value="5">Within 5 miles</option><option value="10">Within 10 miles</option><option value="25">Within 25 miles</option><option value="50">Within 50 miles</option></select></label></div>
    <fieldset><legend>Availability</legend><div className="filter-options">{[['all','Any availability'],['available','In stock only']].map(option => <button key={option[0]} className={draft.availability === option[0] ? 'selected' : ''} onClick={() => update({ availability: option[0] as SearchFilters['availability'] })}>{draft.availability === option[0] ? '✓ ' : ''}{option[1]}</button>)}</div></fieldset>
    <fieldset><legend>Fulfillment</legend><div className="filter-options">{[['all','Any'],['pickup','Pickup'],['shipping','Shipping']].map(option => <button key={option[0]} className={draft.fulfillment === option[0] ? 'selected' : ''} onClick={() => update({ fulfillment: option[0] as SearchFilters['fulfillment'] })}>{draft.fulfillment === option[0] ? '✓ ' : ''}{option[1]}</button>)}</div></fieldset>
    <fieldset><legend>Retailers</legend><div className="retailer-options">{retailerOptions.map(retailer => <button key={retailer} className={draft.retailers.includes(retailer) ? 'selected' : ''} onClick={() => toggleRetailer(retailer)}>{draft.retailers.includes(retailer) ? '✓ ' : ''}{retailer}</button>)}</div></fieldset>
    <div className="filter-actions"><button onClick={() => setDraft(emptyFilters)}>Reset all</button><button className="apply" onClick={onApply}>Show results</button></div>
  </section></div>;
}
function SearchBox({ value, setValue, placeholder }: any) { return <label className="searchbox"><b aria-hidden="true">⌕</b><input aria-label={placeholder || 'Search products'} value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder}/></label> }
type MapView = { radius: number; count: number };

function InteractiveMap({ offer, setOffer, view, setView }: { offer: Offer; setOffer: (offer: Offer) => void; view: MapView; setView: (view: MapView) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const selectedOfferRef = useRef(offer);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [needsZoom, setNeedsZoom] = useState(false);

  useEffect(() => {
    selectedOfferRef.current = offer;
  }, [offer]);

  useEffect(() => {
    let cancelled = false;
    let map: any;
    const markers: { marker: any; element: HTMLElement; offer?: Offer }[] = [];
    let liveMarkers: { marker: any; element: HTMLElement; offer?: Offer }[] = [];
    let searchController: AbortController | null = null;
    let refreshTimer = 0;
    const storeCache = new globalThis.Map<string, Offer[]>();

    loadMapLibrary().then((maplibregl) => {
      if (cancelled || !containerRef.current) return;

      map = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [-81.242, 35.251],
        zoom: 10.35,
        minZoom: 3.4,
        maxZoom: 18,
        maxBounds: [[-171, 18], [-66, 72]],
        renderWorldCopies: false,
        attributionControl: false,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'imperial' }), 'bottom-left');

      const home = document.createElement('div');
      home.className = 'map-home-marker';
      home.setAttribute('aria-label', 'Home area: Kings Mountain, NC 28086');
      home.innerHTML = '<span>⌂</span>';
      markers.push({ marker: new maplibregl.Marker({ element: home, anchor: 'center' }).setLngLat(HOME).addTo(map), element: home });

      const createOfferMarker = (item: Offer, live = false) => {
        const marker = document.createElement('button');
        marker.type = 'button';
        marker.className = `price-marker${live ? ' live-store-marker' : ''}${item.price === null ? ' no-price' : ''}`;
        marker.dataset.offerId = item.id ?? item.store;
        const priceLabel = item.price === null ? 'price feed unavailable' : `$${item.price}`;
        marker.setAttribute('aria-label', `${item.store}, ${priceLabel}, ${item.distance}`);
        marker.style.setProperty('--marker-color', item.color);
        const brand = document.createElement('span');
        brand.textContent = item.mark;
        const price = document.createElement('strong');
        price.textContent = item.price === null ? 'Store' : `$${item.price}`;
        marker.appendChild(brand);
        marker.appendChild(price);
        marker.addEventListener('click', () => setOffer(item));
        return { marker: new maplibregl.Marker({ element: marker, anchor: 'bottom' }).setLngLat(item.coordinates!).addTo(map), element: marker, offer: item };
      };

      offers.filter(item => item.coordinates).forEach((item) => {
        markers.push(createOfferMarker(item));
      });

      const getRadius = () => {
        const zoom = map.getZoom();
        return zoom >= 10.2 ? 20
          : zoom >= 9.2 ? 30
            : zoom >= 8.2 ? 45
              : zoom >= 7 ? 80
                : zoom >= 5.5 ? 250
                  : zoom >= 4 ? 600
                    : 1500;
      };

      const updateVisibleStores = () => {
        const bounds = map.getBounds();
        const visibleStores = markers.filter(entry => entry.offer?.coordinates && bounds.contains(entry.offer.coordinates));
        const visibleLiveStores = liveMarkers.filter(entry => entry.offer?.coordinates && bounds.contains(entry.offer.coordinates));
        markers.forEach(entry => {
          if (!entry.offer) return;
          const hidden = !entry.offer.coordinates || !bounds.contains(entry.offer.coordinates);
          entry.element.classList.toggle('marker-hidden', hidden);
          entry.element.hidden = hidden;
          entry.element.setAttribute('aria-hidden', String(hidden));
        });
        liveMarkers.forEach(entry => {
          if (!entry.offer) return;
          const hidden = !entry.offer.coordinates || !bounds.contains(entry.offer.coordinates);
          entry.element.hidden = hidden;
          entry.element.setAttribute('aria-hidden', String(hidden));
        });

        const allVisibleStores = [...visibleStores, ...visibleLiveStores];
        const visibleOffers = allVisibleStores.flatMap(entry => entry.offer ? [entry.offer] : []);
        const selectedId = selectedOfferRef.current.id ?? selectedOfferRef.current.store;
        if (visibleOffers.length && !visibleOffers.some(item => (item.id ?? item.store) === selectedId)) {
          const pricedOffers = visibleOffers.filter(item => item.price !== null);
          const bestVisibleOffer = pricedOffers.length
            ? pricedOffers.reduce((best, item) => Number(item.price) < Number(best.price) ? item : best)
            : visibleOffers[0];
          selectedOfferRef.current = bestVisibleOffer;
          setOffer(bestVisibleOffer);
        }
        setView({ radius: getRadius(), count: allVisibleStores.length });
      };

      const storeVisual = (name: string) => {
        const normalized = name.toLowerCase();
        if (normalized.includes('best buy')) return { mark: 'BEST', color: '#f4ce12' };
        if (normalized.includes('target')) return { mark: '◎', color: '#d92332' };
        if (normalized.includes('walmart')) return { mark: '✦', color: '#1674ea' };
        if (normalized.includes('gamestop')) return { mark: 'GS', color: '#d21f2b' };
        if (normalized.includes('apple')) return { mark: '', color: '#1d1d1f' };
        const mark = name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
        return { mark: mark || 'S', color: '#176b73' };
      };

      const refreshRealStores = async () => {
        if (cancelled) return;
        const zoom = map.getZoom();
        searchController?.abort();

        if (zoom < 9) {
          liveMarkers.forEach(entry => entry.marker.remove());
          liveMarkers = [];
          setNeedsZoom(true);
          setRefreshing(false);
          updateVisibleStores();
          return;
        }

        setNeedsZoom(false);
        setRefreshing(true);
        const bounds = map.getBounds();
        const south = Math.max(18, bounds.getSouth());
        const west = Math.max(-171, bounds.getWest());
        const north = Math.min(72, bounds.getNorth());
        const east = Math.min(-66, bounds.getEast());
        const cacheKey = [south, west, north, east].map(value => value.toFixed(2)).join(':');

        try {
          let realStores = storeCache.get(cacheKey);
          if (!realStores) {
            const query = `[out:json][timeout:15];area["ISO3166-1"="US"][admin_level=2]->.us;nwr["shop"~"^(electronics|department_store|computer|appliance|video_games)$"](area.us)(${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)});out center 35;`;
            searchController = new AbortController();
            const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, {
              signal: searchController.signal,
              headers: { Accept: 'application/json' },
            });
            if (!response.ok) throw new Error('Store search unavailable');
            const data = await response.json() as { elements?: any[] };
            realStores = (data.elements ?? []).flatMap((element: any) => {
              const tags = element.tags ?? {};
              const name = tags.name || tags.brand;
              const lat = element.lat ?? element.center?.lat;
              const lng = element.lon ?? element.center?.lon;
              if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
              const duplicate = offers.some(item => item.coordinates && item.store.toLowerCase().includes(String(name).toLowerCase()) && Math.abs(item.coordinates[0] - lng) < .01 && Math.abs(item.coordinates[1] - lat) < .01);
              if (duplicate) return [];
              const visual = storeVisual(String(name));
              const streetAddress = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
              const locality = [tags['addr:city'], tags['addr:state']].filter(Boolean).join(', ');
              return [{
                id: `osm-${element.type}-${element.id}`,
                store: String(name),
                price: null,
                distance: 'Visible map area',
                color: visual.color,
                mark: visual.mark,
                detail: 'Price feed not connected',
                address: [streetAddress, locality].filter(Boolean).join(' · ') || 'Mapped business location',
                coordinates: [Number(lng), Number(lat)] as [number, number],
              } satisfies Offer];
            });
            storeCache.set(cacheKey, realStores);
          }

          if (cancelled) return;
          liveMarkers.forEach(entry => entry.marker.remove());
          liveMarkers = (realStores ?? []).map((item: Offer) => createOfferMarker(item, true));
          updateVisibleStores();
          setRefreshing(false);
        } catch (error) {
          if ((error as Error).name === 'AbortError') return;
          if (!cancelled) {
            updateVisibleStores();
            setRefreshing(false);
          }
        }
      };

      const scheduleRefresh = () => {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(refreshRealStores, 320);
      };

      map.on('movestart', () => setRefreshing(true));
      map.on('moveend', scheduleRefresh);

      map.once('load', () => {
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
    };
  }, [setOffer, setView]);

  useEffect(() => {
    containerRef.current?.querySelectorAll<HTMLElement>('.price-marker').forEach(marker => {
      marker.classList.toggle('chosen', marker.dataset.offerId === (offer.id ?? offer.store));
    });
  }, [offer.id, offer.store, status]);

  const recenter = () => mapRef.current?.easeTo({ center: [-81.242, 35.251], zoom: 10.35, duration: 700 });

  return <div className="map-shell">
    <div ref={containerRef} className="map" aria-label="Interactive DealRadar store map" />
    {status === 'loading' && <div className="map-loading"><span />Loading detailed map…</div>}
    {status === 'error' && <div className="map-loading map-error">Map unavailable. Check your connection.</div>}
    <div className="map-guide">Drag to explore · Scroll or pinch to zoom</div>
    <button className="recenter" onClick={recenter} aria-label="Recenter map on nearby deals">⌖ <span>Recenter</span></button>
    <div className={`sample-badge ${refreshing ? 'refreshing' : ''}`}><b>{refreshing ? 'Searching area…' : needsZoom ? 'Zoom in for stores' : `${view.count} real stores`}</b><span>{refreshing ? 'Checking mapped retailers' : needsZoom ? 'Real locations load closer' : 'U.S. mapped locations only'}</span></div>
  </div>;
}

function Map({ query, setQuery, offer, setOffer, notify }: any) {
  const [view, setView] = useState<MapView>({ radius: 20, count: 3 });
  const prices = useVerifiedPriceSearch(String(query));

  return <section className="page map-page">
    <div className="map-top"><SearchBox value={query} setValue={setQuery}/><div className="chips"><button className="on">☆ Verified prices</button><button>▣ Pickup today</button><button>⌖ ~{view.radius} mi view</button></div></div>
    <InteractiveMap offer={offer} setOffer={setOffer} view={view} setView={setView}/>
    <article className="sheet"><i/>
      <div className="sheet-head"><div><small>{view.count} real stores in this map area</small><h2>Deals in this area</h2></div><button aria-label="Save selected deal">♡</button></div>
      {view.count > 0 ? <div className="deal"><b className="logo" style={{background:offer.color}}>{offer.mark}</b><span><h3>{offer.store}</h3><small>{offer.distance} · {offer.detail}</small><small className="address">{offer.address}</small><em>Mapped location</em></span><strong className="no-price">Price unavailable<button onClick={() => notify(`Opening ${offer.store}`)}>Store details ›</button></strong></div> : <div className="area-empty"><b>No mapped stores at this view</b><span>Zoom in or move the map to search another U.S. area.</span></div>}
      <LivePriceResults query={query} search={prices}/>
      <div className="deal-note"><span>✓</span><p><b>Verified prices only</b><small>Unconnected retailers never receive an estimated price</small></p></div>
    </article>
  </section>;
}

function LivePriceResults({ query, search }: { query: string; search: PriceSearch }) {
  if (search.status === 'idle') return <div className="price-feed-state"><b>Search for a product</b><span>DealRadar will check connected official retailer feeds.</span></div>;
  if (search.status === 'loading') return <div className="price-feed-state loading"><b>Checking official price feeds…</b><span>Looking for “{query}”</span></div>;
  if (search.status === 'error') return <div className="price-feed-state error"><b>Price search is unavailable</b><span>Please try again in a moment.</span></div>;

  if (search.offers.length) {
    return <section className="live-prices" aria-label="Verified live prices"><div className="live-prices-title"><b>Verified live prices</b><a href="https://developer.bestbuy.com/" target="_blank" rel="noreferrer" aria-label="Powered by the Best Buy Developer API">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="https://developer.bestbuy.com/images/bestbuy-logo.png" alt="Best Buy Developer API"/></a></div>{search.offers.slice(0, 2).map(item => <article key={item.id}><span><b>{item.title}</b><small>{item.retailer} · {item.availability}</small></span><strong>${item.price.toFixed(2)}<a href={item.productUrl} target="_blank" rel="noreferrer">View ›</a></strong></article>)}</section>;
  }

  const connected = search.retailers.filter(item => item.state === 'connected').length;
  const ready = search.retailers.find(item => item.state === 'needs_credentials');
  return <div className="price-feed-state"><b>{connected ? 'No matching live prices' : 'Retailer access needed'}</b><span>{connected ? `No connected feed matched “${query}”.` : `${ready?.retailer ?? 'Retailer'} integration is built and waiting for approved credentials.`}</span><small>{search.retailers.filter(item => item.state === 'partner_access').map(item => item.retailer).join(' and ')} require partner approval.</small></div>;
}

function Saved({ query, setQuery, products, notify }: any) { return <section className="page"><h2>Saved</h2><SearchBox value={query} setValue={setQuery} placeholder="Search saved items"/><div className="segments"><button className="on">Products</button><button>Stores</button></div><div className="summary"><b>♧</b><span><strong>3 price watches</strong><small>Alerts begin when a verified feed is connected.</small></span></div><div className="saved-list">{products.map((p:any) => <article key={p[0]}><i>{p[3]}</i><span><h3>{p[0]}</h3><small>Verified price</small><strong>{p[1]}</strong>{p[2] && <em>{p[2]}</em>}<button onClick={() => notify(`Viewing ${p[0]}`)}>Check feeds ›</button></span><b>♥</b></article>)}</div>{!products.length && <p className="empty">No saved items found.</p>}</section> }
function Alerts({ notify }: any) { return <section className="page"><h2>Price alerts</h2><article className="featured feed-waiting"><b>Verified alerts</b><h3>No confirmed price drops yet</h3><strong>Retailer connection needed</strong><p>DealRadar will only alert you using prices received from an approved retailer feed.</p><button onClick={() => notify('Retailer connection status opened')}>View connection status ›</button></article><h2 className="subhead">Watching</h2>{[['◉','Apple AirPods Pro'],['▣','Nintendo Switch OLED']].map(a => <button className="alert-row" key={a[1]}><i>{a[0]}</i><b>{a[1]}<small>Waiting for a verified price</small></b><span>›</span></button>)}</section> }
function Profile({ notify }: any) { const [a,setA]=useState(true); const [b,setB]=useState(true); return <section className="page"><h2>Profile</h2><article className="identity"><i>JD</i><span><h3>Jordan Davis</h3><button onClick={() => notify('Edit profile selected')}>Edit profile ›</button></span></article><h3 className="section-title">Shopping preferences</h3><div className="settings">{[['●','Home location','Kings Mountain, NC 28086'],['⌾','Search radius','10 miles'],['▣','Preferred fulfillment','Pickup & delivery']].map(x => <button key={x[1]}><i>{x[0]}</i><span><b>{x[1]}</b><small>{x[2]}</small></span><em>›</em></button>)}</div><h3 className="section-title">Notifications</h3><div className="settings toggles"><label><i>♧</i><b>Price-drop alerts</b><input type="checkbox" checked={a} onChange={e=>setA(e.target.checked)}/><span/></label><label><i>▣</i><b>Back-in-stock alerts</b><input type="checkbox" checked={b} onChange={e=>setB(e.target.checked)}/><span/></label></div><button className="privacy">♢ <b>Privacy & data</b><span>›</span></button></section> }
