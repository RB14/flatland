// Typewriter dialogue box. say(lines) resolves when the player has read everything.

const COLORS = {
  'NARRATOR': '#9aa0b5',
  'THE POINT': '#f4f1ff',
  'THE KING OF LINELAND': '#ff9a62',
  'ARTHUR': '#e7c95f',
  'HEX': '#7fd4ff',
  'THE SPHERE': '#c9a3ff',
};

export class Dialogue {
  constructor(el, audio) {
    this.el = el;
    this.speakerEl = el.querySelector('#speaker');
    this.textEl = el.querySelector('#text');
    this.advEl = el.querySelector('#advance');
    this.audio = audio;
    this.queue = [];
    this.resolve = null;
    this.full = '';
    this.shown = 0;
    this.timer = null;

    el.addEventListener('pointerdown', e => { e.stopPropagation(); this.advance(); });
    addEventListener('keydown', e => {
      if ((e.code === 'Space' || e.code === 'Enter') && !this.el.classList.contains('hidden')) {
        e.preventDefault();
        this.advance();
      }
    });
  }

  get active() {
    return !this.el.classList.contains('hidden');
  }

  say(lines) {
    return new Promise(res => {
      this.queue.push(...lines);
      const prev = this.resolve;
      this.resolve = () => { prev?.(); res(); };
      this.el.classList.remove('hidden');
      if (!this.timer && this.shown >= this.full.length) this._next();
    });
  }

  clear() {
    this.queue.length = 0;
    this.full = '';
    this.shown = 0;
    this._stopTimer();
    this.el.classList.add('hidden');
    const r = this.resolve;
    this.resolve = null;
    r?.();
  }

  _stopTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  _next() {
    const line = this.queue.shift();
    if (!line) {
      this.el.classList.add('hidden');
      const r = this.resolve;
      this.resolve = null;
      r?.();
      return;
    }
    this.full = line.text;
    this.shown = 0;
    this.speakerEl.textContent = line.who;
    this.speakerEl.style.color = COLORS[line.who] || '#aab1d0';
    this.textEl.textContent = '';
    this.advEl.style.visibility = 'hidden';
    this._stopTimer();
    this.timer = setInterval(() => {
      this.shown++;
      this.textEl.textContent = this.full.slice(0, this.shown);
      const c = this.full[this.shown - 1];
      if (this.shown % 3 === 0 && c && c !== ' ') this.audio.blip();
      if (this.shown >= this.full.length) this._finishLine();
    }, 16);
  }

  _finishLine() {
    this._stopTimer();
    this.textEl.textContent = this.full;
    this.shown = this.full.length;
    this.advEl.style.visibility = 'visible';
  }

  advance() {
    if (this.el.classList.contains('hidden')) return;
    if (this.shown < this.full.length) this._finishLine();
    else this._next();
  }
}
