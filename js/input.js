export class Input {
  constructor() {
    this.down = new Set();
    this.handlers = [];
    // analog stick state, written by TouchControls; chapters may read it
    this.touchAxis = { x: 0, y: 0, active: false };
    addEventListener('keydown', e => {
      if (e.repeat) return;
      this.down.add(e.code);
      for (const h of this.handlers) h(e);
    });
    addEventListener('keyup', e => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
  }

  isDown(...codes) {
    return codes.some(c => this.down.has(c));
  }

  // Synthetic key state for touch controls: same down-set and handlers as
  // real keys, so chapters cannot tell the difference.
  press(code) {
    if (this.down.has(code)) return;
    this.down.add(code);
    for (const h of this.handlers) h({ code });
  }

  release(code) {
    this.down.delete(code);
  }

  onKey(h) {
    this.handlers.push(h);
    return () => {
      const i = this.handlers.indexOf(h);
      if (i >= 0) this.handlers.splice(i, 1);
    };
  }
}
