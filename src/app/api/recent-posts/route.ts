import { NextResponse } from 'next/server';
import { client } from '@/sanity/client';
import { groq } from 'next-sanity';

const query = groq`
  *[_type == "post" && date >= $since] | order(date desc) {
    "categories": categories[]->slug.current,
    date
  }
`;

export async function GET() {
  const now = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  const posts = await client.fetch(query, { since: since.toISOString().split('T')[0] });

  const categories: Record<string, string> = {};
  for (const p of posts) {
    if (!p.categories || p.categories.length === 0) continue;
    const postDate = new Date(p.date);
    const isNew = postDate >= sevenDaysAgo;
    for (const slug of p.categories) {
      if (!categories[slug] || isNew) {
        categories[slug] = isNew ? 'new' : 'recent';
      }
    }
  }

  return NextResponse.json(categories, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  });
}
