import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

export const GREENHOUSE_GASES_FAQ: FAQItem[] = [
  {
    q: 'What is the current atmospheric CO₂ level?',
    aText:
      'Atmospheric CO₂ is currently around 425 parts per million (ppm) and rising by about 2–3 ppm ' +
      'per year. This is roughly 50% higher than the pre-industrial level of about 280 ppm and the ' +
      'highest concentration in at least 800,000 years of ice core records, and likely the highest in ' +
      'several million years.',
  },
  {
    q: 'Which greenhouse gases matter most?',
    aText:
      'Carbon dioxide (CO₂) is responsible for about two-thirds of human-caused warming since 1750. ' +
      'Methane (CH₄) is the second most important greenhouse gas — about 80 times more potent than CO₂ ' +
      'over 20 years but with a shorter atmospheric lifetime. Nitrous oxide (N₂O) and fluorinated gases ' +
      'contribute the remainder. Water vapour amplifies warming as a feedback rather than a direct driver.',
  },
  {
    q: 'How quickly is methane rising?',
    aText:
      'Atmospheric methane has more than doubled since pre-industrial times, from about 720 parts per ' +
      'billion (ppb) to over 1,930 ppb. Growth has accelerated since 2007 and reached record annual ' +
      'increases in 2020–2022. Sources include fossil fuel production, agriculture (livestock and rice), ' +
      'landfills and natural wetlands.',
  },
  {
    q: 'When did greenhouse gas concentrations start rising?',
    aText:
      'Ice core records show CO₂ began rising above its natural range around 1850, coinciding with the ' +
      'Industrial Revolution and widespread coal burning. Methane and nitrous oxide began rising at ' +
      'similar times. The rate of increase has accelerated dramatically since the 1950s.',
  },
  {
    q: 'Where does the greenhouse gas data on this page come from?',
    aText:
      'Modern atmospheric measurements come from NOAA Global Monitoring Laboratory (Mauna Loa and the ' +
      'global air sampling network). Long-term ice core records come from EPICA, Vostok and Law Dome ' +
      'projects, archived at NOAA NCEI. Live monthly updates are sourced via global-warming.org.',
  },
];
