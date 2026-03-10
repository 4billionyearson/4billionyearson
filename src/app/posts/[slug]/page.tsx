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

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pb-8">
        <div className="bg-[#FFF5E8] rounded-xl shadow-xl min-h-screen p-3 sm:p-6 md:p-10 lg:p-14 xl:p-16">
          <div>
            <article className="mb-8">
              <PostHeader
                title={post.title}
                coverImage={post.coverImage}
                date={post.date}
                author={post.author}
                category={post.category}
              />
              <PostBody content={post.body} />
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
