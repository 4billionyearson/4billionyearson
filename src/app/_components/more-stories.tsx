import { Post } from "@/interfaces/post";
import { PostPreview } from "./post-preview";
import { Newspaper } from "lucide-react";

type Props = {
  posts: Post[];
  title?: string;
  hideTitle?: boolean;
};

export function MoreStories({ posts, title = "More Articles", hideTitle = false }: Props) {
  return (
    <section>
      {!hideTitle && (
        <div className="flex items-center gap-4 my-6">
          <div className="h-px bg-[#FFF5E7]/30 flex-1" />
          <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#FFF5E7]/50 shadow-lg">
            <Newspaper className="h-4 w-4" />
            {title}
          </h2>
          <div className="h-px bg-[#FFF5E7]/30 flex-1" />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-12 lg:gap-x-16 gap-y-12 md:gap-y-16 mb-20">
        {posts.map((post) => (
          <PostPreview
            key={post.slug}
            title={post.title}
            coverImage={post.coverImage}
            date={post.date}
            author={post.author}
            slug={post.slug}
            excerpt={post.excerpt}
            category={post.category}
          />
        ))}
      </div>
    </section>
  );
}
