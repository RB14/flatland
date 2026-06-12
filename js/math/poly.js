// 2D / N-D geometry helpers shared across chapters.

export function regularPolygon(n, r, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

// Ray (px,py)+(dx,dy)·t against segment (x1,y1)-(x2,y2). Returns t (distance) or Infinity.
export function raySegment(px, py, dx, dy, x1, y1, x2, y2) {
  const sx = x2 - x1, sy = y2 - y1;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-12) return Infinity;
  const qx = x1 - px, qy = y1 - py;
  const t = (qx * sy - qy * sx) / denom;
  const u = (qx * dy - qy * dx) / denom;
  return (t > 1e-6 && u >= 0 && u <= 1) ? t : Infinity;
}

export function distPointSegment(px, py, x1, y1, x2, y2) {
  const sx = x2 - x1, sy = y2 - y1;
  const len2 = sx * sx + sy * sy;
  let t = len2 ? ((px - x1) * sx + (py - y1) * sy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + sx * t, cy = y1 + sy * t;
  return { d: Math.hypot(px - cx, py - cy), cx, cy };
}

// Andrew monotone chain. pts: [[x,y],...] -> CCW hull.
export function convexHull2D(pts) {
  if (pts.length < 3) return pts.slice();
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  p.reverse();
  for (const q of p) {
    while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop();
    hi.push(q);
  }
  lo.pop(); hi.pop();
  return lo.concat(hi);
}

// Deduplicate a non-indexed triangle soup (e.g. ConvexGeometry positions) into
// unique vertices + unique edges, ready for sliceEdges().
export function extractEdges(positions) {
  const map = new Map(), verts = [], tri = [];
  for (let i = 0; i < positions.length; i += 3) {
    const k = positions[i].toFixed(3) + ',' + positions[i + 1].toFixed(3) + ',' + positions[i + 2].toFixed(3);
    let id = map.get(k);
    if (id === undefined) {
      id = verts.length;
      verts.push([positions[i], positions[i + 1], positions[i + 2]]);
      map.set(k, id);
    }
    tri.push(id);
  }
  const seen = new Set(), edges = [];
  for (let i = 0; i < tri.length; i += 3) {
    for (const [a, b] of [[tri[i], tri[i + 1]], [tri[i + 1], tri[i + 2]], [tri[i + 2], tri[i]]]) {
      const key = a < b ? a + '_' + b : b + '_' + a;
      if (!seen.has(key)) { seen.add(key); edges.push([a, b]); }
    }
  }
  return { verts, edges };
}

// Slice an edge-soup by the hyperplane {coordinate `axis` == 0}.
// verts: number[][] (any dimension), edges: [i,j][]. Returns interpolated crossing points.
// This one function powers BOTH the 3D solids sliced by Flatland's plane (axis=y)
// and the tesseract sliced by Spaceland's hyperplane (axis=w).
export function sliceEdges(verts, edges, axis) {
  const out = [];
  for (const [i, j] of edges) {
    const a = verts[i], b = verts[j];
    const ca = a[axis], cb = b[axis];
    if ((ca > 0 && cb > 0) || (ca < 0 && cb < 0)) continue;
    const span = ca - cb;
    if (Math.abs(span) < 1e-9) continue;
    const t = ca / span;
    out.push(a.map((v, k) => v + (b[k] - v) * t));
  }
  return out;
}
