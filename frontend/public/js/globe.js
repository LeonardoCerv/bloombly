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
    // Density (hexbin) layer: aggregates blooms into hexagons so the whole dataset
    // reads as a heatmap. Starts empty; populated by switchToDensityMode().
    .hexBinPointLat(d => d.lat)
    .hexBinPointLng(d => d.lng)
    .hexBinPointWeight(1)
    .hexBinResolution(CONFIG.HEXBIN_RESOLUTION)
    .hexBinMerge(false)
    .hexAltitude(d => Math.min(CONFIG.HEXBIN_MAX_ALTITUDE, 0.02 + Math.sqrt(d.sumWeight) * 0.02))
    .hexTopColor(d => densityColor(d.sumWeight))
    .hexSideColor(d => densityColor(d.sumWeight))
    .hexLabel(d => `<b>${d.sumWeight.toLocaleString()}</b> bloom record${d.sumWeight === 1 ? '' : 's'}`)
    .onHexClick(handleHexClick)
    .onHexHover(handleHexHover)
    // Short column transition: the story advances every 600ms, and the default 1s tween
    // never finished before the next re-aggregation, which is what made autoplay stutter.
    .hexTransitionDuration(250)
    .hexBinPointsData([]);

  // controls() can be briefly unavailable until the renderer has a sized container;
  // guard so a slow init never throws and blanks the page.
  const controls = globe.controls && globe.controls();
  if (controls) {
    controls.autoRotate = true;      // slow idle spin, so the globe feels alive
    controls.autoRotateSpeed = 0.28;
  }

  // globe.gl sizes its canvas once, at init. Follow the window so rotating a phone or
  // resizing the browser does not leave a stretched or clipped canvas.
  let resizeQueued = false;
  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      globe.width(window.innerWidth).height(window.innerHeight);
    });
  });

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

// Hover highlight, so clicking a hex feels discoverable. Hover only fires on individual hexes,
// i.e. while the story is paused (the merged mesh used during play is not hoverable).
// Re-setting hexTopColor would make three-globe re-bin every point and rebuild every hex on
// each hover change, and hexes of the same color share one material, so instead the hovered
// mesh gets brightened copies of its own [side, top] materials until the pointer leaves.
const HOVER_WHITE = new THREE.Color(0xffffff);
let hoveredHex = null; // { obj, original, highlight }

function clearHexHighlight() {
  if (!hoveredHex) return;
  const { obj, original, highlight } = hoveredHex;
  // A re-render may already have given the mesh fresh materials; only undo our own swap.
  if (obj.material === highlight) obj.material = original;
  highlight.forEach(m => m.dispose());
  hoveredHex = null;
}

function handleHexHover(hex) {
  const obj = hex && hex.__threeObj;
  if (hoveredHex && hoveredHex.obj === obj) return;
  clearHexHighlight();
  if (!obj || !Array.isArray(obj.material)) return;
  const original = obj.material;
  const highlight = original.map(m => {
    const c = m.clone();
    c.color.lerp(HOVER_WHITE, 0.35);
    if (c.emissive) c.emissive.copy(c.color).multiplyScalar(0.25);
    return c;
  });
  obj.material = highlight;
  hoveredHex = { obj, original, highlight };
}

export function getGlobe() {
  return globe;
}

export function getColorForFeature(feature) {
  // Special case for user location marker
  if (feature.isUserLocation) {
    return '#4ED9D9'; // Bright cyan color for user location
  }

  if (state.currentColorMode === COLOR_MODE.SEASON) {
    return seasonColor(feature.Season);
  }

  if (state.currentColorMode === COLOR_MODE.FAMILY) {
    // In Family mode, all genera in the same family show the same family color
    const color = state.familyColors[feature.Family] || CONFIG.DEFAULT_COLOR;
    return color;
  } else if (state.currentColorMode === COLOR_MODE.GENUS) {
    // In Genus mode, each genus gets its unique shade of the family color
    return state.genusColors[feature.Genus] || state.familyColors[feature.Family] || CONFIG.DEFAULT_COLOR;
  }
  return CONFIG.DEFAULT_COLOR;
}

export function calculatePointRadius(point) {
  // The user location marker is a fixed dot; its pulse comes from a ring (see markerRings).
  if (point.isUserLocation) return 0.6;

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
    maxR: properties.Area * CONFIG.RING_AREA_SCALE + CONFIG.RING_BASE_RADIUS,
    propagationSpeed: CONFIG.RING_PROPAGATION_SPEED,
    repeatPeriod: CONFIG.RING_REPEAT_PERIOD
  };
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

// three-globe tags live per-hex objects with __globeObjType 'hexbin' and the single merged
// mesh with 'hexBinPoints', both inside the same layer group. When the merge flag flips back
// to unmerged, the merged mesh is left behind in that group, so after any unmerged render we
// sweep the group and drop anything that is not a live hex. The mesh is only detached, not
// disposed, since three-globe may reuse it the next time the layer merges.
let hexLayerGroup = null;
function purgeOrphanedMergedHexes() {
  if (!globe || globe.hexBinMerge()) return;
  if (!hexLayerGroup) {
    globe.scene().traverse(o => {
      const t = o.__globeObjType;
      if (!hexLayerGroup && (t === 'hexbin' || t === 'hexBinPoints') && o.parent) hexLayerGroup = o.parent;
    });
  }
  if (!hexLayerGroup) return;
  [...hexLayerGroup.children].forEach(child => {
    if (child.isMesh && child.__globeObjType !== 'hexbin') hexLayerGroup.remove(child);
  });
}
function scheduleHexPurge() {
  requestAnimationFrame(() => requestAnimationFrame(purgeOrphanedMergedHexes));
}

// three-globe binds each rendered object onto its datum under one shared key (__threeObj), so
// one object cannot feed two layers: in Rings mode the rings layer overwrote the points
// layer's binding, and leaving Rings orphaned every point and ring in the scene (FPS fell to
// ~17 and never recovered). The rings layer therefore gets its own datum per point: stable
// (cached) so unchanged rings survive a re-render, and a plain copy of just the fields the
// ring accessors and getColorForFeature read. (Not prototype-linked: the rings ticker reads
// d.__threeObj, which would then fall through to the point's own mesh.)
const ringDatums = new WeakMap();
function ringDatum(point) {
  let d = ringDatums.get(point);
  if (!d) {
    const { lat, lng, maxR, propagationSpeed, repeatPeriod, Season, Family, Genus, isUserLocation } = point;
    d = { lat, lng, maxR, propagationSpeed, repeatPeriod, Season, Family, Genus, isUserLocation };
    ringDatums.set(point, d);
  }
  return d;
}

// The "you are here" marker pulses as a ring in every mode, so it stays visible on the
// density heatmap too (where it is not a bloom and must not be counted).
function markerRings() {
  return userLocationMarker ? [ringDatum(userLocationMarker)] : [];
}

// Rings pulse only on the blooms recorded in the story's current year (or the latest year
// shown, when the full range is on screen); every bloom is still drawn as a point. A ring per
// record meant tens of thousands of animated rings by the later decades, at 2 to 7 FPS.
function currentRings() {
  if (!state.ringsEnabled) return markerRings();
  let year;
  if (state.timelineActive && state.allYears.length) {
    year = state.allYears[state.currentTimelineIndex];
  } else {
    year = -Infinity;
    for (const p of state.filteredPoints) if (p.year > year) year = p.year;
  }
  return state.filteredPoints.filter(p => p.isUserLocation || p.year === year).map(ringDatum);
}

// three-globe keeps a ring that left the data for 30s (removeDelay) so its last wave can
// fade, and while it lingers every later digest walks it and schedules its removal again.
// The story changes the ring set every tick, so thousands of retired ring groups piled up
// (Rings ran at ~8 FPS). Once the new set has been digested, detach every ring group that
// is no longer bound to a current datum; waves already in flight finish and free themselves.
let ringLayerGroup = null;
function purgeRetiredRings(attempt = 0) {
  if (!globe) return;
  if (!ringLayerGroup) {
    globe.scene().traverse(o => {
      if (!ringLayerGroup && o.__globeObjType === 'ring' && o.parent) ringLayerGroup = o.parent;
    });
  }
  if (!ringLayerGroup) return;
  [...ringLayerGroup.children].forEach(child => {
    const d = child.__data;
    if (!d || d.__threeObj !== child) ringLayerGroup.remove(child);
  });
  // three-globe digests data changes on a timer. After a heavy frame (tearing down tens of
  // thousands of point meshes) the sweep can run first and find the old rings still bound,
  // so check again until the layer holds no more rings than the data.
  if (ringLayerGroup.children.length > globe.ringsData().length && attempt < 8) {
    setTimeout(() => purgeRetiredRings(attempt + 1), 250);
  }
}
let lastRingCount = 0;
function setRingsData(data) {
  const hadRings = lastRingCount > 0;
  lastRingCount = data.length;
  globe.ringsData(data);
  // Nothing can retire when there were no rings (the density story passes [] every tick).
  if (hadRings) requestAnimationFrame(() => requestAnimationFrame(() => purgeRetiredRings()));
}

export function switchToPointsMode() {
  if (!globe) return;
  globe.hexBinPointsData([]);
  globe.pointsData(state.filteredPoints);
  setRingsData(currentRings());
  scheduleHexPurge();
}

// While the story plays, the hexbins render as one merged mesh, which is far cheaper to
// rebuild every tick. Merged hexes are not clickable, so the timeline unmerges on pause.
export function setHexBinMerged(flag) {
  return new Promise(resolve => {
    if (!globe) return resolve();
    flag = !!flag;
    if (globe.hexBinMerge() === flag) return resolve();
    // Empty the layer and let three-globe digest that in the CURRENT mode (it batches
    // property changes per frame) before flipping the flag. Flipping with data present
    // leaves the previous merged mesh orphaned in the scene. Callers re-set data after.
    globe.hexBinPointsData([]);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      globe.hexBinMerge(flag);
      resolve();
    }));
  });
}

export function switchToDensityMode() {
  if (!globe) return;
  globe.pointsData([]);
  setRingsData(markerRings());
  globe.hexBinPointsData(userLocationMarker
    ? state.filteredPoints.filter(p => !p.isUserLocation)
    : state.filteredPoints);
  scheduleHexPurge();
}

export function refreshGlobeColors() {
  if (!globe) return;
  globe.pointsData(globe.pointsData());
  globe.ringsData(globe.ringsData());
}

export function toggleRings() {
  state.ringsEnabled = !state.ringsEnabled;
  if (state.currentDisplayMode === DISPLAY_MODE.POINTS) {
    setRingsData(currentRings());
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

  // Remove existing marker if any
  removeUserLocationMarker();

  // The marker rides along in state.pointsData so the filters keep it, and pulses as a
  // ring (maxR / propagationSpeed / repeatPeriod are read by the rings layer).
  const userLocationPoint = {
    lat: lat,
    lng: lng,
    isUserLocation: true,
    Site: 'Your Location',
    Family: 'User',
    Genus: 'Location',
    maxR: 3,
    propagationSpeed: 2,
    repeatPeriod: 900
  };

  if (!state.pointsData.some(point => point.isUserLocation)) {
    state.pointsData.push(userLocationPoint);
  }

  // Store reference before re-rendering, so the layers pick up the marker ring
  userLocationMarker = userLocationPoint;

  // Re-apply timeline filter to include the user location
  import('./components/timeline.js').then(module => {
    module.applyTimelineFilter();
  });

  // Focus camera on user location
  globe.pointOfView({ lat, lng, altitude: 2 }, 1000);
}

export function removeUserLocationMarker() {
  if (!globe || !userLocationMarker) return;

  userLocationMarker = null;
  state.pointsData = state.pointsData.filter(point => !point.isUserLocation);

  // Re-apply timeline filter to update the display
  import('./components/timeline.js').then(module => {
    module.applyTimelineFilter();
  });
}
