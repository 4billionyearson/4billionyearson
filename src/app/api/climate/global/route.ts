import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Global climate profile data.
 *
 * The full historical series (NOAA land+ocean + OWID/ERA5 land) is
 * pre-computed offline by `scripts/build-global-snapshot.mjs` and
 * committed to `public/data/climate/global-history.json`. That file is
 * updated monthly by a GitHub Action.
 *
 * This route now simply reads the static snapshot from disk — zero
 * upstream fetches at request time, so there's no cold-start spinner
 * and no dependence on NOAA / OWID being available when a user hits
 * the page.
 */

export const runtime = 'nodejs';
export const revalidate = 3600; // platform cache for an hour

const SNAPSHOT_PATH = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');

export async function GET() {
  try {
    const raw = await readFile(SNAPSHOT_PATH, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ...data, source: 'snapshot' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Global climate snapshot unavailable: ${message}` },
      { status: 500 },
    );
  }
}
