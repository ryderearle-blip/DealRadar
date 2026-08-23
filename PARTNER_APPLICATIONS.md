# Retailer and affiliate application pack

Updated August 23, 2026. Recheck each program's current agreement before submitting.

## Reusable product description

**Short description**

> [WORKING NAME] is a U.S. shopping comparison service that helps people find products online and at nearby real stores. It combines official retailer product feeds with mapped store locations, clearly labels price freshness and product-match quality, and sends shoppers to the retailer to confirm inventory, final price, checkout, fulfillment, and returns.

**Long description**

> [WORKING NAME] is building a mobile-first product and store discovery service for U.S. shoppers. A shopper can search by product name, model, or barcode; compare verified offers; estimate delivery or round-trip travel cost; view real store locations and distance on a map; save products and stores; and create price watches. The service does not process payments or claim to be the seller. Retailer prices are displayed only from approved sources, never generated or estimated. Each result identifies its retailer, verification time, match quality, fulfillment evidence, and a direct link to confirm the purchase with the retailer.

**Website and testing status**

- Website: `https://dealradar.biz` (private pre-launch; working name pending legal review)
- Market: United States
- Platform: mobile-first website / installable web app
- Revenue model: future disclosed affiliate commissions; no commissions active yet
- Data handling: server-side credentials; device-local profile, saves, and watch settings; no payments
- Contact email: `[activate a domain mailbox before submitting]`
- Legal entity: `[individual or registered entity—confirm with counsel/accountant]`
- Audience size and traffic: `[enter truthful current figures; use 0/pre-launch when appropriate]`

Do not claim user counts, revenue, launch dates, retailer authorization, or a registered trademark unless they are true at submission time.

## Best Buy Developer API

Official portal: <https://developer.bestbuy.com/>

**Purpose to select or describe**

> Consumer shopping comparison and local store discovery using Best Buy's Products and Stores APIs. Product pricing, availability, images, model identifiers, and store pickup information will be displayed with Best Buy attribution and a direct Best Buy product link. Shoppers complete all purchases on Best Buy.

**Requested capabilities**

- Products API for current catalog price, model/UPC matching, images, URLs, and availability
- Stores API for official locations and store metadata
- Product + store availability lookup for pickup evidence
- Buying Options API only if its access terms allow display of open-box offers

**Ready in the app**

- Server-only API key handling
- Catalog search and exact/similar match labels
- Near-real-time pickup inventory normalization
- Live connection probe that never exposes the key
- Stale-price and retailer-confirmation disclaimers

**Still needed from the owner**

- Activate a `@dealradar.biz` or final-domain email; Best Buy currently rejects free-email registrations
- Create the key, read the display/caching terms, and add the key only to private hosting secrets

## Amazon Associates and Creators API

Official documentation: <https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction>

**Application description**

> [WORKING NAME] helps U.S. shoppers compare exact products across approved retailers and evaluate online delivery against nearby pickup. Amazon products would appear only when returned by Amazon's approved tools, with Amazon-provided images, pricing, availability messages, and unmodified detail-page URLs. Affiliate relationships will be disclosed near eligible links and on a dedicated disclosure page.

**Important sequence**

1. Apply to Amazon Associates using the finished website and an active business-domain email.
2. Use Amazon-provided linking tools and generate qualifying referrals while the API is unavailable.
3. Obtain final Associates acceptance.
4. Meet the current Creators API eligibility threshold. As of this update, Amazon documents at least 10 qualifying sales in the trailing 30 days.
5. The primary account owner registers the application and creates its Credential ID, Secret, Version, and Partner Tag.
6. Review the Creators API license, rate rules, link requirements, price freshness, image use, and caching limits before enabling results.

**Hosting-secret placeholders already prepared**

- `AMAZON_CREATORS_CREDENTIAL_ID`
- `AMAZON_CREATORS_CREDENTIAL_SECRET`
- `AMAZON_CREATORS_PARTNER_TAG`

## Walmart Affiliate Program

Official affiliate portal: <https://affiliates.walmart.com/>

**Application description**

> [WORKING NAME] is a mobile-first U.S. shopping comparison website that helps visitors find exact products, compare verified retailer offers, and locate nearby stores. Walmart links would lead directly to Walmart.com for final price, availability, checkout, shipping, pickup, returns, and customer service. Eligible links will be clearly identified as affiliate links.

**Recommended route**

- Apply to the Walmart Affiliate Program for trackable links and any approved product data feeds available through its member center.
- Ask the affiliate account team in writing whether its data feed permits live price-comparison display, refresh frequency, local pickup fields, caching, and mobile-web use.
- Do not use Walmart Marketplace seller APIs as a consumer price feed without written authorization. Their catalog search is documented for sellers deciding what to list, not neutral consumer comparison.
- Walmart Creator is a separate social-creator program and may not fit this product unless the owner also meets its public social-account requirements.

**Hosting-secret placeholders**

- `WALMART_CLIENT_ID`
- `WALMART_CLIENT_SECRET`

These names may change once Walmart confirms the approved program and authentication method.

## eBay Developer Program and Partner Network

Official developer overview: <https://developer.ebay.com/api-docs/buy/browse/overview.html>

Official affiliate program: <https://partnernetwork.ebay.com/>

**Application description**

> [WORKING NAME] helps U.S. shoppers search by product name, model, or barcode and compare exact or clearly labeled similar offers across approved retailers. eBay Browse API results would preserve listing condition, seller information, price, shipping, item URL, and other required attribution. Users complete purchases on eBay, and eligible affiliate links will carry an approved eBay Partner Network campaign ID with a clear disclosure.

**Recommended sequence**

1. Create an eBay developer account and application keys.
2. Review Buy Browse API production-use requirements and request any required production access.
3. Join eBay Partner Network, register the website/mobile property, and create a campaign.
4. Confirm allowed display, caching, item-condition, image, seller, shipping, and affiliate-link rules.
5. Add credentials only as private hosting secrets and implement OAuth token caching server-side.

**Hosting-secret placeholders already prepared**

- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_CAMPAIGN_ID`

## Submission checklist

- [ ] Final working name approved or application clearly says it is a working name
- [ ] Domain resolves to the private or public product page
- [ ] Domain email mailbox is active
- [ ] Privacy Policy, Terms, affiliate disclosure, and retailer disclaimer are reachable
- [ ] Product screenshots show the actual experience and no fabricated prices
- [ ] Legal owner name and tax details match the applicant account
- [ ] Traffic and audience claims are truthful
- [ ] Every program's latest agreement has been saved and reviewed
- [ ] Credentials are stored only as hosting secrets, never in GitHub or browser code
- [ ] Live data remains disabled until a program has approved the intended use
