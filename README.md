# Toxic Traits

**Your city's air, as a dating profile.** Every CPCB air-quality monitoring station in Delhi NCR, Bengaluru, Mumbai, Hyderabad, Chennai and Kolkata becomes a 3D smog creature. The dirtier the air, the higher it floats, the angrier it looks and the more it coughs. Tap one for its profile: live AQI, cigarettes-per-day, toxic trait, red flag, green flag (reluctantly). Swipe left to move to the hills.

- **Data:** CPCB real-time feed on data.gov.in. AQI is the higher of the PM2.5 and PM10 sub-indices (24-hour average). If CPCB is down, the site falls back to Open-Meteo's modelled air at the same station coordinates (`lib/stations.json`) and labels it "modelled".
- **Cigarettes:** Berkeley Earth's rule of thumb, 22 µg/m³ of PM2.5 for a day ≈ 1 cigarette.
- **AI:** one call per city per hour writes all the roasts; the result is cached in Redis and on the CDN. Visitors never trigger AI directly. Without a key, hand-written roasts are used.
- **Keys:** ← → browse · C next city · V versus · T tilt-shift · / hide UI

`GET /api/city?c=ncr|blr|mum|hyd|chn|kol`
