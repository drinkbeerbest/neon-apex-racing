import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const UP = new THREE.Vector3(0, 1, 0);
const lerp = THREE.MathUtils.lerp;

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function smoothSections(sections, steps = 5) {
  const out = [];
  for (let i = 0; i < sections.length - 1; i++) {
    const p0 = sections[Math.max(0, i - 1)];
    const p1 = sections[i];
    const p2 = sections[i + 1];
    const p3 = sections[Math.min(sections.length - 1, i + 2)];
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const sample = {};
      for (const key of ['z', 'width', 'bottom', 'shoulder', 'top']) sample[key] = catmull(p0[key], p1[key], p2[key], p3[key], t);
      out.push(sample);
    }
  }
  out.push(sections[sections.length - 1]);
  return out;
}

function sectionRing({ width: w, bottom: b, shoulder: sh, top: t }) {
  const u = Math.max(0.01, t - sh);
  return [
    [0, b],
    [w * 0.32, b + 0.002],
    [w * 0.62, b + 0.006],
    [w * 0.86, b + 0.026],
    [w * 0.97, b + 0.09],
    [w, b + (sh - b) * 0.34],
    [w, b + (sh - b) * 0.7],
    [w * 0.995, sh],
    [w * 0.98, sh + u * 0.28],
    [w * 0.92, sh + u * 0.58],
    [w * 0.79, sh + u * 0.82],
    [w * 0.52, t - 0.004],
    [w * 0.22, t + 0.008],
    [0, t + 0.012],
    [-w * 0.22, t + 0.008],
    [-w * 0.52, t - 0.004],
    [-w * 0.79, sh + u * 0.82],
    [-w * 0.92, sh + u * 0.58],
    [-w * 0.98, sh + u * 0.28],
    [-w * 0.995, sh],
    [-w, b + (sh - b) * 0.7],
    [-w, b + (sh - b) * 0.34],
    [-w * 0.97, b + 0.09],
    [-w * 0.86, b + 0.026],
    [-w * 0.62, b + 0.006],
    [-w * 0.32, b + 0.002],
  ];
}

function createLoftGeometry(sections, steps = 5) {
  const rings = smoothSections(sections, steps);
  const ringSize = 26;
  const positions = [];
  const indices = [];
  for (const section of rings) {
    for (const [x, y] of sectionRing(section)) positions.push(x, y, section.z);
  }
  for (let s = 0; s < rings.length - 1; s++) {
    for (let j = 0; j < ringSize; j++) {
      const a = s * ringSize + j;
      const b = s * ringSize + (j + 1) % ringSize;
      const c = (s + 1) * ringSize + j;
      const d = (s + 1) * ringSize + (j + 1) % ringSize;
      indices.push(a, b, c, b, d, c);
    }
  }
  for (let j = 1; j < ringSize - 1; j++) indices.push(0, j, j + 1);
  const end = (rings.length - 1) * ringSize;
  for (let j = 1; j < ringSize - 1; j++) indices.push(end, end + j + 1, end + j);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makePlateTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dce8ea';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#87979d';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = '#111a20';
  ctx.font = '700 54px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 276, 69);
  ctx.fillStyle = '#c40e2c';
  ctx.fillRect(18, 18, 10, 92);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeVentTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#030609';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = 'rgba(92,113,125,.42)';
  ctx.lineWidth = 1.2;
  const size = 13;
  for (let row = -1; row < 11; row++) {
    for (let col = -1; col < 22; col++) {
      const cx = col * size * 1.5 + (row % 2 ? size * 0.75 : 0);
      const cy = row * size * 0.86;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const angle = Math.PI / 3 * k;
        const x = cx + Math.cos(angle) * size;
        const y = cy + Math.sin(angle) * size;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeBadgeTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = '#dce1e4';
  ctx.font = '800 78px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeNumberTexture(number, accent, label) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(128, 128, 106, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(6,10,16,.85)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(128, 128, 100, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#0a0e14';
  ctx.font = '800 128px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number, 128, 120);
  ctx.font = '700 22px Arial';
  ctx.fillStyle = 'rgba(8,12,18,.85)';
  ctx.fillText(label, 128, 206);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeBrakeDiscTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 12, 128, 128, 126);
  gradient.addColorStop(0, '#8c969c');
  gradient.addColorStop(0.72, '#616c73');
  gradient.addColorStop(1, '#252c31');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(128, 128, 126, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#151b1f';
  for (let ring = 0; ring < 3; ring++) {
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2 + ring * 0.16;
      const radius = 70 + ring * 19;
      ctx.beginPath();
      ctx.arc(128 + Math.cos(angle) * radius, 128 + Math.sin(angle) * radius, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = '#30383d';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(128, 128, 43, 0, Math.PI * 2);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addBeam(parent, start, end, thickness, depth, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, length, depth), material);
  mesh.position.copy(start).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

const BASE_BODY = [
  { z: 2.28, width: 0.62, bottom: 0.31, shoulder: 0.44, top: 0.54 },
  { z: 2.19, width: 0.79, bottom: 0.29, shoulder: 0.52, top: 0.61 },
  { z: 2.03, width: 0.93, bottom: 0.27, shoulder: 0.61, top: 0.68 },
  { z: 1.8, width: 0.99, bottom: 0.27, shoulder: 0.69, top: 0.76 },
  { z: 1.57, width: 1.025, bottom: 0.4, shoulder: 0.74, top: 0.855 },
  { z: 1.36, width: 1.04, bottom: 0.51, shoulder: 0.76, top: 0.885 },
  { z: 1.12, width: 1.03, bottom: 0.42, shoulder: 0.75, top: 0.865 },
  { z: 0.9, width: 0.99, bottom: 0.27, shoulder: 0.72, top: 0.825 },
  { z: 0.58, width: 0.965, bottom: 0.25, shoulder: 0.71, top: 0.82 },
  { z: 0.18, width: 0.97, bottom: 0.245, shoulder: 0.725, top: 0.835 },
  { z: -0.22, width: 0.985, bottom: 0.25, shoulder: 0.75, top: 0.85 },
  { z: -0.65, width: 1.0, bottom: 0.255, shoulder: 0.77, top: 0.865 },
  { z: -1.02, width: 1.035, bottom: 0.42, shoulder: 0.795, top: 0.9 },
  { z: -1.3, width: 1.05, bottom: 0.51, shoulder: 0.79, top: 0.9 },
  { z: -1.55, width: 1.02, bottom: 0.43, shoulder: 0.77, top: 0.87 },
  { z: -1.82, width: 0.965, bottom: 0.3, shoulder: 0.73, top: 0.825 },
  { z: -2.08, width: 0.9, bottom: 0.31, shoulder: 0.64, top: 0.75 },
  { z: -2.23, width: 0.79, bottom: 0.34, shoulder: 0.55, top: 0.68 },
];

const BASE_CABIN = [
  { z: 0.62, width: 0.72, bottom: 0.79, shoulder: 0.82, top: 0.86 },
  { z: 0.36, width: 0.71, bottom: 0.79, shoulder: 0.94, top: 1.08 },
  { z: 0.08, width: 0.64, bottom: 0.79, shoulder: 1.14, top: 1.29 },
  { z: -0.28, width: 0.62, bottom: 0.79, shoulder: 1.2, top: 1.33 },
  { z: -0.8, width: 0.63, bottom: 0.79, shoulder: 1.18, top: 1.3 },
  { z: -1.13, width: 0.68, bottom: 0.785, shoulder: 1.01, top: 1.07 },
  { z: -1.42, width: 0.76, bottom: 0.78, shoulder: 0.84, top: 0.87 },
];

export const CAR_VARIANTS = {
  apex: {
    label: 'APEX GT', number: '7', paint: 0xa60b27, accent: 0xe8eef5,
    body: { length: 1, width: 1, height: 1, belt: 0, nose: 0.02, tail: 0, fender: 0.035, arch: 0.5 },
    cabin: { style: 'closed', shift: 0, scale: 1, height: 1, wide: 1 },
    wing: { style: 'swan', scale: 1, height: 0 },
    wheels: { radius: 0.43, width: 0.31, track: 0.88, frontZ: 1.36, rearZ: -1.3, spokes: 5, dual: true, rim: 0x343d45, caliper: 0xd01538, exposed: false },
    aero: { splitter: true, canards: true, divePlanes: true, hoodVents: true, sideIntakes: true, diffuser: true },
    lights: { front: 'lens', rear: 'bar' },
    exhaust: 'dual',
    livery: { hood: true, roof: true, side: true, number: true },
    extras: [],
  },
  muscle: {
    label: 'MUSCLE V8', number: '3', paint: 0x1f5de0, accent: 0xeef2f6,
    body: { length: 0.95, width: 1.07, height: 1.08, belt: 0.02, nose: -0.01, tail: 0.02, fender: 0.06, arch: 0.48 },
    cabin: { style: 'closed', shift: 0.12, scale: 0.95, height: 0.96, wide: 1.02 },
    wing: { style: 'duck', scale: 1, height: 0 },
    wheels: { radius: 0.42, width: 0.33, track: 0.93, frontZ: 1.32, rearZ: -1.26, spokes: 5, dual: false, rim: 0xd7dde3, caliper: 0x1f5de0, exposed: false },
    aero: { splitter: true, canards: true, divePlanes: false, hoodVents: false, sideIntakes: true, diffuser: true },
    lights: { front: 'quad', rear: 'round' },
    exhaust: 'quad',
    livery: { hood: true, roof: true, side: true, number: true },
    extras: ['hoodScoop', 'sidePipes'],
  },
  hyper: {
    label: 'HYPER', number: '11', paint: 0xd9a410, accent: 0x121418,
    body: { length: 1.04, width: 1.01, height: 0.9, belt: 0, nose: 0.1, tail: 0.03, fender: 0.04, arch: 0.52 },
    cabin: { style: 'closed', shift: -0.12, scale: 1.02, height: 0.88, wide: 0.98 },
    wing: { style: 'twin', scale: 1, height: 0 },
    wheels: { radius: 0.44, width: 0.34, track: 0.9, frontZ: 1.42, rearZ: -1.36, spokes: 7, dual: false, rim: 0x1a1d21, caliper: 0xffc23d, exposed: false },
    aero: { splitter: true, canards: false, divePlanes: true, hoodVents: true, sideIntakes: true, diffuser: true },
    lights: { front: 'bar', rear: 'thin' },
    exhaust: 'quad',
    livery: { hood: true, roof: true, side: true, number: true },
    extras: [],
  },
  roadster: {
    label: 'ROADSTER', number: '5', paint: 0x14a06a, accent: 0xf3e9d2,
    body: { length: 0.92, width: 1.0, height: 1.0, belt: 0.01, nose: 0.02, tail: 0, fender: 0.03, arch: 0.5 },
    cabin: { style: 'roadster', shift: -0.05, scale: 0.9, height: 1, wide: 1 },
    wing: { style: 'duck', scale: 0.9, height: 0 },
    wheels: { radius: 0.42, width: 0.3, track: 0.88, frontZ: 1.3, rearZ: -1.25, spokes: 6, dual: false, rim: 0xe9e1cf, caliper: 0x14a06a, exposed: false },
    aero: { splitter: true, canards: false, divePlanes: false, hoodVents: false, sideIntakes: true, diffuser: true },
    lights: { front: 'quad', rear: 'round' },
    exhaust: 'center',
    livery: { hood: false, roof: false, side: true, number: true },
    extras: [],
  },
  prototype: {
    label: 'PROTOTYPE', number: '9', paint: 0x8a4cf0, accent: 0x59edff,
    body: { length: 1.08, width: 1.02, height: 0.88, belt: 0, nose: 0.12, tail: 0.02, fender: 0.045, arch: 0.54 },
    cabin: { style: 'closed', shift: -0.18, scale: 1.05, height: 0.82, wide: 0.98 },
    wing: { style: 'swanBig', scale: 1.05, height: 0.04 },
    wheels: { radius: 0.44, width: 0.34, track: 0.91, frontZ: 1.45, rearZ: -1.4, spokes: 8, dual: false, rim: 0x121619, caliper: 0x59edff, exposed: false },
    aero: { splitter: true, canards: true, divePlanes: true, hoodVents: false, sideIntakes: true, diffuser: true },
    lights: { front: 'bar', rear: 'thin' },
    exhaust: 'center',
    livery: { hood: false, roof: true, side: true, number: true },
    extras: ['roofFin'],
  },
  rally: {
    label: 'RALLY', number: '2', paint: 0x6f7d8c, accent: 0xff2f70,
    body: { length: 0.9, width: 1.05, height: 1.14, belt: 0.03, nose: -0.03, tail: 0, fender: 0.07, arch: 0.46 },
    cabin: { style: 'closed', shift: 0.1, scale: 0.92, height: 1.04, wide: 1.03 },
    wing: { style: 'swanBig', scale: 1.1, height: -0.06 },
    wheels: { radius: 0.46, width: 0.33, track: 0.94, frontZ: 1.3, rearZ: -1.24, spokes: 6, dual: false, rim: 0x2b2f33, caliper: 0xff2f70, exposed: false },
    aero: { splitter: true, canards: false, divePlanes: false, hoodVents: false, sideIntakes: true, diffuser: true },
    lights: { front: 'quad', rear: 'quad' },
    exhaust: 'dual',
    livery: { hood: true, roof: true, side: true, number: true },
    extras: ['roofScoop', 'mudFlaps', 'lightPod'],
  },
  formula: {
    label: 'FORMULA', number: '8', paint: 0xff5a1f, accent: 0x111317,
    body: { length: 0.98, width: 0.82, height: 0.84, belt: 0, nose: 0.12, tail: 0.02, fender: 0.05, arch: 0.5 },
    cabin: { style: 'openwheel', shift: -0.15, scale: 0.8, height: 0.8, wide: 1 },
    wing: { style: 'formula', scale: 1, height: 0 },
    wheels: { radius: 0.44, width: 0.36, track: 1.02, frontZ: 1.5, rearZ: -1.48, spokes: 10, dual: false, rim: 0x0f1114, caliper: 0xff5a1f, exposed: true },
    aero: { splitter: false, canards: false, divePlanes: false, hoodVents: false, sideIntakes: false, diffuser: true },
    lights: { front: 'bar', rear: 'thin' },
    exhaust: 'center',
    livery: { hood: false, roof: false, side: true, number: true },
    extras: [],
  },
  targa: {
    label: 'TARGA', number: '4', paint: 0xe8e9ec, accent: 0xff4b8b,
    body: { length: 0.97, width: 1, height: 0.98, belt: 0.01, nose: 0.03, tail: 0, fender: 0.035, arch: 0.5 },
    cabin: { style: 'targa', shift: -0.02, scale: 0.98, height: 0.98, wide: 1 },
    wing: { style: 'duck', scale: 1.05, height: 0.02 },
    wheels: { radius: 0.42, width: 0.3, track: 0.9, frontZ: 1.34, rearZ: -1.28, spokes: 12, dual: false, rim: 0xc9d2da, caliper: 0xff4b8b, exposed: false },
    aero: { splitter: true, canards: true, divePlanes: false, hoodVents: true, sideIntakes: true, diffuser: true },
    lights: { front: 'popup', rear: 'thin' },
    exhaust: 'dual',
    livery: { hood: false, roof: false, side: true, number: true },
    extras: [],
  },
};

export class SportsCar {
  constructor(scene, { variant = 'apex', paintColor, accentColor, isAI = false } = {}) {
    const base = CAR_VARIANTS[variant] || CAR_VARIANTS.apex;
    this.spec = paintColor == null && accentColor == null
      ? base
      : { ...base, paint: paintColor ?? base.paint, accent: accentColor ?? base.accent };
    this.paintColor = this.spec.paint;
    this.accentColor = this.spec.accent;
    this.isAI = isAI;
    this.group = new THREE.Group();
    this.visual = new THREE.Group();
    this.group.add(this.visual);
    scene.add(this.group);
    this.wheels = [];
    this.frontWheelPivots = [];
    this.nitroFlames = [];
    this.L = this.spec.body.length;
    this.W = this.spec.body.width;
    this.H = this.spec.body.height;
    const wheels = this.spec.wheels;
    this.wheelRadius = wheels.radius;
    this.wheelZFront = wheels.frontZ * this.L;
    this.wheelZRear = wheels.rearZ * this.L;
    this.wheelTrack = wheels.track;
    this.wheelLocalPositions = [
      [-wheels.track, wheels.radius + 0.02, this.wheelZFront],
      [wheels.track, wheels.radius + 0.02, this.wheelZFront],
      [-wheels.track, wheels.radius + 0.02, this.wheelZRear],
      [wheels.track, wheels.radius + 0.02, this.wheelZRear],
    ];
    this.build();
    if (this.isAI) this.group.traverse((object) => { if (object.isMesh) object.castShadow = false; });
  }

  addMesh(geometry, material, position, parent = this.visual, shadow = true) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    parent.add(mesh);
    return mesh;
  }

  makeBodySections() {
    const b = this.spec.body;
    return BASE_BODY.map((section) => {
      const nz = section.z / 2.28;
      const z = section.z * b.length;
      const frontBulge = Math.exp(-(((z - this.wheelZFront) / b.arch) ** 2));
      const rearBulge = Math.exp(-(((z - this.wheelZRear) / b.arch) ** 2));
      const width = section.width * b.width * (1 + b.fender * (frontBulge + rearBulge));
      const bottom = section.bottom + b.belt * 0.4;
      const shoulder = bottom + (section.shoulder - section.bottom) * b.height + b.belt;
      const top = bottom + (section.top - section.bottom) * b.height + b.belt
        + b.nose * Math.max(0, nz) ** 2 + b.tail * Math.max(0, -nz) ** 2;
      return { z, width, bottom, shoulder, top };
    });
  }

  sectionValueAt(key, z) {
    const sections = this.bodySections;
    if (z >= sections[0].z) return sections[0][key];
    const last = sections[sections.length - 1];
    if (z <= last.z) return last[key];
    for (let i = 0; i < sections.length - 1; i++) {
      if (z <= sections[i].z && z >= sections[i + 1].z) {
        const span = sections[i].z - sections[i + 1].z;
        const t = span > 0.0001 ? (sections[i].z - z) / span : 0;
        return lerp(sections[i][key], sections[i + 1][key], t);
      }
    }
    return sections[0][key];
  }

  topAt(z) { return this.sectionValueAt('top', z); }
  widthAt(z) { return this.sectionValueAt('width', z); }
  bottomAt(z) { return this.sectionValueAt('bottom', z); }

  build() {
    const spec = this.spec;
    const detail = this.isAI ? 0 : 1;
    const paint = new THREE.MeshPhysicalMaterial({
      color: this.paintColor,
      metalness: 0.72,
      roughness: 0.17,
      clearcoat: 1,
      clearcoatRoughness: 0.09,
      envMapIntensity: 1.55,
      emissive: new THREE.Color(this.paintColor).multiplyScalar(0.05),
      emissiveIntensity: 0.2,
    });
    const accent = new THREE.MeshPhysicalMaterial({
      color: this.accentColor,
      metalness: 0.62,
      roughness: 0.24,
      clearcoat: 0.9,
      clearcoatRoughness: 0.14,
      envMapIntensity: 1.3,
    });
    const carbon = new THREE.MeshPhysicalMaterial({
      color: 0x090c10,
      metalness: 0.74,
      roughness: 0.25,
      clearcoat: 0.75,
      clearcoatRoughness: 0.23,
    });
    const carbonWeave = new THREE.MeshStandardMaterial({ color: 0x12171c, metalness: 0.65, roughness: 0.4 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x0a1721,
      metalness: 0.52,
      roughness: 0.075,
      transmission: 0,
      transparent: true,
      opacity: 0.94,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2.4,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xb7c2cb, metalness: 1, roughness: 0.13 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x20272d, metalness: 0.95, roughness: 0.2 });
    const black = new THREE.MeshStandardMaterial({ color: 0x040507, roughness: 0.55, metalness: 0.22 });
    const ventMaterial = new THREE.MeshStandardMaterial({ map: makeVentTexture(), color: 0x7d8d95, roughness: 0.5, metalness: 0.6 });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xbcefff, emissive: 0x9eeaff, emissiveIntensity: 1.7,
      roughness: 0.2, metalness: 0.15, toneMapped: false,
    });
    const headlightGlass = new THREE.MeshPhysicalMaterial({
      color: 0x1d3542, metalness: 0.55, roughness: 0.04,
      transmission: 0.22, transparent: true, opacity: 0.9, clearcoat: 1,
    });
    const tailMaterial = new THREE.MeshStandardMaterial({
      color: 0xff174b, emissive: 0xff0637, emissiveIntensity: 2,
      roughness: 0.3, metalness: 0.15, toneMapped: false,
    });
    this.tailMaterial = tailMaterial;
    this.material = { paint, accent, carbon, carbonWeave, glass, chrome, darkMetal, black, vent: ventMaterial, headlightMat, headlightGlass, tail: tailMaterial };

    this.bodySections = this.makeBodySections();
    this.loftSteps = this.isAI ? 3 : 5;
    const body = this.addMesh(createLoftGeometry(this.bodySections, this.loftSteps), paint, [0, 0, 0]);
    body.name = 'body-shell';

    this.buildCabin(detail);
    this.buildFront(detail, headlightMat, headlightGlass);
    this.buildSide(detail);
    this.buildRear(detail);
    this.buildWing(detail);
    this.buildWheels(detail);
    this.buildArchLips();
    this.buildLivery(detail);
    if (detail) this.buildInterior();
    if (detail) this.buildPlayerRig();
    this.buildShadow();
  }

  buildCabin(detail) {
    const { carbon, carbonWeave, paint, glass, black, chrome } = this.material;
    const spec = this.spec;
    const cab = spec.cabin;
    const style = cab.style;
    const L = this.L;
    const W = this.W;

    const baseSections = BASE_CABIN.map((section) => {
      const z = section.z * L * cab.scale + cab.shift * L;
      const bottom = this.topAt(z) - 0.015;
      return {
        z,
        width: section.width * W * cab.wide,
        bottom,
        shoulder: bottom + (section.shoulder - section.bottom) * cab.height,
        top: bottom + (section.top - section.bottom) * cab.height,
      };
    });

    if (style === 'roadster' || style === 'openwheel') {
      const front = baseSections[0];
      const rear = baseSections[baseSections.length - 1];
      const windshieldHeight = style === 'roadster' ? 0.42 : 0.3;
      const windshield = this.addMesh(
        new THREE.PlaneGeometry(front.width * 1.5, windshieldHeight),
        glass,
        [0, front.bottom + windshieldHeight * 0.5 + 0.02, front.z + 0.02],
        this.visual,
        false
      );
      windshield.rotation.x = -0.52;
      windshield.renderOrder = 2;
      addBeam(this.visual, new THREE.Vector3(-front.width * 0.76, front.bottom + 0.04, front.z + 0.02), new THREE.Vector3(-front.width * 0.62, front.bottom + windshieldHeight + 0.04, front.z - 0.1), 0.035, 0.035, chrome);
      addBeam(this.visual, new THREE.Vector3(front.width * 0.76, front.bottom + 0.04, front.z + 0.02), new THREE.Vector3(front.width * 0.62, front.bottom + windshieldHeight + 0.04, front.z - 0.1), 0.035, 0.035, chrome);
      this.addMesh(new THREE.CylinderGeometry(0.09, 0.1, 0.06, 16), black, [front.width * 0.62, front.bottom + windshieldHeight + 0.04, front.z - 0.1]);
      this.addMesh(new THREE.CylinderGeometry(0.09, 0.1, 0.06, 16), black, [-front.width * 0.62, front.bottom + windshieldHeight + 0.04, front.z - 0.1]);

      // 敞篷座舱开口
      this.addMesh(new RoundedBoxGeometry(front.width * 1.9, 0.06, (front.z - rear.z) * 0.7, 4, 0.05), black, [0, front.bottom + 0.02, (front.z + rear.z) * 0.5 + 0.05]);

      const hoopY = rear.bottom + 0.02;
      for (const side of [-1, 1]) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 6, 18, Math.PI), carbon);
        hoop.position.set(side * 0.31, hoopY, rear.z + 0.28);
        this.visual.add(hoop);
      }

      const helmet = this.addMesh(new THREE.SphereGeometry(0.18, 20, 14), paint, [0.24, rear.bottom + 0.42, rear.z + 0.2]);
      const visor = this.addMesh(new THREE.BoxGeometry(0.24, 0.075, 0.14), glass, [0.24, rear.bottom + 0.44, rear.z + 0.3], this.visual, false);
      visor.rotation.x = -0.15;
      this.addMesh(new RoundedBoxGeometry(0.42, 0.2, 0.2, 3, 0.06), black, [0.24, rear.bottom + 0.26, rear.z + 0.12]);
      helmet.castShadow = false;
      return;
    }

    this.cabinSections = baseSections;
    const canopy = this.addMesh(createLoftGeometry(baseSections, this.isAI ? 3 : 4), glass, [0, 0, 0], this.visual, false);
    canopy.name = 'glass-canopy';
    canopy.renderOrder = 2;

    let roofTop = 0;
    let roofZ = 0;
    for (const section of baseSections) {
      if (section.top > roofTop) {
        roofTop = section.top;
        roofZ = section.z;
      }
    }
    const roofMiddle = baseSections[2];
    const roofDepth = style === 'targa' ? 0.6 : 0.72;
    const roof = this.addMesh(new RoundedBoxGeometry(roofMiddle.width * 1.45, 0.045, roofDepth * this.L, 4, 0.018), paint, [0, roofTop + 0.005, roofZ + 0.14]);
    roof.rotation.x = 0.035;
    if (style === 'closed') {
      const spine = this.addMesh(new RoundedBoxGeometry(0.065, 0.016, roofDepth * 0.82, 3, 0.007), carbonWeave, [0, roofTop + 0.032, roofZ + 0.1]);
      spine.rotation.x = 0.035;
    } else {
      const targaBar = this.addMesh(new RoundedBoxGeometry(roofMiddle.width * 1.52, 0.06, 0.14, 3, 0.02), carbon, [0, roofTop - 0.01, roofZ + roofDepth * 0.48]);
      targaBar.rotation.x = 0.06;
    }
    if (detail) {
      const front = baseSections[0];
      const rear = baseSections[baseSections.length - 1];
      const midZ = roofZ + 0.24;
      for (const side of [-1, 1]) {
        addBeam(this.visual, new THREE.Vector3(side * front.width * 0.94, front.bottom + 0.08, front.z * 0.95), new THREE.Vector3(side * roofMiddle.width * 0.8, roofTop - 0.01, midZ), 0.05, 0.035, carbon);
        addBeam(this.visual, new THREE.Vector3(side * roofMiddle.width * 0.86, roofTop - 0.03, roofZ - 0.26), new THREE.Vector3(side * rear.width * 0.94, rear.bottom + 0.05, rear.z * 0.96), 0.055, 0.045, carbon);
        addBeam(this.visual, new THREE.Vector3(side * front.width * 0.92, front.bottom + 0.02, front.z), new THREE.Vector3(side * rear.width * 0.94, rear.bottom + 0.02, rear.z), 0.018, 0.018, black);
      }
    }
  }

  buildFront(detail, headlightMat, headlightGlass) {
    const { carbon, carbonWeave, paint, black, vent, chrome, darkMetal } = this.material;
    const spec = this.spec;
    const L = this.L;
    const W = this.W;
    const aero = spec.aero;
    const noseZ = 2.28 * L;
    const noseTop = this.topAt(noseZ);
    const noseBottom = this.bottomAt(noseZ);

    if (aero.splitter) {
      this.addMesh(new RoundedBoxGeometry(1.9 * W, 0.052, 0.43, 3, 0.022), carbon, [0, noseBottom - 0.055, 2.08 * L]);
      this.addMesh(new RoundedBoxGeometry(1.68 * W, 0.16, 0.12, 2, 0.03), carbonWeave, [0, noseBottom + 0.01, noseZ - 0.04]);
      const centerIntake = this.addMesh(new THREE.PlaneGeometry(0.76 * W, 0.17), vent, [0, noseTop - 0.1, noseZ + 0.006], this.visual, false);
      centerIntake.rotation.x = -0.08;
      for (const side of [-1, 1]) {
        const sideIntake = this.addMesh(new THREE.PlaneGeometry(0.3 * W, 0.16), vent, [side * 0.69 * W, noseTop - 0.11, noseZ - 0.09], this.visual, false);
        sideIntake.rotation.y = side * 0.34;
        sideIntake.rotation.x = -0.08;
      }
      this.addMesh(new RoundedBoxGeometry(1.52 * W, 0.025, 0.17, 2, 0.009), darkMetal, [0, noseBottom + 0.02, noseZ + 0.005]);
      if (aero.canards) {
        for (const side of [-1, 1]) {
          const canard = this.addMesh(new RoundedBoxGeometry(0.32 * W, 0.024, 0.2, 2, 0.008), carbon, [side * 0.88 * W, this.topAt(1.92 * L) - 0.2, 1.92 * L]);
          canard.rotation.z = side * 0.09;
          canard.rotation.y = side * 0.08;
          if (aero.divePlanes) {
            const divePlane = this.addMesh(new RoundedBoxGeometry(0.18 * W, 0.018, 0.26, 2, 0.007), carbon, [side * 0.92 * W, this.bottomAt(1.83 * L) + 0.09, 1.83 * L]);
            divePlane.rotation.z = side * 0.11;
          }
        }
      }
    }

    if (spec.wing.style === 'formula') {
      const frontWingY = noseBottom + 0.02;
      const frontWing = this.addMesh(new RoundedBoxGeometry(1.92 * W, 0.05, 0.42, 3, 0.018), carbon, [0, frontWingY, 2.12 * L]);
      frontWing.rotation.x = -0.08;
      const frontWing2 = this.addMesh(new RoundedBoxGeometry(1.6 * W, 0.04, 0.24, 2, 0.014), carbonWeave, [0, frontWingY + 0.1, 2.0 * L]);
      frontWing2.rotation.x = -0.14;
      for (const side of [-1, 1]) {
        this.addMesh(new RoundedBoxGeometry(0.05, 0.2, 0.46, 2, 0.014), carbon, [side * 0.95 * W, frontWingY + 0.05, 2.1 * L]);
      }
    }

    const headZ = 2.12 * L;
    const headY = this.topAt(headZ) - 0.075;
    const style = spec.lights.front;
    if (style === 'lens') {
      const lensShape = new THREE.Shape();
      lensShape.moveTo(-0.27, -0.045);
      lensShape.lineTo(-0.2, 0.05);
      lensShape.quadraticCurveTo(0.02, 0.074, 0.24, 0.027);
      lensShape.lineTo(0.22, -0.022);
      lensShape.quadraticCurveTo(0.02, -0.064, -0.2, -0.053);
      lensShape.closePath();
      const lensGeometry = new THREE.ExtrudeGeometry(lensShape, {
        depth: 0.045, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2,
      });
      for (const side of [-1, 1]) {
        const headlightGroup = new THREE.Group();
        headlightGroup.position.set(side * 0.56 * W, headY, headZ);
        headlightGroup.scale.x = side;
        this.visual.add(headlightGroup);
        const lens = new THREE.Mesh(lensGeometry, headlightGlass);
        headlightGroup.add(lens);
        for (const x of [-0.13, 0.055]) {
          const projector = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.07, 20), headlightMat);
          projector.rotation.x = Math.PI / 2;
          projector.position.set(x, 0, 0.035);
          headlightGroup.add(projector);
          if (detail) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.057, 0.007, 6, 24), chrome);
            ring.position.set(x, 0, 0.072);
            headlightGroup.add(ring);
          }
        }
        const drlCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.21, 0.045, 0.076),
          new THREE.Vector3(-0.04, 0.063, 0.082),
          new THREE.Vector3(0.15, 0.046, 0.078),
          new THREE.Vector3(0.225, 0.012, 0.072),
        ]);
        const drl = new THREE.Mesh(
          new THREE.TubeGeometry(drlCurve, 18, 0.009, 5, false),
          new THREE.MeshBasicMaterial({ color: 0xd8fbff, toneMapped: false })
        );
        headlightGroup.add(drl);
        const lowerStrip = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(-0.19, -0.041, 0.073), new THREE.Vector3(0.15, -0.035, 0.073)), 1, 0.005, 4, false),
          new THREE.MeshBasicMaterial({ color: 0x83e9ff, toneMapped: false })
        );
        headlightGroup.add(lowerStrip);
      }
      if (detail) {
        const badge = this.addMesh(new THREE.CylinderGeometry(0.055, 0.055, 0.015, 3), chrome, [0, noseTop - 0.05, noseZ + 0.012]);
        badge.rotation.x = Math.PI / 2;
        badge.rotation.z = Math.PI / 2;
      }
    } else if (style === 'quad') {
      for (const side of [-1, 1]) {
        this.addMesh(new RoundedBoxGeometry(0.46 * W, 0.13, 0.08, 3, 0.025), black, [side * 0.6 * W, headY, headZ], this.visual, false);
        for (const offset of [-0.1, 0.1]) {
          const projector = this.addMesh(new THREE.CylinderGeometry(0.048, 0.055, 0.07, 18), headlightMat, [side * 0.6 * W + offset, headY, headZ + 0.055], this.visual, false);
          projector.rotation.x = Math.PI / 2;
        }
      }
    } else if (style === 'bar') {
      for (const side of [-1, 1]) {
        this.addMesh(new RoundedBoxGeometry(0.5 * W, 0.035, 0.03, 2, 0.012), headlightMat, [side * 0.5 * W, headY + 0.03, headZ + 0.05], this.visual, false);
        this.addMesh(new RoundedBoxGeometry(0.5 * W, 0.02, 0.02, 2, 0.008), chrome, [side * 0.5 * W, headY - 0.015, headZ + 0.055], this.visual, false);
      }
    } else if (style === 'popup') {
      for (const side of [-1, 1]) {
        this.addMesh(new RoundedBoxGeometry(0.36 * W, 0.07, 0.3, 3, 0.03), paint, [side * 0.6 * W, headY + 0.02, headZ - 0.05]);
        this.addMesh(new RoundedBoxGeometry(0.26 * W, 0.018, 0.03, 2, 0.007), headlightMat, [side * 0.6 * W, headY + 0.02, headZ + 0.11], this.visual, false);
      }
    }

    if (detail && spec.aero.hoodVents) {
      for (const side of [-1, 1]) {
        const hoodZ = 1.23 * L;
        const hoodTop = this.topAt(hoodZ);
        const recess = this.addMesh(new RoundedBoxGeometry(0.28 * W, 0.014, 0.4, 2, 0.008), black, [side * 0.39 * W, hoodTop - 0.035, hoodZ]);
        recess.rotation.x = 0.07;
        for (let i = 0; i < 4; i++) {
          const louver = this.addMesh(new THREE.BoxGeometry(0.245 * W, 0.01, 0.035), carbonWeave, [side * 0.39 * W, hoodTop - 0.021, 1.08 * L + i * 0.09]);
          louver.rotation.x = 0.14;
        }
      }
    }
    if (detail) {
      const seamMaterial = new THREE.LineBasicMaterial({ color: 0x2b3338, transparent: true, opacity: 0.75 });
      for (const side of [-1, 1]) {
        const seamPoints = [
          new THREE.Vector3(side * 0.045, this.topAt(2.15 * L) + 0.005, 2.15 * L),
          new THREE.Vector3(side * 0.055, this.topAt(1.55 * L) + 0.005, 1.55 * L),
          new THREE.Vector3(side * 0.075, this.topAt(0.88 * L) + 0.005, 0.88 * L),
        ];
        const seam = new THREE.Line(new THREE.BufferGeometry().setFromPoints(seamPoints), seamMaterial);
        this.visual.add(seam);
      }
    }

    const extras = spec.extras;
    if (extras.includes('hoodScoop')) {
      const hoodZ = 1.55 * L;
      this.addMesh(new RoundedBoxGeometry(0.55 * W, 0.12, 0.62, 4, 0.04), paint, [0, this.topAt(hoodZ) + 0.04, hoodZ]);
      this.addMesh(new RoundedBoxGeometry(0.4 * W, 0.03, 0.5, 3, 0.012), black, [0, this.topAt(hoodZ) + 0.1, hoodZ + 0.02], this.visual, false);
    }
    if (extras.includes('lightPod')) {
      const podY = this.topAt(1.7 * L) + 0.07;
      this.addMesh(new RoundedBoxGeometry(1.05 * W, 0.06, 0.16, 3, 0.02), carbon, [0, podY, 1.72 * L]);
      for (const x of [-0.36, -0.12, 0.12, 0.36]) {
        const lamp = this.addMesh(new THREE.CylinderGeometry(0.065, 0.07, 0.05, 16), headlightMat, [x * W, podY + 0.015, 1.78 * L], this.visual, false);
        lamp.rotation.x = Math.PI / 2;
      }
    }
  }

  buildSide(detail) {
    const { carbon, paint, black, vent, chrome, accent } = this.material;
    const spec = this.spec;
    const L = this.L;
    const W = this.W;
    const seamMaterial = new THREE.LineBasicMaterial({ color: 0x2b3338, transparent: true, opacity: 0.75 });
    for (const side of [-1, 1]) {
      const skirt = this.addMesh(new RoundedBoxGeometry(0.075, 0.085, 1.72 * L, 3, 0.025), carbon, [side * this.widthAt(-0.03 * L) * 0.98, this.bottomAt(-0.03 * L) - 0.015, -0.03 * L]);
      skirt.rotation.z = side * -0.03;
      const fenderZ = 0.96 * L;
      const fenderVent = this.addMesh(new THREE.PlaneGeometry(0.29, 0.105), vent, [side * (this.widthAt(fenderZ) + 0.004), this.topAt(fenderZ) - 0.24, fenderZ], this.visual, false);
      fenderVent.rotation.y = side * Math.PI / 2;
      const intakeZ = -0.44 * L;
      const sideIntake = this.addMesh(new THREE.PlaneGeometry(0.54 * L, 0.16), vent, [side * (this.widthAt(intakeZ) + 0.004), this.topAt(intakeZ) - 0.24, intakeZ], this.visual, false);
      sideIntake.rotation.y = side * Math.PI / 2;
      const intakeBlade = this.addMesh(new RoundedBoxGeometry(0.035, 0.035, 0.56 * L, 2, 0.012), accent, [side * (this.widthAt(intakeZ) + 0.022), this.topAt(intakeZ) - 0.16, intakeZ]);
      intakeBlade.rotation.z = side * -0.15;
      this.addMesh(new THREE.BoxGeometry(0.012, 0.025, 0.1), new THREE.MeshBasicMaterial({ color: 0xffa35a, toneMapped: false }), [side * (this.widthAt(1.04 * L) + 0.006), this.bottomAt(1.04 * L) + 0.3, 1.04 * L], this.visual, false);
      if (detail) {
        const ventFin = this.addMesh(new RoundedBoxGeometry(0.03, 0.025, 0.31, 2, 0.01), chrome, [side * (this.widthAt(fenderZ) + 0.018), this.topAt(fenderZ) - 0.27, fenderZ]);
        ventFin.rotation.z = side * -0.1;
        const doorHandle = this.addMesh(new RoundedBoxGeometry(0.025, 0.032, 0.17, 2, 0.012), chrome, [side * (this.widthAt(-0.04 * L) + 0.004), this.topAt(-0.04 * L) - 0.13, -0.04 * L]);
        const doorSeamPoints = [
          new THREE.Vector3(side * (this.widthAt(0.5 * L) + 0.002), this.topAt(0.5 * L) - 0.02, 0.5 * L),
          new THREE.Vector3(side * (this.widthAt(0.18 * L) + 0.002), this.topAt(0.18 * L) - 0.25, 0.18 * L),
          new THREE.Vector3(side * (this.widthAt(-0.24 * L) + 0.002), this.bottomAt(-0.24 * L) + 0.05, -0.24 * L),
        ];
        const doorSeam = new THREE.Line(new THREE.BufferGeometry().setFromPoints(doorSeamPoints), seamMaterial);
        this.visual.add(doorSeam);
      }
      const mirrorZ = 0.37 * L;
      const mirrorX = this.widthAt(mirrorZ) + 0.15;
      const mirrorY = this.topAt(mirrorZ) + 0.12;
      addBeam(this.visual, new THREE.Vector3(side * this.widthAt(mirrorZ), mirrorY - 0.12, mirrorZ), new THREE.Vector3(side * mirrorX, mirrorY, mirrorZ), 0.035, 0.026, carbon);
      const mirror = this.addMesh(new RoundedBoxGeometry(0.28, 0.12, 0.22, 4, 0.048), paint, [side * mirrorX, mirrorY, mirrorZ]);
      mirror.rotation.y = side * 0.12;
      mirror.rotation.z = side * -0.08;
      if (detail) {
        const mirrorGlass = this.addMesh(new THREE.PlaneGeometry(0.19, 0.074), this.material.glass, [side * (mirrorX + 0.147), mirrorY + 0.005, mirrorZ + 0.015], this.visual, false);
        mirrorGlass.rotation.y = side * Math.PI / 2;
      }
      if (spec.extras.includes('sidePipes')) {
        const pipeY = this.bottomAt(-0.3 * L) + 0.12;
        for (const offset of [-0.16, 0.16]) {
          const pipe = this.addMesh(new THREE.CylinderGeometry(0.055, 0.06, 1.0 * L, 14, 1, true), chrome, [side * (this.widthAt(-0.3 * L) + 0.03), pipeY, -0.32 * L + offset]);
          pipe.rotation.x = Math.PI / 2;
        }
      }
      if (spec.extras.includes('mudFlaps')) {
        for (const z of [this.wheelZFront - 0.44, this.wheelZRear - 0.44]) {
          const flap = this.addMesh(new RoundedBoxGeometry(0.24, 0.38, 0.03, 2, 0.01), black, [side * (this.wheelTrack + 0.02), 0.3, z]);
          flap.rotation.z = side * 0.04;
        }
      }
    }
  }

  buildRear(detail) {
    const { carbon, carbonWeave, paint, black, vent, chrome, darkMetal, headlightMat, tail } = this.material;
    const spec = this.spec;
    const L = this.L;
    const W = this.W;
    const rearZ = -2.23 * L;
    const rearTop = this.topAt(rearZ);
    const rearBottom = this.bottomAt(rearZ);

    this.addMesh(new RoundedBoxGeometry(1.76 * W, 0.38, 0.25, 4, 0.075), paint, [0, rearTop * 0.68, -2.12 * L]);
    this.addMesh(new RoundedBoxGeometry(1.52 * W, 0.12, 0.18, 3, 0.035), carbon, [0, rearBottom + 0.02, -2.19 * L]);

    const lampY = rearTop - 0.055;
    const lampZ = rearZ - 0.012;
    const style = spec.lights.rear;
    if (style === 'bar') {
      this.addMesh(new RoundedBoxGeometry(1.36 * W, 0.045, 0.035, 3, 0.014), tail, [0, lampY, lampZ], this.visual, false);
      for (const side of [-1, 1]) {
        const rearLamp = this.addMesh(new RoundedBoxGeometry(0.24, 0.06, 0.025, 2, 0.012), tail, [side * 0.77 * W, lampY - 0.05, lampZ - 0.004], this.visual, false);
        rearLamp.rotation.z = side * -0.4;
      }
    } else if (style === 'thin') {
      for (const offset of [0, -0.1]) {
        this.addMesh(new RoundedBoxGeometry(1.5 * W, 0.026, 0.03, 2, 0.01), tail, [0, lampY + offset, lampZ], this.visual, false);
      }
      for (const side of [-1, 1]) {
        this.addMesh(new RoundedBoxGeometry(0.2 * W, 0.1, 0.03, 2, 0.01), tail, [side * 0.68 * W, lampY - 0.02, lampZ - 0.006], this.visual, false);
      }
    } else if (style === 'round') {
      for (const x of [-0.72, -0.48, 0.48, 0.72]) {
        const lamp = this.addMesh(new THREE.CylinderGeometry(0.07, 0.075, 0.035, 18), tail, [x * W, lampY, lampZ], this.visual, false);
        lamp.rotation.x = Math.PI / 2;
      }
      this.addMesh(new RoundedBoxGeometry(1.5 * W, 0.025, 0.03, 2, 0.01), black, [0, lampY - 0.11, lampZ]);
    } else if (style === 'quad') {
      for (const x of [-0.76, -0.5, 0.5, 0.76]) {
        this.addMesh(new RoundedBoxGeometry(0.18 * W, 0.07, 0.035, 2, 0.012), tail, [x * W, lampY, lampZ], this.visual, false);
      }
      this.addMesh(new RoundedBoxGeometry(1.4 * W, 0.02, 0.025, 2, 0.008), tail, [0, lampY - 0.12, lampZ + 0.002], this.visual, false);
    }

    const exhaust = spec.exhaust;
    const exhaustY = rearBottom - 0.005;
    if (exhaust === 'dual' || exhaust === 'quad') {
      const positions = exhaust === 'dual' ? [-0.5, 0.5] : [-0.62, -0.34, 0.34, 0.62];
      const radius = exhaust === 'dual' ? 0.075 : 0.062;
      for (const x of positions) {
        this.addMesh(new THREE.CylinderGeometry(radius, radius * 1.14, 0.2, 18, 1, true), chrome, [x * W, exhaustY, -2.31 * L]);
        this.addMesh(new THREE.CylinderGeometry(radius * 0.74, radius * 0.74, 0.205, 16, 1, true), black, [x * W, exhaustY, -2.315 * L]);
      }
      if (!this.isAI) {
        for (const x of positions.slice(0, 2)) {
          const flame = this.addMesh(
            new THREE.ConeGeometry(0.082, 0.9, 12, 1, true),
            new THREE.MeshBasicMaterial({ color: 0x5de9ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
            [x * W, exhaustY, -2.78 * L]
          );
          flame.rotation.x = -Math.PI / 2;
          flame.visible = false;
          this.nitroFlames.push(flame);
        }
      }
    } else if (exhaust === 'center') {
      for (const [offset, radius] of [[0.05, 0.07], [0.17, 0.055]]) {
        this.addMesh(new THREE.CylinderGeometry(radius, radius * 1.12, 0.22, 16, 1, true), chrome, [0, exhaustY + offset, -2.31 * L]);
        this.addMesh(new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, 0.225, 14, 1, true), black, [0, exhaustY + offset, -2.315 * L]);
      }
    }

    this.addMesh(new RoundedBoxGeometry(1.76 * W, 0.15, 0.18, 2, 0.025), carbon, [0, rearBottom + 0.02, -2.21 * L]);
    for (const x of [-0.67, -0.34, 0, 0.34, 0.67]) {
      const strake = this.addMesh(new THREE.BoxGeometry(0.026, 0.18, 0.46), carbonWeave, [x * W, rearBottom + 0.0, -2.08 * L]);
      strake.rotation.x = -0.14;
    }
    this.addMesh(new THREE.PlaneGeometry(0.64 * W, 0.17), vent, [0, rearTop * 0.66, -2.263 * L], this.visual, false).rotation.y = Math.PI;

    if (detail) {
      const plate = this.addMesh(new THREE.PlaneGeometry(0.44, 0.11), new THREE.MeshBasicMaterial({ map: makePlateTexture(this.spec.number) }), [0, rearTop * 0.55, -2.266 * L], this.visual, false);
      plate.rotation.y = Math.PI;
      const rearBadge = this.addMesh(new THREE.PlaneGeometry(0.34, 0.085), new THREE.MeshBasicMaterial({ map: makeBadgeTexture(this.spec.label), transparent: true, depthWrite: false }), [0, rearTop * 0.78, -2.264 * L], this.visual, false);
      rearBadge.rotation.y = Math.PI;
    }
  }

  buildWing(detail) {
    const { carbon, carbonWeave } = this.material;
    const spec = this.spec;
    const L = this.L;
    const W = this.W;
    const style = spec.wing.style;
    const scale = spec.wing.scale;
    const height = spec.wing.height;
    const wingZ = -1.95 * L;
    const deckY = this.topAt(-1.78 * L);

    if (style === 'swan' || style === 'swanBig') {
      const big = style === 'swanBig';
      const wingY = deckY + (big ? 0.42 : 0.36) + height;
      const wingWidth = (big ? 2.12 : 1.98) * W * scale;
      const wingDepth = big ? 0.46 : 0.38;
      for (const side of [-1, 1]) {
        const x = side * 0.55 * W * scale;
        if (big) {
          const support = this.addMesh(new RoundedBoxGeometry(0.045, wingY - deckY + 0.02, 0.24, 2, 0.014), carbon, [x, (wingY + deckY) * 0.5, wingZ + 0.14]);
          support.rotation.x = -0.12;
        } else {
          const supportCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(x, deckY + 0.06, wingZ + 0.24),
            new THREE.Vector3(x, deckY + 0.26 + height, wingZ + 0.14),
            new THREE.Vector3(x, wingY - 0.02, wingZ + 0.02)
          );
          const support = new THREE.Mesh(new THREE.TubeGeometry(supportCurve, 12, 0.028, 6, false), carbon);
          support.castShadow = true;
          this.visual.add(support);
        }
      }
      const wing = this.addMesh(new RoundedBoxGeometry(wingWidth, 0.062, wingDepth, 4, 0.02), carbon, [0, wingY, wingZ]);
      wing.rotation.x = -0.1;
      this.addMesh(new THREE.BoxGeometry(wingWidth * 0.95, 0.028, 0.026), carbonWeave, [0, wingY + 0.045, wingZ - 0.16]).rotation.x = -0.1;
      for (const side of [-1, 1]) {
        const endplate = this.addMesh(new RoundedBoxGeometry(0.035, big ? 0.24 : 0.19, wingDepth * 1.1, 3, 0.012), carbon, [side * wingWidth * 0.5, wingY, wingZ]);
        endplate.rotation.x = -0.1;
      }
      if (big) {
        const second = this.addMesh(new RoundedBoxGeometry(wingWidth * 0.9, 0.04, 0.22, 3, 0.014), carbonWeave, [0, wingY + 0.16, wingZ - 0.12]);
        second.rotation.x = -0.18;
      }
    } else if (style === 'twin') {
      const wingY = deckY + 0.4 + height;
      for (const side of [-1, 1]) {
        addBeam(this.visual, new THREE.Vector3(side * 0.52 * W, deckY + 0.08, wingZ + 0.2), new THREE.Vector3(side * 0.52 * W, wingY + 0.18, wingZ + 0.02), 0.04, 0.2, carbon);
      }
      for (const [offset, widthScale, depth, angle] of [[0, 1, 0.36, -0.12], [0.16, 0.84, 0.22, -0.24]]) {
        const wing = this.addMesh(new RoundedBoxGeometry(2.0 * W * scale * widthScale, 0.05, depth, 3, 0.016), carbon, [0, wingY + offset, wingZ - 0.02]);
        wing.rotation.x = angle;
      }
      for (const side of [-1, 1]) {
        this.addMesh(new RoundedBoxGeometry(0.03, 0.26, 0.5, 3, 0.012), carbon, [side * 0.99 * W * scale, wingY + 0.08, wingZ]);
      }
    } else if (style === 'duck') {
      const lip = this.addMesh(new RoundedBoxGeometry(1.7 * W * scale, 0.1, 0.24, 3, 0.03), carbon, [0, deckY + 0.03, -2.12 * L]);
      lip.rotation.x = -0.26;
      this.addMesh(new RoundedBoxGeometry(1.72 * W * scale, 0.02, 0.18, 2, 0.008), carbonWeave, [0, deckY + 0.08, -2.1 * L]).rotation.x = -0.26;
    } else if (style === 'formula') {
      const wingY = deckY + 0.56 + height;
      for (const side of [-1, 1]) {
        this.addMesh(new RoundedBoxGeometry(0.05, 0.5, 0.16, 2, 0.014), carbon, [side * 0.4 * W, deckY + 0.3, wingZ + 0.12]);
      }
      const main = this.addMesh(new RoundedBoxGeometry(1.9 * W * scale, 0.055, 0.5, 3, 0.018), carbon, [0, wingY, wingZ]);
      main.rotation.x = -0.18;
      const upper = this.addMesh(new RoundedBoxGeometry(1.6 * W * scale, 0.04, 0.3, 3, 0.014), carbonWeave, [0, wingY + 0.18, wingZ - 0.14]);
      upper.rotation.x = -0.28;
      for (const side of [-1, 1]) {
        this.addMesh(new RoundedBoxGeometry(0.04, 0.36, 0.55, 3, 0.012), carbon, [side * 0.96 * W * scale, wingY + 0.1, wingZ]);
      }
    }
  }

  buildWheels(detail) {
    const { carbon, chrome } = this.material;
    const spec = this.spec;
    const wheels = spec.wheels;
    const baseRadius = 0.43;
    const baseWidth = 0.31;
    const radiusFactor = this.wheelRadius / baseRadius;
    const widthFactor = wheels.width / baseWidth;
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.88, metalness: 0.02 });
    const rimMat = new THREE.MeshStandardMaterial({ color: wheels.rim, metalness: 0.94, roughness: 0.22 });
    const discMat = new THREE.MeshStandardMaterial({ color: 0x8b959b, metalness: 0.9, roughness: 0.34 });
    const caliperMat = new THREE.MeshStandardMaterial({ color: wheels.caliper, metalness: 0.45, roughness: 0.32 });
    const tireProfile = [
      [0.255, -0.145], [0.305, -0.155], [0.375, -0.146], [0.416, -0.112],
      [0.435, -0.06], [0.44, 0], [0.435, 0.06], [0.416, 0.112],
      [0.375, 0.146], [0.305, 0.155], [0.255, 0.145],
    ].map(([radius, width]) => new THREE.Vector2(radius * radiusFactor, width * widthFactor));
    const tireGeometry = new THREE.LatheGeometry(tireProfile, this.isAI ? 28 : 48);
    tireGeometry.rotateZ(Math.PI / 2);
    const discTexture = detail ? makeBrakeDiscTexture() : null;

    for (const z of [this.wheelZFront, this.wheelZRear]) {
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(side * this.wheelTrack, this.wheelRadius + 0.02, z);
        this.visual.add(pivot);
        const wheel = new THREE.Group();
        pivot.add(wheel);

        const tire = new THREE.Mesh(tireGeometry, tireMat);
        tire.castShadow = true;
        tire.receiveShadow = true;
        wheel.add(tire);

        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.29 * radiusFactor, 0.265 * radiusFactor, 0.27 * widthFactor, 32, 1, true), rimMat);
        barrel.rotation.z = Math.PI / 2;
        wheel.add(barrel);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(0.289 * radiusFactor, 0.019, 7, 40), chrome);
        lip.rotation.y = Math.PI / 2;
        lip.position.x = side * 0.14 * widthFactor;
        wheel.add(lip);
        if (detail) {
          const innerLip = new THREE.Mesh(new THREE.TorusGeometry(0.265 * radiusFactor, 0.012, 6, 36), chrome);
          innerLip.rotation.y = Math.PI / 2;
          innerLip.position.x = side * -0.13 * widthFactor;
          wheel.add(innerLip);
        }

        const spokeSides = detail || !wheels.dual ? [-1, 1] : [side];
        for (const outer of spokeSides) {
          for (let i = 0; i < wheels.spokes; i++) {
            for (const offset of wheels.dual ? [-0.065, 0.065] : [0]) {
              const angle = i / wheels.spokes * Math.PI * 2 + offset;
              const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.19 * radiusFactor, 0.052), this.material.darkMetal);
              spoke.position.set(outer * 0.148 * widthFactor, Math.cos(angle) * 0.135 * radiusFactor, Math.sin(angle) * 0.135 * radiusFactor);
              spoke.rotation.x = angle;
              wheel.add(spoke);
            }
          }
        }
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.072 * radiusFactor, 0.078 * radiusFactor, 0.31 * widthFactor, 20), carbon);
        hub.rotation.z = Math.PI / 2;
        wheel.add(hub);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.018, 20), chrome);
        cap.rotation.z = Math.PI / 2;
        cap.position.x = side * 0.168 * widthFactor;
        wheel.add(cap);

        const discFace = new THREE.Mesh(new THREE.CircleGeometry(0.215 * radiusFactor, 36), discTexture
          ? new THREE.MeshStandardMaterial({ map: discTexture, metalness: 0.86, roughness: 0.38, side: THREE.DoubleSide })
          : discMat);
        discFace.rotation.y = side * Math.PI / 2;
        discFace.position.x = side * 0.055 * widthFactor;
        wheel.add(discFace);

        const caliper = new THREE.Mesh(new RoundedBoxGeometry(0.065, 0.24 * radiusFactor, 0.13 * widthFactor, 3, 0.025), caliperMat);
        caliper.position.set(side * 0.055 * widthFactor, 0.02, -0.18 * radiusFactor);
        pivot.add(caliper);

        this.wheels.push(wheel);
        if (z > 0) this.frontWheelPivots.push(pivot);
      }
    }
  }

  buildArchLips() {
    if (this.spec.wheels.exposed) return;
    const { paint, black } = this.material;
    const radius = this.wheelRadius + 0.015;
    for (const z of [this.wheelZFront, this.wheelZRear]) {
      for (const side of [-1, 1]) {
        const x = side * (this.widthAt(z) - 0.015);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035, 7, 38, Math.PI), paint);
        lip.rotation.y = Math.PI / 2;
        lip.position.set(x, this.wheelRadius + 0.02, z);
        lip.castShadow = true;
        this.visual.add(lip);
        if (!this.isAI) {
          const inner = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.025, 0.055, 7, 32, Math.PI), black);
          inner.rotation.y = Math.PI / 2;
          inner.position.set(side * (x + side * -0.04), this.wheelRadius + 0.02, z);
          this.visual.add(inner);
        }
      }
    }
  }

  buildLivery(detail) {
    const spec = this.spec;
    const L = this.L;
    const W = this.W;
    const livery = spec.livery;
    const stripe = new THREE.MeshStandardMaterial({ color: this.accentColor, metalness: 0.55, roughness: 0.28, side: THREE.DoubleSide });

    if (livery.hood) {
      for (const x of [-0.16, 0.16]) {
        const ribbon = this.makeTopRibbon(2.12 * L, 0.72 * L, x * W, 0.13);
        const mesh = new THREE.Mesh(ribbon, stripe);
        mesh.receiveShadow = true;
        this.visual.add(mesh);
      }
    }
    if (livery.roof && spec.cabin.style !== 'roadster' && spec.cabin.style !== 'openwheel') {
      const roofTop = this.cabinSections
        ? Math.max(...this.cabinSections.map((section) => section.top))
        : this.topAt(-0.1 * L);
      this.addMesh(new RoundedBoxGeometry(0.34 * W, 0.012, 0.62 * L, 3, 0.008), stripe, [0, roofTop + 0.042, spec.cabin.shift * L - 0.2], this.visual, false);
    }
    if (livery.side) {
      for (const side of [-1, 1]) {
        const blade = this.addMesh(new RoundedBoxGeometry(0.025, 0.05, 1.5 * L, 2, 0.008), stripe, [side * (this.widthAt(0.1 * L) + 0.018), this.bottomAt(0.1 * L) + 0.1, 0.1 * L], this.visual, false);
        blade.rotation.z = side * 0.02;
      }
    }
    if (livery.number) {
      const numberMaterial = new THREE.MeshBasicMaterial({
        map: makeNumberTexture(spec.number, '#' + new THREE.Color(this.accentColor).getHexString(), spec.label),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
      for (const side of [-1, 1]) {
        const doorZ = -0.18 * L;
        const decal = this.addMesh(new THREE.PlaneGeometry(0.38, 0.38), numberMaterial, [side * (this.widthAt(doorZ) + 0.012), this.topAt(doorZ) - 0.22, doorZ], this.visual, false);
        decal.rotation.y = side * Math.PI / 2;
      }
    }
    if (spec.extras.includes('roofFin') && this.cabinSections) {
      const { carbon } = this.material;
      const roofSection = this.cabinSections.reduce((best, section) => (section.top > best.top ? section : best), this.cabinSections[0]);
      this.addMesh(new RoundedBoxGeometry(0.05, 0.2, 1.1 * L, 3, 0.015), carbon, [0, roofSection.top + 0.1, roofSection.z - 0.35 * L]);
    }
    if (spec.extras.includes('roofScoop') && this.cabinSections) {
      const { paint, black } = this.material;
      const roofTop = Math.max(...this.cabinSections.map((section) => section.top));
      const scoopZ = this.spec.cabin.shift * L - 0.35;
      this.addMesh(new RoundedBoxGeometry(0.42 * W, 0.13, 0.7, 4, 0.04), paint, [0, roofTop + 0.055, scoopZ]);
      this.addMesh(new RoundedBoxGeometry(0.3 * W, 0.04, 0.5, 3, 0.014), black, [0, roofTop + 0.125, scoopZ + 0.03], this.visual, false);
    }
  }

  makeTopRibbon(zStart, zEnd, xCenter, width) {
    const segments = 12;
    const positions = [];
    const indices = [];
    for (let i = 0; i <= segments; i++) {
      const z = zStart + (zEnd - zStart) * i / segments;
      const y = this.topAt(z) + 0.005;
      positions.push(xCenter - width * 0.5, y, z, xCenter + width * 0.5, y, z);
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  buildInterior() {
    const { black, carbon } = this.material;
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x16191c, roughness: 0.72, metalness: 0.08 });
    const stitchMat = new THREE.MeshStandardMaterial({ color: 0x6d1726, roughness: 0.65 });
    this.addMesh(new RoundedBoxGeometry(1.22, 0.08, 1.75, 3, 0.03), black, [0, 0.8, -0.36], this.visual, false);
    for (const side of [-1, 1]) {
      this.addMesh(new RoundedBoxGeometry(0.38, 0.14, 0.5, 4, 0.06), seatMat, [side * 0.32, 0.9, -0.25], this.visual, false);
      const back = this.addMesh(new RoundedBoxGeometry(0.38, 0.62, 0.16, 4, 0.055), seatMat, [side * 0.32, 1.08, -0.55], this.visual, false);
      back.rotation.x = -0.17;
      this.addMesh(new RoundedBoxGeometry(0.27, 0.17, 0.14, 3, 0.045), seatMat, [side * 0.32, 1.38, -0.61], this.visual, false);
      this.addMesh(new THREE.BoxGeometry(0.025, 0.5, 0.025), stitchMat, [side * 0.32, 1.12, -0.465], this.visual, false);
    }
    this.addMesh(new RoundedBoxGeometry(1.15, 0.12, 0.25, 3, 0.04), black, [0, 0.88, 0.29], this.visual, false);
    const steeringWheel = this.addMesh(new THREE.TorusGeometry(0.16, 0.023, 8, 28), black, [0.34, 0.96, 0.16], this.visual, false);
    steeringWheel.rotation.x = Math.PI / 2 - 0.32;
    this.addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), carbon, [0.34, 0.91, 0.23], this.visual, false).rotation.x = 1.2;
  }

  buildPlayerRig() {
    const W = this.W;
    for (const side of [-1, 1]) {
      const light = new THREE.SpotLight(0xb9efff, 148, 68, 0.34, 0.68, 1.35);
      light.position.set(side * 0.55 * W, 0.6, 2.12 * this.L);
      light.target.position.set(side * 0.45 * W, -0.65, 34);
      this.group.add(light, light.target);
    }
    this.boostLight = new THREE.PointLight(0x3de7ff, 0, 4.6, 2);
    this.boostLight.position.set(0, 0.35, -2.5 * this.L);
    this.group.add(this.boostLight);
    const underglow = new THREE.PointLight(0x1d9dc6, 5, 4.2, 2);
    underglow.position.set(0, 0.16, 0);
    this.group.add(underglow);
  }

  buildShadow() {
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(0,0,0,.8)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.95 * this.W, 5.5 * this.L),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.032;
    this.group.add(shadow);
  }

  update({ speed, steering, driftAngle, braking, boosting, time }) {
    const spin = speed * 0.016 / this.wheelRadius;
    for (const wheel of this.wheels) wheel.rotation.x -= spin;
    for (const pivot of this.frontWheelPivots) pivot.rotation.y = -steering * 0.4;
    this.visual.rotation.z = lerp(this.visual.rotation.z, -driftAngle * 0.16 - steering * Math.min(Math.abs(speed) / 250, 1) * 0.025, 0.12);
    this.visual.rotation.x = lerp(this.visual.rotation.x, braking ? -0.018 : boosting ? 0.016 : 0, 0.08);
    this.visual.position.y = Math.sin(time * 18) * Math.min(Math.abs(speed) / 250, 1) * 0.004;
    if (this.tailMaterial) this.tailMaterial.emissiveIntensity = braking ? 7 : 2;
    for (const flame of this.nitroFlames) {
      flame.visible = boosting;
      if (boosting) {
        flame.scale.set(0.72 + Math.random() * 0.5, 0.7 + Math.random() * 0.9, 0.72 + Math.random() * 0.5);
        flame.material.opacity = 0.55 + Math.random() * 0.4;
      }
    }
    if (this.boostLight) this.boostLight.intensity = boosting ? 3.5 + Math.random() * 2 : 0;
  }

  wheelWorldPosition(index, target = new THREE.Vector3()) {
    const position = this.wheelLocalPositions[index];
    target.set(position[0], position[1], position[2]);
    return this.group.localToWorld(target);
  }
}
