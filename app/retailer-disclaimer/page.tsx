import type { Metadata } from 'next';
import { brand } from '../brand';
import { LegalSection, LegalShell } from '../legal-shell';

export const metadata: Metadata = {
  title: `Retailer & Price Disclaimer — ${brand.name}`,
  description: `Important limits on retailer prices, inventory, maps, and product matching in ${brand.name}.`,
};

export default function RetailerDisclaimer() {
  return <LegalShell active="retailer" eyebrow="RETAILER & PRICE DISCLAIMER" title="Verify before you buy or drive." intro="Mapped locations, catalog prices, and inventory checks come from different sources and do not carry the same level of verification.">
    <aside className="legal-callout"><b>The retailer is the final source</b><p>Confirm the exact item, condition, final checkout price, fees, stock, pickup location, and return terms directly with the retailer.</p></aside>

    <LegalSection number="01" title="Mapped stores are not price-connected stores">
      <p>A location shown from OpenStreetMap or another map source means that a mapped place was returned for the visible area. It does not prove that the store carries a searched product, has live inventory, or supplies DealRadar with pricing.</p>
    </LegalSection>

    <LegalSection number="02" title="Prices and product matches">
      <p>DealRadar displays a price as retailer-verified only when it is returned by an approved retailer source. Prices can still change after the displayed check time. Titles, model numbers, variants, condition, memberships, bundles, and seller identity must be checked before purchase.</p>
    </LegalSection>

    <LegalSection number="03" title="Inventory and pickup">
      <p>An inventory result is a time-stamped report, not a reservation. Stock can sell out, be misplaced, be limited to another variant, or require retailer confirmation. Contact the store or complete the retailer’s reservation process before traveling.</p>
    </LegalSection>

    <LegalSection number="04" title="Distance, directions, and total-cost estimates">
      <p>Distances, directions, tax, shipping, and driving costs are planning estimates. Routes and travel conditions can change. Apple Maps and Google Maps links are third-party services with their own terms and privacy practices.</p>
    </LegalSection>

    <LegalSection number="05" title="Independent service">
      <p>DealRadar is not the seller and is not operated, sponsored, or endorsed by a displayed retailer unless a specific relationship is clearly identified. Retailer and product trademarks belong to their owners.</p>
    </LegalSection>
  </LegalShell>;
}
