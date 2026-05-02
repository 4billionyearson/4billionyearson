#!/usr/bin/env python3
"""
Patch world-countries.json:
  1. Restore French Guiana polygon to France's MultiPolygon (removed in d0356cf)
  2. Add North Macedonia as a new feature (was missing from Natural Earth 50m source)
"""
import json
import subprocess
import urllib.request
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'data', 'world-countries.json')

def round_geom(geom):
    if geom['type'] == 'Polygon':
        geom['coordinates'] = [
            [[round(x, 4), round(y, 4)] for x, y in ring]
            for ring in geom['coordinates']
        ]
    elif geom['type'] == 'MultiPolygon':
        geom['coordinates'] = [
            [[[round(x, 4), round(y, 4)] for x, y in ring] for ring in poly]
            for poly in geom['coordinates']
        ]
    return geom

def main():
    # ── 1. Load current file ──────────────────────────────────────────────────
    with open(OUT) as f:
        geo = json.load(f)

    # Sanity check: already patched?
    already_mac = any(ft['properties'].get('name') == 'North Macedonia' for ft in geo['features'])
    france = next(ft for ft in geo['features'] if ft['properties'].get('name') == 'France')
    france_polys = france['geometry']['coordinates']
    already_fg = any(
        min(c[0] for c in p[0]) > -60 and max(c[0] for c in p[0]) < -50
        for p in france_polys
    )
    if already_mac and already_fg:
        print('Already patched – nothing to do.')
        return

    # ── 2. Restore French Guiana from the pre-patch git commit ───────────────
    if not already_fg:
        print('Extracting French Guiana from pre-patch git commit...')
        result = subprocess.run(
            ['git', 'show', 'd0356cf^:public/data/world-countries.json'],
            capture_output=True, cwd=ROOT
        )
        old = json.loads(result.stdout)
        france_old = next(ft for ft in old['features'] if ft['properties'].get('name') == 'France')
        fg_poly = next(
            p for p in france_old['geometry']['coordinates']
            if min(c[0] for c in p[0]) > -60 and max(c[0] for c in p[0]) < -50
        )
        lons = [c[0] for c in fg_poly[0]]
        print(f'  French Guiana: {len(fg_poly[0])} vertices, lon [{min(lons):.2f}, {max(lons):.2f}]')
        france['geometry']['coordinates'].append(fg_poly)
        print(f'  France now has {len(france["geometry"]["coordinates"])} polygons')

    # ── 3. Add North Macedonia from Natural Earth 50m ────────────────────────
    if not already_mac:
        url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'
        print(f'Fetching Natural Earth 50m ({url})...')
        with urllib.request.urlopen(url, timeout=90) as r:
            ne50 = json.loads(r.read())

        mac_ne = next(
            f for f in ne50['features']
            if 'macedonia' in (f['properties'].get('ADMIN') or '').lower()
        )
        print(f'  Found: {mac_ne["properties"]["ADMIN"]}, geom type: {mac_ne["geometry"]["type"]}')

        mac_feature = {
            'type': 'Feature',
            'properties': {'id': 'MKD', 'name': 'North Macedonia'},
            'geometry': round_geom(mac_ne['geometry']),
        }
        geo['features'].append(mac_feature)

    # ── 4. Write ──────────────────────────────────────────────────────────────
    with open(OUT, 'w') as f:
        json.dump(geo, f, separators=(',', ':'))

    total = len(geo['features'])
    print(f'✅ world-countries.json written ({total} features)')

if __name__ == '__main__':
    main()
