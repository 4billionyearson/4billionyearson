import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

export const EXTREME_WEATHER_FAQ: FAQItem[] = [
  {
    q: 'Are extreme weather events becoming more frequent?',
    aText:
      'Yes. The IPCC AR6 report (2023) found with high confidence that human-caused climate change has ' +
      'made heatwaves, heavy rainfall and droughts more frequent and more intense across most land ' +
      'regions. Tropical cyclone rainfall and the proportion of category 4–5 hurricanes are also ' +
      'increasing. The EM-DAT international disaster database shows the number of recorded climate-related ' +
      'disasters per decade has roughly tripled since the 1970s.',
  },
  {
    q: 'Which countries are most affected by extreme weather?',
    aText:
      'Disaster risk depends on both hazard exposure and population vulnerability. The countries with the ' +
      'highest counts of climate-related disasters since 1970 include the United States, China, India, the ' +
      'Philippines, Indonesia, Bangladesh, Mexico, Vietnam, Japan and Pakistan. Small island developing ' +
      'states (Caribbean nations, Pacific atolls) and Sub-Saharan African countries face the highest ' +
      'per-capita losses from cyclones, floods and droughts.',
  },
  {
    q: 'What is causing the increase in extreme weather?',
    aText:
      'A warmer atmosphere holds about 7% more water vapour per °C of warming, which intensifies ' +
      'rainfall and increases flood risk. Warmer ocean temperatures fuel stronger tropical cyclones. ' +
      'Higher land temperatures shift heatwaves further toward record-breaking territory and worsen ' +
      'drought through increased evaporation. The Arctic is warming roughly four times faster than the ' +
      'global average, which is altering the jet stream and causing more persistent weather patterns at ' +
      'mid-latitudes.',
  },
  {
    q: 'Where does the extreme weather data on this page come from?',
    aText:
      'Live disease-outbreak alerts come from the World Health Organization (WHO Disease Outbreak News). ' +
      'Live extreme-weather events come from the Global Disaster Alert and Coordination System (GDACS), ' +
      'a joint initiative of the United Nations and the European Commission. Long-term disaster trend ' +
      'data come from the EM-DAT international disaster database via Our World in Data.',
  },
  {
    q: 'How often is the extreme weather page updated?',
    aText:
      'Live alerts (GDACS, WHO) refresh several times per day. The historical disaster trend charts ' +
      '(EM-DAT / OWID) refresh on each monthly site update.',
  },
];
