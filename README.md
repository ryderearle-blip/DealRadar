# DealRadar

[![DealRadar CI](https://github.com/ryderearle-blip/DealRadar/actions/workflows/ci.yml/badge.svg)](https://github.com/ryderearle-blip/DealRadar/actions/workflows/ci.yml)

DealRadar compares verified retailer prices with real U.S. store locations. The app never creates an estimated retailer price when a live feed is unavailable.

## Retailer connections

| Retailer | Status | Requirement |
| --- | --- | --- |
| Best Buy | Connector implemented | Add `BEST_BUY_API_KEY` from the [Best Buy Developer Portal](https://developer.bestbuy.com/) |
| Amazon | Partner access required | Approved Amazon Associates account and Creators API credentials |
| Walmart | Partner access required | Approved Walmart Marketplace integration and OAuth credentials |
| Target | Location only | No public consumer product-price API is documented |
| Apple | Location only | Apple developer APIs do not expose Apple Store hardware pricing |
| Micro Center | Location only | No public product and store-inventory API is documented |

The in-app Retailer connections panel reads `/api/retailers`. A configured key is not labeled live until a server-side probe succeeds; secret values are never returned to the browser.

## Local setup

Copy `.env.example` to `.env.local`, add approved retailer credentials, then run the existing development command. Credentials are read only by the server-side `/api/offers` endpoint and must never use a `NEXT_PUBLIC_` prefix.

Store discovery uses mapped OpenStreetMap records. Price results use official retailer APIs only.

## Search features

- Predictive product, brand, model, and recent-search suggestions
- Local, online, or combined result scopes
- Camera barcode scanning with manual UPC/EAN fallback
- Exact, similar, and possible product-match labels
- Estimated total-cost comparison using verified shipping, location tax, and round-trip travel
- Selection and side-by-side comparison for up to three offers
- Device-local history built only from observed official prices, with price-alert shortcuts

## Map features

- Interactive map and nearest-first store list built from real OpenStreetMap locations
- Approximate straight-line distance from the saved home area for every mapped store
- Working 25-mile and connected-price filters that update as the map moves
- Store saving, Apple Maps and Google Maps driving directions from home, and map focus from the store list
- Selected-retailer catalog prices from connected official feeds, with clear inventory caveats

## Saved features

- One device-local collection shared by Search and Map
- Search and sorting for saved products and real store locations
- Verified-price watches, product re-search, retailer links, and store directions
- Immediate removal controls and honest empty states instead of placeholder deals

## Alert features

- Price watches created from Saved or verified price history
- Manual checks against exact product matches from connected official feeds
- Any-drop, 5%, 10%, and custom target prices plus back-in-stock monitoring
- Latest verified-price comparison, clear match status, and editable watch settings

## Profile features

- Editable device-local profile and U.S. home ZIP lookup
- Home-centered map, location-based distance estimates, and configurable shopping radius
- Default pickup or shipping preference applied to Search
- Notification preferences plus DealRadar data export and confirmed shopping-data clearing

## First-run and mobile experience

- Three-step onboarding for verified pricing, U.S. home area, radius, and fulfillment defaults
- Offline status feedback and live Saved/Alerts navigation counts
- Replayable product tour from Profile
- Installable mobile-app manifest, iPhone safe-area support, and standalone display metadata
- Accessible sheets with contained focus, Escape dismissal, and focus restoration

See [LAUNCH_READINESS.md](./LAUNCH_READINESS.md) for the remaining production requirements and current prototype limits.

## Verification

Every push and pull request runs the same staging gate: unit and contract tests, server-secret boundary checks, TypeScript, lint, a production build, and final artifact inspection. Run `pnpm verify` locally before staging.

Store discovery is served through `/api/stores`. The endpoint accepts a small U.S. map bounding box, validates and normalizes it, queries OpenStreetMap, removes nearby duplicate records, and returns a cacheable location-only response. It intentionally does not invent store prices or inventory.

Private staging monitors can call `/api/health` for a non-cacheable, secret-free readiness response. Optional retailer setup is reported separately from application availability, so a missing retailer key never masquerades as an app outage.

The release gate audits all locked application and build dependencies for high-severity advisories. Browser responses receive framing, content-type, referrer, permissions, transport, and content-security protections while retaining the map, ZIP lookup, barcode camera, and official image sources DealRadar needs.

Upstream-backed store discovery, offer search, and retailer health probes use bounded per-client request windows with non-cacheable retry responses. The health endpoint remains unrestricted so availability monitors are not mistaken for abusive traffic.
