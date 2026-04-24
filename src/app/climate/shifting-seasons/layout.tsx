import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shifting Seasons - How Climate Change Is Moving Spring, Summer, Autumn and Winter',
  description:
    "Tracking how the timing of the seasons is shifting - from Kyoto's 1,200-year cherry-blossom record to modern Northern Hemisphere snow cover. Spring is arriving earlier, snow seasons are shrinking, and the data is unambiguous.",
  keywords: [
    'shifting seasons',
    'phenology climate change',
    'Kyoto cherry blossom dates',
    'Northern Hemisphere snow cover',
    'spring arriving earlier',
    'climate change seasons',
    'growing season length',
  ],
  openGraph: {
    title: 'Shifting Seasons - How Climate Change Is Moving the Calendar',
    description:
      "Kyoto's cherry blossoms now bloom 11 days earlier than the pre-1850 average. Northern Hemisphere snow seasons are shrinking. The seasons are shifting - here's the data.",
    type: 'article',
  },
};

export default function ShiftingSeasonsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
