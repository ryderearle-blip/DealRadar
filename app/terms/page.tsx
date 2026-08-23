import type { Metadata } from 'next';
import { LegalSection, LegalShell } from '../legal-shell';

export const metadata: Metadata = {
  title: 'Terms of Use — DealRadar',
  description: 'The rules and important limitations for using DealRadar.',
};

export default function TermsOfUse() {
  return <LegalShell active="terms" eyebrow="TERMS OF USE" title="The rules for using DealRadar." intro="These terms explain what DealRadar provides, what it does not promise, and how to use the service responsibly.">
    <aside className="legal-callout"><b>Important</b><p>DealRadar helps you plan a purchase. The retailer—not DealRadar—sets the final price, confirms inventory, processes the order, and handles returns or warranties.</p></aside>

    <LegalSection number="01" title="Agreement to these terms">
      <p>By accessing or using DealRadar, you agree to these Terms of Use and the <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use the service. DealRadar is currently offered as a private pre-launch prototype and may change before public release.</p>
    </LegalSection>

    <LegalSection number="02" title="Who may use DealRadar">
      <p>You must be at least 13 years old and legally able to agree to these terms. If you are under the age of legal majority where you live, use DealRadar only with permission from a parent or legal guardian.</p>
    </LegalSection>

    <LegalSection number="03" title="What the service provides">
      <p>DealRadar helps users discover mapped U.S. stores, compare offers returned by approved retailer sources, estimate distance and total shopping cost, save items locally, and check reported pickup availability. Features may depend on location permissions, map services, retailer approval, network access, and device support.</p>
      <p>DealRadar is an independent shopping-information service. It is not a retailer, payment processor, delivery service, tax adviser, or agent for any listed store.</p>
    </LegalSection>

    <LegalSection number="04" title="Prices, inventory, and estimates">
      <ul>
        <li>Prices and availability can change at any time and may differ by store, customer, membership, promotion, tax jurisdiction, or checkout method.</li>
        <li>A mapped store does not mean DealRadar has verified that a particular product is sold or in stock there.</li>
        <li>Pickup availability is evidence from the retailer at the displayed check time, not a reservation or guarantee.</li>
        <li>Tax, shipping, distance, travel cost, savings, and estimated totals are planning estimates.</li>
        <li>Product-match labels help explain confidence but do not guarantee two listings are identical.</li>
      </ul>
      <p>Always confirm the product, condition, final price, fees, stock, pickup details, and return policy directly with the retailer before traveling or purchasing.</p>
    </LegalSection>

    <LegalSection number="05" title="Retailer transactions and third-party services">
      <p>When you follow a retailer or directions link, you leave DealRadar and become subject to that provider’s terms and privacy practices. DealRadar does not control third-party websites, inventory systems, maps, shipping, purchases, cancellations, returns, warranties, or customer service.</p>
      <p>Retailer and product names, logos, and trademarks belong to their respective owners. Their appearance does not imply sponsorship or endorsement unless DealRadar clearly says otherwise.</p>
    </LegalSection>

    <LegalSection number="06" title="Affiliate relationships and sponsored content">
      <p>Some retailer links may become affiliate links that can earn DealRadar a commission. Any active material relationship will be disclosed clearly near the relevant recommendation or link and explained in the <a href="/affiliate-disclosure">Affiliate Disclosure</a>. Sponsored placements, if introduced, will be labeled and will not be presented as neutral search results.</p>
    </LegalSection>

    <LegalSection number="07" title="Responsible use">
      <p>You agree not to:</p>
      <ul>
        <li>Use DealRadar unlawfully, deceptively, or to harm another person.</li>
        <li>Bypass access controls, request limits, or security protections.</li>
        <li>Use automated tools to scrape, copy, resell, or overload DealRadar or its data sources.</li>
        <li>Reverse engineer or interfere with the service except where applicable law expressly permits it.</li>
        <li>Misrepresent DealRadar data as guaranteed retailer pricing or inventory.</li>
        <li>Use retailer content, marks, or data outside the permissions granted by its owner.</li>
      </ul>
    </LegalSection>

    <LegalSection number="08" title="DealRadar content and feedback">
      <p>DealRadar’s software, design, original text, branding, and arrangement are protected by applicable intellectual-property laws. These terms give you a limited, revocable, non-transferable right to use the service for personal shopping purposes.</p>
      <p>If you voluntarily provide feedback, you allow DealRadar to use it without payment or restriction, provided DealRadar does not claim ownership of your personal information.</p>
    </LegalSection>

    <LegalSection number="09" title="Availability and changes">
      <p>DealRadar may add, remove, suspend, limit, or change features at any time. The service may be unavailable because of testing, maintenance, provider outages, retailer restrictions, security concerns, or events outside DealRadar’s control. DealRadar may suspend access for misuse or risk to the service or others.</p>
    </LegalSection>

    <LegalSection number="10" title="Disclaimers">
      <p>To the fullest extent permitted by law, DealRadar is provided “as is” and “as available.” DealRadar disclaims implied warranties, including merchantability, fitness for a particular purpose, title, and non-infringement. Nothing in these terms excludes a warranty or consumer right that cannot legally be excluded.</p>
    </LegalSection>

    <LegalSection number="11" title="Limitation of liability">
      <p>To the fullest extent permitted by law, DealRadar will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for losses caused by inaccurate prices, unavailable inventory, travel decisions, third-party services, lost data, or interruption of the prototype. Applicable law may give you rights that override part of this limitation.</p>
    </LegalSection>

    <LegalSection number="12" title="Changes, severability, and contact">
      <p>Updated terms will show a new effective date. Continued use after an update means you accept the revised terms where permitted by law. If part of these terms is unenforceable, the remaining terms continue to apply. These terms and the policies they reference form the agreement concerning DealRadar’s current service.</p>
      <p>Questions may be sent to <a href="mailto:legal@dealradar.biz">legal@dealradar.biz</a>. This planned mailbox must be activated before public launch.</p>
    </LegalSection>
  </LegalShell>;
}
