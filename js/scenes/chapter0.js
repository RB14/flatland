// Chapter 0 — POINTLAND. A vignette: the Point that is its own universe.

import { wait } from '../util.js';

const LINES = [
  { who: 'NARRATOR', text: 'In the beginning — or rather, beneath it — there is POINTLAND. Zero dimensions. No length. No width. No place to stand... and no one to stand there, but One.' },
  { who: 'THE POINT', text: 'It! It! I am the One, and the All! I fill all Space, for I AM all Space! None exists beside Me! Ah, the happiness — ah, the happiness of Being!' },
  { who: 'NARRATOR', text: 'It cannot hear you. To the Point, your voice is merely Its own thought, congratulating Itself. In zero dimensions there is no "outside" to speak from.' },
  { who: 'NARRATOR', text: 'Leave It to Its bliss. For you, Arthur Square, are about to have a very strange night indeed. Ascend.' },
];

export function chapter0(ctx) {
  let t = 0, alive = true;
  const { fx } = ctx;

  return {
    dim: 0,
    title: 'POINTLAND',
    sub: 'THE ABYSS OF NO DIMENSIONS',
    uses: { flat: true },

    async init() {
      ctx.hint('');
      await wait(700);
      if (!alive) return;
      await ctx.dialogue.say(LINES);
      if (!alive) return;
      await wait(900);
      if (alive) ctx.goto(1);
    },

    update(dt) {
      t += dt;
      const w = innerWidth, h = innerHeight;
      const g = fx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, '#0b0d1a');
      g.addColorStop(1, '#020308');
      fx.fillStyle = g;
      fx.fillRect(0, 0, w, h);

      // expanding ripples of self-satisfaction
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.22 + i / 3) % 1);
        fx.beginPath();
        fx.arc(w / 2, h / 2, 10 + k * 220, 0, Math.PI * 2);
        fx.strokeStyle = `rgba(220, 225, 255, ${(1 - k) * 0.08})`;
        fx.lineWidth = 1;
        fx.stroke();
      }

      // The One, and the All
      const pulse = 3.2 + Math.sin(t * 2.2) * 1.1;
      fx.save();
      fx.shadowColor = '#fff';
      fx.shadowBlur = 26 + Math.sin(t * 2.2) * 9;
      fx.fillStyle = '#f4f1ff';
      fx.beginPath();
      fx.arc(w / 2, h / 2, pulse, 0, Math.PI * 2);
      fx.fill();
      fx.restore();
    },

    dispose() { alive = false; },
  };
}
