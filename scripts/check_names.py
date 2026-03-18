#!/usr/bin/env python3
"""Compare state names between IM3 CSV and us-states.json."""
import json, urllib.request, ssl, csv
from io import StringIO

# GeoJSON names
with open('/Users/chrisdunn/Documents/My Apps/vs code/4billionyearson/public/data/us-states.json') as f:
    geo = json.load(f)
geo_names = set(f['properties']['name'] for f in geo['features'])

# IM3 names  
ctx = ssl.create_default_context()
url = "https://raw.githubusercontent.com/shawn15goh/Data-Center-Location-USA-Datasets/main/im3_open_source_data_center_atlas/im3_open_source_data_center_atlas.csv"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
    text = resp.read().decode("utf-8")

reader = csv.DictReader(StringIO(text))
im3_names = set()
for row in reader:
    im3_names.add(row.get('state', ''))

print(f"GeoJSON states: {len(geo_names)}")
print(f"IM3 states: {len(im3_names)}")
print()
print(f"In GeoJSON but NOT in IM3:")
for n in sorted(geo_names - im3_names):
    print(f"  {n}")
print()
print(f"In IM3 but NOT in GeoJSON:")
for n in sorted(im3_names - im3_names & geo_names):
    pass
for n in sorted(im3_names - geo_names):
    print(f"  {n}")
print()
print(f"Matching names:")
matches = geo_names & im3_names
print(f"  {len(matches)} states match")
