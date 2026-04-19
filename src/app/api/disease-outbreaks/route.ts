import { NextResponse } from 'next/server';
import { getCached, setShortTerm } from '@/lib/climate/redis';

const CACHE_KEY = 'biotech:outbreaks:v1';

/* ─── Country centroid lookup [lat, lon] ──────────────────────────────────── */

const CC: Record<string, [number, number]> = {
  "Afghanistan": [33.9, 67.7],
  "Albania": [41.2, 20.2],
  "Algeria": [28.0, 1.7],
  "Angola": [-11.2, 17.9],
  "Argentina": [-38.4, -63.6],
  "Australia": [-25.3, 133.8],
  "Austria": [47.5, 14.6],
  "Bahrain": [26.0, 50.5],
  "Bangladesh": [23.7, 90.4],
  "Belgium": [50.5, 4.5],
  "Benin": [9.3, 2.3],
  "Bolivia": [-16.3, -63.6],
  "Bosnia and Herzegovina": [43.9, 17.7],
  "Botswana": [-22.3, 24.7],
  "Brazil": [-14.2, -51.9],
  "Brunei": [4.5, 114.7],
  "Burkina Faso": [12.2, -1.6],
  "Burundi": [-3.4, 29.9],
  "Cambodia": [12.6, 105.0],
  "Cameroon": [7.4, 12.4],
  "Canada": [56.1, -106.3],
  "Central African Republic": [6.6, 20.9],
  "Chad": [15.5, 18.7],
  "Chile": [-35.7, -71.5],
  "China": [35.9, 104.2],
  "Colombia": [4.6, -74.3],
  "Comoros": [-11.7, 43.3],
  "Congo": [-0.2, 15.8],
  "Costa Rica": [9.7, -83.8],
  "Côte d'Ivoire": [7.5, -5.5],
  "Cote d'Ivoire": [7.5, -5.5],
  "Croatia": [45.1, 15.2],
  "Cuba": [21.5, -77.8],
  "Cyprus": [35.1, 33.4],
  "Czechia": [49.8, 15.5],
  "Democratic Republic of the Congo": [-4.0, 21.8],
  "Denmark": [56.3, 9.5],
  "Dominican Republic": [18.7, -70.2],
  "Ecuador": [-1.8, -78.2],
  "Egypt": [26.8, 30.8],
  "El Salvador": [13.8, -88.9],
  "Equatorial Guinea": [1.7, 10.3],
  "Eritrea": [15.2, 39.8],
  "Eswatini": [-26.5, 31.5],
  "Ethiopia": [9.1, 40.5],
  "Finland": [61.9, 25.7],
  "France": [46.2, 2.2],
  "Gabon": [-0.8, 11.6],
  "Gambia": [13.4, -15.3],
  "Georgia": [42.3, 43.4],
  "Germany": [51.2, 10.5],
  "Ghana": [7.9, -1.0],
  "Greece": [39.1, 21.8],
  "Guatemala": [15.8, -90.2],
  "Guinea": [9.9, -11.1],
  "Guinea-Bissau": [11.8, -15.2],
  "Haiti": [19.0, -72.3],
  "Honduras": [15.2, -86.2],
  "Hong Kong": [22.4, 114.1],
  "Hungary": [47.2, 19.5],
  "India": [20.6, 78.9],
  "Indonesia": [-0.8, 113.9],
  "Iran": [32.4, 53.7],
  "Iraq": [33.2, 44.0],
  "Ireland": [53.1, -8.0],
  "Israel": [31.0, 34.9],
  "Italy": [41.9, 12.6],
  "Jamaica": [18.1, -77.3],
  "Japan": [36.2, 138.3],
  "Jordan": [30.6, 36.2],
  "Kazakhstan": [48.0, 67.0],
  "Kenya": [-0.0, 37.9],
  "Kuwait": [29.3, 47.5],
  "Laos": [19.9, 102.5],
  "Lebanon": [33.9, 35.9],
  "Lesotho": [-29.6, 28.2],
  "Liberia": [6.4, -9.4],
  "Libya": [26.3, 17.2],
  "Madagascar": [-18.8, 46.9],
  "Malawi": [-13.3, 34.3],
  "Malaysia": [4.2, 101.9],
  "Mali": [17.6, -4.0],
  "Mauritania": [21.0, -10.9],
  "Mexico": [23.6, -102.5],
  "Mongolia": [46.9, 103.8],
  "Montenegro": [42.7, 19.4],
  "Morocco": [31.8, -7.1],
  "Mozambique": [-18.7, 35.5],
  "Myanmar": [21.9, 96.0],
  "Namibia": [-22.6, 17.1],
  "Nepal": [28.4, 84.1],
  "Netherlands": [52.1, 5.3],
  "New Zealand": [-40.9, 174.9],
  "Nicaragua": [12.9, -85.2],
  "Niger": [17.6, 8.1],
  "Nigeria": [9.1, 8.7],
  "Norway": [60.5, 8.5],
  "Oman": [21.5, 55.9],
  "Pakistan": [30.4, 69.3],
  "Panama": [8.5, -80.8],
  "Papua New Guinea": [-6.3, 143.9],
  "Paraguay": [-23.4, -58.4],
  "Peru": [-9.2, -75.0],
  "Philippines": [12.9, 121.8],
  "Poland": [51.9, 19.1],
  "Portugal": [39.4, -8.2],
  "Qatar": [25.4, 51.2],
  "Republic of Korea": [35.9, 127.8],
  "Republic of the Congo": [-0.2, 15.8],
  "Romania": [45.9, 25.0],
  "Russia": [61.5, 105.3],
  "Rwanda": [-1.9, 29.9],
  "Saudi Arabia": [23.9, 45.1],
  "Kingdom of Saudi Arabia": [23.9, 45.1],
  "Senegal": [14.5, -14.5],
  "Serbia": [44.0, 21.0],
  "Sierra Leone": [8.5, -11.8],
  "Singapore": [1.4, 103.8],
  "Slovakia": [48.7, 19.7],
  "Slovenia": [46.2, 14.9],
  "Somalia": [5.2, 46.2],
  "South Africa": [-30.6, 22.9],
  "South Korea": [35.9, 127.8],
  "South Sudan": [6.9, 31.3],
  "Spain": [40.5, -3.7],
  "Sri Lanka": [7.9, 80.8],
  "Sudan": [12.9, 30.2],
  "Suriname": [3.9, -56.0],
  "Sweden": [60.1, 18.6],
  "Switzerland": [46.8, 8.2],
  "Syria": [34.8, 38.9],
  "Syrian Arab Republic": [34.8, 38.9],
  "Tanzania": [-6.4, 34.9],
  "Thailand": [15.9, 100.9],
  "Togo": [8.6, 1.2],
  "Trinidad and Tobago": [10.7, -61.2],
  "Tunisia": [33.9, 9.5],
  "Turkey": [38.9, 35.2],
  "Türkiye": [38.9, 35.2],
  "Uganda": [1.4, 32.3],
  "Ukraine": [48.4, 31.2],
  "United Arab Emirates": [23.4, 53.8],
  "United Kingdom": [55.4, -3.4],
  "United States of America": [37.1, -95.7],
  "United States": [37.1, -95.7],
  "Uruguay": [-32.5, -55.8],
  "Venezuela": [6.4, -66.6],
  "Viet Nam": [14.1, 108.3],
  "Vietnam": [14.1, 108.3],
  "Yemen": [15.6, 48.5],
  "Zambia": [-13.1, 27.8],
  "Zimbabwe": [-19.0, 29.2],
};

/* ─── Parse WHO DON title → disease + country ─────────────────────────────── */

// Sorted by length descending so longest country names match first
const SORTED_COUNTRIES = Object.keys(CC).sort((a, b) => b.length - a.length);

function parseDON(title: string): { disease: string; country: string } | null {
  const normalized = title
    .replace(/\u2013/g, '-')  // en-dash
    .replace(/\u2014/g, '-')  // em-dash
    .trim();
  const normalizedLower = normalized.toLowerCase();

  let matchedCountry: string | null = null;
  let matchIndex = -1;

  for (const country of SORTED_COUNTRIES) {
    const idx = normalizedLower.indexOf(country.toLowerCase());
    if (idx !== -1) {
      matchedCountry = country;
      matchIndex = idx;
      break;
    }
  }

  if (!matchedCountry || matchIndex === -1) return null;

  let diseasePart = normalized.substring(0, matchIndex).trim();
  diseasePart = diseasePart
    .replace(/[-]\s*(situation\s+in\s*)?$/i, '')
    .replace(/\s+in\s*$/i, '')
    .replace(/[-]\s*$/i, '')
    .replace(/^\d{4}\s*[-]\s*/, '')
    .replace(/\s*[-]\s*update\s*\d*\s*$/i, '')
    .trim();

  if (!diseasePart) return null;

  return { disease: diseasePart, country: matchedCountry };
}

/* ─── Outbreak data type ──────────────────────────────────────────────────── */

export interface DiseaseOutbreak {
  disease: string;
  country: string;
  date: string;
  summary: string;
  url: string;
  lat: number;
  lon: number;
}

/* ─── Fetch & transform ───────────────────────────────────────────────────── */

async function fetchOutbreaks() {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const baseUrl = 'https://www.who.int/api/hubs/diseaseoutbreaknews';
  const params = '$orderby=PublicationDateAndTime%20desc&$top=100&$select=Title,PublicationDateAndTime,Summary,DonId,UrlName';
  let allItems: any[] = [];
  let nextUrl: string | null = `${baseUrl}?${params}`;

  // Paginate through results (WHO caps at 100 per page)
  while (nextUrl && allItems.length < 300) {
    const res: Response = await fetch(nextUrl, {
      signal: AbortSignal.timeout(30_000),
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`WHO API ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const items: any[] = json.value || [];
    allItems = allItems.concat(items);
    nextUrl = json['@odata.nextLink'] || null;
  }

  const outbreaks: DiseaseOutbreak[] = [];
  const seen = new Set<string>();

  for (const item of allItems) {
    const pubDate = new Date(item.PublicationDateAndTime);
    if (pubDate < twoYearsAgo) continue;

    const parsed = parseDON(item.Title || '');
    if (!parsed) continue;

    const coords = CC[parsed.country];
    if (!coords) continue;

    // Deduplicate by disease + country (keep most recent which comes first)
    const key = `${parsed.disease.toLowerCase()}|${parsed.country.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const donId = item.DonId || item.UrlName || '';
    const url = donId
      ? `https://www.who.int/emergencies/disease-outbreak-news/item/${donId}`
      : 'https://www.who.int/emergencies/disease-outbreak-news';

    outbreaks.push({
      disease: parsed.disease,
      country: parsed.country,
      date: pubDate.toISOString(),
      summary: (item.Summary || '').slice(0, 300),
      url,
      lat: coords[0],
      lon: coords[1],
    });
  }

  // Slight offset for overlapping pins in same country
  const countryCount = new Map<string, number>();
  for (const o of outbreaks) {
    const c = countryCount.get(o.country) || 0;
    if (c > 0) {
      const angle = (c * 2 * Math.PI) / 6;
      const r = 1.5 * Math.ceil(c / 6);
      o.lat += r * Math.sin(angle);
      o.lon += r * Math.cos(angle);
    }
    countryCount.set(o.country, c + 1);
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recent = outbreaks.filter(o => new Date(o.date) >= oneYearAgo);

  return {
    outbreaks,
    stats: {
      totalRecentOutbreaks: recent.length,
      countriesAffected: new Set(recent.map(o => o.country)).size,
      diseasesTracked: new Set(recent.map(o => o.disease)).size,
    },
    fetchedAt: new Date().toISOString(),
  };
}

/* ─── Route handler ───────────────────────────────────────────────────────── */

export async function GET() {
  try {
    const cached = await getCached(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      });
    }

    const data = await fetchOutbreaks();
    setShortTerm(CACHE_KEY, data).catch(() => {});

    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err: any) {
    console.error('Disease outbreaks API error:', err);
    const stale = await getCached(CACHE_KEY).catch(() => null);
    if (stale) {
      return NextResponse.json(stale, {
        headers: { 'X-Cache': 'STALE', 'Cache-Control': 'public, s-maxage=60' },
      });
    }
    return NextResponse.json(
      { error: 'Failed to fetch outbreak data', message: err.message },
      { status: 500 },
    );
  }
}
