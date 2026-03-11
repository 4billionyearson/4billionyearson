import { NextResponse } from 'next/server';
import { searchLocations } from '@/lib/climate/locations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = searchLocations(q, 10);
  return NextResponse.json({ results });
}
