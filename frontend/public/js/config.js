// Configuration
export const CONFIG = {
  // Optimized ~30k-point sample of the global flowering dataset. The full file
  // (flowering_sites.geojson, ~467MB / 554k features) freezes the browser — never load it
  // directly. Regenerate the sample with scripts/sample_blooms.py.
  GEOJSON_FILES: ['../data/geojson/flowering_sites.sample.geojson'],
  COUNTRIES_GEOJSON_URL: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',

  // Base URL of the ML prediction API. On a deployed site set `window.BLOOMBLY_API_URL`
  // (see index.html) to the API origin; falls back to localhost for local dev.
  API_BASE_URL: (typeof window !== 'undefined' && window.BLOOMBLY_API_URL) || 'http://localhost:5001/api',
  CLOUDS_IMAGE_URL: '/clouds.png',
  EARTH_IMAGE_URL: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
  EARTH_TOPOLOGY_URL: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
  
  CLOUDS_ALTITUDE: 0.004,
  CLOUDS_ROTATION_SPEED: -0.006,
  
  HEX_POLYGON_RESOLUTION: 5,
  HEX_POLYGON_MARGIN: 0.3,
  
  POINT_AREA_SCALE: 0.0000005,
  POINT_BASE_RADIUS: 0.1,
  RING_AREA_SCALE: 0.000003,
  RING_BASE_RADIUS: 0.3,
  RING_PROPAGATION_SPEED: 0.5,
  RING_REPEAT_PERIOD: 500,
  
  DEFAULT_COLOR: '#ff0a48ff', // Green mint (pulse of life color)
  
  INITIAL_VIEW: {
    lat: 37,
    lng: -95,
    altitude: 2
  }
};

export const COLOR_MODE = {
  DEFAULT: 'default',
  FAMILY: 'family',
  GENUS: 'genus'
};

export const DISPLAY_MODE = {
  HEX: 'hex',
  POINTS: 'points'
};
