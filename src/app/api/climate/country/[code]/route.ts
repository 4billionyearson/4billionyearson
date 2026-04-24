import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Per-country climate profile.
 *
 * All data is pre-computed offline by
 *   `scripts/build-country-snapshots.mjs`
 * and committed to
 *   `public/data/climate/country/<APICODE>.json`.
 *
 * That script fetches the full OWID temperature + precipitation
 * datasets (one pair of network calls for all countries combined),
 * slices them by entity and writes a self-contained snapshot per
 * country. This route just reads and returns the correct file.
 *
 * Refreshed monthly via the climate-snapshots GitHub Action.
 */

export const runtime = 'nodejs';
export const revalidate = 3600;

const BASE = resolve(process.cwd(), 'public', 'data', 'climate', 'country');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  // Guard against path traversal - only allow A-Z codes.
  if (!/^[A-Z]{2,4}$/.test(upperCode)) {
    return NextResponse.json({ error: 'Invalid country code' }, { status: 400 });
  }

  const snapshotPath = resolve(BASE, `${upperCode}.json`);
  try {
    const raw = await readFile(snapshotPath, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ...data, source: 'snapshot' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if ((err as NodeJS.ErrnoException | null)?.code === 'ENOENT') {
      return NextResponse.json(
        { error: `No snapshot available for country ${upperCode}` },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: `Country snapshot unavailable: ${message}` },
      { status: 500 },
    );
  }
}
