import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function createLoftGeometry(sections) {
  const positions = [];
  const indices = [];
  for (const s of sections) {
    const { z, width: w, bottom: b, shoulder: sh, top: t } = s;
    const ring = [
      [-w * 0.72, b], [-w, b + 0.14], [-w, sh], [-w * 0.78, t],
      [w * 0.78, t], [w, sh], [w, b + 0.14], [w * 0.72, b],
    ];
    for (const [x, y] of ring) positions.push(x, y, z);
  }
  for (let s = 0; s < sections.length - 1; s++) {
    for (let j = 0; j < 8; j++) {
      const a = s * 8 + j;
      const b = s * 8 + (j + 1) % 8;
      const c = (s + 1) * 8 + j;
      const d = (s + 1) * 8 + (j + 1) % 8;
      indices.push(a, c, b, b, c, d);
    }
  }
  for (let j = 1; j < 7; j++) indices.push(0, j + 1, j);
  const end = (sections.length - 1) * 8;
  for (let j = 1; j < 7; j++) indices.push(end, end + j, end + j + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makePlateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dbe7ea'; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#101820'; ctx.font = 'bold 34px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('N · APEX', 128, 35);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class SportsCar {
  constructor(scene) {
    this.group = new THREE.Group();
    this.visual = new THREE.Group();
    this.group.add(this.visual);
    scene.add(this.group);
    this.wheels = [];
    this.frontWheelPivots = [];
    this.brakeLights = [];
    this.nitroFlames = [];
    this.build();
  }

  addMesh(geometry, material, position, parent = this.visual) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  build() {
    const paint = new THREE.MeshPhysicalMaterial({
      color: 0xbc092f,
      metalness: 0.58,
      roughness: 0.23,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
      envMapIntensity: 1.2,
    });
    const paintDark = paint.clone();
    paintDark.color.setHex(0x570817);
    const carbon = new THREE.MeshStandardMaterial({ color: 0x090c10, metalness: 0.7, roughness: 0.28 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x07111b,
      metalness: 0.18,
      roughness: 0.12,
      transmission: 0.04,
      transparent: true,
      opacity: 0.96,
      clearcoat: 1,
      envMapIntensity: 0.8,
    });
    const chrome = new THREE.MeshStandardMaterial({ color: 0x9eabb6, metalness: 1, roughness: 0.18 });
    const black = new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.72, metalness: 0.12 });

    const bodySections = [
      { z: 2.28, width: 0.75, bottom: 0.3, shoulder: 0.5, top: 0.59 },
      { z: 1.82, width: 0.96, bottom: 0.24, shoulder: 0.67, top: 0.73 },
      { z: 0.82, width: 0.99, bottom: 0.23, shoulder: 0.73, top: 0.77 },
      { z: -0.92, width: 1.0, bottom: 0.24, shoulder: 0.75, top: 0.8 },
      { z: -1.88, width: 0.94, bottom: 0.28, shoulder: 0.7, top: 0.76 },
      { z: -2.18, width: 0.83, bottom: 0.35, shoulder: 0.61, top: 0.68 },
    ];
    this.addMesh(createLoftGeometry(bodySections), paint, [0, 0, 0]);

    const cabinSections = [
      { z: 0.72, width: 0.76, bottom: 0.74, shoulder: 0.79, top: 0.82 },
      { z: 0.27, width: 0.67, bottom: 0.75, shoulder: 1.15, top: 1.31 },
      { z: -0.78, width: 0.65, bottom: 0.76, shoulder: 1.18, top: 1.34 },
      { z: -1.42, width: 0.79, bottom: 0.75, shoulder: 0.83, top: 0.85 },
    ];
    this.addMesh(createLoftGeometry(cabinSections), glass, [0, 0, 0]);
    const roof = this.addMesh(new RoundedBoxGeometry(1.27, 0.075, 1.13, 3, 0.04), paintDark, [0, 1.325, -0.3]);
    roof.rotation.x = -0.015;
    for (const x of [-0.7, 0.7]) {
      const pillar = this.addMesh(new THREE.BoxGeometry(0.065, 0.58, 0.08), carbon, [x, 1.03, 0.32]);
      pillar.rotation.x = -0.65;
      const rearPillar = this.addMesh(new THREE.BoxGeometry(0.08, 0.5, 0.12), paintDark, [x * 1.02, 1.02, -1.03]);
      rearPillar.rotation.x = 0.65;
    }

    const hood = this.addMesh(new RoundedBoxGeometry(1.35, 0.035, 1.15, 2, 0.015), paint, [0, 0.765, 1.24]);
    hood.rotation.x = 0.035;
    for (const x of [-0.34, 0.34]) {
      const vent = this.addMesh(new THREE.BoxGeometry(0.22, 0.022, 0.46), carbon, [x, 0.794, 1.13]);
      vent.rotation.x = 0.035;
    }
    const frontSplitter = this.addMesh(new RoundedBoxGeometry(1.73, 0.09, 0.42, 2, 0.035), carbon, [0, 0.27, 2.06]);
    frontSplitter.rotation.x = -0.05;
    this.addMesh(new RoundedBoxGeometry(1.95, 0.1, 3.7, 2, 0.035), carbon, [0, 0.26, -0.02]);
    const rearDiffuser = this.addMesh(new RoundedBoxGeometry(1.72, 0.18, 0.37, 2, 0.025), carbon, [0, 0.34, -2.06]);
    for (const x of [-0.62, -0.31, 0, 0.31, 0.62]) {
      this.addMesh(new THREE.BoxGeometry(0.035, 0.17, 0.5), carbon, [x, 0.26, -2.0]);
    }

    const grille = this.addMesh(new RoundedBoxGeometry(0.93, 0.25, 0.055, 2, 0.025), black, [0, 0.43, 2.255]);
    for (let y = 0.35; y < 0.55; y += 0.05) this.addMesh(new THREE.BoxGeometry(0.86, 0.012, 0.02), chrome, [0, y, 2.289]);

    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xc5f6ff, emissive: 0xa5efff, emissiveIntensity: 3.2, toneMapped: false });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff164f, emissive: 0xff0738, emissiveIntensity: 4, toneMapped: false });
    for (const side of [-1, 1]) {
      const headlight = this.addMesh(new RoundedBoxGeometry(0.48, 0.105, 0.07, 3, 0.035), headlightMat, [side * 0.57, 0.62, 2.13]);
      headlight.rotation.y = side * -0.18;
      const drl = this.addMesh(new THREE.BoxGeometry(0.38, 0.025, 0.075), new THREE.MeshBasicMaterial({ color: 0xc5faff, toneMapped: false }), [side * 0.58, 0.59, 2.17]);
      drl.rotation.y = side * -0.18;
      const tail = this.addMesh(new RoundedBoxGeometry(0.55, 0.085, 0.06, 3, 0.03), tailMat.clone(), [side * 0.53, 0.62, -2.145]);
      tail.rotation.y = side * 0.12;
      this.brakeLights.push(tail);
      const mirrorStalk = this.addMesh(new THREE.BoxGeometry(0.23, 0.035, 0.04), carbon, [side * 0.9, 0.93, 0.33]);
      mirrorStalk.rotation.z = side * -0.15;
      const mirror = this.addMesh(new RoundedBoxGeometry(0.28, 0.13, 0.2, 3, 0.045), paint, [side * 1.03, 0.98, 0.31]);
      mirror.rotation.y = side * 0.15;
      const exhaust = this.addMesh(new THREE.CylinderGeometry(0.085, 0.085, 0.22, 16, 1, true), chrome, [side * 0.55, 0.34, -2.23]);
      exhaust.rotation.x = Math.PI / 2;
      const flame = this.addMesh(
        new THREE.ConeGeometry(0.09, 0.85, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x54dfff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
        [side * 0.55, 0.34, -2.68]
      );
      flame.rotation.x = -Math.PI / 2;
      flame.visible = false;
      this.nitroFlames.push(flame);
    }
    const plate = this.addMesh(new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshBasicMaterial({ map: makePlateTexture() }), [0, 0.45, -2.19]);
    plate.rotation.y = Math.PI;

    for (const x of [-0.68, 0.68]) this.addMesh(new THREE.BoxGeometry(0.075, 0.38, 0.1), carbon, [x, 0.93, -1.78]);
    const wing = this.addMesh(new RoundedBoxGeometry(2.03, 0.09, 0.42, 2, 0.035), carbon, [0, 1.12, -1.83]);
    wing.rotation.x = -0.1;
    for (const x of [-1.0, 1.0]) this.addMesh(new THREE.BoxGeometry(0.045, 0.24, 0.44), carbon, [x, 1.15, -1.83]);

    this.buildWheels(chrome, black, carbon);

    for (const side of [-1, 1]) {
      const light = new THREE.SpotLight(0xb9efff, 135, 62, 0.34, 0.65, 1.4);
      light.position.set(side * 0.56, 0.64, 2.08);
      light.target.position.set(side * 0.45, -0.6, 32);
      this.group.add(light, light.target);
    }
    const underglow = new THREE.PointLight(0x18a8d4, 8, 4.5, 2);
    underglow.position.set(0, 0.18, 0);
    this.group.add(underglow);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(0,0,0,.75)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 5.4),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.035;
    this.group.add(shadow);
  }

  buildWheels(chrome, black, carbon) {
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.82, metalness: 0.05 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x3c4650, roughness: 0.2, metalness: 0.95 });
    const brakeMat = new THREE.MeshStandardMaterial({ color: 0x747c80, roughness: 0.45, metalness: 0.9 });
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xd31335, roughness: 0.35, metalness: 0.55 });
    for (const z of [-1.35, 1.35]) {
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.96, 0.46, z);
        this.visual.add(pivot);
        const wheel = new THREE.Group();
        pivot.add(wheel);
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.325, 0.11, 12, 32), tireMat);
        tire.rotation.y = Math.PI / 2;
        tire.castShadow = true;
        wheel.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.28, 24), rimMat);
        rim.rotation.z = Math.PI / 2;
        wheel.add(rim);
        const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.295, 24), brakeMat);
        brake.rotation.z = Math.PI / 2;
        wheel.add(brake);
        for (const outer of [-1, 1]) {
          for (let i = 0; i < 7; i++) {
            const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.042, 0.47), chrome);
            spoke.position.x = outer * 0.153;
            spoke.rotation.x = i / 7 * Math.PI * 2;
            wheel.add(spoke);
          }
        }
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.33, 16), carbon);
        hub.rotation.z = Math.PI / 2;
        wheel.add(hub);
        const caliper = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.12, 0.09, 2, 0.02), caliperMat);
        caliper.position.set(0, 0.02, -0.15);
        wheel.add(caliper);
        this.wheels.push(wheel);
        if (z > 0) this.frontWheelPivots.push(pivot);
      }
    }
  }

  update({ speed, steering, driftAngle, braking, boosting, time }) {
    const spin = speed * 0.016 / 0.43;
    for (const wheel of this.wheels) wheel.rotation.x -= spin;
    for (const pivot of this.frontWheelPivots) pivot.rotation.y = -steering * 0.42;
    this.visual.rotation.z = THREE.MathUtils.lerp(this.visual.rotation.z, -driftAngle * 0.16 - steering * Math.min(Math.abs(speed) / 250, 1) * 0.025, 0.12);
    this.visual.rotation.x = THREE.MathUtils.lerp(this.visual.rotation.x, braking ? -0.018 : boosting ? 0.015 : 0, 0.08);
    this.visual.position.y = Math.sin(time * 18) * Math.min(Math.abs(speed) / 250, 1) * 0.004;
    for (const light of this.brakeLights) light.material.emissiveIntensity = braking ? 9 : 3.2;
    for (const flame of this.nitroFlames) {
      flame.visible = boosting;
      if (boosting) {
        flame.scale.set(0.75 + Math.random() * 0.45, 0.65 + Math.random() * 0.8, 0.75 + Math.random() * 0.45);
        flame.material.opacity = 0.6 + Math.random() * 0.35;
      }
    }
  }

  wheelWorldPosition(index) {
    const positions = [
      [-0.96, 0.28, -1.35], [0.96, 0.28, -1.35],
      [-0.96, 0.28, 1.35], [0.96, 0.28, 1.35],
    ];
    return this.group.localToWorld(new THREE.Vector3(...positions[index]));
  }
}
