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

    // Fetch all climate cache keys
    const [countryKeys, usStateKeys, ukRegionKeys, globalExists] = await Promise.all([
      redis.keys('climate:country:*'),
      redis.keys('climate:usstate:*'),
      redis.keys('climate:ukregion:*'),
      redis.exists('climate:global'),
    ]);

    return NextResponse.json({
      countryKeys: countryKeys.sort(),
      usStateKeys: usStateKeys.sort(),
      ukRegionKeys: ukRegionKeys.sort(),
      hasGlobal: !!globalExists,
      totalCached: countryKeys.length + usStateKeys.length + ukRegionKeys.length + (globalExists ? 1 : 0),
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
      // Clear all climate caches
      const patterns = ['climate:grid:*', 'climate:country:*', 'climate:usstate:*', 'climate:ukregion:*', 'climate:global'];
      let totalDeleted = 0;
      for (const pattern of patterns) {
        if (pattern === 'climate:global') {
          const deleted = await redis.del('climate:global');
          totalDeleted += deleted;
        } else {
          const keys = await redis.keys(pattern);
          if (keys.length > 0) {
            await redis.del(...keys);
            totalDeleted += keys.length;
          }
        }
      }
      return NextResponse.json({ success: true, message: `Cleared ${totalDeleted} climate cache entries` });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
