import { state } from '../state.js';
import { SEASON_COLORS, COLOR_MODE, DISPLAY_MODE } from '../config.js';

export function initVizLegend() {
  if (document.getElementById('viz-legend')) return;
  const el = document.createElement('div');
  el.id = 'viz-legend';
  el.style.display = 'none';
  document.body.appendChild(el);
}

// Renders a compact legend for whatever the globe is currently encoding, so the
// colors/heights actually mean something to a first-time viewer.
export function updateVizLegend() {
  const el = document.getElementById('viz-legend');
  if (!el) return;

  let html = '';
  if (state.currentDisplayMode === DISPLAY_MODE.DENSITY) {
    html = `<span class="vl-label">Fewer</span>
            <span class="vl-bar vl-density"></span>
            <span class="vl-label">More blooms</span>`;
  } else if (state.currentColorMode === COLOR_MODE.SEASON) {
    html = ['Spring', 'Summer', 'Fall', 'Winter'].map(s =>
      `<span class="vl-item"><span class="vl-dot" style="background:${SEASON_COLORS[s]};color:${SEASON_COLORS[s]}"></span>${s}</span>`
    ).join('');
  } else if (state.currentColorMode === COLOR_MODE.CLIMATE) {
    html = `<span class="vl-label">Earlier</span>
            <span class="vl-bar vl-climate"></span>
            <span class="vl-label">Later</span>
            <span class="vl-sub">vs. baseline</span>`;
  } else {
    el.style.display = 'none';
    return;
  }

  el.innerHTML = html;
  el.style.display = 'flex';
}

// A narrative one-liner under the title that reflects what you're currently looking at.
export function updateStoryCaption() {
  const el = document.querySelector('.selector-subtitle');
  if (!el) return;
  const n = (state.filteredPoints && state.filteredPoints.length) || 0;
  if (state.timelineActive && state.timelineSteps.length) {
    const step = state.timelineSteps[state.currentTimelineIndex];
    el.textContent = `${step.season} ${step.year} · ${n.toLocaleString()} blooms on the map`;
  } else if (state.currentDisplayMode === DISPLAY_MODE.DENSITY) {
    el.textContent = `Where Earth blooms — ${n.toLocaleString()} records across five decades`;
  } else if (state.currentColorMode === COLOR_MODE.SEASON) {
    el.textContent = `When Earth blooms — every mark colored by its season`;
  } else {
    el.textContent = `Fifty years of the planet in bloom`;
  }
}
