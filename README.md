# Atmos — Weather Intelligence

A responsive, real-data weather intelligence web application for exploring forecasts, local air quality, and explainable day-planning suggestions.

## Features
- Search cities worldwide with an autocomplete geocoding API
- Current temperature, feels-like, humidity, wind, UV, sunrise/sunset
- Visual hourly temperature chart with precipitation probability
- Seven-day weather forecast
- US AQI and health-context category when available
- Rules-based weather briefing explaining actionable takeaways
- Compare two cities' live conditions
- Browser geolocation (requires permission and localhost/HTTPS)
- Fahrenheit/Celsius toggle and remembered location preference
- Async loading states, network error messages, mobile-responsive design

## Run locally

1. Download and extract the project.
2. Open the project folder in VS Code.
3. In a terminal at the project root, run:

```sh
python3 -m http.server 5500
```

4. Open http://localhost:5500 in your browser. (Avoid directly opening `index.html` with a `file://` URL; the app uses ES modules.)

There are no npm dependencies or API keys. **Internet connectivity is required** to load live API data and web fonts.

## Architecture

```text
index.html             Semantic HTML / application markup
src/styles.css         Layout, responsive design, state styling
src/app.js             UI state, event handlers, rendering, charts
src/weather.js         REST API requests, service error handling
src/insights.js        Deterministic weather recommendations
```

`app.js` calls `weather.js`, which independently retrieves forecast and air-quality data. Forecast is required; air quality is optional, so the weather application still works when the air-quality service fails. The result is rendered to semantic HTML components. `insights.js` derives explainable recommendations from forecast thresholds instead of claiming to use AI.

## External services
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api)

Open-Meteo provides no-key access for **noncommercial** use under applicable usage terms. Check its license, attribution, and traffic policies before commercial deployment.

## Known limitations / potential upgrades
- Weather is modeled forecast data, not official severe-weather warnings. No emergency alerts are provided.
- The current 'rain chance' summaries refer to *maximum hourly precipitation probability* from the daily API. They are not the chance of rain at some point during the whole day.
- A city comparison matches the top geocoding result. Add a disambiguation dropdown for duplicate city names.
- Search results are not keyboard-arrow navigable yet; Enter uses the top result. Enhance with proper combobox ARIA semantics.
- Displayed hourly chart labels reflect forecast model hours. Timezone and DST edge cases can be improved by using Unix timestamps.
- Improve client caching, automated tests, monitoring, and full backend architecture in v2.
- Browser-only localStorage is used for basic preferences, **not** user accounts or secure storage.

## Recruiter pitch
> I built Atmos, a responsive weather intelligence app that combines multiple REST APIs and translates structured forecast data into actionable insights. I separated the network and business-logic layers, made air-quality information fault-tolerant, implemented an hourly visualization, and handled asynchronous search, persistence, and loading/error states. One key design decision was keeping recommendations deterministic and explainable instead of mislabeling them as AI.

## Suggested resume bullets (verify real outcomes before claiming metrics)
- Developed a responsive weather intelligence application using vanilla JavaScript, ES modules, CSS, and public REST APIs, integrating current conditions, 7-day forecasts, and air-quality data.
- Designed modular API and decision-rule layers with graceful degradation for optional data sources, asynchronous search, and persistent user preferences.
- Implemented SVG-based hourly forecast visualizations and city comparisons to turn structured meteorological datasets into accessible planning tools.
