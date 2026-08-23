# DealRadar

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
