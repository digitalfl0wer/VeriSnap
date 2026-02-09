import "server-only";

type Bucket = {
  resetAtMs: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimitOrThrow(args: {
  request: Request;
  key: string;
  windowMs: number;
  max: number;
}): void {
  const ip = getClientIp(args.request);
  const now = Date.now();
  const bucketKey = `${args.key}:${ip}`;

  const existing = buckets.get(bucketKey);
  if (!existing || existing.resetAtMs <= now) {
    buckets.set(bucketKey, { resetAtMs: now + args.windowMs, count: 1 });
    prune(now);
    return;
  }

  existing.count += 1;
  if (existing.count > args.max) {
    throw new Error("Rate limited");
  }
}

export function rateLimitKeyOrThrow(args: {
  key: string;
  windowMs: number;
  max: number;
}): void {
  const now = Date.now();
  const existing = buckets.get(args.key);
  if (!existing || existing.resetAtMs <= now) {
    buckets.set(args.key, { resetAtMs: now + args.windowMs, count: 1 });
    prune(now);
    return;
  }

  existing.count += 1;
  if (existing.count > args.max) throw new Error("Rate limited");
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();

  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();

  return "unknown";
}

function prune(now: number): void {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAtMs <= now) buckets.delete(key);
  }
}

