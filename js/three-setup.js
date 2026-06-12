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
