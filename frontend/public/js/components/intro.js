// Cinematic intro overlay — the storytelling hook shown over the globe on launch.
export function showIntro() {
  if (document.getElementById('bloom-intro')) return;
  const el = document.createElement('div');
  el.id = 'bloom-intro';
  el.innerHTML = `
    <div class="intro-inner">
      <div class="intro-kicker">EARTH OBSERVATION · 1975–2025</div>
      <h1 class="intro-title">Bloombly</h1>
      <p class="intro-tagline">Fifty years of the planet in bloom.</p>
      <p class="intro-body">Every mark is a flower that opened somewhere on Earth. Spin the globe,
      scrub through the decades, and watch where &mdash; and when &mdash; life blooms.</p>
      <button class="intro-cta" id="introCta">Explore the globe &rarr;</button>
    </div>`;
  document.body.appendChild(el);

  const dismiss = () => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 700);
  };
  el.querySelector('#introCta').addEventListener('click', dismiss);
}
