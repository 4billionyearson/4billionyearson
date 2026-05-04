import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

// Meta / methodology only - never include concrete numbers, percentages or
// dates that go stale. Live figures belong in the SSR'd page content.

export const SEA_LEVELS_ICE_FAQ: FAQItem[] = [
  {
    q: 'What does the sea levels and ice page show?',
    aText:
      'Live indicators of how Earth\'s ice and oceans are responding to warming: global mean sea level ' +
      'from satellite altimetry, Arctic and Antarctic sea-ice extent, and Greenland and Antarctic ice ' +
      'sheet mass change. Current values and long-term trends are shown in the live panels above.',
  },
  {
    q: 'What is the difference between sea ice and land ice?',
    aText:
      'Sea ice is frozen sea water floating on the ocean (Arctic and Antarctic). Its extent changes ' +
      'each year between summer and winter, and shrinking sea ice does not directly raise sea level ' +
      'because it is already displacing water. Land ice (the Greenland and Antarctic ice sheets, plus ' +
      'mountain glaciers) sits on land - when it melts it adds new water to the ocean and is the main ' +
      'driver of long-term sea level rise alongside thermal expansion.',
  },
  {
    q: 'Where does the data come from?',
    aText:
      'Sea level: NASA satellite altimetry (TOPEX/Poseidon, Jason and Sentinel missions) and the ' +
      'tide-gauge network. Sea ice: National Snow and Ice Data Center (NSIDC), based on NOAA passive ' +
      'microwave satellite observations. Ice sheet mass: GRACE and GRACE-FO satellite missions, ' +
      'archived by NASA JPL.',
  },
  {
    q: 'What baseline is used for the anomalies?',
    aText:
      'Sea ice anomalies use the 1981-2010 reference period (NSIDC standard). Sea level anomalies ' +
      'use a 1993-2008 satellite-altimetry reference. Ice-mass change is reported as cumulative ' +
      'gigatonnes lost since the start of each satellite record. The baseline is labelled on each chart.',
  },
  {
    q: 'How often is this page updated?',
    aText:
      'Sea-ice extent feeds refresh daily during the melt and freeze seasons. Sea level and ice-mass ' +
      'data refresh monthly as the source agencies release new processed values, typically with a ' +
      'one- to two-month lag.',
  },
];
