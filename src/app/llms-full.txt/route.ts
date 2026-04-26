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

  const body = `# 4 Billion Years On - Full Content Index

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
4 Billion Years On is a platform dedicated to exploring the biggest civilisation-scale shifts reshaping our world. It makes complex topics - AI, biotechnology, climate change and renewable energy - accessible, engaging, and thought-provoking for curious non-experts.

---

# Data dashboards (interactive, updated regularly)

- Climate Dashboard (monthly): ${baseUrl}/climate-dashboard - global and local temperature data, anomalies, historical trends
- CO₂ Emissions (annual): ${baseUrl}/emissions - country-by-country CO₂ data, per-capita comparisons, sector breakdowns
- Energy Dashboard (annual): ${baseUrl}/energy-dashboard - energy mix by country, renewable capacity, generation data
- Energy Rankings (monthly): ${baseUrl}/energy-rankings - global rankings for renewable energy, solar, wind, fossil-fuel dependency
- Greenhouse Gases (monthly): ${baseUrl}/greenhouse-gases - atmospheric CO₂, methane, N₂O, 800,000-year ice core records
- Sea Levels & Ice (monthly): ${baseUrl}/sea-levels-ice - global sea level rise, Arctic and Antarctic ice extent
- Extreme Weather (live): ${baseUrl}/extreme-weather - GDACS alerts, floods, wildfires, droughts, cyclones since 1960
- Planetary Boundaries (monthly): ${baseUrl}/planetary-boundaries - nine Earth-system limits including biodiversity, ocean acidification
- AI Dashboard (monthly): ${baseUrl}/ai-dashboard - AI investment, compute, adoption, model capabilities, energy use
- Biotech Dashboard (annual): ${baseUrl}/biotech-dashboard - genome sequencing costs, CRISPR research, clinical trials, publications

---

# Regional climate profiles

## Climate Data Hub
URL: ${baseUrl}/climate
Monthly climate profiles for 144 countries, US states and UK regions, unified under one dashboard. Every profile carries an AI-drafted narrative summary grounded in the underlying numbers and links through to deeper data. The hub itself offers Editors' Picks, a country/state/region browser, and a full league table (Rankings) across all 144 regions.

Each profile typically includes (availability varies by region):
- Temperature averages vs the 1961–1990 WMO baseline, with monthly rank-in-record
- Rainfall and rain-days (UK/US/Met Office and World Bank CKP / CRU TS for countries)
- Sunshine hours and air-frost days (UK regions, Met Office)
- Seasonal-timing analysis: spring/autumn threshold-date shifts, warm-/wet-season length
- CO₂ emissions trend (country-level, Our World in Data / Global Carbon Project)
- Electricity generation mix and renewables share (country and US state, Ember / EIA)
- Century-scale charts and data provenance

All data refreshes monthly. Slug examples: /climate/usa, /climate/california, /climate/england, /climate/india.

## Global Climate Update
URL: ${baseUrl}/climate/global
The whole-planet view, tracking how close we are to the Paris Agreement thresholds and how every connected climate system is reacting. Includes:

- Headline temperature: NOAA land+ocean monthly anomaly vs 1961–1990, plus ERA5 land-only series
- Paris Agreement Tracker: 10-year mean vs pre-industrial (1850–1900), with milestones for 1.5°C and 2.0°C
- ENSO state (Niño 3.4) with El Niño / La Niña / Neutral classification
- Atmospheric greenhouse gases: CO₂, methane (CH₄), nitrous oxide (N₂O)
- Sea-ice extent anomalies (Arctic and Antarctic, NSIDC)
- Continental temperature comparison bar
- Country-level temperature-anomaly map
- Shifting Seasons section (linked deep-dive below)
- Emissions & Energy cards: global CO₂ and electricity generation mix

Baselines clearly labelled: 1961–1990 (WMO) for monthly anomalies; 1850–1900 (pre-industrial ≈ 13.5°C) for Paris thresholds; 20th-century mean (~13.9°C) for NOAA individual-month anomalies.

## Climate Rankings
URL: ${baseUrl}/climate/rankings
Sortable league table and monthly trend analysis for every country, US state and UK region we track. Answers at a glance:
- Which regions are warmest this month (vs the 1961–1990 baseline)?
- Biggest rank-movers since last month
- Continent-level roll-ups
- Peer comparisons within region type

## Shifting Seasons
URL: ${baseUrl}/climate/shifting-seasons
A long-record look at how the seasonal calendar is moving:
- Kyoto cherry-blossom peak-bloom dates from AD 812 — the longest continuous phenology record in the world
- US frost-free growing-season length since 1895 (EPA Climate Change Indicators)
- Northern Hemisphere snow-cover extent (Rutgers Global Snow Lab)
- Extended Spring Indices (USA-NPN) for regional first-leaf and first-bloom dates
- Global threshold-date map showing spring/autumn shifts country-by-country

Key findings as of latest update: Kyoto's cherry blossoms now bloom roughly 11 days earlier than the pre-1850 average; US growing seasons are lengthening; Northern Hemisphere spring snow-cover is in sustained decline.

## El Niño / La Niña — ENSO Tracker
URL: ${baseUrl}/climate/enso
A real-time tracker of the El Niño-Southern Oscillation, the single biggest year-to-year driver of global temperature and rainfall after the long-term warming trend:
- Current ENSO state (El Niño / Neutral / La Niña) with strength category
- Weekly Niño 3.4 SST anomaly chart (last 5 years, 1991–2020 baseline) from NOAA CPC
- Snapshot of all four Niño regions (1+2, 3, 3.4, 4)
- Historical Oceanic Niño Index (ONI, 3-month running mean of Niño 3.4 SST)
- Multivariate ENSO Index v2 (MEI v2 — combines SST, sea-level pressure, surface winds and outgoing longwave radiation)
- Southern Oscillation Index (SOI — Tahiti minus Darwin sea-level pressure)
- Live tropical Pacific SST anomaly map and equatorial subsurface heat cross-section
- Time-longitude (Hovmöller) SST anomaly diagram
- Official NOAA CPC probability forecast for the next 9 overlapping seasons

Sources: NOAA Climate Prediction Center (ONI v5, weekly Niño-region SSTs, SOI, ENSO probabilities), NOAA Physical Sciences Laboratory (MEI v2).
`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
