# Atmos Weather Intelligence
## Deploy the real full-stack app

[**Deploy Atmos on Render (frontend + FastAPI backend)**](https://render.com/deploy?repo=https://github.com/JakiyaJackson12/atmos-weather-intelligence)

This repository now includes the complete frontend, Python backend, dependencies, automated GitHub full-stack tests, and a `render.yaml` deployment blueprint. After deploying, check `/api/health` and `/api/docs` on the new Render URL. The existing Netlify URL is a static frontend demonstration **until** the full-stack service is live.

**Storage note:** The included SQLite database on a free Render service is ephemeral and resets when its instance restarts. Choose persistent storage before describing database records as durable. Free web services may also sleep after inactivity.

**Live interactive demo:** [Open Atmos live demo](https://atmos-weather-intelligence.netlify.app)


A clean, interactive weather dashboard powered by live Open-Meteo weather and air-quality data.

## What you can explore

- Search cities and get hourly and seven-day forecasts.
- Compare weather across two cities and switch between °F/°C.
- View air quality and weather visualizations, with geolocation support.
- Use the frontend directly with Open-Meteo, or optionally run the FastAPI proxy backend with caching and SQLite request logs.

**Accurate positioning:** Atmos is a **weather API integration and frontend engineering** project, **not** an AI/ML forecasting system. Open-Meteo provides forecast data; any activity suggestions use explicit JavaScript rules.

## Stack

JavaScript, HTML, CSS, Open-Meteo APIs; Python / FastAPI optional backend, SQLite request logs.

## Run the static frontend

```bash
python -m http.server 8000
```

Open <http://localhost:8000>. Internet access is required for weather requests.

## Run full-stack locally

```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

## Tests

```bash
PYTHONPATH=api python -m pytest api/tests/test_api.py -q
```

## Deployment and limitations

The static frontend can be hosted independently and retrieves live Open-Meteo data directly. The optional Python backend needs separate hosting to be publicly accessible. Automated tests use mocked API responses and do not establish current Open-Meteo availability.

Created by Jakiya Jackson.
