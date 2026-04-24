import { getAllPosts } from '@/lib/api';
import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  const posts = await getAllPosts();
  const baseUrl = 'https://4billionyearson.org';

  const items = posts
    .map((post) => {
      const categories =
        post.categories
          ?.map((c) => `<category><![CDATA[${c.title}]]></category>`)
          .join('') ?? '';
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/posts/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/posts/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      ${post.excerpt ? `<description><![CDATA[${post.excerpt}]]></description>` : ''}
      ${categories}
    </item>`;
    })
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>4 Billion Years On</title>
    <link>${baseUrl}</link>
    <description>A living dashboard for the forces reshaping the world - climate change, renewable energy, AI and biotechnology. Interactive data visualisations, plain-English explainers, and sourced articles.</description>
    <language>en</language>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <copyright>4 Billion Years On</copyright>
    <managingEditor>chris.4billionyears@gmail.com (4 Billion Years On)</managingEditor>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title>4 Billion Years On</title>
      <link>${baseUrl}</link>
    </image>${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
