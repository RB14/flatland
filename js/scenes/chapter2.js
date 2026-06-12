// Chapter 2 — FLATLAND. The god view shows the plane; the retina strip shows
// what a Flatlander actually sees: a single 1D line of light, where nearness
// burns through the fog ("recognition by fog", straight from Abbott).

import { wait, until, tween, clamp, lerp, hexToRgb, dist2 } from '../util.js';
import { raySegment, distPointSegment } from '../math/poly.js';
import { buildWorld, shapeSegments, transformedPts, wander } from '../world2d.js';

const FOV = 2.7;     // ~155°
const FOG = 58;      // beyond this, darkness
const INTRO = [
  { who: 'NARRATOR', text: 'FLATLAND. Two dimensions. An infinite plane of breadth and width — with no conception of "up", for there is no up to conceive.' },
  { who: 'NARRATOR', text: 'You are A. Square — Arthur, to friends. A respectable, four-sided gentleman of the professional class.' },
  { who: 'NARRATOR', text: 'Below lies your RETINA. To a Flatlander the world is a single line of light: nearer edges burn brighter through the fog. That is how shapes are known.' },
];
const HEX_LINES = [
  { who: 'HEX', text: 'Grandfather! Look — I have been doing sums. A point, moved, makes a line: one dimension. A line, moved, makes a square: two dimensions...' },
  { who: 'ARTHUR', text: 'Sound geometry, child. Two-squared: four corners. And...?' },
  { who: 'HEX', text: 'SO — if a square moved some OTHER way — not north, not east, a NEW way — it would sweep a... a super-square! Two-to-the-THIRD! Eight corners!' },
  { who: 'ARTHUR', text: 'Hex! That is the rankest mathematical heresy. There IS no "other way". One more word of it and it is off to bed without supper.' },
  { who: 'HEX', text: '...You always say geometry never lies, grandfather.' },
];
const NIGHT_LINE = [
  { who: 'NARRATOR', text: 'That night, while Flatland slept... a visitor arrived at the house of A. Square.' },
];
const SPHERE_1 = [
  { who: 'THE SPHERE', text: 'ARTHUR SQUARE. Do not be alarmed.' },
  { who: 'ARTHUR', text: 'A circle?! In my study! Appearing from NOWHERE — growing — shrinking — no Circle of the priestly caste behaves so!' },
  { who: 'THE SPHERE', text: 'I am no Circle. I am a SPHERE: a stack of infinite circles, piled in a direction you cannot point to. What you see is only my SLICE — the place where I cut through your plane.' },
  { who: 'ARTHUR', text: 'Watch the retina, it says. A line that swells... and fades... Madness. And yet — Hex’s super-square had eight corners...' },
];
const SPHERE_2 = [
  { who: 'THE SPHERE', text: 'Argument has failed Spheres for two thousand years. Very well, Square — DEMONSTRATION. Brace yourself.' },
  { who: 'THE SPHERE', text: 'UPWARD — NOT NORTHWARD!' },
];

export function chapter2(ctx) {
  let alive = true, t = 0;
  const { fx, rx, retina, input, dialogue } = ctx;

  const world = ctx.state.world || buildWorld();
  ctx.state.world = world;
  const player = { pos: [...world.spawn], angle: Math.PI / 2 };
  ctx.state.arthur = player;

  let phase = 'intro', night = 0, whiteout = 0, controls = true;
  let zoom = innerWidth < 700 ? 5.2 : 7; // wider framing on phones
  let sphere = null; // { pos, t, r }
  let segsCache = null;

  function allSegs() {
    if (segsCache) return segsCache;
    const segs = [];
    for (const s of world.shapes) segs.push(...shapeSegments(s));
    if (sphere && sphere.r > 0.4) {
      const n = 28;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        segs.push({
          x1: sphere.pos[0] + Math.cos(a0) * sphere.r, y1: sphere.pos[1] + Math.sin(a0) * sphere.r,
          x2: sphere.pos[0] + Math.cos(a1) * sphere.r, y2: sphere.pos[1] + Math.sin(a1) * sphere.r,
          shape: { color: '#c9a3ff' },
        });
      }
    }
    segsCache = segs;
    return segs;
  }

  function move(dt) {
    if (!controls) return;
    const turn = 2.4 * dt, sp = 16 * dt;
    if (input.isDown('KeyA', 'ArrowLeft')) player.angle += turn;
    if (input.isDown('KeyD', 'ArrowRight')) player.angle -= turn;
    const dir = [Math.cos(player.angle), Math.sin(player.angle)];
    let vx = 0, vy = 0;
    if (input.isDown('KeyW', 'ArrowUp'))   { vx += dir[0] * sp; vy += dir[1] * sp; }
    if (input.isDown('KeyS', 'ArrowDown')) { vx -= dir[0] * sp; vy -= dir[1] * sp; }
    if (input.isDown('KeyQ')) { vx += -dir[1] * sp; vy += dir[0] * sp; }
    if (input.isDown('KeyE')) { vx += dir[1] * sp; vy += -dir[0] * sp; }
    player.pos[0] += vx;
    player.pos[1] += vy;
    collide();
  }

  function collide() {
    const b = world.bounds, p = player.pos, M = 2.5;
    p[0] = clamp(p[0], b.x0 + M, b.x1 - M);
    p[1] = clamp(p[1], b.y0 + M, b.y1 - M);
    for (const s of world.shapes) {
      if (s.kind === 'citizen' || s.kind === 'hex') {
        const dx = p[0] - s.pos[0], dy = p[1] - s.pos[1];
        const d = Math.hypot(dx, dy), min = 5;
        if (d < min && d > 1e-4) { p[0] = s.pos[0] + dx / d * min; p[1] = s.pos[1] + dy / d * min; }
      } else if (s.kind === 'house') {
        for (const g of shapeSegments(s)) {
          const r = distPointSegment(p[0], p[1], g.x1, g.y1, g.x2, g.y2);
          if (r.d < 2 && r.d > 1e-4) {
            p[0] = r.cx + (p[0] - r.cx) / r.d * 2;
            p[1] = r.cy + (p[1] - r.cy) / r.d * 2;
          }
        }
      }
    }
  }

  async function script() {
    await wait(500);
    if (!alive) return;
    await dialogue.say(INTRO);
    if (!alive) return;
    phase = 'findHex';
    ctx.hint(ctx.isTouch
      ? 'stick: up/down to walk · left/right to turn<br>find <b style="color:#7fd4ff">Hex ⬡</b> — follow the beacon'
      : 'W / S move · A / D turn · Q / E sidestep<br>find <b style="color:#7fd4ff">Hex ⬡</b> — follow the beacon');

    await until(() => !alive || dist2(player.pos, world.hex.pos) < 13 * 13);
    if (!alive) return;
    phase = 'hex';
    ctx.audio.chime();
    await dialogue.say(HEX_LINES);
    if (!alive) return;

    phase = 'night';
    ctx.hint('');
    await tween(v => { night = v; }, 0, 1, 2.2);
    if (!alive) return;
    await dialogue.say(NIGHT_LINE);
    if (!alive) return;

    // The Sphere intersects the plane just ahead of Arthur
    controls = false;
    const ahead = [
      player.pos[0] + Math.cos(player.angle) * 15,
      player.pos[1] + Math.sin(player.angle) * 15,
    ];
    ahead[0] = clamp(ahead[0], world.bounds.x0 + 12, world.bounds.x1 - 12);
    ahead[1] = clamp(ahead[1], world.bounds.y0 + 12, world.bounds.y1 - 12);
    sphere = { pos: ahead, t: 0, r: 0 };
    ctx.hint('watch the circle — and watch your <b>retina</b>');
    await wait(2800);
    if (!alive) return;
    await dialogue.say(SPHERE_1);
    if (!alive) return;
    await wait(1000);
    if (!alive) return;
    await dialogue.say(SPHERE_2);
    if (!alive) return;

    // ASCENSION
    phase = 'ascend';
    ctx.audio.whoosh();
    await Promise.all([
      tween(v => { zoom = v; }, zoom, 1.15, 3.2),
      tween(v => { whiteout = v; }, 0, 1, 3.2),
    ]);
    if (alive) ctx.goto(3);
  }

  return {
    dim: 2,
    title: 'FLATLAND',
    sub: 'A ROMANCE OF TWO DIMENSIONS',
    uses: { flat: true, retina: true },
    touch: { joystick: 'xy' },

    async init() {
      ctx.hint('');
      script();
    },

    update(dt) {
      t += dt;
      segsCache = null;
      if (!dialogue.active || phase === 'findHex') move(dt);
      const speedScale = 1 - night;
      if (speedScale > 0.01) for (const c of world.citizens) wander(c, dt, world, speedScale, player.pos);
      if (sphere) {
        sphere.t += dt;
        sphere.r = 7.5 * Math.abs(Math.sin(sphere.t * 0.85));
        // the visitation transfixes Arthur: face the circle
        const ta = Math.atan2(sphere.pos[1] - player.pos[1], sphere.pos[0] - player.pos[0]);
        let d = ta - player.angle;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        player.angle += d * dt * 2;
      }
      this.render();
      this.renderRetina();
    },

    render() {
      const w = innerWidth, h = innerHeight;
      const [px, py] = player.pos;
      fx.fillStyle = '#06070f';
      fx.fillRect(0, 0, w, h);

      fx.save();
      fx.translate(w / 2, h / 2);
      fx.scale(zoom, -zoom); // y-up world
      fx.translate(-px, -py);

      // graph-paper hint of the plane
      fx.lineWidth = 1 / zoom;
      fx.strokeStyle = 'rgba(110,123,184,0.07)';
      fx.beginPath();
      for (let gx = world.bounds.x0; gx <= world.bounds.x1; gx += 10) { fx.moveTo(gx, world.bounds.y0); fx.lineTo(gx, world.bounds.y1); }
      for (let gy = world.bounds.y0; gy <= world.bounds.y1; gy += 10) { fx.moveTo(world.bounds.x0, gy); fx.lineTo(world.bounds.x1, gy); }
      fx.stroke();

      // field of view wedge
      fx.fillStyle = 'rgba(231,201,95,0.05)';
      fx.beginPath();
      fx.moveTo(px, py);
      fx.arc(px, py, 34, player.angle - FOV / 2, player.angle + FOV / 2);
      fx.fill();

      for (const s of world.shapes) {
        const P = transformedPts(s);
        fx.beginPath();
        fx.moveTo(P[0][0], P[0][1]);
        for (let i = 1; i < P.length; i++) fx.lineTo(P[i][0], P[i][1]);
        if (s.closed) fx.closePath();
        if (s.closed && s.kind !== 'border') {
          fx.fillStyle = s.color + '38';
          fx.fill();
        }
        fx.strokeStyle = s.color;
        fx.lineWidth = (s.kind === 'border' ? 2.4 : 1.7) / zoom;
        fx.stroke();
      }

      // Hex beacon
      if (phase === 'findHex') {
        const r = 6 + Math.sin(t * 4) * 1.6;
        fx.strokeStyle = `rgba(127,212,255,${0.5 + Math.sin(t * 4) * 0.3})`;
        fx.lineWidth = 1.6 / zoom;
        fx.beginPath();
        fx.arc(world.hex.pos[0], world.hex.pos[1], r, 0, Math.PI * 2);
        fx.stroke();
      }

      // the Sphere's slice
      if (sphere && sphere.r > 0.15) {
        const g = fx.createRadialGradient(sphere.pos[0], sphere.pos[1], 0, sphere.pos[0], sphere.pos[1], sphere.r);
        g.addColorStop(0, 'rgba(201,163,255,0.45)');
        g.addColorStop(1, 'rgba(201,163,255,0.06)');
        fx.fillStyle = g;
        fx.beginPath();
        fx.arc(sphere.pos[0], sphere.pos[1], sphere.r, 0, Math.PI * 2);
        fx.fill();
        fx.strokeStyle = '#c9a3ff';
        fx.lineWidth = 2.2 / zoom;
        fx.shadowColor = '#c9a3ff';
        fx.shadowBlur = 18;
        fx.stroke();
        fx.shadowBlur = 0;
      }

      // Arthur — gold square, with his eye at the leading edge
      fx.save();
      fx.translate(px, py);
      fx.rotate(player.angle);
      fx.fillStyle = '#e7c95f';
      fx.fillRect(-2.2, -2.2, 4.4, 4.4);
      fx.fillStyle = '#14101a';
      fx.beginPath();
      fx.arc(1.5, 0, 0.7, 0, Math.PI * 2);
      fx.fill();
      fx.restore();

      fx.restore();

      // night falls
      if (night > 0) {
        fx.fillStyle = `rgba(2,3,14,${night * 0.55})`;
        fx.fillRect(0, 0, w, h);
      }
      // off-screen beacon arrow toward Hex
      if (phase === 'findHex') {
        const dx = world.hex.pos[0] - px, dy = world.hex.pos[1] - py;
        const sx = w / 2 + dx * zoom, sy = h / 2 - dy * zoom;
        if (sx < 0 || sx > w || sy < 0 || sy > h) {
          const a = Math.atan2(-(dy), dx); // screen-space angle
          const cxp = w / 2 + Math.cos(a) * Math.min(w, h) * 0.4;
          const cyp = h / 2 + Math.sin(a) * Math.min(w, h) * 0.4;
          fx.save();
          fx.translate(cxp, cyp);
          fx.rotate(a);
          fx.fillStyle = `rgba(127,212,255,${0.55 + Math.sin(t * 5) * 0.3})`;
          fx.beginPath();
          fx.moveTo(14, 0); fx.lineTo(-7, 8); fx.lineTo(-7, -8);
          fx.fill();
          fx.restore();
        }
      }
      if (whiteout > 0) {
        fx.fillStyle = `rgba(244,241,255,${whiteout})`;
        fx.fillRect(0, 0, w, h);
      }
    },

    renderRetina() {
      const W = retina.width, H = retina.height;
      rx.fillStyle = '#000';
      rx.fillRect(0, 0, W, H);
      const [px, py] = player.pos;
      const segs = allSegs();
      const nightDim = 1 - night * 0.35;
      for (let i = 0; i < W; i++) {
        // leftmost retina pixel = leftmost in view (CCW edge of the FOV)
        const a = player.angle + FOV / 2 - FOV * ((i + 0.5) / W);
        const dx = Math.cos(a), dy = Math.sin(a);
        let best = Infinity, color = null;
        for (const s of segs) {
          const d = raySegment(px, py, dx, dy, s.x1, s.y1, s.x2, s.y2);
          if (d < best) { best = d; color = s.shape.color; }
        }
        if (color !== null) {
          const b = Math.max(0, 1 - best / FOG) * nightDim;
          const [r, g, bl] = hexToRgb(color);
          rx.fillStyle = `rgb(${(8 + r * b) | 0},${(8 + g * b) | 0},${(8 + bl * b) | 0})`;
          rx.fillRect(i, 0, 1, H);
        }
      }
      // glassy vignette so it reads as an "eye"
      const grd = rx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, 'rgba(0,0,0,0.55)');
      grd.addColorStop(0.3, 'rgba(0,0,0,0)');
      grd.addColorStop(0.7, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,0.55)');
      rx.fillStyle = grd;
      rx.fillRect(0, 0, W, H);
    },

    dispose() { alive = false; },
  };
}
