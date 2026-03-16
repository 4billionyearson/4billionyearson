import { NextResponse } from 'next/server';
import { client } from '@/sanity/client';
import { groq } from 'next-sanity';

const query = groq`
  *[_type == "post" && date >= $since] | order(date desc) {
    "category": category->slug.current,
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
    if (!p.category) continue;
    const postDate = new Date(p.date);
    const isNew = postDate >= sevenDaysAgo;
    if (!categories[p.category] || isNew) {
      categories[p.category] = isNew ? 'new' : 'recent';
    }
  }

  return NextResponse.json(categories, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  });
}
