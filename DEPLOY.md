# Deploying Bloombly

## The globe (static frontend): recommended, free, ~2 min

The frontend is a static site (HTML + JS + GeoJSON). Everything it needs lives under
`frontend/public/`, including the data (`frontend/public/data/...`), so it deploys to any
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
- Add the live URL near the top of `README.md`.
- *(Optional)* Point `bloomly.earth` at the new deploy in **Cloudflare DNS**, and set
  Cloudflare **SSL/TLS mode = Full** so the custom domain stops throwing the SSL error.

Also works on Netlify / Cloudflare Pages / GitHub Pages. Same idea: serve `frontend/public`.

## The ML API (optional, only for live, on-demand prediction)

The globe does **not** need it, and the current frontend has no prediction UI, so this only
matters if you want to run the forecasting API on its own. Before it can deploy:

- `api/Dockerfile` is currently **empty**; it needs a real Dockerfile.
- **No trained model is committed**. Retrain via the `ml/` pipeline (needs a Google Earth
  Engine service account) and save the model so the API can load it.
- Set `EE_PROJECT` and `GOOGLE_APPLICATION_CREDENTIALS_JSON` (see `api/.env.example`) on the
  host (Railway / Render / Fly.io).
- Once the API is live, call it directly (start with `GET /api/health`). Wiring it back into the
  frontend would be new work, since the prediction UI was removed.
