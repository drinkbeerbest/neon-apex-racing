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

function hexColor(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
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
  texture.anisotropy = 16;
  return texture;
}

function makeAsphaltNormalTexture() {
  const rand = seededRandom(71);
  const width = 512;
  const height = 512;
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = heightCanvas.height = 512;
  const hctx = heightCanvas.getContext('2d');
  hctx.fillStyle = '#808080';
  hctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 2400; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const radius = 1 + rand() * 5;
    const shade = rand() > 0.5 ? 255 : 0;
    const alpha = 0.05 + rand() * 0.2;
    const gradient = hctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${shade},${shade},${shade},${alpha})`);
    gradient.addColorStop(1, 'rgba(128,128,128,0)');
    hctx.fillStyle = gradient;
    hctx.beginPath();
    hctx.arc(x, y, radius, 0, Math.PI * 2);
    hctx.fill();
  }
  const source = hctx.getImageData(0, 0, width, height).data;
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = normalCanvas.height = 512;
  const nctx = normalCanvas.getContext('2d');
  const normalImage = nctx.createImageData(width, height);
  const strength = 2.6;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const left = source[(y * width + ((x - 1 + width) % width)) * 4];
      const right = source[(y * width + ((x + 1) % width)) * 4];
      const up = source[(((y - 1 + height) % height) * width + x) * 4];
      const down = source[(((y + 1) % height) * width + x) * 4];
      const dx = (right - left) / 255 * strength;
      const dy = (down - up) / 255 * strength;
      let nx = -dx;
      let ny = -dy;
      let nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len; ny /= len; nz /= len;
      const index = (y * width + x) * 4;
      normalImage.data[index] = (nx * 0.5 + 0.5) * 255;
      normalImage.data[index + 1] = (ny * 0.5 + 0.5) * 255;
      normalImage.data[index + 2] = (nz * 0.5 + 0.5) * 255;
      normalImage.data[index + 3] = 255;
    }
  }
  nctx.putImageData(normalImage, 0, 0);
  const texture = new THREE.CanvasTexture(normalCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function makeAsphaltRoughnessTexture() {
  const rand = seededRandom(83);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(225,225,225)';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 42; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const rx = 12 + rand() * 70;
    const ry = 8 + rand() * 40;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    gradient.addColorStop(0, 'rgba(42,42,42,.75)');
    gradient.addColorStop(0.55, 'rgba(86,86,86,.3)');
    gradient.addColorStop(1, 'rgba(225,225,225,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function makeGroundTexture(road) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const [br, bg, bb] = road.groundBase;
  ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
  ctx.fillRect(0, 0, 1024, 1024);
  const image = ctx.getImageData(0, 0, 1024, 1024);
  const rand = seededRandom(31);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (rand() - 0.5) * 14;
    image.data[i] = br + n;
    image.data[i + 1] = bg + n;
    image.data[i + 2] = bb + n;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const [gr, gg, gb, ga] = road.groundGlow;
  const glow = ctx.createRadialGradient(512, 512, 40, 512, 512, 640);
  glow.addColorStop(0, `rgba(${gr},${gg},${gb},${ga})`);
  glow.addColorStop(0.55, `rgba(${gr},${gg},${gb},${ga * 0.45})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = road.grid;
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
    ctx.fillStyle = `${road.speck}${rand() * 0.05})`;
    ctx.fillRect(rand() * 1024, rand() * 1024, 1 + rand() * 3, 1 + rand() * 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeTowerTextures(seed, hue, style = 'glass') {
  const rand = seededRandom(seed);
  const width = 512;
  const height = 1024;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const ac = albedoCanvas.getContext('2d');
  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = width;
  emissiveCanvas.height = height;
  const ec = emissiveCanvas.getContext('2d');
  ec.fillStyle = '#141b24';
  ec.fillRect(0, 0, width, height);
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = width;
  heightCanvas.height = height;
  const hc = heightCanvas.getContext('2d');
  hc.fillStyle = '#808080';
  hc.fillRect(0, 0, width, height);

  const glass = style === 'glass';
  const residential = style === 'residential';
  const cols = glass ? 16 : residential ? 11 : 13;
  const rows = glass ? 36 : residential ? 28 : 32;
  const cellW = width / cols;
  const cellH = height / rows;
  const litChance = glass ? 0.2 : residential ? 0.26 : 0.22;

  const base = ac.createLinearGradient(0, 0, width, height);
  if (glass) {
    base.addColorStop(0, `hsl(${hue}, 34%, 33%)`);
    base.addColorStop(0.45, `hsl(${hue + 10}, 26%, 21%)`);
    base.addColorStop(1, `hsl(${hue - 8}, 26%, 14%)`);
  } else if (residential) {
    base.addColorStop(0, `hsl(${hue}, 12%, 37%)`);
    base.addColorStop(0.55, `hsl(${hue}, 10%, 25%)`);
    base.addColorStop(1, `hsl(${hue}, 9%, 17%)`);
  } else {
    base.addColorStop(0, `hsl(${hue}, 18%, 39%)`);
    base.addColorStop(0.55, `hsl(${hue}, 16%, 27%)`);
    base.addColorStop(1, `hsl(${hue}, 14%, 18%)`);
  }
  ac.fillStyle = base;
  ac.fillRect(0, 0, width, height);

  for (let i = 0; i < (glass ? 18 : 6); i++) {
    ac.fillStyle = `hsla(${hue + 20}, 60%, 70%, ${0.015 + rand() * 0.035})`;
    ac.fillRect(rand() * width, 0, 2 + rand() * 20, height);
  }
  for (let i = 0; i < 8; i++) {
    ac.fillStyle = `rgba(255, 220, 180, ${0.015 + rand() * 0.03})`;
    ac.fillRect(rand() * width, 0, 1 + rand() * 8, height);
  }

  for (let row = 0; row < rows; row++) {
    const y = row * cellH;
    const slabHeight = glass ? 5 : 8;
    const darkFloor = rand() < (glass ? 0.35 : residential ? 0.26 : 0.3);
    ac.fillStyle = glass ? 'rgba(5,10,16,.7)' : `hsla(${hue}, 12%, ${14 + rand() * 8}%, .9)`;
    ac.fillRect(0, y + cellH - slabHeight, width, slabHeight);
    hc.fillStyle = 'rgb(188,188,188)';
    hc.fillRect(0, y + cellH - slabHeight, width, slabHeight);
    if (residential && row % 3 === 0) {
      ac.fillStyle = 'rgba(8,12,18,.82)';
      ac.fillRect(0, y + cellH - 14, width, 10);
      ec.fillStyle = `hsla(${hue + 200}, 30%, 60%, .035)`;
      ec.fillRect(0, y + cellH - 14, width, 10);
    }
    for (let col = 0; col < cols; col++) {
      const x = col * cellW;
      const padX = glass ? 7 : residential ? 8 : 7;
      const padY = glass ? 6 : 8;
      const winW = cellW - padX * 2;
      const winH = cellH - slabHeight - padY;
      const lit = !darkFloor && rand() < litChance;
      const roll = rand();
      let pane;
      if (glass) {
        pane = lit
          ? (roll > 0.91 ? `hsla(${hue + 150}, 24%, 72%, .42)` : `rgba(255, 221, 184, ${0.26 + rand() * 0.18})`)
          : `hsl(${hue + 4}, 22%, ${16 + rand() * 8}%)`;
      } else if (residential) {
        pane = lit ? `rgba(255, 214, 166, ${0.28 + rand() * 0.18})` : `hsl(${hue}, 14%, ${14 + rand() * 9}%)`;
      } else {
        pane = lit ? (roll > 0.9 ? `hsla(${hue + 160}, 22%, 74%, .38)` : `rgba(255, 218, 178, ${0.26 + rand() * 0.17})`) : `hsl(${hue}, 18%, ${17 + rand() * 10}%)`;
      }
      ac.fillStyle = pane;
      ac.fillRect(x + padX, y + 6, winW, winH);
      hc.fillStyle = 'rgb(94,94,94)';
      hc.fillRect(x + padX, y + 6, winW, winH);
      hc.fillStyle = 'rgb(224,224,224)';
      hc.fillRect(x + padX - 2, y + 6, 2, winH);
      ac.fillStyle = 'rgba(3,7,12,.6)';
      ac.fillRect(x + padX, y + 6, 2, winH);
      ac.fillRect(x + padX, y + 6 + Math.floor(winH * 0.45), winW, 2);
      if (glass) {
        ac.fillStyle = 'rgba(255,255,255,.04)';
        ac.fillRect(x + padX + 3, y + 8, winW * 0.36, winH * 0.5);
      }
      if (lit) {
        const warm = roll > 0.08;
        ec.globalAlpha = 0.32 + rand() * 0.16;
        ec.fillStyle = warm
          ? `hsl(${34 + rand() * 10}, 28%, ${64 + rand() * 10}%)`
          : `hsl(${hue + 150}, 22%, ${66 + rand() * 10}%)`;
        ec.fillRect(x + padX, y + 6, winW, winH);
        ec.globalAlpha = 0.05;
        ec.fillRect(x + padX - 3, y + 3, winW + 6, winH + 6);
        ec.globalAlpha = 1;
      }
    }
  }

  if (glass) {
    for (let i = 0; i < 1; i++) {
      const x = rand() * width * 0.8;
      const y = height * 0.2;
      const w = 14 + rand() * 10;
      ac.fillStyle = 'rgba(5,11,18,.6)';
      ac.fillRect(x, y, w, height * 0.24);
      ec.globalAlpha = 0.14;
      ec.fillStyle = `hsl(${hue + 170}, 42%, 58%)`;
      ec.fillRect(x + 2, y + 4, w - 4, height * 0.24 - 8);
      ec.globalAlpha = 1;
    }
  }
  if (!glass) {
    for (let i = 0; i < 2; i++) {
      const x = rand() * width * 0.75;
      const y = 70 + rand() * (height * 0.7);
      ac.fillStyle = 'rgba(8,14,22,.8)';
      ac.fillRect(x, y, 16, 64);
      ec.globalAlpha = 0.16;
      ec.fillStyle = i % 2 ? 'hsl(190, 50%, 60%)' : 'hsl(332, 55%, 62%)';
      ec.fillRect(x + 3, y + 3, 10, 58);
      ec.globalAlpha = 1;
    }
  }

  const heightSource = hc.getImageData(0, 0, width, height).data;
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = width;
  normalCanvas.height = height;
  const nctx = normalCanvas.getContext('2d');
  const normalImage = nctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const left = heightSource[(y * width + ((x - 1 + width) % width)) * 4];
      const right = heightSource[(y * width + ((x + 1) % width)) * 4];
      const up = heightSource[(((y - 1 + height) % height) * width + x) * 4];
      const down = heightSource[(((y + 1) % height) * width + x) * 4];
      const dx = (right - left) / 255 * 1.9;
      const dy = (down - up) / 255 * 1.9;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const index = (y * width + x) * 4;
      normalImage.data[index] = (nx / length * 0.5 + 0.5) * 255;
      normalImage.data[index + 1] = (ny / length * 0.5 + 0.5) * 255;
      normalImage.data[index + 2] = (nz / length * 0.5 + 0.5) * 255;
      normalImage.data[index + 3] = 255;
    }
  }
  nctx.putImageData(normalImage, 0, 0);
  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.anisotropy = 8;
  const roughnessMap = new THREE.CanvasTexture(heightCanvas);
  roughnessMap.anisotropy = 8;

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 16;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = 16;
  emissiveMap.minFilter = THREE.LinearMipmapLinearFilter;
  emissiveMap.magFilter = THREE.LinearFilter;
  return { map, emissiveMap, normalMap, roughnessMap };
}

function makeWarehouseTextures(seed, hue) {
  const rand = seededRandom(seed);
  const width = 512;
  const height = 512;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const ac = albedoCanvas.getContext('2d');
  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = width;
  emissiveCanvas.height = height;
  const ec = emissiveCanvas.getContext('2d');
  ec.fillStyle = '#141b24';
  ec.fillRect(0, 0, width, height);

  const base = ac.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, `hsl(${hue}, 12%, 32%)`);
  base.addColorStop(0.55, `hsl(${hue}, 10%, 21%)`);
  base.addColorStop(1, `hsl(${hue}, 9%, 14%)`);
  ac.fillStyle = base;
  ac.fillRect(0, 0, width, height);
  for (let x = 0; x < width; x += 14) {
    ac.fillStyle = 'rgba(5,10,14,.38)';
    ac.fillRect(x, 0, 2, height);
    ac.fillStyle = `hsla(${hue}, 18%, ${48 + rand() * 18}%, .12)`;
    ac.fillRect(x + 3, 0, 1, height);
  }
  for (let i = 0; i < 14; i++) {
    ac.fillStyle = `rgba(20,14,10,${0.04 + rand() * 0.12})`;
    ac.fillRect(rand() * width, rand() * height, 2 + rand() * 10, 24 + rand() * 120);
  }
  ac.fillStyle = 'rgba(9,14,18,.92)';
  ac.fillRect(0, height - 34, width, 34);
  ac.fillStyle = 'rgba(215,190,110,.18)';
  ac.fillRect(0, height - 28, width, 4);

  for (let i = 0; i < 4; i++) {
    const doorX = 24 + i * 122;
    ac.fillStyle = `hsla(${hue}, 16%, ${25 + rand() * 8}%, .95)`;
    ac.fillRect(doorX, 96, 88, 318);
    for (let line = 0; line < 24; line++) {
      ac.fillStyle = 'rgba(150,166,178,.08)';
      ac.fillRect(doorX + 3, 102 + line * 12, 82, 2);
    }
    ac.fillStyle = 'rgba(4,8,12,.9)';
    ac.fillRect(doorX + 94, 112, 12, 300);
    ac.fillStyle = rand() > 0.5 ? `hsla(${hue + 160}, 85%, 60%, .7)` : 'rgba(255,201,132,.65)';
    ac.fillRect(doorX + 8, 62, 26, 12);
    ec.globalAlpha = 0.65;
    ec.fillStyle = 'rgba(255,196,128,.8)';
    ec.fillRect(doorX + 8, 62, 26, 12);
    ec.globalAlpha = 0.4;
    ec.fillStyle = 'rgba(255,220,170,.5)';
    ec.fillRect(doorX + 4, 56, 34, 20);
    ec.globalAlpha = 1;
  }
  for (let i = 0; i < 6; i++) {
    const x = 16 + i * 82;
    ac.fillStyle = 'rgba(8,12,17,.92)';
    ac.fillRect(x, 28, 42, 16);
    ec.globalAlpha = 0.45 + rand() * 0.3;
    ec.fillStyle = rand() > 0.5 ? 'hsl(28, 85%, 66%)' : 'hsl(190, 80%, 64%)';
    ec.fillRect(x + 2, 30, 38, 12);
    ec.globalAlpha = 1;
  }
  ac.fillStyle = 'rgba(8,12,17,.9)';
  ac.fillRect(30, 180, 300, 54);
  ac.fillStyle = `hsla(${hue + 150}, 25%, 62%, .35)`;
  ac.fillRect(34, 184, 292, 46);
  ec.globalAlpha = 0.35;
  ec.fillStyle = `hsl(${hue + 150}, 70%, 58%)`;
  ec.fillRect(34, 184, 292, 46);
  ec.globalAlpha = 1;

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 16;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = 16;
  emissiveMap.minFilter = THREE.LinearMipmapLinearFilter;
  emissiveMap.magFilter = THREE.LinearFilter;
  return { map, emissiveMap };
}

function makeGableRoofGeometry() {
  const positions = [
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1, 0.5,
    -0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5,
  ];
  const indices = [
    0, 1, 2,
    3, 5, 4,
    0, 2, 5, 0, 5, 3,
    1, 4, 5, 1, 5, 2,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeVerticalSignTexture(text, sub, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#050913';
  ctx.fillRect(0, 0, 256, 1024);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 236, 1004);
  ctx.fillStyle = color;
  ctx.fillRect(28, 34, 8, 956);
  ctx.save();
  ctx.translate(154, 500);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = color;
  ctx.font = 'italic 800 118px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
  ctx.fillStyle = 'rgba(190, 210, 228, .8)';
  ctx.font = '600 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(sub, 140, 968);
  const texture = new THREE.CanvasTexture(canvas);
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
  const base = ctx.createLinearGradient(0, 0, 0, 256);
  base.addColorStop(0, '#0b1220');
  base.addColorStop(0.5, '#070d16');
  base.addColorStop(1, '#0a1018');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  ctx.strokeStyle = 'rgba(5,9,15,.72)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 13) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(62,82,100,.16)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 128; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 7; y < 250; y += 13) {
    const unlitFloor = rand() < 0.1;
    for (let x = 6; x < 122; x += 12) {
      const roll = rand();
      if (unlitFloor || roll < 0.4) {
        ctx.fillStyle = 'rgba(11,18,27,.9)';
      } else if (roll > 0.93) {
        ctx.fillStyle = `hsla(${hue}, 92%, 86%, ${0.65 + rand() * 0.3})`;
      } else if (roll > 0.8) {
        ctx.fillStyle = `rgba(255,217,164,${0.5 + rand() * 0.42})`;
      } else {
        ctx.fillStyle = `hsla(${hue}, 58%, ${48 + rand() * 22}%, ${0.32 + rand() * 0.5})`;
      }
      ctx.fillRect(x, y, 7, 7);
      ctx.fillStyle = 'rgba(4,8,13,.55)';
      ctx.fillRect(x + 3, y, 1, 7);
    }
  }
  for (let i = 0; i < 3; i++) {
    const x = 14 + rand() * 72;
    const y = 26 + rand() * 170;
    const width = 16 + rand() * 22;
    const height = 22 + rand() * 40;
    ctx.fillStyle = i % 2 ? `hsla(${hue + 120}, 90%, 68%, .28)` : 'rgba(255,74,140,.24)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = 'rgba(220,245,255,.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

function makeWarehouseTexture(seed, hue) {
  const rand = seededRandom(seed);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a2229';
  ctx.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 8) {
    ctx.fillStyle = y % 16 ? 'rgba(52,68,78,.22)' : 'rgba(8,12,16,.4)';
    ctx.fillRect(0, y, 512, 3);
  }
  ctx.fillStyle = '#0a1219';
  ctx.fillRect(0, 0, 512, 24);
  for (let i = 0; i < 4; i++) {
    const x = 22 + i * 124;
    ctx.fillStyle = `hsla(${hue}, 32%, ${19 + rand() * 10}%, .95)`;
    ctx.fillRect(x, 54, 86, 170);
    for (let line = 0; line < 14; line++) {
      ctx.fillStyle = 'rgba(150,170,184,.09)';
      ctx.fillRect(x + 4, 58 + line * 12, 78, 2);
    }
    ctx.fillStyle = 'rgba(8,13,18,.9)';
    ctx.fillRect(x + 96, 66, 10, 150);
    ctx.fillStyle = rand() > 0.5 ? `hsla(${hue}, 88%, 62%, .65)` : 'rgba(255,206,148,.6)';
    ctx.fillRect(x + 12, 32, 22, 10);
    ctx.fillRect(x + 48, 32, 16, 10);
  }
  ctx.fillStyle = '#0b1117';
  ctx.fillRect(0, 230, 512, 26);
  for (let x = 0; x < 512; x += 64) {
    ctx.fillStyle = x % 128 ? 'rgba(255,183,77,.2)' : 'rgba(8,12,16,.8)';
    ctx.fillRect(x, 230, 64, 8);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makePodiumTexture(seed, hue) {
  const rand = seededRandom(seed);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b1119';
  ctx.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 10; i++) {
    const x = 12 + i * 50;
    const lit = rand() > 0.5;
    ctx.fillStyle = lit ? `hsla(${hue + (i % 3) * 40}, 78%, 68%, .62)` : 'rgba(220,238,244,.18)';
    ctx.fillRect(x, 30, 34, 60);
    ctx.fillStyle = 'rgba(6,10,15,.65)';
    ctx.fillRect(x + 16, 30, 2, 60);
    ctx.fillRect(x, 54, 34, 2);
    ctx.fillStyle = i % 2 ? 'rgba(255,90,150,.42)' : 'rgba(90,230,255,.38)';
    ctx.fillRect(x + 2, 18, 30, 6);
    ctx.fillStyle = 'rgba(5,9,14,.85)';
    ctx.fillRect(x + 8, 90, 18, 30);
  }
  ctx.fillStyle = 'rgba(120,160,180,.12)';
  ctx.fillRect(0, 0, 512, 10);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function makeContainerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#cfd3d5';
  ctx.fillRect(0, 0, 128, 64);
  for (let x = 0; x < 128; x += 8) {
    ctx.fillStyle = 'rgba(52,62,68,.5)';
    ctx.fillRect(x, 0, 2, 64);
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.fillRect(x + 3, 0, 1, 64);
  }
  ctx.fillStyle = 'rgba(52,36,24,.28)';
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 128, Math.random() * 64, 1 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(20,26,30,.7)';
  ctx.fillRect(0, 0, 128, 5);
  ctx.fillRect(0, 58, 128, 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
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

function makePitBoardTexture(brand, sub) {
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
  ctx.fillText(brand, 512, 64);
  ctx.fillStyle = 'rgba(150,180,205,.85)';
  ctx.font = '500 20px Arial';
  ctx.letterSpacing = '6px';
  ctx.fillText(sub, 512, 112);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const THEMES = {
  tokyo: {
    exposure: 1.03,
    background: 0x03060d,
    fogColor: 0x060b16,
    fogDensity: 0.0021,
    hemi: { sky: 0x8baac8, ground: 0x0b0a10, intensity: 1.65 },
    ambient: { color: 0x40546b, intensity: 1.05 },
    key: { color: 0xa9c9ef, intensity: 2.2, offset: [-60, 110, 35] },
    rim: { color: 0xff88a8, intensity: 0.1, offset: [80, 25, -90] },
    rain: true,
    bloom: { strength: 0.52, radius: 0.38, threshold: 0.9 },
    environmentIntensity: 0.8,
    sky: {
      top: 0x02040a, mid: 0x071426, horizon: 0x1b2c46, glow: 0x4b2050,
      band: 0.55, cityGlow: 0.4,
      orb: { pos: [-350, 290, 190], color: 0xe8f4ff, glow: 0x9fc8ff, size: 54, glowSize: 210, opacity: 0.55 },
      haze: [[620, -420, 0xff4b8b, 0.16], [-560, 520, 0x59edff, 0.16]],
      stars: { count: 700, color: 0x8caaca, size: 0.6, opacity: 0.5 },
    },
    road: {
      groundBase: [5, 9, 16], groundGlow: [28, 58, 86, 0.34],
      grid: 'rgba(96,158,198,.06)', speck: 'rgba(120,180,220,',
      asphalt: 0x8c9aa8, roughness: 0.29, metalness: 0.52,
    },
    edges: { left: 0x30cde2, right: 0xf02f70 },
    barrier: { wall: 0x111923, left: 0x21b7d1, right: 0xd82364, post: 0x33404b, reflector: 0xb5f6ff },
    kerb: { light: 0xe6f2f6, left: 0x30cde2, right: 0xf02f70 },
    gantry: { metal: 0x17222c, glow: 0x4de8ff, sign: '#59edff' },
    lamp: { pole: 0x253441, fixture: 0x8eeeff, a: 0x3acfff, b: 0xff3c88, intensity: 15, distance: 24, glowOpacity: 0.13 },
    stand: { concrete: 0x151d26, metal: 0x1b2733, palette: [0xd9e2ea, 0xff4b8b, 0x59edff, 0xffb15c, 0x8a4cf0, 0x14a06a] },
    props: { tire: 0x0a0c10, tireAlt: 0x191d22, boardA: 0xaee6ff, boardB: 0xffb3c8, brand: 'NEON APEX', sub: 'MIDNIGHT CIRCUIT' },
    minimap: { dark: 'rgba(2,5,10,.7)', mid: 'rgba(97,132,157,.45)', light: 'rgba(152,197,217,.25)', start: '#d9f7ff' },
    city: {
      style: 'towers', seed: 83, count: 48, radius: [270, 500], height: [20, 140], width: [10, 32], depth: [10, 32],
      textures: [[3, 205, 'glass'], [7, 28, 'residential'], [13, 200, 'office']],
      materials: [
        [0xffffff, 0xffffff, 0.72, 0.32, 0.28],
        [0xffffff, 0xffffff, 0.58, 0.62, 0.08],
        [0xffffff, 0xffffff, 0.66, 0.46, 0.24],
      ],
      podium: { seed: 41, hue: 210, tint: 0x233041, emissive: 0x44617a, intensity: 0.5, minHeight: 5, maxHeight: 14, grow: 1.28 },
      strips: [0x59edff, 0xff4b8b, 0x9d7cff], stripChance: 0.68,
      crownLightColors: [0xbfe6ff, 0xffd6b0, 0x9fd8ff],
      roofSigns: [
        ['APEX', 'NIGHT SERIES', '#59edff'],
        ['NEON', '24 HOUR', '#ae74ff'],
        ['TOKYO', 'BAY 01', '#ff4b8b'],
        ['APEX', 'MIDNIGHT', '#59edff'],
      ],
      facadeSigns: [
        ['HOTEL', 'TOKYO BAY', '#ff4b8b'],
        ['NEON', 'STUDIO', '#59edff'],
        ['24H', 'PARKING', '#ffb15c'],
      ],
      crownChance: 0.55, antennaChance: 0.55,
    },
    skyline: { color: 0x9fb3cc, seed: 29, hue: 210, count: 80, radius: [600, 820], height: [55, 260] },
    mountains: { color: 0x070b14 },
    billboards: [
      [0.09, -1, 'APEX', 'PUSH YOUR LIMITS', '#59edff'],
      [0.21, 1, '夜行者', 'OWN THE NIGHT', '#ff4b8b'],
      [0.36, -1, 'NITRO', 'FEEL THE VELOCITY', '#59edff'],
      [0.49, 1, 'TOKYO', 'BAY CIRCUIT 01', '#ffb15c'],
      [0.63, -1, 'DRIFT', 'FIND YOUR LINE', '#ff4b8b'],
      [0.78, 1, 'NEON', 'BEYOND THE GRID', '#59edff'],
      [0.91, -1, 'APEX', 'MIDNIGHT SERIES', '#ae74ff'],
    ],
  },
  harbor: {
    exposure: 1.0,
    background: 0x0b0a12,
    fogColor: 0x191722,
    fogDensity: 0.0024,
    hemi: { sky: 0xffc39a, ground: 0x0c1018, intensity: 1.35 },
    ambient: { color: 0x8a4a2e, intensity: 0.45 },
    key: { color: 0xffb27a, intensity: 1.8, offset: [120, 55, -80] },
    rim: { color: 0x2fa6c9, intensity: 0.6, offset: [-100, 30, 70] },
    rain: false,
    bloom: { strength: 0.42, radius: 0.36, threshold: 0.92 },
    environmentIntensity: 0.75,
    sky: {
      top: 0x0a1228, mid: 0x3a2a44, horizon: 0xd06a4a, glow: 0xff8a4a,
      band: 0.7, cityGlow: 0.25,
      orb: { pos: [430, 120, -520], color: 0xffd9a8, glow: 0xff8a5a, size: 60, glowSize: 240, opacity: 0.4 },
      haze: [[-500, 300, 0xffb15c, 0.08], [520, -420, 0xff8a4a, 0.06]],
      stars: null,
    },
    road: {
      groundBase: [8, 10, 14], groundGlow: [92, 62, 34, 0.3],
      grid: 'rgba(198,158,96,.06)', speck: 'rgba(210,170,120,',
      asphalt: 0x8b877d, roughness: 0.58, metalness: 0.1,
    },
    edges: { left: 0x59edff, right: 0xffb15c },
    barrier: { wall: 0x181a21, left: 0x2aa7c4, right: 0xd98235, post: 0x3d444c, reflector: 0xffddb0 },
    kerb: { light: 0xf3e7d2, left: 0x59edff, right: 0xffb15c },
    gantry: { metal: 0x25222a, glow: 0xffb15c, sign: '#ffb15c' },
    lamp: { pole: 0x3a3330, fixture: 0xffd6a0, a: 0xffb15c, b: 0x59edff, intensity: 11, distance: 22, glowOpacity: 0.14 },
    stand: { concrete: 0x1c1b20, metal: 0x2a2a30, palette: [0xf1e3ce, 0xffb15c, 0x59edff, 0xd4543f, 0x2e7d8f, 0xff8a4a] },
    props: { tire: 0x0b0d10, tireAlt: 0x1d2126, boardA: 0xffd6a0, boardB: 0x9fe9ff, brand: 'NEON APEX', sub: 'HARBOR DOCK' },
    minimap: { dark: 'rgba(8,6,5,.72)', mid: 'rgba(196,150,95,.42)', light: 'rgba(255,214,160,.26)', start: '#ffd6a0' },
    city: {
      style: 'harbor', seed: 137,
      warehouses: {
        perBatch: 16, radius: [270, 520], width: [22, 52], depth: [14, 32], height: [8, 26],
        textures: [[53, 26], [59, 175], [61, 35]],
        materials: [[0x232a30, 0x5a7480, 0.45], [0x2e2622, 0x8c6a4e, 0.5], [0x1e2a2c, 0x4f7d7c, 0.45]],
      },
      containers: {
        count: 168, groups: 36, radius: [236, 470],
        colors: [0xd4543f, 0x2e7d8f, 0xd9a33c, 0x3f5f8f, 0x6f8a4f, 0xa33d55],
      },
      cranes: [[0.18, -1], [0.46, 1], [0.72, -1]],
      roofSigns: [
        ['DOCK 07', 'CARGO LINE', '#ffb15c'],
        ['BAYLINE', 'FREIGHT', '#59edff'],
        ['CARGO', 'HEAVY LIFT', '#ffb15c'],
      ],
    },
    skyline: { color: 0x8a8b91, seed: 29, hue: 30, count: 60, radius: [620, 840], height: [35, 120] },
    mountains: null,
    billboards: [
      [0.08, -1, 'DOCK 07', 'NIGHT SHIFT', '#ffb15c'],
      [0.2, 1, 'CARGO', 'BAYLINE LOGISTICS', '#59edff'],
      [0.34, -1, 'BAY', 'CONTAINER TERMINAL', '#ffb15c'],
      [0.48, 1, 'DOCK', 'SHIFT 24H', '#59edff'],
      [0.62, -1, 'CRANE', 'HEAVY LIFT', '#ffb15c'],
      [0.76, 1, 'NEON', 'HARBOR DUSK', '#59edff'],
      [0.9, -1, 'APEX', 'MIDNIGHT FREIGHT', '#ae74ff'],
    ],
  },
  dawn: {
    exposure: 1.12,
    background: 0x1c2a3c,
    fogColor: 0x8191a6,
    fogDensity: 0.0018,
    hemi: { sky: 0xffe0c4, ground: 0x1c2635, intensity: 1.6 },
    ambient: { color: 0x9aa7b8, intensity: 0.45 },
    key: { color: 0xffc89b, intensity: 2.6, offset: [-140, 95, 120] },
    rim: { color: 0x78a7e0, intensity: 0.55, offset: [100, 30, -60] },
    rain: false,
    bloom: { strength: 0.32, radius: 0.42, threshold: 1.0 },
    environmentIntensity: 1.05,
    sky: {
      top: 0x16304f, mid: 0x4d6f92, horizon: 0xffc39a, glow: 0xff9a6d,
      band: 0.5, cityGlow: 0.2,
      orb: { pos: [-340, 120, 290], color: 0xfff2dc, glow: 0xffc08a, size: 70, glowSize: 300, opacity: 0.5 },
      haze: [[-520, -300, 0xffb08a, 0.1], [440, 360, 0x87d7ff, 0.06]],
      stars: null,
    },
    road: {
      groundBase: [16, 18, 24], groundGlow: [90, 80, 62, 0.2],
      grid: 'rgba(180,200,230,.05)', speck: 'rgba(210,220,235,',
      asphalt: 0xb8c0c6, roughness: 0.4, metalness: 0.32,
    },
    edges: { left: 0x8ff0ff, right: 0xff8a6b },
    barrier: { wall: 0x1c2632, left: 0x54b8d6, right: 0xe67a5e, post: 0x4a5560, reflector: 0xeaf8ff },
    kerb: { light: 0xf4efe8, left: 0x87d7ff, right: 0xff8a6b },
    gantry: { metal: 0x2a3542, glow: 0xffc39a, sign: '#ffc39a' },
    lamp: { pole: 0x39424d, fixture: 0xfff2dc, a: 0xffc39a, b: 0x87d7ff, intensity: 6, distance: 20, glowOpacity: 0.08 },
    stand: { concrete: 0x222b36, metal: 0x34404e, palette: [0xf4efe8, 0xffc39a, 0x87d7ff, 0xc3a6ff, 0xff8a6b, 0x9fb3cc] },
    props: { tire: 0x0d1013, tireAlt: 0x1c2127, boardA: 0xbfe9ff, boardB: 0xffd0ba, brand: 'AURORA', sub: 'MORNING RUN' },
    minimap: { dark: 'rgba(20,24,30,.7)', mid: 'rgba(148,168,190,.45)', light: 'rgba(220,234,248,.28)', start: '#ffd9c2' },
    city: {
      style: 'towers', seed: 211, count: 48, radius: [300, 560], height: [24, 170], width: [10, 34], depth: [10, 34],
      textures: [[23, 210, 'glass'], [31, 35, 'residential'], [37, 205, 'office']],
      materials: [
        [0xffffff, 0xffffff, 0.66, 0.34, 0.3],
        [0xffffff, 0xffffff, 0.52, 0.6, 0.1],
        [0xffffff, 0xffffff, 0.6, 0.48, 0.26],
      ],
      podium: { seed: 43, hue: 26, tint: 0x3b3540, emissive: 0xc08a6b, intensity: 0.6, minHeight: 5, maxHeight: 14, grow: 1.26 },
      strips: [0xffc39a, 0x87d7ff, 0xc3a6ff], stripChance: 0.55,
      crownLightColors: [0xffe0c4, 0xbfe6ff, 0xfff2e0],
      roofSigns: [
        ['AURORA', 'MORNING RUN', '#ffc39a'],
        ['SKYLINE', '05:42 LOCAL', '#87d7ff'],
        ['APEX', 'FIRST LIGHT', '#ffc39a'],
      ],
      facadeSigns: [
        ['AURORA', 'HOTEL', '#ffc39a'],
        ['SKY', 'LOUNGE', '#87d7ff'],
      ],
      crownChance: 0.6, antennaChance: 0.5,
    },
    skyline: { color: 0xb7c6d8, seed: 47, hue: 210, count: 80, radius: [620, 840], height: [50, 240] },
    mountains: { color: 0x3b4154 },
    billboards: [
      [0.09, -1, 'AURORA', 'MORNING RUN', '#ffc39a'],
      [0.21, 1, 'SKY', 'FIRST LIGHT', '#87d7ff'],
      [0.36, -1, 'APEX', 'DAYBREAK SERIES', '#ffc39a'],
      [0.49, 1, 'CITY', '05:42 LOCAL', '#c3a6ff'],
      [0.63, -1, 'DRIFT', 'FIND YOUR LINE', '#87d7ff'],
      [0.78, 1, 'NEON', 'BEYOND THE GRID', '#ffc39a'],
      [0.91, -1, 'APEX', 'SUNRISE CIRCUIT', '#c3a6ff'],
    ],
  },
};

export const TRACK_SCENES = {
  tokyo: {
    id: 'tokyo', index: '01', name: '东京湾夜环', code: 'TOKYO BAY', tag: '霓虹都市',
    distance: '1.14 KM', weather: '23:48 · 18°C · WET',
    description: '穿过雨夜，压住弯心。<br/>在东京湾环线，跑出你的完美一圈。',
    curve: [
      [0, 150], [70, 148], [125, 120], [160, 80], [180, 35], [195, -15], [185, -65], [155, -100],
      [145, -130], [105, -155], [55, -165], [0, -160], [-55, -145], [-105, -115], [-150, -95],
      [-180, -60], [-195, -10], [-190, 45], [-175, 85], [-150, 125], [-100, 148], [-50, 150],
    ],
    theme: THEMES.tokyo,
  },
  harbor: {
    id: 'harbor', index: '02', name: '港湾黄昏', code: 'HARBOR DUSK', tag: '集装箱码头',
    distance: '1.10 KM', weather: '19:12 · 24°C · CLEAR',
    description: '暮色落进码头，躲开集装箱的阴影。<br/>在港湾环线，抢下每一个弯角。',
    curve: [
      [-155, 115], [-105, 135], [-55, 130], [-10, 110], [30, 85], [75, 90], [120, 110], [165, 95],
      [190, 50], [185, 0], [160, -45], [125, -80], [80, -95], [35, -80], [-5, -55], [-45, -75],
      [-90, -100], [-140, -105], [-180, -75], [-200, -30], [-190, 20], [-185, 75],
    ],
    theme: THEMES.harbor,
  },
  dawn: {
    id: 'dawn', index: '03', name: '黎明高架', code: 'AURORA RING', tag: '晨光天际线',
    distance: '1.12 KM', weather: '05:42 · 12°C · DRY',
    description: '晨光切开天际线，顺着高架飞驰。<br/>在黎明环线，迎来第一圈。',
    curve: [
      [20, 150], [85, 135], [140, 105], [180, 60], [190, 0], [175, -60], [140, -110], [90, -145],
      [30, -160], [-35, -158], [-95, -140], [-145, -110], [-185, -65], [-205, -10], [-195, 55],
      [-160, 105], [-105, 135], [-45, 150],
    ],
    theme: THEMES.dawn,
  },
};

export class NeonTrack {
  constructor(scene, { sceneId = 'tokyo', pointLights = 8 } = {}) {
    this.scene = scene;
    this.sceneId = TRACK_SCENES[sceneId] ? sceneId : 'tokyo';
    this.sceneConfig = TRACK_SCENES[this.sceneId];
    this.theme = this.sceneConfig.theme;
    this.sampleCount = SAMPLE_COUNT;
    this.pointLights = pointLights;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.curve = new THREE.CatmullRomCurve3(
      this.sceneConfig.curve.map(([x, z]) => new THREE.Vector3(x, 0, z)),
      true,
      'centripetal'
    );
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

  dispose() {
    this.group.traverse((object) => {
      if (object.geometry && !object.isSprite) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          for (const key of Object.keys(material)) {
            const value = material[key];
            if (value && value.isTexture) value.dispose();
          }
          material.dispose();
        }
      }
    });
    this.scene.remove(this.group);
    this.group.clear();
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
    const sky = this.theme.sky;
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(sky.top) },
        midColor: { value: new THREE.Color(sky.mid) },
        horizonColor: { value: new THREE.Color(sky.horizon) },
        glowColor: { value: new THREE.Color(sky.glow) },
        bandStrength: { value: sky.band },
        cityStrength: { value: sky.cityGlow },
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
        uniform float bandStrength;
        uniform float cityStrength;
        void main() {
          float h = clamp(vDirection.y, -0.15, 1.0);
          vec3 color = mix(horizonColor, midColor, smoothstep(0.0, 0.3, h));
          color = mix(color, topColor, smoothstep(0.24, 0.85, h));
          float band = exp(-pow((h - 0.025) * 10.0, 2.0));
          color += glowColor * band * bandStrength;
          float city = exp(-pow((h - 0.13) * 18.0, 2.0));
          color += vec3(0.1, 0.26, 0.4) * city * cityStrength;
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
    if (sky.orb) {
      const orb = sky.orb;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture, color: orb.glow, transparent: true, opacity: orb.opacity,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }));
      glow.scale.set(orb.glowSize, orb.glowSize, 1);
      glow.position.set(...orb.pos);
      this.group.add(glow);
      const core = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture, color: orb.color, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }));
      core.scale.set(orb.size, orb.size, 1);
      core.position.copy(glow.position);
      this.group.add(core);
    }
    for (const [x, z, color, opacity] of sky.haze) {
      const haze = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture, color, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }));
      haze.scale.set(420, 240, 1);
      haze.position.set(x, 70, z);
      this.group.add(haze);
    }
  }

  buildRoad() {
    const theme = this.theme;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: makeGroundTexture(theme.road), roughness: 0.78, metalness: 0.3 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    ground.receiveShadow = true;
    this.group.add(ground);

    this.createRibbon(0, TRACK_WIDTH + 4.5, -0.035, new THREE.MeshStandardMaterial({
      color: 0x090d13, roughness: 0.62, metalness: 0.5,
    }));
    const asphalt = makeAsphaltTexture();
    const asphaltNormal = makeAsphaltNormalTexture();
    const asphaltRoughness = makeAsphaltRoughnessTexture();
    const road = this.createRibbon(0, TRACK_WIDTH, 0, new THREE.MeshStandardMaterial({
      color: theme.road.asphalt,
      map: asphalt,
      normalMap: asphaltNormal,
      normalScale: new THREE.Vector2(0.32, 0.32),
      roughnessMap: asphaltRoughness,
      roughness: theme.road.roughness,
      metalness: theme.road.metalness,
      envMapIntensity: 0.9,
    }));
    road.receiveShadow = true;

    const edgeLeft = new THREE.MeshBasicMaterial({ color: theme.edges.left, toneMapped: false });
    const edgeRight = new THREE.MeshBasicMaterial({ color: theme.edges.right, toneMapped: false });
    this.createRibbon(-TRACK_WIDTH / 2 + 0.3, 0.18, 0.025, edgeLeft);
    this.createRibbon(TRACK_WIDTH / 2 - 0.3, 0.18, 0.025, edgeRight);

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
    const theme = this.theme;
    const wallMaterial = new THREE.MeshStandardMaterial({ color: theme.barrier.wall, roughness: 0.34, metalness: 0.85 });
    const railCyan = new THREE.MeshBasicMaterial({ color: theme.barrier.left, toneMapped: false });
    const railPink = new THREE.MeshBasicMaterial({ color: theme.barrier.right, toneMapped: false });
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
    const postMaterial = new THREE.MeshStandardMaterial({ color: theme.barrier.post, metalness: 0.85, roughness: 0.3 });
    const postCount = 180;
    const posts = new THREE.InstancedMesh(postGeometry, postMaterial, postCount * 2);
    const reflectors = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.1, 0.12, 0.35),
      new THREE.MeshBasicMaterial({ color: theme.barrier.reflector, toneMapped: false }),
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
    const theme = this.theme;
    const { point, tangent } = this.frameAt(0);
    const gantry = new THREE.Group();
    gantry.position.copy(point);
    gantry.rotation.y = Math.atan2(tangent.x, tangent.z);
    const metal = new THREE.MeshStandardMaterial({ color: theme.gantry.metal, metalness: 0.9, roughness: 0.25 });
    const glow = new THREE.MeshBasicMaterial({ color: theme.gantry.glow, toneMapped: false });
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
      new THREE.MeshBasicMaterial({
        map: makeSignTexture('NEON APEX', `${this.sceneConfig.code} CIRCUIT`, theme.gantry.sign),
        toneMapped: false,
      })
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
    this.startGantry = gantry;
    this.group.add(gantry);
  }

  buildEnvironment() {
    const theme = this.theme;
    const rand = seededRandom(theme.city.seed);
    if (theme.city.style === 'harbor') this.buildHarborBlocks(rand);
    else this.buildTowerBlocks(rand);
    this.buildTrackLamps();
    this.buildSkyline(rand);
    this.buildStars();
    if (theme.mountains) this.buildMountains(rand);
  }

  buildTowerBlocks(rand) {
    const theme = this.theme;
    const city = theme.city;
    const perBatch = city.count;
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    buildingGeo.translate(0, 0.5, 0);
    const roundGeo = new THREE.CylinderGeometry(0.5, 0.52, 1, 16, 1, false);
    roundGeo.translate(0, 0.5, 0);
    const textures = city.textures.map(([seed, hue, style]) => makeTowerTextures(seed, hue, style));
    const records = [];
    const dummy = new THREE.Object3D();
    const tintColor = new THREE.Color();
    const tintPalettes = [
      [0xe8f3ff, 0xd7e6f7, 0xf6faff],
      [0xffe7cf, 0xf0d9c4, 0xfff1de],
      [0xdde8f0, 0xcbd9e4, 0xeff5fa],
    ];

    for (let batch = 0; batch < city.materials.length; batch++) {
      const [tint, emissive, emissiveIntensity, roughness, metalness] = city.materials[batch];
      const texture = textures[batch];
      const material = new THREE.MeshPhysicalMaterial({
        color: tint,
        map: texture.map,
        emissiveMap: texture.emissiveMap,
        emissive,
        emissiveIntensity,
        normalMap: texture.normalMap,
        normalScale: new THREE.Vector2(0.28, 0.28),
        roughnessMap: texture.roughnessMap,
        roughness,
        metalness,
        clearcoat: batch === 0 ? 0.55 : 0.18,
        clearcoatRoughness: 0.18,
        clearcoatNormalMap: texture.normalMap,
        clearcoatNormalScale: new THREE.Vector2(0.12, 0.12),
        envMapIntensity: metalness > 0.2 ? 1.25 : 0.7,
      });
      const shafts = new THREE.InstancedMesh(buildingGeo, material, perBatch);
      const crowns = new THREE.InstancedMesh(buildingGeo, material, perBatch);
      const roundShafts = new THREE.InstancedMesh(roundGeo, material, perBatch);
      const roundCrowns = new THREE.InstancedMesh(roundGeo, material, perBatch);
      const crowns2 = new THREE.InstancedMesh(buildingGeo, material, perBatch);
      for (let i = 0; i < perBatch; i++) {
        const angle = rand() * Math.PI * 2;
        const radius = city.radius[0] + rand() * (city.radius[1] - city.radius[0]);
        const width = city.width[0] + rand() * (city.width[1] - city.width[0]);
        const depth = city.depth[0] + rand() * (city.depth[1] - city.depth[0]);
        const height = city.height[0] + Math.pow(rand(), 1.7) * (city.height[1] - city.height[0]);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const rotation = rand() * Math.PI;
        const round = height > 55 && rand() < 0.14;
        const tintHex = tintPalettes[batch % tintPalettes.length][Math.floor(rand() * 3)];
        for (const mesh of [shafts, crowns, roundShafts, roundCrowns, crowns2]) {
          dummy.position.set(x, -100, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(0.001, 0.001, 0.001);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        dummy.position.set(x, -0.1, z);
        dummy.scale.set(width, height, depth);
        dummy.rotation.set(0, rotation, 0);
        dummy.updateMatrix();
        if (round) {
          roundShafts.setMatrixAt(i, dummy.matrix);
        } else {
          shafts.setMatrixAt(i, dummy.matrix);
        }
        shafts.setColorAt(i, tintColor.setHex(tintHex));
        roundShafts.setColorAt(i, tintColor.setHex(tintHex));
        let crownHeight = 0;
        let crown2Height = 0;
        if (height > 42 && rand() < city.crownChance) {
          crownHeight = 8 + rand() * 26;
          const crownWidth = width * (0.5 + rand() * 0.28);
          const crownDepth = depth * (0.5 + rand() * 0.28);
          dummy.position.set(x, height - 0.14, z);
          dummy.scale.set(crownWidth, crownHeight, crownDepth);
          dummy.rotation.set(0, rotation, 0);
          dummy.updateMatrix();
          const crownMesh = round ? roundCrowns : crowns;
          crownMesh.setMatrixAt(i, dummy.matrix);
          crownMesh.setColorAt(i, tintColor.setHex(tintHex));
          if (!round && rand() < 0.5) {
            crown2Height = 3 + rand() * 10;
            dummy.position.set(x, height + crownHeight, z);
            dummy.scale.set(width * 0.3, crown2Height, depth * 0.3);
            dummy.rotation.set(0, rotation, 0);
            dummy.updateMatrix();
            crowns2.setMatrixAt(i, dummy.matrix);
            crowns2.setColorAt(i, tintColor.setHex(tintHex));
          }
        }
        records.push({
          x, z, width, depth, height, rotation, crownHeight, crown2Height, round, batch,
          top: height + crownHeight + crown2Height,
        });
      }
      this.group.add(shafts, crowns, roundShafts, roundCrowns, crowns2);
    }

    const podiumTexture = makePodiumTexture(city.podium.seed, city.podium.hue);
    const podiumMaterial = new THREE.MeshStandardMaterial({
      color: 0xd6e1ea,
      map: podiumTexture,
      emissiveMap: podiumTexture,
      emissive: 0xffffff,
      emissiveIntensity: 0.7,
      roughness: 0.55,
      metalness: 0.25,
      envMapIntensity: 0.8,
    });
    const podiums = new THREE.InstancedMesh(buildingGeo, podiumMaterial, records.length);
    records.forEach((record, i) => {
      const podiumHeight = Math.min(city.podium.maxHeight, Math.max(city.podium.minHeight, record.height * 0.09));
      dummy.position.set(record.x, -0.12, record.z);
      dummy.scale.set(record.width * city.podium.grow, podiumHeight, record.depth * city.podium.grow);
      dummy.rotation.set(0, record.rotation, 0);
      dummy.updateMatrix();
      podiums.setMatrixAt(i, dummy.matrix);
    });
    this.group.add(podiums);

    const bandGeo = new THREE.BoxGeometry(1, 1, 1);
    const bandMaterial = new THREE.MeshStandardMaterial({
      color: 0x8292a0, metalness: 0.55, roughness: 0.35,
      emissive: 0x1b2630, emissiveIntensity: 0.25,
    });
    const bands = new THREE.InstancedMesh(bandGeo, bandMaterial, records.length * 3);
    let bandIndex = 0;
    for (const record of records) {
      for (const level of [0.32, 0.64, 0.94]) {
        if (record.round || record.height < 40) {
          dummy.position.set(record.x, -100, record.z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(0.001, 0.001, 0.001);
        } else {
          dummy.position.set(record.x, record.height * level, record.z);
          dummy.rotation.set(0, record.rotation, 0);
          dummy.scale.set(record.width * 1.045, 0.7, record.depth * 1.045);
        }
        dummy.updateMatrix();
        bands.setMatrixAt(bandIndex++, dummy.matrix);
      }
    }
    this.group.add(bands);

    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x596976, metalness: 0.6, roughness: 0.42,
      emissive: 0x243b49, emissiveIntensity: 0.35,
    });
    const canopies = new THREE.InstancedMesh(bandGeo, canopyMaterial, records.length);
    records.forEach((record, i) => {
      const podiumHeight = Math.min(city.podium.maxHeight, Math.max(city.podium.minHeight, record.height * 0.09));
      dummy.position.set(record.x, podiumHeight + 0.12, record.z);
      dummy.scale.set(record.width * city.podium.grow * 1.05, 0.26, record.depth * city.podium.grow * 1.05);
      dummy.rotation.set(0, record.rotation, 0);
      dummy.updateMatrix();
      canopies.setMatrixAt(i, dummy.matrix);
    });
    this.group.add(canopies);

    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d3946, metalness: 0.7, roughness: 0.32, envMapIntensity: 0.9,
    });
    const fins = new THREE.InstancedMesh(bandGeo, finMaterial, records.length * 6);
    let finIndex = 0;
    for (const record of records) {
      const cos = Math.cos(record.rotation);
      const sin = Math.sin(record.rotation);
      const show = !record.round && record.height > 35;
      for (const dzSign of [-1, 1]) {
        for (const finX of [-0.34, 0, 0.34]) {
          if (show) {
            const localX = record.width * finX;
            const localZ = dzSign * (record.depth * 0.5 + 0.09);
            dummy.position.set(
              record.x + localX * cos + localZ * sin,
              record.height * 0.5,
              record.z - localX * sin + localZ * cos
            );
            dummy.rotation.set(0, record.rotation, 0);
            dummy.scale.set(0.18, record.height, 0.28);
          } else {
            dummy.position.set(record.x, -100, record.z);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(0.001, 0.001, 0.001);
          }
          dummy.updateMatrix();
          fins.setMatrixAt(finIndex++, dummy.matrix);
        }
      }
    }
    this.group.add(fins);

    const balconyMaterial = new THREE.MeshStandardMaterial({
      color: 0x9ba7ae, metalness: 0.18, roughness: 0.58, envMapIntensity: 0.55,
    });
    const balconies = new THREE.InstancedMesh(bandGeo, balconyMaterial, records.length * 12);
    let balconyIndex = 0;
    for (const record of records) {
      const cos = Math.cos(record.rotation);
      const sin = Math.sin(record.rotation);
      const show = record.batch === 1 && !record.round && record.height > 35;
      for (const dzSign of [-1, 1]) {
        for (const level of [0.28, 0.5, 0.72]) {
          for (const balconyX of [-0.26, 0.26]) {
            if (show) {
              const localX = record.width * balconyX;
              const localZ = dzSign * (record.depth * 0.5 + 0.58);
              dummy.position.set(
                record.x + localX * cos + localZ * sin,
                record.height * level,
                record.z - localX * sin + localZ * cos
              );
              dummy.rotation.set(0, record.rotation, 0);
              dummy.scale.set(record.width * 0.3, 0.2, 1.15);
            } else {
              dummy.position.set(record.x, -100, record.z);
              dummy.rotation.set(0, 0, 0);
              dummy.scale.set(0.001, 0.001, 0.001);
            }
            dummy.updateMatrix();
            balconies.setMatrixAt(balconyIndex++, dummy.matrix);
          }
        }
      }
    }
    this.group.add(balconies);

    const crownLights = new THREE.InstancedMesh(
      bandGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      records.length * 4
    );
    const crownPalette = city.crownLightColors || [0xbfe6ff, 0xffd6b0];
    let crownIndex = 0;
    for (const record of records) {
      const cos = Math.cos(record.rotation);
      const sin = Math.sin(record.rotation);
      const y = record.top - 0.35;
      const edges = [
        [0, record.depth * 0.5, record.width * 1.02, 0.18],
        [0, -record.depth * 0.5, record.width * 1.02, 0.18],
        [record.width * 0.5, 0, 0.18, record.depth * 1.02],
        [-record.width * 0.5, 0, 0.18, record.depth * 1.02],
      ];
      for (const [dx, dz, sx, sz] of edges) {
        dummy.position.set(
          record.x + dx * cos + dz * sin,
          y,
          record.z - dx * sin + dz * cos
        );
        dummy.rotation.set(0, record.rotation, 0);
        dummy.scale.set(sx, 0.16, sz);
        dummy.updateMatrix();
        crownLights.setMatrixAt(crownIndex, dummy.matrix);
        crownLights.setColorAt(crownIndex, tintColor.setHex(crownPalette[crownIndex % crownPalette.length]));
        crownIndex++;
      }
    }
    this.group.add(crownLights);

    const stripGeo = new THREE.BoxGeometry(1, 1, 1);
    stripGeo.translate(0, 0.5, 0);
    const strips = new THREE.InstancedMesh(
      stripGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      records.length * 4
    );
    const color = new THREE.Color();
    let stripIndex = 0;
    for (const record of records) {
      const show = !record.round && record.height > 36 && rand() < city.stripChance;
      const cos = Math.cos(record.rotation);
      const sin = Math.sin(record.rotation);
      for (const cx of [-1, 1]) {
        for (const cz of [-1, 1]) {
          if (show) {
            const localX = cx * record.width * 0.495;
            const localZ = cz * record.depth * 0.495;
            dummy.position.set(
              record.x + localX * cos + localZ * sin,
              3,
              record.z - localX * sin + localZ * cos
            );
            dummy.rotation.set(0, record.rotation, 0);
            dummy.scale.set(0.28, record.height - 5, 0.28);
          } else {
            dummy.position.set(record.x, -100, record.z);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(0.001, 0.001, 0.001);
          }
          dummy.updateMatrix();
          strips.setMatrixAt(stripIndex, dummy.matrix);
          strips.setColorAt(stripIndex, color.setHex(city.strips[stripIndex % city.strips.length]));
          stripIndex++;
        }
      }
    }
    this.group.add(strips);

    const antennas = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.24, 1, 0.24).translate(0, 0.5, 0),
      new THREE.MeshStandardMaterial({ color: 0x24313f, metalness: 0.85, roughness: 0.4 }),
      records.length
    );
    const beacons = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.4, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2f43, toneMapped: false }),
      records.length
    );
    records.forEach((record, i) => {
      if (record.height > 55 && rand() < city.antennaChance) {
        const antennaHeight = 7 + rand() * 22;
        dummy.position.set(record.x, record.top, record.z);
        dummy.rotation.set(0, rand() * Math.PI, 0);
        dummy.scale.set(1, antennaHeight, 1);
        dummy.updateMatrix();
        antennas.setMatrixAt(i, dummy.matrix);
        dummy.position.set(record.x, record.top + antennaHeight, record.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(rand() < 0.45 ? 1 : 0.001);
        dummy.updateMatrix();
        beacons.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.position.set(record.x, -100, record.z);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.updateMatrix();
        antennas.setMatrixAt(i, dummy.matrix);
        beacons.setMatrixAt(i, dummy.matrix);
      }
    });
    this.group.add(antennas, beacons);

    const acUnits = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.6, 1.3, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x2b343d, metalness: 0.6, roughness: 0.5 }),
      records.length
    );
    records.forEach((record, i) => {
      if (record.height > 28) {
        const localX = (rand() - 0.5) * record.width * 0.4;
        const localZ = (rand() - 0.5) * record.depth * 0.4;
        const cos = Math.cos(record.rotation);
        const sin = Math.sin(record.rotation);
        dummy.position.set(
          record.x + localX * cos + localZ * sin,
          record.top + 0.65,
          record.z - localX * sin + localZ * cos
        );
        dummy.rotation.set(0, record.rotation, 0);
        dummy.scale.setScalar(0.6 + rand() * 0.9);
        dummy.updateMatrix();
        acUnits.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.position.set(record.x, -100, record.z);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.updateMatrix();
        acUnits.setMatrixAt(i, dummy.matrix);
      }
    });
    this.group.add(acUnits);

    const tall = [...records].sort((a, b) => b.height - a.height);
    city.roofSigns.forEach(([text, sub, signColor], i) => {
      const record = tall[i * 3 % tall.length];
      if (!record) return;
      const signGroup = new THREE.Group();
      signGroup.position.set(record.x, record.top + 5.2, record.z);
      signGroup.rotation.y = Math.atan2(-record.x, -record.z);
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(11.2, 2.8),
        new THREE.MeshBasicMaterial({ map: makeSignTexture(text, sub, signColor), side: THREE.DoubleSide, toneMapped: false })
      );
      signGroup.add(panel);
      const backing = new THREE.Mesh(
        new THREE.BoxGeometry(11.5, 3.1, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x0b1118, metalness: 0.6, roughness: 0.5 })
      );
      backing.position.z = -0.1;
      signGroup.add(backing);
      const supportMat = new THREE.MeshStandardMaterial({ color: 0x222f3a, metalness: 0.8, roughness: 0.35 });
      for (const sx of [-4, 4]) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.2, 0.18), supportMat);
        pole.position.set(sx, -2.4, 0);
        signGroup.add(pole);
      }
      this.group.add(signGroup);
    });

    if (city.facadeSigns?.length) {
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x111a24, metalness: 0.6, roughness: 0.45 });
      const nearTall = records
        .filter((record) => record.height > 52)
        .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))
        .slice(0, city.facadeSigns.length);
      city.facadeSigns.forEach(([text, sub, signColor], i) => {
        const record = nearTall[i];
        if (!record) return;
        const radius = Math.hypot(record.x, record.z) || 1;
        const dirX = -record.x / radius;
        const dirZ = -record.z / radius;
        const offset = Math.max(record.width, record.depth) * 0.5 + 0.32;
        const group = new THREE.Group();
        group.position.set(
          record.x + dirX * offset,
          Math.max(18, record.height * 0.55),
          record.z + dirZ * offset
        );
        group.rotation.y = Math.atan2(dirX, dirZ);
        const backing = new THREE.Mesh(new THREE.BoxGeometry(3.9, 13.6, 0.16), frameMat);
        backing.position.z = -0.08;
        group.add(backing);
        const panel = new THREE.Mesh(
          new THREE.PlaneGeometry(3.55, 13.2),
          new THREE.MeshBasicMaterial({
            map: makeVerticalSignTexture(text, sub, signColor),
            side: THREE.DoubleSide,
            toneMapped: false,
          })
        );
        panel.position.z = 0.06;
        group.add(panel);
        this.group.add(group);
      });
    }
  }

  buildHarborBlocks(rand) {
    const theme = this.theme;
    const city = theme.city;
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    buildingGeo.translate(0, 0.5, 0);
    const dummy = new THREE.Object3D();
    const warehouseTextures = city.warehouses.textures.map(([seed, hue]) => makeWarehouseTextures(seed, hue));
    const records = [];
    for (let batch = 0; batch < city.warehouses.materials.length; batch++) {
      const texture = warehouseTextures[batch];
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: texture.map,
        emissiveMap: texture.emissiveMap,
        emissive: 0xffffff,
        emissiveIntensity: 0.8,
        roughness: 0.5,
        metalness: 0.35,
        envMapIntensity: 0.9,
      });
      const perBatch = city.warehouses.perBatch;
      const warehouses = new THREE.InstancedMesh(buildingGeo, material, perBatch);
      for (let i = 0; i < perBatch; i++) {
        const angle = rand() * Math.PI * 2;
        const radius = city.warehouses.radius[0] + rand() * (city.warehouses.radius[1] - city.warehouses.radius[0]);
        const width = city.warehouses.width[0] + rand() * (city.warehouses.width[1] - city.warehouses.width[0]);
        const depth = city.warehouses.depth[0] + rand() * (city.warehouses.depth[1] - city.warehouses.depth[0]);
        const height = city.warehouses.height[0] + rand() * (city.warehouses.height[1] - city.warehouses.height[0]);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const rotation = rand() * Math.PI * 2;
        dummy.position.set(x, -0.1, z);
        dummy.scale.set(width, height, depth);
        dummy.rotation.set(0, rotation, 0);
        dummy.updateMatrix();
        warehouses.setMatrixAt(i, dummy.matrix);
        records.push({ x, z, width, depth, height, rotation });
      }
      this.group.add(warehouses);
    }

    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x606b76, metalness: 0.55, roughness: 0.38,
      side: THREE.DoubleSide, envMapIntensity: 0.9,
    });
    const roofs = new THREE.InstancedMesh(makeGableRoofGeometry(), roofMaterial, records.length);
    records.forEach((record, i) => {
      const roofHeight = 2 + record.width * 0.12;
      dummy.position.set(record.x, record.height - 0.08, record.z);
      dummy.scale.set(record.width * 1.02, roofHeight, record.depth * 1.02);
      dummy.rotation.set(0, record.rotation, 0);
      dummy.updateMatrix();
      roofs.setMatrixAt(i, dummy.matrix);
    });
    this.group.add(roofs);

    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x8c99a4, metalness: 0.55, roughness: 0.42,
      emissive: 0x2a3b46, emissiveIntensity: 0.3,
    });
    const canopies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), canopyMaterial, records.length);
    records.forEach((record, i) => {
      const canopyY = Math.min(5.2, record.height * 0.32);
      dummy.position.set(record.x, canopyY, record.z);
      dummy.scale.set(record.width * 1.07, 0.32, record.depth * 1.07);
      dummy.rotation.set(0, record.rotation, 0);
      dummy.updateMatrix();
      canopies.setMatrixAt(i, dummy.matrix);
    });
    this.group.add(canopies);

    const siloMaterial = new THREE.MeshStandardMaterial({
      color: 0xa5b0b8, metalness: 0.7, roughness: 0.32, envMapIntensity: 1.2,
    });
    const siloGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 20, 1, false);
    siloGeo.translate(0, 0.5, 0);
    const siloCount = 10;
    const silos = new THREE.InstancedMesh(siloGeo, siloMaterial, siloCount);
    const siloDomes = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      siloMaterial,
      siloCount
    );
    for (let i = 0; i < siloCount; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 300 + rand() * 200;
      const siloRadius = 4 + rand() * 4;
      const siloHeight = 18 + rand() * 16;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      dummy.position.set(x, -0.02, z);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(siloRadius * 2, siloHeight, siloRadius * 2);
      dummy.updateMatrix();
      silos.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, siloHeight - 0.02, z);
      dummy.scale.set(siloRadius * 2, siloRadius * 0.9, siloRadius * 2);
      dummy.updateMatrix();
      siloDomes.setMatrixAt(i, dummy.matrix);
    }
    this.group.add(silos, siloDomes);
    const containerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: makeContainerTexture(),
      roughness: 0.55,
      metalness: 0.42,
    });
    const containerGeo = new THREE.BoxGeometry(1, 1, 1);
    containerGeo.translate(0, 0.5, 0);
    const containers = new THREE.InstancedMesh(containerGeo, containerMat, city.containers.count);
    const containerColor = new THREE.Color();
    let index = 0;
    for (let group = 0; group < city.containers.groups && index < city.containers.count; group++) {
      const angle = rand() * Math.PI * 2;
      const radius = city.containers.radius[0] + rand() * (city.containers.radius[1] - city.containers.radius[0]);
      const baseX = Math.cos(angle) * radius;
      const baseZ = Math.sin(angle) * radius;
      const rotation = rand() * Math.PI * 2;
      const rows = 2 + Math.floor(rand() * 3);
      const layers = 2 + Math.floor(rand() * 4);
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      for (let row = 0; row < rows && index < city.containers.count; row++) {
        for (let layer = 0; layer < layers && index < city.containers.count; layer++) {
          const localX = (row - rows / 2) * 6.15;
          dummy.position.set(baseX + localX * cos, 0.12 + layer * 2.56, baseZ - localX * sin);
          dummy.rotation.set(0, rotation, 0);
          dummy.scale.set(6.05, 2.5, 2.45);
          dummy.updateMatrix();
          containers.setMatrixAt(index, dummy.matrix);
          containers.setColorAt(index, containerColor.setHex(city.containers.colors[Math.floor(rand() * city.containers.colors.length)]));
          index++;
        }
      }
    }
    for (; index < city.containers.count; index++) {
      dummy.position.set(0, -100, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.updateMatrix();
      containers.setMatrixAt(index, dummy.matrix);
      containers.setColorAt(index, containerColor.setHex(0x000000));
    }
    this.group.add(containers);

    const sideStacks = [[0.11, -1], [0.25, 1], [0.4, -1], [0.55, 1], [0.7, -1], [0.85, 1]];
    const sideContainers = new THREE.InstancedMesh(containerGeo, containerMat, sideStacks.length * 6);
    let sideIndex = 0;
    for (const [t, side] of sideStacks) {
      const { point, tangent, normal } = this.frameAt(t);
      const baseX = point.x + normal.x * side * 22;
      const baseZ = point.z + normal.z * side * 22;
      const heading = Math.atan2(tangent.x, tangent.z) + Math.PI / 2;
      for (const row of [-1, 1]) {
        for (let layer = 0; layer < 3; layer++) {
          dummy.position.set(baseX + tangent.x * row * 6.2, 0.12 + layer * 2.56, baseZ + tangent.z * row * 6.2);
          dummy.rotation.set(0, heading, 0);
          dummy.scale.set(6.05, 2.5, 2.45);
          dummy.updateMatrix();
          sideContainers.setMatrixAt(sideIndex, dummy.matrix);
          sideContainers.setColorAt(sideIndex, containerColor.setHex(city.containers.colors[(sideIndex * 3) % city.containers.colors.length]));
          sideIndex++;
        }
      }
    }
    this.group.add(sideContainers);

    for (const [t, side] of city.cranes) this.buildCrane(t, side);

    const tall = [...records].sort((a, b) => b.height - a.height);
    city.roofSigns.forEach(([text, sub, signColor], i) => {
      const record = tall[i % tall.length];
      if (!record) return;
      const signGroup = new THREE.Group();
      signGroup.position.set(record.x, record.height + 2.4, record.z);
      signGroup.rotation.y = Math.atan2(-record.x, -record.z);
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 3),
        new THREE.MeshBasicMaterial({ map: makeSignTexture(text, sub, signColor), side: THREE.DoubleSide, toneMapped: false })
      );
      signGroup.add(panel);
      const supportMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.75, roughness: 0.4 });
      for (const sx of [-4.2, 4.2]) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 0.16), supportMat);
        pole.position.set(sx, -1.8, 0);
        signGroup.add(pole);
      }
      this.group.add(signGroup);
    });
  }

  buildCrane(t, side) {
    const { point, tangent, normal } = this.frameAt(t);
    const group = new THREE.Group();
    group.position.copy(point).addScaledVector(normal, side * 40);
    group.rotation.y = Math.atan2(tangent.x, tangent.z) + (side < 0 ? Math.PI : 0);
    const metal = new THREE.MeshStandardMaterial({ color: 0x3a4149, metalness: 0.85, roughness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x181d23, metalness: 0.8, roughness: 0.45 });
    const accent = new THREE.MeshStandardMaterial({ color: this.theme.edges.right, metalness: 0.4, roughness: 0.4, emissive: this.theme.edges.right, emissiveIntensity: 0.35 });
    const h = 26;
    for (const x of [-7, 7]) {
      for (const z of [-5, 5]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, h, 0.7), metal);
        leg.position.set(x, h / 2, z);
        leg.castShadow = true;
        group.add(leg);
      }
    }
    for (const z of [-5, 5]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(15, 0.7, 0.7), metal);
      beam.position.set(0, h, z);
      group.add(beam);
    }
    for (const x of [-7, 7]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 10.5), metal);
      beam.position.set(x, h, 0);
      group.add(beam);
    }
    const boom = new THREE.Mesh(new THREE.BoxGeometry(40, 1.1, 1.1), metal);
    boom.position.set(8, h + 1.2, 0);
    boom.castShadow = true;
    group.add(boom);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(9, 2.4, 5), dark);
    counter.position.set(-11.5, h + 1.5, 0);
    group.add(counter);
    const trolley = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 3.4), accent);
    trolley.position.set(12, h - 0.2, 0);
    group.add(trolley);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.1, 18, 0.1), dark);
    cable.position.set(12, h - 9.5, 0);
    group.add(cable);
    const hanging = new THREE.Mesh(
      new THREE.BoxGeometry(6.05, 2.5, 2.45),
      new THREE.MeshStandardMaterial({ color: this.theme.city.containers.colors[1], map: makeContainerTexture(), roughness: 0.55, metalness: 0.42 })
    );
    hanging.position.set(12, 5.2, 0);
    hanging.castShadow = true;
    group.add(hanging);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2f43, toneMapped: false }));
    beacon.position.set(8, h + 2.1, 0);
    group.add(beacon);
    this.group.add(group);
  }

  buildTrackLamps() {
    const theme = this.theme;
    const poleMat = new THREE.MeshStandardMaterial({ color: theme.lamp.pole, metalness: 0.85, roughness: 0.3 });
    const lampMat = new THREE.MeshBasicMaterial({ color: theme.lamp.fixture, toneMapped: false });
    const lightStep = this.pointLights > 0 ? Math.max(1, Math.floor(32 / this.pointLights)) : 0;
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.11, 7.5, 6);
    poleGeo.translate(0, 3.75, 0);
    const poleInstances = new THREE.InstancedMesh(poleGeo, poleMat, 32);
    const armInstances = new THREE.InstancedMesh(new THREE.BoxGeometry(3.2, 0.09, 0.09), poleMat, 32);
    const lampInstances = new THREE.InstancedMesh(new THREE.BoxGeometry(1.15, 0.09, 0.38), lampMat, 32);
    const dummy = new THREE.Object3D();
    const glowPositions = [];
    for (let i = 0; i < 32; i++) {
      const t = i / 32;
      const { point, tangent, normal } = this.frameAt(t);
      const side = i % 2 ? 1 : -1;
      const heading = Math.atan2(tangent.x, tangent.z);
      dummy.rotation.set(0, heading, 0);
      dummy.position.set(point.x + normal.x * side * 12.3, 0, point.z + normal.z * side * 12.3);
      dummy.updateMatrix();
      poleInstances.setMatrixAt(i, dummy.matrix);
      dummy.position.set(point.x + normal.x * side * 10.85, 7.45, point.z + normal.z * side * 10.85);
      dummy.updateMatrix();
      armInstances.setMatrixAt(i, dummy.matrix);
      dummy.position.set(point.x + normal.x * side * 9.55, 7.36, point.z + normal.z * side * 9.55);
      dummy.updateMatrix();
      lampInstances.setMatrixAt(i, dummy.matrix);
      glowPositions.push({
        x: point.x + normal.x * side * 9.55,
        z: point.z + normal.z * side * 9.55,
        color: i % 8 === 0 ? theme.lamp.a : theme.lamp.b,
      });
      if (lightStep && this.pointLights > 0 && i % lightStep === 0 && i / lightStep < this.pointLights && theme.lamp.intensity > 0) {
        const light = new THREE.PointLight(i % 8 === 0 ? theme.lamp.a : theme.lamp.b, theme.lamp.intensity, theme.lamp.distance, 2);
        light.position.set(point.x + normal.x * side * 12.3, 5.8, point.z + normal.z * side * 12.3);
        this.group.add(light);
      }
    }
    this.group.add(poleInstances, armInstances, lampInstances);

    const lampGlows = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(5.4, 5.4),
      new THREE.MeshBasicMaterial({
        map: makeGlowTexture(), transparent: true, opacity: theme.lamp.glowOpacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
      glowPositions.length
    );
    const glowColor = new THREE.Color();
    glowPositions.forEach((glow, index) => {
      dummy.position.set(glow.x, 0.05, glow.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      lampGlows.setMatrixAt(index, dummy.matrix);
      lampGlows.setColorAt(index, glowColor.setHex(glow.color).multiplyScalar(0.85));
    });
    this.group.add(lampGlows);
  }

  buildSkyline(rand) {
    const config = this.theme.skyline;
    if (!config) return;
    const skylineGeo = new THREE.BoxGeometry(1, 1, 1);
    skylineGeo.translate(0, 0.5, 0);
    const skylineMat = new THREE.MeshBasicMaterial({
      color: config.color,
      map: makeTowerTextures(config.seed, config.hue, 'glass').map,
      fog: false,
    });
    const skyline = new THREE.InstancedMesh(skylineGeo, skylineMat, config.count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < config.count; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = config.radius[0] + rand() * (config.radius[1] - config.radius[0]);
      dummy.position.set(Math.cos(angle) * radius, -0.2, Math.sin(angle) * radius);
      dummy.scale.set(14 + rand() * 36, config.height[0] + Math.pow(rand(), 1.5) * (config.height[1] - config.height[0]), 14 + rand() * 36);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.updateMatrix();
      skyline.setMatrixAt(i, dummy.matrix);
    }
    this.group.add(skyline);
  }

  buildStars() {
    const config = this.theme.sky.stars;
    if (!config) return;
    const rand = seededRandom(17);
    const positions = [];
    for (let i = 0; i < config.count; i++) {
      const r = 450 + rand() * 400;
      const a = rand() * Math.PI * 2;
      positions.push(Math.cos(a) * r, 100 + rand() * 320, Math.sin(a) * r);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const stars = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: config.color, size: config.size, transparent: true, opacity: config.opacity, depthWrite: false, fog: false,
    }));
    this.group.add(stars);
  }

  buildMountains(rand) {
    const config = this.theme.mountains;
    if (!config) return;
    const mountainMat = new THREE.MeshBasicMaterial({ color: config.color, side: THREE.DoubleSide, fog: false });
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(70 + rand() * 80, 80 + rand() * 100, 5), mountainMat);
      cone.position.set(Math.cos(angle) * 560, 20, Math.sin(angle) * 560);
      this.group.add(cone);
    }
  }

  buildBillboards() {
    const theme = this.theme;
    for (const [t, side, text, sub, color] of theme.billboards) {
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
      const supports = new THREE.MeshStandardMaterial({ color: theme.gantry.metal, metalness: 0.8, roughness: 0.35 });
      for (const x of [-3.5, 3.5]) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3, 0.15), supports);
        pole.position.set(x, 1.5, 0);
        group.add(pole);
      }
      this.group.add(group);
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
        kerbs.setColorAt(n, color.setHex(white ? this.theme.kerb.light : (side < 0 ? this.theme.kerb.left : this.theme.kerb.right)));
        n++;
      }
    });
    this.group.add(kerbs);
  }

  buildGrandstand() {
    const theme = this.theme;
    const { point, tangent, normal } = this.frameAt(0.952);
    const group = new THREE.Group();
    group.position.copy(point).addScaledVector(normal, 21.5);
    group.rotation.y = Math.atan2(tangent.x, tangent.z);
    const concrete = new THREE.MeshStandardMaterial({ color: theme.stand.concrete, roughness: 0.82, metalness: 0.16 });
    const metal = new THREE.MeshStandardMaterial({ color: theme.stand.metal, metalness: 0.8, roughness: 0.35 });
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
    const palette = theme.stand.palette;
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
    const theme = this.theme;
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
        tires.setColorAt(n, color.setHex(level % 2 ? theme.props.tireAlt : theme.props.tire));
        n++;
      }
    }
    this.group.add(tires);

    const boardTexture = makePitBoardTexture(theme.props.brand, theme.props.sub);
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
        boards.setColorAt(i, color.setHex(side < 0 ? theme.props.boardA : theme.props.boardB));
      }
      this.group.add(boards);
    }
  }
}
