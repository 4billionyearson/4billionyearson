"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, useMap, useMapEvents } from 'react-leaflet';
import type { FeatureCollection, Feature } from 'geojson';
import type { Layer, PathOptions } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Country-name aliases: snapshot name → geojson name (lowercased match).
// The geojson uses Natural Earth short-form names (e.g. "Dem. Rep. Congo"),
// while our country snapshots use ISO-style long names. Keep this in sync
// with public/data/world-countries.json.
const NAME_ALIAS: Record<string, string> = {
  'united states': 'united states of america',
  'dr congo': 'dem. rep. congo',
  'south sudan': 's. sudan',
  'bosnia and herzegovina': 'bosnia and herz.',
  'central african republic': 'central african rep.',
  "cote d'ivoire": "côte d'ivoire",
  'dominican republic': 'dominican rep.',
  'equatorial guinea': 'eq. guinea',
  'solomon islands': 'solomon is.',
  'east timor': 'timor-leste',
  'western sahara': 'w. sahara',
  'eswatini': 'eswatini',
};

interface CountryAnomaly {
  iso3: string;
  name: string;
  anomaly: number;
  value: number;
  monthLabel: string;
  rank: number;
  total: number;
  // Optional windowed anomalies (populated by scripts/patch-country-anomalies.mjs)
  anomaly1m?: number | null;
  label1m?: string | null;
  anomaly3m?: number | null;
  label3m?: string | null;
  anomaly12m?: number | null;
  label12m?: string | null;
}

export type AnomalyWindow = '1m' | '3m' | '12m';
export type MapLevel = 'continents' | 'countries' | 'uk-countries' | 'uk-regions' | 'us-states' | 'us-regions';

// Country ISO3 → continent group key used in rankings.json groups.continents.
// Mirrors CONTINENT_BY_ISO in src/lib/climate/editorial.ts but kept inline
// to avoid pulling Node-only types into this client bundle.
const CONTINENT_GROUP_KEY: Record<string, string> = {
  // Europe
  GBR: 'europe', FRA: 'europe', DEU: 'europe', ITA: 'europe', ESP: 'europe',
  POL: 'europe', NLD: 'europe', BEL: 'europe', SWE: 'europe', NOR: 'europe',
  DNK: 'europe', FIN: 'europe', IRL: 'europe', PRT: 'europe', GRC: 'europe',
  AUT: 'europe', CHE: 'europe', UKR: 'europe', ROU: 'europe', HUN: 'europe',
  CZE: 'europe', CYP: 'europe', ISL: 'europe',
  // North America
  USA: 'northAmerica', CAN: 'northAmerica', MEX: 'northAmerica',
  CRI: 'northAmerica', NIC: 'northAmerica', JAM: 'northAmerica',
  // South America
  BRA: 'southAmerica', ARG: 'southAmerica', CHL: 'southAmerica',
  COL: 'southAmerica', PER: 'southAmerica', BOL: 'southAmerica',
  GUY: 'southAmerica', SUR: 'southAmerica',
  // Asia
  JPN: 'asia', KOR: 'asia', PRK: 'asia', IND: 'asia', CHN: 'asia',
  IDN: 'asia', MYS: 'asia', PHL: 'asia', THA: 'asia', VNM: 'asia',
  PAK: 'asia', BGD: 'asia', LKA: 'asia', MMR: 'asia', IRN: 'asia',
  IRQ: 'asia', ISR: 'asia', LBN: 'asia', PSE: 'asia', SAU: 'asia',
  ARE: 'asia', SYR: 'asia', TUR: 'asia', SGP: 'asia',
  // Africa
  EGY: 'africa', NGA: 'africa', KEN: 'africa', ETH: 'africa', GHA: 'africa',
  UGA: 'africa', TZA: 'africa', MAR: 'africa', DZA: 'africa', ZAF: 'africa',
  MWI: 'africa', SOM: 'africa', COG: 'africa', COD: 'africa', SSD: 'africa',
  // Oceania
  AUS: 'oceania', NZL: 'oceania',
};

// Geojson country name (lowercase) → continent group key. Covers every name
// in public/data/world-countries.json so that, in 'continents' mode, every
// country polygon resolves to a continent (not just the ones we have a
// monthly snapshot for). Greenland is intentionally absent — NOAA does not
// publish a continent-aggregated value that includes it.
const NAME_TO_CONTINENT: Record<string, string> = {
  // Africa
  algeria: 'africa', angola: 'africa', benin: 'africa', botswana: 'africa',
  'burkina faso': 'africa', burundi: 'africa', cameroon: 'africa',
  'central african rep.': 'africa', chad: 'africa', congo: 'africa',
  "côte d'ivoire": 'africa', 'dem. rep. congo': 'africa', djibouti: 'africa',
  egypt: 'africa', 'eq. guinea': 'africa', eritrea: 'africa',
  eswatini: 'africa', ethiopia: 'africa', gabon: 'africa', gambia: 'africa',
  ghana: 'africa', guinea: 'africa', 'guinea-bissau': 'africa',
  kenya: 'africa', lesotho: 'africa', liberia: 'africa', libya: 'africa',
  madagascar: 'africa', malawi: 'africa', mali: 'africa',
  mauritania: 'africa', morocco: 'africa', mozambique: 'africa',
  namibia: 'africa', niger: 'africa', nigeria: 'africa', rwanda: 'africa',
  's. sudan': 'africa', senegal: 'africa', 'sierra leone': 'africa',
  somalia: 'africa', somaliland: 'africa', 'south africa': 'africa',
  sudan: 'africa', tanzania: 'africa', togo: 'africa', tunisia: 'africa',
  uganda: 'africa', 'w. sahara': 'africa', zambia: 'africa',
  zimbabwe: 'africa',
  // Asia
  afghanistan: 'asia', armenia: 'asia', azerbaijan: 'asia',
  bangladesh: 'asia', bhutan: 'asia', brunei: 'asia', cambodia: 'asia',
  china: 'asia', cyprus: 'asia', georgia: 'asia', india: 'asia',
  indonesia: 'asia', iran: 'asia', iraq: 'asia', israel: 'asia',
  japan: 'asia', jordan: 'asia', kazakhstan: 'asia', kuwait: 'asia',
  kyrgyzstan: 'asia', laos: 'asia', lebanon: 'asia', malaysia: 'asia',
  mongolia: 'asia', myanmar: 'asia', 'n. cyprus': 'asia', nepal: 'asia',
  'north korea': 'asia', oman: 'asia', pakistan: 'asia', palestine: 'asia',
  philippines: 'asia', qatar: 'asia', 'saudi arabia': 'asia',
  'south korea': 'asia', 'sri lanka': 'asia', syria: 'asia', taiwan: 'asia',
  tajikistan: 'asia', thailand: 'asia', 'timor-leste': 'asia',
  turkey: 'asia', turkmenistan: 'asia',
  'united arab emirates': 'asia', uzbekistan: 'asia', vietnam: 'asia',
  yemen: 'asia',
  // Europe (Russia counted with Europe per NOAA convention)
  albania: 'europe', austria: 'europe', belarus: 'europe', belgium: 'europe',
  'bosnia and herz.': 'europe', bulgaria: 'europe', croatia: 'europe',
  czechia: 'europe', denmark: 'europe', estonia: 'europe', finland: 'europe',
  france: 'europe', germany: 'europe', greece: 'europe', hungary: 'europe',
  iceland: 'europe', ireland: 'europe', italy: 'europe', kosovo: 'europe',
  latvia: 'europe', lithuania: 'europe', luxembourg: 'europe',
  moldova: 'europe', montenegro: 'europe', netherlands: 'europe', 'north macedonia': 'europe',
  norway: 'europe', poland: 'europe', portugal: 'europe', romania: 'europe',
  russia: 'europe', serbia: 'europe', slovakia: 'europe', slovenia: 'europe',
  spain: 'europe', sweden: 'europe', switzerland: 'europe', ukraine: 'europe',
  'united kingdom': 'europe',
  // North America
  bahamas: 'northAmerica', belize: 'northAmerica', canada: 'northAmerica',
  'costa rica': 'northAmerica', cuba: 'northAmerica',
  'dominican rep.': 'northAmerica', 'el salvador': 'northAmerica',
  guatemala: 'northAmerica', haiti: 'northAmerica', honduras: 'northAmerica',
  jamaica: 'northAmerica', mexico: 'northAmerica',
  nicaragua: 'northAmerica', panama: 'northAmerica',
  'puerto rico': 'northAmerica',
  'trinidad and tobago': 'northAmerica',
  'united states of america': 'northAmerica',
  // South America
  argentina: 'southAmerica', bolivia: 'southAmerica', brazil: 'southAmerica',
  chile: 'southAmerica', colombia: 'southAmerica', ecuador: 'southAmerica',
  'falkland is.': 'southAmerica', 'french guiana': 'southAmerica', guyana: 'southAmerica',
  paraguay: 'southAmerica', peru: 'southAmerica', suriname: 'southAmerica',
  uruguay: 'southAmerica', venezuela: 'southAmerica',
  // Oceania
  australia: 'oceania', fiji: 'oceania', 'new caledonia': 'oceania',
  'new zealand': 'oceania', 'papua new guinea': 'oceania',
  'solomon is.': 'oceania', vanuatu: 'oceania',
};

// US state name (lowercase) → NOAA US climate region group slug. Used when
// the map level is 'us-regions' so the state overlay shows region-level anomaly.
const US_STATE_NAME_TO_REGION_SLUG: Record<string, string> = {
  // Northeast
  connecticut: 'us-northeast', delaware: 'us-northeast', maine: 'us-northeast',
  maryland: 'us-northeast', massachusetts: 'us-northeast', 'new hampshire': 'us-northeast',
  'new jersey': 'us-northeast', 'new york': 'us-northeast', pennsylvania: 'us-northeast',
  'rhode island': 'us-northeast', vermont: 'us-northeast',
  // Upper Midwest
  iowa: 'us-upper-midwest', michigan: 'us-upper-midwest',
  minnesota: 'us-upper-midwest', wisconsin: 'us-upper-midwest',
  // Ohio Valley
  illinois: 'us-ohio-valley', indiana: 'us-ohio-valley', kentucky: 'us-ohio-valley',
  missouri: 'us-ohio-valley', ohio: 'us-ohio-valley', tennessee: 'us-ohio-valley',
  'west virginia': 'us-ohio-valley',
  // Southeast
  alabama: 'us-southeast', florida: 'us-southeast', georgia: 'us-southeast',
  'north carolina': 'us-southeast', 'south carolina': 'us-southeast', virginia: 'us-southeast',
  // Northern Rockies and Plains
  montana: 'us-northern-rockies-plains', nebraska: 'us-northern-rockies-plains',
  'north dakota': 'us-northern-rockies-plains', 'south dakota': 'us-northern-rockies-plains',
  wyoming: 'us-northern-rockies-plains',
  // South
  arkansas: 'us-south', kansas: 'us-south', louisiana: 'us-south',
  mississippi: 'us-south', oklahoma: 'us-south', texas: 'us-south',
  // Southwest
  arizona: 'us-southwest', colorado: 'us-southwest',
  'new mexico': 'us-southwest', utah: 'us-southwest',
  // Northwest
  idaho: 'us-northwest', oregon: 'us-northwest', washington: 'us-northwest',
  // West
  california: 'us-west', nevada: 'us-west',
};

interface GroupRow {
  slug: string;
  key: string;
  label: string;
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
}

// Antimeridian fix (reused from emissions-choropleth-map).
// Without this, Russia / Fiji / Antarctica render a giant horizontal
// strip across the equirectangular projection because the ring wraps
// from +170°E to −170°W.
function fixAntimeridian(geo: FeatureCollection): FeatureCollection {
  const targets = new Set(['Russia', 'Fiji', 'Antarctica']);
  return {
    ...geo,
    features: geo.features.map((f) => {
      if (!targets.has((f.properties as any)?.name)) return f;
      if (f.geometry.type === 'MultiPolygon') {
        const fixed: number[][][][] = [];
        for (const polygon of (f.geometry as any).coordinates as number[][][][]) {
          for (const ring of polygon) {
            const hasHigh = ring.some((c) => c[0] > 170);
            const hasLow = ring.some((c) => c[0] < -170);
            if (hasHigh && hasLow) {
              fixed.push([ring.map((c) => (c[0] < 0 ? [c[0] + 360, c[1]] : [...c]))]);
              fixed.push([ring.map((c) => (c[0] > 0 ? [c[0] - 360, c[1]] : [...c]))]);
            } else {
              fixed.push([ring]);
            }
          }
        }
        return { ...f, geometry: { type: 'MultiPolygon', coordinates: fixed } };
      }
      return f;
    }),
  };
}

// Color ramp: anomaly (°C) → hex. Blue below 0, orange/red above.
function anomalyColor(anom: number | null | undefined): string {
  if (anom == null || !Number.isFinite(anom)) return '#1f2937';
  const v = Math.max(-5, Math.min(5, anom));
  if (v >= 0) {
    if (v < 1) return lerp('#fef3c7', '#fde68a', v);
    if (v < 2) return lerp('#fde68a', '#fb923c', v - 1);
    if (v < 3) return lerp('#fb923c', '#ea580c', v - 2);
    if (v < 4) return lerp('#ea580c', '#b91c1c', v - 3);
    return lerp('#b91c1c', '#7f1d1d', v - 4);
  } else {
    const a = -v;
    if (a < 1) return lerp('#e0f2fe', '#bae6fd', a);
    if (a < 2) return lerp('#bae6fd', '#60a5fa', a - 1);
    if (a < 3) return lerp('#60a5fa', '#2563eb', a - 2);
    return lerp('#2563eb', '#1e3a8a', Math.min(1, a - 3));
  }
}

function lerp(a: string, b: string, t: number): string {
  const ta = Math.max(0, Math.min(1, t));
  const ah = a.replace('#', '');
  const bh = b.replace('#', '');
  const ar = parseInt(ah.slice(0, 2), 16), ag = parseInt(ah.slice(2, 4), 16), ab = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16), bg = parseInt(bh.slice(2, 4), 16), bb = parseInt(bh.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * ta);
  const g = Math.round(ag + (bg - ag) * ta);
  const b2 = Math.round(ab + (bb - ab) * ta);
  return `rgb(${r},${g},${b2})`;
}

function normalizeName(s: string): string {
  const lower = s.trim().toLowerCase();
  return NAME_ALIAS[lower] ?? lower;
}

function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// Bounds presets for the level toggle so e.g. selecting "US states" zooms
// the map into the contiguous US instead of leaving the user on the world view.
const LEVEL_BOUNDS: Partial<Record<string, [[number, number], [number, number]]>> = {
  'us-states': [[24.5, -125], [49.5, -66.5]],
  'us-regions': [[24.5, -125], [49.5, -66.5]],
  'uk-countries': [[49.7, -8.7], [60.9, 1.9]],
  'uk-regions': [[49.7, -8.7], [60.9, 1.9]],
};

function ZoomToLevel({ level }: { level: MapLevel }) {
  const map = useMap();
  // Track whether this is the first run so we don't fight the initial center/zoom.
  const firstRef = React.useRef(true);
  useEffect(() => {
    if (firstRef.current) { firstRef.current = false; return; }
    const b = LEVEL_BOUNDS[level];
    if (b) {
      map.flyToBounds(b, { duration: 0.6, padding: [20, 20] });
    } else {
      // continents / countries: return to a world view
      map.flyTo([20, 0], 2, { duration: 0.6 });
    }
  }, [level, map]);
  return null;
}

/* ─── Zoom-aware labels (continent → country → US state) ─────────────── */

const LABEL_OVERRIDES: Record<string, [number, number]> = {
  'United States of America': [40, -98],
  'Canada': [56, -96],
  'Russia': [62, 95],
  'France': [47, 2.5],
  'Norway': [65, 13],
  'Indonesia': [-2, 118],
  'Malaysia': [4, 109],
  'Chile': [-35, -71],
  'New Zealand': [-42, 174],
  'Japan': [36, 138],
  'Antarctica': [-82, 0],
};

const CONTINENT_LABELS: { name: string; pos: [number, number] }[] = [
  { name: 'North America', pos: [45, -100] },
  { name: 'South America', pos: [-15, -58] },
  { name: 'Europe', pos: [52, 15] },
  { name: 'Africa', pos: [5, 20] },
  { name: 'Asia', pos: [42, 85] },
  { name: 'Oceania', pos: [-25, 135] },
];

const MAJOR_COUNTRIES = new Set([
  'United States of America', 'Canada', 'Mexico', 'Brazil', 'Argentina',
  'Colombia', 'Peru', 'Chile', 'Venezuela',
  'Russia', 'China', 'India', 'Japan', 'Australia',
  'Indonesia', 'Saudi Arabia', 'Iran', 'Kazakhstan',
  'United Kingdom', 'France', 'Germany', 'Spain', 'Italy',
  'Turkey', 'Ukraine', 'Poland', 'Sweden', 'Norway', 'Finland',
  'Egypt', 'South Africa', 'Nigeria', 'Algeria', 'Libya',
  'Dem. Rep. Congo', 'Sudan', 'Ethiopia', 'Tanzania', 'Kenya',
  'Mongolia', 'Pakistan', 'Afghanistan', 'Thailand', 'Myanmar',
  'Greenland', 'Iceland', 'New Zealand',
]);

const DISPLAY_NAME: Record<string, string> = {
  'United States of America': 'United States',
  'Dem. Rep. Congo': 'DR Congo',
  'Dominican Rep.': 'Dominican Republic',
  'Central African Rep.': 'Central African Republic',
  'S. Sudan': 'South Sudan',
  'Bosnia and Herz.': 'Bosnia & Herz.',
  'Czech Rep.': 'Czechia',
  'W. Sahara': 'Western Sahara',
  'Eq. Guinea': 'Equatorial Guinea',
  'Solomon Is.': 'Solomon Is.',
};

function ringArea(ring: number[][]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return a / 2;
}
function ringCentroid(ring: number[][]): [number, number] {
  let x = 0, y = 0;
  for (const c of ring) { x += c[0]; y += c[1]; }
  return [y / ring.length, x / ring.length];
}
function featureCentroid(feature: Feature): [number, number] | null {
  const g: any = feature.geometry;
  if (!g) return null;
  if (g.type === 'Polygon') return ringCentroid(g.coordinates[0]);
  if (g.type === 'MultiPolygon') {
    let best: number[][] = [];
    let bestArea = 0;
    for (const poly of g.coordinates as number[][][][]) {
      const ring = poly[0];
      const a = Math.abs(ringArea(ring));
      if (a > bestArea) { bestArea = a; best = ring; }
    }
    return best.length ? ringCentroid(best) : null;
  }
  return null;
}

const US_STATE_LABEL_ZOOM = 4;
const UK_NATION_LABEL_ZOOM = 4;

// Approximate centroids for the 9 NOAA US climate regions, used as map labels
// when level === 'us-regions' so the choropleth reads as 9 regions, not 49 states.
const US_REGION_LABELS: { name: string; pos: [number, number] }[] = [
  { name: 'Northeast', pos: [42.5, -73.5] },
  { name: 'Upper Midwest', pos: [44.5, -91.0] },
  { name: 'Ohio Valley', pos: [38.5, -86.5] },
  { name: 'Southeast', pos: [33.0, -82.0] },
  { name: 'Northern Rockies and Plains', pos: [44.5, -103.0] },
  { name: 'South', pos: [33.5, -97.5] },
  { name: 'Southwest', pos: [36.5, -109.5] },
  { name: 'Northwest', pos: [45.0, -118.0] },
  { name: 'West', pos: [37.5, -118.5] },
];

function MapLabels({
  countriesGeo,
  statesGeo,
  ukGeo,
  level,
}: {
  countriesGeo: FeatureCollection | null;
  statesGeo: FeatureCollection | null;
  ukGeo: FeatureCollection | null;
  level: MapLevel;
}) {
  const map = useMap();
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  useEffect(() => {
    if (!map.getPane('labels')) {
      const pane = map.createPane('labels');
      pane.style.zIndex = '450';
      pane.style.pointerEvents = 'none';
    }
    const tooltipPane = map.getPane('tooltipPane');
    if (tooltipPane) tooltipPane.style.zIndex = '700';
    setReady(true);
  }, [map]);

  const countryLabels = useMemo(() => {
    if (!countriesGeo) return [] as { name: string; pos: [number, number] }[];
    const result: { name: string; pos: [number, number] }[] = [];
    for (const f of countriesGeo.features) {
      const name = (f.properties as any)?.name as string | undefined;
      if (!name) continue;
      // Skip UK at high zoom - sub-nation labels take over
      const pos = LABEL_OVERRIDES[name] ?? featureCentroid(f);
      if (pos) result.push({ name, pos });
    }
    return result;
  }, [countriesGeo]);

  const stateLabels = useMemo(() => {
    if (!statesGeo) return [] as { name: string; pos: [number, number] }[];
    const result: { name: string; pos: [number, number] }[] = [];
    for (const f of statesGeo.features) {
      const name = (f.properties as any)?.name as string | undefined;
      if (!name) continue;
      const pos = featureCentroid(f);
      if (pos) result.push({ name, pos });
    }
    return result;
  }, [statesGeo]);

  const ukLabels = useMemo(() => {
    if (!ukGeo) return [] as { name: string; pos: [number, number] }[];
    // Some sub-regions (e.g. Midlands = E. Midlands + W. Midlands) consist of
    // multiple ITL1 polygons sharing the same slug. Dedupe by slug so we don't
    // print "Midlands" twice; pick the centroid of the first part.
    const seen = new Set<string>();
    const result: { name: string; pos: [number, number] }[] = [];
    for (const f of ukGeo.features) {
      const props = f.properties as any;
      const name = props?.name as string | undefined;
      const slug = (props?.slug as string | undefined) ?? name;
      if (!name || !slug || seen.has(slug)) continue;
      const pos = featureCentroid(f);
      if (pos) {
        seen.add(slug);
        result.push({ name, pos });
      }
    }
    return result;
  }, [ukGeo]);

  if (!ready) return null;

  // Continents mode: only continent labels at every zoom; no country / state / UK labels.
  if (level === 'continents') {
    const fz = zoom <= 2 ? 13 : zoom <= 3 ? 14 : 15;
    return (
      <>
        {CONTINENT_LABELS.map(({ name, pos }) => (
          <Marker
            key={`cont-${name}`}
            position={pos}
            pane="labels"
            interactive={false}
            icon={L.divIcon({
              className: 'continent-label',
              html: `<span style="font-size:${fz}px">${name}</span>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
          />
        ))}
      </>
    );
  }

  const visibleCountries =
    zoom <= 2
      ? CONTINENT_LABELS
      : zoom <= 3
        ? countryLabels.filter(({ name }) => MAJOR_COUNTRIES.has(name))
        : level === 'uk-regions' || level === 'uk-countries'
          ? countryLabels.filter(({ name }) => name !== 'United Kingdom')
          : countryLabels;

  const fontSize = zoom <= 2 ? 13 : 10;
  const cls = zoom <= 2 ? 'continent-label' : 'country-label';

  // Whether to draw the per-state labels for the US. Suppressed in 'countries'
  // mode (we don't want state labels on the world view) and in 'us-regions'
  // mode (we draw 9-region labels instead).
  const showStateLabels = level === 'us-states';
  const showUkLabels = level === 'uk-regions' || level === 'uk-countries';
  const showRegionLabels = level === 'us-regions';

  // In sub-national modes (uk-regions, us-states, us-regions) hide the
  // country-name labels for OTHER countries — the user is focused on the
  // active overlay so e.g. "Denmark" / "France" should not clutter the UK view.
  const hideCountryLabels = level === 'uk-regions' || level === 'uk-countries' || level === 'us-states' || level === 'us-regions';

  return (
    <>
      {!hideCountryLabels && visibleCountries.map(({ name, pos }) => (
        <Marker
          key={`c-${name}`}
          position={pos}
          pane="labels"
          interactive={false}
          icon={L.divIcon({
            className: cls,
            html: `<span style="font-size:${fontSize}px">${DISPLAY_NAME[name] ?? name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
      {showStateLabels && zoom >= US_STATE_LABEL_ZOOM && stateLabels.map(({ name, pos }) => (
        <Marker
          key={`s-${name}`}
          position={pos}
          pane="labels"
          interactive={false}
          icon={L.divIcon({
            className: 'country-label',
            html: `<span style="font-size:9px;opacity:0.9">${name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
      {showRegionLabels && US_REGION_LABELS.map(({ name, pos }) => (
        <Marker
          key={`reg-${name}`}
          position={pos}
          pane="labels"
          interactive={false}
          icon={L.divIcon({
            className: 'country-label',
            html: `<span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em">${name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
      {showUkLabels && zoom >= UK_NATION_LABEL_ZOOM && ukLabels.map(({ name, pos }) => (
        <Marker
          key={`uk-${name}`}
          position={pos}
          pane="labels"
          interactive={false}
          icon={L.divIcon({
            className: 'country-label',
            html: `<span style="font-size:9px;opacity:0.9">${name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
    </>
  );
}

/* ─── Sub-national overlays (US states + UK nations) ─────────────────────── */

const US_STATES_ZOOM = 4;
const UK_NATIONS_ZOOM = 4;
const UK_NATION_SLUGS = new Set(['england', 'scotland', 'wales', 'northern-ireland']);
// Met Office sub-region slugs that have polygons in /data/uk-regions.json.
const UK_REGION_SLUGS = new Set([
  'east-anglia',
  'england-east-and-north-east',
  'england-nw-and-north-wales',
  'england-se-central-south',
  'england-sw-and-south-wales',
  'midlands',
  'northern-ireland',
  'scotland-north',
  'scotland-east',
  'scotland-west',
]);

interface RankingRow {
  slug: string;
  name: string;
  type: 'country' | 'us-state' | 'uk-region';
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
}

function rankingValue(row: RankingRow | undefined, win: AnomalyWindow): number | null {
  if (!row) return null;
  if (win === '3m') return row.anomaly3m;
  if (win === '12m') return row.anomaly12m;
  return row.anomaly1m;
}

// UK-nation slugs - kept for potential future re-introduction of the overlay.
// Currently unused; the map renders UK as a single country polygon.
// const UK_NATION_SLUGS = new Set(['england', 'scotland', 'wales', 'northern-ireland']);

function UKNationsOverlay({
  rankings,
  windowSel,
  onInfo,
  ukGeo,
  level,
}: {
  rankings: RankingRow[] | null;
  windowSel: AnomalyWindow;
  onInfo: (info: { name: string; anomaly: number | null; label: string | null; color: string } | null) => void;
  ukGeo: FeatureCollection | null;
  level: MapLevel;
}) {
  const map = useMap();
  const forced = level === 'uk-regions' || level === 'uk-countries';
  const allowed = forced;
  const [visible, setVisible] = useState(forced || (allowed && map.getZoom() >= UK_NATIONS_ZOOM));

  useMapEvents({ zoomend: () => setVisible(forced || (allowed && map.getZoom() >= UK_NATIONS_ZOOM)) });

  useEffect(() => {
    setVisible(forced || (allowed && map.getZoom() >= UK_NATIONS_ZOOM));
  }, [forced, allowed, map]);

  const bySlug = useMemo(() => {
    const m = new Map<string, RankingRow>();
    if (rankings) {
      const slugSet = level === 'uk-regions' ? UK_REGION_SLUGS : UK_NATION_SLUGS;
      for (const r of rankings) {
        if (r.type === 'uk-region' && slugSet.has(r.slug)) m.set(r.slug, r);
      }
    }
    return m;
  }, [rankings, level]);

  const style = useCallback(
    (feature: Feature | undefined): PathOptions => {
      const slug = ((feature?.properties as any)?.slug as string) ?? '';
      const row = bySlug.get(slug);
      const v = rankingValue(row, windowSel);
      return {
        fillColor: v != null ? anomalyColor(v) : '#2d3748',
        fillOpacity: v != null ? 0.9 : 0.45,
        weight: 1.2,
        color: '#374151',
      };
    },
    [bySlug, windowSel],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const slug = ((feature.properties as any)?.slug as string) ?? '';
      const name = ((feature.properties as any)?.name as string) ?? slug;
      const row = bySlug.get(slug);
      const v = rankingValue(row, windowSel);
      const color = v != null ? anomalyColor(v) : '#1f2937';
      const show = () => onInfo({ name, anomaly: v, label: row?.latestLabel ?? null, color });
      layer.on('mouseover', show);
      layer.on('click', show);
      layer.on('mouseout', () => onInfo(null));
    },
    [bySlug, windowSel, onInfo],
  );

  if (!visible || !ukGeo) return null;
  return (
    <GeoJSON
      key={`uk-overlay-${level}-${windowSel}-${bySlug.size}`}
      data={ukGeo}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

function USStatesOverlay({
  rankings,
  windowSel,
  onInfo,
  statesGeo,
  level,
  usRegionGroups,
}: {
  rankings: RankingRow[] | null;
  windowSel: AnomalyWindow;
  onInfo: (info: { name: string; anomaly: number | null; label: string | null; color: string } | null) => void;
  statesGeo: FeatureCollection | null;
  level: MapLevel;
  usRegionGroups: GroupRow[] | null;
}) {
  const map = useMap();
  // In us-states / us-regions mode the overlay is forced visible at any zoom
  // so the choropleth is the main story rather than a zoom-only enhancement.
  // In continents / countries / uk-regions mode the overlay is hidden at all
  // zooms so the user only ever sees the polygons that match the active level.
  const forced = level === 'us-states' || level === 'us-regions';
  const allowed = forced;
  const [visible, setVisible] = useState(forced || (allowed && map.getZoom() >= US_STATES_ZOOM));

  useMapEvents({ zoomend: () => setVisible(forced || (allowed && map.getZoom() >= US_STATES_ZOOM)) });

  useEffect(() => {
    setVisible(forced || (allowed && map.getZoom() >= US_STATES_ZOOM));
  }, [forced, allowed, map]);

  const byName = useMemo(() => {
    const m = new Map<string, RankingRow>();
    if (rankings) {
      for (const r of rankings) {
        if (r.type === 'us-state') m.set(r.name.toLowerCase(), r);
      }
    }
    return m;
  }, [rankings]);

  const regionBySlug = useMemo(() => {
    const m = new Map<string, GroupRow>();
    if (usRegionGroups) for (const g of usRegionGroups) m.set(g.slug, g);
    return m;
  }, [usRegionGroups]);

  const resolve = useCallback((featureName: string): { anomaly: number | null; label: string | null; displayName: string } => {
    if (level === 'us-regions') {
      const slug = US_STATE_NAME_TO_REGION_SLUG[featureName.toLowerCase()];
      const g = slug ? regionBySlug.get(slug) : undefined;
      if (!g) return { anomaly: null, label: null, displayName: featureName };
      const anomaly = windowSel === '3m' ? g.anomaly3m : windowSel === '12m' ? g.anomaly12m : g.anomaly1m;
      return { anomaly, label: g.latestLabel, displayName: `${g.label} (US climate region)` };
    }
    const row = byName.get(featureName.toLowerCase());
    return { anomaly: rankingValue(row, windowSel), label: row?.latestLabel ?? null, displayName: featureName };
  }, [level, windowSel, byName, regionBySlug]);

  const style = useCallback(
    (feature: Feature | undefined): PathOptions => {
      const name = ((feature?.properties as any)?.name as string) ?? '';
      const { anomaly } = resolve(name);
      return {
        fillColor: anomaly != null ? anomalyColor(anomaly) : '#1f2937',
        fillOpacity: 0.9,
        weight: 0.6,
        color: '#0b1220',
      };
    },
    [resolve],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const name = ((feature.properties as any)?.name as string) ?? '';
      const { anomaly, label, displayName } = resolve(name);
      const color = anomaly != null ? anomalyColor(anomaly) : '#1f2937';
      const show = () => onInfo({ name: displayName, anomaly, label, color });
      layer.on('mouseover', show);
      layer.on('click', show);
      layer.on('mouseout', () => onInfo(null));
    },
    [resolve, onInfo],
  );

  if (!visible || !statesGeo) return null;
  return (
    <GeoJSON
      key={`us-states-${level}-${windowSel}-${byName.size}-${regionBySlug.size}`}
      data={statesGeo}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

// UKRegionsOverlay removed - the map now shows UK as a single country polygon to
// avoid mismatched sub-polygon coverage. Re-introduce from git history if needed.

export default function GlobalAnomalyMap({ countryAnomalies, window: windowSel = '1m', level = 'countries' }: { countryAnomalies: CountryAnomaly[]; window?: AnomalyWindow; level?: MapLevel }) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [statesGeo, setStatesGeo] = useState<FeatureCollection | null>(null);
  const [ukNationsGeo, setUkNationsGeo] = useState<FeatureCollection | null>(null);
  const [ukRegionsGeo, setUkRegionsGeo] = useState<FeatureCollection | null>(null);
  const ukGeo = level === 'uk-regions' ? ukRegionsGeo : ukNationsGeo;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rankings, setRankings] = useState<RankingRow[] | null>(null);
  const [continentGroups, setContinentGroups] = useState<GroupRow[] | null>(null);
  const [usRegionGroups, setUsRegionGroups] = useState<GroupRow[] | null>(null);
  const [selected, setSelected] = useState<{
    name: string;
    anomaly: number | null;
    monthLabel?: string;
    value?: number;
    rank?: number;
    total?: number;
    color: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/world-countries.json')
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setGeo(fixAntimeridian(j)); })
      .catch((e) => { if (!cancelled) setLoadError(String(e?.message ?? e)); });
    fetch('/data/us-states.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => { if (!cancelled && g) setStatesGeo(g as FeatureCollection); })
      .catch(() => {});
    fetch('/data/uk-nations.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => { if (!cancelled && g) setUkNationsGeo(g as FeatureCollection); })
      .catch(() => {});
    fetch('/data/uk-regions.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => { if (!cancelled && g) setUkRegionsGeo(g as FeatureCollection); })
      .catch(() => {});
    fetch('/data/climate/rankings.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        if (d.rows) setRankings(d.rows as RankingRow[]);
        if (d.groups?.continents) setContinentGroups(d.groups.continents as GroupRow[]);
        if (d.groups?.usClimateRegions) setUsRegionGroups(d.groups.usClimateRegions as GroupRow[]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Build lookup: normalized geojson name → anomaly record
  const lookup = useMemo(() => {
    const map = new Map<string, CountryAnomaly>();
    for (const c of countryAnomalies) {
      map.set(normalizeName(c.name), c);
    }
    return map;
  }, [countryAnomalies]);

  // Resolve the anomaly/label for the chosen window. Falls back to the
  // legacy 1-month fields so this component still works against older
  // snapshots that don't yet have 3m/12m data.
  const continentByKey = useMemo(() => {
    const m = new Map<string, GroupRow>();
    if (continentGroups) for (const g of continentGroups) m.set(g.key, g);
    return m;
  }, [continentGroups]);

  const groupValue = useCallback((g: GroupRow | undefined): { anomaly: number | null; label: string | null } => {
    if (!g) return { anomaly: null, label: null };
    if (windowSel === '3m') return { anomaly: g.anomaly3m, label: g.latestLabel };
    if (windowSel === '12m') return { anomaly: g.anomaly12m, label: g.latestLabel };
    return { anomaly: g.anomaly1m, label: g.latestLabel };
  }, [windowSel]);

  const pick = useCallback((c: CountryAnomaly | undefined, name?: string): { anomaly: number | null; label: string | null } => {
    // In sub-national levels we don't tint country polygons - the overlay
    // (US states or UK nations) carries the data instead.
    if (level === 'us-states' || level === 'us-regions' || level === 'uk-regions' || level === 'uk-countries') {
      return { anomaly: null, label: null };
    }
    if (level === 'continents') {
      // Resolve continent by GEOJSON NAME so every polygon (incl. countries
      // we don't have a snapshot for, e.g. Russia, small African states) gets
      // its continent's anomaly rather than falling back to "no data".
      const byName = name ? NAME_TO_CONTINENT[name.toLowerCase()] : undefined;
      const byIso = c ? CONTINENT_GROUP_KEY[c.iso3] : undefined;
      const groupKey = byName ?? byIso;
      if (!groupKey) return { anomaly: null, label: null };
      return groupValue(continentByKey.get(groupKey));
    }
    if (!c) return { anomaly: null, label: null };
    if (windowSel === '3m') return { anomaly: c.anomaly3m ?? null, label: c.label3m ?? null };
    if (windowSel === '12m') return { anomaly: c.anomaly12m ?? null, label: c.label12m ?? null };
    return { anomaly: c.anomaly1m ?? c.anomaly ?? null, label: c.label1m ?? c.monthLabel ?? null };
  }, [windowSel, level, continentByKey, groupValue]);

  const style = useCallback((feature: Feature | undefined): PathOptions => {
    if (!feature) return { fillColor: '#1f2937', fillOpacity: 0.8, weight: 0.4, color: '#0b1220' };
    const name = ((feature.properties as any)?.name as string) ?? '';
    const rec = lookup.get(name.toLowerCase());
    const { anomaly } = pick(rec, name);
    return {
      fillColor: anomaly != null ? anomalyColor(anomaly) : '#1f2937',
      fillOpacity: 0.85,
      weight: 0.4,
      color: '#0b1220',
    };
  }, [lookup, pick]);

  const onEachFeature = useCallback((feature: Feature, layer: Layer) => {
    const name = ((feature.properties as any)?.name as string) ?? '';
    // In sub-national levels the country polygons are just a backdrop -
    // suppress all hover/click interactions so users don't get a "no data"
    // tooltip on, e.g. Denmark while looking at UK regions.
    if (level === 'us-states' || level === 'us-regions' || level === 'uk-regions') {
      return;
    }
    const rec = lookup.get(name.toLowerCase());
    const { anomaly, label } = pick(rec, name);
    const color = anomaly != null ? anomalyColor(anomaly) : '#1f2937';
    // In continents mode the displayed name is the continent, not the country.
    let displayName = name;
    if (level === 'continents') {
      const groupKey = NAME_TO_CONTINENT[name.toLowerCase()] ?? (rec ? CONTINENT_GROUP_KEY[rec.iso3] : undefined);
      const group = groupKey ? continentByKey.get(groupKey) : undefined;
      if (group) displayName = `${group.label} (continent)`;
    }
    const show = () => setSelected({
      name: displayName,
      anomaly,
      monthLabel: label ?? undefined,
      value: level === 'countries' ? rec?.value : undefined,
      rank: level === 'countries' ? rec?.rank : undefined,
      total: level === 'countries' ? rec?.total : undefined,
      color,
    });
    layer.on('mouseover', show);
    layer.on('click', show);
    layer.on('mouseout', () => setSelected(null));
  }, [lookup, pick, level, continentByKey]);

  const headlineLabel = pick(countryAnomalies[0]).label ?? '';
  const windowPhrase = windowSel === '12m' ? '12-month rolling' : windowSel === '3m' ? '3-month rolling' : 'monthly';

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-200">
        Map could not load: {loadError}
      </div>
    );
  }
  if (!geo) {
    return (
      <div className="h-[320px] md:h-[500px] w-full rounded-xl bg-gray-900/40 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#D0A65E] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="relative rounded-xl overflow-hidden border border-gray-800">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          maxZoom={8}
          scrollWheelZoom
          maxBounds={[[-85, -180], [85, 180]]}
          maxBoundsViscosity={1.0}
          worldCopyJump
          className="h-[320px] md:h-[500px] w-full z-0"
          style={{ background: '#0b1220' }}
        >
          <InvalidateOnMount />
          <ZoomToLevel level={level} />
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            opacity={0.55}
          />
          <GeoJSON
            key={`anomaly-${level}-${windowSel}-${lookup.size}-${continentByKey.size}`}
            data={geo}
            style={style}
            onEachFeature={onEachFeature}
          />
          <USStatesOverlay
            rankings={rankings}
            windowSel={windowSel}
            statesGeo={statesGeo}
            level={level}
            usRegionGroups={usRegionGroups}
            onInfo={(info) =>
              setSelected(
                info
                  ? { name: info.name, anomaly: info.anomaly, monthLabel: info.label ?? undefined, color: info.color }
                  : null,
              )
            }
          />
          <UKNationsOverlay
            rankings={rankings}
            windowSel={windowSel}
            ukGeo={ukGeo}
            level={level}
            onInfo={(info) =>
              setSelected(
                info
                  ? { name: info.name, anomaly: info.anomaly, monthLabel: info.label ?? undefined, color: info.color }
                  : null,
              )
            }
          />
          <MapLabels countriesGeo={geo} statesGeo={statesGeo} ukGeo={ukGeo} level={level} />
          {/* UK nations overlay disabled - map is country-level; UK renders as a single polygon
              from world-countries.json to avoid mismatched sub-polygon coverage. */}
        </MapContainer>

        {selected && (
          <div className="absolute bottom-0 left-0 right-0 z-[1001] bg-gray-950/95 backdrop-blur-sm border-t border-gray-700/60 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm pointer-events-none">
            <span className="font-bold text-gray-100">{selected.name}</span>
            {selected.anomaly != null ? (
              <>
                <span className="font-mono font-semibold" style={{ color: selected.color }}>
                  {selected.anomaly > 0 ? '+' : ''}{selected.anomaly.toFixed(2)}°C vs 1961–1990
                </span>
                <span className="text-gray-300">
                  {selected.value != null ? `${selected.value.toFixed(2)}°C absolute` : ''}
                  {selected.monthLabel ? ` · ${selected.monthLabel}` : ''}
                </span>
                {selected.rank && selected.total ? (
                  <span className="text-gray-300">Rank {selected.rank} of {selected.total}</span>
                ) : null}
              </>
            ) : (
              <span className="text-gray-300">No monthly data on this site</span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-300">
        <span className="font-semibold text-gray-200">
          {headlineLabel ? `${headlineLabel} land anomaly (${windowPhrase}) vs 1961–1990` : `Land anomaly (${windowPhrase}) vs 1961–1990`}
        </span>
        <div className="flex items-center gap-2">
          <span>-5°C</span>
          <div
            className="h-3 w-40 rounded"
            style={{
              background:
                'linear-gradient(to right, #1e3a8a 0%, #2563eb 20%, #60a5fa 35%, #bae6fd 48%, #fef3c7 52%, #fde68a 58%, #fb923c 70%, #ea580c 78%, #b91c1c 88%, #7f1d1d 100%)',
            }}
          />
          <span>+5°C</span>
        </div>
        <span className="text-gray-400">Grey = no data · scroll / pinch to zoom, drag to pan</span>
      </div>
    </div>
  );
}
