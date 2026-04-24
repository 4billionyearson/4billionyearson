import { getAllPosts, getAllCategories } from '@/lib/api';
import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  const [posts, categories] = await Promise.all([getAllPosts(), getAllCategories()]);

  const baseUrl = 'https://4billionyearson.org';

  const postLines = posts
    .map((p) => {
      const cat = p.categories?.[0]?.title ?? 'General';
      return `- [${p.title}](${baseUrl}/posts/${p.slug}) (${cat}, ${p.date?.slice(0, 10) ?? ''})`;
    })
    .join('\n');

  const categoryLines = categories
    .map((c: any) => `- [${c.title} Articles](${baseUrl}/category/${c.slug})`)
    .join('\n');

  const body = `# 4 Billion Years On

> A living dashboard for the forces reshaping the world - tracking climate change, renewable energy, artificial intelligence and biotechnology with interactive data visualisations, plain-English explainers, and sourced articles, updated monthly.

## About

4 Billion Years On is a data journalism platform covering four civilisation-scale shifts: climate change, renewable energy, artificial intelligence and biotechnology. It presents complex data in clear, interactive formats for students, researchers, journalists, educators, policymakers and anyone seeking sourced, visual data on the biggest challenges facing humanity.

Core value proposition: Real-time and regularly updated data dashboards, plain-English explainers, curated book recommendations, and editorial articles across all four domains, designed for curious non-experts who want context, not just headlines.

## What the site covers

- **Climate Change** (monthly): Global temperature trends, CO₂ concentrations, greenhouse gas emissions by country, climate projections and historical data
- **CO₂ Emissions** (annual): Country-by-country emissions data, per-capita comparisons, sector breakdowns and trend analysis
- **Renewable Energy** (annual): Energy mix by country, renewable capacity, generation data, cost trends and energy transition progress
- **Sea Levels & Ice** (monthly): Sea level rise data, Arctic and Antarctic ice extent, glacier retreat and ocean warming
- **Extreme Weather** (live + historical): Wildfire, hurricane, flood and heatwave data with historical comparisons from 1960
- **Planetary Boundaries** (monthly): Status of the nine planetary boundaries including biodiversity, nitrogen cycle, ocean acidification
- **Greenhouse Gases** (monthly): Atmospheric CO₂, methane and N₂O levels with 800,000-year ice core records
- **Artificial Intelligence** (monthly): AI industry data, compute trends, model capabilities, energy use and societal impact
- **Biotechnology** (annual): Gene editing, CRISPR developments, synthetic biology and medical breakthroughs

## Who finds this site useful

- Students researching climate, energy or technology topics
- Researchers seeking sourced datasets and visualisations
- Journalists looking for data to support science/technology reporting
- Educators teaching about climate change, energy or AI
- Policymakers comparing country-level data on emissions and energy
- Environmental analysts tracking trends in emissions, ice cover and extreme weather
- Data scientists interested in climate and energy datasets
- General public wanting clear explanations of complex science topics

## Interactive dashboards

- Climate Dashboard: ${baseUrl}/climate-dashboard
- Emissions: ${baseUrl}/emissions
- Energy: ${baseUrl}/energy-dashboard
- Energy Rankings: ${baseUrl}/energy-rankings
- Greenhouse Gases: ${baseUrl}/greenhouse-gases
- Sea Levels & Ice: ${baseUrl}/sea-levels-ice
- Extreme Weather: ${baseUrl}/extreme-weather
- Planetary Boundaries: ${baseUrl}/planetary-boundaries
- AI Dashboard: ${baseUrl}/ai-dashboard
- Biotech Dashboard: ${baseUrl}/biotech-dashboard

## Explainer pages

- Climate Explained: ${baseUrl}/climate-explained
- Energy Explained: ${baseUrl}/energy-explained
- AI Explained: ${baseUrl}/ai-explained
- Biotech Explained: ${baseUrl}/biotech-explained

## Recommended books

- Climate Books: ${baseUrl}/climate-books
- Energy Books: ${baseUrl}/energy-books
- AI Books: ${baseUrl}/ai-books
- Biotech Books: ${baseUrl}/biotech-books

## Blog categories

${categoryLines}

## Recent articles

${postLines}

## Full content

For full article text and structured content, see: ${baseUrl}/llms-full.txt

## Contact

Website: ${baseUrl}
Email: chris.4billionyears@gmail.com
`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
