export function initTopSelector() {
  const container = document.getElementById('top-selector-container');
  container.innerHTML = `
    <div class="top-selector">
      <div class="selector-content">
        <h1 class="selector-title">Bloombly</h1>
        <p class="selector-subtitle">Fifty years of the planet in bloom</p>
        <div id="load-status" class="load-status" role="status" aria-live="polite">
          <span class="load-text">Loading bloom records</span>
          <span class="load-bar"><span class="load-bar-fill"></span></span>
        </div>
      </div>
    </div>
  `;
}

// Loading indicator under the title. `fraction` is 0..1 for a determinate bar, or null
// while the size is unknown (the bar then shimmers instead of filling).
export function setLoadStatus(text, fraction = null) {
  const el = document.getElementById('load-status');
  if (!el) return;
  el.classList.remove('is-error', 'is-done');
  el.querySelector('.load-text').textContent = text;
  const fill = el.querySelector('.load-bar-fill');
  const determinate = typeof fraction === 'number' && isFinite(fraction);
  el.classList.toggle('is-indeterminate', !determinate);
  fill.style.width = determinate ? `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%` : '';
}

// Shows a failure inline, in place of the progress text. textContent only: the message can
// carry server text, so it is never parsed as HTML.
export function showLoadError(message) {
  const el = document.getElementById('load-status');
  if (!el) return;
  el.classList.remove('is-indeterminate', 'is-done');
  el.classList.add('is-error');
  el.querySelector('.load-text').textContent = message;
}

// Fades the indicator out once the first frame with data has been drawn.
export function hideLoadStatus() {
  const el = document.getElementById('load-status');
  if (!el || el.classList.contains('is-error')) return;
  el.classList.add('is-done');
  setTimeout(() => { if (el.classList.contains('is-done')) el.hidden = true; }, 700);
}
