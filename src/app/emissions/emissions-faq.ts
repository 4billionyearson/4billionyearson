import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

// Meta / methodology only — never include concrete numbers, percentages or
// dates that go stale. Live figures belong in the SSR'd page content.

export const EMISSIONS_FAQ: FAQItem[] = [
  {
    q: 'What does the emissions page show?',
    aText:
      'Annual fossil-fuel CO₂ emissions by country, region and sector, plus per-capita and cumulative ' +
      '(historical) emissions. The live panels above show the latest annual totals, the country ' +
      'rankings and the breakdown by sector and fuel type.',
  },
  {
    q: 'What is the difference between annual, per-capita and cumulative emissions?',
    aText:
      'Annual emissions are the total CO₂ a country emitted in a single year — useful for tracking ' +
      'current trends. Per-capita emissions divide that by population — useful for comparing the ' +
      'climate footprint of an average resident. Cumulative emissions sum every year since 1850 — ' +
      'useful for measuring historical responsibility, since CO₂ stays in the atmosphere for ' +
      'centuries and long-term warming is driven by total cumulative emissions.',
  },
  {
    q: 'Where does the emissions data come from?',
    aText:
      'Emissions data come from the Global Carbon Project and the Carbon Dioxide Information Analysis ' +
      'Centre (CDIAC), processed and visualised by Our World in Data. Per-capita and cumulative ' +
      'figures are calculated against UN population estimates. Sectoral breakdowns use the IEA and ' +
      'EDGAR datasets.',
  },
  {
    q: 'Are land-use emissions included?',
    aText:
      'The headline figures on this page focus on fossil-fuel CO₂. Land-use change (deforestation, ' +
      'forest regrowth, peatland loss) adds a substantial additional flux that is reported separately ' +
      'by the Global Carbon Project. Where included it is labelled clearly on the chart.',
  },
  {
    q: 'How often is this page updated?',
    aText:
      'The Global Carbon Project publishes its full annual budget once a year, typically in November ' +
      'or December (covering data through the previous year). The live panels on this page update at ' +
      'that point and on each subsequent monthly site refresh.',
  },
];
