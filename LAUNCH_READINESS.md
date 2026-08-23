# DealRadar launch readiness

DealRadar is a working mobile web prototype, not yet a production shopping service. This checklist keeps launch claims aligned with what the app can actually verify.

## Retailer feeds

- [x] Best Buy official catalog connector implemented
- [x] Best Buy near-real-time store-pickup inventory connector implemented
- [x] Apply fresh store inventory to local distance, total-cost ranking, and Local filtering
- [x] Server-only credential handling and live connection probe
- [ ] Add and verify a production `BEST_BUY_API_KEY`
- [ ] Obtain Amazon Associates and Creators API approval before implementing its connector
- [ ] Obtain an approved Walmart affiliate data feed or written consumer-comparison API access before implementing its connector
- [ ] Obtain eBay Buy API production approval and an eBay Partner Network campaign before implementing its connector
- [ ] Review each retailer's display, attribution, caching, and deep-link terms before release
- [ ] Keep Target, Apple, and Micro Center price-free unless an approved official feed becomes available

## Store data and maps

- [x] Real U.S. store discovery from OpenStreetMap records
- [x] U.S. map bounds, pan/zoom loading, and honest mapped-location labels
- [x] Approximate home-to-store distance plus Apple Maps and Google Maps routes
- [x] Optional same-origin device location for precise distance and trip-cost estimates, with ZIP-center fallback and device-local disclosure
- [x] Load real nearby mapped stores for nationwide Search distance and total-cost planning instead of starter-region fallbacks
- [x] Keep Search useful without a price feed by showing source-backed nearby stores, directions, and exact Map handoff
- [x] Preserve real map categories and use product-aware store matching in Search without implying item availability
- [x] Server-side U.S. boundary validation, six-hour caching, and nearby-record deduplication
- [ ] Replace the shared public Overpass endpoint with a production-ready store index or contracted map data service
- [ ] Add monitoring and an update schedule for store locations
- [x] Verify required OpenStreetMap and map-tile attribution in the final distribution

## Alerts and persistence

- [x] Device-local saved products, stores, observed price history, and manual verified checks
- [ ] Add authenticated accounts and durable server storage for cross-device use
- [ ] Add a scheduled server-side price-check worker before claiming background alerts
- [ ] Add approved email, push, or SMS delivery with consent and unsubscribe controls
- [ ] Define retry, stale-price, retailer-outage, and notification-deduplication policies

## Trust, privacy, and operations

- [x] No fabricated prices and explicit product-match labels
- [x] Show official-feed verification age and mark saved prices stale after 24 hours
- [x] Keep incomplete totals below complete totals when sorting by estimated total cost
- [x] Recommend only fresh exact matches with complete costs, and require confirmed pickup before a local option can win
- [x] Device-local export and confirmed shopping-data clearing
- [x] Publish private pre-launch Terms of Use, Privacy Policy, affiliate disclosure, and device-local retention explanation
- [ ] Have qualified counsel review the policies, confirm the operating entity and governing law, and activate the listed legal/privacy/partner mailboxes before public launch
- [x] Audit all locked dependencies in CI and apply baseline browser security headers
- [x] Add baseline per-client request limits to upstream-backed API routes
- [ ] Complete an external security review, secret rotation plan, and distributed abuse protection
- [x] Add privacy-safe analytics consent and minimal client error monitoring with optional collector forwarding
- [x] Document backup-name preliminary screening for trademark counsel
- [x] Make the visible wordmark and metadata configurable without redesigning the app
- [ ] Configure the hosted observability collector and alert rules
- [ ] Add external availability checks and retailer-feed health alerts
- [x] Expose a non-cacheable, secret-free application health endpoint for staging monitors
- [x] Add contained focus, Escape dismissal, and focus restoration to interactive sheets
- [ ] Complete accessibility, iPhone Safari, Android Chrome, desktop, and slow-network testing
- [x] Run unit, API-contract, secret-safety, type, lint, build, and artifact checks in GitHub CI
- [ ] Add browser-level integration and end-to-end tests after the staging environment is available

## Deployment

- [x] Production build succeeds locally
- [x] GitHub main branch contains the validated source
- [x] Resolve dependency build-script policy without enabling unreviewed scripts
- [x] Run an owner-only private staging deployment
- [ ] Configure the hosted `BEST_BUY_API_KEY`
- [ ] Verify every critical flow in staging before selecting public access
