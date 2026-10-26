// Ambient soundscape synthesized with the Web Audio API — no audio files, no licensing.
// A slow, detuned sine-pad chord with gentle volume drift, toggled by a corner button.
// (Browsers block audio until a user gesture, so it only starts on click.)

let ctx = null;
let master = null;
let voices = [];
let playing = false;

export function initMusicToggle() {
  if (document.getElementById('music-toggle')) return;
  const btn = document.createElement('button');
  btn.id = 'music-toggle';
  btn.type = 'button';
  btn.title = 'Ambient sound';
  btn.setAttribute('aria-label', 'Toggle ambient sound');
  btn.innerHTML = '<i class="fa-solid fa-music"></i>';
  btn.addEventListener('click', toggle);
  document.body.appendChild(btn);
}

function toggle() {
  if (!playing) start(); else stop();
}

function start() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();

    master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + 2.5);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 850;
    master.connect(filter);
    filter.connect(ctx.destination);

    // A2 · E3 · A3 · B3 — an open, airy voicing
    const freqs = [110, 164.81, 220, 246.94];
    voices = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = (i - 1.5) * 4; // a little chorus

      const g = ctx.createGain();
      g.gain.value = 0.9 / freqs.length;

      // slow tremolo so the pad breathes
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.045 + i * 0.017;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.35 / freqs.length;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);

      osc.connect(g);
      g.connect(master);
      osc.start();
      lfo.start();
      return { osc, lfo };
    });

    playing = true;
    const btn = document.getElementById('music-toggle');
    if (btn) btn.classList.add('on');
  } catch (e) {
    /* audio not available — fail silently */
  }
}

function stop() {
  if (ctx && master) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    const toStop = voices;
    setTimeout(() => toStop.forEach(v => { try { v.osc.stop(); v.lfo.stop(); } catch (e) {} }), 1300);
  }
  voices = [];
  playing = false;
  const btn = document.getElementById('music-toggle');
  if (btn) btn.classList.remove('on');
}
