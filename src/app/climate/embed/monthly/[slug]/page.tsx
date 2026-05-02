import MonthlyEmbedClient from './MonthlyEmbedClient';
import type { SpaghettiMetric } from '@/app/_components/monthly-spaghetti-chart';

const VALID_METRICS: SpaghettiMetric[] = ['temp', 'precip', 'sunshine', 'frost'];

const SPECIAL_BACK_URL: Record<string, string> = {
  'global-land': 'https://4billionyearson.org/climate/global#monthly-history-land',
  'global-land-ocean': 'https://4billionyearson.org/climate/global#monthly-history-land-ocean',
};

export default async function MonthlyEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const metricRaw = typeof sp.metric === 'string' ? sp.metric : undefined;
  const initialMetric = metricRaw && (VALID_METRICS as string[]).includes(metricRaw)
    ? (metricRaw as SpaghettiMetric)
    : undefined;

  const backUrl = SPECIAL_BACK_URL[slug]
    ?? `https://4billionyearson.org/climate/${encodeURIComponent(slug)}#monthly-history`;

  return (
    <div className="p-3">
      <MonthlyEmbedClient slug={slug} initialMetric={initialMetric} />
      <div className="mt-2 flex justify-end">
        <a
          href={backUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] text-[#D0A65E]/60 hover:text-[#D0A65E] transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="4 Billion Years On" className="h-4 w-4 rounded-sm opacity-60" />
          4 Billion Years On - Year-on-Year Chart ↗
        </a>
      </div>
    </div>
  );
}

