// Dedicated API layer: keeps network calls separate from the user interface.
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://geocoding-api.open-meteo.com/v1/get';

async function getJSON(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Weather service unavailable (HTTP ${response.status}).`);
  const json = await response.json();
  if (json.error) throw new Error(json.reason || 'The weather service could not complete your request.');
  return json;
}

export async function searchCities(name, signal) {
  if (name.trim().length < 2) return [];
  const url = new URL(GEO_URL);
  url.search = new URLSearchParams({ name: name.trim(), count: '7', language: 'en', format: 'json' }).toString();
  const data = await getJSON(url, signal);
  return data.results || [];
}

export async function getForecast(location, signal) {
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
