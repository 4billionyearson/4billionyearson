import Container from "@/app/_components/container";
import { HeroPost } from "@/app/_components/hero-post";
import { MoreStories } from "@/app/_components/more-stories";
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
      {/* Category tiles — float on background */}
      {categories.length > 0 && (
        <section className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 w-full">
            {categories.map((cat: any) => {
              return (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="group relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-md block shadow-[0_3px_10px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:scale-[1.015]"
                >
                  {cat.graphic && (
                    <Image
                      src={`/${cat.graphic}`}
                      alt={cat.title}
                      width={600}
                      height={400}
                      className="w-full h-auto object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Posts — container card */}
      <div className="container mx-auto px-3 md:px-4 pb-8">
        <div className="bg-[#FFF5E8] rounded-xl shadow-xl min-h-screen p-3">
          <div>
            {heroPost && (
              <HeroPost
                title={heroPost.title}
                coverImage={heroPost.coverImage}
                date={heroPost.date}
                author={heroPost.author}
                slug={heroPost.slug}
                excerpt={heroPost.excerpt}
                category={heroPost.category}
              />
            )}
            {morePosts.length > 0 && <MoreStories posts={morePosts} />}
          </div>
        </div>
      </div>
    </main>
  );
}

