#!/usr/bin/env python3
"""Check data center data sources for programmatic access."""
import urllib.request
import json
import re
import ssl

ctx = ssl.create_default_context()
headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}

def fetch(url, timeout=15):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        return resp.read().decode('utf-8')

# 1. Epoch AI Frontier Data Centers CSV
print("=" * 60)
print("1. EPOCH AI - FRONTIER DATA CENTERS")
print("=" * 60)
urls_to_try = [
    "https://epoch.ai/data/frontier_data_centers.csv",
    "https://epoch.ai/data/epochdb/frontier_data_centers.csv",
    "https://epoch.ai/data/fdc/frontier_data_centers.csv",
]
for url in urls_to_try:
    try:
        data = fetch(url)
        lines = data.strip().split('\n')
        print(f"URL: {url}")
        print(f"Rows: {len(lines)-1}")
        print(f"Headers: {lines[0][:300]}")
        for line in lines[1:3]:
            print(f"  {line[:250]}")
        break
    except Exception as e:
        print(f"  {url} -> {e}")

# 2. IM3 Data Center Atlas on GitHub
print()
print("=" * 60)
print("2. IM3 DATA CENTER ATLAS (PNNL / GitHub)")
print("=" * 60)
try:
    # Check the GitHub API for repos
    data = fetch("https://api.github.com/search/repositories?q=IM3+data+center+atlas&per_page=5")
    repos = json.loads(data)
    for item in repos.get('items', [])[:5]:
        print(f"  Repo: {item['full_name']} - {item.get('description', '')[:100]}")
        print(f"  URL: {item['html_url']}")
except Exception as e:
    print(f"  GitHub search error: {e}")

# Also try known PNNL repos
try:
    data = fetch("https://api.github.com/search/repositories?q=data+center+PNNL&per_page=5")
    repos = json.loads(data)
    for item in repos.get('items', [])[:5]:
        print(f"  Repo: {item['full_name']} - {item.get('description', '')[:100]}")
except Exception as e:
    print(f"  PNNL search error: {e}")

# 3. Ringmast4r Data-Center-Map GitHub
print()
print("=" * 60)
print("3. RINGMAST4R DATA-CENTER-MAP (GitHub)")
print("=" * 60)
try:
    data = fetch("https://api.github.com/repos/Ringmast4r/Data-Center-Map")
    repo = json.loads(data)
    print(f"  Repo: {repo['full_name']}")
    print(f"  Description: {repo.get('description', '')}")
    print(f"  Stars: {repo.get('stargazers_count', 0)}")
    print(f"  Updated: {repo.get('updated_at', '')}")
    
    # Check contents for CSV/JSON files
    contents = fetch("https://api.github.com/repos/Ringmast4r/Data-Center-Map/contents")
    files = json.loads(contents)
    print(f"  Files:")
    for f in files:
        name = f['name']
        if any(ext in name.lower() for ext in ['.csv', '.json', '.geojson', 'data']):
            print(f"    {name} ({f['type']}, {f.get('size',0)} bytes)")
            print(f"    download: {f.get('download_url', 'N/A')}")
        else:
            print(f"    {name} ({f['type']})")
except Exception as e:
    print(f"  Error: {e}")

# 4. DataCenterMap.com - check for API
print()
print("=" * 60)
print("4. DATACENTERMAP.COM")
print("=" * 60)
try:
    data = fetch("https://www.datacentermap.com/api/")
    print(f"  API page found, length: {len(data)}")
except Exception as e:
    print(f"  No public API: {e}")

# 5. Check OWID for data center indicators
print()
print("=" * 60)
print("5. OWID - DATA CENTER RELATED INDICATORS")
print("=" * 60)
# Check IDs in ranges near known indicators
candidate_ids = list(range(1132525, 1132540)) + list(range(1119960, 1119970))
for iid in candidate_ids:
    try:
        data = fetch(f"https://api.ourworldindata.org/v1/indicators/{iid}.metadata.json")
        meta = json.loads(data)
        name = meta.get('name', 'N/A')
        if any(kw in name.lower() for kw in ['data center', 'data centre', 'server', 'nvidia', 'compute', 'cloud']):
            print(f"  ID {iid}: {name}")
    except:
        pass

print("\nDone.")
