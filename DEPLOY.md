# Deploying Bloombly

## The globe (static frontend) — recommended, free, ~2 min

The frontend is a static site (HTML + JS + GeoJSON). Everything it needs lives under
`frontend/public/` — including the data (`frontend/public/data/...`) — so it deploys to any
static host with **no build step**.

### Vercel (dashboard)

1. Push this repo to GitHub.
2. In Vercel: **New Project → Import** this repo.
3. **Root Directory** = `frontend/public`
4. **Framework Preset** = Other · **Build Command** = *(empty)* · **Output Directory** = *(empty)*
5. **Deploy.** You get `https://<name>.vercel.app` with working HTTPS.

### Vercel (CLI)

```bash
cd frontend/public
npx vercel          # first run: log in + link the project
npx vercel --prod   # production deploy
```

After deploying:
- Update the **Live Demo** badge URL in `README.md` to the new `*.vercel.app` URL.
- *(Optional)* Point `bloomly.earth` at the new deploy in **Cloudflare DNS**, and set
  Cloudflare **SSL/TLS mode = Full** so the custom domain stops throwing the SSL error.

Also works on Netlify / Cloudflare Pages / GitHub Pages — same idea: serve `frontend/public`.

## The ML API (optional — only for live, on-demand prediction)

The globe does **not** need this. Enable it only if you want the "Predict blooms" button to
hit a live model. Before it can deploy:

- `api/Dockerfile` is currently **empty** — it needs a real Dockerfile.
- **No trained model is committed** — retrain via the `ml/` pipeline (needs a Google Earth
  Engine service account) and save the model so the API can load it.
- Set `EE_PROJECT` and `GOOGLE_APPLICATION_CREDENTIALS_JSON` (see `api/.env.example`) on the
  host (Railway / Render / Fly.io).
- Once the API is live, set `window.BLOOMBLY_API_URL` in `frontend/public/index.html` to the
  API origin and redeploy the frontend.
