#!/usr/bin/env python3
"""Check what fields the Epoch AI CSV has for individual model names."""
import urllib.request
import ssl

ctx = ssl.create_default_context()
url = "https://epoch.ai/data/epochdb/notable_ai_models.csv"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
    text = resp.read().decode("utf-8")

lines = text.strip().split("\n")
headers = lines[0]
print(f"Total rows: {len(lines)-1}")
print(f"Headers: {headers[:500]}")
print()

# Find column indices
cols = headers.split(",")
print(f"Column count: {len(cols)}")
for i, c in enumerate(cols[:30]):
    print(f"  [{i}] {c}")

# Parse properly
def parse_csv_line(line):
    result = []
    current = ""
    in_quotes = False
    for ch in line:
        if ch == '"':
            in_quotes = not in_quotes
        elif ch == ',' and not in_quotes:
            result.append(current.strip())
            current = ""
        else:
            current += ch
    result.append(current.strip())
    return result

header_list = parse_csv_line(lines[0])
name_idx = next((i for i, h in enumerate(header_list) if h.lower() == 'system'), -1)
if name_idx < 0:
    name_idx = next((i for i, h in enumerate(header_list) if 'name' in h.lower() or 'model' in h.lower()), -1)
date_idx = next((i for i, h in enumerate(header_list) if h == 'Publication date'), -1)
org_idx = next((i for i, h in enumerate(header_list) if h == 'Organization'), -1)
domain_idx = next((i for i, h in enumerate(header_list) if h == 'Domain'), -1)

print(f"\nName column [{name_idx}]: {header_list[name_idx] if name_idx >= 0 else 'NOT FOUND'}")
print(f"Date column [{date_idx}]: {header_list[date_idx] if date_idx >= 0 else 'NOT FOUND'}")
print(f"Org column [{org_idx}]: {header_list[org_idx] if org_idx >= 0 else 'NOT FOUND'}")
print(f"Domain column [{domain_idx}]: {header_list[domain_idx] if domain_idx >= 0 else 'NOT FOUND'}")

# Show the most recent 20 models
print("\n=== Most recent 20 models ===")
models = []
for i in range(1, len(lines)):
    if not lines[i].strip():
        continue
    row = parse_csv_line(lines[i])
    date = row[date_idx] if date_idx >= 0 and date_idx < len(row) else ""
    name = row[name_idx] if name_idx >= 0 and name_idx < len(row) else ""
    org = row[org_idx] if org_idx >= 0 and org_idx < len(row) else ""
    domain = row[domain_idx] if domain_idx >= 0 and domain_idx < len(row) else ""
    if date and name:
        models.append((date, name, org, domain))

models.sort(key=lambda x: x[0], reverse=True)
for date, name, org, domain in models[:20]:
    print(f"  {date} | {name} | {org} | {domain}")
