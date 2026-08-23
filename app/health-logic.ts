export function buildHealthPayload(bestBuyConfigured: boolean, checkedAt: string) {
  return {
    status: 'operational' as const,
    service: 'shopping-price-map',
    checkedAt,
    checks: {
      application: { status: 'ready' as const },
      storeDiscovery: {
        status: 'ready' as const,
        source: 'OpenStreetMap',
        cacheSeconds: 21600,
      },
      retailerPrices: {
        status: bestBuyConfigured ? 'configured' as const : 'setup_required' as const,
        connectedRetailers: bestBuyConfigured ? 1 : 0,
      },
      shopperData: {
        status: 'ready' as const,
        mode: 'device-local',
      },
    },
  };
}
