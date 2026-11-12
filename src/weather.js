// Dedicated API layer: keeps network calls separate from the user interface.
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://geocoding-api.open-meteo.com/v1/get';
// Prefer the full-stack API when served from FastAPI; static Netlify fallback
// continues to query public Open-Meteo directly.
let backendAvailability = null;
async function hasBackend() {
  if (backendAvailability !== null) return backendAvailability;
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    const data = r.ok ? await r.json() : {};
    backendAvailability = !!(data.ok && data.product === 'atmos');
  } catch { backendAvailability = false; }
  return backendAvailability;
}


const US_STATES = Object.fromEntries(
  'AL Alabama;AK Alaska;AZ Arizona;AR Arkansas;CA California;CO Colorado;CT Connecticut;DE Delaware;FL Florida;GA Georgia;HI Hawaii;ID Idaho;IL Illinois;IN Indiana;IA Iowa;KS Kansas;KY Kentucky;LA Louisiana;ME Maine;MD Maryland;MA Massachusetts;MI Michigan;MN Minnesota;MS Mississippi;MO Missouri;MT Montana;NE Nebraska;NV Nevada;NH New Hampshire;NJ New Jersey;NM New Mexico;NY New York;NC North Carolina;ND North Dakota;OH Ohio;OK Oklahoma;OR Oregon;PA Pennsylvania;RI Rhode Island;SC South Carolina;SD South Dakota;TN Tennessee;TX Texas;UT Utah;VT Vermont;VA Virginia;WA Washington;WV West Virginia;WI Wisconsin;WY Wyoming;DC District of Columbia'
    .split(';').map(entry => {
      const [abbrev, ...words] = entry.split(' ');
      return [abbrev.toLowerCase(), words.join(' ')];
    })
);
const cleanPlace = s => String(s || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
function parseLocationQuery(input) {
  const value = String(input || '').trim();
  if (value.includes(',')) {
    const [city, statePart] = value.split(',').map(s => s.trim());
    const abbr = cleanPlace(statePart);
    return { city, state: US_STATES[abbr] || statePart };
  }
  const lower = cleanPlace(value);
  const allStates = [...new Set(Object.values(US_STATES))].sort((a,b) => b.length - a.length);
  for (const state of allStates) {
    if (lower.endsWith(' ' + state.toLowerCase()))
      return { city: value.slice(0, -state.length).trim(), state };
  }
  const parts = value.split(/\s+/);
  const last = cleanPlace(parts.at(-1));
  if (parts.length >= 2 && US_STATES[last])
    return { city: parts.slice(0,-1).join(' '), state: US_STATES[last] };
  return { city: value, state: '' };
}

async function getJSON(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Weather service unavailable (HTTP ${response.status}).`);
  const json = await response.json();
  if (json.error) throw new Error(json.reason || 'The weather service could not complete your request.');
  return json;
}

export async function searchCities(name, signal) {
  if (name.trim().length < 2) return [];
  if (await hasBackend()) {
    const url = new URL('/api/search', location.origin);
    url.searchParams.set('name', name.trim());
    const data = await getJSON(url, signal);
    return data.results || [];
  }
  const parsed = parseLocationQuery(name);
  const url = new URL(GEO_URL);
  url.search = new URLSearchParams({ name: parsed.city, count: parsed.state ? '100' : '15', language: 'en', format: 'json' }).toString();
  const data = await getJSON(url, signal);
  let options = data.results || [];
  const exactCity = options.filter(item => cleanPlace(item.name) === cleanPlace(parsed.city));
  if (exactCity.length) options = exactCity;
  if (parsed.state) {
    options = options.filter(item =>
      item.country_code === 'US' &&
      cleanPlace(item.name) === cleanPlace(parsed.city) &&
      cleanPlace(item.admin1) === cleanPlace(parsed.state));
  }
  return options;
}

export async function getForecast(location, signal) {
  if (await hasBackend()) {
    const url = new URL('/api/forecast', window.location.origin);
    url.searchParams.set('latitude', location.latitude);
    url.searchParams.set('longitude', location.longitude);
    return await getJSON(url, signal);
  }
  const args = { latitude: location.latitude, longitude: location.longitude, timezone: 'auto', temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', forecast_days: 7, current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m', hourly: 'temperature_2m,precipitation_probability,weather_code,uv_index', daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max' };
  const wUrl = new URL(FORECAST_URL);
  wUrl.search = new URLSearchParams(args).toString();
  const aUrl = new URL(AIR_URL);
  aUrl.search = new URLSearchParams({ latitude: location.latitude, longitude: location.longitude, current: 'us_aqi,pm2_5', timezone: 'auto' }).toString();
  // AQI failure should not prevent weather data from loading.
  const [weather, air] = await Promise.all([
    getJSON(wUrl, signal),
    getJSON(aUrl, signal).catch((err) => { if (err.name === 'AbortError') throw err; return null; })
  ]);
  return { weather, air };
}

export const DEFAULT_LOCATION = { name: 'Huntsville', admin1: 'Texas', country: 'United States', latitude: 30.7235, longitude: -95.5508 };
