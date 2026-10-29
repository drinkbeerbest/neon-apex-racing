import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const UP = new THREE.Vector3(0, 1, 0);
const WHEEL_LOCAL_POSITIONS = [
  [-0.88, 0.28, -1.3], [0.88, 0.28, -1.3],
  [-0.88, 0.28, 1.36], [0.88, 0.28, 1.36],
];

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

function makePlateTexture() {
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
  ctx.fillText('N · APEX', 276, 69);
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

function makeBadgeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = '#dce1e4';
  ctx.font = '800 78px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A P E X', 256, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
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

export class SportsCar {
  constructor(scene) {
    this.group = new THREE.Group();
    this.visual = new THREE.Group();
    this.group.add(this.visual);
    scene.add(this.group);
    this.wheels = [];
    this.frontWheelPivots = [];
    this.nitroFlames = [];
    this.wheelRadius = 0.43;
    this.build();
  }

  addMesh(geometry, material, position, parent = this.visual, shadow = true) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    parent.add(mesh);
    return mesh;
  }

  build() {
    const paint = new THREE.MeshPhysicalMaterial({
      color: 0xa60b27,
      metalness: 0.72,
      roughness: 0.17,
      clearcoat: 1,
      clearcoatRoughness: 0.09,
      envMapIntensity: 1.55,
      emissive: 0x180005,
      emissiveIntensity: 0.2,
    });
    const paintDark = paint.clone();
    paintDark.color.setHex(0x3b050e);
    paintDark.metalness = 0.55;
    const carbon = new THREE.MeshPhysicalMaterial({
      color: 0x090c10,
      metalness: 0.74,
      roughness: 0.25,
      clearcoat: 0.75,
      clearcoatRoughness: 0.23,
    });
    const carbonWeave = new THREE.MeshStandardMaterial({
      color: 0x12171c,
      metalness: 0.65,
      roughness: 0.4,
    });
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

    const bodySections = [
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
    const body = this.addMesh(createLoftGeometry(bodySections, 5), paint, [0, 0, 0]);
    body.name = 'body-shell';

    const cabinSections = [
      { z: 0.62, width: 0.72, bottom: 0.79, shoulder: 0.82, top: 0.86 },
      { z: 0.36, width: 0.71, bottom: 0.79, shoulder: 0.94, top: 1.08 },
      { z: 0.08, width: 0.64, bottom: 0.79, shoulder: 1.14, top: 1.29 },
      { z: -0.28, width: 0.62, bottom: 0.79, shoulder: 1.2, top: 1.33 },
      { z: -0.8, width: 0.63, bottom: 0.79, shoulder: 1.18, top: 1.3 },
      { z: -1.13, width: 0.68, bottom: 0.785, shoulder: 1.01, top: 1.07 },
      { z: -1.42, width: 0.76, bottom: 0.78, shoulder: 0.84, top: 0.87 },
    ];
    const canopy = this.addMesh(createLoftGeometry(cabinSections, 5), glass, [0, 0, 0], this.visual, false);
    canopy.name = 'glass-canopy';
    canopy.renderOrder = 2;

    const roof = this.addMesh(new RoundedBoxGeometry(0.98, 0.045, 0.72, 4, 0.018), paint, [0, 1.326, -0.49]);
    roof.rotation.x = 0.035;
    const roofSpine = this.addMesh(new RoundedBoxGeometry(0.065, 0.016, 0.6, 3, 0.007), carbonWeave, [0, 1.352, -0.5]);
    roofSpine.rotation.x = 0.035;
    for (const side of [-1, 1]) {
      addBeam(this.visual, new THREE.Vector3(side * 0.69, 0.86, 0.57), new THREE.Vector3(side * 0.55, 1.31, -0.08), 0.05, 0.035, carbon);
      addBeam(this.visual, new THREE.Vector3(side * 0.61, 1.28, -0.9), new THREE.Vector3(side * 0.75, 0.86, -1.4), 0.055, 0.045, carbon);
      addBeam(this.visual, new THREE.Vector3(side * 0.64, 1.16, -0.66), new THREE.Vector3(side * 0.61, 1.28, -0.68), 0.035, 0.03, carbon);
      addBeam(this.visual, new THREE.Vector3(side * 0.71, 0.83, 0.61), new THREE.Vector3(side * 0.76, 0.84, -1.46), 0.018, 0.018, black);
    }

    // Low nose splitter, intakes and canards.
    this.addMesh(new RoundedBoxGeometry(1.86, 0.052, 0.43, 3, 0.022), carbon, [0, 0.205, 2.08]);
    this.addMesh(new RoundedBoxGeometry(1.68, 0.16, 0.12, 2, 0.03), carbonWeave, [0, 0.285, 2.22]);
    const centerIntake = this.addMesh(new THREE.PlaneGeometry(0.76, 0.18), ventMaterial, [0, 0.445, 2.286], this.visual, false);
    centerIntake.rotation.x = -0.08;
    for (const side of [-1, 1]) {
      const sideIntake = this.addMesh(new THREE.PlaneGeometry(0.3, 0.17), ventMaterial, [side * 0.69, 0.435, 2.19], this.visual, false);
      sideIntake.rotation.y = side * 0.34;
      sideIntake.rotation.x = -0.08;
      const canard = this.addMesh(new RoundedBoxGeometry(0.32, 0.024, 0.2, 2, 0.008), carbon, [side * 0.88, 0.3, 1.92]);
      canard.rotation.z = side * 0.09;
      canard.rotation.y = side * 0.08;
      const divePlane = this.addMesh(new RoundedBoxGeometry(0.18, 0.018, 0.26, 2, 0.007), carbon, [side * 0.92, 0.34, 1.83]);
      divePlane.rotation.z = side * 0.11;
    }
    this.addMesh(new RoundedBoxGeometry(1.52, 0.025, 0.17, 2, 0.009), darkMetal, [0, 0.29, 2.29]);

    // Hood vents and the center crease.
    for (const side of [-1, 1]) {
      const recess = this.addMesh(new RoundedBoxGeometry(0.28, 0.014, 0.4, 2, 0.008), black, [side * 0.39, 0.799, 1.23]);
      recess.rotation.x = 0.07;
      for (let i = 0; i < 4; i++) {
        const louver = this.addMesh(new THREE.BoxGeometry(0.245, 0.01, 0.035), carbonWeave, [side * 0.39, 0.811, 1.08 + i * 0.09]);
        louver.rotation.x = 0.14;
      }
    }
    const seamMaterial = new THREE.LineBasicMaterial({ color: 0x2b3338, transparent: true, opacity: 0.75 });
    for (const side of [-1, 1]) {
      const seamPoints = [
        new THREE.Vector3(side * 0.045, 0.858, 2.15),
        new THREE.Vector3(side * 0.055, 0.88, 1.55),
        new THREE.Vector3(side * 0.075, 0.844, 0.88),
      ];
      const seam = new THREE.Line(new THREE.BufferGeometry().setFromPoints(seamPoints), seamMaterial);
      this.visual.add(seam);
    }

    // Sculpted doors, side skirts, mirrors and intakes.
    for (const side of [-1, 1]) {
      const sideSkirt = this.addMesh(new RoundedBoxGeometry(0.075, 0.085, 1.72, 3, 0.025), carbon, [side * 1.0, 0.235, -0.03]);
      sideSkirt.rotation.z = side * -0.03;
      const fenderVent = this.addMesh(new THREE.PlaneGeometry(0.29, 0.105), ventMaterial, [side * 1.004, 0.6, 0.96], this.visual, false);
      fenderVent.rotation.y = side * Math.PI / 2;
      const ventFin = this.addMesh(new RoundedBoxGeometry(0.03, 0.025, 0.31, 2, 0.01), chrome, [side * 1.018, 0.585, 0.96]);
      ventFin.rotation.z = side * -0.1;
      const sideIntake = this.addMesh(new THREE.PlaneGeometry(0.54, 0.16), ventMaterial, [side * 1.004, 0.62, -0.44], this.visual, false);
      sideIntake.rotation.y = side * Math.PI / 2;
      const intakeBlade = this.addMesh(new RoundedBoxGeometry(0.035, 0.035, 0.56, 2, 0.012), paint, [side * 1.022, 0.7, -0.43]);
      intakeBlade.rotation.z = side * -0.15;
      const doorHandle = this.addMesh(new RoundedBoxGeometry(0.025, 0.032, 0.17, 2, 0.012), chrome, [side * 0.993, 0.705, -0.04]);
      const doorSeamPoints = [
        new THREE.Vector3(side * 0.998, 0.81, 0.5),
        new THREE.Vector3(side * 1.0, 0.57, 0.18),
        new THREE.Vector3(side * 0.994, 0.3, -0.24),
      ];
      const doorSeam = new THREE.Line(new THREE.BufferGeometry().setFromPoints(doorSeamPoints), seamMaterial);
      this.visual.add(doorSeam);
      const mirrorArm = addBeam(this.visual,
        new THREE.Vector3(side * 0.84, 0.79, 0.44),
        new THREE.Vector3(side * 1.06, 0.89, 0.39), 0.035, 0.026, carbon);
      mirrorArm.castShadow = true;
      const mirror = this.addMesh(new RoundedBoxGeometry(0.28, 0.12, 0.22, 4, 0.048), paint, [side * 1.14, 0.92, 0.37]);
      mirror.rotation.y = side * 0.12;
      mirror.rotation.z = side * -0.08;
      const mirrorGlass = this.addMesh(new THREE.PlaneGeometry(0.19, 0.074), glass, [side * 1.287, 0.925, 0.385], this.visual, false);
      mirrorGlass.rotation.y = side * Math.PI / 2;
      const sideMarker = this.addMesh(new THREE.BoxGeometry(0.012, 0.025, 0.1), new THREE.MeshBasicMaterial({ color: 0xffa35a, toneMapped: false }), [side * 1.007, 0.57, 1.04], this.visual, false);
    }

    // Rounded rear fascia, full-width lamps and diffuser.
    this.addMesh(new RoundedBoxGeometry(1.76, 0.38, 0.25, 4, 0.075), paint, [0, 0.5, -2.12]);
    this.addMesh(new RoundedBoxGeometry(1.52, 0.12, 0.18, 3, 0.035), carbon, [0, 0.315, -2.19]);
    const tailMaterial = new THREE.MeshStandardMaterial({
      color: 0xff174b,
      emissive: 0xff0637,
      emissiveIntensity: 2,
      roughness: 0.3,
      metalness: 0.15,
      toneMapped: false,
    });
    this.tailMaterial = tailMaterial;
    this.addMesh(new RoundedBoxGeometry(1.36, 0.045, 0.035, 3, 0.014), tailMaterial, [0, 0.69, -2.258], this.visual, false);
    for (const side of [-1, 1]) {
      const tailShape = new THREE.Shape();
      tailShape.moveTo(side * 0.73, 0.03);
      tailShape.lineTo(side * 0.87, 0.03);
      tailShape.lineTo(side * 0.87, -0.08);
      tailShape.lineTo(side * 0.66, -0.08);
      tailShape.closePath();
      const tailGeometry = new THREE.ShapeGeometry(tailShape);
      const tail = new THREE.Mesh(tailGeometry, tailMaterial);
      tail.position.set(0, 0.72, -2.261);
      tail.rotation.y = Math.PI;
      this.visual.add(tail);
      const rearLamp = this.addMesh(new RoundedBoxGeometry(0.24, 0.06, 0.025, 2, 0.012), tailMaterial, [side * 0.77, 0.64, -2.262], this.visual, false);
      rearLamp.rotation.z = side * -0.4;
      const exhaust = this.addMesh(new THREE.CylinderGeometry(0.075, 0.086, 0.2, 18, 1, true), chrome, [side * 0.5, 0.335, -2.31]);
      exhaust.rotation.x = Math.PI / 2;
      const exhaustInner = this.addMesh(new THREE.CylinderGeometry(0.056, 0.056, 0.205, 16, 1, true), black, [side * 0.5, 0.335, -2.315]);
      exhaustInner.rotation.x = Math.PI / 2;
      const flame = this.addMesh(
        new THREE.ConeGeometry(0.082, 0.9, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x5de9ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
        [side * 0.5, 0.335, -2.78]
      );
      flame.rotation.x = -Math.PI / 2;
      flame.visible = false;
      this.nitroFlames.push(flame);
    }
    this.addMesh(new RoundedBoxGeometry(1.76, 0.15, 0.18, 2, 0.025), carbon, [0, 0.27, -2.21]);
    for (const x of [-0.67, -0.34, 0, 0.34, 0.67]) {
      const strake = this.addMesh(new THREE.BoxGeometry(0.026, 0.18, 0.46), carbonWeave, [x, 0.22, -2.08]);
      strake.rotation.x = -0.14;
    }
    const rearMesh = this.addMesh(new THREE.PlaneGeometry(0.64, 0.17), ventMaterial, [0, 0.51, -2.263], this.visual, false);
    rearMesh.rotation.y = Math.PI;
    const plate = this.addMesh(new THREE.PlaneGeometry(0.44, 0.11), new THREE.MeshBasicMaterial({ map: makePlateTexture() }), [0, 0.425, -2.266], this.visual, false);
    plate.rotation.y = Math.PI;
    const rearBadge = this.addMesh(new THREE.PlaneGeometry(0.34, 0.085), new THREE.MeshBasicMaterial({ map: makeBadgeTexture(), transparent: true, depthWrite: false }), [0, 0.585, -2.264], this.visual, false);
    rearBadge.rotation.y = Math.PI;

    // Swan-neck rear wing.
    for (const side of [-1, 1]) {
      const supportCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(side * 0.55, 0.82, -1.72),
        new THREE.Vector3(side * 0.55, 1.02, -1.82),
        new THREE.Vector3(side * 0.55, 1.15, -1.93)
      );
      const support = new THREE.Mesh(new THREE.TubeGeometry(supportCurve, 12, 0.028, 6, false), carbon);
      support.castShadow = true;
      this.visual.add(support);
    }
    const wing = this.addMesh(new RoundedBoxGeometry(1.98, 0.062, 0.38, 4, 0.02), carbon, [0, 1.16, -1.94]);
    wing.rotation.x = -0.1;
    this.addMesh(new THREE.BoxGeometry(1.88, 0.028, 0.026), carbonWeave, [0, 1.205, -2.11]).rotation.x = -0.1;
    for (const side of [-1, 1]) {
      const endplate = this.addMesh(new RoundedBoxGeometry(0.035, 0.19, 0.42, 3, 0.012), carbon, [side * 0.995, 1.15, -1.94]);
      endplate.rotation.x = -0.1;
    }

    // Headlights with layered lenses and daylight strips.
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xbcefff,
      emissive: 0x9eeaff,
      emissiveIntensity: 1.7,
      roughness: 0.2,
      metalness: 0.15,
      toneMapped: false,
    });
    const headlightGlass = new THREE.MeshPhysicalMaterial({
      color: 0x1d3542,
      metalness: 0.55,
      roughness: 0.04,
      transmission: 0.22,
      transparent: true,
      opacity: 0.9,
      clearcoat: 1,
    });
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
      headlightGroup.position.set(side * 0.56, 0.59, 2.125);
      headlightGroup.scale.x = side;
      this.visual.add(headlightGroup);
      const lens = new THREE.Mesh(lensGeometry, headlightGlass);
      lens.castShadow = false;
      headlightGroup.add(lens);
      for (const x of [-0.13, 0.055]) {
        const projector = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.07, 20), headlightMat);
        projector.rotation.x = Math.PI / 2;
        projector.position.set(x, 0, 0.035);
        headlightGroup.add(projector);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.057, 0.007, 6, 24), chrome);
        ring.position.set(x, 0, 0.072);
        headlightGroup.add(ring);
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
    const badge = this.addMesh(new THREE.CylinderGeometry(0.055, 0.055, 0.015, 3), chrome, [0, 0.49, 2.292]);
    badge.rotation.x = Math.PI / 2;
    badge.rotation.z = Math.PI / 2;

    // Cabin interior, visible through the dark glass.
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

    this.buildWheels(paint, carbon, darkMetal, black, chrome);
    this.buildArchLips(paint, black);

    for (const side of [-1, 1]) {
      const light = new THREE.SpotLight(0xb9efff, 148, 68, 0.34, 0.68, 1.35);
      light.position.set(side * 0.55, 0.6, 2.12);
      light.target.position.set(side * 0.45, -0.65, 34);
      this.group.add(light, light.target);
    }
    this.boostLight = new THREE.PointLight(0x3de7ff, 0, 4.6, 2);
    this.boostLight.position.set(0, 0.35, -2.5);
    this.group.add(this.boostLight);
    const underglow = new THREE.PointLight(0x1d9dc6, 5, 4.2, 2);
    underglow.position.set(0, 0.16, 0);
    this.group.add(underglow);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(0,0,0,.8)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.95, 5.5),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.032;
    this.group.add(shadow);
  }

  buildArchLips(paint, black) {
    for (const z of [-1.3, 1.36]) {
      for (const side of [-1, 1]) {
        const radius = 0.445;
        const lip = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035, 7, 38, Math.PI), paint);
        lip.rotation.y = Math.PI / 2;
        lip.position.set(side * 1.025, 0.45, z);
        lip.castShadow = true;
        this.visual.add(lip);
        const inner = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.025, 0.055, 7, 32, Math.PI), black);
        inner.rotation.y = Math.PI / 2;
        inner.position.set(side * 0.985, 0.45, z);
        this.visual.add(inner);
      }
    }
  }

  buildWheels(paint, carbon, darkMetal, black, chrome) {
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.88, metalness: 0.02 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x343d45, metalness: 0.94, roughness: 0.22 });
    const discMat = new THREE.MeshStandardMaterial({ color: 0x8b959b, metalness: 0.9, roughness: 0.34 });
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xd01538, metalness: 0.45, roughness: 0.32 });
    const tireProfile = [
      [0.255, -0.145], [0.305, -0.155], [0.375, -0.146], [0.416, -0.112],
      [0.435, -0.06], [0.44, 0], [0.435, 0.06], [0.416, 0.112],
      [0.375, 0.146], [0.305, 0.155], [0.255, 0.145],
    ].map(([radius, width]) => new THREE.Vector2(radius, width));
    const tireGeometry = new THREE.LatheGeometry(tireProfile, 48);
    tireGeometry.rotateZ(Math.PI / 2);
    const discTexture = makeBrakeDiscTexture();

    for (const z of [-1.3, 1.36]) {
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.88, 0.45, z);
        this.visual.add(pivot);
        const wheel = new THREE.Group();
        pivot.add(wheel);

        const tire = new THREE.Mesh(tireGeometry, tireMat);
        tire.castShadow = true;
        tire.receiveShadow = true;
        wheel.add(tire);

        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.265, 0.27, 32, 1, true), rimMat);
        barrel.rotation.z = Math.PI / 2;
        wheel.add(barrel);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(0.289, 0.019, 7, 40), chrome);
        lip.rotation.y = Math.PI / 2;
        lip.position.x = side * 0.14;
        wheel.add(lip);
        const innerLip = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.012, 6, 36), chrome);
        innerLip.rotation.y = Math.PI / 2;
        innerLip.position.x = side * -0.13;
        wheel.add(innerLip);

        for (const outer of [-1, 1]) {
          for (let i = 0; i < 5; i++) {
            for (const offset of [-0.065, 0.065]) {
              const angle = i / 5 * Math.PI * 2 + offset;
              const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.19, 0.052), darkMetal);
              spoke.position.set(outer * 0.148, Math.cos(angle) * 0.135, Math.sin(angle) * 0.135);
              spoke.rotation.x = angle;
              wheel.add(spoke);
            }
          }
        }
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.078, 0.31, 20), carbon);
        hub.rotation.z = Math.PI / 2;
        wheel.add(hub);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.018, 20), chrome);
        cap.rotation.z = Math.PI / 2;
        cap.position.x = side * 0.168;
        wheel.add(cap);

        const discFace = new THREE.Mesh(new THREE.CircleGeometry(0.215, 36), new THREE.MeshStandardMaterial({
          map: discTexture, metalness: 0.86, roughness: 0.38, side: THREE.DoubleSide,
        }));
        discFace.rotation.y = side * Math.PI / 2;
        discFace.position.x = side * 0.055;
        wheel.add(discFace);

        const caliper = new THREE.Mesh(new RoundedBoxGeometry(0.065, 0.24, 0.13, 3, 0.025), caliperMat);
        caliper.position.set(side * 0.055, 0.02, -0.18);
        pivot.add(caliper);

        this.wheels.push(wheel);
        if (z > 0) this.frontWheelPivots.push(pivot);
      }
    }
  }

  update({ speed, steering, driftAngle, braking, boosting, time }) {
    const spin = speed * 0.016 / this.wheelRadius;
    for (const wheel of this.wheels) wheel.rotation.x -= spin;
    for (const pivot of this.frontWheelPivots) pivot.rotation.y = -steering * 0.4;
    this.visual.rotation.z = THREE.MathUtils.lerp(this.visual.rotation.z, -driftAngle * 0.16 - steering * Math.min(Math.abs(speed) / 250, 1) * 0.025, 0.12);
    this.visual.rotation.x = THREE.MathUtils.lerp(this.visual.rotation.x, braking ? -0.018 : boosting ? 0.016 : 0, 0.08);
    this.visual.position.y = Math.sin(time * 18) * Math.min(Math.abs(speed) / 250, 1) * 0.004;
    if (this.tailMaterial) this.tailMaterial.emissiveIntensity = braking ? 7 : 2;
    for (const flame of this.nitroFlames) {
      flame.visible = boosting;
      if (boosting) {
        flame.scale.set(0.72 + Math.random() * 0.5, 0.7 + Math.random() * 0.9, 0.72 + Math.random() * 0.5);
        flame.material.opacity = 0.55 + Math.random() * 0.4;
      }
    }
    this.boostLight.intensity = boosting ? 3.5 + Math.random() * 2 : 0;
  }

  wheelWorldPosition(index, target = new THREE.Vector3()) {
    const position = WHEEL_LOCAL_POSITIONS[index];
    target.set(position[0], position[1], position[2]);
    return this.group.localToWorld(target);
  }
}
