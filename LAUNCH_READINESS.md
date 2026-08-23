# DealRadar launch readiness

DealRadar is a working mobile web prototype, not yet a production shopping service. This checklist keeps launch claims aligned with what the app can actually verify.

## Retailer feeds

- [x] Best Buy official catalog connector implemented
- [x] Server-only credential handling and live connection probe
- [ ] Add and verify a production `BEST_BUY_API_KEY`
- [ ] Obtain Amazon Associates and Creators API approval before implementing its connector
- [ ] Confirm an eligible Walmart partner program and OAuth scope before implementing its connector
- [ ] Review each retailer's display, attribution, caching, and deep-link terms before release
- [ ] Keep Target, Apple, and Micro Center price-free unless an approved official feed becomes available

## Store data and maps

- [x] Real U.S. store discovery from OpenStreetMap records
- [x] U.S. map bounds, pan/zoom loading, and honest mapped-location labels
- [ ] Replace the shared public Overpass endpoint with a production-ready store index or contracted map data service
- [ ] Add server-side caching, deduplication, monitoring, and an update schedule for store locations
- [ ] Verify required OpenStreetMap and map-tile attribution in the final distribution

## Alerts and persistence

- [x] Device-local saved products, stores, observed price history, and manual verified checks
- [ ] Add authenticated accounts and durable server storage for cross-device use
- [ ] Add a scheduled server-side price-check worker before claiming background alerts
- [ ] Add approved email, push, or SMS delivery with consent and unsubscribe controls
- [ ] Define retry, stale-price, retailer-outage, and notification-deduplication policies

## Trust, privacy, and operations

- [x] No fabricated prices and explicit product-match labels
- [x] Device-local export and confirmed shopping-data clearing
- [ ] Publish Terms of Use, Privacy Policy, affiliate disclosures, and data-retention policy
- [ ] Complete security review, secret rotation plan, rate limits, abuse protection, and dependency audit
- [ ] Add error monitoring, availability checks, analytics consent, and retailer-feed health alerts
- [ ] Complete accessibility, iPhone Safari, Android Chrome, desktop, and slow-network testing
- [ ] Add unit, API-contract, integration, and end-to-end tests to continuous integration

## Deployment

- [x] Production build succeeds locally
- [x] GitHub main branch contains the validated source
- [ ] Approve dependency build scripts required by the hosting pipeline
- [ ] Configure hosted secrets and run a private staging deployment
- [ ] Verify every critical flow in staging before selecting public access
