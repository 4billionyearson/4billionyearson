import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

/**
 * Single source of truth for the ENSO FAQ. Imported by both the layout
 * (which emits FAQPage JSON-LD before the page hydrates, so AI / search
 * crawlers see it on first byte) and the page (which mirrors the same
 * Q&A as visible HTML). aText is the plain-text answer used by JSON-LD;
 * a is an optional rich render used by the visible panel only.
 */
export const ENSO_FAQ: FAQItem[] = [
  {
    q: 'Is El Niño or La Niña active right now?',
    aText:
      'The current ENSO state is shown live at the top of this page, derived from the NOAA Climate Prediction Center Oceanic Niño Index (ONI). El Niño is declared when the 3-month running mean of the Niño 3.4 SST anomaly stays at or above +0.5 °C for five overlapping seasons; La Niña uses the mirror threshold of -0.5 °C. Otherwise the Pacific is classed as Neutral.',
  },
  {
    q: 'What are El Niño and La Niña, and which countries do they affect?',
    aText:
      'El Niño is the warm phase of the El Niño-Southern Oscillation (ENSO). It typically brings heavier rain and flooding to Peru, Ecuador, the southern United States and parts of East Africa, while causing drought across Indonesia, Australia, the Philippines, southern Africa and the Amazon. La Niña, the cool phase, broadly flips these: wetter conditions in Australia, Indonesia and southern Africa, drier conditions in the southern US and the Horn of Africa. Both phases shift global average temperatures by roughly 0.1-0.2 °C and now sit on top of the long-term climate-change warming trend.',
    a: (
      <>
        <strong className="text-white">El Niño</strong> is the warm phase of the El Niño-Southern Oscillation (ENSO). It typically
        brings <strong>heavier rain and floods to the western coast of South America</strong>{' '}
        (Peru, Ecuador), the southern United States and parts of East Africa, while causing
        <strong> drought across Indonesia, Australia, the Philippines, southern Africa and the Amazon</strong>.
        <strong className="text-white"> La Niña</strong>, the cool phase, broadly flips these: wetter conditions
        in Australia, Indonesia and southern Africa, drier conditions in the southern US and the
        Horn of Africa. Both phases shift <strong>global average temperatures</strong> by
        roughly 0.1-0.2 °C and now sit on top of the long-term climate-change warming trend.
      </>
    ),
  },
  {
    q: 'Which countries are most affected by El Niño?',
    aText:
      'El Niño typically brings heavier rainfall and flooding to Peru, Ecuador, the southern United States and parts of East Africa (Kenya, Tanzania, Somalia). It causes drought across Indonesia, Australia, the Philippines, Papua New Guinea, southern Africa (Zimbabwe, South Africa, Mozambique) and the Amazon basin. Northern South America (Colombia, Venezuela) and the Caribbean tend to be drier than average.',
    a: (
      <>
        El Niño typically brings heavier rainfall and flooding to{' '}
        <strong>Peru, Ecuador, the southern United States and parts of East Africa</strong>{' '}
        (Kenya, Tanzania, Somalia). It causes drought across{' '}
        <strong>Indonesia, Australia, the Philippines, Papua New Guinea, southern Africa</strong>{' '}
        (Zimbabwe, South Africa, Mozambique) and the <strong>Amazon basin</strong>. Northern
        South America (Colombia, Venezuela) and the Caribbean tend to be drier than average.
      </>
    ),
  },
  {
    q: 'Which countries are most affected by La Niña?',
    aText:
      'La Niña broadly flips the El Niño pattern. It brings wetter conditions to Australia, Indonesia, the Philippines, southern Africa and the Amazon, but drought to the Horn of Africa (Somalia, Ethiopia, Kenya), the southern United States, Argentina, Uruguay and southern Brazil. La Niña also boosts Atlantic hurricane activity and tends to suppress eastern-Pacific hurricanes.',
    a: (
      <>
        La Niña broadly flips the El Niño pattern. It brings wetter conditions to{' '}
        <strong>Australia, Indonesia, the Philippines, southern Africa</strong> and the{' '}
        <strong>Amazon</strong>, but drought to the <strong>Horn of Africa</strong> (Somalia,
        Ethiopia, Kenya), the <strong>southern United States, Argentina, Uruguay</strong> and
        <strong> southern Brazil</strong>. La Niña also boosts Atlantic hurricane activity and
        tends to suppress eastern-Pacific hurricanes.
      </>
    ),
  },
  {
    q: 'What is the difference between El Niño and La Niña?',
    aText:
      'They are opposite phases of the same Pacific climate cycle (ENSO). El Niño is the warm phase: equatorial Pacific surface waters are 0.5 °C or more above average, trade winds weaken, and global average temperatures briefly rise. La Niña is the cool phase: Pacific waters are 0.5 °C or more below average, trade winds strengthen and global temperatures briefly dip. Each phase lasts roughly 9-18 months and they alternate (with Neutral years) on a 2-7 year cycle.',
    a: (
      <>
        They are opposite phases of the same Pacific climate cycle (ENSO). <strong>El Niño</strong>{' '}
        is the warm phase: equatorial Pacific surface waters are 0.5 °C or more above average,
        trade winds weaken, and global average temperatures briefly rise. <strong>La Niña</strong>{' '}
        is the cool phase: Pacific waters are 0.5 °C or more below average, trade winds
        strengthen and global temperatures briefly dip. Each phase lasts roughly 9-18 months and
        they alternate (with Neutral years) on a 2-7 year cycle.
      </>
    ),
  },
  {
    q: 'Why does El Niño cause floods in some places and drought in others?',
    aText:
      "During El Niño the warm pool of water that normally sits in the western Pacific shifts eastward toward South America. Atmospheric convection - the rising air that produces rain - follows it. So Indonesia and Australia, which usually sit under that rising air, lose their rainfall, while Peru and Ecuador get downpours from convection that has moved over them. The shift also rearranges global jet streams, which is why effects show up as far away as East Africa and the southern US.",
  },
  {
    q: 'How is ENSO different from climate change?',
    aText:
      'ENSO is a natural redistribution of heat between the tropical Pacific Ocean and the atmosphere on a 2-7 year cycle. It can boost or suppress global temperatures by 0.1-0.3 °C for a year or two. Climate change is the long-term warming trend driven by greenhouse gases. Record-warm years (2016, 2023, 2024) typically combine a strong El Niño on top of the long-term trend.',
  },
  {
    q: 'When was the last major El Niño?',
    aText:
      'The most recent El Niño peaked in late 2023 / early 2024 with a peak ONI around +2.0 °C, classed as a strong event. Combined with long-term warming it helped push 2023 and 2024 to record-warm globally. Other recent strong El Niños were 2015-16 and 1997-98 (the strongest in the modern record). The most recent prolonged La Niña was the rare triple-dip event of 2020-23.',
  },
  {
    q: 'What is the Niño 3.4 region?',
    aText:
      'Niño 3.4 is a box across the central tropical Pacific (5°N-5°S, 170°W-120°W). Its sea-surface temperature anomaly is the standard index used by NOAA, WMO and most climate agencies to define ENSO state. Niño 1+2 (off Peru), Niño 3 (eastern Pacific) and Niño 4 (western/central Pacific) are also tracked here for context.',
  },
  {
    q: 'Where does the data come from?',
    aText:
      'Indicators are pulled directly from NOAA: the CPC Oceanic Niño Index (ONI), CPC weekly Niño-region SSTs, NOAA Physical Sciences Lab MEI v2 and CPC Southern Oscillation Index (SOI). The probability forecast is the NOAA CPC official outlook. The multi-year forecast curve adds the SNU ACE Lab CNN forecast (Ham et al. 2019). Regional teleconnection patterns are based on Met Office GPC composites and Davey et al. (2013).',
  },
  {
    q: 'How often is the tracker updated?',
    aText:
      'Weekly. The Niño-region SST anomalies update every Monday on NOAA CPC. The ONI 3-month index updates monthly, the MEI v2 every two months. We rebuild the snapshot used by this page once a week.',
  },
];
