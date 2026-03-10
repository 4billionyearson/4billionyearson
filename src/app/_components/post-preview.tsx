import { type Author } from "@/interfaces/author";
import Link from "next/link";
import Image from "next/image";
import DateFormatter from "./date-formatter";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  excerpt: string;
  author: Author;
  slug: string;
  category?: {
    title: string;
    slug: string;
    accentColor?: string;
  };
};

export function PostPreview({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
  category,
}: Props) {
  const accentHex = (category?.accentColor || '').match(/#[0-9a-fA-F]{3,8}/)?.[0] || '#7ec8e3';

  return (
    <Link href={`/posts/${slug}`} className="group block transition-transform duration-500 hover:scale-[1.02] h-full">
      <article 
        className="relative overflow-hidden rounded-lg shadow-md bg-[#1a1a1a] h-full flex flex-col min-h-[350px]" 
        style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
      >
        {coverImage && (
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover opacity-90 mix-blend-overlay group-hover:scale-105 transition-transform duration-500"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/80 pointer-events-none" />

        <div className="relative z-10 p-5 md:p-8 flex flex-col justify-between h-full">
          <div>
            <div className="text-[#FFF5E8]/80 uppercase tracking-widest text-xs font-bold mb-2 flex flex-row items-center gap-2 drop-shadow-md">
              <DateFormatter dateString={date} />
              {category && (
                <>
                  <span className="text-[#FFF5E8]/40">|</span>
                  <span style={{ color: accentHex }}>{category.title}</span>
                </>
              )}
            </div>
            <h3 className="text-[#FFF5E8] text-2xl md:text-3xl font-bold font-mono tracking-tight leading-snug mb-3 drop-shadow-md">
              {title}
            </h3>
          </div>
          
          <p className="text-[#FFF5E8]/90 text-sm md:text-base leading-relaxed line-clamp-3 mt-auto drop-shadow-md">
            {excerpt}
          </p>
        </div>
      </article>
    </Link>
  );
}
