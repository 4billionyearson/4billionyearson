import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
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
