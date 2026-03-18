#!/usr/bin/env python3
"""Analyze the IM3 data center atlas CSV to understand the data."""
import urllib.request
import json
import ssl
from collections import Counter

ctx = ssl.create_default_context()
headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}

def fetch_text(url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
        return resp.read().decode('utf-8')

# IM3 Atlas
url = "https://raw.githubusercontent.com/shawn15goh/Data-Center-Location-USA-Datasets/main/im3_open_source_data_center_atlas/im3_open_source_data_center_atlas.csv"
text = fetch_text(url)
lines = text.strip().split('\n')
header = lines[0].split(',')
print(f"Headers: {header}")
print(f"Total rows: {len(lines)-1}")

# Parse & aggregate by state
import csv
from io import StringIO
reader = csv.DictReader(StringIO(text))
rows = list(reader)

# Count by state
state_counts = Counter(r['state'] for r in rows)
print(f"\nUnique states: {len(state_counts)}")
print("\nTop 20 states by data center count:")
for state, count in state_counts.most_common(20):
    print(f"  {state}: {count}")

# Count by type
type_counts = Counter(r.get('type','unknown') for r in rows)
print(f"\nTypes: {dict(type_counts)}")

# Count by operator (top 15)
op_counts = Counter(r.get('operator','') for r in rows if r.get('operator',''))
print(f"\nTop 15 operators:")
for op, count in op_counts.most_common(15):
    print(f"  {op}: {count}")

# Named facilities
named = [r for r in rows if r.get('name','')]
print(f"\nNamed facilities: {len(named)} / {len(rows)}")
print("Sample named facilities:")
for r in named[:10]:
    print(f"  {r.get('name','')} - {r.get('state','')} ({r.get('operator','')})")

# Check for sqft data
has_sqft = [r for r in rows if r.get('sqft','') and r['sqft'] != '']
print(f"\nRows with sqft data: {len(has_sqft)}")

# Check the Epoch AI frontier data centers page for any downloadable data
print("\n" + "=" * 60)
print("EPOCH AI - Checking frontier-model-tracker endpoints")
print("=" * 60)
epoch_urls = [
    "https://epoch.ai/api/frontier-data-centers",
    "https://epoch.ai/data/frontier_model_data_centers.csv",
    "https://epoch.ai/data/epochdb/frontier_data_centers.csv",
    "https://epoch.ai/data/fdc/data.csv",
    "https://epoch.ai/data/trends",
    "https://epochai.org/data/frontier-data-centers.csv",
]
for url in epoch_urls:
    try:
        text2 = fetch_text(url)
        print(f"  FOUND: {url} ({len(text2)} bytes)")
        if text2.startswith('{') or text2.startswith('['):
            data = json.loads(text2)
            if isinstance(data, list):
                print(f"  Array with {len(data)} items")
                if data:
                    print(f"  Keys: {list(data[0].keys())[:15]}")
                    print(f"  Sample: {json.dumps(data[0])[:300]}")
            elif isinstance(data, dict):
                print(f"  Keys: {list(data.keys())[:15]}")
        else:
            lines2 = text2.strip().split('\n')
            print(f"  Lines: {len(lines2)}")
            print(f"  First line: {lines2[0][:200]}")
        break
    except Exception as e:
        if '404' not in str(e):
            print(f"  {url} -> {e}")

print("\nDone.")
