import { CONFIG, COLOR_MODE, DISPLAY_MODE, SEASON_COLORS } from './config.js';
import { state } from './state.js';

let globe = null;

export function initGlobe() {
  // globe.gl's UMD build is a kapsule factory: call Globe(config)(element).
  // Using `new Globe(el)` returns the chainable object but never initializes the
  // WebGL renderer, so no canvas is created and the globe stays blank.
  globe = Globe({ animateIn: false })(document.getElementById('globeViz'))
    .globeImageUrl(CONFIG.EARTH_IMAGE_URL)
    .bumpImageUrl(CONFIG.EARTH_TOPOLOGY_URL)
    .backgroundColor('rgba(15,17,21,1)')
    .atmosphereColor('rgba(255, 255, 255, 1)')
    .atmosphereAltitude(0.15)
    .pointOfView(CONFIG.INITIAL_VIEW)
    .hexPolygonsData([])
    .hexPolygonResolution(CONFIG.HEX_POLYGON_RESOLUTION)
    .hexPolygonMargin(CONFIG.HEX_POLYGON_MARGIN)
    .hexPolygonUseDots(true)
    .hexPolygonColor(polygon => getColorForFeature(polygon.properties))
    .hexPolygonLabel(createHexPolygonLabel)
    .pointsData([])
    .pointColor(getColorForFeature)
    .pointRadius(calculatePointRadius)
    .pointAltitude(0)
    .pointsMerge(false)
    .onPointClick(handlePointClick)
    .ringsData([])
    .ringColor(getColorForFeature)
    .ringMaxRadius('maxR')
    .ringPropagationSpeed('propagationSpeed')
    .ringRepeatPeriod('repeatPeriod')
    .polygonsData([])
    .polygonCapColor(() => 'rgba(0, 0, 0, 0)')
    .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
    .polygonStrokeColor(() => 'rgba(255, 255, 255, 0.25)')
    .polygonAltitude(0.001)
    // Density (hexbin) layer — aggregates blooms into hexagons so the whole dataset
    // reads as a heatmap. Starts empty; populated by switchToDensityMode().
    .hexBinPointLat(d => d.lat)
    .hexBinPointLng(d => d.lng)
    .hexBinPointWeight(1)
    .hexBinResolution(CONFIG.HEXBIN_RESOLUTION)
    .hexBinMerge(false)
    .hexAltitude(d => Math.min(CONFIG.HEXBIN_MAX_ALTITUDE, 0.02 + Math.sqrt(d.sumWeight) * 0.02))
    .hexTopColor(d => densityColor(d.sumWeight))
    .hexSideColor(d => densityColor(d.sumWeight))
    .hexLabel(d => `<b>${d.sumWeight.toLocaleString()}</b> bloom records`)
    .onHexClick(handleHexClick)
    .hexBinPointsData([]);

  // controls() can be briefly unavailable until the renderer has a sized container;
  // guard so a slow init never throws and blanks the page.
  const controls = globe.controls && globe.controls();
  if (controls) {
    controls.autoRotate = true;      // slow idle spin — the globe feels alive
    controls.autoRotateSpeed = 0.28;
  }

  return globe;
}

function handlePointClick(point, event, coords) {
  // Import the showDescriptionCard function dynamically
  import('./components/descriptionCard.js').then(module => {
    module.showDescriptionCard(point, event, coords);
  });
}

// Clicking a density hexbin shows the dominant bloom in that area (brings the species
// images back into the density view): most common genus + peak season + how many.
function handleHexClick(hex) {
  const pts = hex && hex.points;
  if (!pts || !pts.length) return;
  const genusCount = {}, seasonCount = {}, genusFamily = {};
  pts.forEach(p => {
    if (p.Genus) { genusCount[p.Genus] = (genusCount[p.Genus] || 0) + 1; genusFamily[p.Genus] = p.Family; }
    if (p.Season) seasonCount[p.Season] = (seasonCount[p.Season] || 0) + 1;
  });
  const top = obj => Object.keys(obj).sort((a, b) => obj[b] - obj[a])[0];
  const topGenus = top(genusCount);
  const lat = pts.reduce((s, p) => s + (p.lat || 0), 0) / pts.length;
  const lng = pts.reduce((s, p) => s + (p.lng || 0), 0) / pts.length;
  import('./components/descriptionCard.js').then(module => {
    module.showDescriptionCard({
      Genus: topGenus,
      Family: genusFamily[topGenus],
      Season: top(seasonCount),
      lat, lng,
      binCount: hex.sumWeight != null ? hex.sumWeight : pts.length
    });
  });
}

export function getGlobe() {
  return globe;
}

// Climate-shift color: diverging red (bloomed earlier -> warming) <-> blue (later),
// near-neutral around the baseline. Input is days of deviation from the historical mean.
export function climateColor(dev) {
  const n = Number(dev);
  if (dev == null || isNaN(n)) return '#9aa5b1'; // no climate data -> muted gray
  const t = Math.max(-1, Math.min(1, n / 25)); // -1 = 25d earlier, +1 = 25d later
  const mag = Math.abs(t);
  const hue = t <= 0 ? 8 : 205;          // red earlier, blue later
  const sat = 20 + mag * 65;             // neutral near baseline, saturated at extremes
  const light = 68 - mag * 20;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

export function getColorForFeature(feature) {
  // Special case for user location marker
  if (feature.isUserLocation) {
    return '#4ED9D9'; // Bright cyan color for user location
  }

  if (state.currentColorMode === COLOR_MODE.SEASON) {
    return seasonColor(feature.Season);
  }

  if (state.currentColorMode === COLOR_MODE.CLIMATE) {
    const dev = feature.deviation != null ? feature.deviation : feature.DeviationFromBaseline;
    return climateColor(dev);
  }

  if (state.currentColorMode === COLOR_MODE.FAMILY) {
    // In Family mode, all genera in the same family show the same family color
    const color = state.familyColors[feature.Family] || CONFIG.DEFAULT_COLOR;
    return color;
  } else if (state.currentColorMode === COLOR_MODE.GENUS) {
    // In Genus mode, each genus gets its unique shade of the family color
    const color = state.genusColors[feature.Genus] || state.familyColors[feature.Family] || CONFIG.DEFAULT_COLOR;
    if (!state.genusColors[feature.Genus]) {
      console.warn(`No color found for genus: ${feature.Genus}, Family: ${feature.Family}`);
    }
    return color;
  }
  return CONFIG.DEFAULT_COLOR;
}

export function calculatePointRadius(point) {
  // Special case for user location marker - make it smaller but still distinctive with pulsating effect
  if (point.isUserLocation) {
    const baseRadius = 0.7;
    const pulseScale = 1 + 0.4 * Math.sin(Date.now() * 0.005); // Pulsating effect
    return baseRadius * pulseScale;
  }
  
  return point.Area * CONFIG.POINT_AREA_SCALE + CONFIG.POINT_BASE_RADIUS;
}

export function calculatePolygonCenter(coordinates) {
  const ring = coordinates[0][0];
  let latSum = 0;
  let lngSum = 0;
  
  ring.forEach(coord => {
    lngSum += coord[0];
    latSum += coord[1];
  });
  
  const count = ring.length;
  return {
    lat: latSum / count,
    lng: lngSum / count
  };
}

export function createPointFromFeature(feature) {
  const center = calculatePolygonCenter(feature.geometry.coordinates);
  const properties = feature.properties;
  
  return {
    lat: center.lat,
    lng: center.lng,
    Site: `${properties.Family} - ${properties.Genus}`,
    Family: properties.Family,
    Genus: properties.Genus,
    Season: properties.Season,
    Area: properties.Area,
    year: properties.year,
    // Optional richer fields (present in the cherry-blossom dataset)
    Species: properties.Species,
    CommonName: properties.CommonName,
    deviation: properties.DeviationFromBaseline,
    temperature: properties.Temperature,
    maxR: properties.Area * CONFIG.RING_AREA_SCALE + CONFIG.RING_BASE_RADIUS,
    propagationSpeed: CONFIG.RING_PROPAGATION_SPEED,
    repeatPeriod: CONFIG.RING_REPEAT_PERIOD
  };
}

export function createHexPolygonLabel({ properties: data }) {
  return `
    <b>${data.Family} - ${data.Genus}</b><br/>
    Season: <i>${data.Season}</i><br/>
    Area: <i>${data.Area.toFixed(2)} km²</i><br/>
    Year: <i>${data.year}</i>
  `;
}

// Density heatmap color: perceptual "inferno"-style ramp (deep indigo = sparse ->
// magenta -> warm gold = dense), log-scaled so a handful of bins don't wash out the rest.
const DENSITY_STOPS = [[13, 59, 102], [42, 157, 143], [231, 111, 158], [255, 209, 232]];
function densityColor(count) {
  const t = Math.max(0, Math.min(1, Math.log10(count + 1) / 2.5));
  const seg = t * (DENSITY_STOPS.length - 1);
  const i = Math.min(DENSITY_STOPS.length - 2, Math.floor(seg));
  const f = seg - i;
  const a = DENSITY_STOPS[i], b = DENSITY_STOPS[i + 1];
  const ch = k => Math.round(a[k] + (b[k] - a[k]) * f);
  return `rgba(${ch(0)}, ${ch(1)}, ${ch(2)}, 0.88)`;
}

function seasonColor(season) {
  return SEASON_COLORS[season] || '#9aa5b1';
}

export function switchToHexMode() {
  if (!globe) return;
  globe.hexBinPointsData([]);
  globe.hexPolygonsData(state.filteredFeatures);
  globe.pointsData([]);
  globe.ringsData([]);
}

export function switchToPointsMode() {
  if (!globe) return;
  globe.hexBinPointsData([]);
  globe.pointsData(state.filteredPoints);
  globe.hexPolygonsData([]);
  globe.ringsData(state.ringsEnabled ? state.filteredPoints : []);
}

export function switchToDensityMode() {
  if (!globe) return;
  globe.pointsData([]);
  globe.hexPolygonsData([]);
  globe.ringsData([]);
  globe.hexBinPointsData(state.filteredPoints);
}

export function refreshGlobeColors() {
  if (!globe) return;
  globe.hexPolygonsData(globe.hexPolygonsData());
  globe.pointsData(globe.pointsData());
  globe.ringsData(globe.ringsData());
}

export function initializeClouds() {
  if (!globe) return;
  
  new THREE.TextureLoader().load(CONFIG.CLOUDS_IMAGE_URL, cloudsTexture => {
    const cloudsGeometry = new THREE.SphereGeometry(
      globe.getGlobeRadius() * (1 + CONFIG.CLOUDS_ALTITUDE), 
      75, 
      75
    );
    const cloudsMaterial = new THREE.MeshPhongMaterial({ 
      map: cloudsTexture, 
      transparent: true 
    });
    
    state.cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    animateClouds();
  });
}

function animateClouds() {
  if (state.cloudsMesh) {
    state.cloudsMesh.rotation.y += CONFIG.CLOUDS_ROTATION_SPEED * Math.PI / 180;
  }
  requestAnimationFrame(animateClouds);
}

export function toggleCloudsVisibility() {
  if (!state.cloudsMesh || !globe) return;
  
  const scene = globe.scene();
  if (scene.children.includes(state.cloudsMesh)) {
    scene.remove(state.cloudsMesh);
  } else {
    scene.add(state.cloudsMesh);
  }
}

export function toggleRings() {
  state.ringsEnabled = !state.ringsEnabled;
  if (state.currentDisplayMode === DISPLAY_MODE.POINTS) {
    globe.ringsData(state.ringsEnabled ? state.filteredPoints : []);
    refreshGlobeColors();
  }
}

export function applyGlobeStyle(style) {
  if (!globe) return;
  
  switch(style) {
    case 'detailed':
      applyDetailedStyle();
      break;
    case 'plain':
      applyPlainStyle();
      break;
    case 'normal':
    default:
      applyNormalStyle();
      break;
  }
}

function applyNormalStyle() {
  globe
    .globeImageUrl(CONFIG.EARTH_IMAGE_URL)
    .bumpImageUrl(CONFIG.EARTH_TOPOLOGY_URL)
    .showGlobe(true)
    .showAtmosphere(true);
  
  // Wait for textures to load, then reset globe material
  setTimeout(() => {
    const globeMaterial = globe.globeMaterial();
    globeMaterial.color = new THREE.Color(0xffffff); // Reset to white so texture shows properly
    globeMaterial.bumpScale = 1;
    globeMaterial.specularMap = null;
    globeMaterial.specular = new THREE.Color(0x111111);
    globeMaterial.shininess = 0;
    globeMaterial.transparent = false;
    globeMaterial.opacity = 1.0;
    globeMaterial.emissive = new THREE.Color(0x000000);
    globeMaterial.emissiveIntensity = 0;
    globeMaterial.needsUpdate = true;
    
    // Remove plain mode rim lights if they exist
    const scene = globe.scene();
    if (scene.userData.plainModeRimLight) {
      scene.remove(scene.userData.plainModeRimLight);
      scene.userData.plainModeRimLight = null;
    }
    if (scene.userData.plainModeRimLight2) {
      scene.remove(scene.userData.plainModeRimLight2);
      scene.userData.plainModeRimLight2 = null;
    }
  }, 100);
}

function applyDetailedStyle() {
  globe
    .globeImageUrl(CONFIG.EARTH_IMAGE_URL)
    .bumpImageUrl(CONFIG.EARTH_TOPOLOGY_URL)
    .showGlobe(true)
    .showAtmosphere(true);
  
  // Wait for textures to load, then enhance globe material
  setTimeout(() => {
    const globeMaterial = globe.globeMaterial();
    globeMaterial.color = new THREE.Color(0xffffff); // Reset to white so texture shows properly
    globeMaterial.bumpScale = 10;
    globeMaterial.transparent = false;
    globeMaterial.opacity = 1.0;
    globeMaterial.emissive = new THREE.Color(0x000000);
    globeMaterial.emissiveIntensity = 0;
    
    new THREE.TextureLoader().load('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-water.png', texture => {
      globeMaterial.specularMap = texture;
      globeMaterial.specular = new THREE.Color('grey');
      globeMaterial.shininess = 15;
      globeMaterial.needsUpdate = true;
    });
    
    // Adjust light position for better effect
    const directionalLight = globe.lights().find(light => light.type === 'DirectionalLight');
    if (directionalLight) {
      directionalLight.position.set(1, 1, 1);
    }
    
    // Remove plain mode rim lights if they exist
    const scene = globe.scene();
    if (scene.userData.plainModeRimLight) {
      scene.remove(scene.userData.plainModeRimLight);
      scene.userData.plainModeRimLight = null;
    }
    if (scene.userData.plainModeRimLight2) {
      scene.remove(scene.userData.plainModeRimLight2);
      scene.userData.plainModeRimLight2 = null;
    }
  }, 100);
}

function applyPlainStyle() {
  globe
    .globeImageUrl(null)
    .bumpImageUrl(null)
    .showGlobe(true)
    .showAtmosphere(true); // Enable atmosphere for edge glow
  
  // Wait a frame, then set solid colors for globe with edge lighting
  setTimeout(() => {
    const globeMaterial = globe.globeMaterial();
    globeMaterial.color = new THREE.Color('#0a0e12'); // Much darker for plain mode
    globeMaterial.bumpScale = 0;
    globeMaterial.specularMap = null;
    globeMaterial.specular = new THREE.Color(0x111111);
    globeMaterial.shininess = 3;
    globeMaterial.transparent = false;
    globeMaterial.opacity = 1.0;
    globeMaterial.emissive = new THREE.Color('#050608'); // Very dark emissive
    globeMaterial.emissiveIntensity = 0.2;
    globeMaterial.needsUpdate = true;
    
    // Enhance lighting for better edge definition
    const scene = globe.scene();
    const existingLights = scene.children.filter(child => child.isLight);
    
    // Add rim lighting if not already present - using white for glow effect
    if (!scene.userData.plainModeRimLight) {
      const rimLight = new THREE.DirectionalLight('#FFFFFF', 0.4);
      rimLight.position.set(-2, 1, 3);
      scene.add(rimLight);
      scene.userData.plainModeRimLight = rimLight;
      
      const rimLight2 = new THREE.DirectionalLight('#FFFFFF', 0.3);
      rimLight2.position.set(2, -1, -3);
      scene.add(rimLight2);
      scene.userData.plainModeRimLight2 = rimLight2;
    }
  }, 100);
}

export function setNightSkyBackground() {
  if (!globe) return;
  globe.backgroundImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png');
}

export function removeNightSkyBackground() {
  if (!globe) return;
  globe.backgroundImageUrl(null)
       .backgroundColor('rgba(15,17,21,1)'); // Background color from palette
}

export async function loadCountryBorders() {
  if (!globe) return;
  
  try {
    // Fetch TopoJSON data
    const response = await fetch(CONFIG.COUNTRIES_GEOJSON_URL);
    const topoData = await response.json();
    
    // Convert TopoJSON to GeoJSON using topojson library
    // The world-atlas data uses TopoJSON format which needs to be converted
    const countries = topojson.feature(topoData, topoData.objects.countries);
    
    // Set the countries data to the globe
    globe.polygonsData(countries.features);
    
    console.log('Country borders loaded successfully');
  } catch (error) {
    console.error('Error loading country borders:', error);
  }
}

export function toggleCountryBorders(show) {
  if (!globe) return;
  
  if (show) {
    loadCountryBorders();
  } else {
    globe.polygonsData([]);
  }
}

// User location marker
let userLocationMarker = null;

export function setUserLocationMarker(lat, lng) {
  if (!globe) return;
  
  console.log(`[User Location Marker] Setting marker at lat: ${lat}, lng: ${lng}`);
  
  // Remove existing marker if any
  removeUserLocationMarker();
  
  // Create a user location point object
  const userLocationPoint = {
    lat: lat,
    lng: lng,
    isUserLocation: true,
    Site: 'Your Location',
    Family: 'User',
    Genus: 'Location'
  };
  
  // Add to state.pointsData so it's included in filters
  if (!state.pointsData.some(point => point.isUserLocation)) {
    state.pointsData.push(userLocationPoint);
  }
  
  // Re-apply timeline filter to include the user location
  import('./components/timeline.js').then(module => {
    module.applyTimelineFilter();
  });
  
  console.log(`[User Location Marker] User location added to state.pointsData`);
  
  // Focus camera on user location
  globe.pointOfView({ lat, lng, altitude: 2 }, 1000);
  
  // Store reference for removal
  userLocationMarker = userLocationPoint;
  
  // Start pulsating animation
  startUserLocationAnimation();
}

export function removeUserLocationMarker() {
  if (!globe || !userLocationMarker) return;
  
  // Stop the animation
  stopUserLocationAnimation();
  
  // Remove from state.pointsData
  state.pointsData = state.pointsData.filter(point => !point.isUserLocation);
  
  // Re-apply timeline filter to update the display
  import('./components/timeline.js').then(module => {
    module.applyTimelineFilter();
  });
  
  console.log('[User Location Marker] User location removed from state.pointsData');
  userLocationMarker = null;
}

// Animation variables
let userLocationAnimationId = null;

function startUserLocationAnimation() {
  if (userLocationAnimationId) return; // Already animating
  
  function animate() {
    if (!userLocationMarker || !globe) {
      userLocationAnimationId = null;
      return;
    }
    
    // Trigger a re-render of points to show the pulsating effect
    if (state.currentDisplayMode === DISPLAY_MODE.POINTS) {
      globe.pointsData(state.filteredPoints); // Use filteredPoints from state
    }
    
    userLocationAnimationId = requestAnimationFrame(animate);
  }
  
  userLocationAnimationId = requestAnimationFrame(animate);
}

function stopUserLocationAnimation() {
  if (userLocationAnimationId) {
    cancelAnimationFrame(userLocationAnimationId);
    userLocationAnimationId = null;
  }
}
