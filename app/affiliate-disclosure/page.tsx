import type { Metadata } from 'next';
import { LegalSection, LegalShell } from '../legal-shell';
import { brand } from '../brand';

export const metadata: Metadata = {
  title: `Affiliate Disclosure — ${brand.name}`,
  description: `How retailer commissions and sponsored relationships are disclosed by ${brand.name}.`,
};

export default function AffiliateDisclosure() {
  return <LegalShell active="affiliate" eyebrow="AFFILIATE DISCLOSURE" title="How DealRadar may earn money." intro="DealRadar wants shoppers to know when a retailer relationship could financially benefit the service.">
    <aside className="legal-status"><span>Current status</span><b>DealRadar is not currently earning affiliate commissions.</b><p>The app is in private testing while official retailer access is being requested. This page will be updated whenever a compensated relationship becomes active.</p></aside>
    <aside className="legal-callout"><b>Counsel review required</b><p>This pre-launch draft uses the working brand name DealRadar. Confirm the final operator name and each program-specific disclosure before activating paid links.</p></aside>

    <LegalSection number="01" title="What an affiliate link is">
      <p>Some links may eventually be affiliate or paid links. If you follow one and complete a qualifying purchase, the retailer may pay DealRadar a commission. The retailer controls the product price, checkout, fulfillment, returns, and whether a transaction qualifies.</p>
    </LegalSection>

    <LegalSection number="02" title="How DealRadar will disclose it">
      <p>When a link can earn compensation, DealRadar will place plain wording close to the link or recommendation, such as:</p>
      <blockquote>Paid link — DealRadar may earn a commission if you buy.</blockquote>
      <p>A general policy page by itself is not a substitute for that nearby notice. Sponsored placements and free products, if ever used, will be identified in the content where they appear.</p>
    </LegalSection>

    <LegalSection number="03" title="Ranking independence">
      <p>An affiliate commission will not turn an unverified offer into a verified one, change a product-match label, or qualify an offer as a DealRadar Pick. Search sorting and recommendations are designed to use displayed factors such as verified price, match quality, freshness, distance, availability evidence, and estimated total cost.</p>
      <p>If DealRadar ever permits paid placement, it will be labeled <em>Sponsored</em> and kept distinguishable from ordinary comparison results.</p>
    </LegalSection>

    <LegalSection number="04" title="Price and availability remain the retailer’s">
      <p>Using an affiliate link does not make DealRadar the seller. Prices, promotions, taxes, shipping, inventory, and eligibility can change. Always confirm the final details on the retailer’s website or app.</p>
    </LegalSection>

    <LegalSection number="05" title="Retailer independence">
      <p>Retailer names, product names, and trademarks belong to their owners. Unless DealRadar explicitly identifies a sponsorship, displaying a store, price, location, or link does not mean that retailer sponsors, operates, or endorses DealRadar.</p>
    </LegalSection>

    <LegalSection number="06" title="Active relationships and updates">
      <p>No compensated retailer relationship is active as of the effective date above. Applications or preparation may involve Best Buy, Amazon Associates, Walmart Affiliates, and the eBay Partner Network, but none should be described as active until approval and integration are complete. Once approved, this section will list active programs and DealRadar will add each program’s required nearby disclosure before earning commissions.</p>
      <p>Questions may be sent to <a href="mailto:partners@dealradar.biz">partners@dealradar.biz</a>. This planned mailbox must be activated before public launch.</p>
    </LegalSection>
  </LegalShell>;
}
