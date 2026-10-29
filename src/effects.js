import * as THREE from 'three';

function particleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,.85)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

class ParticlePool {
  constructor(scene, max, options) {
    this.max = max;
    this.cursor = 0;
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.velocities = Array.from({ length: max }, () => new THREE.Vector3());
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.gravity = options.gravity || 0;
    this.drag = options.drag || 0;
    for (let i = 0; i < max; i++) this.positions[i * 3 + 1] = -1000;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.PointsMaterial({
      size: options.size,
      map: particleTexture(),
      transparent: true,
      opacity: options.opacity,
      vertexColors: true,
      depthWrite: false,
      blending: options.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      sizeAttenuation: true,
      toneMapped: !options.additive,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  emit(position, velocity, life, color) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    this.positions[i * 3] = position.x;
    this.positions[i * 3 + 1] = position.y;
    this.positions[i * 3 + 2] = position.z;
    this.velocities[i].copy(velocity);
    this.life[i] = this.maxLife[i] = life;
    this.colors[i * 3] = color.r;
    this.colors[i * 3 + 1] = color.g;
    this.colors[i * 3 + 2] = color.b;
  }

  clear() {
    for (let i = 0; i < this.max; i++) {
      this.life[i] = 0;
      this.positions[i * 3 + 1] = -1000;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = -1000;
        continue;
      }
      const velocity = this.velocities[i];
      velocity.y += this.gravity * dt;
      velocity.multiplyScalar(Math.max(0, 1 - this.drag * dt));
      this.positions[i * 3] += velocity.x * dt;
      this.positions[i * 3 + 1] += velocity.y * dt;
      this.positions[i * 3 + 2] += velocity.z * dt;
      const fade = Math.max(0.08, this.life[i] / this.maxLife[i]);
      this.colors[i * 3] *= 0.985 + fade * 0.015;
      this.colors[i * 3 + 1] *= 0.985 + fade * 0.015;
      this.colors[i * 3 + 2] *= 0.985 + fade * 0.015;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

export class RacingEffects {
  constructor(scene) {
    this.scene = scene;
    this.smoke = new ParticlePool(scene, 340, { size: 0.85, opacity: 0.24, gravity: 0.25, drag: 1.5 });
    this.sparks = new ParticlePool(scene, 220, { size: 0.13, opacity: 0.95, gravity: -12, drag: 0.3, additive: true });
    this.nitro = new ParticlePool(scene, 180, { size: 0.2, opacity: 0.75, gravity: 0, drag: 2, additive: true });
    this.skidCursor = 0;
    this.skidTimer = 0;
    this.skidDummy = new THREE.Object3D();
    this.smokeColor = new THREE.Color(0.32, 0.39, 0.45);
    this.sparkColor = new THREE.Color();
    this.nitroColors = [new THREE.Color(0x4de8ff), new THREE.Color(0x766cff)];
    this.tmpPosition = new THREE.Vector3();
    this.tmpVelocity = new THREE.Vector3();
    this.skidMarks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.16, 0.006, 0.75),
      new THREE.MeshBasicMaterial({ color: 0x030406, transparent: true, opacity: 0.68 }),
      600
    );
    this.skidMarks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.skidMarks.frustumCulled = false;
    this.hiddenSkidMatrix = new THREE.Matrix4().makeTranslation(0, -100, 0);
    for (let i = 0; i < 600; i++) this.skidMarks.setMatrixAt(i, this.hiddenSkidMatrix);
    scene.add(this.skidMarks);
    this.buildRain();
  }

  reset() {
    this.smoke.clear();
    this.sparks.clear();
    this.nitro.clear();
    this.clearSkids();
  }

  clearSkids() {
    for (let i = 0; i < 600; i++) this.skidMarks.setMatrixAt(i, this.hiddenSkidMatrix);
    this.skidMarks.instanceMatrix.needsUpdate = true;
    this.skidCursor = 0;
  }

  buildRain() {
    this.rainCount = 360;
    this.rainDrops = [];
    this.rainPositions = new Float32Array(this.rainCount * 6);
    for (let i = 0; i < this.rainCount; i++) {
      this.rainDrops.push(new THREE.Vector3((Math.random() - 0.5) * 90, Math.random() * 45, (Math.random() - 0.5) * 90));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3).setUsage(THREE.DynamicDrawUsage));
    this.rain = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
      color: 0x92b7ce, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);
  }

  emitDrift(position, velocity, intensity = 1) {
    const count = Math.random() < intensity ? 2 : 1;
    for (let i = 0; i < count; i++) {
      this.tmpPosition.copy(position);
      this.tmpPosition.x += (Math.random() - 0.5) * 0.25;
      this.tmpPosition.z += (Math.random() - 0.5) * 0.25;
      this.tmpVelocity.set(
        -velocity.x * 0.08 + (Math.random() - 0.5),
        0.4 + Math.random() * 0.5,
        -velocity.z * 0.08 + (Math.random() - 0.5)
      );
      this.smoke.emit(this.tmpPosition, this.tmpVelocity, 0.65 + Math.random() * 0.6, this.smokeColor);
    }
  }

  emitCollision(position, normal) {
    for (let i = 0; i < 34; i++) {
      this.tmpVelocity.copy(normal).multiplyScalar(3 + Math.random() * 9);
      this.tmpVelocity.x += (Math.random() - 0.5) * 8;
      this.tmpVelocity.z += (Math.random() - 0.5) * 8;
      this.tmpVelocity.y = 2 + Math.random() * 7;
      this.sparkColor.setHSL(0.07 + Math.random() * 0.05, 1, 0.55 + Math.random() * 0.3);
      this.sparks.emit(position, this.tmpVelocity, 0.25 + Math.random() * 0.65, this.sparkColor);
    }
  }

  emitNitro(position, backward, speed) {
    for (let i = 0; i < 2; i++) {
      this.tmpVelocity.copy(backward).multiplyScalar(9 + Math.random() * 8 + speed * 0.08);
      this.tmpVelocity.x += (Math.random() - 0.5) * 1.5;
      this.tmpVelocity.y += (Math.random() - 0.5) * 0.5;
      this.tmpVelocity.z += (Math.random() - 0.5) * 1.5;
      this.nitro.emit(position, this.tmpVelocity, 0.18 + Math.random() * 0.25, this.nitroColors[Math.random() > 0.5 ? 1 : 0]);
    }
  }

  addSkid(position, heading) {
    this.skidDummy.position.copy(position);
    this.skidDummy.position.y = 0.038;
    this.skidDummy.rotation.set(0, heading, 0);
    this.skidDummy.updateMatrix();
    this.skidMarks.setMatrixAt(this.skidCursor, this.skidDummy.matrix);
    this.skidCursor = (this.skidCursor + 1) % 600;
    this.skidMarks.instanceMatrix.needsUpdate = true;
  }

  update(dt, focus, speed = 0) {
    this.smoke.update(dt);
    this.sparks.update(dt);
    this.nitro.update(dt);
    for (let i = 0; i < this.rainCount; i++) {
      const drop = this.rainDrops[i];
      drop.y -= dt * 32;
      if (drop.y < 0 || Math.abs(drop.x - focus.x) > 55 || Math.abs(drop.z - focus.z) > 55) {
        drop.set(focus.x + (Math.random() - 0.5) * 90, 20 + Math.random() * 30, focus.z + (Math.random() - 0.5) * 90);
      }
      const j = i * 6;
      this.rainPositions[j] = drop.x;
      this.rainPositions[j + 1] = drop.y;
      this.rainPositions[j + 2] = drop.z;
      this.rainPositions[j + 3] = drop.x - 0.05;
      this.rainPositions[j + 4] = drop.y + 0.65 + speed * 0.004;
      this.rainPositions[j + 5] = drop.z + 0.12;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }
}
