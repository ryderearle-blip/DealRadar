function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function buildBestBuyProductFilter(query: string) {
  const barcode = query.replace(/\D/g, '');
  if (/^\d{8,14}$/.test(barcode)) return `upc=${barcode}`;
  const terms = (query.match(/[a-zA-Z0-9][a-zA-Z0-9.'-]*/g) ?? []).slice(0, 8).map(term => term.slice(0, 40));
  return terms.length ? terms.map(term => `search=${encodeURIComponent(term)}`).join('&') : null;
}

export function classifyProductMatch(query: string, product: { upc?: string; modelNumber?: string; manufacturer?: string; name?: string }) {
  const compactQuery = query.replace(/\D/g, '');
  if (/^\d{8,14}$/.test(compactQuery) && product.upc === compactQuery) {
    return { matchType: 'exact' as const, matchReason: 'Exact UPC match' };
  }

  const normalizedQuery = normalized(query);
  const normalizedModel = normalized(product.modelNumber ?? '');
  if (normalizedModel && (normalizedQuery === normalizedModel || normalizedQuery.includes(normalizedModel))) {
    return { matchType: 'exact' as const, matchReason: `Exact model ${product.modelNumber}` };
  }

  const queryWords = new Set(normalizedQuery.split(' ').filter(word => word.length > 1));
  const productWords = new Set(normalized(`${product.manufacturer ?? ''} ${product.modelNumber ?? ''} ${product.name ?? ''}`).split(' '));
  const matchedWords = [...queryWords].filter(word => productWords.has(word)).length;
  const ratio = queryWords.size ? matchedWords / queryWords.size : 0;
  if (ratio >= 0.6) return { matchType: 'similar' as const, matchReason: 'Strong title and specification match' };
  return { matchType: 'possible' as const, matchReason: 'Related catalog result—verify the model' };
}
