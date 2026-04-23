#!/usr/bin/env python3
"""One-off: upgrade world-countries.json + us-states.json from NE 110m to 50m."""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def prop(f, k):
    v = f.get('properties', {}).get(k)
    return v if isinstance(v, str) else None


def round_coords(geom, dp=4):
    if geom['type'] == 'Polygon':
        geom['coordinates'] = [
            [[round(x, dp), round(y, dp)] for x, y in ring]
            for ring in geom['coordinates']
        ]
    elif geom['type'] == 'MultiPolygon':
        geom['coordinates'] = [
            [[[round(x, dp), round(y, dp)] for x, y in ring] for ring in poly]
            for poly in geom['coordinates']
        ]
    return geom


def upgrade_countries():
    src = json.load(open('/tmp/ne-50m-countries.geojson'))
    cur_path = os.path.join(ROOT, 'public/data/world-countries.json')
    cur = json.load(open(cur_path))
    cur_names = sorted({f['properties'].get('name') for f in cur['features']})

    ne_feats = src['features']
    used = set()

    def find(name):
        n = name.lower()
        for f in ne_feats:
            if id(f) in used:
                continue
            for key in ('name', 'name_long', 'ADMIN', 'admin', 'NAME', 'NAME_LONG'):
                v = prop(f, key)
                if v and v.lower() == n:
                    return f
        return None

    out = []
    unmatched = []
    for n in cur_names:
        f = find(n)
        if not f:
            unmatched.append(n)
            continue
        used.add(id(f))
        out.append({
            'type': 'Feature',
            'properties': {
                'id': f['properties'].get('ne_id') or f['properties'].get('NE_ID') or '',
                'name': n,
            },
            'geometry': f['geometry'],
        })

    print(f'countries matched: {len(out)} of {len(cur_names)}')
    if unmatched:
        print(f'countries unmatched: {unmatched}')

    for f in out:
        round_coords(f['geometry'])

    json.dump({'type': 'FeatureCollection', 'features': out}, open(cur_path, 'w'), separators=(',', ':'))
    print(f'world-countries.json size: {os.path.getsize(cur_path)} bytes')


def upgrade_states():
    src = json.load(open('/tmp/ne-50m-states.geojson'))
    cur_path = os.path.join(ROOT, 'public/data/us-states.json')
    cur = json.load(open(cur_path))
    cur_names = sorted({f['properties'].get('name') for f in cur['features']})

    ne_feats = [f for f in src['features'] if prop(f, 'iso_a2') == 'US' or prop(f, 'ISO_A2') == 'US']
    print(f'NE 50m US admin-1 features: {len(ne_feats)}')
    used = set()

    def find(name):
        n = name.lower()
        for f in ne_feats:
            if id(f) in used:
                continue
            for key in ('name', 'name_en', 'NAME', 'postal', 'woe_name'):
                v = prop(f, key)
                if v and v.lower() == n:
                    return f
        return None

    out = []
    unmatched = []
    for n in cur_names:
        f = find(n)
        if not f:
            unmatched.append(n)
            continue
        used.add(id(f))
        out.append({
            'type': 'Feature',
            'properties': {'name': n},
            'geometry': f['geometry'],
        })

    print(f'US states matched: {len(out)} of {len(cur_names)}')
    if unmatched:
        print(f'US states unmatched: {unmatched}')

    for f in out:
        round_coords(f['geometry'])

    json.dump({'type': 'FeatureCollection', 'features': out}, open(cur_path, 'w'), separators=(',', ':'))
    print(f'us-states.json size: {os.path.getsize(cur_path)} bytes')


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'both'
    if which in ('countries', 'both'):
        upgrade_countries()
    if which in ('states', 'both'):
        upgrade_states()
