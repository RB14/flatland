// Genuine 4D linear algebra: plane rotations, composition, perspective projection,
// and n-cube generators (point, segment, square, cube, tesseract — one code path).

const AXES = { X: 0, Y: 1, Z: 2, W: 3 };
export const PLANES = ['XY', 'XZ', 'YZ', 'XW', 'YW', 'ZW'];

export function ident() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

// Givens rotation in the plane spanned by the two named axes.
export function planeRot(plane, ang) {
  const m = ident();
  const i = AXES[plane[0]], j = AXES[plane[1]];
  const c = Math.cos(ang), s = Math.sin(ang);
  m[i * 4 + i] = c; m[i * 4 + j] = -s;
  m[j * 4 + i] = s; m[j * 4 + j] = c;
  return m;
}

export function mat4mul(a, b) {
  const o = new Array(16).fill(0);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      for (let k = 0; k < 4; k++)
        o[r * 4 + c] += a[r * 4 + k] * b[k * 4 + c];
  return o;
}

export function apply(m, v) {
  const o = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++)
    o[r] = m[r * 4] * v[0] + m[r * 4 + 1] * v[1] + m[r * 4 + 2] * v[2] + m[r * 4 + 3] * v[3];
  return o;
}

// angles: {XY: rad, XZ: rad, ...} -> composed rotation matrix.
export function composeRot(angles) {
  let m = ident();
  for (const p of PLANES) {
    const a = angles[p];
    if (a) m = mat4mul(planeRot(p, a), m);
  }
  return m;
}

// Perspective projection from a 4D "eye" at w = d looking at the origin.
export function project4(v, d = 3.4) {
  const s = d / (d - v[3]);
  return [v[0] * s, v[1] * s, v[2] * s];
}

// Vertices of the k-cube embedded in 4-space: ±half along the first k axes, 0 elsewhere.
export function nCubeVerts(k, half = 1) {
  const n = 1 << k;
  const out = [];
  for (let i = 0; i < n; i++) {
    const v = [0, 0, 0, 0];
    for (let a = 0; a < k; a++) v[a] = (i >> a) & 1 ? half : -half;
    out.push(v);
  }
  return out;
}

// Edges of the k-cube: vertex pairs at Hamming distance 1.
export function nCubeEdges(k) {
  const n = 1 << k;
  const e = [];
  for (let i = 0; i < n; i++)
    for (let a = 0; a < k; a++) {
      const j = i ^ (1 << a);
      if (j > i) e.push([i, j]);
    }
  return e;
}
