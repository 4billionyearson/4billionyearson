import { Post } from "@/interfaces/post";
import { PostPreview } from "./post-preview";

type Props = {
  posts: Post[];
  title?: string;
  hideTitle?: boolean;
};

export function MoreStories({ posts, title = "More Posts", hideTitle = false }: Props) {
  return (
    <section>
      {!hideTitle && (
        <h2 className="text-2xl md:text-3xl font-bold font-mono tracking-wide text-white mb-4">
          {title}
        </h2>
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
