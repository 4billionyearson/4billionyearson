import type { Metadata } from "next";
import Container from "@/app/_components/container";
import { MoreStories } from "@/app/_components/more-stories";
import { searchPosts } from "@/lib/api";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q || "";
  const posts = q ? await searchPosts(q) : [];

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8">
        <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-800 px-4 md:px-8 py-4 md:py-6">
          <Container>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 text-white font-mono inline-block">
                Search Results: {q || "..."}
              </h1>
              
              {!q && (
                <p className="text-lg text-gray-400">Please enter a search term.</p>
              )}
              
              {q && posts.length === 0 && (
                <p className="text-lg text-gray-400">No results found for "{q}".</p>
              )}

              {posts.length > 0 && <MoreStories posts={posts} hideTitle={true} />}
            </div>
          </Container>
        </div>
      </div>
    </main>
  );
}