Deployment guide

This repository contains a Flask application and static assets.

Goals implemented:
- GitHub Actions to deploy `static/` to Cloudflare Pages
- GitHub Actions to deploy the app to Railway via Railway CLI

Required GitHub repository secrets

- `CLOUDFLARE_API_TOKEN` — API token with `Pages:Edit` (and `Account:Read`) permissions
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID
- `CLOUDFLARE_PROJECT_NAME` — Cloudflare Pages project name
- `RAILWAY_API_KEY` — Railway API key with deploy access

Cloudflare Pages setup (publish static/)

1. Create a Cloudflare Pages project or use the existing one.
2. In GitHub repository settings > Secrets, add the three Cloudflare secrets.
3. The workflow `.github/workflows/deploy-cloudflare-pages.yml` will deploy `static/` on push.

If you host the frontend separately from the Flask backend, set `API_BASE` in your backend environment to the Railway app URL, e.g. `https://your-app.up.railway.app`.
Use `ALLOWED_ORIGINS` on the backend to permit the frontend origin, for example `https://www.kollrax.com`.

The frontend also includes `static/js/api-config.js` as a safe fallback so `window.API_BASE` is always defined for client-side code.

Railway setup (host Flask backend)

1. On Railway, create a new project and connect your GitHub repository (or allow the GitHub Action to run).
2. In Railway project settings, add environment variable `FLASK_SECRET_KEY` (value: a strong random string).
3. Add secret `RAILWAY_API_KEY` to GitHub repository settings.
4. The workflow `.github/workflows/deploy-railway.yml` attempts to run `railway up` using the Railway CLI.

If you prefer the Railway UI:
- Connect the repo, set the start command to:

```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

and build command:

```bash
pip install -r requirements.txt
```

Cloudflare DNS + Railway domain

- After Railway assigns a domain (e.g. `project.up.railway.app`) set a CNAME in Cloudflare DNS pointing your site `www.example.com` to that Railway domain.
- Use Cloudflare proxy (orange cloud) to enable CDN and WAF.

Notes

- The GitHub Actions require the repository secrets above.
- The Railway deploy step in the action may require additional manual project setup.
- For persistent storage, move `data/state.json` to an external DB or object storage.

Commands to test locally

```bash
pip install -r requirements.txt
gunicorn app:app --bind 0.0.0.0:5000
# visit http://localhost:5000
```
