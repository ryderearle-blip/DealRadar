/* eslint-disable @next/next/no-html-link-for-pages */
import type { ReactNode } from 'react';

type LegalPage = 'privacy' | 'terms' | 'affiliate';

const legalLinks: Array<{ id: LegalPage; href: string; label: string }> = [
  { id: 'privacy', href: '/privacy', label: 'Privacy' },
  { id: 'terms', href: '/terms', label: 'Terms' },
  { id: 'affiliate', href: '/affiliate-disclosure', label: 'Affiliate disclosure' },
];

export function LegalShell({ active, eyebrow, title, intro, children }: { active: LegalPage; eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return <main className="legal-page">
    <header className="legal-header">
      <a className="legal-brand" href="/" aria-label="Back to DealRadar"><span>Deal</span>Radar</a>
      <a className="legal-back" href="/">‹ Back to app</a>
    </header>
    <section className="legal-hero">
      <small>{eyebrow}</small>
      <h1>{title}</h1>
      <p>{intro}</p>
      <div className="legal-effective"><span>Effective August 23, 2026</span><b>Private testing</b></div>
    </section>
    <nav className="legal-nav" aria-label="Legal documents">
      {legalLinks.map(link => <a key={link.id} href={link.href} aria-current={active === link.id ? 'page' : undefined}>{link.label}</a>)}
    </nav>
    <article className="legal-document">{children}</article>
    <footer className="legal-footer">
      <b>DealRadar</b>
      <span>Find it cheaper. Find it closer.</span>
      <a href="mailto:legal@dealradar.biz">legal@dealradar.biz</a>
      <small>This mailbox must be activated before DealRadar opens to the public.</small>
    </footer>
  </main>;
}

export function LegalSection({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <section className="legal-section">
    <div className="legal-section-title"><span>{number}</span><h2>{title}</h2></div>
    {children}
  </section>;
}
