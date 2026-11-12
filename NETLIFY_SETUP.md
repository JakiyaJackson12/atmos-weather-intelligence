# Netlify + Python full-stack setup

This repository includes **both** the real FastAPI project and the Netlify frontend + same-origin API bridge. Netlify builds the website and JavaScript function; **the Python application must run on an external Python host**.

Existing Netlify site: https://atmos-weather-intelligence.netlify.app

1. In that **existing** Netlify project, open **Project configuration → Developer settings → Continuous deployment → Repository** and link the matching GitHub repository, branch `main`. This uses the checked-in `netlify.toml` and builds the API proxy function.
2. Deploy the Python service from this same repo on Render using `render.yaml` (or another Python-capable host). In the hosting service verify `/api/health` works.
3. In the matching Netlify site's environment variables, set `PYTHON_API_ORIGIN` to the **HTTPS origin** of the running Python API, with **no trailing `/api`** (example `https://your-backend.onrender.com`). Trigger a fresh Netlify deploy.
4. Verify `https://atmos-weather-intelligence.netlify.app/api/health` responds with a JSON object shaped like `{ ok: true, product: 'atmos' }`, and try the public UI.
5. Only then describe the Netlify site as a *live full-stack* demonstration.

**Why two services?** Netlify Functions run JavaScript, TypeScript, or Go, not the project's Python FastAPI/sklearn process. The route `/api/*` is proxied through a same-origin Netlify Function to your actual Python backend. The site still works in static demonstration mode if the API is not available.

**Limits:** The frontend searches live Open-Meteo data even before the Python proxy is connected. The real FastAPI cache and SQLite request logging require the configured backend. An ephemeral SQLite file can reset after the Python host restarts, so don't claim persistent production storage without a persistent volume or managed DB.

This file is configuration guidance, **not evidence that Netlify is currently connected or the Python backend is publicly deployed**.
