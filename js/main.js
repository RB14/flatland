// FLATLAND: ASCENSION — game shell: scene manager, HUD, title/end screens.

import { Input } from './input.js';
import { AudioFX } from './audio.js';
import { Dialogue } from './dialogue.js';
import { TouchControls } from './touch.js';
import { resizeRenderer } from './three-setup.js';
import { wait } from './util.js';
import { chapter0 } from './scenes/chapter0.js';
import { chapter1 } from './scenes/chapter1.js';
import { chapter2 } from './scenes/chapter2.js';
import { chapter3 } from './scenes/chapter3.js';
import { chapter4 } from './scenes/chapter4.js';

const $ = id => document.getElementById(id);
const flat = $('flat'), retina = $('retina');
const fx = flat.getContext('2d'), rx = retina.getContext('2d');
const glContainer = $('gl');
const retinaWrap = $('retina-wrap');
const overlay = $('overlay'), fader = $('fader');
const hintEl = $('hint'), panelEl = $('panel'), choicesEl = $('choices');
const navEl = $('nav');

const audio = new AudioFX();
const input = new Input();
const dialogue = new Dialogue($('dialogue'), audio);

// Touch devices get on-screen controls (?touch=1/0 overrides for testing)
const bootParams = new URLSearchParams(location.search);
const isTouch = bootParams.has('touch')
  ? bootParams.get('touch') !== '0'
  : matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');
const touch = new TouchControls(input);

addEventListener('pointerdown', () => audio.ensure());
addEventListener('keydown', () => audio.ensure());

const hud = {
  set(dim, title, sub) {
    const b = $('dim-badge');
    b.textContent = `${dim}D`;
    b.className = `d${dim}`;
    $('chapter-title').textContent = title;
    $('chapter-sub').textContent = sub || '';
  },
};

function hint(html) { hintEl.innerHTML = html || ''; }

function choose(options) {
  return new Promise(res => {
    choicesEl.innerHTML = '';
    options.forEach((label, i) => {
      const b = document.createElement('button');
      b.innerHTML = label;
      b.onclick = () => { choicesEl.innerHTML = ''; audio.click(); res(i); };
      choicesEl.appendChild(b);
    });
  });
}

const panel = {
  add(label, onClick, { active = false, major = false } = {}) {
    const b = document.createElement('button');
    b.className = 'chip' + (active ? ' active' : '') + (major ? ' major' : '');
    b.innerHTML = label;
    b.onclick = () => { audio.click(); onClick(); };
    panelEl.appendChild(b);
    return b;
  },
  clear() { panelEl.innerHTML = ''; },
};

const ctx = {
  flat, fx, retina, rx, glContainer,
  audio, input, dialogue, hud, hint, choose, panel, isTouch,
  clearChoices: () => { choicesEl.innerHTML = ''; },
  state: {},
  goto: i => manager.goto(i),
  showEnd,
};

window.__fl = ctx.state; // debug/testing peek at chapter state

const factories = [chapter0, chapter1, chapter2, chapter3, chapter4];
const NAV_LABELS = ['0D', '1D', '2D', '3D', '4D'];
const navDots = [];

const manager = {
  idx: -1,
  cur: null,
  switching: false,
  async goto(i) {
    if (this.switching || i < 0 || i >= factories.length) return;
    this.switching = true;
    fader.style.opacity = 1;
    await wait(400);
    try { this.cur?.dispose?.(); } catch (e) { console.warn(e); }
    dialogue.clear();
    panel.clear();
    choicesEl.innerHTML = '';
    hint('');

    this.idx = i;
    this.cur = factories[i](ctx);
    const u = this.cur.uses || {};
    flat.classList.toggle('hidden', !u.flat);
    retinaWrap.classList.toggle('hidden', !u.retina);
    glContainer.classList.toggle('hidden', !u.gl);
    touch.configure(isTouch ? this.cur.touch || null : null);
    // hint placement: top-centre only when the joystick occupies the bottom
    document.body.classList.toggle('joy', isTouch && !!this.cur.touch);
    hud.set(this.cur.dim, this.cur.title, this.cur.sub);
    audio.setMood(this.cur.dim);
    navDots.forEach((d, k) => d.classList.toggle('active', k === i));

    let ready;
    try { ready = this.cur.init(); } catch (e) { ready = Promise.reject(e); }
    fader.style.opacity = 0;
    this.switching = false;
    try {
      await ready;
    } catch (e) {
      console.error(e);
      hint('⚠ this chapter needs <b>WebGL</b>, which your browser refused to provide —<br>chapters 0D–2D still work; try a browser with hardware acceleration for 3D/4D');
    }
  },
};

// ---- nav dots + mute ----
NAV_LABELS.forEach((label, i) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.title = `jump to chapter ${i}`;
  b.onclick = () => manager.goto(i);
  navEl.appendChild(b);
  navDots.push(b);
});
const muteBtn = document.createElement('button');
muteBtn.id = 'mute';
muteBtn.textContent = '🔊';
muteBtn.onclick = () => {
  audio.setMuted(!audio.muted);
  muteBtn.textContent = audio.muted ? '🔇' : '🔊';
};
navEl.appendChild(muteBtn);

input.onKey(e => {
  const m = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4 };
  if (m[e.code] !== undefined && !overlayVisible()) manager.goto(m[e.code]);
});

// ---- resize ----
function fit() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  flat.width = Math.round(innerWidth * dpr);
  flat.height = Math.round(innerHeight * dpr);
  flat.style.width = innerWidth + 'px';
  flat.style.height = innerHeight + 'px';
  fx.setTransform(dpr, 0, 0, dpr, 0, 0);
  retina.width = innerWidth < 700 ? 320 : 480; // fewer raycast columns on phones
  resizeRenderer();
  manager.cur?.onResize?.();
}
addEventListener('resize', fit);
fit();

// ---- main loop ----
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  touch.setSuspended(dialogue.active);
  try { manager.cur?.update?.(dt); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- title & end screens ----
function overlayVisible() { return !overlay.classList.contains('hidden'); }

function showTitle() {
  overlay.innerHTML = `
    <div id="title-screen">
      <div class="orn"></div><div class="orn two"></div>
      <h1>FLATLAND</h1>
      <h2>ASCENSION</h2>
      <div class="tag">A JOURNEY THROUGH THE DIMENSIONS</div>
      <p class="quote">“Either this is madness, or it is Hell.”<br>
      “It is neither,” calmly replied the voice of the Sphere. “It is Knowledge.”</p>
      <button id="begin">▶ &nbsp;BEGIN IN POINTLAND</button>
      <p class="fine">after Edwin A. Abbott's “Flatland: A Romance of Many Dimensions” (1884)<br>
      ${isTouch
        ? 'drag the stick to move · tap the box to advance dialogue · dimension dots jump chapters · 🎧 sound on'
        : 'WASD / arrows to move · SPACE to advance dialogue · 1–5 to jump between dimensions · 🎧 sound on'}</p>
    </div>`;
  overlay.classList.remove('hidden');
  $('begin').onclick = () => {
    audio.ensure();
    audio.click();
    const root = document.documentElement;
    const canFullscreen = root.requestFullscreen || root.webkitRequestFullscreen;
    if (isTouch && canFullscreen && !document.fullscreenElement) {
      showFullscreenAsk();
      return;
    }
    overlay.classList.add('hidden');
    manager.goto(0);
  };
}

// On touch devices, offer fullscreen before the journey begins. The request
// must come from a user gesture, so it rides on the YES button's click.
function showFullscreenAsk() {
  overlay.innerHTML = `
    <div id="title-screen">
      <div class="orn"></div><div class="orn two"></div>
      <h1 style="font-size:60px">⛶</h1>
      <p class="quote">A journey through the dimensions is best taken<br>edge to edge — no borders, no browser chrome.</p>
      <button id="fs-yes">⛶ &nbsp;PLAY FULLSCREEN</button>
      <button id="fs-no" class="ghostbtn">CONTINUE IN THE BROWSER</button>
    </div>`;
  const start = () => {
    overlay.classList.add('hidden');
    manager.goto(0);
  };
  $('fs-yes').onclick = () => {
    audio.click();
    const root = document.documentElement;
    try {
      const p = root.requestFullscreen ? root.requestFullscreen() : root.webkitRequestFullscreen();
      p?.catch?.(() => {});
    } catch { /* declined or unsupported — play windowed */ }
    start();
  };
  $('fs-no').onclick = () => { audio.click(); start(); };
}

function showEnd() {
  overlay.innerHTML = `
    <div id="title-screen">
      <div class="orn"></div><div class="orn two"></div>
      <h1 style="font-size:clamp(40px,6vw,64px)">BEYOND</h1>
      <p class="quote">“Upward, not northward — and beyond.”</p>
      <p class="quote">To the Point, the Line was heresy. To the Line, the Plane.<br>
      To the Plane, Space; to Space, the Tesseract.<br>
      The pity always flows downward — and the doubt always points up.</p>
      <button id="again">⟲ &nbsp;BEGIN AGAIN IN POINTLAND</button>
      <button id="explore" class="ghostbtn">✦ &nbsp;KEEP EXPLORING THE TESSERACT</button>
      <p class="fine">in memory of Edwin A. Abbott, 1838–1926</p>
    </div>`;
  overlay.classList.remove('hidden');
  $('again').onclick = () => { audio.click(); overlay.classList.add('hidden'); manager.goto(0); };
  $('explore').onclick = () => { audio.click(); overlay.classList.add('hidden'); };
}

// ---- boot ----
const params = new URLSearchParams(location.search);
if (params.has('ch')) {
  overlay.classList.add('hidden');
  manager.goto(Math.max(0, Math.min(4, +params.get('ch') || 0)));
} else {
  showTitle();
}
