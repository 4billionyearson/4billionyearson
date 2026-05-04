import Link from 'next/link';
import type { FAQItem } from '@/app/_components/seo/StaticFAQPanel';

// Meta / methodology only - never include concrete numbers, percentages or
// dates that go stale. Live figures belong in the SSR'd page content.

export const CLIMATE_EXPLAINED_FAQ: FAQItem[] = [
  {
    q: 'What is climate change in simple terms?',
    aText:
      'Climate change is the long-term shift in average weather patterns on Earth. Since the ' +
      'Industrial Revolution, human activity - chiefly burning fossil fuels (coal, oil, gas), ' +
      'deforestation and cement production - has released large amounts of carbon dioxide and other ' +
      'greenhouse gases into the atmosphere. These gases trap extra heat from the sun, warming the ' +
      'planet and altering rainfall, ice cover, sea levels and the frequency of extreme weather.',
  },
  {
    q: 'What is the difference between climate change and global warming?',
    aText:
      'Global warming refers specifically to the rise in Earth\'s average surface temperature caused ' +
      'by human-emitted greenhouse gases. Climate change is the broader term - it covers global ' +
      'warming plus all the downstream effects: changing rainfall patterns, melting ice, rising sea ' +
      'levels, shifting seasons, ocean acidification and more frequent extreme weather.',
  },
  {
    q: 'How do we know humans are causing climate change?',
    aText:
      'Multiple independent lines of evidence point to human activity. The isotopic signature of ' +
      'atmospheric CO₂ matches that of fossil-fuel carbon. The pattern of warming (more at night ' +
      'than day, more in winter than summer, with stratospheric cooling) matches greenhouse-gas ' +
      'warming and rules out solar or natural causes. The IPCC concluded in its Sixth Assessment ' +
      'Report that it is "unequivocal" that human influence has warmed the climate.',
  },
  {
    q: 'What is a climate tipping point?',
    aText:
      'A tipping point is a threshold beyond which a part of the climate system shifts to a new ' +
      'state that cannot easily be reversed. Examples include the collapse of the West Antarctic ice ' +
      'sheet, dieback of the Amazon rainforest, loss of Arctic summer sea ice and shutdown of the ' +
      'Atlantic Meridional Overturning Circulation (AMOC). The IPCC identifies several such ' +
      'thresholds that may be triggered between 1.5°C and 2°C of warming.',
  },
  {
    q: 'What is the Paris Agreement target?',
    aText:
      'The 2015 Paris Agreement commits its parties to holding the increase in global average ' +
      'temperature to well below 2°C above pre-industrial levels and pursuing efforts to limit ' +
      'warming to 1.5°C. Live progress against these targets is tracked on the global climate page ' +
      'at /climate/global.',
    a: (
      <>
        The 2015 Paris Agreement commits its parties to holding the increase in global average
        temperature to well below 2°C above pre-industrial levels and pursuing efforts to limit
        warming to 1.5°C. Live progress against these targets is tracked on the{' '}
        <Link href="/climate/global#paris-tracker" className="text-teal-300 hover:text-teal-200 transition-colors">
          Paris Agreement tracker
        </Link>.
      </>
    ),
  },
];
