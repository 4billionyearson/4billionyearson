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
  category?: {
    title: string;
    slug: string;
    accentColor?: string;
  };
};

export function PostHeader({ title, coverImage, date, author, category }: Props) {
  const accentHex = (category?.accentColor || '').match(/#[0-9a-fA-F]{3,8}/)?.[0] || '#7ec8e3';

  return (
    <>
      <PostTitle>{title}</PostTitle>
      <div className="mb-4 -mt-2">
        <CoverImage title={title} src={coverImage} />
      </div>
      <div className="mb-2 -ml-1.5">
        <Avatar name={author.name} picture={author.picture} />
      </div>
      <div className="mb-6 flex flex-row items-center gap-3 text-gray-500 text-sm">
        <DateFormatter dateString={date} />
        {category && (
          <>
            <span className="text-gray-300">|</span>
            <Link
              href={`/category/${category.slug}`}
              className="font-bold uppercase tracking-wider hover:underline"
              style={{ color: accentHex }}
            >
              {category.title}
            </Link>
          </>
        )}
      </div>
    </>
  );
}
