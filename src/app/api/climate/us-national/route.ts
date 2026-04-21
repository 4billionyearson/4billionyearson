import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * US national (contiguous 48) climate profile.
 *
 * Pre-computed by `scripts/build-us-national-snapshot.mjs`.
 * Source: NOAA Climate at a Glance, national time series code 110.
 */

export const runtime = 'nodejs';
export const revalidate = 3600;

const SNAPSHOT_PATH = resolve(process.cwd(), 'public', 'data', 'climate', 'us-national.json');

export async function GET() {
  try {
    const raw = await readFile(SNAPSHOT_PATH, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ...data, source: 'snapshot' });
  } catch (err) {
    if ((err as NodeJS.ErrnoException | null)?.code === 'ENOENT') {
      return NextResponse.json(
        { error: 'No US national snapshot available' },
        { status: 404 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `US national snapshot unavailable: ${message}` },
      { status: 500 },
    );
  }
}
