import Container from "@/app/_components/container";
import { HeroPost } from "@/app/_components/hero-post";
import { MoreStories } from "@/app/_components/more-stories";
import NavigationHub from "@/app/_components/navigation-hub";
import { getAllPosts, getAllCategories } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 60;

export default async function Index() {
  const [allPosts, categories] = await Promise.all([getAllPosts(), getAllCategories()]);

  const heroPost = allPosts[0];
  const morePosts = allPosts.slice(1);

  return (
    <main>
      {/* Interactive navigation hub */}
      <section className="container mx-auto px-3 md:px-4 pt-2 pb-4 md:pt-4 md:pb-6">
        <NavigationHub />
      </section>

      {/* Posts */}
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8">
        {heroPost && (
          <>
            <HeroPost
              title={heroPost.title}
              coverImage={heroPost.coverImage}
              date={heroPost.date}
              author={heroPost.author}
              slug={heroPost.slug}
              excerpt={heroPost.excerpt}
              category={heroPost.category}
            />
          </>
        )}
        {morePosts.length > 0 && <MoreStories posts={morePosts} />}
      </div>
    </main>
  );
}

