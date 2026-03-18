#!/usr/bin/env python3
"""Check IM3 and other GitHub repos for data center geographic data."""
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}

def fetch_json(url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
        return json.loads(resp.read())

def fetch_text(url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
        return resp.read().decode('utf-8')

# 1. IM3 USA datasets
print("=" * 60)
print("1. IM3 Data Center Location USA Datasets")
print("=" * 60)
try:
    files = fetch_json("https://api.github.com/repos/shawn15goh/Data-Center-Location-USA-Datasets/contents")
    for f in files:
        print(f"  {f['name']} ({f['type']}, {f.get('size',0)} bytes)")
    for f in files:
        if f['type'] == 'dir':
            subfiles = fetch_json(f"https://api.github.com/repos/shawn15goh/Data-Center-Location-USA-Datasets/contents/{f['name']}")
            for sf in subfiles[:15]:
                print(f"    {f['name']}/{sf['name']} ({sf.get('size',0)} bytes)")
                if sf['name'].endswith('.csv') and sf.get('download_url'):
                    print(f"      download: {sf['download_url']}")
except Exception as e:
    print(f"  Error: {e}")

# 2. IMMM-SFA data_center_loads
print()
print("=" * 60)
print("2. IMMM-SFA/data_center_loads")
print("=" * 60)
try:
    files = fetch_json("https://api.github.com/repos/IMMM-SFA/data_center_loads/contents")
    for f in files:
        print(f"  {f['name']} ({f['type']}, {f.get('size',0)} bytes)")
except Exception as e:
    print(f"  Error: {e}")

# 3. Try Epoch AI frontier data centers - check their main data page
print()
print("=" * 60)
print("3. Epoch AI - checking data endpoints")
print("=" * 60)
epoch_urls = [
    "https://epoch.ai/data/epochdb/frontier_data_centers.csv",
    "https://epoch.ai/data/frontier-data-centers.csv",
    "https://epoch.ai/data/fdc.csv",
    "https://epoch.ai/api/data/frontier-data-centers",
    "https://epoch.ai/data/frontier_model_data_centers.csv",
]
for url in epoch_urls:
    try:
        text = fetch_text(url)
        lines = text.strip().split('\n')
        print(f"  FOUND: {url}")
        print(f"  Rows: {len(lines)-1}")
        print(f"  Headers: {lines[0][:200]}")
        for line in lines[1:3]:
            print(f"    {line[:200]}")
        break
    except Exception as e:
        status = str(e)
        if '404' in status:
            continue
        print(f"  {url} -> {status}")

# 4. Check Cloudscene or similar API
print()
print("=" * 60)
print("4. GitHub search for global data center datasets")
print("=" * 60)
try:
    repos = fetch_json("https://api.github.com/search/repositories?q=data+center+locations+csv+geojson&sort=stars&per_page=10")
    for item in repos.get('items', []):
        print(f"  {item['full_name']} ({item['stargazers_count']}*) - {item.get('description','')[:100]}")
except Exception as e:
    print(f"  Error: {e}")

# 5. Sample the IM3 CSV if found
print()
print("=" * 60)
print("5. Sample IM3 data")
print("=" * 60)
try:
    files = fetch_json("https://api.github.com/repos/shawn15goh/Data-Center-Location-USA-Datasets/contents")
    for f in files:
        if f['name'].endswith('.csv') and f.get('download_url'):
            print(f"  Sampling {f['name']}...")
            text = fetch_text(f['download_url'])
            lines = text.strip().split('\n')
            print(f"  Rows: {len(lines)-1}")
            print(f"  Headers: {lines[0][:300]}")
            for line in lines[1:5]:
                print(f"    {line[:250]}")
            print()
        if f['type'] == 'dir':
            subfiles = fetch_json(f"https://api.github.com/repos/shawn15goh/Data-Center-Location-USA-Datasets/contents/{f['name']}")
            for sf in subfiles[:3]:
                if sf['name'].endswith('.csv') and sf.get('download_url'):
                    print(f"  Sampling {f['name']}/{sf['name']}...")
                    text = fetch_text(sf['download_url'])
                    lines = text.strip().split('\n')
                    print(f"  Rows: {len(lines)-1}")
                    print(f"  Headers: {lines[0][:300]}")
                    for line in lines[1:4]:
                        print(f"    {line[:250]}")
                    print()
except Exception as e:
    print(f"  Error: {e}")

print("\nDone.")
