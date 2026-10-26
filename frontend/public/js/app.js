import { initGlobe, setNightSkyBackground, loadCountryBorders } from './globe.js';
import { initTopSelector, hideLoadStatus } from './components/topSelector.js';
import { initUnifiedSidebar, loadDefaultDataset } from './components/unifiedSidebar.js';
import { initTimeline } from './components/timeline.js';
import { initDescriptionCard } from './components/descriptionCard.js';
import { initMetricsCard } from './components/metricsCard.js';
import { initAdvancedFilters } from './components/advancedFilters.js';
import { initVizLegend } from './components/legend.js';
import { initMusicToggle } from './components/music.js';

// Initialize the application
async function init() {
  // Initialize components
  initTopSelector();
  initUnifiedSidebar();
  initTimeline();
  initDescriptionCard();
  initMetricsCard();
  initAdvancedFilters();
  initVizLegend();
  initMusicToggle();
  
  // Initialize globe: always a night-sky backdrop, never clouds (data stays unobscured)
  initGlobe();
  setNightSkyBackground();
  
  // Country borders and the bloom dataset are independent, so fetch them side by side.
  // The dataset load also starts the autoplaying 50-year story.
  const [, loaded] = await Promise.all([loadCountryBorders(), loadDefaultDataset()]);

  // Keep the loading line up until a frame with data has actually been drawn. On failure
  // the error stays visible in its place.
  if (loaded) {
    requestAnimationFrame(() => requestAnimationFrame(hideLoadStatus));
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
