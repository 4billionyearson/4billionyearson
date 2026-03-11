import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function GET(request: Request) {
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return NextResponse.json({ error: "Redis not configured in environment variables" }, { status: 503 });
    }

    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    // Fetch all keys that match our climate grid pattern
    const keys = await redis.keys('climate:grid:*');
    
    let cacheList = [];
    
    // Fetch metadata for each key
    for (const key of keys) {
      const data: any = await redis.get(key);
      if (data && data.metadata) {
        cacheList.push({
          key,
          latitude: data.metadata.gridLat,
          longitude: data.metadata.gridLon,
          lastFetched: data.metadata.lastFetched,
          targetEndDate: data.metadata.targetEndDate,
          dataPoints: data.yearlyData?.length + data.monthlyData?.length || 0,
        });
      }
    }

    return NextResponse.json({ 
      totalGridsCached: keys.length,
      grids: cacheList.sort((a, b) => new Date(b.lastFetched).getTime() - new Date(a.lastFetched).getTime())
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Allow admin to delete a specific grid cache
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return NextResponse.json({ error: "Redis not configured" }, { status: 503 });
    }

    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    if (key) {
      await redis.del(key);
      return NextResponse.json({ success: true, message: `Deleted ${key}` });
    } else {
      // Clear all
      const keys = await redis.keys('climate:grid:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return NextResponse.json({ success: true, message: `Cleared all ${keys.length} grid caches` });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
