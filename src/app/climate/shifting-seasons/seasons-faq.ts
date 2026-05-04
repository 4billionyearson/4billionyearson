import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

// Meta / methodology only — never include concrete numbers, percentages or
// dates that go stale. Live figures belong in the SSR'd page content.

export const SHIFTING_SEASONS_FAQ: FAQItem[] = [
  {
    q: 'What does the shifting seasons page show?',
    aText:
      'How the timing and length of meteorological seasons have changed under climate change — when ' +
      'spring now begins, how long summer lasts, when winter snow cover starts and ends, and how ' +
      'these shifts vary by hemisphere and by country. The live charts and the country comparison ' +
      'panel above carry the current values.',
  },
  {
    q: 'How are season-shift indicators measured?',
    aText:
      'Spring onset uses the USA-NPN Spring Leaf and Bloom Index (USA) and equivalent phenological ' +
      'and temperature-threshold indicators elsewhere. Growing-season length uses the first and last ' +
      'date with daily mean temperature above a region-appropriate threshold. Snow cover uses the ' +
      'Northern Hemisphere snow-cover extent series from Rutgers University Global Snow Lab.',
  },
  {
    q: 'Where does the seasonal data come from?',
    aText:
      'USA: NOAA NCEI nClimDiv, USA-NPN, EPA Climate Change Indicators. Northern-Hemisphere snow: ' +
      'Rutgers Global Snow Lab. Country-level seasonal anomalies: Berkeley Earth, Copernicus C3S / ' +
      'ERA5. UK seasonal anomalies: Met Office HadUK-Grid.',
  },
  {
    q: 'What baseline is used?',
    aText:
      'Anomalies are calculated against the 1991–2020 climate normal where available (WMO standard). ' +
      'Some indicators (snow cover, US growing season) use longer reference periods set by the ' +
      'source agency; the baseline is labelled on each chart.',
  },
  {
    q: 'Are summers getting longer?',
    aText:
      'Yes. The growing season - the run of days with mean temperature above a region-appropriate ' +
      'threshold - has lengthened across most of the Northern Hemisphere since 1970, with the ' +
      'sharpest gains in the contiguous United States and northern Europe. The exact change for ' +
      'any one country, US state or UK region is shown live on this page in the season-length ' +
      'chart and the country comparison panel above; we do not bake numbers into this FAQ because ' +
      'they refresh annually.',
  },
  {
    q: 'When does spring arrive now compared with the past?',
    aText:
      'Spring is arriving earlier across most of the temperate Northern Hemisphere. The USA-NPN ' +
      'Spring Leaf and Bloom Index (USA), Met Office HadUK-Grid temperature thresholds (UK) and ' +
      'Berkeley Earth / Copernicus ERA5 (rest of the world) all show first-leaf and first-bloom ' +
      'dates trending earlier by roughly one to three weeks since 1980, depending on the region. ' +
      'Pick a country in the country comparison panel above to see the live spring-onset anomaly.',
  },
  {
    q: 'Why are seasonal shifts a useful climate indicator?',
    aText:
      'Annual mean temperature can mask big within-year changes. Earlier spring leaf-out, longer ' +
      'frost-free windows, later first-snow dates and shorter snow-cover seasons all change the ' +
      'environment for crops, pests, pollinators and water supply long before the headline ' +
      'temperature anomaly looks alarming. They are also independent of the choice of climate ' +
      'baseline, which makes them a good cross-check on the temperature record.',
  },
  {
    q: 'How often is this page updated?',
    aText:
      'Annual indicators (growing-season length, snow-season length) refresh once a year as the source ' +
      'agencies publish them. Monthly indicators refresh on the same monthly cadence as the rest of the ' +
      'site, typically in the first half of each month.',
  },
];
