import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import UpdateEmbedClient from './UpdateEmbedClient';
import { getRegionBySlug } from '@/lib/climate/regions';

export const runtime = 'nodejs';
export const revalidate = 3600;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function resolveLatestMonthLabel(slug: string): Promise<string> {
  // Prefer the same data-driven month as the page header (last entry in
  // monthlyComparison whose recentTemp is non-null).
  try {
    if (slug === 'global') {
      const p = resolve(process.cwd(), 'public', 'data', 'climate', 'global-history.json');
      const raw = await readFile(p, 'utf8');
      const parsed = JSON.parse(raw);
      const mc: Array<{ month: number; year: number; recentTemp: number | null }> = parsed?.monthlyComparison ?? [];
      const latest = [...mc].reverse().find((p) => p.recentTemp != null);
      if (latest) return `${MONTH_NAMES[latest.month - 1]} ${latest.year}`;
    }
  } catch {
    // fall through to calendar fallback
  }
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return prev.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export default async function UpdateEmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = getRegionBySlug(slug);
  const regionName = slug === 'global' ? 'Global' : (region?.name ?? slug);
  const monthLabel = await resolveLatestMonthLabel(slug);
  const backUrl = `https://4billionyearson.org/climate/${encodeURIComponent(slug)}#climate-update`;

  return (
    <div className="p-3">
      <UpdateEmbedClient slug={slug} regionName={regionName} monthLabel={monthLabel} />
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
