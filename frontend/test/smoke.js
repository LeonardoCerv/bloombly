// Smoke test for the Bloombly globe. Plain Node, no test framework.
//
//   cd frontend && npm start        (or any server on BASE_URL)
//   cd frontend && npm test
//
// Drives a real, visible Chrome (globe.gl needs WebGL, which headless Chrome does not
// render here) and checks the core flows end to end. Exits non-zero with a clear
// message on the first failure.

const puppeteer = require('puppeteer-core');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TOTAL_TIMEOUT_MS = 180000;

const sleep = ms => new Promise(r => setTimeout(r, ms));

class SmokeFailure extends Error {}
function assert(cond, message) {
  if (!cond) throw new SmokeFailure(message);
}

let step = 'startup';
function log(message) {
  console.log(`  ok  ${message}`);
}

async function run() {
  // Fail fast with a useful message when the server is not running.
  try {
    const res = await fetch(BASE_URL);
    assert(res.ok, `${BASE_URL} answered HTTP ${res.status}`);
  } catch (e) {
    if (e instanceof SmokeFailure) throw e;
    throw new SmokeFailure(`cannot reach ${BASE_URL} (${e.message}). Start the server first: cd frontend && npm start`);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--no-sandbox'],
    defaultViewport: null
  });

  const pageErrors = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    page.on('pageerror', e => pageErrors.push(String(e && e.message ? e.message : e)));

    // App modules are plain ES modules; importing the same URL from the page returns the
    // live instances the app is using.
    const appState = () => page.evaluate(async () => {
      const { state } = await import('/js/state.js');
      return {
        playing: state.isPlaying,
        filtered: state.filteredPoints.length,
        total: state.pointsData.length,
        mode: state.currentDisplayMode
      };
    });
    const globeObjTypes = () => page.evaluate(async () => {
      const { getGlobe } = await import('/js/globe.js');
      const counts = {};
      getGlobe().scene().traverse(o => {
        if (o.__globeObjType) counts[o.__globeObjType] = (counts[o.__globeObjType] || 0) + 1;
      });
      return counts;
    });

    step = 'load page';
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    step = 'globe canvas';
    await page.waitForSelector('#globeViz canvas', { timeout: 20000 })
      .catch(() => { throw new SmokeFailure('#globeViz has no canvas: globe.gl did not initialize'); });
    log('#globeViz canvas exists');

    step = 'dataset load and story autoplay';
    await page.waitForFunction(async () => {
      const { state } = await import('/js/state.js');
      return state.pointsData.length > 0 && state.isPlaying && state.filteredPoints.length > 0;
    }, { timeout: 60000, polling: 250 })
      .catch(() => { throw new SmokeFailure('dataset did not load or the story did not start playing within 60s'); });
    const loader = await page.$eval('#load-status', el => ({ hidden: el.hidden, error: el.classList.contains('is-error'), text: el.textContent.trim() }));
    assert(!loader.error, `loading indicator shows an error: "${loader.text}"`);

    step = 'story grows';
    const a = await appState();
    await sleep(1400); // a bit more than two 600ms story ticks
    const b = await appState();
    assert(b.playing, 'story stopped playing on its own');
    assert(b.filtered > a.filtered, `filteredPoints did not grow while playing (${a.filtered} then ${b.filtered})`);
    log(`story is playing and filteredPoints grows (${a.filtered} -> ${b.filtered} of ${b.total})`);

    step = 'pause cleans up merged hexbin mesh';
    await page.evaluate(async () => {
      const { pauseStory } = await import('/js/components/timeline.js');
      await pauseStory();
    });
    await sleep(600); // the orphan sweep runs two frames after the unmerged render
    const types = await globeObjTypes();
    const paused = await appState();
    assert(!paused.playing, 'pauseStory() did not stop the story');
    assert(!types.hexBinPoints, `pause left ${types.hexBinPoints} merged 'hexBinPoints' object(s) in the scene`);
    assert(types.hexbin > 0, 'after pause there are no individual (clickable) hexbin objects');
    log(`pauseStory() leaves 0 'hexBinPoints' objects and ${types.hexbin} clickable hexbins`);

    step = 'hexbin hover and click';
    const canvasBox = await (await page.$('#globeViz canvas')).boundingBox();
    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;
    let hit = null;
    // Spiral-ish scan from the globe center outwards until the hex tooltip appears.
    scan:
    for (let r = 0; r <= 260; r += 20) {
      const n = r === 0 ? 1 : Math.max(8, Math.round(r / 10));
      for (let k = 0; k < n; k++) {
        const ang = (2 * Math.PI * k) / n;
        const x = Math.round(cx + r * Math.cos(ang));
        const y = Math.round(cy + r * Math.sin(ang));
        await page.mouse.move(x, y);
        await sleep(45);
        const tip = await page.evaluate(() => {
          const el = document.querySelector('.scene-tooltip');
          if (!el) return '';
          const cs = getComputedStyle(el);
          return cs.display === 'none' || cs.visibility === 'hidden' ? '' : el.textContent;
        });
        if (/bloom/i.test(tip)) { hit = { x, y, tip: tip.trim() }; break scan; }
      }
    }
    assert(hit, 'no hexbin tooltip containing "bloom" appeared while scanning the globe');
    await page.mouse.click(hit.x, hit.y);
    await page.waitForFunction(() => {
      const card = document.getElementById('description-card');
      return card && card.classList.contains('visible') && card.querySelector('img.dc-img');
    }, { timeout: 5000 })
      .catch(() => { throw new SmokeFailure(`clicking the hexbin ("${hit.tip}") did not open #description-card with an img.dc-img`); });
    const img = await page.$eval('#description-card img.dc-img', el => new Promise(res => {
      const done = () => res({ src: el.getAttribute('src'), w: el.naturalWidth });
      if (el.complete) done(); else { el.onload = done; el.onerror = done; }
    }));
    assert(img.w > 0, `species image ${img.src} did not load`);
    log(`hexbin click ("${hit.tip}") opens the species card with ${img.src}`);

    step = 'Escape closes the card';
    await page.mouse.move(5, 5);
    await page.keyboard.press('Escape');
    await sleep(500);
    const cardHidden = await page.$eval('#description-card', el => getComputedStyle(el).display === 'none');
    assert(cardHidden, 'Escape did not close the species card');
    log('Escape closes the species card');

    step = 'Space toggles the story without scrolling';
    await page.keyboard.press('Space');
    await sleep(300);
    const afterSpace = await appState();
    const scrollY = await page.evaluate(() => window.scrollY);
    assert(afterSpace.playing, 'Space did not start the story');
    assert(scrollY === 0, `Space scrolled the page (scrollY=${scrollY})`);
    await page.keyboard.press('Space');
    await sleep(300);
    assert(!(await appState()).playing, 'second Space did not pause the story');
    log('Space plays and pauses the story without scrolling');

    step = 'switch to Points';
    await page.click('#pointStyleSwitcher ~ .switcher-next');
    await sleep(800);
    const points = await page.evaluate(() => ({
      label: document.querySelector('#pointStyleSwitcher .switcher-value').textContent,
      colorSection: getComputedStyle(document.getElementById('pointColorSection')).display !== 'none',
      legend: document.getElementById('viz-legend').textContent.replace(/\s+/g, ' ').trim()
    }));
    const mode = (await appState()).mode;
    assert(points.label === 'Points' && mode === 'points', `Point Style switch did not reach Points (label "${points.label}", mode "${mode}")`);
    assert(points.colorSection, '#pointColorSection is hidden in Points mode');
    for (const s of ['Spring', 'Summer', 'Fall', 'Winter']) {
      assert(points.legend.includes(s), `season legend is missing "${s}" (legend: "${points.legend}")`);
    }
    log('Points mode shows #pointColorSection and the season legend');

    step = 'page errors';
    assert(pageErrors.length === 0, `page threw ${pageErrors.length} error(s): ${pageErrors.join(' | ')}`);
    log('no pageerror events');
  } finally {
    await browser.close().catch(() => {});
  }
}

const timer = setTimeout(() => {
  console.error(`SMOKE FAIL [${step}]: timed out after ${TOTAL_TIMEOUT_MS / 1000}s`);
  process.exit(1);
}, TOTAL_TIMEOUT_MS);

console.log(`Bloombly smoke test against ${BASE_URL}`);
run().then(() => {
  clearTimeout(timer);
  console.log('SMOKE PASS');
  process.exit(0);
}).catch(err => {
  clearTimeout(timer);
  const msg = err instanceof SmokeFailure ? err.message : (err && err.stack) || String(err);
  console.error(`SMOKE FAIL [${step}]: ${msg}`);
  process.exit(1);
});
