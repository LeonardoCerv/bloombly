import { CONFIG } from './config.js';
import { state, initializeFamilyColors } from './state.js';
import { initGlobe, createPointFromFeature, setNightSkyBackground, switchToPointsMode, loadCountryBorders } from './globe.js';
import { initTopSelector } from './components/topSelector.js';
import { initUnifiedSidebar } from './components/unifiedSidebar.js';
import { initTimeline, buildTimelineSteps } from './components/timeline.js';
import { initDescriptionCard } from './components/descriptionCard.js';
import { initMetricsCard } from './components/metricsCard.js';
import { initAdvancedFilters } from './components/advancedFilters.js';
import { initVizLegend } from './components/legend.js';

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
  
  // Initialize globe — always a night-sky backdrop, never clouds (data stays unobscured)
  initGlobe();
  setNightSkyBackground();
  
  // Load country borders
  await loadCountryBorders();

  // Auto-load the default dataset so the globe is populated on landing (reuses the exact
  // "Load Data" code path). The timeline starts inactive, so all years render at once.
  const datasetSelect = document.getElementById('datasetSelect');
  const loadBtn = document.getElementById('loadDatasetBtn');
  if (datasetSelect && loadBtn) {
    datasetSelect.value = 'flowering_sites';
    loadBtn.click();
  }
  console.log('Application initialized with default dataset.');
}

// Legacy function - kept for reference but no longer used on init
async function loadGeoJSONData() {
  try {
    const datas = await Promise.all(
      CONFIG.GEOJSON_FILES.map(file => fetch(file).then(response => response.json()))
    );
    
    const allFeatures = datas.flatMap(data => data.features).filter(feature => 
      feature.properties.Family && feature.properties.Genus && feature.properties.Season
    );
    
    state.geojsonFeatures = allFeatures;
    state.pointsData = allFeatures.map(createPointFromFeature);
    
    // Populate all families and genus
    state.allFamilies = new Set(allFeatures.map(f => f.properties.Family));
    state.allGenus = new Set(allFeatures.map(f => f.properties.Genus));
    
    // Build genus to family mapping
    state.genusToFamily.clear();
    allFeatures.forEach(f => {
      state.genusToFamily.set(f.properties.Genus, f.properties.Family);
    });
    
    // Initialize family colors
    initializeFamilyColors();
    
    // Build timeline
    buildTimelineSteps();
    
    // Create filter UI - now handled by sidebars
    // createFilterUI();
    // updateLegend();
    
    switchToPointsMode();
  } catch (error) {
    console.error('Error loading GeoJSON data:', error);
    alert('Error loading data: ' + error.message);
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
