// Chapter 3 — SPACELAND. The same 2D world, now seen from above (WebGL).
// Then the Rite of the Sections: name the solid from its 2D slices alone —
// exactly the inference Abbott's Square had to make about the Sphere.
// After the story rounds: the Endless Rite — a larger library of solids,
// plus randomly generated crystals presented as a tumbling line-up.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { getRenderer, enableTwoFingerTwist } from '../three-setup.js';
import { buildWorld, shapeSegments, transformedPts } from '../world2d.js';
import { convexHull2D, sliceEdges, extractEdges } from '../math/poly.js';
import { wait, tween, easeInOut } from '../util.js';

const L_BEHOLD = [
  { who: 'THE SPHERE', text: 'Behold... Flatland.' },
  { who: 'ARTHUR', text: 'I... I see EVERYTHING. The streets — the houses — INSIDE the houses! Inside my neighbours! Their angles, their very hearts, open like diagrams!' },
];
const L_RITE = [
  { who: 'THE SPHERE', text: 'To see a world entire at a glance — that is what one poor dimension more will buy you. Nothing in a plane is hidden from Space: no wall, no lock, no skin.' },
  { who: 'THE SPHERE', text: 'But sight is cheap, Square. UNDERSTANDING is the prize. Your examination: THE RITE OF THE SECTIONS.' },
  { who: 'THE SPHERE', text: 'I shall pass solid bodies through your plane. You will see only their slices — as your countrymen would. Name each body from its shadow-play.' },
];
const L_FINAL = [
  { who: 'ARTHUR', text: 'Master... a thought torments me. Your circles stack into a Sphere. My squares would stack into Hex’s eight-cornered "super-square"...' },
  { who: 'ARTHUR', text: '...then what do CUBES stack into? Take me UPWARD again! Show me the land of FOUR dimensions — where YOU would be the flat one!' },
  { who: 'THE SPHERE', text: 'There IS no such land! The very notion is inconceivable! I showed you sight, Square — not LICENSE. This audience is OVER.' },
  { who: 'NARRATOR', text: '...Said the King of the Line. Said the Square of the Plane. Said the Sphere of all of Space. Go on, Arthur — the last door opens by ANALOGY alone.' },
];
const L_ENDLESS = [
  { who: 'THE SPHERE', text: 'More? Ha! Good. The catalogue of Space is long, Square — and some of its stranger pages I cut myself. Name them ALL.' },
];
const WRONG = [
  'Look with your new eyes, not your old habits. Watch HOW the slice changes through time — then answer again.',
  'No. Observe once more: the manner of its growing and shrinking is the body’s true name.',
];
const ORDINAL = ['first', 'second', 'third'];

export function chapter3(ctx) {
  let alive = true, t = 0;
  const { dialogue } = ctx;
  let renderer, scene, cam, controls, twistOff = null;
  let riseK = 0, rising = true, highlight = 0;
  const world = ctx.state.world || buildWorld();
  const arthur = ctx.state.arthur || { pos: world.spawn, angle: Math.PI / 2 };

  const W2 = p => new THREE.Vector3(p[0], 0, -p[1]); // 2D (x,y) -> 3D (x,0,-y)
  const fillMats = [], disposables = [];
  let sliceGroup, sliceMesh = null, sliceLines = [];
  let current = null, solids;
  const lineup = []; // tumbling crystal display meshes

  function track(o) { disposables.push(o); return o; }

  function buildScene() {
    renderer = getRenderer(ctx.glContainer);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060d);
    scene.fog = new THREE.Fog(0x04060d, 180, 420);
    cam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1000);

    scene.add(new THREE.AmbientLight(0x8890c0, 0.7));
    const sun = new THREE.DirectionalLight(0xfff4d6, 1.4);
    sun.position.set(60, 90, 30);
    scene.add(sun);

    // starfield
    const starGeo = track(new THREE.BufferGeometry());
    const sp = [];
    for (let i = 0; i < 900; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(380 + Math.random() * 60);
      sp.push(v.x, Math.abs(v.y) * (Math.random() > 0.5 ? 1 : -0.3), v.z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(starGeo, track(new THREE.PointsMaterial({ color: 0x8890c0, size: 1.1, sizeAttenuation: false }))));

    // the plane of Flatland
    const planeMat = track(new THREE.MeshStandardMaterial({
      color: 0x0a0e22, transparent: true, opacity: 0.92, roughness: 0.9, side: THREE.DoubleSide,
    }));
    const plane = new THREE.Mesh(track(new THREE.PlaneGeometry(150, 100)), planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.05;
    scene.add(plane);
    const grid = new THREE.GridHelper(150, 30, 0x2a3055, 0x1a1f3a);
    grid.position.y = -0.02;
    scene.add(grid);

    // the 2D world, drawn upon the plane
    const segPos = [], segCol = [];
    for (const s of world.shapes) {
      const col = new THREE.Color(s.color);
      for (const g of shapeSegments(s)) {
        segPos.push(g.x1, 0.02, -g.y1, g.x2, 0.02, -g.y2);
        segCol.push(col.r, col.g, col.b, col.r, col.g, col.b);
      }
      if (s.closed && s.kind !== 'border') {
        const P = transformedPts(s);
        // rotation.x = -PI/2 maps shape (x, y) -> world (x, 0, -y), matching W2
        const shape = new THREE.Shape(P.map(p => new THREE.Vector2(p[0], p[1])));
        const mat = track(new THREE.MeshBasicMaterial({
          color: s.color, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
        }));
        fillMats.push(mat);
        const m = new THREE.Mesh(track(new THREE.ShapeGeometry(shape)), mat);
        m.rotation.x = -Math.PI / 2;
        m.position.y = 0.015;
        scene.add(m);
      }
    }
    const lineGeo = track(new THREE.BufferGeometry());
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(segPos, 3));
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(segCol, 3));
    scene.add(new THREE.LineSegments(lineGeo, track(new THREE.LineBasicMaterial({ vertexColors: true }))));

    // Arthur, gold and tiny, exactly where you left him
    const aPts = [[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]].map(p => {
      const c = Math.cos(arthur.angle), sn = Math.sin(arthur.angle);
      return W2([arthur.pos[0] + p[0] * c - p[1] * sn, arthur.pos[1] + p[0] * sn + p[1] * c]).setY(0.04);
    });
    const aGeo = track(new THREE.BufferGeometry().setFromPoints([...aPts, aPts[0]]));
    scene.add(new THREE.Line(aGeo, track(new THREE.LineBasicMaterial({ color: 0xe7c95f }))));

    // the Sphere himself, hovering loftily — off the camera's line of sight
    const sph = new THREE.Mesh(
      track(new THREE.SphereGeometry(5, 32, 20)),
      track(new THREE.MeshStandardMaterial({ color: 0x9a6cff, transparent: true, opacity: 0.55, roughness: 0.25 })),
    );
    sph.position.set(46, 17, 26);
    scene.add(sph);
    scene.userData.sphereNPC = sph;
    const pl = new THREE.PointLight(0xc9a3ff, 600, 90);
    pl.position.copy(sph.position);
    scene.add(pl);
    scene.userData.sphereLight = pl;

    // slice presentation group at the world's centre
    sliceGroup = new THREE.Group();
    scene.add(sliceGroup);

    solids = makeLibrary();
    for (const s of solids) { s.ghost.visible = false; scene.add(s.ghost); }

    controls = new OrbitControls(cam, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 18;
    controls.maxDistance = 300;
    controls.enableDamping = true;
    controls.screenSpacePanning = false; // pan glides along the plane
    controls.enabled = false;
    twistOff = enableTwoFingerTwist(controls);
    camRig(0);
  }

  // ---------- the solid library ----------

  const circle = (r, n = 40) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  };

  function ghostMat(c) {
    return track(new THREE.MeshStandardMaterial({
      color: c, transparent: true, opacity: 0.28, roughness: 0.35, side: THREE.DoubleSide,
    }));
  }
  function wire(geo, color) {
    const e = track(new THREE.EdgesGeometry(geo, 12));
    return new THREE.LineSegments(e, track(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 })));
  }
  function ghostOf(geo, color, quat = null) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, ghostMat(color));
    const w = wire(geo, color);
    if (quat) { m.quaternion.copy(quat); w.quaternion.copy(quat); }
    g.add(m, w);
    return g;
  }

  function genericSlice(verts, edges, dy) {
    const moved = verts.map(v => [v[0], v[1] + dy, v[2]]);
    const pts = sliceEdges(moved, edges, 1);
    if (pts.length < 3) return null;
    const hull = convexHull2D(pts.map(p => [p[0], p[2]]));
    return hull.length >= 3 ? hull.map(p => [p[0], -p[1]]) : null; // back to (x, y2d)
  }

  function prism(n, r, h) { // upright n-gon prism: rings + verticals
    const verts = [], edges = [];
    for (const y of [-h / 2, h / 2]) {
      const base = verts.length;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        verts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
        edges.push([base + i, base + ((i + 1) % n)]);
      }
    }
    for (let i = 0; i < n; i++) edges.push([i, i + n]);
    return { verts, edges };
  }

  function makeLibrary() {
    const out = [];

    // SPHERE — analytic circular slices
    {
      const R = 7;
      out.push({
        key: 'sphere', label: '🔮 a Sphere', color: '#c9a3ff', amp: R + 3.5,
        ghost: ghostOf(track(new THREE.SphereGeometry(R, 28, 18)), 0xc9a3ff),
        explain: 'Circles that wax and wane, perfectly round, perfectly smooth. Only a SPHERE wears that disguise. To your plane I was never more than my own equator.',
        slice(dy) {
          const rr = R * R - dy * dy;
          return rr < 0.05 ? null : circle(Math.sqrt(rr));
        },
      });
    }

    // CUBE balanced on a corner — triangle → hexagon → triangle
    {
      const H = 5.6;
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(1, 1, 1).normalize(), new THREE.Vector3(0, 1, 0));
      const verts = [];
      for (let i = 0; i < 8; i++) {
        const v = new THREE.Vector3(i & 1 ? H : -H, i & 2 ? H : -H, i & 4 ? H : -H).applyQuaternion(q);
        verts.push([v.x, v.y, v.z]);
      }
      const edges = [];
      for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if ((i ^ b) > i) edges.push([i, i ^ b]);
      out.push({
        key: 'cube', label: '🧊 a Cube', color: '#e7c95f', amp: H * Math.sqrt(3) + 3,
        ghost: ghostOf(track(new THREE.BoxGeometry(2 * H, 2 * H, 2 * H)), 0xe7c95f, q),
        explain: 'A triangle that blooms into a hexagon, then closes to a triangle again: a CUBE, balanced on its corner, sliced floor by floor. Edges, Square — slices of flat faces are always EDGED.',
        slice: dy => genericSlice(verts, edges, dy),
      });
    }

    // CONE, slightly tilted — a point blooming into ellipses, then cut off
    {
      const R = 6.5, H = 13;
      const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.35);
      const verts = [], edges = [];
      const apex = new THREE.Vector3(0, H / 2, 0).applyQuaternion(tilt);
      verts.push([apex.x, apex.y, apex.z]);
      const N = 26;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const v = new THREE.Vector3(Math.cos(a) * R, -H / 2, Math.sin(a) * R).applyQuaternion(tilt);
        verts.push([v.x, v.y, v.z]);
        edges.push([0, 1 + i], [1 + i, 1 + ((i + 1) % N)]);
      }
      out.push({
        key: 'cone', label: '🍦 a Cone', color: '#79c478', amp: H / 2 + 4.5,
        ghost: ghostOf(track(new THREE.ConeGeometry(R, H, 26)), 0x79c478, tilt),
        explain: 'A point that blooms into ever-wider rounds — and then is severed all at once at the base. A CONE: the genealogy of a circle, told tip to table.',
        slice: dy => genericSlice(verts, edges, dy),
      });
    }

    // CYLINDER, upright — constant circles that appear and vanish without warning
    {
      const R = 5.5, H = 11;
      const { verts, edges } = prism(24, R, H);
      out.push({
        key: 'cylinder', label: '🛢 a Cylinder', color: '#7fd4ff', amp: H / 2 + 4,
        ghost: ghostOf(track(new THREE.CylinderGeometry(R, R, H, 24)), 0x7fd4ff),
        explain: 'Circles — constant, indifferent — that appear and vanish in an instant at the rims. A CYLINDER: a circle extruded; a coin, stood upon its face.',
        slice: dy => genericSlice(verts, edges, dy),
      });
    }

    // SQUARE PYRAMID, apex up — squares growing rung by rung
    {
      const B = 5.2, H = 11, apexY = H / 2, baseY = -H / 2;
      const verts = [[0, apexY, 0], [B, baseY, B], [B, baseY, -B], [-B, baseY, -B], [-B, baseY, B]];
      const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 3], [3, 4], [4, 1]];
      const geo = track(new THREE.ConeGeometry(B * Math.SQRT2, H, 4));
      out.push({
        key: 'pyramid', label: '🔺 a Pyramid', color: '#e0985a', amp: H / 2 + 4,
        ghost: ghostOf(geo, 0xe0985a, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4)),
        explain: 'Squares — four-cornered like yourself, Arthur — growing rung by rung from a point, then cut off at the floor. A PYRAMID: a square’s ancestry, told from the summit down.',
        slice: dy => genericSlice(verts, edges, dy),
      });
    }

    // TETRAHEDRON — triangles, and stranger quadrilateral cuts
    {
      const s = 4.6;
      const verts = [[s, s, s], [s, -s, -s], [-s, s, -s], [-s, -s, s]];
      const edges = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
      const geo = track(new THREE.BufferGeometry().setFromPoints([
        ...[[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]].flatMap(f => f.map(i => new THREE.Vector3(...verts[i]))),
      ]));
      geo.computeVertexNormals();
      out.push({
        key: 'tetra', label: '▲ a Tetrahedron', color: '#e06c5a', amp: s + 4,
        ghost: ghostOf(geo, 0xe06c5a),
        explain: 'Triangles tilting into quadrilaterals and back — the leanest of all solids. A TETRAHEDRON: four corners, four faces, nothing to spare.',
        slice: dy => genericSlice(verts, edges, dy),
      });
    }

    // OCTAHEDRON, vertex up — a diamond that squares at the waist
    {
      const R = 6.5;
      const verts = [[R, 0, 0], [-R, 0, 0], [0, R, 0], [0, -R, 0], [0, 0, R], [0, 0, -R]];
      const edges = [];
      for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
        if (Math.abs(verts[i][0] + verts[j][0]) + Math.abs(verts[i][1] + verts[j][1]) + Math.abs(verts[i][2] + verts[j][2]) > 0.01) edges.push([i, j]);
      }
      out.push({
        key: 'octa', label: '💠 an Octahedron', color: '#5fc9c9', amp: R + 4,
        ghost: ghostOf(track(new THREE.OctahedronGeometry(R)), 0x5fc9c9),
        explain: 'A point that opens into widening squares, squares at the waist, and closes again to a point. An OCTAHEDRON: two pyramids, base to base.',
        slice: dy => genericSlice(verts, edges, dy),
      });
    }

    // TORUS — the only slice with a HOLE
    {
      const R = 5.2, r = 2.5;
      const geo = track(new THREE.TorusGeometry(R, r, 14, 28));
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      out.push({
        key: 'torus', label: '🍩 a Torus', color: '#ff9ec7', amp: r + 3.5,
        ghost: ghostOf(geo, 0xff9ec7, q),
        explain: 'A ring! A slice with a HOLE in it — no sphere, no cone, no polyhedron carries emptiness within. A TORUS, Square: the circle’s revenge on solidity.',
        slice(dy) {
          const k2 = r * r - dy * dy;
          if (k2 < 0.05) return null;
          const k = Math.sqrt(k2);
          return { outer: circle(R + k), hole: circle(Math.max(0.2, R - k)).reverse() };
        },
      });
    }

    return out;
  }

  // random convex crystal: hull of a scatter of points
  function makeCrystal() {
    const pts = [];
    const n = 7 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      pts.push(new THREE.Vector3().randomDirection().multiplyScalar(3.6 + Math.random() * 3.4));
    }
    const geo = new ConvexGeometry(pts);
    const { verts, edges } = extractEdges(geo.attributes.position.array);
    const color = new THREE.Color().setHSL(Math.random(), 0.65, 0.66);
    const hex = '#' + color.getHexString();
    let maxY = 0;
    for (const v of verts) maxY = Math.max(maxY, Math.abs(v[1]));
    return {
      key: 'crystal', label: '◆ a Crystal', color: hex, amp: maxY + 3.5, geo,
      ghost: ghostOf(geo, color.getHex()),
      slice: dy => genericSlice(verts, edges, dy),
    };
  }

  // ---------- slice rendering ----------

  function clearSliceMeshes() {
    if (sliceMesh) {
      sliceGroup.remove(sliceMesh);
      sliceMesh.geometry.dispose();
      sliceMesh = null;
    }
    for (const l of sliceLines) { sliceGroup.remove(l); l.geometry.dispose(); }
    sliceLines = [];
  }

  function updateSlice() {
    clearSliceMeshes();
    if (!current) return;
    const dy = current.dy;
    current.def.ghost.position.y = dy;
    const res = current.def.slice(dy); // null | [[x,y2d]] | {outer, hole}
    const outer = Array.isArray(res) ? res : res?.outer;
    if (!outer) return;
    const shape = new THREE.Shape(outer.map(p => new THREE.Vector2(p[0], p[1])));
    if (!Array.isArray(res) && res.hole) {
      shape.holes.push(new THREE.Path(res.hole.map(p => new THREE.Vector2(p[0], p[1]))));
    }
    sliceMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), current.matFill);
    sliceMesh.rotation.x = -Math.PI / 2;
    sliceMesh.position.y = 0.08;
    sliceGroup.add(sliceMesh);
    for (const loop of [outer, !Array.isArray(res) ? res.hole : null]) {
      if (!loop) continue;
      const lp = loop.map(p => new THREE.Vector3(p[0], 0.1, -p[1]));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([...lp, lp[0]]), current.matLine);
      sliceGroup.add(line);
      sliceLines.push(line);
    }
  }

  // Portrait screens have a much narrower horizontal FOV: pull the camera
  // back so the whole scene (Sphere included) fits without manual zooming.
  const aspectPull = () => Math.min(1.9, Math.max(1, Math.sqrt(1.5 / cam.aspect)));

  function camRig(k) {
    const e = easeInOut(k);
    const a = W2(arthur.pos);
    const from = new THREE.Vector3(a.x, 1.1, a.z + 7);
    const to = new THREE.Vector3(0, 78, 95).multiplyScalar(aspectPull());
    cam.position.lerpVectors(from, to, e);
    const lookFrom = new THREE.Vector3(a.x, 0.8, a.z - 20);
    const lookTo = new THREE.Vector3(0, 0, 0);
    cam.lookAt(lookFrom.lerp(lookTo, e));
  }

  // ---------- game rounds ----------

  const shuffle = arr => arr.slice().sort(() => Math.random() - 0.5);

  // One round: `def` passes through the plane; the player picks among `options`.
  async function riteRound(def, options, { explainLine = null, watch = 7000 } = {}) {
    current = {
      def, t0: t, dy: def.amp,
      matFill: new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
      matLine: new THREE.LineBasicMaterial({ color: def.color }),
    };
    await wait(watch);
    if (!alive) return;
    let wrongs = 0;
    while (alive) {
      const pick = await ctx.choose(options.map(o => o.label));
      if (!alive) return;
      if (options[pick] === def) { ctx.audio.chime(); break; }
      ctx.audio.buzz();
      await dialogue.say([{ who: 'THE SPHERE', text: WRONG[Math.min(wrongs++, WRONG.length - 1)] }]);
    }
    def.ghost.visible = true;
    if (explainLine) await dialogue.say([{ who: 'THE SPHERE', text: explainLine }]);
    else await wait(3800);
    if (def.ghost) def.ghost.visible = false;
    current.matFill.dispose();
    current.matLine.dispose();
    current = null;
    updateSlice();
  }

  // Endless-mode round with three random crystals in a tumbling line-up.
  async function crystalRound() {
    const crystals = [0, 1, 2].map(makeCrystal);
    crystals.forEach((c, i) => {
      const disp = ghostOf(c.geo, new THREE.Color(c.color).getHex());
      disp.position.set(0, 16, -8); // x and scale follow the aspect each frame
      disp.userData.slot = i;
      scene.add(disp);
      lineup.push(disp);
      scene.add(c.ghost);
      c.ghost.visible = false;
    });
    const answer = Math.floor(Math.random() * 3);
    ctx.hint('one of these three crystals is passing through the plane — which?<br><b>Ⓐ</b> left · <b>Ⓑ</b> centre · <b>Ⓒ</b> right');
    const options = crystals.map((c, i) => ({ ...c, label: ['Ⓐ', 'Ⓑ', 'Ⓒ'][i] }));
    const def = options[answer];
    await riteRound(def, options, {
      explainLine: `It was the ${ORDINAL[answer]}. Every body has its signature, Square — even the nameless ones I cut at random.`,
      watch: 6000,
    });
    for (const d of lineup.splice(0)) scene.remove(d);
    for (const c of crystals) { scene.remove(c.ghost); c.geo.dispose(); }
  }

  async function endlessRite() {
    ctx.panel.add('⬆ TO HYPERLAND', () => ctx.goto(4), { major: true });
    await dialogue.say(L_ENDLESS);
    let last = null;
    while (alive) {
      if (Math.random() < 0.3) {
        await crystalRound();
      } else {
        const pool = solids.filter(s => s !== last);
        const def = pool[Math.floor(Math.random() * pool.length)];
        last = def;
        const decoys = shuffle(solids.filter(s => s !== def)).slice(0, 2);
        ctx.hint('a body is passing through the plane —<br>watch its <b>slice</b>, and the way it changes');
        await riteRound(def, shuffle([def, ...decoys]), { explainLine: def.explain });
      }
      if (!alive) return;
    }
  }

  async function script() {
    await wait(700);
    if (!alive) return;
    await tween(v => { riseK = v; }, 0, 1, 7, easeInOut);
    rising = false;
    if (controls) controls.enabled = true;
    if (!alive) return;
    ctx.hint(ctx.isTouch
      ? 'one finger orbits · two fingers pinch / pan / twist'
      : 'drag to orbit · scroll to zoom');
    await dialogue.say(L_BEHOLD);
    if (!alive) return;
    await tween(v => { highlight = v; }, 0, 1, 1.2);
    await dialogue.say(L_RITE);
    await tween(v => { highlight = v; }, 1, 0, 1.2);
    if (!alive) return;

    // dolly in over the slice stage for the examination
    const camFrom = cam.position.clone();
    const camTo = new THREE.Vector3(0, 42, 54).multiplyScalar(aspectPull());
    await tween(k => { if (!rising) cam.position.lerpVectors(camFrom, camTo, k); }, 0, 1, 2.2);

    // story rounds: Abbott's classic trio
    const trio = ['sphere', 'cube', 'cone'].map(k => solids.find(s => s.key === k));
    for (const def of shuffle(trio)) {
      if (!alive) return;
      ctx.hint('a body is passing through the plane —<br>watch its <b>slice</b>, and the way it changes');
      await riteRound(def, trio, { explainLine: def.explain });
    }

    ctx.hint('');
    await dialogue.say(L_FINAL);
    if (!alive) return;
    const pick = await ctx.choose(['⟳  The Endless Rite — stranger bodies', '⬆  Seek the Fourth Dimension']);
    if (!alive) return;
    if (pick === 0) await endlessRite();
    else ctx.goto(4);
  }

  return {
    dim: 3,
    title: 'SPACELAND',
    sub: 'THE REVELATION OF THE THIRD',
    uses: { gl: true },

    async init() {
      buildScene();
      ctx.hint('');
      script();
    },

    update(dt) {
      if (!scene) return; // WebGL init failed — manager already shows a notice
      t += dt;
      if (rising) camRig(riseK);
      else controls.update();

      const sph = scene.userData.sphereNPC;
      sph.position.y = 17 + Math.sin(t * 0.7) * 1.6;
      // keep the Sphere in frame on narrow screens
      sph.position.x = 46 * Math.min(1, cam.aspect / 1.3);
      scene.userData.sphereLight.position.copy(sph.position);

      // "I can see inside everything" — interiors pulse open
      const op = 0.18 + highlight * (0.25 + Math.sin(t * 3) * 0.12);
      for (const m of fillMats) m.opacity = op;

      // tumbling crystal line-up, spaced and sized to fit the viewport
      const spread = Math.min(26, 4 + 24 * cam.aspect);
      for (const d of lineup) {
        d.position.x = (d.userData.slot - 1) * spread;
        d.scale.setScalar(Math.min(1, spread / 26));
        d.rotation.x += dt * 0.4;
        d.rotation.y += dt * 0.27;
      }

      if (current) {
        current.dy = Math.cos((t - current.t0) * 0.55) * current.def.amp;
        updateSlice();
      }
      renderer.render(scene, cam);
    },

    onResize() {
      cam.aspect = innerWidth / innerHeight;
      cam.updateProjectionMatrix();
    },

    dispose() {
      alive = false;
      twistOff?.();
      controls?.dispose();
      clearSliceMeshes();
      for (const d of disposables) d.dispose?.();
      scene = null;
    },
  };
}
