import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function hasRedisCache(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function getRedis(): Redis | null {
  if (redis) return redis;
  if (hasRedisCache()) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    return redis;
  }
  return null;
}

const SHORT_TERM_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export async function getCached<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    return await r.get(key) as T | null;
  } catch {
    return null;
  }
}

export async function setPermanent(key: string, value: unknown): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, value);
  } catch (e) {
    console.warn('Redis set failed:', e);
  }
}

export async function setShortTerm(key: string, value: unknown): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, value, { ex: SHORT_TERM_TTL });
  } catch (e) {
    console.warn('Redis set failed:', e);
  }
}

const DAILY_TTL = 24 * 60 * 60; // 1 day in seconds

export async function setDailyTerm(key: string, value: unknown): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, value, { ex: DAILY_TTL });
  } catch (e) {
    console.warn('Redis set failed:', e);
  }
}

const LIVE_TTL = 30 * 60; // 30 minutes in seconds — for frequently-updated live feeds

export async function setLiveTerm(key: string, value: unknown): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, value, { ex: LIVE_TTL });
  } catch (e) {
    console.warn('Redis set failed:', e);
  }
}

/**
 * Acquire a short-lived lock using SET NX EX. Returns true if THIS caller
 * acquired the lock (and is therefore responsible for the work), false if
 * another worker already holds it. Used to dedup expensive refresh jobs
 * (e.g. multi-minute Gemini calls) when many visitors hit a cold cache.
 *
 * No-op (returns true) when Redis isn't configured — the caller will just
 * run unguarded, which is the right behaviour for local dev.
 */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const r = getRedis();
  if (!r) return true;
  try {
    const res = await r.set(key, '1', { ex: ttlSeconds, nx: true });
    return res === 'OK';
  } catch (e) {
    console.warn('Redis lock failed:', e);
    // Fail-open: better to occasionally double-run than to deadlock.
    return true;
  }
}

export async function releaseLock(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(key);
  } catch {
    /* swallow — lock will expire naturally */
  }
}
