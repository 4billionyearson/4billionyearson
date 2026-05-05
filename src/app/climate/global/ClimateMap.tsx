"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GeoJSON, Marker, useMap, useMapEvents } from 'react-leaflet';
import type { FeatureCollection, Feature } from 'geojson';
import type { Layer, PathOptions } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WorldMapShell } from '../../_components/world-map-shell';
import {
  METRICS,
  type MetricKey,
  colorForMetric,
  formatMetricValue,
  legendForWindow,
} from './climate-map-metrics';

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
  // Territories whose stats are counted under their sovereign state
  'french guiana': 'france',
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
// Now delegates to colorForMetric(metric, value, windowSel) so the same map can render
// temp / precip / sunshine / frost using the metric-specific ramps defined
// in climate-map-metrics.ts. The local helper kept for backward compat
// with overlay code paths that still call it directly (US/UK overlays in
// pure temp-anomaly mode).
function anomalyColor(anom: number | null | undefined): string {
  return colorForMetric('temp-anomaly', anom);
}

function normalizeName(s: string): string {
  const lower = s.trim().toLowerCase();
  return NAME_ALIAS[lower] ?? lower;
}

// Per-level mobile preset for <MapMobileFit>. Continents/countries show the
// whole world; the regional levels snap to CONUS or the British Isles.
const LEVEL_MOBILE_PRESET: Record<MapLevel, 'world' | 'usa' | 'uk'> = {
  continents: 'world',
  countries: 'world',
  'us-states': 'usa',
  'us-regions': 'usa',
  'uk-countries': 'uk',
  'uk-regions': 'uk',
};

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

// State / UK-nation labels: shown whenever the user has explicitly selected
// the matching `level`, regardless of zoom. (We previously gated these at
// zoom>=4 to avoid them appearing during a world-view animation, but the
// current shell only renders them when level matches, and on mobile the
// USA/UK preset settles at fractional zoom ~3.3 — below the old gate —
// which made the labels invisible.)
const US_STATE_LABEL_ZOOM = 0;
const UK_NATION_LABEL_ZOOM = 0;

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

  // `zoomend` covers user-driven zoom; `moveend` also fires after fitBounds
  // (including the synchronous animate:false snap on first mount), so we
  // catch the post-mount zoom change reliably.
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setZoom(map.getZoom()),
  });

  // When the level changes (or the map mounts and ZoomToLevel snaps the
  // viewport) re-read the zoom so the level-conditional labels (US states,
  // UK nations) appear immediately rather than waiting for a user zoom.
  useEffect(() => {
    setZoom(map.getZoom());
  }, [map, level]);

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

interface MetricWindowRow {
  actual1m: number | null;
  actual3m: number | null;
  actual12m: number | null;
  anom1m: number | null;
  anom3m: number | null;
  anom12m: number | null;
  label1m: string | null;
  label3m: string | null;
  label12m: string | null;
}

interface RankingRow {
  slug: string;
  name: string;
  type: 'country' | 'us-state' | 'uk-region';
  anomaly1m: number | null;
  anomaly3m: number | null;
  anomaly12m: number | null;
  latestLabel: string | null;
  metrics?: {
    temp?: MetricWindowRow;
    precip?: MetricWindowRow;
    sunshine?: MetricWindowRow;
    frost?: MetricWindowRow;
  };
}

// Pull the value for the requested metric + window from a ranking row.
// Returns { value, label } or { value: null, label: null } if the row
// either lacks the metric block or has no data for that window.
function metricFromRow(
  row: RankingRow | undefined,
  metric: MetricKey,
  win: AnomalyWindow,
): { value: number | null; label: string | null } {
  if (!row) return { value: null, label: null };
  // Temperature anomaly is kept at top-level for backward compat - look there
  // first so we still show data for legacy rows that pre-date the metrics block.
  if (metric === 'temp-anomaly') {
    const value = win === '3m' ? row.anomaly3m : win === '12m' ? row.anomaly12m : row.anomaly1m;
    return { value, label: row.latestLabel };
  }
  const domain = metric.startsWith('temp') ? 'temp'
    : metric.startsWith('precip') ? 'precip'
    : metric.startsWith('sunshine') ? 'sunshine' : 'frost';
  const node = row.metrics?.[domain];
  if (!node) return { value: null, label: null };
  const isAnom = metric.endsWith('-anomaly');
  if (win === '3m') return { value: isAnom ? node.anom3m : node.actual3m, label: node.label3m };
  if (win === '12m') return { value: isAnom ? node.anom12m : node.actual12m, label: node.label12m };
  return { value: isAnom ? node.anom1m : node.actual1m, label: node.label1m };
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
  metric,
  onInfo,
  ukGeo,
  level,
  customScale,
  onSelect,
}: {
  rankings: RankingRow[] | null;
  windowSel: AnomalyWindow;
  metric: MetricKey;
  onInfo: (info: { name: string; value: number | null; label: string | null; color: string } | null) => void;
  ukGeo: FeatureCollection | null;
  level: MapLevel;
  customScale?: { min: number; max: number };
  onSelect?: (info: { level: MapLevel; name: string; slug?: string }) => void;
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
      const { value } = metricFromRow(row, metric, windowSel);
      return {
        fillColor: value != null ? colorForMetric(metric, value, windowSel, customScale) : '#2d3748',
        fillOpacity: value != null ? 0.9 : 0.45,
        weight: 1.2,
        color: '#374151',
      };
    },
    [bySlug, windowSel, metric, customScale],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const slug = ((feature.properties as any)?.slug as string) ?? '';
      const name = ((feature.properties as any)?.name as string) ?? slug;
      const row = bySlug.get(slug);
      const { value, label } = metricFromRow(row, metric, windowSel);
      const color = value != null ? colorForMetric(metric, value, windowSel, customScale) : '#1f2937';
      const show = () => onInfo({ name, value, label, color });
      layer.on('mouseover', show);
      layer.on('click', () => {
        show();
        if (onSelect) onSelect({ level, name, slug });
      });
      layer.on('mouseout', () => onInfo(null));
    },
    [bySlug, windowSel, metric, onInfo, customScale, onSelect, level],
  );

  if (!visible || !ukGeo) return null;
  return (
    <GeoJSON
      key={`uk-overlay-${level}-${windowSel}-${metric}-${bySlug.size}-${customScale ? `${customScale.min}-${customScale.max}` : 'fixed'}`}
      data={ukGeo}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

function USStatesOverlay({
  rankings,
  windowSel,
  metric,
  onInfo,
  statesGeo,
  level,
  usRegionGroups,
  customScale,
  onSelect,
}: {
  rankings: RankingRow[] | null;
  windowSel: AnomalyWindow;
  metric: MetricKey;
  onInfo: (info: { name: string; value: number | null; label: string | null; color: string } | null) => void;
  statesGeo: FeatureCollection | null;
  level: MapLevel;
  usRegionGroups: GroupRow[] | null;
  customScale?: { min: number; max: number };
  onSelect?: (info: { level: MapLevel; name: string; slug?: string }) => void;
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

  const resolve = useCallback((featureName: string): { value: number | null; label: string | null; displayName: string } => {
    if (level === 'us-regions') {
      // US climate region groups only carry temperature anomaly. For any other
      // metric we mark the polygon as no-data so the toggle can't show stale
      // info.
      if (metric !== 'temp-anomaly') return { value: null, label: null, displayName: featureName };
      const slug = US_STATE_NAME_TO_REGION_SLUG[featureName.toLowerCase()];
      const g = slug ? regionBySlug.get(slug) : undefined;
      if (!g) return { value: null, label: null, displayName: featureName };
      const value = windowSel === '3m' ? g.anomaly3m : windowSel === '12m' ? g.anomaly12m : g.anomaly1m;
      return { value, label: g.latestLabel, displayName: `${g.label} (US climate region)` };
    }
    const row = byName.get(featureName.toLowerCase());
    const { value, label } = metricFromRow(row, metric, windowSel);
    return { value, label, displayName: featureName };
  }, [level, windowSel, metric, byName, regionBySlug]);

  const style = useCallback(
    (feature: Feature | undefined): PathOptions => {
      const name = ((feature?.properties as any)?.name as string) ?? '';
      const { value } = resolve(name);
      return {
        fillColor: value != null ? colorForMetric(metric, value, windowSel, customScale) : '#1f2937',
        fillOpacity: 0.9,
        weight: 0.6,
        color: '#0b1220',
      };
    },
    [resolve, metric, windowSel, customScale],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const name = ((feature.properties as any)?.name as string) ?? '';
      const { value, label, displayName } = resolve(name);
      const color = value != null ? colorForMetric(metric, value, windowSel, customScale) : '#1f2937';
      const show = () => onInfo({ name: displayName, value, label, color });
      layer.on('mouseover', show);
      layer.on('click', () => {
        show();
        if (onSelect) {
          // For us-regions the click should go to the climate region
          // (us-northeast, etc.), not the state polygon underneath.
          const slug = level === 'us-regions'
            ? US_STATE_NAME_TO_REGION_SLUG[name.toLowerCase()]
            : undefined;
          onSelect({ level, name, slug });
        }
      });
      layer.on('mouseout', () => onInfo(null));
    },
    [resolve, metric, windowSel, onInfo, customScale, onSelect, level],
  );

  if (!visible || !statesGeo) return null;
  return (
    <GeoJSON
      key={`us-states-${level}-${windowSel}-${metric}-${byName.size}-${regionBySlug.size}-${customScale ? `${customScale.min}-${customScale.max}` : 'fixed'}`}
      data={statesGeo}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

// UKRegionsOverlay removed - the map now shows UK as a single country polygon to
// avoid mismatched sub-polygon coverage. Re-introduce from git history if needed.

export default function ClimateMap({
  countryAnomalies,
  window: windowSel = '1m',
  level = 'countries',
  metric = 'temp-anomaly',
  autoStretch = false,
  onToggleAutoStretch,
  compact = false,
  onSelect,
}: {
  countryAnomalies: CountryAnomaly[];
  window?: AnomalyWindow;
  level?: MapLevel;
  metric?: MetricKey;
  autoStretch?: boolean;
  /** When provided, renders an Auto-stretch toggle inside the legend row.
   *  Card hosts pass this so the toggle lives next to the gradient it
   *  controls instead of in the controls row at the top. */
  onToggleAutoStretch?: () => void;
  /** When true, hide the legend row, the auto-stretch toggle, and the value
   *  in the bottom info panel — just show the region name. Used by the hub
   *  when the map is a navigation surface, not a data-explorer. */
  compact?: boolean;
  /** Called when the user clicks a region polygon. Slug is provided when
   *  the feature’s geojson carries one (UK, US climate regions); otherwise
   *  the parent must resolve it from `name + level`. iso3 is provided at
   *  country level so parents can look up by ISO code rather than name. */
  onSelect?: (info: { level: MapLevel; name: string; slug?: string; iso3?: string }) => void;
}) {
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
    value: number | null;
    label?: string;
    extra?: string;
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

  // Country-level lookup: countryAnomalies (rich, used for the temp-anomaly
  // tooltip) and a parallel rankings-row lookup that carries the metrics
  // block needed for temp-actual / precip / sunshine / frost.
  const lookup = useMemo(() => {
    const map = new Map<string, CountryAnomaly>();
    for (const c of countryAnomalies) {
      map.set(normalizeName(c.name), c);
    }
    return map;
  }, [countryAnomalies]);

  const countryRowByName = useMemo(() => {
    const map = new Map<string, RankingRow>();
    if (rankings) {
      for (const r of rankings) {
        if (r.type === 'country') map.set(normalizeName(r.name), r);
      }
    }
    return map;
  }, [rankings]);

  const continentByKey = useMemo(() => {
    const m = new Map<string, GroupRow>();
    if (continentGroups) for (const g of continentGroups) m.set(g.key, g);
    return m;
  }, [continentGroups]);

  const groupValue = useCallback((g: GroupRow | undefined): { value: number | null; label: string | null } => {
    if (!g) return { value: null, label: null };
    if (windowSel === '3m') return { value: g.anomaly3m, label: g.latestLabel };
    if (windowSel === '12m') return { value: g.anomaly12m, label: g.latestLabel };
    return { value: g.anomaly1m, label: g.latestLabel };
  }, [windowSel]);

  // Resolve the value for a polygon at the active level + metric. Returns
  // { value: null } for combinations that have no data (e.g. continent
  // polygons in precip-actual mode, since NOAA doesn't publish a continent
  // precip rollup).
  const pick = useCallback((c: CountryAnomaly | undefined, name?: string): { value: number | null; label: string | null } => {
    // Sub-national levels: country polygons are just a backdrop.
    if (level === 'us-states' || level === 'us-regions' || level === 'uk-regions' || level === 'uk-countries') {
      return { value: null, label: null };
    }
    if (level === 'continents') {
      // Only temp anomaly is supported for continent rollups; other metrics
      // have no continent-aggregated source.
      if (metric !== 'temp-anomaly') return { value: null, label: null };
      const byContinent = name ? NAME_TO_CONTINENT[name.toLowerCase()] : undefined;
      const byIso = c ? CONTINENT_GROUP_KEY[c.iso3] : undefined;
      const groupKey = byContinent ?? byIso;
      if (!groupKey) return { value: null, label: null };
      return groupValue(continentByKey.get(groupKey));
    }
    // level === 'countries'.
    // Temp-anomaly: prefer the rich countryAnomalies source for tooltip parity.
    if (metric === 'temp-anomaly') {
      if (!c) return { value: null, label: null };
      if (windowSel === '3m') return { value: c.anomaly3m ?? null, label: c.label3m ?? null };
      if (windowSel === '12m') return { value: c.anomaly12m ?? null, label: c.label12m ?? null };
      return { value: c.anomaly1m ?? c.anomaly ?? null, label: c.label1m ?? c.monthLabel ?? null };
    }
    // Other metrics: pull from rankings rows (the only source that carries
    // the multi-metric block at country level).
    let row = name ? countryRowByName.get(normalizeName(name)) : undefined;
    // Western Sahara has no source row — fall back to Morocco.
    if (!row && name && normalizeName(name) === 'w. sahara') {
      row = countryRowByName.get('morocco');
    }
    return metricFromRow(row, metric, windowSel);
  }, [windowSel, level, metric, continentByKey, groupValue, countryRowByName]);

  // When the user enables Auto-stretch, derive the colour domain from the
  // values actually being shown on the map at the active level + metric +
  // window. Returns null when the toggle is off (use the fixed legend
  // domain), or when there's not enough data to stretch meaningfully.
  const customScale = useMemo<{ min: number; max: number } | null>(() => {
    if (!autoStretch) return null;
    const values: number[] = [];
    const push = (v: number | null | undefined) => {
      if (v != null && Number.isFinite(v)) values.push(v);
    };
    if (level === 'continents') {
      if (metric === 'temp-anomaly' && continentGroups) {
        for (const g of continentGroups) push(groupValue(g).value);
      }
    } else if (level === 'countries') {
      if (metric === 'temp-anomaly') {
        for (const c of countryAnomalies) {
          push(windowSel === '3m' ? c.anomaly3m : windowSel === '12m' ? c.anomaly12m : (c.anomaly1m ?? c.anomaly));
        }
      } else if (rankings) {
        for (const r of rankings) {
          if (r.type !== 'country') continue;
          push(metricFromRow(r, metric, windowSel).value);
        }
      }
    } else if (level === 'us-states') {
      if (rankings) {
        for (const r of rankings) {
          if (r.type !== 'us-state') continue;
          push(metricFromRow(r, metric, windowSel).value);
        }
      }
    } else if (level === 'us-regions') {
      if (metric === 'temp-anomaly' && usRegionGroups) {
        for (const g of usRegionGroups) {
          push(windowSel === '3m' ? g.anomaly3m : windowSel === '12m' ? g.anomaly12m : g.anomaly1m);
        }
      }
    } else if (level === 'uk-countries' || level === 'uk-regions') {
      if (rankings) {
        const slugSet = level === 'uk-regions' ? UK_REGION_SLUGS : UK_NATION_SLUGS;
        for (const r of rankings) {
          if (r.type !== 'uk-region' || !slugSet.has(r.slug)) continue;
          push(metricFromRow(r, metric, windowSel).value);
        }
      }
    }
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (!(max - min > 1e-9)) return null;
    // For diverging anomaly metrics, force the domain to be symmetric around
    // zero so the white midpoint still represents the baseline.
    const cfg = METRICS[metric];
    if (cfg.isAnomaly) {
      const m = Math.max(Math.abs(min), Math.abs(max));
      return { min: -m, max: m };
    }
    return { min, max };
  }, [autoStretch, level, metric, windowSel, countryAnomalies, rankings, continentGroups, usRegionGroups, groupValue]);

  const style = useCallback((feature: Feature | undefined): PathOptions => {
    if (!feature) return { fillColor: '#1f2937', fillOpacity: 0.8, weight: 0.4, color: '#0b1220' };
    const name = ((feature.properties as any)?.name as string) ?? '';
    const norm = normalizeName(name);
    let rec = lookup.get(norm);
    // HadCRUT/Berkeley have no Western Sahara row — fall back to Morocco
    // (de-facto administrator) so the polygon doesn't render as no-data grey.
    if (!rec && norm === 'w. sahara') rec = lookup.get('morocco');
    const { value } = pick(rec, name);
    return {
      fillColor: value != null ? colorForMetric(metric, value, windowSel, customScale ?? undefined) : '#1f2937',
      fillOpacity: 0.85,
      weight: 0.4,
      color: '#0b1220',
    };
  }, [lookup, pick, metric, windowSel, customScale]);

  const onEachFeature = useCallback((feature: Feature, layer: Layer) => {
    const name = ((feature.properties as any)?.name as string) ?? '';
    if (level === 'us-states' || level === 'us-regions' || level === 'uk-regions') {
      return;
    }
    const rec = lookup.get(normalizeName(name));
    const { value, label } = pick(rec, name);
    const color = value != null ? colorForMetric(metric, value, windowSel, customScale ?? undefined) : '#1f2937';
    let displayName = name;
    if (level === 'continents') {
      const groupKey = NAME_TO_CONTINENT[name.toLowerCase()] ?? (rec ? CONTINENT_GROUP_KEY[rec.iso3] : undefined);
      const group = groupKey ? continentByKey.get(groupKey) : undefined;
      if (group) displayName = `${group.label} (continent)`;
    }
    // The "extra" line shows rich country tooltip context only when we're
    // actually viewing temp-anomaly at country level (where countryAnomalies
    // gives us absolute temp + global rank).
    let extra: string | undefined;
    if (level === 'countries' && metric === 'temp-anomaly' && rec) {
      const parts: string[] = [];
      if (typeof rec.value === 'number') parts.push(`${rec.value.toFixed(2)}°C absolute`);
      if (rec.rank && rec.total) parts.push(`Rank ${rec.rank} of ${rec.total}`);
      if (parts.length) extra = parts.join(' · ');
    }
    const show = () => setSelected({
      name: displayName,
      value,
      label: label ?? undefined,
      extra,
      color,
    });
    layer.on('mouseover', show);
    layer.on('click', () => {
      show();
      if (onSelect) {
        onSelect({ level, name, iso3: rec?.iso3 });
      }
    });
    layer.on('mouseout', () => setSelected(null));
  }, [lookup, pick, level, metric, continentByKey, onSelect]);

  const cfg = METRICS[metric];
  const legend = legendForWindow(metric, windowSel, customScale ?? undefined);
  const baselineCopy = cfg.isAnomaly ? cfg.baseline : '';

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-200">
        Map could not load: {loadError}
      </div>
    );
  }
  if (!geo) {
    return (
      <div className="aspect-[4/3] w-full rounded-xl bg-gray-900/40 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#D0A65E] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <WorldMapShell
          preset={LEVEL_MOBILE_PRESET[level]}
          theme="dark"
          tileOpacity={0.55}
        >
          <GeoJSON
            key={`base-${level}-${windowSel}-${metric}-${lookup.size}-${countryRowByName.size}-${continentByKey.size}-${customScale ? `${customScale.min}-${customScale.max}` : 'fixed'}`}
            data={geo}
            style={style}
            onEachFeature={onEachFeature}
          />
          <USStatesOverlay
            rankings={rankings}
            windowSel={windowSel}
            metric={metric}
            statesGeo={statesGeo}
            level={level}
            usRegionGroups={usRegionGroups}
            customScale={customScale ?? undefined}
            onSelect={onSelect}
            onInfo={(info) =>
              setSelected(
                info
                  ? { name: info.name, value: info.value, label: info.label ?? undefined, color: info.color }
                  : null,
              )
            }
          />
          <UKNationsOverlay
            rankings={rankings}
            windowSel={windowSel}
            metric={metric}
            ukGeo={ukGeo}
            level={level}
            customScale={customScale ?? undefined}
            onSelect={onSelect}
            onInfo={(info) =>
              setSelected(
                info
                  ? { name: info.name, value: info.value, label: info.label ?? undefined, color: info.color }
                  : null,
              )
            }
          />
          <MapLabels countriesGeo={geo} statesGeo={statesGeo} ukGeo={ukGeo} level={level} />
        </WorldMapShell>

        {selected && (
          <div className="absolute bottom-0 left-0 right-0 z-[1001] bg-gray-950/95 backdrop-blur-sm border-t border-gray-700/60 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm pointer-events-none">
            <span className="font-bold text-gray-100">{selected.name}</span>
            {!compact && (
              selected.value != null ? (
                <>
                  <span className="font-mono font-semibold" style={{ color: selected.color }}>
                    {formatMetricValue(metric, selected.value)}{baselineCopy ? ` ${baselineCopy}` : ''}
                  </span>
                  <span className="text-gray-300">
                    {selected.extra ? `${selected.extra}` : ''}
                    {selected.label ? `${selected.extra ? ' · ' : ''}${selected.label}` : ''}
                  </span>
                </>
              ) : (
                <span className="text-gray-300">No data on this site</span>
              )
            )}
            {compact && onSelect && (
              <span className="text-[#D0A65E]">Click to open climate update →</span>
            )}
          </div>
        )}
      </div>

      {/* Legend — gradient + (optional) auto-stretch toggle on one row.
          The verbose "Temperature anomaly (monthly) vs 1961-1990" header
          and "Grey = no data · scroll / pinch to zoom..." helper text were
          removed: the controls above already say which metric/window is
          active, the source line below names the baseline, and grey/zoom
          behaviour is self-evident on the map itself. */}
      {!compact && (
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-300">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 tabular-nums text-gray-400">{legend.legendMin}</span>
          <div
            className="h-3 flex-1 min-w-[80px] max-w-[180px] rounded"
            style={{ background: legend.legendGradient }}
          />
          <span className="shrink-0 tabular-nums text-gray-400">{legend.legendMax}</span>
        </div>
        {customScale && (
          <span className="hidden sm:inline-flex items-center rounded-full bg-[#D0A65E]/15 border border-[#D0A65E]/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#D0A65E]">
            Stretched
          </span>
        )}
        {onToggleAutoStretch && (
          <button
            type="button"
            onClick={onToggleAutoStretch}
            aria-pressed={autoStretch}
            title={autoStretch
              ? 'Showing colours fitted to the values currently visible. Click to switch back to the canonical scale.'
              : 'Showing the full canonical scale across all maps. Click to fit colours to the values currently visible.'}
            className={`ml-auto inline-flex h-7 items-center rounded-full border px-2.5 text-[12px] font-medium transition-colors whitespace-nowrap ${
              autoStretch
                ? 'border-[#D0A65E]/55 bg-[#D0A65E]/12 text-[#FFF5E7]'
                : 'border-gray-700 bg-gray-900/45 text-gray-300 hover:border-[#D0A65E]/25 hover:bg-white/[0.03] hover:text-[#FFF5E7]'
            }`}
          >
            {autoStretch ? 'Auto-Stretch: On' : 'Auto-Stretch: Off'}
          </button>
        )}
        </div>
      )}
    </div>
  );
}
