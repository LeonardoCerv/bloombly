import { CONFIG } from './config.js';
import { state, initializeFamilyColors } from './state.js';
import { initGlobe, createPointFromFeature, initializeClouds, switchToPointsMode, loadCountryBorders } from './globe.js';
import { initTopSelector } from './components/topSelector.js';
import { initUnifiedSidebar } from './components/unifiedSidebar.js';
import { initTimeline, buildTimelineSteps } from './components/timeline.js';
import { initDescriptionCard } from './components/descriptionCard.js';
import { initMetricsCard } from './components/metricsCard.js';
import { initAdvancedFilters } from './components/advancedFilters.js';

// Initialize the application
async function init() {
  // Initialize components
  initTopSelector();
  initUnifiedSidebar();
  initTimeline();
  initDescriptionCard();
  initMetricsCard();
  initAdvancedFilters();
  
  // Initialize globe
  initGlobe();
  initializeClouds();
  
  // Load country borders
  await loadCountryBorders();
  
  // Auto-load flowering sites dataset
  console.log('Auto-loading flowering sites dataset...');
  await autoLoadFloweringSites();
}

// Auto-load flowering sites dataset on app initialization
async function autoLoadFloweringSites() {
  try {
    const response = await fetch('../data/geojson/flowering_sites.geojson');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Flowering sites dataset loaded:', data);
    
    const allFeatures = (data.features || []).filter(feature => {
      const hasProps = feature.properties && feature.properties.Family && feature.properties.Genus && feature.properties.Season;
      return hasProps;
    });

    if (allFeatures.length === 0) {
      console.warn('No valid features found in flowering sites dataset');
      return;
    }

    state.geojsonFeatures = allFeatures;
    state.pointsData = allFeatures.map(createPointFromFeature);
    state.allFamilies = new Set(allFeatures.map(f => f.properties.Family));
    state.allGenus = new Set(allFeatures.map(f => f.properties.Genus));
    state.selectedFamilies = new Set(state.allFamilies);
    state.selectedGenus = new Set(state.allGenus);
    
    // Build genus to family mapping
    state.genusToFamily.clear();
    allFeatures.forEach(f => {
      state.genusToFamily.set(f.properties.Genus, f.properties.Family);
    });
    
    // Initialize family colors
    initializeFamilyColors();
    
    // Build timeline
    buildTimelineSteps();
    
    // Switch to points mode and update display
    switchToPointsMode();
    
    console.log('Auto-loaded', state.pointsData.length, 'flowering site points');
  } catch (error) {
    console.error('Error auto-loading flowering sites dataset:', error);
    // Don't show alert on auto-load failure, just log it
  }
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
