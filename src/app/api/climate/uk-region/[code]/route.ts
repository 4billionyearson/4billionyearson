import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Per-UK-region climate profile.
 *
 * All data is pre-computed offline by
 *   `scripts/build-uk-region-snapshots.mjs`
 * and committed to
 *   `public/data/climate/uk-region/<id>.json`.
 *
 * Refreshed monthly via the climate-snapshots GitHub Action.
 */

export const runtime = 'nodejs';
export const revalidate = 3600;

const BASE = resolve(process.cwd(), 'public', 'data', 'climate', 'uk-region');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const regionId = code.toLowerCase();

  if (!/^uk-[a-z]+$/.test(regionId)) {
    return NextResponse.json({ error: 'Invalid UK region id' }, { status: 400 });
  }

  const snapshotPath = resolve(BASE, `${regionId}.json`);
  try {
    const raw = await readFile(snapshotPath, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ...data, source: 'snapshot' });
  } catch (err) {
    if ((err as NodeJS.ErrnoException | null)?.code === 'ENOENT') {
      return NextResponse.json(
        { error: `No snapshot available for UK region ${regionId}` },
        { status: 404 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `UK region snapshot unavailable: ${message}` },
      { status: 500 },
    );
  }
}
