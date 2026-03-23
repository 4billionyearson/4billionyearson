import Avatar from "./avatar";
import CoverImage from "./cover-image";
import DateFormatter from "./date-formatter";
import { PostTitle } from "@/app/_components/post-title";
import { type Author } from "@/interfaces/author";
import Link from "next/link";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  author: Author;
  categories?: {
    title: string;
    slug: string;
    accentColor?: string;
  }[];
};

export function PostHeader({ title, coverImage, date, author, categories }: Props) {
  const firstAccent = (categories?.[0]?.accentColor || '').match(/#[0-9a-fA-F]{3,8}/)?.[0] || '#7ec8e3';

  return (
    <>
      <PostTitle>{title}</PostTitle>
      <div className="mb-4 -mt-2">
        <CoverImage title={title} src={coverImage} />
      </div>
      <div className="mb-2 -ml-1.5">
        <Avatar name={author.name} picture={author.picture} />
      </div>
      <div className="mb-6 flex flex-row items-center gap-3 text-gray-400 text-sm flex-wrap">
        <DateFormatter dateString={date} />
        {categories && categories.length > 0 && (
          <>
            <span className="text-gray-600">|</span>
            {categories.map((cat, i) => {
              const hex = (cat.accentColor || '').match(/#[0-9a-fA-F]{3,8}/)?.[0] || '#7ec8e3';
              return (
                <span key={cat.slug} className="flex items-center gap-2">
                  {i > 0 && <span className="text-gray-700">·</span>}
                  <Link
                    href={`/category/${cat.slug}`}
                    className="font-bold uppercase tracking-wider hover:underline"
                    style={{ color: hex }}
                  >
                    {cat.title}
                  </Link>
                </span>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
