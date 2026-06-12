export class Input {
  constructor() {
    this.down = new Set();
    this.handlers = [];
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

  onKey(h) {
    this.handlers.push(h);
    return () => {
      const i = this.handlers.indexOf(h);
      if (i >= 0) this.handlers.splice(i, 1);
    };
  }
}
