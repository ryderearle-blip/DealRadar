'use client';

import { useMemo, useState } from 'react';

type Tab = 'Search' | 'Map' | 'Saved' | 'Alerts' | 'Profile';
const tabs: Tab[] = ['Search', 'Map', 'Saved', 'Alerts', 'Profile'];
const icons: Record<Tab, string> = { Search: '⌕', Map: '⌖', Saved: '♡', Alerts: '♧', Profile: '○' };
const offers = [
  { store: 'Walmart', price: 726, distance: '2.4 mi', color: '#1674ea', mark: '✦', detail: 'Pickup today' },
  { store: 'Best Buy', price: 748, distance: '8.1 mi', color: '#f4ce12', mark: 'BEST', detail: 'In stock' },
  { store: 'Amazon', price: 749, distance: 'Online', color: '#152033', mark: 'a', detail: 'Free delivery' },
  { store: 'Target', price: 799, distance: '5.7 mi', color: '#d92332', mark: '◎', detail: 'Limited stock' },
];
const products = [
  ['Sony 55-inch TV', '726', 'Down $24', '▰'],
  ['Apple AirPods Pro', '189', '', '◉'],
  ['Nintendo Switch OLED', '299', 'In stock', '▣'],
];

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
  </section><aside><b>DealRadar</b><span>Interactive mobile prototype</span><small>Sample offers • Kings Mountain, NC</small></aside></main>;
}

function Search({ query, setQuery, open }: any) { return <section className="page search-page"><SearchBox value={query} setValue={setQuery} placeholder="What are you shopping for?"/><p className="label">RECENT SEARCH</p><button className="pill" onClick={open}>◷ Sony 55-inch TV</button><h2>Popular near you</h2><div className="categories">{[['▰','TVs'],['▱','Laptops'],['◉','Headphones'],['▣','Gaming']].map(x => <button key={x[1]} onClick={open}><b>{x[0]}</b><span>{x[1]}</span><i>›</i></button>)}</div><h2>Trending deals</h2><button className="trend" onClick={open}><i>SONY</i><span><b>Sony 55-inch TV</b><small>From</small><strong>$726</strong><small>4 stores</small></span><em>›</em></button></section> }
function SearchBox({ value, setValue, placeholder }: any) { return <label className="searchbox"><b aria-hidden="true">⌕</b><input aria-label={placeholder || 'Search products'} value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder}/></label> }
function Map({ query, setQuery, offer, setOffer, notify }: any) { return <section className="page map-page"><div className="map-top"><SearchBox value={query} setValue={setQuery}/><div className="chips"><button className="on">☆ Best total</button><button>▣ Pickup today</button><button>⌖ 10 mi</button></div></div><div className="map"><span className="road r1"/><span className="road r2"/><span className="road r3"/><strong className="city">Kings<br/>Mountain</strong><i className="home">⌂</i>{offers.map((x,i) => <button key={x.store} aria-label={`Select ${x.store} offer for $${x.price}`} className={`pin p${i} ${x.store === offer.store ? 'chosen':''}`} onClick={() => setOffer(x)} style={{'--pin':x.color} as React.CSSProperties}><span>{x.mark}</span><b>${x.price}</b></button>)}</div><article className="sheet"><i/><div className="sheet-head"><h2>Best deals nearby</h2><button aria-label="Save selected deal">♡</button></div><div className="deal"><b className="logo" style={{background:offer.color}}>{offer.mark}</b><span><h3>{offer.store}</h3><small>{offer.distance} · {offer.detail}</small><em>In stock</em></span><strong>${offer.price}.00<button onClick={() => notify(`Opening ${offer.store}`)}>View deal ›</button></strong></div></article></section> }
function Saved({ query, setQuery, products, notify }: any) { return <section className="page"><h2>Saved</h2><SearchBox value={query} setValue={setQuery} placeholder="Search saved items"/><div className="segments"><button className="on">Products</button><button>Stores</button></div><div className="summary"><b>♧</b><span><strong>3 price watches</strong><small>We’ll alert you when prices drop.</small></span></div><div className="saved-list">{products.map((p:any) => <article key={p[0]}><i>{p[3]}</i><span><h3>{p[0]}</h3><small>Best price</small><strong>${p[1]}</strong>{p[2] && <em>{p[2]}</em>}<button onClick={() => notify(`Viewing ${p[0]}`)}>View prices ›</button></span><b>♥</b></article>)}</div>{!products.length && <p className="empty">No saved items found.</p>}</section> }
function Alerts({ notify }: any) { return <section className="page"><h2>Price alerts</h2><article className="featured"><b>↓ Price drop <small>Now •</small></b><h3>Sony 55-inch TV</h3><strong>Now $726 — down $24</strong><p>✦ Walmart · 2.4 mi</p><button onClick={() => notify('Opening price-drop deal')}>View deal ›</button></article><h2 className="subhead">Earlier</h2>{[['◉','AirPods Pro dropped to $189','2h'],['▣','Nintendo Switch OLED is back in stock','Yesterday']].map(a => <button className="alert-row" key={a[1]}><i>{a[0]}</i><b>{a[1]}<small>Walmart · 2.4 mi</small></b><span>{a[2]} ›</span></button>)}</section> }
function Profile({ notify }: any) { const [a,setA]=useState(true); const [b,setB]=useState(true); return <section className="page"><h2>Profile</h2><article className="identity"><i>JD</i><span><h3>Jordan Davis</h3><button onClick={() => notify('Edit profile selected')}>Edit profile ›</button></span></article><h3 className="section-title">Shopping preferences</h3><div className="settings">{[['●','Home location','Kings Mountain, NC 28086'],['⌾','Search radius','10 miles'],['▣','Preferred fulfillment','Pickup & delivery']].map(x => <button key={x[1]}><i>{x[0]}</i><span><b>{x[1]}</b><small>{x[2]}</small></span><em>›</em></button>)}</div><h3 className="section-title">Notifications</h3><div className="settings toggles"><label><i>♧</i><b>Price-drop alerts</b><input type="checkbox" checked={a} onChange={e=>setA(e.target.checked)}/><span/></label><label><i>▣</i><b>Back-in-stock alerts</b><input type="checkbox" checked={b} onChange={e=>setB(e.target.checked)}/><span/></label></div><button className="privacy">♢ <b>Privacy & data</b><span>›</span></button></section> }
