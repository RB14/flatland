// The shared 2D world of Flatland. Chapter 2 (Flatland) walks it from within;
// Chapter 3 (Spaceland) renders the very same geometry seen from above.

import { regularPolygon } from './math/poly.js';
import { clamp } from './util.js';

export function buildWorld() {
  const bounds = { x0: -70, x1: 70, y0: -45, y1: 45 };
  const shapes = [];

  shapes.push({
    kind: 'border', name: 'The Great Wall', closed: true, color: '#39406a',
    pos: [0, 0], angle: 0,
    pts: [[bounds.x0, bounds.y0], [bounds.x1, bounds.y0], [bounds.x1, bounds.y1], [bounds.x0, bounds.y1]],
  });

  shapes.push(house(-40, 18, 13));
  shapes.push(house(38, -22, 11));

  // Citizens, by caste (Abbott: the more sides, the higher the class).
  const C = (name, pts, color, x, y, speed) => ({
    kind: 'citizen', name, pts, color, closed: true,
    pos: [x, y], angle: Math.random() * Math.PI * 2, speed, turn: 0,
  });
  shapes.push(C('a Soldier',   [[3.8, 0], [-2.8, 1.2], [-2.8, -1.2]],      '#e06c5a', -18, 4,  5.5));
  shapes.push(C('a Workman',   regularPolygon(3, 2.9),                     '#e0985a',  10, -12, 4.5));
  shapes.push(C('a Merchant',  regularPolygon(4, 2.7, Math.PI / 4),        '#d9b657',  -5, 14,  4));
  shapes.push(C('a Lawyer',    regularPolygon(4, 2.7),                     '#c7cc6b',  20, 8,   4));
  shapes.push(C('a Physician', regularPolygon(5, 2.9),                     '#79c478',  -25, -14, 3.5));
  shapes.push(C('a Magistrate',regularPolygon(5, 3.1),                     '#5fc99b',  6, 28,   3.2));
  shapes.push(C('a Noble',     regularPolygon(6, 3.1),                     '#5fc9c9',  -38, -28, 3));
  shapes.push(C('a Priest',    regularPolygon(18, 3.3),                    '#cfa3ff',  45, 20,  2.6));

  const hex = {
    kind: 'hex', name: 'Hex', closed: true,
    pts: regularPolygon(6, 3.2, Math.PI / 6), color: '#7fd4ff',
    pos: [30, 22], angle: 0,
  };
  shapes.push(hex);

  return {
    bounds, shapes, hex,
    spawn: [-12, -30],
    houses: shapes.filter(s => s.kind === 'house'),
    citizens: shapes.filter(s => s.kind === 'citizen'),
  };
}

// Pentagonal house (Abbott: roof vertex to the north) with a door gap in the south wall.
function house(cx, cy, r) {
  const p = regularPolygon(5, r, Math.PI / 2);
  const d0 = mix(p[2], p[3], 0.38), d1 = mix(p[2], p[3], 0.62);
  return {
    kind: 'house', name: 'a House', closed: false, color: '#6f7bb8',
    pos: [cx, cy], angle: 0,
    pts: [d1, p[3], p[4], p[0], p[1], p[2], d0],
  };
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function transformedPts(s) {
  const c = Math.cos(s.angle), sn = Math.sin(s.angle);
  return s.pts.map(p => [s.pos[0] + p[0] * c - p[1] * sn, s.pos[1] + p[0] * sn + p[1] * c]);
}

export function shapeSegments(s) {
  const P = transformedPts(s);
  const segs = [];
  const n = s.closed ? P.length : P.length - 1;
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    segs.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1], shape: s });
  }
  return segs;
}

// Aimless-but-bounded wandering for citizens. `avoid` (e.g. the player) is both
// steered around and hard-clamped: solid bodies do not pass through one another.
export function wander(c, dt, world, speedScale = 1, avoid = null) {
  c.turn = clamp(c.turn + (Math.random() - 0.5) * dt * 4, -1.3, 1.3);
  c.angle += c.turn * dt;
  const v = c.speed * speedScale * dt;
  c.pos[0] += Math.cos(c.angle) * v;
  c.pos[1] += Math.sin(c.angle) * v;

  const b = world.bounds, m = 9;
  let tx = null, ty = null;
  if (c.pos[0] < b.x0 + m || c.pos[0] > b.x1 - m || c.pos[1] < b.y0 + m || c.pos[1] > b.y1 - m) {
    tx = 0; ty = 0; // steer back toward the centre
  }
  for (const h of world.houses) {
    const dx = c.pos[0] - h.pos[0], dy = c.pos[1] - h.pos[1];
    if (dx * dx + dy * dy < 19 * 19) { tx = c.pos[0] + dx; ty = c.pos[1] + dy; }
  }
  if (avoid) {
    const dx = c.pos[0] - avoid[0], dy = c.pos[1] - avoid[1];
    const d2 = dx * dx + dy * dy;
    if (d2 < 12 * 12) { tx = c.pos[0] + dx; ty = c.pos[1] + dy; } // steer away
    const min = 5.2, d = Math.sqrt(d2);
    if (d < min && d > 1e-4) { // no walking through Arthur
      c.pos[0] = avoid[0] + (dx / d) * min;
      c.pos[1] = avoid[1] + (dy / d) * min;
    }
  }
  if (tx !== null) {
    const ta = Math.atan2(ty - c.pos[1], tx - c.pos[0]);
    let d = ta - c.angle;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    c.angle += d * dt * 2.5;
  }
}
