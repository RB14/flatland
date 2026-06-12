import * as THREE from 'three';

let renderer = null;

export function getRenderer(container) {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    container.appendChild(renderer.domElement);
  }
  return renderer;
}

export function resizeRenderer() {
  if (renderer) renderer.setSize(innerWidth, innerHeight);
}

// Two-finger twist-to-rotate on top of OrbitControls' built-in two-finger
// dolly + pan, so pinch / pan / rotate all work in one gesture (map-style).
// Returns a cleanup function — call it in the chapter's dispose().
export function enableTwoFingerTwist(controls) {
  const el = controls.domElement;
  const up = new THREE.Vector3(0, 1, 0);
  const pts = new Map();
  let prevAngle = null;

  const angleNow = () => {
    const [a, b] = [...pts.values()];
    return Math.atan2(b.y - a.y, b.x - a.x);
  };
  const onDown = e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    prevAngle = pts.size === 2 ? angleNow() : null;
  };
  const onMove = e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size !== 2 || prevAngle === null || !controls.enabled) return;
    const a = angleNow();
    let d = a - prevAngle;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    prevAngle = a;
    const cam = controls.object;
    const off = cam.position.clone().sub(controls.target);
    // content follows the fingers: orbiting the camera by +d spins the scene
    // by -d on screen, and the apparent direction flips when viewing from below
    off.applyAxisAngle(up, off.y >= 0 ? d : -d);
    cam.position.copy(controls.target).add(off);
    cam.lookAt(controls.target);
  };
  const onUp = e => {
    pts.delete(e.pointerId);
    prevAngle = pts.size === 2 ? angleNow() : null;
  };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onUp);
  return () => {
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    removeEventListener('pointerup', onUp);
    removeEventListener('pointercancel', onUp);
  };
}
