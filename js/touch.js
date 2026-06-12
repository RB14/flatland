// On-screen touch controls: a virtual joystick and contextual action buttons.
// They drive the shared Input key-state (press/release), so chapter movement
// code works unchanged on mobile. Chapters opt in via a `touch` config:
//   { joystick: 'x' | 'xy', actions: [{ label, code }] }

const THRESHOLD = 0.28;

export class TouchControls {
  constructor(input) {
    this.input = input;
    this.mode = null;
    this.active = new Set();

    this.root = document.createElement('div');
    this.root.id = 'touch';
    this.root.className = 'hidden';
    this.root.innerHTML = `
      <div id="joy"><div id="joy-thumb"></div></div>
      <div id="touch-actions"></div>`;
    document.body.appendChild(this.root);
    this.joy = this.root.querySelector('#joy');
    this.thumb = this.root.querySelector('#joy-thumb');
    this.actionsEl = this.root.querySelector('#touch-actions');

    let pid = null;
    const onMove = e => {
      if (e.pointerId !== pid) return;
      const r = this.joy.getBoundingClientRect();
      const half = r.width / 2;
      let dx = (e.clientX - (r.x + half)) / half;
      let dy = (e.clientY - (r.y + half)) / half;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      if (this.mode === 'x') dy = 0;
      this.thumb.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`;
      this._apply(dx, dy);
    };
    const onEnd = e => {
      if (e.pointerId !== pid) return;
      pid = null;
      this.thumb.style.transform = '';
      this._apply(0, 0);
    };
    this.joy.addEventListener('pointerdown', e => {
      pid = e.pointerId;
      try { this.joy.setPointerCapture(pid); } catch {}
      onMove(e);
    });
    this.joy.addEventListener('pointermove', onMove);
    this.joy.addEventListener('pointerup', onEnd);
    this.joy.addEventListener('pointercancel', onEnd);
  }

  // cfg: { joystick, actions } or null to hide entirely.
  configure(cfg) {
    this._clearKeys();
    this.actionsEl.innerHTML = '';
    if (!cfg) {
      this.mode = null;
      this.root.classList.add('hidden');
      return;
    }
    this.mode = cfg.joystick || 'xy';
    for (const a of cfg.actions || []) {
      const b = document.createElement('button');
      b.textContent = a.label;
      const press = e => {
        e.preventDefault();
        b.classList.add('on');
        this.active.add(a.code);
        this.input.press(a.code);
      };
      const release = () => {
        b.classList.remove('on');
        this.active.delete(a.code);
        this.input.release(a.code);
      };
      b.addEventListener('pointerdown', press);
      b.addEventListener('pointerup', release);
      b.addEventListener('pointercancel', release);
      this.actionsEl.appendChild(b);
    }
    this.root.classList.remove('hidden');
  }

  // Fade and disable while dialogue has the stage.
  setSuspended(s) {
    if (this.root.classList.contains('suspended') === s) return;
    this.root.classList.toggle('suspended', s);
    if (s) this._clearKeys();
  }

  _apply(dx, dy) {
    const want = new Set();
    if (dx < -THRESHOLD) want.add('KeyA');
    if (dx > THRESHOLD) want.add('KeyD');
    if (this.mode === 'xy') {
      if (dy < -THRESHOLD) want.add('KeyW');
      if (dy > THRESHOLD) want.add('KeyS');
    }
    for (const c of [...this.active]) {
      if (!want.has(c) && c.startsWith('Key')) {
        this.active.delete(c);
        this.input.release(c);
      }
    }
    for (const c of want) {
      if (!this.active.has(c)) {
        this.active.add(c);
        this.input.press(c);
      }
    }
  }

  _clearKeys() {
    for (const c of this.active) this.input.release(c);
    this.active.clear();
    this.thumb.style.transform = '';
  }
}
