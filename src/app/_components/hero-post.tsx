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
  categories?: {
    title: string;
    slug: string;
    accentColor?: string;
  }[];
};

export function HeroPost({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
  categories,
}: Props) {

  return (
    <section className="mb-6 md:mb-10">
      <Link href={`/posts/${slug}`} className="group block transition-transform duration-500 hover:scale-[1.02]">
        <article 
          className="relative overflow-hidden rounded-lg shadow-md bg-[#1a1a1a] flex flex-col min-h-[300px]" 
          style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
        >
          {coverImage && (
            <Image
              src={coverImage}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 pointer-events-none" />

          <div className="relative z-10 p-6 md:p-10 flex flex-col justify-between min-h-[400px] md:min-h-[500px] text-outline">
            <div>
              <div className="text-[#FFF5E7]/80 uppercase tracking-widest text-xs md:text-sm font-bold mb-3 drop-shadow-md">
                <DateFormatter dateString={date} />
              </div>
              <h3 className="text-[#FFF5E7] text-3xl md:text-5xl font-bold font-mono tracking-tight leading-tight mb-3 max-w-4xl drop-shadow-md">
                {title}
              </h3>
              {categories && categories.length > 0 && (
                <div className="flex flex-row items-center gap-2 mb-4 flex-wrap">
                  {categories.map((cat, i) => {
                    const hex = (cat.accentColor || '').match(/#[0-9a-fA-F]{3,8}/)?.[0] || '#7ec8e3';
                    return (
                      <span key={cat.slug} className="text-xs md:text-sm font-bold uppercase tracking-wider drop-shadow-md" style={{ color: hex }}>
                        {cat.title}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            
            <p className="text-[#FFF5E7]/90 text-sm md:text-lg leading-relaxed max-w-3xl drop-shadow-md line-clamp-3 mt-auto">
              {excerpt}
            </p>
          </div>
        </article>
      </Link>
    </section>
  );
}
