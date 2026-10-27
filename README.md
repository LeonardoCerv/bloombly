# Bloombly

**50 years of plant blooms on Earth, told on a living 3D globe.** Where life blooms, when in the year, and how the record grew decade by decade.

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![three.js](https://img.shields.io/badge/three.js-000000?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![globe.gl](https://img.shields.io/badge/globe.gl-2a9d8f)](https://globe.gl/)
[![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![Google Earth Engine](https://img.shields.io/badge/Google%20Earth%20Engine-4285F4?logo=googleearthengine&logoColor=white)](https://earthengine.google.com/)
[![NASA Space Apps 2025](https://img.shields.io/badge/NASA%20Space%20Apps%202025-0B3D91?logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[![Live site](https://img.shields.io/badge/Live%20site-bloombly.vercel.app-2a9d8f?logo=vercel&logoColor=white)](https://bloombly.vercel.app)
[![Watch the demo](https://img.shields.io/badge/Watch%20the%20demo-YouTube-FF0000?logo=youtube&logoColor=white)](https://youtu.be/On70ydW8hGE)

![Bloombly's density globe: hexagonal columns of bloom records rising from the continents, colored from deep blue through teal and magenta to pink, on a night-sky backdrop](docs/screenshots/hero.png)

---

## What you see

Bloombly opens straight on a living globe, turning slowly against a night sky. Then the story starts on its own. It begins in 1975 with only the first few records on the map. Year by year the record fills in and the columns climb, until 2025 shows half a century of flowering observations stacked on top of each other. A caption narrates as it goes ("Recorded through 1987, 8,974 blooms"), and when it reaches the present it loops back and tells it again.

Pause it at any year, click a column, and you meet the plant that blooms most often there.

![The 50-year story playing on its own: the density heatmap grows year by year from 1975 to 2025](docs/demo.gif)

| 1987 | 2003 |
| :---: | :---: |
| ![The 50-year story at 1987, early in the record, with the caption counting blooms recorded so far](docs/screenshots/story-1987.png) | ![The 50-year story at 2003, with the cumulative heatmap grown taller and denser than in 1987](docs/screenshots/story-2003.png) |

## Features

- **Living globe on load.** No landing page, no setup. The globe rotates slowly on a night-sky backdrop the moment the page opens.
- **Density heatmap by default.** Blooms are aggregated into hexagonal columns. Height and color (deep blue to teal to magenta to pink) both encode how many records fall in that cell, with a legend to read them.
- **A 50-year story that plays itself.** The timeline is cumulative, so the heatmap visibly grows from 1975 to 2025 while a caption narrates the running total. Play, pause, rewind, or step one year at a time.
- **Species cards.** Click any hexagon to open a card for the most common bloom in that area: its illustration, its family, how many blooms are recorded there, and its peak season.
- **Points mode.** Switch Point Style to Points to see individual blooms colored by season (spring, summer, fall, winter) with a matching legend, or recolor them by family or genus.
- **Filters.** Narrow the globe by family or genus, by distance from your location, or by bloom area.
- **Metrics panel.** Bloom count and coverage area at a glance.
- **Ambient soundscape.** An optional soundtrack synthesized live with the Web Audio API (no audio files), toggled from the corner button.

![A hexagon clicked on the globe, opening a species card with the genus illustration, plant family, bloom count and peak season](docs/screenshots/species-card.png)

![Points mode: individual bloom records colored by season, with a spring, summer, fall and winter legend](docs/screenshots/seasons.png)

## How it started

Bloombly was built in a weekend. It began at [NASA Space Apps Challenge](https://www.spaceappschallenge.org/) Querétaro on October 4 and 5, 2025, as an answer to the BloomWatch challenge: use NASA Earth observations to build a dynamic tool that detects or displays plant blooming events around the world.

The team: [Leonardo Cervantes](https://github.com/LeonardoCerv), [Enrique Ayala](https://github.com/KIKW12), [Carlos Vazquez](https://github.com/CsVazquezz), Charbel Chavez, Ana Pao Hernandez and Lucca Trasloheros.

The 48-hour version had everything wired together: a forecasting API, a trained model and a globe that could ask it for predictions. After the hackathon, Leonardo kept going with the part that had the most to say, the historical record. The globe was rebuilt around the full 50-year dataset, the cumulative story, the density heatmap and the species cards, and the prediction UI was retired until the model can be hosted properly (its code is still here, see the machine-learning section).

## How it works

### The data

Bloombly is built on a global flowering-sites dataset: **554,467 records from 1975 to 2025.** The browser sample spans 8 plant families and 31 genera, and every genus has its own illustration in `frontend/public/images`, which is what the species cards show.

The full dataset (`data/geojson/flowering_sites.geojson`) is about 467 MB. That is far too much for a browser, so the app loads a **30,000-record sample** instead (`data/geojson/flowering_sites.sample.geojson`, about 8 MB). Regenerate the sample any time with:

```bash
python scripts/sample_blooms.py
```

### The visualization

- **Stack:** vanilla JavaScript, [three.js](https://threejs.org/) and [globe.gl](https://globe.gl/). No framework, no build step. It is a static site.
- **Heatmap:** records are binned into hexagons. Column height and a four-stop color ramp (deep blue, teal, magenta, pink) both scale with record count.
- **Timeline:** cumulative. Each frame shows every bloom recorded up to that year, so the story is about the record growing, not a single year in isolation.
- **Points:** each record is drawn individually and colored by season of bloom, or by family or genus.
- **Species cards:** for a clicked hexagon, the app finds the most common bloom in that area and shows its illustration, family, count and peak season.
- **Sound:** synthesized in the browser with the Web Audio API. Nothing is downloaded.

## Run locally

```bash
cd frontend
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000). The globe works fully on its own; the prediction API below is optional.

### Keyboard shortcuts

- Space: play or pause the 50-year story
- Left / Right arrows: step one year
- Esc: close the species card

### Run the smoke test

With the frontend running, in another terminal:

```bash
cd frontend && npm test
```

It drives a visible Google Chrome (WebGL needs a real window) through the core flows: autoplay, pause, clicking a hexagon, the keyboard shortcuts and switching to Points. Set `BASE_URL` or `CHROME_PATH` to point it elsewhere.

## Deploy

The whole app is static and lives under `frontend/public`, data included. On Vercel, set **Root Directory** to `frontend/public` with no build command and no output directory. It also works on any other static host that can serve that folder. Full steps are in [`DEPLOY.md`](DEPLOY.md).

## The machine-learning pipeline

Bloombly started at the NASA Space Apps Challenge as a bloom detection and forecasting project, and the repository still contains that side: a Flask API in `api/` and a training pipeline in `ml/`.

```mermaid
flowchart LR
  subgraph Sources["Data sources"]
    POWER["NASA POWER<br/>weather"]
    APPEEARS["NASA AppEEARS<br/>NDVI, EVI"]
    GEE["Google Earth Engine<br/>imagery"]
    OLM["OpenLandMap<br/>soil"]
    GBIF["GBIF, iNaturalist<br/>bloom observations"]
  end
  subgraph Pipeline["Processing (backend/, ml/)"]
    CLEAN["Clean and align<br/>time series"]
    FEAT["75 features<br/>weather, soil, NDVI,<br/>elevation, photoperiod"]
  end
  MODEL["scikit-learn<br/>gradient boosting<br/>bloom / no bloom"]
  API["Flask API (api/)<br/>/api/predict/blooms"]
  GEO["GeoJSON exports<br/>(data/)"]
  SAMPLE["30,000-record sample<br/>about 8 MB"]
  APP["Static globe (frontend/)<br/>three.js + globe.gl"]
  POWER & APPEEARS & GEE & OLM & GBIF --> CLEAN --> FEAT --> MODEL --> API
  CLEAN --> GEO --> SAMPLE --> APP
```

**Honest status:** the live app is a historical explorer. The forecasting API is not wired into it. Running the API requires a Google Earth Engine service account and a trained model artifact, which is not committed. See [`api/.env.example`](api/.env.example) and [`DEPLOY.md`](DEPLOY.md).

### Data sources

- **NASA POWER API:** meteorological variables (temperature, precipitation, humidity)
- **NASA AppEEARS:** vegetation indices (NDVI, EVI, EVI2) and land surface products
- **Google Earth Engine:** satellite imagery and large-scale geospatial processing
- **OpenLandMap:** soil properties (texture, moisture, temperature)
- **GBIF / iNaturalist:** citizen science observations for ground truth

### Processing steps

1. **Feature extraction:** build the model's 75 features from 25 raw variables plus 49 engineered ones (35 weather, 8 soil, 2 NDVI, 1 elevation, 3 photoperiod).
2. **Quality control:** cloud masking and removal of sensor anomalies.
3. **Temporal alignment:** resample and align the different time series.
4. **Spatial standardization:** reproject to WGS84 and normalize resolutions.
5. **Missing data:** spatial and temporal interpolation.
6. **GeoJSON export:** convert processed outputs to web-ready formats.

### Model

A gradient boosting classifier built with scikit-learn (`GradientBoostingClassifier`), evaluated against a random forest baseline.

- **Training set:** 1,934 bloom observations from 2013 onward (earlier records have no NDVI satellite coverage).
- **Validation:** time-series cross-validation to avoid data leakage.
- **Output:** the probability that a given location is in bloom (a confidence score).

```
Input features (75) -> gradient boosting model -> Bloom / Not Bloom -> Probability
```

### Running the API

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env         # fill in EE_PROJECT and GOOGLE_APPLICATION_CREDENTIALS_JSON
python -m app.main           # http://localhost:5001
```

The API runs on its own (`GET /api/health` reports whether Earth Engine is available). The live frontend does not call it.

### Tech stack

**Frontend**

| Technology           | Purpose                         |
| -------------------- | ------------------------------- |
| JavaScript (vanilla) | App logic, no framework         |
| three.js / globe.gl  | 3D globe and hexagon rendering  |
| Web Audio API        | Live-synthesized soundscape     |
| HTML5 / CSS3         | UI structure and styles         |

**Backend and ML**

| Technology              | Purpose                                     |
| ----------------------- | ------------------------------------------- |
| Python 3.9+             | Core logic and data processing              |
| Flask                   | REST API and prediction endpoints           |
| scikit-learn            | Gradient boosting classifier, scaling, time-series cross-validation |
| pandas / NumPy          | Data manipulation and numerical ops         |
| Google Earth Engine API | Satellite access and large-scale processing |

## Project structure

```
bloombly/
├── frontend/        # The app: static site under frontend/public (index.html, js/, styles/, images/, data/)
├── data/            # GeoJSON datasets: full flowering-sites file, browser sample, prediction outputs
├── scripts/         # sample_blooms.py (browser sample) and ee.js (Earth Engine bloom detection)
├── api/             # Flask prediction API (optional, needs Earth Engine + a trained model)
├── ml/              # Data cleaning and feature pipeline for model training
├── backend/         # Cleaning and conversion scripts for the source datasets (CSV/JSON to GeoJSON)
├── docs/            # Screenshots and documentation assets
└── DEPLOY.md        # Static deploy guide and API notes
```

## Data sources and credits

- **NASA POWER API:** meteorological variables (resolution ~0.5°, coverage 1981–present, daily updates)
- **NASA AppEEARS:** vegetation indices and land surface products (MODIS, VIIRS; 250 m–1 km)
- **Google Earth Engine:** multi-spectral imagery and scalable processing
- **OpenLandMap:** soil property layers (250 m resolution)
- **GBIF / iNaturalist:** ground-truth observations for training and validation

Built for the [NASA Space Apps Challenge](https://www.spaceappschallenge.org/), whose prompt asked teams to use NASA Earth observations to build a dynamic visual tool that detects or displays plant blooming events worldwide.

Thanks to the NASA Earth Science Division, the Google Earth Engine team, the NASA Space Apps Challenge organizers, the citizen scientists on iNaturalist and GBIF, and the open-source projects this is built on.

## Contributing

Contributions are welcome! To get started:

```bash
git clone https://github.com/LeonardoCerv/bloombly.git
cd bloombly/frontend && npm install && npm start
```

Then fork the repository, create a branch for your change, commit it, push the branch and open a pull request. Keep the globe usable without the API: it is the part everyone sees.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

Third-party licenses: three.js (MIT), globe.gl (MIT), scikit-learn (BSD 3-Clause), NASA data (public domain, U.S. Government).

