import MonthlyEmbedClient from './MonthlyEmbedClient';
import type { SpaghettiMetric } from '@/app/_components/monthly-spaghetti-chart';

const VALID_METRICS: SpaghettiMetric[] = ['temp', 'precip', 'sunshine', 'frost'];

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

  return <MonthlyEmbedClient slug={slug} initialMetric={initialMetric} />;
}
