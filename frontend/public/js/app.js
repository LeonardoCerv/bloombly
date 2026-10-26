import { initGlobe, setNightSkyBackground, loadCountryBorders } from './globe.js';
import { initTopSelector } from './components/topSelector.js';
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
  
  // Load country borders
  await loadCountryBorders();

  // Auto-load the default dataset so the globe is populated on landing; this also starts
  // the autoplaying 50-year story.
  await loadDefaultDataset();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
