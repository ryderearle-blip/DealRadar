import { NextResponse } from 'next/server';
import { applySecurityHeaders } from './app/security-headers';

export function proxy() {
  const response = NextResponse.next();
  applySecurityHeaders(response.headers, process.env.NODE_ENV === 'development');
  return response;
}
