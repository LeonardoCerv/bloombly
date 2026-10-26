import { state } from '../state.js';

let currentPoint = null;

export function initDescriptionCard() {
  const container = document.createElement('div');
  container.id = 'description-card';
  container.className = 'description-card';
  container.style.display = 'none';
  document.body.appendChild(container);
}

export function showDescriptionCard(point, event, coords) {
  currentPoint = point;
  const card = document.getElementById('description-card');

  if (!card) {
    console.error('Description card not initialized');
    return;
  }
  
  // Build the card content
  const familyColor = state.familyColors[point.Family] || '#4ED9D9';
  const genusImagePath = point.Genus ? `../images/${point.Genus}.png` : null;
  const season = point.Season || '';
  const seasonClass = season ? `dc-season-${season.toLowerCase()}` : '';
  const latStr = (typeof point.lat === 'number') ? `${point.lat.toFixed(2)}°` : '-';
  const lngStr = (typeof point.lng === 'number') ? `${point.lng.toFixed(2)}°` : '-';
  const isBin = point.binCount != null; // a clicked density hexbin (area summary)
  const common = isBin ? `<div class="dc-common">Most common bloom in this area</div>` : '';

  const statGroup = (k, v) => `
        <div class="dc-stat">
          <span class="dc-k">${k}</span>
          <span class="dc-v">${v}</span>
        </div>`;

  let statsHtml;
  if (isBin) {
    statsHtml = `
        ${statGroup('Blooms here', Number(point.binCount).toLocaleString())}
        ${statGroup('Peak season', season || '-')}
        ${statGroup('Location', `${latStr}, ${lngStr}`)}`;
  } else {
    statsHtml = `
        ${statGroup('Year', point.year != null ? point.year : '-')}
        ${statGroup('Bloom area', point.Area != null ? point.Area.toFixed(0) + ' km²' : '-')}
        ${statGroup('Location', `${latStr}, ${lngStr}`)}`;
  }

  card.innerHTML = `
    <button class="close-btn" id="closeDescriptionCard" aria-label="Close">✕</button>

    <div class="dc-hero" style="--family-color:${familyColor};">
      ${genusImagePath ? `
        <img src="${genusImagePath}" alt="${point.Genus}" class="dc-img"
             onerror="this.style.display='none'; this.closest('.dc-hero').classList.add('no-img');">
      ` : ''}
      <div class="dc-hero-fallback">🌸</div>
      ${season ? `<span class="dc-season-badge ${seasonClass}">${season}</span>` : ''}
    </div>

    <div class="dc-body">
      <div class="dc-title-row">
        <h3 class="dc-genus">${point.Genus || 'Unknown'}</h3>
        ${common}
        <div class="dc-family"><span class="dc-dot" style="background:${familyColor};"></span>${point.Family || 'N/A'}</div>
      </div>

      <div class="dc-stats">${statsHtml}
      </div>
    </div>
  `;
  
  // Show the card with animation
  card.style.display = 'block';

  // Use setTimeout to trigger animation after display is set
  setTimeout(() => {
    card.classList.add('visible');
  }, 10);
  
  // Attach close button event
  document.getElementById('closeDescriptionCard').addEventListener('click', hideDescriptionCard);
}

export function hideDescriptionCard() {
  const card = document.getElementById('description-card');
  if (!card) return;
  
  card.classList.remove('visible');
  
  // Wait for animation to complete before hiding
  setTimeout(() => {
    card.style.display = 'none';
    currentPoint = null;
  }, 300);
}

export function getCurrentPoint() {
  return currentPoint;
}
