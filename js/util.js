// Small shared helpers.

export const wait = ms => new Promise(r => setTimeout(r, ms));

export const until = cond => new Promise(r => {
  const f = () => (cond() ? r() : requestAnimationFrame(f));
  f();
});

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

// Animate a value over `dur` seconds, calling set(value) each frame.
export function tween(set, from, to, dur, ease = easeInOut) {
  return new Promise(r => {
    const t0 = performance.now();
    const f = () => {
      const k = Math.min(1, (performance.now() - t0) / (dur * 1000));
      set(from + (to - from) * ease(k));
      k < 1 ? requestAnimationFrame(f) : r();
    };
    f();
  });
}

const rgbCache = new Map();
export function hexToRgb(hex) {
  let c = rgbCache.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, c);
  }
  return c;
}
