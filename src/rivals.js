import * as THREE from 'three';
import { SportsCar } from './car.js';

const RIVAL_SETUPS = [
  { name: 'AKIRA', variant: 'muscle', color: 0x1f5de0, accent: 0xeef2f6, lane: -4.5, grid: 12, speed: 50, phase: 0.4, weave: 0.55, wobble: 1.1, corner: 0.85 },
  { name: 'RYU', variant: 'hyper', color: 0xd9a410, accent: 0x121418, lane: 4.6, grid: 16, speed: 54, phase: 1.9, weave: 0.8, wobble: 1.3, corner: 0.83 },
  { name: 'MIRA', variant: 'roadster', color: 0x14a06a, accent: 0xf3e9d2, lane: 0, grid: 20, speed: 47, phase: 3.2, weave: 0.95, wobble: 0.9, corner: 0.87 },
  { name: 'KAI', variant: 'prototype', color: 0x8a4cf0, accent: 0x59edff, lane: -4.7, grid: 24, speed: 55, phase: 4.6, weave: 0.5, wobble: 1.2, corner: 0.82 },
  { name: 'ZERO', variant: 'rally', color: 0x6f7d8c, accent: 0xff2f70, lane: 4.7, grid: 28, speed: 46, phase: 5.8, weave: 0.9, wobble: 1.4, corner: 0.88 },
  { name: 'NOVA', variant: 'formula', color: 0xff5a1f, accent: 0x111317, lane: -0.6, grid: 32, speed: 53, phase: 7.1, weave: 0.7, wobble: 1.0, corner: 0.84 },
  { name: 'VEGA', variant: 'targa', color: 0xe8e9ec, accent: 0xff4b8b, lane: 2.6, grid: 36, speed: 49, phase: 8.4, weave: 1.05, wobble: 0.8, corner: 0.86 },
];
const ZERO_VELOCITY = new THREE.Vector3();
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

export class RivalManager {
  constructor(scene, track, effects, { laps, count = RIVAL_SETUPS.length, onWreck, onBump } = {}) {
    this.track = track;
    this.effects = effects;
    this.laps = laps;
    this.onWreck = onWreck;
    this.onBump = onBump;
    this.contact = new THREE.Vector3();
    this.normal = new THREE.Vector3();
    this.rivals = RIVAL_SETUPS.slice(0, Math.min(count, RIVAL_SETUPS.length)).map((config) => {
      const car = new SportsCar(scene, { variant: config.variant, paintColor: config.color, accentColor: config.accent, isAI: true });
      return {
        config, car, position: new THREE.Vector3(), t: 0, lane: 0, baseLane: 0, prevLane: 0,
        speed: 0, targetSpeed: 0, progress: 0, spawnProgress: 0, cooldown: 0, wrecked: false, finished: false,
        wreckTimer: 0, wreckSpin: 0, wreckTilt: 1, hideTimer: 0,
        mapColor: `#${config.color.toString(16).padStart(6, '0')}`,
      };
    });
    this.totalCars = this.rivals.length + 1;
    this.reset();
  }

  reset() {
    for (const rival of this.rivals) {
      rival.t = ((this.track.startT + rival.config.grid / this.track.length) % 1);
      rival.spawnProgress = rival.progress = rival.t;
      rival.lane = rival.baseLane = rival.prevLane = rival.config.lane;
      rival.speed = 0;
      rival.targetSpeed = 0;
      rival.cooldown = 0;
      rival.wrecked = false;
      rival.finished = false;
      rival.wreckTimer = 0;
      rival.wreckSpin = 0;
      rival.wreckTilt = 1;
      rival.hideTimer = 0;
      rival.car.group.visible = true;
      rival.car.visual.rotation.set(0, 0, 0);
      rival.car.visual.position.y = 0;
      this.place(rival);
      rival.car.update({ speed: 0, steering: 0, driftAngle: 0, braking: false, boosting: false, time: 0 });
    }
  }

  place(rival) {
    const frame = this.track.frameAt(rival.t);
    rival.position.copy(frame.point).addScaledVector(frame.normal, rival.lane);
    rival.position.y = 0.02;
    rival.car.group.position.copy(rival.position);
    rival.car.group.rotation.y = Math.atan2(frame.tangent.x, frame.tangent.z);
  }

  update(dt, time, playerState) {
    if (playerState.mode !== 'racing') return;
    this.handlePlayerCollision(playerState, dt);
    for (const rival of this.rivals) {
      rival.cooldown = Math.max(0, rival.cooldown - dt);
      if (rival.wrecked) {
        this.updateWrecked(rival, dt);
        continue;
      }
      if (rival.finished) {
        rival.hideTimer += dt;
        if (rival.hideTimer > 1.2) rival.car.group.visible = false;
        continue;
      }
      const current = this.track.frameAt(rival.t);
      const ahead = this.track.frameAt(rival.t + 0.015);
      const straightness = clamp(current.tangent.dot(ahead.tangent), 0, 1);
      const cornerSpeed = rival.config.corner ?? 0.8;
      const base = rival.config.speed * (cornerSpeed + (1 - cornerSpeed) * straightness);
      const rivalCovered = rival.progress - rival.spawnProgress;
      const playerCovered = playerState.progress - (playerState.startProgress || 0);
      const gap = rivalCovered - playerCovered;
      const rubber = clamp(1 - gap * 0.65, 0.85, 1.12);
      const wobble = Math.sin(time * 0.85 + rival.config.phase) * rival.config.wobble;
      rival.targetSpeed = Math.max(18, base * rubber + wobble);
      rival.speed = lerp(rival.speed, rival.targetSpeed, 1 - Math.exp(-1.6 * dt));
      const step = rival.speed * dt / this.track.length;
      rival.t = (rival.t + step) % 1;
      rival.progress += step;
      rival.lane = clamp(
        rival.baseLane + Math.sin(time * 0.52 + rival.config.phase) * rival.config.weave,
        -5.3, 5.3
      );
      const frame = this.track.frameAt(rival.t);
      rival.position.copy(frame.point).addScaledVector(frame.normal, rival.lane);
      rival.position.y = 0.02;
      rival.car.group.position.copy(rival.position);
      const heading = Math.atan2(frame.tangent.x, frame.tangent.z);
      rival.car.group.rotation.y = heading;
      let steerAngle = Math.atan2(ahead.tangent.x, ahead.tangent.z) - heading;
      steerAngle = Math.atan2(Math.sin(steerAngle), Math.cos(steerAngle));
      const lateral = (rival.lane - rival.prevLane) / Math.max(dt, 0.001);
      rival.prevLane = rival.lane;
      rival.car.update({
        speed: rival.speed * dt / 0.016,
        steering: clamp(steerAngle * 4, -1, 1),
        driftAngle: clamp(steerAngle * 0.8 + lateral * 0.02, -0.35, 0.35),
        braking: false,
        boosting: false,
        time,
      });
      if (rival.progress >= this.laps) {
        rival.finished = true;
        rival.hideTimer = 0;
      }
    }
  }

  updateWrecked(rival, dt) {
    rival.wreckTimer += dt;
    rival.car.group.rotation.y += rival.wreckSpin * dt;
    rival.car.visual.rotation.z = Math.min(0.55, rival.wreckTimer * 0.6) * rival.wreckTilt;
    rival.car.visual.rotation.x = Math.min(0.22, rival.wreckTimer * 0.2);
    rival.car.group.position.y = 0.02 + Math.min(0.16, rival.wreckTimer * 0.1);
    if (Math.random() < dt * 8) this.effects.emitDrift(rival.position, ZERO_VELOCITY, 1);
    if (rival.wreckTimer > 4) rival.car.group.visible = false;
  }

  handlePlayerCollision(playerState, dt) {
    const previousX = playerState.position.x - playerState.velocity.x * dt;
    const previousZ = playerState.position.z - playerState.velocity.z * dt;
    const segmentX = playerState.position.x - previousX;
    const segmentZ = playerState.position.z - previousZ;
    const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;
    for (const rival of this.rivals) {
      if (rival.wrecked || rival.finished || !rival.car.group.visible || rival.cooldown > 0) continue;
      const along = segmentLengthSq > 0.0001
        ? clamp(((rival.position.x - previousX) * segmentX + (rival.position.z - previousZ) * segmentZ) / segmentLengthSq, 0, 1)
        : 0;
      const closestX = previousX + segmentX * along;
      const closestZ = previousZ + segmentZ * along;
      const dx = rival.position.x - closestX;
      const dz = rival.position.z - closestZ;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq > 9.6) continue;
      const previousDx = rival.position.x - previousX;
      const previousDz = rival.position.z - previousZ;
      const previousDistance = Math.sqrt(previousDx * previousDx + previousDz * previousDz);
      let nx;
      let nz;
      if (previousDistance > 0.001) {
        nx = previousDx / previousDistance;
        nz = previousDz / previousDistance;
      } else {
        const velocityLength = playerState.velocity.length() || 1;
        nx = playerState.velocity.x / velocityLength;
        nz = playerState.velocity.z / velocityLength;
      }
      const impact = playerState.velocity.x * nx + playerState.velocity.z * nz;
      const speed = playerState.velocity.length();
      rival.cooldown = 0.6;
      this.contact.set(
        (closestX + rival.position.x) / 2,
        0.55,
        (closestZ + rival.position.z) / 2
      );
      this.normal.set(nx, 0, nz);
      if (impact > 5.5 && speed > 16) {
        rival.wrecked = true;
        rival.finished = false;
        rival.speed = 0;
        rival.wreckTimer = 0;
        rival.wreckSpin = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 4);
        rival.wreckTilt = Math.random() < 0.5 ? -1 : 1;
        this.effects.emitWreck(rival.position);
        playerState.velocity.multiplyScalar(0.9);
        this.onWreck?.(rival.config.name);
      } else {
        this.effects.emitCollision(this.contact, this.normal);
        playerState.velocity.multiplyScalar(0.86);
        rival.speed = Math.max(16, rival.speed * 0.75);
        const frame = this.track.frameAt(rival.t);
        const side = Math.sign(dx * frame.normal.x + dz * frame.normal.z) || 1;
        rival.baseLane = clamp(rival.baseLane + side * 0.8, -5.2, 5.2);
        this.onBump?.(rival.config.name);
      }
    }
  }

  playerRank(playerProgress) {
    let ahead = 0;
    for (const rival of this.rivals) {
      if (!rival.wrecked && (rival.finished || rival.progress > playerProgress + 0.001)) ahead++;
    }
    return ahead + 1;
  }
}
