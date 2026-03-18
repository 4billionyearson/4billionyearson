#!/usr/bin/env python3
"""Check us-states.json coordinate format."""
import json

with open('/Users/chrisdunn/Documents/My Apps/vs code/4billionyearson/public/data/us-states.json') as f:
    data = json.load(f)

print(f"Type: {data.get('type')}")
print(f"Features: {len(data.get('features', []))}")

for feat in data['features']:
    name = feat['properties']['name']
    geom = feat['geometry']
    gtype = geom['type']
    coords = geom['coordinates']
    
    all_lons = []
    all_lats = []
    
    if gtype == 'Polygon':
        for ring in coords:
            for c in ring:
                all_lons.append(c[0])
                all_lats.append(c[1])
    elif gtype == 'MultiPolygon':
        for poly in coords:
            for ring in poly:
                for c in ring:
                    all_lons.append(c[0])
                    all_lats.append(c[1])
    
    print(f"  {name:25s} {gtype:15s} lon=[{min(all_lons):8.2f}, {max(all_lons):8.2f}] lat=[{min(all_lats):7.2f}, {max(all_lats):7.2f}]")
