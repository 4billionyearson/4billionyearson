import { Post } from "@/interfaces/post";
import { PostPreview } from "./post-preview";

type Props = {
  posts: Post[];
  title?: string;
  hideTitle?: boolean;
};

export function MoreStories({ posts, title = "More Stories", hideTitle = false }: Props) {
  return (
    <section>
      {!hideTitle && (
        <h2 className="mb-8 text-3xl md:text-5xl font-extrabold tracking-tight font-mono inline-block">
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
