#!/usr/bin/env python3
"""Get the 20 most recent AI models from Epoch AI CSV."""
import urllib.request, ssl, csv
from io import StringIO

ctx = ssl.create_default_context()
url = "https://epoch.ai/data/epochdb/notable_ai_models.csv"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
    text = resp.read().decode("utf-8")

reader = csv.DictReader(StringIO(text))
models = []
for row in reader:
    date = row.get("Publication date", "")
    name = row.get("Model", "")
    org = row.get("Organization", "")
    domain = row.get("Domain", "")
    params = row.get("Parameters", "")
    if date and name and len(date) >= 4:
        year = int(date[:4]) if date[:4].isdigit() else 0
        if 2024 <= year <= 2027:
            models.append((date, name, org.split(",")[0].strip(), domain, params))

models.sort(key=lambda x: x[0], reverse=True)
print(f"Models from 2024+: {len(models)}")
print("\n=== 30 Most Recent ===")
for date, name, org, domain, params in models[:30]:
    p = ""
    if params:
        try:
            pv = float(params)
            if pv >= 1e12: p = f" ({pv/1e12:.0f}T params)"
            elif pv >= 1e9: p = f" ({pv/1e9:.0f}B params)"
            elif pv >= 1e6: p = f" ({pv/1e6:.0f}M params)"
        except: pass
    print(f"  {date[:10]:12s} {name[:40]:42s} {org[:25]:27s} {domain}{p}")
