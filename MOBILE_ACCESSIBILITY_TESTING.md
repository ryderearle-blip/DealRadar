# Mobile and accessibility testing

Last hands-on check: August 23, 2026.

## Verified in the running app

| Area | 390 × 844 | 375 × 667 | 1280 × 800 |
| --- | --- | --- | --- |
| No page-level horizontal overflow | Pass | Pass | Pass |
| Search, Map, Saved, Alerts, Profile navigation | Pass | Pass | Pass |
| Bottom navigation remains visible | Pass | Pass | N/A—desktop side navigation |
| Saved tab has its own search field | Pass | Pass | Pass |
| Map zoom controls and attribution remain reachable | Pass | Pass | Pass |
| Active tab exposes `aria-current="page"` | Pass | Pass | Pass |
| Onboarding blocks focus behind its modal | Pass | Pass | Pass |
| Visible custom controls meet a 24 × 24 CSS-pixel minimum | Pass | Pass | Pass |

The small and modern iPhone sizes were checked in the private in-app Chromium browser. The desktop breakpoint was also checked for overflow and navigation placement.

## Safeguards implemented

- iPhone safe-area padding and `100dvh` app height
- Visible keyboard focus rings
- Reduced-motion fallback
- Accessible dialog focus containment, Escape dismissal, and focus restoration
- Background controls made inert while onboarding is open
- Larger store-save and map-attribution targets
- Semantic tab-current state and descriptive button labels

## Required before public launch

- Real-device iPhone Safari testing, including add-to-home-screen mode
- Real-device Android Chrome testing
- VoiceOver and TalkBack walkthroughs
- 200% text zoom and browser zoom checks
- Keyboard-only testing on macOS and Windows
- Slow 3G, offline recovery, and retailer-timeout scenarios
- Automated browser-level tests against the private staging URL

These remaining items require the staging environment and representative devices; they should not be marked complete based only on responsive emulation.
