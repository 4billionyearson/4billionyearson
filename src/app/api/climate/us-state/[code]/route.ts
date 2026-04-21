import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Per-state climate profile.
 *
 * All data is pre-computed offline by
 *   `scripts/build-us-state-snapshots.mjs`
 * and committed to
 *   `public/data/climate/us-state/<id>.json`.
 *
 * Refreshed monthly via the climate-snapshots GitHub Action.
 */

export const runtime = 'nodejs';
export const revalidate = 3600;

const BASE = resolve(process.cwd(), 'public', 'data', 'climate', 'us-state');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const stateId = code.toLowerCase();

  if (!/^us-[a-z]{2}$/.test(stateId)) {
    return NextResponse.json({ error: 'Invalid US state id' }, { status: 400 });
  }

  const snapshotPath = resolve(BASE, `${stateId}.json`);
  try {
    const raw = await readFile(snapshotPath, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ...data, source: 'snapshot' });
  } catch (err) {
    if ((err as NodeJS.ErrnoException | null)?.code === 'ENOENT') {
      return NextResponse.json(
        { error: `No snapshot available for US state ${stateId}` },
        { status: 404 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `US state snapshot unavailable: ${message}` },
      { status: 500 },
    );
  }
}
