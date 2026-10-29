import * as THREE from 'three';

export const TRACK_WIDTH = 19;
export const TRACK_SAMPLES = 1400;
const SAMPLE_COUNT = TRACK_SAMPLES;

function seededRandom(seed = 42) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function makeAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#252b32';
  ctx.fillRect(0, 0, 512, 512);
  const image = ctx.getImageData(0, 0, 512, 512);
  const rand = seededRandom(19);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (rand() - 0.5) * 28;
    image.data[i] = 31 + n;
    image.data[i + 1] = 36 + n;
    image.data[i + 2] = 43 + n;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  for (let i = 0; i < 130; i++) {
    ctx.strokeStyle = `rgba(180,205,220,${rand() * 0.035})`;
    ctx.lineWidth = rand() * 1.2;
    ctx.beginPath();
    const x = rand() * 512;
    const y = rand() * 512;
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand() * 80, y + rand() * 5);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeBuildingTexture(seed, hue) {
  const rand = seededRandom(seed);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#090e17';
  ctx.fillRect(0, 0, 128, 256);
  for (let y = 7; y < 252; y += 13) {
    for (let x = 6; x < 124; x += 12) {
      const lit = rand() > 0.43;
      ctx.fillStyle = lit
        ? (rand() > 0.7 ? `hsla(${hue},85%,75%,${0.5 + rand() * 0.45})` : `rgba(255,210,145,${0.35 + rand() * 0.5})`)
        : 'rgba(15,25,37,.9)';
      ctx.fillRect(x, y, 6, 7);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

function makeSignTexture(text, subtext, color = '#59edff') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#050913';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 1008, 240);
  ctx.fillStyle = color;
  ctx.fillRect(34, 34, 8, 188);
  ctx.font = 'italic 800 112px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 530, 112);
  ctx.font = '500 25px Arial';
  ctx.letterSpacing = '8px';
  ctx.fillStyle = '#a9b7c9';
  ctx.fillText(subtext, 530, 199);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export class NeonTrack {
  constructor(scene, { pointLights = 8 } = {}) {
    this.scene = scene;
    this.sampleCount = SAMPLE_COUNT;
    this.pointLights = pointLights;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 150),
      new THREE.Vector3(70, 0, 148),
      new THREE.Vector3(125, 0, 120),
      new THREE.Vector3(160, 0, 80),
      new THREE.Vector3(180, 0, 35),
      new THREE.Vector3(195, 0, -15),
      new THREE.Vector3(185, 0, -65),
      new THREE.Vector3(155, 0, -100),
      new THREE.Vector3(145, 0, -130),
      new THREE.Vector3(105, 0, -155),
      new THREE.Vector3(55, 0, -165),
      new THREE.Vector3(0, 0, -160),
      new THREE.Vector3(-55, 0, -145),
      new THREE.Vector3(-105, 0, -115),
      new THREE.Vector3(-150, 0, -95),
      new THREE.Vector3(-180, 0, -60),
      new THREE.Vector3(-195, 0, -10),
      new THREE.Vector3(-190, 0, 45),
      new THREE.Vector3(-175, 0, 85),
      new THREE.Vector3(-150, 0, 125),
      new THREE.Vector3(-100, 0, 148),
      new THREE.Vector3(-50, 0, 150),
    ], true, 'centripetal');
    this.length = this.curve.getLength();
    this.startT = Math.min(0.03, 10 / this.length);
    this.samples = [];
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const t = i / SAMPLE_COUNT;
      const point = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      this.samples.push({ point, tangent, normal, t });
    }
    this.buildRoad();
    this.buildBarriers();
    this.buildStartGantry();
    this.buildEnvironment();
    this.buildBillboards();
  }

  frameAt(t) {
    const wrapped = ((t % 1) + 1) % 1;
    const point = this.curve.getPointAt(wrapped);
    const tangent = this.curve.getTangentAt(wrapped).normalize();
    const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    return { point, tangent, normal };
  }

  nearest(position, hint = -1) {
    let best = Infinity;
    let bestIndex = 0;
    const check = (i) => {
      const index = (i + SAMPLE_COUNT) % SAMPLE_COUNT;
      const p = this.samples[index].point;
      const dx = position.x - p.x;
      const dz = position.z - p.z;
      const d = dx * dx + dz * dz;
      if (d < best) { best = d; bestIndex = index; }
    };
    if (hint >= 0) {
      for (let o = -28; o <= 28; o++) check(hint + o);
      if (best > 625) {
        best = Infinity;
        for (let i = 0; i < SAMPLE_COUNT; i++) check(i);
      }
    } else {
      for (let i = 0; i < SAMPLE_COUNT; i++) check(i);
    }
    const sample = this.samples[bestIndex];
    return {
      index: bestIndex,
      distance: Math.sqrt(best),
      lateral: (position.x - sample.point.x) * sample.normal.x + (position.z - sample.point.z) * sample.normal.z,
      point: sample.point,
      tangent: sample.tangent,
      normal: sample.normal,
      t: sample.t,
    };
  }

  createRibbon(offset, width, y, material, segments = SAMPLE_COUNT) {
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const { point, normal } = this.frameAt(t);
      for (const side of [-1, 1]) {
        const p = point.clone().addScaledVector(normal, offset + side * width * 0.5);
        positions.push(p.x, y, p.z);
        uvs.push(side < 0 ? 0 : 1, t * this.length / 10);
      }
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  buildRoad() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshStandardMaterial({ color: 0x03060b, roughness: 0.72, metalness: 0.25 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    ground.receiveShadow = true;
    this.group.add(ground);

    this.createRibbon(0, TRACK_WIDTH + 4.5, -0.035, new THREE.MeshStandardMaterial({
      color: 0x090d13, roughness: 0.62, metalness: 0.5,
    }));
    const asphalt = makeAsphaltTexture();
    const road = this.createRibbon(0, TRACK_WIDTH, 0, new THREE.MeshStandardMaterial({
      color: 0x8c9aa8,
      map: asphalt,
      roughness: 0.29,
      metalness: 0.52,
      envMapIntensity: 0.75,
    }));
    road.receiveShadow = true;

    const edgeCyan = new THREE.MeshBasicMaterial({ color: 0x30cde2, toneMapped: false });
    const edgePink = new THREE.MeshBasicMaterial({ color: 0xf02f70, toneMapped: false });
    this.createRibbon(-TRACK_WIDTH / 2 + 0.3, 0.18, 0.025, edgeCyan);
    this.createRibbon(TRACK_WIDTH / 2 - 0.3, 0.18, 0.025, edgePink);

    const laneMaterial = new THREE.MeshBasicMaterial({ color: 0xdce9ee, transparent: true, opacity: 0.36, depthWrite: false });
    const dashGeometry = new THREE.BoxGeometry(0.12, 0.012, 3.2);
    const dashes = new THREE.InstancedMesh(dashGeometry, laneMaterial, 200);
    const dummy = new THREE.Object3D();
    const laneOffsets = [-TRACK_WIDTH / 6, TRACK_WIDTH / 6];
    let n = 0;
    for (let i = 0; i < 100; i++) {
      const { point, tangent, normal } = this.frameAt(i / 100);
      for (const offset of laneOffsets) {
        dummy.position.copy(point).addScaledVector(normal, offset);
        dummy.position.y = 0.027;
        dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
        dummy.updateMatrix();
        dashes.setMatrixAt(n++, dummy.matrix);
      }
    }
    this.group.add(dashes);
  }

  buildBarriers() {
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x111923, roughness: 0.34, metalness: 0.85 });
    const railCyan = new THREE.MeshBasicMaterial({ color: 0x21b7d1, toneMapped: false });
    const railPink = new THREE.MeshBasicMaterial({ color: 0xd82364, toneMapped: false });
    for (const side of [-1, 1]) {
      const positions = [];
      const indices = [];
      const railPoints = [];
      for (let i = 0; i <= SAMPLE_COUNT; i++) {
        const { point, normal } = this.frameAt(i / SAMPLE_COUNT);
        const p = point.clone().addScaledVector(normal, side * (TRACK_WIDTH / 2 + 1.25));
        positions.push(p.x, 0.02, p.z, p.x, 0.75, p.z);
        railPoints.push(new THREE.Vector3(p.x, 0.79, p.z));
        if (i < SAMPLE_COUNT) {
          const a = i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const wall = new THREE.Mesh(geometry, wallMaterial);
      wall.castShadow = wall.receiveShadow = true;
      this.group.add(wall);
      const railCurve = new THREE.CatmullRomCurve3(railPoints, true);
      const rail = new THREE.Mesh(
        new THREE.TubeGeometry(railCurve, 700, 0.047, 4, true),
        side < 0 ? railCyan : railPink
      );
      this.group.add(rail);
    }

    const postGeometry = new THREE.BoxGeometry(0.15, 1.05, 0.15);
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x33404b, metalness: 0.85, roughness: 0.3 });
    const postCount = 180;
    const posts = new THREE.InstancedMesh(postGeometry, postMaterial, postCount * 2);
    const reflectors = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.1, 0.12, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xb5f6ff, toneMapped: false }),
      postCount * 2
    );
    const dummy = new THREE.Object3D();
    let n = 0;
    for (let i = 0; i < postCount; i++) {
      const { point, tangent, normal } = this.frameAt(i / postCount);
      for (const side of [-1, 1]) {
        dummy.position.copy(point).addScaledVector(normal, side * (TRACK_WIDTH / 2 + 1.25));
        dummy.position.y = 0.45;
        dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
        dummy.updateMatrix();
        posts.setMatrixAt(n, dummy.matrix);
        dummy.position.y = 0.56;
        dummy.position.addScaledVector(normal, -side * 0.1);
        dummy.updateMatrix();
        reflectors.setMatrixAt(n, dummy.matrix);
        n++;
      }
    }
    this.group.add(posts, reflectors);
  }

  buildStartGantry() {
    const { point, tangent, normal } = this.frameAt(0);
    const gantry = new THREE.Group();
    gantry.position.copy(point);
    gantry.rotation.y = Math.atan2(tangent.x, tangent.z);
    const metal = new THREE.MeshStandardMaterial({ color: 0x17222c, metalness: 0.9, roughness: 0.25 });
    const glow = new THREE.MeshBasicMaterial({ color: 0x4de8ff, toneMapped: false });
    for (const x of [-10.2, 10.2]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 6.6, 0.45), metal);
      pillar.position.set(x, 3.3, 0);
      pillar.castShadow = true;
      gantry.add(pillar);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 5.4, 0.49), glow);
      strip.position.set(x > 0 ? x - 0.22 : x + 0.22, 3.35, 0);
      gantry.add(strip);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(21, 1.25, 0.6), metal);
    beam.position.y = 6.25;
    gantry.add(beam);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(8.4, 2.1),
      new THREE.MeshBasicMaterial({ map: makeSignTexture('NEON APEX', 'TOKYO BAY CIRCUIT'), toneMapped: false })
    );
    sign.position.set(0, 6.25, -0.315);
    sign.rotation.y = Math.PI;
    gantry.add(sign);
    const lineCanvas = document.createElement('canvas');
    lineCanvas.width = 256; lineCanvas.height = 32;
    const ctx = lineCanvas.getContext('2d');
    for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) {
      ctx.fillStyle = (x + y) % 2 ? '#10151b' : '#d9f2f2';
      ctx.fillRect(x * 16, y * 16, 16, 16);
    }
    const lineTexture = new THREE.CanvasTexture(lineCanvas);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH, 1.2), new THREE.MeshBasicMaterial({ map: lineTexture }));
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.045;
    gantry.add(line);
    this.group.add(gantry);
  }

  buildEnvironment() {
    const rand = seededRandom(83);
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    buildingGeo.translate(0, 0.5, 0);
    const textures = [makeBuildingTexture(3, 190), makeBuildingTexture(7, 315), makeBuildingTexture(13, 175)];
    const dummy = new THREE.Object3D();
    for (let batch = 0; batch < 3; batch++) {
      const material = new THREE.MeshStandardMaterial({
        color: 0x17202d,
        map: textures[batch],
        emissiveMap: textures[batch],
        emissive: batch === 1 ? 0x74435f : 0x497586,
        emissiveIntensity: 0.8,
        roughness: 0.72,
        metalness: 0.25,
      });
      const buildings = new THREE.InstancedMesh(buildingGeo, material, 65);
      for (let i = 0; i < 65; i++) {
        const angle = rand() * Math.PI * 2;
        const radius = 280 + rand() * 220;
        const width = 8 + rand() * 20;
        const depth = 8 + rand() * 20;
        const height = 20 + Math.pow(rand(), 1.8) * 120;
        dummy.position.set(Math.cos(angle) * radius, -0.1, Math.sin(angle) * radius);
        dummy.scale.set(width, height, depth);
        dummy.rotation.set(0, rand() * Math.PI, 0);
        dummy.updateMatrix();
        buildings.setMatrixAt(i, dummy.matrix);
      }
      this.group.add(buildings);
    }

    const starPositions = [];
    for (let i = 0; i < 700; i++) {
      const r = 450 + rand() * 400;
      const a = rand() * Math.PI * 2;
      starPositions.push(Math.cos(a) * r, 100 + rand() * 320, Math.sin(a) * r);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x8caaca, size: 0.6, transparent: true, opacity: 0.5, depthWrite: false }));
    this.group.add(stars);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x253441, metalness: 0.85, roughness: 0.3 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x8eeeff, toneMapped: false });
    const lightStep = this.pointLights > 0 ? Math.max(1, Math.floor(32 / this.pointLights)) : 0;
    for (let i = 0; i < 32; i++) {
      const t = i / 32;
      const { point, tangent, normal } = this.frameAt(t);
      const side = i % 2 ? 1 : -1;
      const group = new THREE.Group();
      group.position.copy(point).addScaledVector(normal, side * 12.3);
      group.rotation.y = Math.atan2(tangent.x, tangent.z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 7.5, 6), poleMat);
      pole.position.y = 3.75;
      group.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.09, 0.09), poleMat);
      arm.position.set(-side * 1.45, 7.45, 0);
      group.add(arm);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.09, 0.38), lampMat);
      lamp.position.set(-side * 2.75, 7.36, 0);
      group.add(lamp);
      this.group.add(group);
      if (lightStep && i % lightStep === 0 && i / lightStep < this.pointLights) {
        const light = new THREE.PointLight(i % 8 === 0 ? 0x3acfff : 0xff3c88, 22, 25, 2);
        light.position.copy(group.position);
        light.position.y = 5.8;
        this.group.add(light);
      }
    }

    const mountainMat = new THREE.MeshBasicMaterial({ color: 0x070b14, side: THREE.DoubleSide });
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(70 + rand() * 80, 80 + rand() * 100, 5), mountainMat);
      cone.position.set(Math.cos(angle) * 560, 20, Math.sin(angle) * 560);
      this.group.add(cone);
    }
  }

  buildBillboards() {
    const signs = [
      [0.09, -1, 'APEX', 'PUSH YOUR LIMITS', '#59edff'],
      [0.21, 1, '夜行者', 'OWN THE NIGHT', '#ff4b8b'],
      [0.36, -1, 'NITRO', 'FEEL THE VELOCITY', '#59edff'],
      [0.49, 1, 'TOKYO', 'BAY CIRCUIT 01', '#ffb15c'],
      [0.63, -1, 'DRIFT', 'FIND YOUR LINE', '#ff4b8b'],
      [0.78, 1, 'NEON', 'BEYOND THE GRID', '#59edff'],
      [0.91, -1, 'APEX', 'MIDNIGHT SERIES', '#ae74ff'],
    ];
    for (const [t, side, text, sub, color] of signs) {
      const { point, tangent, normal } = this.frameAt(t);
      const group = new THREE.Group();
      group.position.copy(point).addScaledVector(normal, side * 18);
      group.rotation.y = Math.atan2(-tangent.z * side, tangent.x * side);
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(9, 2.25),
        new THREE.MeshBasicMaterial({ map: makeSignTexture(text, sub, color), side: THREE.DoubleSide, toneMapped: false })
      );
      panel.position.y = 3.7;
      group.add(panel);
      const supports = new THREE.MeshStandardMaterial({ color: 0x1b2833, metalness: 0.8, roughness: 0.35 });
      for (const x of [-3.5, 3.5]) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3, 0.15), supports);
        pole.position.set(x, 1.5, 0);
        group.add(pole);
      }
      this.group.add(group);
    }
  }

}
