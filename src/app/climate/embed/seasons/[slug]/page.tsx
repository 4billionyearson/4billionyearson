import SeasonsEmbedClient from './SeasonsEmbedClient';

export default async function SeasonsEmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const backUrl = `https://4billionyearson.org/climate/${encodeURIComponent(slug)}#shifting-seasons`;

  return (
    <div className="p-3">
      <SeasonsEmbedClient slug={slug} />
      <div className="mt-2 flex justify-end">
        <a
          href={backUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] text-[#D0A65E]/60 hover:text-[#D0A65E] transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="4 Billion Years On" className="h-4 w-4 rounded-sm opacity-60" />
          4 Billion Years On - Shifting Seasons ↗
        </a>
      </div>
    </div>
  );
}
