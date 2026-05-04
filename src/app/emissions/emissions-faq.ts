import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

export const EMISSIONS_FAQ: FAQItem[] = [
  {
    q: 'Which countries emit the most CO₂?',
    aText:
      'In annual emissions, China is the largest emitter (~30% of global total), followed by the United ' +
      'States, India, the European Union, Russia and Japan. On a per-capita basis, the order is very ' +
      'different — Gulf states (Qatar, UAE, Kuwait), Australia, the United States and Canada lead, while ' +
      'India sits well below the global average.',
  },
  {
    q: 'Which countries are most responsible historically?',
    aText:
      'Cumulative CO₂ emissions since 1850 are what determine long-term warming. The United States is ' +
      'responsible for roughly 25% of all historical fossil-fuel CO₂, followed by the EU (~22%), China ' +
      '(~14%) and Russia (~7%). Many countries that are vulnerable to climate impacts have contributed ' +
      'less than 1% of historical emissions.',
  },
  {
    q: 'Are global emissions still rising?',
    aText:
      'Yes. Global fossil-fuel CO₂ emissions reached a new record high in 2023 at about 37 billion ' +
      'tonnes. Emissions in the EU and US have been declining since around 2007, while emissions from ' +
      'China, India and other emerging economies continue to rise. Total global emissions need to fall ' +
      'by roughly 45% from 2019 levels by 2030 to keep 1.5°C within reach.',
  },
  {
    q: 'What sectors emit the most?',
    aText:
      'Energy use accounts for about 73% of global greenhouse gas emissions: electricity and heat (~31%), ' +
      'transport (~16%), manufacturing and construction (~13%) and buildings (~6%). Agriculture, ' +
      'forestry and land use add ~18% (mostly methane and N₂O). Industrial processes (cement, chemicals) ' +
      'and waste contribute the remainder.',
  },
  {
    q: 'Where does the emissions data on this page come from?',
    aText:
      'Emissions data come from the Global Carbon Project and the Carbon Dioxide Information Analysis ' +
      'Centre (CDIAC), processed and visualised by Our World in Data. Per-capita and cumulative figures ' +
      'are calculated against UN population estimates.',
  },
];
