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

function makeGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#04070d';
  ctx.fillRect(0, 0, 1024, 1024);
  const image = ctx.getImageData(0, 0, 1024, 1024);
  const rand = seededRandom(31);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (rand() - 0.5) * 14;
    image.data[i] = 5 + n;
    image.data[i + 1] = 9 + n;
    image.data[i + 2] = 16 + n;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const glow = ctx.createRadialGradient(512, 512, 40, 512, 512, 640);
  glow.addColorStop(0, 'rgba(28,58,86,.34)');
  glow.addColorStop(0.55, 'rgba(14,30,48,.16)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = 'rgba(96,158,198,.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 1024; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(120,180,220,${rand() * 0.05})`;
    ctx.fillRect(rand() * 1024, rand() * 1024, 1 + rand() * 3, 1 + rand() * 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,.9)');
  gradient.addColorStop(0.3, 'rgba(180,235,255,.35)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePitBoardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#070c14';
  ctx.fillRect(0, 0, 1024, 160);
  ctx.strokeStyle = 'rgba(120,210,255,.5)';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 1012, 148);
  const rand = seededRandom(73);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(110,220,255,.14)' : 'rgba(255,70,140,.14)';
    ctx.fillRect(30 + i * 82, 24, 46, 112);
  }
  ctx.fillStyle = '#d8f2ff';
  ctx.font = '800 46px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEON APEX', 512, 64);
  ctx.fillStyle = 'rgba(150,180,205,.85)';
  ctx.font = '500 20px Arial';
  ctx.letterSpacing = '6px';
  ctx.fillText('MIDNIGHT CIRCUIT', 512, 112);
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
    this.buildSky();
    this.buildRoad();
    this.buildBarriers();
    this.buildStartGantry();
    this.buildEnvironment();
    this.buildBillboards();
    this.buildKerbs();
    this.buildGrandstand();
    this.buildProps();
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

  buildSky() {
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x02040a) },
        midColor: { value: new THREE.Color(0x071426) },
        horizonColor: { value: new THREE.Color(0x1b2c46) },
        glowColor: { value: new THREE.Color(0x4b2050) },
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDirection;
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 glowColor;
        void main() {
          float h = clamp(vDirection.y, -0.15, 1.0);
          vec3 color = mix(horizonColor, midColor, smoothstep(0.0, 0.3, h));
          color = mix(color, topColor, smoothstep(0.24, 0.85, h));
          float band = exp(-pow((h - 0.025) * 10.0, 2.0));
          color += glowColor * band * 0.55;
          float city = exp(-pow((h - 0.13) * 18.0, 2.0));
          color += vec3(0.1, 0.26, 0.4) * city * 0.4;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(880, 32, 20), skyMaterial);
    dome.frustumCulled = false;
    this.group.add(dome);

    const glowTexture = makeGlowTexture();
    const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture, color: 0x9fc8ff, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    moonGlow.scale.set(210, 210, 1);
    moonGlow.position.set(-350, 290, 190);
    this.group.add(moonGlow);
    const moonCore = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture, color: 0xe8f4ff, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    moonCore.scale.set(54, 54, 1);
    moonCore.position.copy(moonGlow.position);
    this.group.add(moonCore);
    for (const [x, z, color] of [[620, -420, 0xff4b8b], [-560, 520, 0x59edff]]) {
      const haze = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture, color, transparent: true, opacity: 0.16,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }));
      haze.scale.set(420, 240, 1);
      haze.position.set(x, 70, z);
      this.group.add(haze);
    }
  }

  buildRoad() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: makeGroundTexture(), roughness: 0.78, metalness: 0.3 })
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
    const rooftops = [];
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
        if (batch === 0 && rand() < 0.55) {
          rooftops.push({ x: dummy.position.x, z: dummy.position.z, y: height - 0.1, width, depth });
        }
      }
      this.group.add(buildings);
    }

    if (rooftops.length) {
      const antennaGeo = new THREE.BoxGeometry(0.22, 1, 0.22);
      antennaGeo.translate(0, 0.5, 0);
      const antennaMat = new THREE.MeshStandardMaterial({ color: 0x24313f, metalness: 0.85, roughness: 0.4 });
      const antennas = new THREE.InstancedMesh(antennaGeo, antennaMat, rooftops.length);
      const beacons = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.42, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff2f43, toneMapped: false }),
        rooftops.length
      );
      const crowns = new THREE.InstancedMesh(
        buildingGeo,
        new THREE.MeshStandardMaterial({
          color: 0x131c28,
          map: textures[0],
          emissiveMap: textures[0],
          emissive: 0x44617a,
          emissiveIntensity: 0.55,
          roughness: 0.7,
          metalness: 0.3,
        }),
        rooftops.length
      );
      let n = 0;
      for (const roof of rooftops) {
        const crownHeight = rand() < 0.5 ? 4 + rand() * 18 : 0;
        dummy.position.set(roof.x, roof.y, roof.z);
        dummy.rotation.set(0, rand() * Math.PI, 0);
        dummy.scale.set(
          roof.width * (0.5 + rand() * 0.35),
          Math.max(0.001, crownHeight),
          roof.depth * (0.5 + rand() * 0.35)
        );
        dummy.updateMatrix();
        crowns.setMatrixAt(n, dummy.matrix);
        const antennaBase = roof.y + crownHeight;
        const height = 7 + rand() * 22;
        dummy.position.set(roof.x, antennaBase, roof.z);
        dummy.scale.set(1, height, 1);
        dummy.updateMatrix();
        antennas.setMatrixAt(n, dummy.matrix);
        dummy.position.set(roof.x, antennaBase + height, roof.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(rand() < 0.45 ? 1 : 0.001);
        dummy.updateMatrix();
        beacons.setMatrixAt(n, dummy.matrix);
        n++;
      }
      this.group.add(crowns, antennas, beacons);
    }

    const skylineGeo = new THREE.BoxGeometry(1, 1, 1);
    skylineGeo.translate(0, 0.5, 0);
    const skylineMat = new THREE.MeshBasicMaterial({
      color: 0x9fb3cc,
      map: makeBuildingTexture(29, 210),
      fog: false,
    });
    const skyline = new THREE.InstancedMesh(skylineGeo, skylineMat, 80);
    for (let i = 0; i < 80; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 600 + rand() * 220;
      dummy.position.set(Math.cos(angle) * radius, -0.2, Math.sin(angle) * radius);
      dummy.scale.set(14 + rand() * 36, 55 + Math.pow(rand(), 1.5) * 210, 14 + rand() * 36);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.updateMatrix();
      skyline.setMatrixAt(i, dummy.matrix);
    }
    this.group.add(skyline);

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
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.11, 7.5, 6);
    poleGeo.translate(0, 3.75, 0);
    const poleInstances = new THREE.InstancedMesh(poleGeo, poleMat, 32);
    const armInstances = new THREE.InstancedMesh(new THREE.BoxGeometry(3.2, 0.09, 0.09), poleMat, 32);
    const lampInstances = new THREE.InstancedMesh(new THREE.BoxGeometry(1.15, 0.09, 0.38), lampMat, 32);
    const lampDummy = new THREE.Object3D();
    for (let i = 0; i < 32; i++) {
      const t = i / 32;
      const { point, tangent, normal } = this.frameAt(t);
      const side = i % 2 ? 1 : -1;
      const heading = Math.atan2(tangent.x, tangent.z);
      lampDummy.rotation.set(0, heading, 0);
      lampDummy.position.set(point.x + normal.x * side * 12.3, 0, point.z + normal.z * side * 12.3);
      lampDummy.updateMatrix();
      poleInstances.setMatrixAt(i, lampDummy.matrix);
      lampDummy.position.set(point.x + normal.x * side * 10.85, 7.45, point.z + normal.z * side * 10.85);
      lampDummy.updateMatrix();
      armInstances.setMatrixAt(i, lampDummy.matrix);
      lampDummy.position.set(point.x + normal.x * side * 9.55, 7.36, point.z + normal.z * side * 9.55);
      lampDummy.updateMatrix();
      lampInstances.setMatrixAt(i, lampDummy.matrix);
      if (lightStep && i % lightStep === 0 && i / lightStep < this.pointLights) {
        const light = new THREE.PointLight(i % 8 === 0 ? 0x3acfff : 0xff3c88, 15, 24, 2);
        light.position.set(point.x + normal.x * side * 12.3, 5.8, point.z + normal.z * side * 12.3);
        this.group.add(light);
      }
    }
    this.group.add(poleInstances, armInstances, lampInstances);

    const glowPositions = [];
    for (let i = 0; i < 32; i++) {
      const { point, normal } = this.frameAt(i / 32);
      const side = i % 2 ? 1 : -1;
      glowPositions.push({
        x: point.x + normal.x * side * 9.55,
        z: point.z + normal.z * side * 9.55,
        color: i % 8 === 0 ? 0x3acfff : 0xff3c88,
      });
    }
    const lampGlows = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(5.4, 5.4),
      new THREE.MeshBasicMaterial({
        map: makeGlowTexture(), transparent: true, opacity: 0.13,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
      glowPositions.length
    );
    const glowDummy = new THREE.Object3D();
    const glowColor = new THREE.Color();
    glowPositions.forEach((glow, index) => {
      glowDummy.position.set(glow.x, 0.05, glow.z);
      glowDummy.rotation.set(-Math.PI / 2, 0, 0);
      glowDummy.scale.setScalar(1);
      glowDummy.updateMatrix();
      lampGlows.setMatrixAt(index, glowDummy.matrix);
      lampGlows.setColorAt(index, glowColor.setHex(glow.color).multiplyScalar(0.85));
    });
    this.group.add(lampGlows);

    const mountainMat = new THREE.MeshBasicMaterial({ color: 0x070b14, side: THREE.DoubleSide, fog: false });
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(70 + rand() * 80, 80 + rand() * 100, 5), mountainMat);
      cone.position.set(Math.cos(angle) * 560, 20, Math.sin(angle) * 560);
      this.group.add(cone);
    }
  }

  buildKerbs() {
    const placements = [];
    for (let i = 0; i < SAMPLE_COUNT; i += 3) {
      const a = this.samples[i];
      const b = this.samples[(i + 9) % SAMPLE_COUNT];
      const bend = Math.abs(a.tangent.x * b.tangent.z - a.tangent.z * b.tangent.x);
      if (bend < 0.012) continue;
      placements.push(i);
    }
    if (!placements.length) return;
    const kerbs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.52, 0.09, 1.4),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      placements.length * 2
    );
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let n = 0;
    placements.forEach((sampleIndex, step) => {
      const sample = this.samples[sampleIndex];
      for (const side of [-1, 1]) {
        dummy.position.copy(sample.point).addScaledVector(sample.normal, side * (TRACK_WIDTH / 2 + 0.1));
        dummy.position.y = 0.045;
        dummy.rotation.set(0, Math.atan2(sample.tangent.x, sample.tangent.z), 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        kerbs.setMatrixAt(n, dummy.matrix);
        const white = step % 2 === 0;
        kerbs.setColorAt(n, color.setHex(white ? 0xe6f2f6 : (side < 0 ? 0x30cde2 : 0xf02f70)));
        n++;
      }
    });
    this.group.add(kerbs);
  }

  buildGrandstand() {
    const { point, tangent, normal } = this.frameAt(0.952);
    const group = new THREE.Group();
    group.position.copy(point).addScaledVector(normal, 21.5);
    group.rotation.y = Math.atan2(tangent.x, tangent.z);
    const concrete = new THREE.MeshStandardMaterial({ color: 0x151d26, roughness: 0.82, metalness: 0.16 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x1b2733, metalness: 0.8, roughness: 0.35 });
    const tiers = 6;
    for (let k = 0; k < tiers; k++) {
      const height = (k + 1) * 1.15;
      const tier = new THREE.Mesh(new THREE.BoxGeometry(2.0, height, 30), concrete);
      tier.position.set(1.0 + k * 2.0, height * 0.5, 0);
      tier.castShadow = tier.receiveShadow = true;
      group.add(tier);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.32, 31), metal);
    roof.position.set(6.4, 8.75, 0);
    roof.castShadow = true;
    group.add(roof);
    for (const [x, z] of [[0.5, -14.4], [0.5, 14.4], [12.4, -14.4], [12.4, 14.4]]) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 8.8, 8), metal);
      column.position.set(x, 4.4, z);
      group.add(column);
    }
    const palette = [0xd9e2ea, 0xff4b8b, 0x59edff, 0xffb15c, 0x8a4cf0, 0x14a06a];
    const crowdRows = 2;
    const crowdSpacing = 1.05;
    const crowdCount = tiers * crowdRows * 26;
    const crowd = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.4, 0.58, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0.1 }),
      crowdCount
    );
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let n = 0;
    for (let k = 0; k < tiers; k++) {
      for (let row = 0; row < crowdRows; row++) {
        for (let seat = 0; seat < 26; seat++) {
          const z = -13 + seat * crowdSpacing + (row % 2 ? 0.35 : 0);
          dummy.position.set(1.0 + k * 2.0 + (row === 0 ? -0.45 : 0.45), (k + 1) * 1.15 + 0.29, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(0.85 + (seat % 3) * 0.08);
          dummy.updateMatrix();
          crowd.setMatrixAt(n, dummy.matrix);
          crowd.setColorAt(n, color.setHex(palette[(seat + row + k) % palette.length]));
          n++;
        }
      }
    }
    group.add(crowd);
    this.group.add(group);
  }

  buildProps() {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const stacks = [
      [0.14, -1], [0.28, 1], [0.42, -1], [0.56, 1], [0.7, -1], [0.84, 1],
    ];
    const tires = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.52, 0.52, 0.27, 14),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.08 }),
      stacks.length * 3
    );
    let n = 0;
    for (const [t, side] of stacks) {
      const { point, normal } = this.frameAt(t);
      for (let level = 0; level < 3; level++) {
        dummy.position.copy(point).addScaledVector(normal, side * 15.5);
        dummy.position.y = 0.135 + level * 0.275;
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        tires.setMatrixAt(n, dummy.matrix);
        tires.setColorAt(n, color.setHex(level % 2 ? 0x191d22 : 0x0a0c10));
        n++;
      }
    }
    this.group.add(tires);

    const boardTexture = makePitBoardTexture();
    for (const side of [-1, 1]) {
      const boards = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(4.2, 0.72),
        new THREE.MeshBasicMaterial({ map: boardTexture, side: THREE.DoubleSide, toneMapped: false, color: 0xffffff }),
        16
      );
      for (let i = 0; i < 16; i++) {
        const t = 0.03 + i / 16;
        const { point, normal } = this.frameAt(t);
        dummy.position.copy(point).addScaledVector(normal, side * (TRACK_WIDTH / 2 + 1.24));
        dummy.position.y = 0.44;
        dummy.rotation.set(0, Math.atan2(-side * normal.x, -side * normal.z), 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        boards.setMatrixAt(i, dummy.matrix);
        boards.setColorAt(i, color.setHex(side < 0 ? 0xaee6ff : 0xffb3c8));
      }
      this.group.add(boards);
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
