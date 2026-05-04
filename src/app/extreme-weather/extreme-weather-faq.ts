import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

// Meta / methodology only — never include concrete numbers, percentages or
// dates that go stale. Live figures belong in the SSR'd page content.

export const EXTREME_WEATHER_FAQ: FAQItem[] = [
  {
    q: 'What does the extreme weather page show?',
    aText:
      'Live alerts for extreme weather events and disease outbreaks happening right now, plus ' +
      'long-term trend charts showing how the frequency, deaths, people affected and economic damage ' +
      'from climate-related disasters have changed over decades. The current alerts and most recent ' +
      'totals are shown in the live panels above.',
  },
  {
    q: 'What counts as an extreme weather event?',
    aText:
      'The page tracks the categories used by the international disaster databases: floods, storms ' +
      '(including tropical cyclones), droughts, heatwaves, wildfires, landslides and extreme cold. ' +
      'Earthquakes and volcanic eruptions are not climate-related and are excluded from the trend ' +
      'charts.',
  },
  {
    q: 'Where does the extreme weather data come from?',
    aText:
      'Live extreme-weather alerts: Global Disaster Alert and Coordination System (GDACS), a joint ' +
      'initiative of the United Nations and the European Commission. Live disease-outbreak alerts: ' +
      'World Health Organization (WHO Disease Outbreak News). Long-term disaster trend data: EM-DAT ' +
      'international disaster database, presented via Our World in Data.',
  },
  {
    q: 'How often is this page updated?',
    aText:
      'Live alert feeds (GDACS, WHO) refresh several times per day. Historical disaster trend charts ' +
      'refresh on the same monthly cadence as the rest of the site.',
  },
  {
    q: 'Where can I see climate-change attribution for individual events?',
    aText:
      'For attribution of specific events to climate change see World Weather Attribution ' +
      '(worldweatherattribution.org) and Climameter (climameter.org). The IPCC AR6 Working Group I ' +
      'report (2021) covers attribution methodology in detail.',
  },
];
