import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPostSlugs, getPostBySlug } from "@/lib/api";
import Container from "@/app/_components/container";
import { PostHeader } from "@/app/_components/post-header";
import { PostBody } from "@/app/_components/portable-text-body";
import { SocialShare } from "@/app/_components/social-share";

export const revalidate = 60;

export default async function Post(props: Params) {
  const params = await props.params;
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  const accentHex = (post.categories?.[0]?.accentColor || '').match(/#[0-9a-fA-F]{3,8}/)?.[0] || '#374151';

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.coverImage || undefined,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: post.author?.name || "4 Billion Years On",
    },
    publisher: {
      "@type": "Organization",
      name: "4 Billion Years On",
      url: "https://4billionyearson.org",
      logo: "https://4billionyearson.org/logo.png",
    },
    mainEntityOfPage: `https://4billionyearson.org/posts/${params.slug}`,
    ...(post.categories && post.categories.length > 0
      ? { articleSection: post.categories.map((c: any) => c.title) }
      : {}),
    keywords: post.categories?.map((c: any) => c.title)?.join(", "),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8">
        <div className="bg-gray-950/100 backdrop-blur-md rounded-2xl shadow-xl border-2 p-3 sm:p-5 md:p-7 lg:p-8 xl:p-10" style={{ borderColor: accentHex }}>
          <div>
            <article className="mb-8 mt-0 sm:-mt-1 md:-mt-2 lg:-mt-3 xl:-mt-4">
              <PostHeader
                title={post.title}
                coverImage={post.coverImage}
                date={post.date}
                author={post.author}
                categories={post.categories}
              />
              <PostBody content={post.body} htmlBody={post.htmlBody} />
              <SocialShare title={post.title} />
            </article>
          </div>
        </div>
      </div>
    </main>
  );
}

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;

  return {
    title: `${title} | 4 Billion Years On`,
    description,
    openGraph: {
      title,
      description,
      images: post.coverImage ? [post.coverImage] : [],
    },
  };
}

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((s) => ({ slug: s.slug }));
}
