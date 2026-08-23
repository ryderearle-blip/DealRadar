import type { Metadata } from 'next';
import { LegalSection, LegalShell } from '../legal-shell';
import { brand } from '../brand';

export const metadata: Metadata = {
  title: `Privacy Policy — ${brand.name}`,
  description: `How ${brand.name} handles location, shopping preferences, searches, and device-local data.`,
};

export default function PrivacyPolicy() {
  return <LegalShell active="privacy" eyebrow="PRIVACY POLICY" title="Your shopping data, explained plainly." intro="DealRadar is designed to find nearby stores and compare verified offers while keeping most personal shopping information on your device.">
    <aside className="legal-summary">
      <h2>Privacy at a glance</h2>
      <div><span>⌂<b>Saved locally</b><small>Profile, saved items, watches, and price history stay in your browser.</small></span><span>⌖<b>Location is optional</b><small>A ZIP code works; precise device location requires your permission.</small></span><span>♢<b>Not sold</b><small>DealRadar does not sell personal information or use it for targeted advertising.</small></span></div>
    </aside>
    <aside className="legal-callout"><b>Counsel review required</b><p>This pre-launch draft uses the working brand name DealRadar. Replace [LEGAL OWNER NAME] and confirm the final business name, contact addresses, and applicable-law language before public launch.</p></aside>

    <LegalSection number="01" title="Scope">
      <p>This Privacy Policy applies to the DealRadar website and mobile web experience at dealradar.biz, operated by [LEGAL OWNER NAME]. DealRadar is currently a private prototype for U.S. shopping searches. It does not currently provide user accounts, process payments, or run background notifications.</p>
    </LegalSection>

    <LegalSection number="02" title="Information DealRadar handles">
      <div className="legal-table">
        <div><b>Profile and preferences</b><p>Your display name, home ZIP code, approximate ZIP-center coordinates, optional device coordinates, shopping radius, fulfillment preference, tax estimate, travel-cost estimate, and notification preferences.</p></div>
        <div><b>Shopping activity</b><p>Searches, scanned barcode numbers, saved products and stores, price-watch settings, and observed price history.</p></div>
        <div><b>Requests needed to provide results</b><p>Product search terms, map area, retailer SKU, and ZIP code may be sent to DealRadar’s server when you search, move the map, or check store pickup.</p></div>
        <div><b>Basic technical information</b><p>Hosting and security providers may automatically process IP address, browser type, device type, timestamps, and request information to deliver and protect the service.</p></div>
        <div><b>Optional usage analytics</b><p>If you enable anonymous usage analytics in Profile, DealRadar sends allow-listed feature names and counts. It does not send search text, precise location, saved-item names, or advertising identifiers.</p></div>
      </div>
    </LegalSection>

    <LegalSection number="03" title="Location and camera permissions">
      <p>DealRadar works with a ZIP code and does not need a street address. If you choose <em>Use current device location</em>, your browser asks for permission and saves the resulting coordinates in DealRadar storage on that device. Map-area coordinates are used to request stores visible around the area you view.</p>
      <p>The barcode scanner asks for camera permission only when you open it. Camera frames are analyzed on your device and are not uploaded by DealRadar. The detected barcode number can then be used as a product search.</p>
    </LegalSection>

    <LegalSection number="04" title="How information is used">
      <ul>
        <li>Center the map and estimate distance to stores.</li>
        <li>Find relevant products, retailer offers, pickup availability, and directions.</li>
        <li>Calculate planning estimates for tax, shipping, and round-trip travel.</li>
        <li>Save preferences, products, stores, watches, and observed price history on your device.</li>
        <li>Prevent abuse, diagnose failures, and protect the service.</li>
        <li>Measure feature usage only when you opt in to anonymous analytics.</li>
        <li>Comply with law and enforce DealRadar’s Terms of Use.</li>
      </ul>
    </LegalSection>

    <LegalSection number="05" title="Local storage and retention">
      <p>DealRadar uses browser local storage rather than an account database for profile settings, saved shopping activity, alerts, and price history. That information remains until you clear it in DealRadar, clear the browser’s site data, or remove the browser/app.</p>
      <p>DealRadar’s server may temporarily cache public store-area and product-search responses to improve reliability. Store inventory checks are requested without application caching. Hosting, security, map, and retailer providers may retain technical records under their own policies.</p>
    </LegalSection>

    <LegalSection number="06" title="When information reaches other services">
      <div className="legal-table">
        <div><b>Map and location-data providers</b><p>OpenStreetMap/Overpass, OpenFreeMap, MapLibre delivery resources, and the ZIP lookup service receive the requests necessary to load maps, mapped stores, or ZIP-center information.</p></div>
        <div><b>Approved retailer providers</b><p>A product query, retailer SKU, and ZIP code may be sent through DealRadar’s server to a connected official retailer service. DealRadar keeps retailer credentials on the server.</p></div>
        <div><b>Directions providers</b><p>Apple Maps or Google Maps receives location information only when you choose one of those direction links.</p></div>
        <div><b>Hosting and security providers</b><p>They process requests and basic technical data needed to host, secure, and operate DealRadar.</p></div>
        <div><b>Diagnostics and analytics provider</b><p>DealRadar may send a minimal route and event category for a technical failure. If you opt in to analytics, it may also send allow-listed feature counts. Search text, saved-item details, and precise coordinates are excluded.</p></div>
      </div>
      <p>DealRadar may also disclose information when legally required, to protect users or the service, or as part of a future business transfer subject to appropriate notice.</p>
    </LegalSection>

    <LegalSection number="07" title="Selling, sharing, and advertising">
      <p>DealRadar does not currently sell personal information, share it for cross-context behavioral advertising, or run targeted advertising. Retailer links may become affiliate links; that commercial relationship concerns referral credit and does not authorize DealRadar to sell your personal information. Read the <a href="/affiliate-disclosure">Affiliate Disclosure</a>.</p>
    </LegalSection>

    <LegalSection number="08" title="Your choices and privacy rights">
      <ul>
        <li>Deny or withdraw camera and location permission in your browser or device settings.</li>
        <li>Use a ZIP-center location instead of precise device coordinates.</li>
        <li>Export or clear saved shopping activity from Profile → Privacy & shopping data.</li>
        <li>Change profile information in the Profile tab, or clear all DealRadar site data through your browser.</li>
        <li>Keep anonymous usage analytics off, or turn it off at any time in Profile.</li>
        <li>Depending on where you live and which privacy laws apply, request access, correction, deletion, or information about DealRadar’s handling of personal information.</li>
      </ul>
      <p>Privacy requests may be sent to <a href="mailto:privacy@dealradar.biz">privacy@dealradar.biz</a>. DealRadar may need to verify a request and may retain information when required by law. DealRadar will not discriminate against someone for exercising an applicable privacy right.</p>
    </LegalSection>

    <LegalSection number="09" title="Security">
      <p>DealRadar uses encrypted connections, server-side retailer credentials, limited browser permissions, access controls, rate limits, and browser security protections. No method of storage or transmission is completely secure, so absolute security cannot be guaranteed.</p>
    </LegalSection>

    <LegalSection number="10" title="Children">
      <p>DealRadar is not directed to children under 13, and DealRadar does not knowingly collect personal information from children under 13. A parent or guardian who believes a child provided information may contact the privacy address above.</p>
    </LegalSection>

    <LegalSection number="11" title="Changes and contact">
      <p>This policy may change as DealRadar adds accounts, background alerts, additional retailers, or other features. Material changes will receive an updated effective date and, when appropriate, an in-app notice.</p>
      <p>Questions may be sent to <a href="mailto:privacy@dealradar.biz">privacy@dealradar.biz</a>. This planned mailbox must be activated before public launch.</p>
    </LegalSection>
  </LegalShell>;
}
