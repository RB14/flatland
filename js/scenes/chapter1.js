// Chapter 1 — LINELAND. One dimension: neighbours are forever... unless you
// happen to be a Square who can step *sideways* through the second dimension.

import { wait, until, tween, clamp, lerp } from '../util.js';

const GAP = 0.7;

const INTRO = [
  { who: 'NARRATOR', text: 'LINELAND. The Kingdom of One Dimension. Its citizens — points and segments — live strung upon the Line, like beads that may never leave the thread.' },
  { who: 'NARRATOR', text: 'You are dreaming, Arthur Square. In this dream you are a segment among them. Move with A / D — left and right are the WHOLE of space here.' },
];
const LESSON = [
  { who: 'NARRATOR', text: 'You cannot pass. In Lineland your neighbours are fixed at birth: the one to your left, the one to your right — forever. There is no "around".' },
  { who: 'NARRATOR', text: '...But you are no Linelander, Arthur. You are a SQUARE. Press SPACE beside a neighbour to step around them — THROUGH the second dimension.' },
];
const AFTER_HOP = [
  { who: 'NARRATOR', text: 'To Mrs. Point, you have just vanished from the universe — and reappeared on her other side. A miracle. Or, as her grandchildren will insist: a myth.' },
];
const KING_1 = [
  { who: 'THE KING OF LINELAND', text: 'Halt! I am the Monarch of all the World! I feel your voice before me, stranger — yet none may approach the King unannounced. How did you PASS my subjects?!' },
  { who: 'ARTHUR', text: 'Your Majesty, I am not of your world. I am a Square — a being of TWO dimensions. I passed beside them, through a direction you have never turned: sideways.' },
  { who: 'THE KING OF LINELAND', text: '"Side-ways"?! Space IS the Line. The Line IS Space. You speak the babble of a madman!' },
  { who: 'ARTHUR', text: 'Then watch closely, sire. I shall now leave your universe entirely — without moving left... or right.' },
];
const KING_2 = [
  { who: 'THE KING OF LINELAND', text: 'Gone! GONE! Guards! The demon has dissolved into the void! GUAAARDS!' },
  { who: 'NARRATOR', text: 'And you woke in your warm, flat bed, chuckling at the poor King — blind to the obvious, the glorious SIDEWAYS. ...Remember that chuckle, Arthur.' },
];

export function chapter1(ctx) {
  let alive = true, t = 0;
  const { fx, rx, retina, input, dialogue } = ctx;

  const folk = [
    { x: -66, half: 2.4, color: '#e08c5a', name: 'a Gentleman' },
    { x: -22, half: 0.5, color: '#ff9ec7', name: 'Mrs. Point', patrolBase: -22, patrolAmp: 3, patrolSpeed: 0.7 },
    { x: 12, half: 5, color: '#ff9a62', name: 'THE KING', king: true },
    { x: 44, half: 2.4, color: '#7fd4ff', name: 'a Courtier' },
  ];
  const player = { x: -48, half: 2.6, y: 0 };
  let hopReady = false, hopAnim = null, bumped = false, hopExplained = false;
  let kingMet = false, floatY = 0, playerAlpha = 1, controls = true;

  function tryMove(dx) {
    let nx = player.x + dx;
    for (const f of folk) {
      const lo = f.x - f.half - player.half - GAP;
      const hi = f.x + f.half + player.half + GAP;
      if (dx > 0 && player.x <= lo && nx > lo) { nx = lo; onBlocked(); }
      if (dx < 0 && player.x >= hi && nx < hi) { nx = hi; onBlocked(); }
    }
    player.x = clamp(nx, -80, 80);
  }

  function onBlocked() {
    if (!bumped) { bumped = true; runLesson(); }
  }

  async function runLesson() {
    await dialogue.say(LESSON);
    if (!alive) return;
    hopReady = true;
    ctx.hint('A / D move · <b>SPACE</b> beside a neighbour — step <i>sideways</i> through the 2nd dimension');
  }

  function nearestBlocker() {
    let best = null, bd = Infinity;
    for (const f of folk) {
      if (f.king) continue;
      const d = Math.abs(f.x - player.x) - f.half - player.half;
      if (d < 4.5 && d < bd) { bd = d; best = f; }
    }
    return best;
  }

  function startHop() {
    const f = nearestBlocker();
    if (!f || hopAnim) return;
    const side = player.x < f.x ? 1 : -1;
    hopAnim = {
      t: 0, x0: player.x,
      x1: f.x + side * (f.half + player.half + GAP + 1.2),
    };
    ctx.audio.whoosh();
  }

  async function script() {
    await wait(600);
    if (!alive) return;
    await dialogue.say(INTRO);
    if (!alive) return;
    ctx.hint('A / D — move along the Line · approach <b style="color:#ff9a62">the King</b> (east)');
    await until(() => !alive || kingMet);
    if (!alive) return;

    controls = false;
    await dialogue.say(KING_1);
    if (!alive) return;
    // leave the universe: float straight "up" — a direction Lineland does not have
    ctx.audio.whoosh();
    await tween(v => { floatY = v; }, 0, 36, 2.6);
    if (!alive) return;
    await dialogue.say(KING_2);
    if (!alive) return;
    await tween(v => { playerAlpha = v; }, 1, 0, 0.8);
    if (alive) ctx.goto(2);
  }

  return {
    dim: 1,
    title: 'LINELAND',
    sub: 'THE KINGDOM OF THE STRAIGHT LINE',
    uses: { flat: true, retina: true },

    async init() {
      ctx.hint('');
      input.onKey(e => {
        if (e.code === 'Space' && alive && hopReady && controls && !dialogue.active) startHop();
      });
      script();
    },

    update(dt) {
      t += dt;
      // Mrs. Point patrols her little stretch of the universe — but in one
      // dimension nobody passes anybody: she halts against you and waits.
      const mrs = folk[1];
      let desired = mrs.patrolBase + Math.sin(t * mrs.patrolSpeed) * mrs.patrolAmp;
      const playerOnLine = !hopAnim && (player.y + floatY) < 2;
      if (playerOnLine) {
        const minGap = mrs.half + player.half + GAP;
        if (mrs.x < player.x) desired = Math.min(desired, player.x - minGap);
        else desired = Math.max(desired, player.x + minGap);
      }
      mrs.x = desired;

      if (controls && !hopAnim && !dialogue.active) {
        const sp = 20 * dt;
        if (input.isDown('KeyA', 'ArrowLeft')) tryMove(-sp);
        if (input.isDown('KeyD', 'ArrowRight')) tryMove(sp);
      }
      if (hopAnim) {
        hopAnim.t += dt / 1.0;
        const k = Math.min(1, hopAnim.t);
        player.x = lerp(hopAnim.x0, hopAnim.x1, k);
        player.y = Math.sin(k * Math.PI) * 14;
        if (k >= 1) {
          player.y = 0;
          hopAnim = null;
          if (!hopExplained) { hopExplained = true; dialogue.say(AFTER_HOP); }
        }
      }
      // reaching the King
      const king = folk[2];
      if (!kingMet && !hopAnim && Math.abs(player.x - king.x) - king.half - player.half < 4) kingMet = true;

      this.render();
    },

    render() {
      const w = innerWidth, h = innerHeight;
      fx.fillStyle = '#06070f';
      fx.fillRect(0, 0, w, h);

      const ppu = (w * 0.92) / 170;
      const X = x => w / 2 + x * ppu;
      const baseY = h * 0.46;

      // the Line — the whole of Space
      fx.strokeStyle = '#39406a';
      fx.lineWidth = 1.5;
      fx.shadowColor = '#5868c8';
      fx.shadowBlur = 8;
      fx.beginPath();
      fx.moveTo(0, baseY);
      fx.lineTo(w, baseY);
      fx.stroke();
      fx.shadowBlur = 0;

      const slab = (x, half, color, yOff = 0, alpha = 1) => {
        const px = X(x), pw = Math.max(5, half * 2 * ppu), py = baseY - yOff * ppu;
        fx.globalAlpha = alpha;
        fx.fillStyle = color;
        fx.beginPath();
        fx.roundRect(px - pw / 2, py - 5, pw, 10, 5);
        fx.fill();
        // eyes at the extremities (a Linelander is all voice and two eyes)
        fx.fillStyle = '#fff';
        fx.beginPath();
        fx.arc(px - pw / 2 + 3, py, 1.6, 0, 7);
        fx.arc(px + pw / 2 - 3, py, 1.6, 0, 7);
        fx.fill();
        fx.globalAlpha = 1;
        return { px, py, pw };
      };

      for (const f of folk) {
        const { px, py } = slab(f.x, f.half, f.color);
        if (f.king) { // a tiny crown
          fx.fillStyle = '#ffd966';
          fx.beginPath();
          for (let i = -1; i <= 1; i++) {
            fx.moveTo(px + i * 8 - 4, py - 9);
            fx.lineTo(px + i * 8, py - 17);
            fx.lineTo(px + i * 8 + 4, py - 9);
          }
          fx.fill();
        }
        const d = Math.abs(f.x - player.x);
        if (d < 42) {
          fx.globalAlpha = clamp(1 - d / 42, 0, 1) * 0.9;
          fx.fillStyle = '#aab1d0';
          fx.font = '11px "IBM Plex Mono", monospace';
          fx.textAlign = 'center';
          fx.fillText(f.name, px, py - 24);
          fx.globalAlpha = 1;
        }
      }

      // you (gold, possibly mid-miracle)
      slab(player.x, player.half, '#e7c95f', player.y + floatY, playerAlpha);
      if (player.y + floatY > 1) { // your "shadow": the spot the Linelanders still stare at
        fx.strokeStyle = '#e7c95f55';
        fx.setLineDash([4, 4]);
        fx.strokeRect(X(player.x) - player.half * ppu, baseY - 5, player.half * 2 * ppu, 10);
        fx.setLineDash([]);
      }

      this.renderRetina();
    },

    renderRetina() {
      const W = retina.width, H = retina.height;
      rx.fillStyle = '#000';
      rx.fillRect(0, 0, W, H);
      const offLine = (player.y + floatY) > 2;
      const dot = (frac, color, b) => {
        if (b <= 0) return;
        const [r, g, bl] = hex3(color);
        const x = W * frac;
        const grd = rx.createRadialGradient(x, H / 2, 0, x, H / 2, 26);
        grd.addColorStop(0, `rgba(${r},${g},${bl},${Math.min(1, b)})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        rx.fillStyle = grd;
        rx.fillRect(x - 28, 0, 56, H);
      };
      if (!offLine) {
        let L = null, R = null;
        for (const f of folk) {
          if (f.x < player.x && (!L || f.x > L.x)) L = f;
          if (f.x > player.x && (!R || f.x < R.x)) R = f;
        }
        if (L) dot(0.12, L.color, 1 - (player.x - L.x) / 70);
        if (R) dot(0.88, R.color, 1 - (R.x - player.x) / 70);
        // in 1D, "you" occupy the entire rest of your own view
        dot(0.5, '#e7c95f', 0.22);
        rx.fillStyle = '#5d6480';
        rx.font = '9px "IBM Plex Mono", monospace';
        rx.textAlign = 'center';
        rx.fillText('← neighbour          a 1D retina is two points          neighbour →', W / 2, H - 4);
      } else {
        rx.fillStyle = '#5d6480';
        rx.font = '10px "IBM Plex Mono", monospace';
        rx.textAlign = 'center';
        rx.fillText('— you are outside the Line: its whole universe is below you —', W / 2, H / 2 + 3);
      }
    },

    dispose() { alive = false; },
  };
}

const hex3 = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
