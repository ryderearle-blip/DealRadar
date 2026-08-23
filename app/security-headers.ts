export function buildContentSecurityPolicy(development = false) {
  const scriptSources = ["'self'", "'unsafe-inline'", 'https://unpkg.com'];
  if (development) scriptSources.push("'unsafe-eval'");

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "connect-src 'self' https://api.zippopotam.us https://overpass-api.de https://overpass.private.coffee https://tiles.openfreemap.org https://*.openfreemap.org",
  ];
  if (!development) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

export function securityHeaders(development = false) {
  return {
    'Content-Security-Policy': buildContentSecurityPolicy(development),
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Permissions-Policy': 'camera=(self), geolocation=(), microphone=(), payment=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  } as const;
}

export function applySecurityHeaders(headers: Headers, development = false) {
  Object.entries(securityHeaders(development)).forEach(([name, value]) => headers.set(name, value));
  return headers;
}
