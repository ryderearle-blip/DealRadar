export type RequestLimitPolicy = {
  bucket: string;
  limit: number;
  windowMs: number;
};

type WindowState = {
  count: number;
  resetAt: number;
};

export type RequestLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export class FixedWindowRequestLimiter {
  private readonly windows = new Map<string, WindowState>();
  private readonly maximumWindows: number;

  constructor(maximumWindows = 2_000) {
    this.maximumWindows = maximumWindows;
  }

  check(key: string, policy: Omit<RequestLimitPolicy, 'bucket'>, now = Date.now()): RequestLimitDecision {
    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      this.makeRoom(now);
      window = { count: 0, resetAt: now + policy.windowMs };
      this.windows.set(key, window);
    }

    window.count += 1;
    const allowed = window.count <= policy.limit;
    return {
      allowed,
      limit: policy.limit,
      remaining: Math.max(0, policy.limit - window.count),
      retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1_000)),
    };
  }

  private makeRoom(now: number) {
    if (this.windows.size < this.maximumWindows) return;
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
    while (this.windows.size >= this.maximumWindows) {
      const oldest = this.windows.keys().next().value;
      if (oldest === undefined) break;
      this.windows.delete(oldest);
    }
  }
}

const requestLimiter = new FixedWindowRequestLimiter();

function clientKey(request: Request) {
  const cloudflareAddress = request.headers.get('cf-connecting-ip')?.trim();
  if (cloudflareAddress) return cloudflareAddress.slice(0, 64);
  const directAddress = request.headers.get('x-real-ip')?.trim();
  if (directAddress) return directAddress.slice(0, 64);
  return 'unidentified-client';
}

export function enforceRequestLimit(request: Request, policy: RequestLimitPolicy) {
  const decision = requestLimiter.check(`${policy.bucket}:${clientKey(request)}`, policy);
  if (decision.allowed) return null;

  return Response.json(
    { error: 'Too many requests. Try again shortly.' },
    {
      status: 429,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(decision.retryAfterSeconds),
        'X-DealRadar-RateLimit-Limit': String(decision.limit),
        'X-DealRadar-RateLimit-Remaining': String(decision.remaining),
      },
    },
  );
}
