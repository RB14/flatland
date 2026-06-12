// Chapter 4 — HYPERLAND. A tesseract under genuine 4D rotation, projected
// 4D->3D->screen. Slice mode shows its 3D cross-section through w=0. The
// Ladder animates point -> line -> square -> cube -> tesseract.
// THE HYPER-RITE: a 4D body turns before you; among three candidate solids,
// pick the one it would appear as in 3D (its slice at w = 0). Reveal animates
// the body passing through the hyperplane; "3D perspectives" opens three
// picture-in-picture viewports with its slices at w = -0.8 / 0 / +0.8.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { getRenderer } from '../three-setup.js';
import { PLANES, composeRot, apply, project4, nCubeVerts, nCubeEdges } from '../math/vec4.js';
import { sliceEdges } from '../math/poly.js';
import { wait, tween, clamp, easeInOut } from '../util.js';

const SCALE = 3.1, EYE_W = 3.4;
const SPEEDS = { XY: 0.21, XZ: 0.17, YZ: 0.31, XW: 0.41, YW: 0.27, ZW: 0.23 };

const INTRO = [
  { who: 'NARRATOR', text: 'HYPERLAND. No Sphere will guide you here, Arthur. This country is reached by no road — only by reason.' },
  { who: 'NARRATOR', text: 'Behold: the TESSERACT. The four-dimensional cube. 16 corners, 32 edges, 24 squares, 8 cubes. Hex was right — the super-square is real.' },
  { who: 'NARRATOR', text: 'What hangs before you is only its SHADOW, pressed down into your screen. Drag it. Spin it. Mind the rotations XW, YW, ZW: turns that swing THROUGH the fourth axis, as "sideways" once swung through the second.' },
];
const SLICE_FIRST = [
  { who: 'NARRATOR', text: 'And THIS is what the Sphere would see, were a Tesseract to call on HIM at midnight: a crystal of shifting facets — born from a point, blooming, collapsing.' },
  { who: 'NARRATOR', text: 'As the swelling circle was to you, Arthur... so this jewel is to a Sphere. Sections all the way up.' },
];
const QUIZ_INTRO = [
  { who: 'NARRATOR', text: 'A new Rite — and this time the examiner is YOU, Arthur. A four-dimensional body turns before you, shadow-cast into your screen.' },
  { who: 'NARRATOR', text: 'Divine the SOLID it would appear as in Spaceland — its slice at w = 0 — and choose among the three candidates below. Reveal the answer to watch it pass through the hyperplane.' },
];
const LADDER_END = [
  { who: 'NARRATOR', text: 'Point to line. Line to square. Square to cube. Cube to tesseract. The ladder does not end — it has never ended. Five, six, seven dimensions: each "inconceivable"... until climbed.' },
];
const EPILOGUE = [
  { who: 'ARTHUR', text: 'I once pitied the King of Lineland. Then the Sphere pitied me. Who, I wonder... pities the Tesseract?' },
];
const LADDER_CAPTIONS = [
  '0D → 1D &nbsp;·&nbsp; a point, moved, sweeps a <b>LINE</b>',
  '1D → 2D &nbsp;·&nbsp; a line, moved sideways, sweeps a <b>SQUARE</b>',
  '2D → 3D &nbsp;·&nbsp; a square, moved upward, sweeps a <b>CUBE</b>',
  '3D → 4D &nbsp;·&nbsp; a cube, moved <i>ana</i> — through the 4th axis — sweeps a <b>TESSERACT</b>',
];
const MAIN_HINT = 'drag to orbit · scroll to zoom<br>XW / YW / ZW are rotations <i>through</i> the 4th axis';
const QUIZ_HINT = 'which 3D solid is this hypershape’s slice at w = 0?<br><b>Ⓐ</b> left · <b>Ⓑ</b> middle · <b>Ⓒ</b> right — drag to orbit the shadow';

const hueFor = w => 0.68 - 0.60 * clamp((w + 2) / 4, 0, 1);

// ---------- the 4D bestiary ----------

function ring4(u, v, n = 28, r = 1) {
  const verts = [], edges = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    verts.push([0, 1, 2, 3].map(k => (u[k] * Math.cos(a) + v[k] * Math.sin(a)) * r));
    edges.push([i, (i + 1) % n]);
  }
  return { verts, edges };
}

function mergeParts(parts) {
  const verts = [], edges = [];
  for (const p of parts) {
    const off = verts.length;
    verts.push(...p.verts);
    edges.push(...p.edges.map(([a, b]) => [a + off, b + off]));
  }
  return { verts, edges };
}

function makeHyperDefs() {
  const defs = [];

  defs.push({
    key: 'tesseract', name: 'the TESSERACT', answer: 'cube',
    explain: 'The TESSERACT rests upon Spaceland as a CUBE — its slice at w = 0. Eight cubic cells, and you have met exactly one of them.',
    build: () => ({ verts: nCubeVerts(4, 1.15), edges: nCubeEdges(4) }),
  });

  defs.push({
    key: 'sixteen', name: 'the 16-CELL', answer: 'octahedron',
    explain: 'The 16-CELL — four axes, sixteen tetrahedral cells — greets Spaceland as an OCTAHEDRON: the cube’s dual, summoned from one dimension higher.',
    build: () => {
      const R = 1.7;
      const verts = [];
      for (let a = 0; a < 4; a++) for (const s of [R, -R]) {
        const v = [0, 0, 0, 0]; v[a] = s; verts.push(v);
      }
      const edges = [];
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
        if ((i >> 1) !== (j >> 1)) edges.push([i, j]); // skip antipodal pairs
      }
      return { verts, edges };
    },
  });

  defs.push({
    key: 'glome', name: 'the GLOME', answer: 'sphere',
    explain: 'The GLOME — the true four-dimensional sphere — appears in Spaceland as a humble BALL, waxing and waning... precisely as the Sphere once appeared to you.',
    build: () => {
      const parts = [];
      // three coordinate great-circles for structure...
      for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
        const u = [0, 0, 0, 0], v = [0, 0, 0, 0];
        u[i] = 1; v[j] = 1;
        parts.push(ring4(u, v, 28, 1.45));
      }
      // ...plus random great-circles that pierce w = 0 at scattered points
      for (let k = 0; k < 9; k++) {
        const u = new THREE.Vector4().random().addScalar(-0.5).normalize();
        let v = new THREE.Vector4().random().addScalar(-0.5);
        v.addScaledVector(u, -v.dot(u));
        if (v.lengthSq() < 0.01) v.set(-u.y, u.x, -u.w, u.z); // u was unlucky-parallel
        v.normalize();
        parts.push(ring4([u.x, u.y, u.z, u.w], [v.x, v.y, v.z, v.w], 24, 1.45));
      }
      return mergeParts(parts);
    },
  });

  defs.push({
    key: 'fivecell', name: 'the HYPERPYRAMID (5-cell)', answer: 'tetrahedron',
    explain: 'The HYPERPYRAMID — a tetrahedron lifted to a single point, ana — slices Spaceland as a TETRAHEDRON, swelling from nothing as the apex passes.',
    build: () => {
      const s = 1.25;
      const verts = [
        [s, s, s, -0.6], [s, -s, -s, -0.6], [-s, s, -s, -0.6], [-s, -s, s, -0.6],
        [0, 0, 0, 1.8],
      ];
      const edges = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3], [0, 4], [1, 4], [2, 4], [3, 4]];
      return { verts, edges };
    },
  });

  return defs;
}

const CAND_GEOS = {
  cube: () => new THREE.BoxGeometry(2.1, 2.1, 2.1),
  octahedron: () => new THREE.OctahedronGeometry(1.55),
  sphere: () => new THREE.SphereGeometry(1.35, 20, 14),
  tetrahedron: () => new THREE.TetrahedronGeometry(1.7),
  cone: () => new THREE.ConeGeometry(1.2, 2.2, 18),
  cylinder: () => new THREE.CylinderGeometry(1.05, 1.05, 2.2, 18),
  torus: () => new THREE.TorusGeometry(1.05, 0.45, 10, 18),
  dodecahedron: () => new THREE.DodecahedronGeometry(1.4),
};

export function chapter4(ctx) {
  let alive = true, t = 0;
  const { dialogue } = ctx;
  let renderer, scene, cam, controls;
  let lineMat, wireLines, vertSpheres = [], sliceMesh = null, sliceWire = null;
  let ladderLines = null, ladderMat;
  const disposables = [];
  const track = o => (disposables.push(o), o);

  const verts16 = nCubeVerts(4), edges32 = nCubeEdges(4);
  const angles = { XY: 0, XZ: 0, YZ: 0.3, XW: 0.5, YW: 0, ZW: 0 };
  const spinning = { XY: false, XZ: false, YZ: true, XW: true, YW: false, ZW: false };
  let sliceMode = false, sliceIntroduced = false, quizIntroduced = false;
  let ladder = null; // { k, t }
  let quiz = null;   // current Hyper-Rite round
  const hyperDefs = makeHyperDefs();
  let chips = {};

  const sliceMat = new THREE.MeshNormalMaterial({ flatShading: true, transparent: true, opacity: 0.92 });
  const sliceWireMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  const candMat = new THREE.MeshNormalMaterial({ flatShading: true });
  let insetViews = null;

  function buildScene() {
    renderer = getRenderer(ctx.glContainer);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05030c);
    cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500);
    cam.position.set(0, 4, 26);
    scene.add(cam); // so camera-attached children (quiz candidates) render

    const starGeo = track(new THREE.BufferGeometry());
    const sp = [];
    for (let i = 0; i < 1200; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(180 + Math.random() * 80);
      sp.push(v.x, v.y, v.z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(starGeo, track(new THREE.PointsMaterial({ color: 0x6b6f96, size: 1, sizeAttenuation: false }))));

    lineMat = track(new LineMaterial({ linewidth: 2.6, vertexColors: true }));
    lineMat.resolution.set(innerWidth, innerHeight);
    wireLines = new LineSegments2(new LineSegmentsGeometry(), lineMat);
    scene.add(wireLines);

    const sGeo = track(new THREE.SphereGeometry(0.16, 12, 8));
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(sGeo, track(new THREE.MeshBasicMaterial()));
      vertSpheres.push(m);
      scene.add(m);
    }

    ladderMat = track(new LineMaterial({ linewidth: 3, vertexColors: true }));
    ladderMat.resolution.set(innerWidth, innerHeight);

    // three picture-in-picture viewports for "3D perspectives"
    insetViews = [-0.8, 0, 0.8].map(off => {
      const s = new THREE.Scene();
      s.background = new THREE.Color(0x0b0e20);
      const c = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      return { off, scene: s, cam: c, mesh: null };
    });

    controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 6;
    controls.maxDistance = 60;
  }

  // Rebuild a fat-line object's geometry (dispose old GPU buffers each frame).
  function setFatLines(obj, pos, col) {
    obj.geometry.dispose();
    const g = new LineSegmentsGeometry();
    g.setPositions(pos);
    g.setColors(col);
    obj.geometry = g;
  }

  function projectSet(rv) {
    return rv.map(v => {
      const p = project4(v, EYE_W);
      return [p[0] * SCALE, p[1] * SCALE, p[2] * SCALE];
    });
  }

  function edgeBuffers(proj, rv, edges) {
    const pos = [], col = [];
    const c = new THREE.Color();
    for (const [a, b] of edges) {
      pos.push(...proj[a], ...proj[b]);
      c.setHSL(hueFor(rv[a][3]), 0.85, 0.62);
      col.push(c.r, c.g, c.b);
      c.setHSL(hueFor(rv[b][3]), 0.85, 0.62);
      col.push(c.r, c.g, c.b);
    }
    return { pos, col };
  }

  function crossSection(rv, edges, wOff = 0) {
    const pts = sliceEdges(rv.map(v => [v[0], v[1], v[2], v[3] + wOff]), edges, 3)
      .map(p => new THREE.Vector3(p[0] * SCALE * 0.85, p[1] * SCALE * 0.85, p[2] * SCALE * 0.85));
    if (pts.length < 4) return null;
    try { return new ConvexGeometry(pts); } catch { return null; }
  }

  function renderTesseract() {
    const m = composeRot(angles);
    const rv = verts16.map(v => apply(m, v));

    if (!sliceMode) {
      const proj = projectSet(rv);
      const { pos, col } = edgeBuffers(proj, rv, edges32);
      setFatLines(wireLines, pos, col);
      for (let i = 0; i < 16; i++) {
        vertSpheres[i].position.set(...proj[i]);
        vertSpheres[i].material.color.setHSL(hueFor(rv[i][3]), 0.85, 0.62);
      }
    } else {
      clearSlice();
      const geo = crossSection(rv, edges32);
      if (geo) {
        sliceMesh = new THREE.Mesh(geo, sliceMat);
        sliceWire = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 8), sliceWireMat);
        scene.add(sliceMesh, sliceWire);
      }
    }
  }

  function clearSlice() {
    if (sliceMesh) {
      scene.remove(sliceMesh, sliceWire);
      sliceMesh.geometry.dispose();
      sliceWire.geometry.dispose();
      sliceMesh = sliceWire = null;
    }
  }

  function renderLadder() {
    const { k } = ladder;
    const e = easeInOut(clamp(ladder.t, 0, 1));
    const half = e + 0.0001;
    const base = nCubeVerts(k, 1);
    const lo = base.map(v => { const u = v.slice(); u[k] = -half; return u; });
    const hi = base.map(v => { const u = v.slice(); u[k] = +half; return u; });
    const V = lo.concat(hi);
    const eb = nCubeEdges(k);
    const n = base.length;
    const E = eb.concat(eb.map(([a, b]) => [a + n, b + n]), base.map((_, i) => [i, i + n]));

    const m = composeRot(angles);
    const rv = V.map(v => apply(m, v));
    const proj = projectSet(rv);
    const { pos, col } = edgeBuffers(proj, rv, E);
    setFatLines(ladderLines, pos, col);
  }

  // ---------- the Hyper-Rite ----------

  function letterSprite(letter) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c2 = cv.getContext('2d');
    c2.font = '600 44px "Cormorant Garamond", serif';
    c2.textAlign = 'center';
    c2.textBaseline = 'middle';
    c2.fillStyle = '#e7c95f';
    c2.fillText(letter, 32, 34);
    const tex = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(0.9, 0.9, 1);
    sp.position.set(0, 1.85, 0);
    return sp;
  }

  function shuffle(a) { return a.slice().sort(() => Math.random() - 0.5); }

  function enterQuiz() {
    if (ladder || quiz) return;
    if (sliceMode) setSliceMode(false);
    wireLines.visible = false;
    for (const s of vertSpheres) s.visible = false;
    buildQuizPanel();
    if (!quizIntroduced) { quizIntroduced = true; dialogue.say(QUIZ_INTRO); }
    newRound();
  }

  function newRound() {
    cleanupRound();
    const def = hyperDefs[Math.floor(Math.random() * hyperDefs.length)];
    const { verts, edges } = def.build();
    const decoys = shuffle(Object.keys(CAND_GEOS).filter(k => k !== def.answer)).slice(0, 2);
    const candKeys = shuffle([def.answer, ...decoys]);

    const q = {
      def, verts, edges,
      answerIdx: candKeys.indexOf(def.answer),
      revealed: false, wOffset: 0,
      lines: new LineSegments2(new LineSegmentsGeometry(), lineMat),
      candGroup: new THREE.Group(),
      candHolders: [],
      sliceMesh: null, sliceWire: null,
      insetsOn: false,
      geos: [],
    };
    scene.add(q.lines);
    cam.add(q.candGroup);
    candKeys.forEach((key, i) => {
      const holder = new THREE.Group();
      holder.position.set([-3.6, 0, 3.6][i], i === 1 ? -3.1 : -2.9, -10);
      const geo = CAND_GEOS[key]();
      q.geos.push(geo);
      const mesh = new THREE.Mesh(geo, candMat);
      holder.add(mesh, letterSprite(['Ⓐ', 'Ⓑ', 'Ⓒ'][i]));
      q.candGroup.add(holder);
      q.candHolders.push(holder);
    });
    quiz = q;
    ctx.hint(QUIZ_HINT);
    askRound(q);
  }

  async function askRound(q) {
    while (alive && quiz === q && !q.revealed) {
      const pick = await ctx.choose(['Ⓐ', 'Ⓑ', 'Ⓒ']);
      if (!alive || quiz !== q || q.revealed) return;
      if (pick === q.answerIdx) {
        ctx.audio.chime();
        reveal(q);
      } else {
        ctx.audio.buzz();
        ctx.hint('not that one — watch the shadow turn, and think in slices…<br>(or 👁 reveal the answer)');
      }
    }
  }

  async function reveal(q) {
    if (q.revealed) return;
    q.revealed = true;
    ctx.clearChoices();
    ctx.audio.whoosh();
    ctx.hint(`<b>${q.def.name}</b> passes through the hyperplane w = 0…`);
    await tween(v => { q.wOffset = v; }, -2.6, 0, 4.5, easeInOut);
    if (!alive || quiz !== q) return;
    dialogue.say([{ who: 'NARRATOR', text: q.def.explain }]);
  }

  function cleanupRound() {
    const q = quiz;
    if (!q) return;
    quiz = null;
    scene.remove(q.lines);
    q.lines.geometry.dispose();
    cam.remove(q.candGroup);
    for (const h of q.candHolders) {
      const sprite = h.children[1];
      sprite.material.map.dispose();
      sprite.material.dispose();
    }
    for (const g of q.geos) g.dispose();
    if (q.sliceMesh) {
      scene.remove(q.sliceMesh, q.sliceWire);
      q.sliceMesh.geometry.dispose();
      q.sliceWire.geometry.dispose();
    }
    for (const v of insetViews) {
      if (v.mesh) { v.scene.remove(v.mesh); v.mesh.geometry.dispose(); v.mesh = null; }
    }
    ctx.clearChoices();
  }

  function exitQuiz() {
    cleanupRound();
    wireLines.visible = true;
    for (const s of vertSpheres) s.visible = true;
    buildMainPanel();
    ctx.hint(MAIN_HINT);
  }

  function renderQuiz(dt) {
    const q = quiz;
    // the shadow tumbles in 3D planes only — its w-structure stays put,
    // so "the slice at w = 0" remains a well-posed question
    const m = composeRot({ XZ: t * 0.3, YZ: t * 0.17 });
    const rv = q.verts.map(v => apply(m, v));
    const rvMoved = rv.map(v => [v[0], v[1], v[2], v[3] + q.wOffset]);
    const proj = projectSet(rvMoved);
    const { pos, col } = edgeBuffers(proj, rvMoved, q.edges);
    setFatLines(q.lines, pos, col);

    // candidates tumble in their corner of your eye
    for (const h of q.candHolders) {
      h.children[0].rotation.x += dt * 0.5;
      h.children[0].rotation.y += dt * 0.33;
    }
    if (q.revealed) {
      // the true slice, materializing as the body passes w = 0
      if (q.sliceMesh) {
        scene.remove(q.sliceMesh, q.sliceWire);
        q.sliceMesh.geometry.dispose();
        q.sliceWire.geometry.dispose();
        q.sliceMesh = q.sliceWire = null;
      }
      const geo = crossSection(rv, q.edges, q.wOffset);
      if (geo) {
        q.sliceMesh = new THREE.Mesh(geo, sliceMat);
        q.sliceWire = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 8), sliceWireMat);
        scene.add(q.sliceMesh, q.sliceWire);
      }
      // the winning candidate takes a bow
      const winner = q.candHolders[q.answerIdx];
      const s = 1 + 0.12 * Math.sin(t * 5);
      winner.scale.set(s, s, s);
    }
    if (q.insetsOn) {
      for (const v of insetViews) {
        if (v.mesh) { v.scene.remove(v.mesh); v.mesh.geometry.dispose(); v.mesh = null; }
        const geo = crossSection(rv, q.edges, v.off);
        if (geo) {
          v.mesh = new THREE.Mesh(geo, sliceMat);
          v.scene.add(v.mesh);
        }
        v.cam.position.set(Math.cos(t * 0.4) * 9, 3.5, Math.sin(t * 0.4) * 9);
        v.cam.lookAt(0, 0, 0);
      }
    }
  }

  function renderInsets() {
    const s = 148, pad = 12, x0 = 16, top0 = 64;
    renderer.setScissorTest(true);
    insetViews.forEach((v, k) => {
      const y = innerHeight - (top0 + (s + pad) * k + s);
      renderer.setViewport(x0, y, s, s);
      renderer.setScissor(x0, y, s, s);
      renderer.render(v.scene, v.cam);
    });
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, innerWidth, innerHeight);
  }

  // ---------- modes ----------

  function setSliceMode(on) {
    sliceMode = on;
    wireLines.visible = !on;
    for (const s of vertSpheres) s.visible = !on;
    if (!on) clearSlice();
    chips.slice?.classList.toggle('active', on);
    ctx.hint(on
      ? 'the <b>3D slice</b> of the tesseract at w = 0<br>keep XW / YW / ZW spinning to watch it morph'
      : MAIN_HINT);
    if (on && !sliceIntroduced) {
      sliceIntroduced = true;
      dialogue.say(SLICE_FIRST);
    }
  }

  async function runLadder() {
    if (ladder || quiz) return;
    setSliceMode(false);
    wireLines.visible = false;
    for (const s of vertSpheres) s.visible = false;
    ladderLines = new LineSegments2(new LineSegmentsGeometry(), ladderMat);
    scene.add(ladderLines);
    ladder = { k: 0, t: 0 };
    ctx.hint(LADDER_CAPTIONS[0]);

    while (alive && ladder) {
      await wait(50);
      if (!ladder) return;
      if (ladder.t >= 1.35) { // hold a beat at the completed figure
        if (ladder.k >= 3) break;
        ladder.k++;
        ladder.t = 0;
        ctx.hint(LADDER_CAPTIONS[ladder.k]);
      }
    }
    if (!alive) return;
    ladder = null;
    scene.remove(ladderLines);
    ladderLines.geometry.dispose();
    ladderLines = null;
    wireLines.visible = true;
    for (const s of vertSpheres) s.visible = true;
    ctx.hint(MAIN_HINT);
    await dialogue.say(LADDER_END);
  }

  // ---------- panels ----------

  function buildMainPanel() {
    ctx.panel.clear();
    chips = {};
    for (const p of PLANES) {
      const isW = p.includes('W');
      chips[p] = ctx.panel.add(`↻ ${p}${isW ? '  · 4D' : ''}`, () => {
        spinning[p] = !spinning[p];
        chips[p].classList.toggle('active', spinning[p]);
      }, { active: spinning[p] });
    }
    chips.slice = ctx.panel.add('◇ SLICE MODE — the Sphere’s view', () => { if (!quiz && !ladder) setSliceMode(!sliceMode); }, { major: true, active: sliceMode });
    chips.ladder = ctx.panel.add('▲ THE LADDER OF DIMENSIONS', () => runLadder(), { major: true });
    chips.rite = ctx.panel.add('❖ THE HYPER-RITE — guess the slice', () => enterQuiz(), { major: true });
    ctx.panel.add('✦ FINISH THE JOURNEY', async () => {
      await dialogue.say(EPILOGUE);
      if (alive) ctx.showEnd();
    }, { major: true });
  }

  function buildQuizPanel() {
    ctx.panel.clear();
    chips = {};
    chips.reveal = ctx.panel.add('👁 REVEAL THE ANSWER', () => { if (quiz && !quiz.revealed) reveal(quiz); }, { major: true });
    chips.insets = ctx.panel.add('⊞ 3D PERSPECTIVES — w = −0.8 / 0 / +0.8', () => {
      if (!quiz) return;
      quiz.insetsOn = !quiz.insetsOn;
      chips.insets.classList.toggle('active', quiz.insetsOn);
      if (!quiz.insetsOn) for (const v of insetViews) {
        if (v.mesh) { v.scene.remove(v.mesh); v.mesh.geometry.dispose(); v.mesh = null; }
      }
    }, { major: true });
    chips.next = ctx.panel.add('⟲ ANOTHER BODY', () => newRound(), { major: true });
    chips.leave = ctx.panel.add('✕ LEAVE THE RITE', () => exitQuiz(), { major: true });
  }

  async function script() {
    await wait(600);
    if (!alive) return;
    await dialogue.say(INTRO);
    if (!alive) return;
    ctx.hint(MAIN_HINT);
  }

  return {
    dim: 4,
    title: 'HYPERLAND',
    sub: 'THE COUNTRY OF FOUR DIMENSIONS',
    uses: { gl: true },

    async init() {
      buildScene();
      ctx.hint('');
      buildMainPanel();
      script();
    },

    update(dt) {
      if (!scene) return; // WebGL init failed — manager already shows a notice
      t += dt;
      for (const p of PLANES) if (spinning[p]) angles[p] += SPEEDS[p] * dt;
      controls.update();
      if (ladder) {
        ladder.t += dt / 2.3;
        renderLadder();
      } else if (quiz) {
        renderQuiz(dt);
      } else {
        renderTesseract();
      }
      renderer.setViewport(0, 0, innerWidth, innerHeight);
      renderer.render(scene, cam);
      if (quiz?.insetsOn) renderInsets();
    },

    onResize() {
      cam.aspect = innerWidth / innerHeight;
      cam.updateProjectionMatrix();
      lineMat.resolution.set(innerWidth, innerHeight);
      ladderMat.resolution.set(innerWidth, innerHeight);
    },

    dispose() {
      alive = false;
      cleanupRound();
      controls?.dispose();
      wireLines?.geometry.dispose();
      ladderLines?.geometry.dispose();
      clearSlice();
      sliceMat.dispose();
      sliceWireMat.dispose();
      candMat.dispose();
      for (const d of disposables) d.dispose?.();
      scene = null;
    },
  };
}
