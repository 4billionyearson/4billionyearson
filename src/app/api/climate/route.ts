import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat or lon' }, { status: 400 });
  }

  try {
    // 1. Grid Snapping: Round latitude and longitude to the nearest whole integer
    // This creates an approx 111km x 70km grid box.
    const gridLat = Math.round(parseFloat(lat));
    const gridLon = Math.round(parseFloat(lon));
    const cacheKey = `climate:grid:${gridLat}:${gridLon}`;

    // Dynamic Date Calculations
    const now = new Date();
    // Use day 0 to get the last day of the previous calendar month
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth(), 0);
    const endDateStr = `${prevMonthDate.getFullYear()}-${(prevMonthDate.getMonth() + 1).toString().padStart(2, '0')}-${prevMonthDate.getDate().toString().padStart(2, '0')}`;
    
    // 2. Check Upstash Redis cache if available
    let redis: Redis | null = null;
    try {
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        redis = new Redis({
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN,
        });
        
        const cachedData: any = await redis.get(cacheKey);
        
        // If we have cached data AND it was updated for this exact target month/year, return it immediately
        if (cachedData && cachedData.metadata && cachedData.metadata.targetEndDate === endDateStr) {
          return NextResponse.json({ 
            yearlyData: cachedData.yearlyData, 
            monthlyData: cachedData.monthlyData,
            dataSource: 'redis-cache'
          });
        }
      }
    } catch (e: any) {
      console.warn("Redis caching unavailable or failed:", e.message);
    }

    // NOAA annual data update availability is safe at currentYear - 1
    const lastFullYearStr = (now.getFullYear() - 1).toString();

    // 3. Fetch Open-Meteo Data using completely snapped grid coordinates
    const omUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${gridLat}&longitude=${gridLon}&start_date=1950-01-01&end_date=${endDateStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&timezone=Europe%2FLondon`;
    const omRes = await fetch(omUrl, { next: { revalidate: 2592000 } });
    const omData = await omRes.json();

    if (omData.error) throw new Error(omData.reason);

    // 2. Fetch NOAA Global Data cached for 30 days
    const noaaUrl = `https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/globe/land_ocean/ytd/12/1950-${lastFullYearStr}.json`;
    const noaaRes = await fetch(noaaUrl, { next: { revalidate: 2592000 } });
    const noaaData = await noaaRes.json();
    
    // Convert NOAA anomalies into absolute temperatures (Base: ~13.9°C)
    const globalData: Record<string, number> = {};
    for (const [year, data] of Object.entries(noaaData.data)) {
      globalData[year] = 13.9 + parseFloat((data as any).anomaly);
    }

    const daily = omData.daily;
    const yearlyStats: Record<string, any> = {};
    const monthlyStats: Record<string, any> = {};

    // 3. Process the array exactly like Pandas Dataframes 
    for (let i = 0; i < daily.time.length; i++) {
       const dateStr = daily.time[i];
       const year = dateStr.substring(0, 4);
       const month = dateStr.substring(5, 7);
       
       const maxT = daily.temperature_2m_max[i];
       const minT = daily.temperature_2m_min[i];
       const precip = daily.precipitation_sum[i] || 0;
       const snow = daily.snowfall_sum[i] || 0;

       if (maxT === null || minT === null) continue;

       // Aggregate Yearly Data
       if (!yearlyStats[year]) {
          yearlyStats[year] = { 
              year: parseInt(year), maxSum: 0, minSum: 0, days: 0, 
              frostDays: 0, summerDays: 0, precipSum: 0, snowSum: 0 
          };
       }
       yearlyStats[year].maxSum += maxT;
       yearlyStats[year].minSum += minT;
       yearlyStats[year].days += 1;
       if (minT < 0) yearlyStats[year].frostDays += 1;
       if (maxT >= 25) yearlyStats[year].summerDays += 1;
       yearlyStats[year].precipSum += precip;
       yearlyStats[year].snowSum += snow;

       // Aggregate Monthly Baseline (1950 - 2000)
       const yearInt = parseInt(year);
       if (yearInt >= 1950 && yearInt <= 2000) {
           if (!monthlyStats[month]) monthlyStats[month] = { maxSum: 0, days: 0 };
           monthlyStats[month].maxSum += maxT;
           monthlyStats[month].days += 1;
       }
    }

    // 4. Format Yearly Data ready for Recharts
    let yearlyArray = Object.values(yearlyStats).map((y: any) => ({
        year: y.year,
        maxTemp: Number((y.maxSum / y.days).toFixed(2)),
        minTemp: Number((y.minSum / y.days).toFixed(2)),
        frostDays: y.frostDays,
        summerDays: y.summerDays,
        precip: Number(y.precipSum.toFixed(2)),
        snow: Number(y.snowSum.toFixed(2)),
        globalTemp: globalData[y.year.toString()] ? Number(globalData[y.year.toString()].toFixed(2)) : null
    })).filter(y => y.year <= parseInt(lastFullYearStr)).sort((a, b) => a.year - b.year); // Exclude incomplete current year for yearly trends

    // Calculate 10-year rolling averages
    for (let i = 0; i < yearlyArray.length; i++) {
        if (i >= 9) {
            const window = yearlyArray.slice(i - 9, i + 1);
            yearlyArray[i].maxTempRolling = Number((window.reduce((acc, curr) => acc + curr.maxTemp, 0) / 10).toFixed(2));
            yearlyArray[i].minTempRolling = Number((window.reduce((acc, curr) => acc + curr.minTemp, 0) / 10).toFixed(2));
            yearlyArray[i].frostDaysRolling = Number((window.reduce((acc, curr) => acc + curr.frostDays, 0) / 10).toFixed(2));
            yearlyArray[i].summerDaysRolling = Number((window.reduce((acc, curr) => acc + curr.summerDays, 0) / 10).toFixed(2));
            yearlyArray[i].precipRolling = Number((window.reduce((acc, curr) => acc + curr.precip, 0) / 10).toFixed(2));
            yearlyArray[i].snowRolling = Number((window.reduce((acc, curr) => acc + curr.snow, 0) / 10).toFixed(2));
        } else {
            yearlyArray[i].maxTempRolling = null;
            yearlyArray[i].minTempRolling = null;
            yearlyArray[i].frostDaysRolling = null;
            yearlyArray[i].summerDaysRolling = null;
            yearlyArray[i].precipRolling = null;
            yearlyArray[i].snowRolling = null;
        }
    }

    // 5. Format Recent 12 Months dynamically based on the previous completed month
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const recentMonthsList = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() - i, 1);
        recentMonthsList.push({
            year: d.getFullYear(),
            month: (d.getMonth() + 1).toString().padStart(2, '0')
        });
    }

    const monthlyArray = recentMonthsList.map(item => {
        let recentSum = 0; let recentCount = 0;
        for (let i = 0; i < daily.time.length; i++) {
           if (daily.time[i].substring(0, 7) === `${item.year}-${item.month}`) {
               if (daily.temperature_2m_max[i] !== null) {
                   recentSum += daily.temperature_2m_max[i];
                   recentCount += 1;
               }
           }
        }
        
        const baseline = monthlyStats[item.month];
        
        return {
            monthLabel: `${monthNames[parseInt(item.month)]} ${item.year}`,
            recentMaxTemp: recentCount > 0 ? Number((recentSum / recentCount).toFixed(2)) : null,
            historicMaxTemp: baseline && baseline.days > 0 ? Number((baseline.maxSum / baseline.days).toFixed(2)) : null
        };
    });

    const responsePayload = {
        yearlyData: yearlyArray,
        monthlyData: monthlyArray,
    };

    // 4. Save to Redis for next time
    if (redis) {
      try {
        await redis.set(cacheKey, {
          ...responsePayload,
          metadata: {
            gridLat,
            gridLon,
            lastFetched: new Date().toISOString(),
            targetEndDate: endDateStr
          }
        });
      } catch (e) {
        console.error("Failed to save to Redis:", e);
      }
    }

    return NextResponse.json({ ...responsePayload, dataSource: 'open-meteo-api' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}