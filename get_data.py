import json
import requests

def get_profile(region):
    url = f"http://localhost:3000/api/climate/profile/{region}"
    r = requests.get(url)
    return r.json()

for region in ["australia", "cambodia"]:
    data = get_profile(region)
    print(f"Region: {region}")
    cd = data.get('countryData', {})
    pm = cd.get('precipMonthly', {})
    years = sorted([int(y) for y in pm.keys()])
    if years:
        print(f"PrecipMonthly years: {years[0]} to {years[-1]}")
        print(f"Sample for {years[0]}: {pm[str(years[0])]}")
    else:
        print("No precipMonthly data found")
