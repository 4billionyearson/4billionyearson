import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

// Meta / methodology only — never include concrete numbers, percentages or
// dates that go stale. Live figures belong in the SSR'd page content.

export const GREENHOUSE_GASES_FAQ: FAQItem[] = [
  {
    q: 'What does the greenhouse gases page show?',
    aText:
      'Live atmospheric concentrations of the three main long-lived greenhouse gases — carbon dioxide ' +
      '(CO₂), methane (CH₄) and nitrous oxide (N₂O) — alongside their long-term ice-core records ' +
      'stretching back hundreds of thousands of years. Current values and recent monthly trends are in ' +
      'the live panels above.',
  },
  {
    q: 'Which greenhouse gases matter most for climate change?',
    aText:
      'Carbon dioxide is the largest single contributor to human-caused warming and the longest-lived ' +
      'in the atmosphere. Methane has a much shorter lifetime but a far stronger warming effect per ' +
      'molecule. Nitrous oxide has a long lifetime and is the third-largest contributor. Fluorinated ' +
      'gases (HFCs, PFCs, SF₆) and water-vapour feedback also play a role; the major three are tracked ' +
      'on this page.',
  },
  {
    q: 'Where does the greenhouse gas data come from?',
    aText:
      'Modern atmospheric measurements: NOAA Global Monitoring Laboratory, including the Mauna Loa ' +
      'Observatory and the global air-sampling network. Long-term ice-core records: EPICA, Vostok and ' +
      'Law Dome projects, archived at NOAA NCEI. Live monthly updates are sourced via the ' +
      'global-warming.org public API which mirrors the NOAA feeds.',
  },
  {
    q: 'How are the numbers expressed?',
    aText:
      'CO₂ is reported in parts per million (ppm). Methane and nitrous oxide are reported in parts ' +
      'per billion (ppb). Trend lines remove the seasonal cycle to show the underlying year-on-year ' +
      'change. Pre-industrial levels (around 1750) are noted on each chart for reference.',
  },
  {
    q: 'How often is this page updated?',
    aText:
      'Monthly atmospheric measurements refresh each month, typically within a few weeks of the ' +
      'measurement date. Ice-core records are static historical archives that do not change.',
  },
];
