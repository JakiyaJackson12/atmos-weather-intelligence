import { searchCities, getForecast, DEFAULT_LOCATION } from './weather.js';
import { makeInsights, aqiLabel, weatherText, weatherSymbol } from './insights.js';

const $ = (id) => document.getElementById(id);
let location = DEFAULT_LOCATION;
let comparison = null;
let snapshot = null;
let celsius = false;
let currentController = null;
let searchController = null;
let searchTimer = null;
let suggestions = [];

const stored = localStorage.getItem('atmos-location');
if (stored) { try { const parsed = JSON.parse(stored); if (Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude) && typeof parsed.name === 'string') location = parsed; } catch {} }
celsius = localStorage.getItem('atmos-celsius') === 'true';

const degree = (fahrenheit) => fahrenheit == null ? '—' : `${Math.round(celsius ? (fahrenheit - 32) * 5 / 9 : fahrenheit)}°`;
const weekday = (date) => new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
const hour = (time) => { const h = Number(time.slice(11, 13)); return `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`; };
const localTime = (timezone) => new Intl.DateTimeFormat('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(new Date());
const localClock = (time) => { const h = Number(time.slice(11, 13)); return `${h % 12 || 12}:${time.slice(14, 16)} ${h < 12 ? 'AM' : 'PM'}`; };
const fullName = (city) => [city.name, city.admin1, city.country].filter(Boolean).join(', ');

function showError(text) { $('error').textContent = text; $('error').hidden = !text; }
function setBusy(busy) { $('loading').hidden = !busy; if (busy) $('dashboard').hidden = true; }

async function load(city = location) {
  currentController?.abort();
  currentController = new AbortController();
  const signal = currentController.signal;
  location = city;
  showError(''); setBusy(true);
  try {
    const data = await getForecast(city, signal);
    if (signal.aborted) return;
    snapshot = data;
    localStorage.setItem('atmos-location', JSON.stringify(city));
    render(); setBusy(false); $('dashboard').hidden = false;
  } catch (error) {
    if (error.name === 'AbortError') return;
    setBusy(false); showError(`${error.message} Try again or search for another city.`);
  }
}

function render() {
  if (!snapshot) return;
  const { weather: w, air: a } = snapshot;
  const { current: c, daily: d, hourly: h } = w;
  $('location-title').textContent = fullName(location);
  $('local-time').textContent = `${localTime(w.timezone)} · Local time`;
  $('temperature').textContent = degree(c.temperature_2m);
  $('feels-like').textContent = `Feels like ${degree(c.apparent_temperature)}${celsius ? 'C' : 'F'}`;
  $('condition').textContent = weatherText(c.weather_code);
  $('weather-icon').textContent = weatherSymbol(c.weather_code, Boolean(c.is_day));
  $('high-low').textContent = `${degree(d.temperature_2m_max[0])} / ${degree(d.temperature_2m_min[0])}`;
  $('rain-chance').textContent = `${Math.round(d.precipitation_probability_max[0] ?? 0)}%`;
  $('wind').textContent = `${Math.round(c.wind_speed_10m)} mph`;
  $('humidity').textContent = `${Math.round(c.relative_humidity_2m)}%`;
  $('uv').textContent = d.uv_index_max[0] == null ? '—' : Number(d.uv_index_max[0]).toFixed(1);
  $('uv-detail').textContent = d.uv_index_max[0] >= 6 ? 'High protection advised' : 'Daily maximum';
  $('aqi').textContent = a?.current?.us_aqi == null ? '—' : Math.round(a.current.us_aqi);
  $('aqi-detail').textContent = `${aqiLabel(a?.current?.us_aqi)} · US AQI`;
  $('sunset').textContent = localClock(d.sunset[0]);
  $('sunrise').textContent = `Sunrise ${localClock(d.sunrise[0])}`;
  const insight = makeInsights(w, a);
  $('brief-title').textContent = insight.headline;
  $('brief-copy').textContent = insight.description;
  $('recommendation-chips').replaceChildren(...insight.chips.map((chip) => { const el = document.createElement('span'); el.className = 'chip'; el.textContent = chip; return el; }));
  renderHourly(h, c.time);
  renderDaily(d);
  $('unit-toggle').textContent = celsius ? '°C → °F' : '°F → °C';
  if (comparison) renderComparison();
}

function renderHourly(hourly, now) {
  const start = Math.max(0, hourly.time.findIndex((t) => t >= now.slice(0, 13)));
  const arr = hourly.time.slice(start, start + 24).map((t, i) => ({ time: t, temp: hourly.temperature_2m[start + i], rain: hourly.precipitation_probability[start + i] ?? 0, code: hourly.weather_code[start + i] }));
  if (!arr.length) { $('hourly-chart').textContent = 'Hourly data unavailable.'; return; }
  const values = arr.map((x) => celsius ? (x.temp - 32) * 5 / 9 : x.temp);
  const min = Math.floor(Math.min(...values) - 4), max = Math.ceil(Math.max(...values) + 4);
  const W = 1020, H = 230, left = 26, right = 22, top = 35, bottom = 58;
  const xpos = (i) => left + i * (W - left - right) / (arr.length - 1 || 1);
  const ypos = (v) => top + (max - v) * (H - top - bottom) / (max - min || 1);
  const points = values.map((v, i) => `${xpos(i).toFixed(1)},${ypos(v).toFixed(1)}`).join(' ');
  const labels = arr.filter((_, i) => i % 3 === 0 || i === arr.length - 1).map((x) => arr.indexOf(x));
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hourly temperature line chart" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b0f6d0" stop-opacity="0.20"/><stop offset="1" stop-color="#b0f6d0" stop-opacity="0"/></linearGradient></defs>
    ${[0, 1, 2, 3].map((i) => `<line x1="${left}" x2="${W-right}" y1="${top + i * 39}" y2="${top + i * 39}" stroke="#2b374d" stroke-dasharray="4 7"/>`).join('')}
    <polygon points="${left},${H-bottom} ${points} ${W-right},${H-bottom}" fill="url(#chart-fill)"/><polyline fill="none" stroke="#b1ffd6" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" points="${points}"/>
    ${labels.map((i) => `<circle cx="${xpos(i)}" cy="${ypos(values[i])}" r="4.5" fill="#b1ffd6" stroke="#162538" stroke-width="2"/><text x="${xpos(i)}" y="${ypos(values[i])-15}" text-anchor="middle" font-size="16" fill="#f5f7ff" font-weight="600">${Math.round(values[i])}°</text><text x="${xpos(i)}" y="${H-27}" text-anchor="middle" font-size="13" fill="#aebdd1">${hour(arr[i].time)}</text><text x="${xpos(i)}" y="${H-7}" text-anchor="middle" font-size="12" fill="#82b9cb">${Math.round(arr[i].rain)}% ☂</text>`).join('')}
  </svg>`;
  $('hourly-chart').innerHTML = svg;
}

function renderDaily(d) {
  const fragment = document.createDocumentFragment();
  d.time.forEach((date, i) => {
    const row = document.createElement('div'); row.className = 'daily-row';
    const label = document.createElement('strong'); label.textContent = i === 0 ? 'Today' : weekday(date);
    const symbol = document.createElement('span'); symbol.className = 'day-symbol'; symbol.textContent = weatherSymbol(d.weather_code[i]);
    const desc = document.createElement('span'); desc.className = 'day-description'; desc.textContent = weatherText(d.weather_code[i]);
    const rain = document.createElement('span'); rain.className = 'day-rain'; rain.textContent = `☂ ${Math.round(d.precipitation_probability_max[i] ?? 0)}%`;
    const temps = document.createElement('span'); temps.className = 'day-temps'; temps.textContent = `${degree(d.temperature_2m_max[i])}  ${degree(d.temperature_2m_min[i])}`;
    row.append(label, symbol, desc, rain, temps); fragment.appendChild(row);
  });
  $('daily-list').replaceChildren(fragment);
}

function renderComparison() {
  if (!comparison || !snapshot) return;
  const cities = [ { place: location, data: snapshot }, comparison ];
  $('compare-results').replaceChildren(...cities.map(({ place, data }) => {
    const div = document.createElement('div'); div.className = 'compare-result-card';
    const title = document.createElement('div'); title.className = 'compare-location'; title.textContent = fullName(place);
    const temp = document.createElement('div'); temp.className = 'compare-temperature'; temp.textContent = degree(data.weather.current.temperature_2m);
    const info = document.createElement('div'); info.className = 'compare-info'; info.textContent = `${weatherText(data.weather.current.weather_code)} · Rain up to ${Math.round(data.weather.daily.precipitation_probability_max[0] ?? 0)}% today`;
    div.append(title, temp, info); return div;
  }));
}

$('city-search').addEventListener('input', (event) => {
  const value = event.target.value.trim(); clearTimeout(searchTimer); searchController?.abort();
  if (value.length < 2) { $('search-results').hidden = true; return; }
  searchTimer = setTimeout(async () => {
    searchController = new AbortController();
    try {
      suggestions = await searchCities(value, searchController.signal);
      const menu = $('search-results'); menu.replaceChildren();
      suggestions.forEach((city) => {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'search-result'; btn.textContent = fullName(city);
        btn.addEventListener('click', () => { menu.hidden = true; $('city-search').value = ''; load(city); }); menu.append(btn);
      });
      if (!suggestions.length) { const empty = document.createElement('div'); empty.className = 'search-empty'; empty.textContent = 'No matching cities found'; menu.append(empty); }
      menu.hidden = false;
    } catch (error) { if (error.name !== 'AbortError') showError('City search failed. Check your connection and try again.'); }
  }, 280);
});
$('city-search').addEventListener('keydown', (e) => { if (e.key === 'Enter' && suggestions[0]) { e.preventDefault(); $('search-results').hidden = true; $('city-search').value = ''; load(suggestions[0]); } if (e.key === 'Escape') $('search-results').hidden = true; });
document.addEventListener('click', (e) => { if (!e.target.closest('.search-area')) $('search-results').hidden = true; });
$('refresh').addEventListener('click', () => load());
$('unit-toggle').addEventListener('click', () => { celsius = !celsius; localStorage.setItem('atmos-celsius', String(celsius)); render(); });
$('locate').addEventListener('click', () => {
  if (!navigator.geolocation) { showError('Your browser does not support geolocation. Search for your city instead.'); return; }
  navigator.geolocation.getCurrentPosition(({ coords }) => load({ name: 'Your location', latitude: coords.latitude, longitude: coords.longitude }), () => showError('Location access was denied or unavailable. Search for a city instead.'), { timeout: 10000 });
});
$('compare-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const value = $('compare-city').value.trim(); if (!value) return;
  const box = $('compare-results'); box.textContent = 'Finding city and comparing forecasts…';
  try {
    const cities = await searchCities(value); if (!cities.length) throw new Error('No matching city found.');
    const city = cities[0]; const data = await getForecast(city); comparison = { place: city, data }; renderComparison();
  } catch (error) { box.textContent = `Could not compare: ${error.message}`; }
});
load();
