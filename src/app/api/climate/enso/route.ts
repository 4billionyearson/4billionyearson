import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * ENSO / Pacific oceans snapshot.
 *
 * Pre-computed offline by `scripts/build-enso-snapshot.mjs` and committed
 * to `public/data/climate/enso.json`. Refreshed monthly via the
 * climate-snapshots GitHub Action. This route just reads and returns
 * the static file - zero upstream fetches at request time.
 */

export const runtime = 'nodejs';
export const revalidate = 3600;

const SNAPSHOT_PATH = resolve(process.cwd(), 'public', 'data', 'climate', 'enso.json');

export async function GET() {
  try {
    const raw = await readFile(SNAPSHOT_PATH, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ...data, source: 'snapshot' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `ENSO snapshot unavailable: ${message}` },
      { status: 500 },
    );
  }
}
