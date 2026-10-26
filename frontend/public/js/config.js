// Configuration
export const CONFIG = {
  COUNTRIES_GEOJSON_URL: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',

  EARTH_IMAGE_URL: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
  EARTH_TOPOLOGY_URL: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
  
  HEXBIN_RESOLUTION: 3, // density heatmap bin size (higher = smaller hexes)
  HEXBIN_MAX_ALTITUDE: 0.45,
  
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
  SEASON: 'season', // color by bloom season (when in the year it flowers)
  FAMILY: 'family',
  GENUS: 'genus'
};

// Season palette, shared by the point coloring, the legend, and the card badges.
export const SEASON_COLORS = {
  Spring: '#34d399',
  Summer: '#fbbf24',
  Fall:   '#fb923c',
  Winter: '#7dd3fc'
};

export const DISPLAY_MODE = {
  POINTS: 'points',
  DENSITY: 'density'
};
