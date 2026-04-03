import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');

  if (!process.env.SANITY_REVALIDATE_SECRET || secret !== process.env.SANITY_REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { _type, slug } = body;

    if (_type === 'post') {
      // Revalidate the specific post if we have a slug
      if (slug?.current) {
        revalidatePath(`/posts/${slug.current}`);
      }
      // Always revalidate the homepage, sitemap, and RSS feed on any post change
      revalidatePath('/');
      revalidatePath('/sitemap.xml');
      revalidatePath('/feed.xml');
    } else if (_type === 'category') {
      if (slug?.current) {
        revalidatePath(`/category/${slug.current}`);
      }
      revalidatePath('/sitemap.xml');
    }

    return NextResponse.json({ revalidated: true, type: _type });
  } catch {
    return NextResponse.json({ message: 'Error parsing request body' }, { status: 400 });
  }
}
