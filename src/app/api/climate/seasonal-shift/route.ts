import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

// Static data, revalidate daily is plenty. Source files are fetched via
// `node scripts/fetch-shifting-seasons.mjs` at build-time / manually.
export const revalidate = 86400;

async function readJson(relFile: string) {
  const fp = path.join(process.cwd(), 'public', 'data', 'seasons', relFile);
  const raw = await fs.readFile(fp, 'utf8');
  return JSON.parse(raw);
}

export async function GET() {
  try {
    const [kyoto, snow, epa, manifest] = await Promise.all([
      readJson('kyoto-cherry-blossom.json'),
      readJson('nh-snow-cover.json'),
      readJson('us-growing-season.json'),
      readJson('manifest.json'),
    ]);
    return NextResponse.json(
      { kyoto, snow, epa, manifest },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Seasonal shift data not available', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
