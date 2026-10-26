import { state, initializeFamilyColors } from '../state.js';
import { COLOR_MODE, DISPLAY_MODE } from '../config.js';
import {
  switchToPointsMode, switchToDensityMode, refreshGlobeColors, applyGlobeStyle,
  createPointFromFeature, getGlobe
} from '../globe.js';
import { updateVizLegend, updateStoryCaption } from './legend.js';
import { applyTimelineFilter, buildTimelineSteps, startStory } from './timeline.js';
import { showMetricsCard, updateMetrics } from './metricsCard.js';
import { showAdvancedFilters } from './advancedFilters.js';
import { setLoadStatus, showLoadError } from './topSelector.js';

// Optimized ~30k-point sample of the global flowering dataset. The full file
// (flowering_sites.geojson, ~467MB / 554k features) freezes the browser, so never load it
// directly. Regenerate the sample with scripts/sample_blooms.py.
const DEFAULT_DATASET_URL = '../data/geojson/flowering_sites.sample.geojson';

export function initUnifiedSidebar() {
  const container = document.getElementById('unified-sidebar-container');
  container.innerHTML = `
    <div id="unified-legend">
      <!-- Scrollable Content Area -->
      <div id="scrollableContent">
        <!-- Dataset filters (shown once the dataset has loaded) -->
        <div id="datasetFilters"></div>
      </div>
      
      <!-- Fixed Controls at Bottom -->
      <div id="fixedControls">
        <!-- Point Style Section -->
        <div class="filter-section">
          <h4>Point Style</h4>
          <div class="switcher-container">
            <button class="switcher-prev" data-target="pointStyleSwitcher">‹</button>
            <div class="style-switcher" id="pointStyleSwitcher" data-current="0">
              <span class="switcher-value">Density</span>
            </div>
            <button class="switcher-next" data-target="pointStyleSwitcher">›</button>
          </div>
        </div>
        
        <!-- Point Color Section -->
        <div class="filter-section" id="pointColorSection">
          <h4>Point Color</h4>
          <div class="switcher-container">
            <button class="switcher-prev" data-target="pointColorSwitcher">‹</button>
            <div class="style-switcher" id="pointColorSwitcher" data-current="0">
              <span class="switcher-value">By Season</span>
            </div>
            <button class="switcher-next" data-target="pointColorSwitcher">›</button>
          </div>
        </div>
        
        <!-- Globe Style Section -->
        <div class="filter-section">
          <h4>Globe Style</h4>
          <div class="switcher-container">
            <button class="switcher-prev" data-target="globeStyleSwitcher">‹</button>
            <div class="style-switcher" id="globeStyleSwitcher" data-current="0">
              <span class="switcher-value">Normal</span>
            </div>
            <button class="switcher-next" data-target="globeStyleSwitcher">›</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Colors Legend Column -->
    <div id="unifiedColorsLegend"></div>
  `;

  attachUnifiedSidebarEventListeners();
  renderDatasetFilters();
  initPanelsToggle();
}

// On narrow or short screens the side panels do not fit beside the globe, so CSS hides them
// and this button opens them as a sheet over a dimmed backdrop. The button and backdrop are
// display:none on wide screens, where the panels are always visible.
function initPanelsToggle() {
  if (document.getElementById('panels-toggle')) return;
  const btn = document.createElement('button');
  btn.id = 'panels-toggle';
  btn.type = 'button';
  btn.title = 'Filters and display options';
  btn.setAttribute('aria-label', 'Filters and display options');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<i class="fa-solid fa-sliders"></i>';

  const backdrop = document.createElement('div');
  backdrop.id = 'panel-backdrop';

  const setOpen = open => {
    document.body.classList.toggle('panels-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-sliders"></i>';
  };
  btn.addEventListener('click', () => setOpen(!document.body.classList.contains('panels-open')));
  backdrop.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('panels-open')) setOpen(false);
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(btn);
}

function attachUnifiedSidebarEventListeners() {
  // Point style switcher
  const pointStyleSwitcher = document.getElementById('pointStyleSwitcher');
  // A separate 'Hexagons' style (per-bloom dot polygons) was dropped: it looked like Points,
  // ran at single-digit FPS during the story, and Density already is the hexagon view.
  const pointStyleOptions = ['Density', 'Points', 'Rings'];
  
  document.querySelectorAll('[data-target="pointStyleSwitcher"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = parseInt(pointStyleSwitcher.dataset.current);
      const isPrev = btn.classList.contains('switcher-prev');
      const next = isPrev 
        ? (current - 1 + pointStyleOptions.length) % pointStyleOptions.length
        : (current + 1) % pointStyleOptions.length;
      pointStyleSwitcher.dataset.current = next;
      pointStyleSwitcher.querySelector('.switcher-value').textContent = pointStyleOptions[next];
      handlePointStyleChange(next);
    });
  });
  
  // Point color switcher
  const pointColorSwitcher = document.getElementById('pointColorSwitcher');
  const pointColorOptions = ['By Season', 'By Family', 'By Genus', 'Single Color'];
  
  document.querySelectorAll('[data-target="pointColorSwitcher"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = parseInt(pointColorSwitcher.dataset.current);
      const isPrev = btn.classList.contains('switcher-prev');
      const next = isPrev 
        ? (current - 1 + pointColorOptions.length) % pointColorOptions.length
        : (current + 1) % pointColorOptions.length;
      pointColorSwitcher.dataset.current = next;
      pointColorSwitcher.querySelector('.switcher-value').textContent = pointColorOptions[next];
      handlePointColorChange(next);
    });
  });
  
  // Globe style switcher
  const globeStyleSwitcher = document.getElementById('globeStyleSwitcher');
  const globeStyleOptions = ['Normal', 'Detailed', 'Plain'];
  
  document.querySelectorAll('[data-target="globeStyleSwitcher"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = parseInt(globeStyleSwitcher.dataset.current);
      const isPrev = btn.classList.contains('switcher-prev');
      const next = isPrev 
        ? (current - 1 + globeStyleOptions.length) % globeStyleOptions.length
        : (current + 1) % globeStyleOptions.length;
      globeStyleSwitcher.dataset.current = next;
      globeStyleSwitcher.querySelector('.switcher-value').textContent = globeStyleOptions[next];
      handleGlobeStyleChange(next);
    });
  });
}

function renderDatasetFilters() {
  const container = document.getElementById('datasetFilters');
  container.innerHTML = `
    <!-- Filter Switcher (Hidden until data loaded) -->
    <div id="filterSwitcherSection" style="display: none;">
      <div class="filter-section">
        <h4>Filter By</h4>
        <div class="switcher-container">
          <button class="switcher-prev" data-target="filterTypeSwitcher">‹</button>
          <div class="style-switcher" id="filterTypeSwitcher" data-current="0">
            <span class="switcher-value">Family</span>
          </div>
          <button class="switcher-next" data-target="filterTypeSwitcher">›</button>
        </div>
      </div>
      
      <!-- Family Filter -->
      <div class="filter-section filter-content-section" id="familyFilterSection">
        <input type="text" id="familySearch" placeholder="Search...">
        <div class="checkbox-group" id="familyCheckboxes"></div>
      </div>
      
      <!-- Genus Filter -->
      <div class="filter-section filter-content-section" id="genusFilterSection" style="display: none;">
        <input type="text" id="speciesSearch" placeholder="Search...">
        <div class="checkbox-group" id="genusCheckboxes"></div>
      </div>
    </div>
  `;
  
  document.getElementById('familySearch').addEventListener('input', (e) => {
    updateFamilyCheckboxes(e.target.value);
  });
  document.getElementById('speciesSearch').addEventListener('input', (e) => {
    updateGenusCheckboxes(e.target.value);
  });
  
  // Filter type switcher
  let currentFilterType = 0; // 0 = Family, 1 = Genus
  const filterTypeOptions = ['Family', 'Genus'];
  
  document.querySelectorAll('[data-target="filterTypeSwitcher"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const isPrev = btn.classList.contains('switcher-prev');
      currentFilterType = isPrev 
        ? (currentFilterType - 1 + filterTypeOptions.length) % filterTypeOptions.length
        : (currentFilterType + 1) % filterTypeOptions.length;
      
      // Update the switcher label
      const filterTypeSwitcher = document.getElementById('filterTypeSwitcher');
      if (filterTypeSwitcher) {
        filterTypeSwitcher.querySelector('.switcher-value').textContent = filterTypeOptions[currentFilterType];
      }
      
      handleFilterTypeChange(currentFilterType);
    });
  });
}

// Common control handlers
function handlePointStyleChange(index) {
  if (index === 0) {
    state.currentDisplayMode = DISPLAY_MODE.DENSITY;
    state.ringsEnabled = false;
    switchToDensityMode();
  } else if (index === 1) {
    state.currentDisplayMode = DISPLAY_MODE.POINTS;
    state.ringsEnabled = false;
    switchToPointsMode();
  } else if (index === 2) {
    state.currentDisplayMode = DISPLAY_MODE.POINTS;
    state.ringsEnabled = true;
    switchToPointsMode();
  }

  refreshGlobeColors();
  updateVizLegend();
  updateControlsVisibility();
  updateStoryCaption();
}

// Point Color is meaningless in Density mode (it colors purely by count), so hide it there.
function updateControlsVisibility() {
  const colorSection = document.getElementById('pointColorSection');
  if (colorSection) {
    colorSection.style.display = (state.currentDisplayMode === DISPLAY_MODE.DENSITY) ? 'none' : '';
  }
}

function handlePointColorChange(index) {
  if (index === 0) {
    state.currentColorMode = COLOR_MODE.SEASON;
  } else if (index === 1) {
    state.currentColorMode = COLOR_MODE.FAMILY;
  } else if (index === 2) {
    state.currentColorMode = COLOR_MODE.GENUS;
  } else if (index === 3) {
    state.currentColorMode = COLOR_MODE.DEFAULT;
  }

  updateLegend();
  refreshGlobeColors();
  updateVizLegend();
  updateStoryCaption();
}

function handleGlobeStyleChange(index) {
  const styles = ['normal', 'detailed', 'plain'];
  applyGlobeStyle(styles[index]);
}

function handleFilterTypeChange(index) {
  const familySection = document.getElementById('familyFilterSection');
  const genusSection = document.getElementById('genusFilterSection');
  
  if (index === 0) {
    // Show Family filter
    familySection.style.display = 'block';
    genusSection.style.display = 'none';
  } else {
    // Show Genus filter
    familySection.style.display = 'none';
    genusSection.style.display = 'block';
  }
}

// Reads the response body in chunks so the loading bar can show real progress. Falls back
// to an indeterminate bar when the size is unknown or the body is compressed in transit
// (Content-Length is then the compressed size, so counted bytes would overshoot it).
async function readJsonWithProgress(response) {
  const total = Number(response.headers.get('Content-Length')) || 0;
  if (!response.body || !response.body.getReader) {
    setLoadStatus('Loading bloom records');
    return response.json();
  }
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    const mb = (received / 1048576).toFixed(1);
    if (total && received <= total) {
      setLoadStatus(`Loading bloom records · ${mb} MB`, received / total);
    } else {
      setLoadStatus(`Loading bloom records · ${mb} MB`);
    }
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
  setLoadStatus('Preparing the globe', 1);
  // Let the label paint before the synchronous parse blocks the main thread.
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Loads the single bundled dataset and wires up the globe, filters, legend, metrics and
// the autoplaying 50-year story. Called once on startup by app.js. Resolves to true once
// the globe has data, or false after showing the failure inline under the title.
export async function loadDefaultDataset() {
  try {
    setLoadStatus('Loading bloom records');
    const response = await fetch(DEFAULT_DATASET_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}${response.statusText ? ' ' + response.statusText : ''}`);
    }
    const data = await readJsonWithProgress(response);
    const count = Array.isArray(data.features) ? data.features.length : 0;
    setLoadStatus(`Drawing ${count.toLocaleString()} bloom records`, 1);

    const allFeatures = (data.features || []).filter(feature =>
      feature.properties && feature.properties.Family && feature.properties.Genus && feature.properties.Season
    );
    if (allFeatures.length === 0) {
      throw new Error('No valid features found in dataset');
    }

    state.geojsonFeatures = allFeatures;
    state.pointsData = allFeatures.map(createPointFromFeature);
    state.allFamilies = new Set(allFeatures.map(f => f.properties.Family));
    state.allGenus = new Set(allFeatures.map(f => f.properties.Genus));
    state.selectedFamilies = new Set(state.allFamilies);
    state.selectedGenus = new Set(state.allGenus);

    state.genusToFamily.clear();
    allFeatures.forEach(f => {
      state.genusToFamily.set(f.properties.Genus, f.properties.Family);
    });

    initializeFamilyColors();
    buildTimelineSteps();
    createFilterUI();
    updateLegend();
    // Render in the active display mode (density by default)
    if (state.currentDisplayMode === DISPLAY_MODE.DENSITY) {
      switchToDensityMode();
    } else {
      switchToPointsMode();
    }

    // Fly the camera to the data so it's actually in view, zoomed to how spread-out it is.
    try {
      const g = getGlobe();
      const pts = state.pointsData;
      const lats = pts.map(p => p.lat).filter(v => typeof v === 'number').sort((a, b) => a - b);
      const lngs = pts.map(p => p.lng).filter(v => typeof v === 'number').sort((a, b) => a - b);
      if (g && lats.length) {
        const med = arr => arr[Math.floor(arr.length / 2)];
        // interquartile spread (the dense core of the data); robust to scattered outliers
        const span = arr => arr[Math.floor(arr.length * 0.75)] - arr[Math.floor(arr.length * 0.25)];
        const spread = Math.max(span(lats), span(lngs));
        let altitude = spread > 120 ? 2.3 : (spread > 40 ? 1.7 : 1.1);
        // The camera's field of view is vertical, so on a portrait screen the same altitude
        // crops the globe at the sides. Pull back in proportion to how narrow the view is.
        const aspect = window.innerWidth / Math.max(1, window.innerHeight);
        if (aspect < 1) altitude = (1 + altitude) / Math.sqrt(Math.max(aspect, 0.35)) - 1;
        g.pointOfView({ lat: med(lats), lng: med(lngs), altitude }, 1200);
      }
    } catch (e) { /* non-fatal */ }

    // Show filter sections after data is loaded
    document.getElementById('filterSwitcherSection').style.display = 'block';

    updateVizLegend();
    updateControlsVisibility();
    updateStoryCaption();

    // Kick off the ambient, looping 50-year story automatically.
    startStory();

    // Show and update metrics card
    showMetricsCard();
    updateMetrics();

    // Show advanced filters card
    showAdvancedFilters();
    return true;
  } catch (err) {
    console.error('Dataset load failed:', err);
    const reason = err && err.message ? err.message : String(err);
    showLoadError(`Could not load the bloom records (${reason}). Reload the page to try again.`);
    return false;
  }
}

// Filter UI functions
export function createFilterUI() {
  updateFamilyCheckboxes();
  updateGenusCheckboxes();
}

function updateFamilyCheckboxes(searchTerm = '') {
  const container = document.getElementById('familyCheckboxes');
  if (!container) return;
  
  const families = Array.from(state.allFamilies).sort();
  const filteredFamilies = searchTerm 
    ? families.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
    : families;
  
  const shouldBeChecked = (family) => {
    if (state.selectedFamilies.size === 0) return true;
    return state.selectedFamilies.has(family);
  };
  
  container.innerHTML = filteredFamilies.map(family => `
    <label class="checkbox-item">
      <input type="checkbox" value="${family}" 
             ${shouldBeChecked(family) ? 'checked' : ''}>
      ${family}
    </label>
  `).join('');
  
  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', handleFamilyFilterChange);
  });
}

function updateGenusCheckboxes(searchTerm = '') {
  const container = document.getElementById('genusCheckboxes');
  if (!container) return;
  
  const genuses = Array.from(state.allGenus).sort();
  const filteredGenuses = searchTerm 
    ? genuses.filter(g => g.toLowerCase().includes(searchTerm.toLowerCase()))
    : genuses;
  
  const shouldBeChecked = (genus) => {
    if (state.selectedGenus.size === 0) return true;
    return state.selectedGenus.has(genus);
  };
  
  container.innerHTML = filteredGenuses.map(genus => `
    <label class="checkbox-item">
      <input type="checkbox" value="${genus}" 
             ${shouldBeChecked(genus) ? 'checked' : ''}>
      ${genus}
    </label>
  `).join('');
  
  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', handleGenusFilterChange);
  });
}

function handleFamilyFilterChange(event) {
  const changedFamily = event.target.value;
  const isChecked = event.target.checked;
  const container = document.getElementById('familyCheckboxes');
  const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
  const checkedCheckboxes = Array.from(allCheckboxes).filter(cb => cb.checked);
  
  state.selectedFamilies.clear();
  checkedCheckboxes.forEach(cb => {
    state.selectedFamilies.add(cb.value);
  });
  
  if (checkedCheckboxes.length === allCheckboxes.length) {
    state.selectedFamilies.clear();
  }
  
  // Keep the genus checkboxes in step with their family: unchecking a family hides its
  // genera, re-checking it brings them back. The genus selection is then rebuilt from the
  // checkboxes, so state and UI never disagree.
  const genusInFamily = Array.from(state.genusToFamily.entries())
    .filter(([, family]) => family === changedFamily)
    .map(([genus]) => genus);
  const genusContainer = document.getElementById('genusCheckboxes');
  if (genusContainer) {
    genusContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      if (genusInFamily.includes(checkbox.value)) checkbox.checked = isChecked;
    });
    syncGenusSelectionFromCheckboxes(genusContainer);
  }

  applyTimelineFilter();
  updateMetrics();
}

// An empty selection means "no genus filter", so only a partial selection is recorded.
function syncGenusSelectionFromCheckboxes(container) {
  const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
  const checked = Array.from(allCheckboxes).filter(cb => cb.checked);
  state.selectedGenus.clear();
  if (checked.length !== allCheckboxes.length) {
    checked.forEach(cb => state.selectedGenus.add(cb.value));
  }
}

function handleGenusFilterChange() {
  syncGenusSelectionFromCheckboxes(document.getElementById('genusCheckboxes'));
  applyTimelineFilter();
  updateMetrics();
}

// Legend update function
export function updateLegend() {
  const colorsLegend = document.getElementById('unifiedColorsLegend');
  
  if (state.currentColorMode === COLOR_MODE.FAMILY) {
    const familyCounts = {};
    state.geojsonFeatures.forEach(f => {
      const family = f.properties.Family;
      familyCounts[family] = (familyCounts[family] || 0) + 1;
    });
    
    const sortedFamilies = Object.entries(familyCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([family]) => family);
    
    let html = '<h4>Colors</h4><div class="colors-list">';
    
    sortedFamilies.forEach(family => {
      html += `
        <div class="color-item">
          <div class="color-box" style="background-color: ${state.familyColors[family]};"></div>
          <span>${family}</span>
        </div>
      `;
    });
    
    html += '</div>';
    
    colorsLegend.innerHTML = html;
    colorsLegend.style.display = 'block';
  } else if (state.currentColorMode === COLOR_MODE.GENUS) {
    const familyCounts = {};
    const generaByFamily = {};
    
    state.geojsonFeatures.forEach(f => {
      const family = f.properties.Family;
      const genus = f.properties.Genus;
      
      familyCounts[family] = (familyCounts[family] || 0) + 1;
      
      if (!generaByFamily[family]) {
        generaByFamily[family] = new Set();
      }
      generaByFamily[family].add(genus);
    });
    
    const sortedFamilies = Object.entries(familyCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([family]) => family);
    
    let html = '<h4>Colors</h4><div class="colors-list" style="gap: 1px;">';
    
    sortedFamilies.forEach(family => {
      html += `
        <div class="color-item" style="font-weight: bold; margin-top: 3px; padding: 2px 3px; background: rgba(78, 217, 217, 0.05); line-height: 1.2;">
          <div class="color-box" style="background-color: ${state.familyColors[family]}; width: 9px; height: 9px; border: 1.5px solid rgba(78, 217, 217, 0.5); margin-right: 4px;"></div>
          <span style="font-size: 9px;">${family}</span>
        </div>
      `;
      
      const genera = Array.from(generaByFamily[family]).sort();
      genera.forEach(genus => {
        html += `
          <div class="color-item" style="padding: 0.5px 3px 0.5px 10px; line-height: 1.2;">
            <div class="color-box" style="background-color: ${state.genusColors[genus]}; width: 6px; height: 6px; margin-right: 3px;"></div>
            <span style="font-size: 9px;">${genus}</span>
          </div>
        `;
      });
    });
    
    html += '</div>';
    
    colorsLegend.innerHTML = html;
    colorsLegend.style.display = 'block';
  } else {
    colorsLegend.innerHTML = '';
    colorsLegend.style.display = 'none';
  }
}
