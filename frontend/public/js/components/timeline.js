import { state } from '../state.js';
import { DISPLAY_MODE } from '../config.js';
import { switchToHexMode, switchToPointsMode, switchToDensityMode } from '../globe.js';
import { updateMetrics } from './metricsCard.js';
import { updateStoryCaption } from './legend.js';

// The timeline is a cumulative "50-year story": as it advances, the globe shows every bloom
// recorded up to that year, so the heatmap grows across the decades. It auto-plays and loops.

export function initTimeline() {
  const container = document.getElementById('timeline-container');
  container.innerHTML = `
    <div id="timeline">
      <div id="timelineLabel">
        <span id="currentSeason">All years</span>
        <span id="currentYear"></span>
      </div>
      <div id="timelineControls">
        <button class="timeline-btn step-btn" id="prevStepBtn" title="Previous year">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <button class="timeline-btn play-btn" id="playBackwardBtn" title="Rewind">
          <i class="fa-solid fa-backward"></i>
        </button>
        <button class="timeline-btn pause-btn" id="pauseBtn" title="Pause">
          <i class="fa-solid fa-pause"></i>
        </button>
        <button class="timeline-btn play-btn" id="playForwardBtn" title="Play the 50-year story">
          <i class="fa-solid fa-play"></i>
        </button>
        <button class="timeline-btn step-btn" id="nextStepBtn" title="Next year">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  `;

  attachTimelineEventListeners();
}

function attachTimelineEventListeners() {
  document.getElementById('prevStepBtn').addEventListener('click', goToPreviousStep);
  document.getElementById('nextStepBtn').addEventListener('click', goToNextStep);
  document.getElementById('playForwardBtn').addEventListener('click', () => togglePlay('forward'));
  document.getElementById('playBackwardBtn').addEventListener('click', () => togglePlay('backward'));
  document.getElementById('pauseBtn').addEventListener('click', pause);
}

export function buildTimelineSteps() {
  const yearsSet = new Set(state.geojsonFeatures.map(f => f.properties.year).filter(y => y != null));
  state.allYears = Array.from(yearsSet).sort((a, b) => a - b);
  state.currentTimelineIndex = Math.max(0, state.allYears.length - 1); // default: all years shown
  updateTimelineDisplay();
}

function updateTimelineDisplay() {
  if (!state.allYears.length) return;
  const year = state.allYears[state.currentTimelineIndex];
  const seasonEl = document.getElementById('currentSeason');
  const yearEl = document.getElementById('currentYear');
  if (seasonEl && yearEl) {
    if (state.timelineActive) {
      seasonEl.textContent = 'through';
      yearEl.textContent = year;
    } else {
      seasonEl.textContent = 'All years';
      yearEl.textContent = `${state.allYears[0]}–${state.allYears[state.allYears.length - 1]}`;
    }
  }

  const fwd = document.getElementById('playForwardBtn');
  const bwd = document.getElementById('playBackwardBtn');
  if (fwd && bwd) {
    fwd.classList.toggle('active', state.isPlaying && state.playDirection === 'forward');
    bwd.classList.toggle('active', state.isPlaying && state.playDirection === 'backward');
  }

  applyTimelineFilter();
}

export function applyTimelineFilter() {
  if (!state.allYears.length) return;

  const cutoffYear = state.allYears[state.currentTimelineIndex];

  // Start with all features, respecting any active location/area filters
  let baseFeatures = state.geojsonFeatures;

  if (state.locationFilteredFeatures !== null && state.locationFilteredFeatures.length >= 0) {
    baseFeatures = state.locationFilteredFeatures;
  }
  if (state.areaFilteredFeatures !== null && state.areaFilteredFeatures.length >= 0) {
    if (state.locationFilteredFeatures !== null && state.locationFilteredFeatures.length >= 0) {
      const locationIds = new Set(state.locationFilteredFeatures.map(f =>
        `${f.properties.Genus}_${f.properties.Family}_${f.properties.year}_${f.properties.Season}_${f.properties.Area}`
      ));
      baseFeatures = state.areaFilteredFeatures.filter(f =>
        locationIds.has(`${f.properties.Genus}_${f.properties.Family}_${f.properties.year}_${f.properties.Season}_${f.properties.Area}`)
      );
    } else {
      baseFeatures = state.areaFilteredFeatures;
    }
  }

  // Cumulative timeline: when active, show every bloom recorded up to the cutoff year.
  // When inactive (default landing / paused at the end), show the full 50 years at once.
  state.filteredFeatures = baseFeatures.filter(feature => {
    const matchesTimeline = !state.timelineActive || feature.properties.year <= cutoffYear;
    const matchesFamily = state.selectedFamilies.size === 0 || state.selectedFamilies.has(feature.properties.Family);
    const matchesGenus = state.selectedGenus.size === 0 || state.selectedGenus.has(feature.properties.Genus);
    return matchesTimeline && matchesFamily && matchesGenus;
  });

  const featureIds = new Set(state.filteredFeatures.map(f =>
    `${f.properties.Genus}_${f.properties.Family}_${f.properties.year}_${f.properties.Season}_${f.properties.Area}`
  ));

  state.filteredPoints = state.pointsData.filter(point =>
    point.isUserLocation || featureIds.has(`${point.Genus}_${point.Family}_${point.year}_${point.Season}_${point.Area}`)
  );

  if (state.currentDisplayMode === DISPLAY_MODE.HEX) {
    switchToHexMode();
  } else if (state.currentDisplayMode === DISPLAY_MODE.DENSITY) {
    switchToDensityMode();
  } else {
    switchToPointsMode();
  }

  updateMetrics();
  updateStoryCaption();
}

function goToPreviousStep() {
  state.timelineActive = true;
  state.currentTimelineIndex = (state.currentTimelineIndex - 1 + state.allYears.length) % state.allYears.length;
  updateTimelineDisplay();
}

function goToNextStep() {
  state.timelineActive = true;
  state.currentTimelineIndex = (state.currentTimelineIndex + 1) % state.allYears.length;
  updateTimelineDisplay();
}

function togglePlay(direction) {
  if (state.isPlaying && state.playDirection === direction) return;

  if (state.playInterval) {
    clearInterval(state.playInterval);
    state.playInterval = null;
  }

  state.isPlaying = true;
  state.playDirection = direction;
  state.timelineActive = true;

  // Launching the forward story from the full/paused end restarts it from the first year.
  if (direction === 'forward' && state.currentTimelineIndex >= state.allYears.length - 1) {
    state.currentTimelineIndex = 0;
    updateTimelineDisplay();
  }

  state.playInterval = setInterval(() => {
    if (direction === 'forward') {
      goToNextStep();
    } else {
      goToPreviousStep();
    }
  }, 450);

  updateTimelineDisplay();
}

function pause() {
  state.isPlaying = false;
  state.playDirection = null;
  if (state.playInterval) {
    clearInterval(state.playInterval);
    state.playInterval = null;
  }
  updateTimelineDisplay();
}

// Auto-start the ambient, looping 50-year story once data is loaded.
export function startStory() {
  togglePlay('forward');
}
