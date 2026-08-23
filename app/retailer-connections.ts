export type RetailerState = 'connected' | 'needs_credentials' | 'partner_access' | 'unavailable';
export type RetailerHealth = 'configured' | 'verified' | 'failed' | 'action_required' | 'location_only';

export type RetailerStatus = {
  retailer: string;
  state: RetailerState;
  health: RetailerHealth;
  capability: 'catalog-prices' | 'partner-prices' | 'locations-only';
  message: string;
  requirement: string;
  signupUrl?: string;
  checkedAt?: string;
};

export function buildRetailerStatuses(bestBuyConfigured: boolean): RetailerStatus[] {
  return [
    {
      retailer: 'Best Buy',
      state: bestBuyConfigured ? 'connected' : 'needs_credentials',
      health: bestBuyConfigured ? 'configured' : 'action_required',
      capability: 'catalog-prices',
      message: bestBuyConfigured ? 'Official catalog connector configured' : 'Connector built; server API key required',
      requirement: 'Best Buy Developer API key',
      signupUrl: 'https://developer.bestbuy.com/',
    },
    {
      retailer: 'Amazon',
      state: 'partner_access',
      health: 'action_required',
      capability: 'partner-prices',
      message: 'Partner approval required before price results can be enabled',
      requirement: 'Approved Associates account, Creators API credentials, and partner tag',
      signupUrl: 'https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction',
    },
    {
      retailer: 'Walmart',
      state: 'partner_access',
      health: 'action_required',
      capability: 'partner-prices',
      message: 'Affiliate data approval required before price results can be enabled',
      requirement: 'Approved Walmart affiliate data feed or written consumer-comparison API access',
      signupUrl: 'https://affiliates.walmart.com/',
    },
    {
      retailer: 'eBay',
      state: 'partner_access',
      health: 'action_required',
      capability: 'partner-prices',
      message: 'Developer and affiliate approval required before price results can be enabled',
      requirement: 'eBay developer application, Buy API access, and Partner Network campaign ID',
      signupUrl: 'https://developer.ebay.com/api-docs/buy/browse/overview.html',
    },
    {
      retailer: 'Target',
      state: 'unavailable',
      health: 'location_only',
      capability: 'locations-only',
      message: 'Real mapped locations only',
      requirement: 'No public consumer catalog and price API is documented',
      signupUrl: 'https://developer.target.com/',
    },
    {
      retailer: 'Apple',
      state: 'unavailable',
      health: 'location_only',
      capability: 'locations-only',
      message: 'Real mapped locations only',
      requirement: 'No public Apple Store hardware price API is documented',
    },
    {
      retailer: 'Micro Center',
      state: 'unavailable',
      health: 'location_only',
      capability: 'locations-only',
      message: 'Real mapped locations only',
      requirement: 'No public product and store-inventory API is documented',
    },
  ];
}

export function applyRetailerProbe(statuses: RetailerStatus[], retailer: string, successful: boolean, checkedAt: string) {
  return statuses.map(status => status.retailer === retailer ? {
    ...status,
    state: successful ? 'connected' as const : 'needs_credentials' as const,
    health: successful ? 'verified' as const : 'failed' as const,
    message: successful ? 'Live official price feed verified' : 'Configured connector did not pass the live check',
    checkedAt,
  } : status);
}

export function buildRetailerStatusPayload(retailers: RetailerStatus[], checkedAt: string | null) {
  return {
    retailers,
    checkedAt,
    summary: {
      verified: retailers.filter(item => item.health === 'verified').length,
      configured: retailers.filter(item => item.health === 'configured').length,
      actionRequired: retailers.filter(item => item.health === 'action_required' || item.health === 'failed').length,
      locationOnly: retailers.filter(item => item.health === 'location_only').length,
    },
  };
}
