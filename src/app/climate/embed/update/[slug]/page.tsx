import UpdateEmbedClient from './UpdateEmbedClient';
import { getRegionBySlug } from '@/lib/climate/regions';

export default async function UpdateEmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = getRegionBySlug(slug);
  const regionName = slug === 'global' ? 'Global' : (region?.name ?? slug);
  const backUrl = `https://4billionyearson.org/climate/${encodeURIComponent(slug)}#climate-update`;

  return (
    <div className="p-3">
      <UpdateEmbedClient slug={slug} regionName={regionName} />
      <div className="mt-2 flex justify-end">
        <a
          href={backUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] text-[#D0A65E]/60 hover:text-[#D0A65E] transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="4 Billion Years On" className="h-4 w-4 rounded-sm opacity-60" />
          4 Billion Years On - Climate Update ↗
        </a>
      </div>
    </div>
  );
}
