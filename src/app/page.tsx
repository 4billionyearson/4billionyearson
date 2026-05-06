import Container from "@/app/_components/container";
import { HeroPost } from "@/app/_components/hero-post";
import { MoreStories } from "@/app/_components/more-stories";
import HeroBanner from "@/app/_components/hero-banner";
import NavigationHub from "@/app/_components/navigation-hub";
import { getAllPosts, getAllCategories } from "@/lib/api";
import { Newspaper } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "https://4billionyearson.org" },
};

export const revalidate = 60;

export default async function Index() {
  const [allPosts, categories] = await Promise.all([getAllPosts(), getAllCategories()]);

  const heroPost = allPosts[0];
  const morePosts = allPosts.slice(1);

  return (
    <main>
      {/* MVP hero banner */}
      <section className="container mx-auto px-3 md:px-4">
        <HeroBanner />
      </section>

      {/* Interactive navigation hub */}
      <section className="container mx-auto px-3 md:px-4 pt-2 pb-4 md:pt-4 md:pb-6">
        <NavigationHub />
      </section>

      {/* SEO intro paragraph for homepage - styled like hero */}
      <div className="container mx-auto px-3 md:px-4 pb-2 md:pb-4">
        <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-800 px-4 md:px-8 py-4 md:py-6 max-w-2xl mx-auto">
          <p className="text-lg text-gray-100 text-center">
            4 Billion Years On is a living dashboard for the forces reshaping the world. Dive into our latest articles for insights on artificial intelligence, climate change, renewable energy, and biotechnology…
          </p>
        </div>
      </div>

      {/* Posts */}
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8">
        {heroPost && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-[#FFF5E7]/30 flex-1" />
              <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#FFF5E7]/50 shadow-lg [&>svg]:shrink-0">
                <Newspaper className="h-4 w-4" />
                <span>Latest Article</span>
              </h2>
              <div className="h-px bg-[#FFF5E7]/30 flex-1" />
            </div>
            <HeroPost
              title={heroPost.title}
              coverImage={heroPost.coverImage}
              date={heroPost.date}
              author={heroPost.author}
              slug={heroPost.slug}
              excerpt={heroPost.excerpt}
              categories={heroPost.categories}
            />
          </>
        )}
        {morePosts.length > 0 && <MoreStories posts={morePosts} />}
      </div>
    </main>
  );
}

