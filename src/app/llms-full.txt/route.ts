import { getAllPosts } from '@/lib/api';
import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  const posts = await getAllPosts();
  const baseUrl = 'https://4billionyearson.org';

  const postSections = posts
    .map((p) => {
      const cats = p.categories?.map((c) => c.title).join(', ') ?? 'General';
      return `---

## ${p.title}

URL: ${baseUrl}/posts/${p.slug}
Date: ${p.date?.slice(0, 10) ?? 'unknown'}
Category: ${cats}
Author: ${p.author?.name ?? '4 Billion Years On'}

${p.excerpt ?? ''}`;
    })
    .join('\n\n');

  const body = `# 4 Billion Years On — Full Content Index

> A living dashboard for the forces reshaping the world. 4 Billion Years On tracks climate change, renewable energy, artificial intelligence and biotechnology with interactive data dashboards, plain-English explainers, and sourced editorial articles.

Site URL: ${baseUrl}
Index: ${baseUrl}/llms.txt
Last updated: ${new Date().toISOString().slice(0, 10)}

This file contains full excerpts for every published article on 4 Billion Years On, structured for AI content indexing.

---

# Articles

${postSections}

---

# Static content pages

## Climate Change Explained
URL: ${baseUrl}/climate-explained
A plain-English guide to climate change covering: the greenhouse effect, CO₂ and methane, global warming, feedback loops, tipping points, the Paris Agreement, IPCC, net zero, carbon budgets, and planetary boundaries. Includes a full glossary of 15+ climate science terms.

## Renewable Energy Explained
URL: ${baseUrl}/energy-explained
A plain-English guide to global energy covering: primary vs final energy, fossil fuels vs renewables, how electricity grids work, solar PV, wind power, battery storage, hydrogen, nuclear, and the energy transition. Includes energy unit explainers (TWh, kWh, GW) and capacity factor.

## AI Explained
URL: ${baseUrl}/ai-explained
A plain-English guide to artificial intelligence covering: machine learning, deep learning, neural networks, large language models (LLMs), transformers, training vs inference, parameters, AI safety, alignment, and societal impact. Includes a full glossary of 15+ AI terms.

## Biotechnology Explained
URL: ${baseUrl}/biotech-explained
A plain-English guide to biotechnology covering: DNA, RNA, genes, genomes, gene editing, CRISPR-Cas9, base editing, prime editing, mRNA, synthetic biology, and the impacts of biotech on medicine, agriculture and industry. Includes a full glossary of 15+ biotech terms.

## About 4 Billion Years On
URL: ${baseUrl}/about
4 Billion Years On is a platform dedicated to exploring the biggest civilisation-scale shifts reshaping our world. It makes complex topics — AI, biotechnology, climate change and renewable energy — accessible, engaging, and thought-provoking for curious non-experts.

---

# Data dashboards (interactive, updated regularly)

- Climate Dashboard (monthly): ${baseUrl}/climate-dashboard — global and local temperature data, anomalies, historical trends
- CO₂ Emissions (annual): ${baseUrl}/emissions — country-by-country CO₂ data, per-capita comparisons, sector breakdowns
- Energy Dashboard (annual): ${baseUrl}/energy-dashboard — energy mix by country, renewable capacity, generation data
- Energy Rankings (monthly): ${baseUrl}/energy-rankings — global rankings for renewable energy, solar, wind, fossil-fuel dependency
- Greenhouse Gases (monthly): ${baseUrl}/greenhouse-gases — atmospheric CO₂, methane, N₂O, 800,000-year ice core records
- Sea Levels & Ice (monthly): ${baseUrl}/sea-levels-ice — global sea level rise, Arctic and Antarctic ice extent
- Extreme Weather (live): ${baseUrl}/extreme-weather — GDACS alerts, floods, wildfires, droughts, cyclones since 1960
- Planetary Boundaries (monthly): ${baseUrl}/planetary-boundaries — nine Earth-system limits including biodiversity, ocean acidification
- AI Dashboard (monthly): ${baseUrl}/ai-dashboard — AI investment, compute, adoption, model capabilities, energy use
- Biotech Dashboard (annual): ${baseUrl}/biotech-dashboard — genome sequencing costs, CRISPR research, clinical trials, publications
`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
