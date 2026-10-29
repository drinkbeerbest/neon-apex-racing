import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { NeonTrack, TRACK_WIDTH } from './track.js';
import { SportsCar } from './car.js';
import { RacingEffects } from './effects.js';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const ui = {
  start: $('#start-screen'), startBtn: $('#start-btn'), hud: $('#hud'), countdown: $('#countdown'),
  toast: $('#toast'), speed: $('#speed'), gear: $('#gear'), lap: $('#lap-current'), lapTime: $('#lap-time'),
  best: $('#best-time'), drift: $('#drift-meter'), driftScore: $('#drift-score'), nitro: $('#nitro-fill'),
  speedLines: $('#speed-lines'), impact: $('#impact-flash'), pause: $('#pause-screen'), finish: $('#finish-screen'),
  wrongWay: $('#wrong-way'), minimap: $('#minimap'), touch: $('#touch-controls'),
};
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const isTouch = matchMedia('(pointer: coarse)').matches;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('#scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03060d);
scene.fog = new THREE.FogExp2(0x060b16, 0.0036);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1500);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;
pmrem.dispose();

const hemi = new THREE.HemisphereLight(0x6b8eb8, 0x08070d, 1.15);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0xa9c9ef, 2.2);
moon.position.set(-60, 110, 35);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = moon.shadow.camera.bottom = -65;
moon.shadow.camera.right = moon.shadow.camera.top = 65;
moon.shadow.camera.near = 1;
moon.shadow.camera.far = 260;
moon.shadow.bias = -0.0003;
scene.add(moon);
const rimLight = new THREE.DirectionalLight(0xff3686, 0.85);
rimLight.position.set(80, 25, -90);
scene.add(rimLight);

const track = new NeonTrack(scene);
const car = new SportsCar(scene);
const effects = new RacingEffects(scene);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.52, 0.38, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

class EngineAudio {
  constructor() { this.context = null; this.enabled = true; }
  init() {
    if (this.context) { this.context.resume(); return; }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.28;
    this.master.connect(this.context.destination);
    this.engineGain = this.context.createGain();
    this.engineGain.gain.value = 0;
    this.filter = this.context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 650;
    this.engineGain.connect(this.filter).connect(this.master);
    this.oscillators = [0, 1].map((i) => {
      const osc = this.context.createOscillator();
      osc.type = i ? 'sawtooth' : 'triangle';
      const gain = this.context.createGain();
      gain.gain.value = i ? 0.22 : 0.65;
      osc.connect(gain).connect(this.engineGain);
      osc.start();
      return osc;
    });
    const buffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = this.context.createBufferSource();
    this.noise.buffer = buffer; this.noise.loop = true;
    this.noiseGain = this.context.createGain();
    this.noiseGain.gain.value = 0;
    const noiseFilter = this.context.createBiquadFilter();
    noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 850;
    this.noise.connect(noiseFilter).connect(this.noiseGain).connect(this.master);
    this.noise.start();
  }
  update(speed, throttle, drifting, boosting, active) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const rpm = 48 + (speed % 22) * 5.2 + Math.floor(speed / 22) * 8;
    this.oscillators[0].frequency.setTargetAtTime(rpm, now, 0.045);
    this.oscillators[1].frequency.setTargetAtTime(rpm * 2.03, now, 0.045);
    this.filter.frequency.setTargetAtTime(450 + speed * 22 + throttle * 500 + (boosting ? 900 : 0), now, 0.06);
    this.engineGain.gain.setTargetAtTime(active && this.enabled ? 0.09 + throttle * 0.045 : 0, now, 0.08);
    this.noiseGain.gain.setTargetAtTime(active && this.enabled ? speed * 0.00032 + (drifting ? 0.065 : 0) : 0, now, 0.06);
  }
  impact() {
    if (!this.context || !this.enabled) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(90, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, this.context.currentTime + 0.18);
    gain.gain.setValueAtTime(0.28, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.2);
    osc.connect(gain).connect(this.master); osc.start(); osc.stop(this.context.currentTime + 0.21);
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.context) this.master.gain.setTargetAtTime(this.enabled ? 0.28 : 0, this.context.currentTime, 0.05);
    $('#sound-btn').classList.toggle('muted', !this.enabled);
    return this.enabled;
  }
}
const audio = new EngineAudio();

const input = { gas: false, brake: false, left: false, right: false, drift: false };
const keyMap = {
  KeyW: 'gas', ArrowUp: 'gas', KeyS: 'brake', ArrowDown: 'brake',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'drift',
};
const state = {
  mode: 'intro', position: new THREE.Vector3(), velocity: new THREE.Vector3(), heading: 0,
  steering: 0, driftAngle: 0, drifting: false, wasDrifting: false, nitro: 0, driftScore: 0,
  boostTime: 0, lap: 1, nearestIndex: -1, progress: 0, nextLap: 1, startProgress: 0,
  raceStart: 0, lapStart: 0, bestLap: Infinity, collisionCooldown: 0, shake: 0,
  cameraMode: 0, wrongWayTime: 0, toastTimer: 0, elapsed: 0,
};
let countdownStart = 0;
let countdownValue = null;
let previousTime = performance.now();
let introTime = 0;
const cameraLook = new THREE.Vector3();
const clockVector = new THREE.Vector3();

function formatTime(ms) {
  if (!Number.isFinite(ms)) return '--:--.---';
  const value = Math.max(0, ms);
  const minutes = Math.floor(value / 60000);
  const seconds = Math.floor(value / 1000) % 60;
  const millis = Math.floor(value % 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function showToast(text, impact = false) {
  ui.toast.querySelector('span').textContent = text;
  ui.toast.classList.toggle('impact', impact);
  ui.toast.classList.add('show');
  state.toastTimer = 1.6;
}

function resetCar(fullReset = false) {
  const nearest = track.nearest(state.position, state.nearestIndex);
  const frame = fullReset || state.nearestIndex < 0 ? track.frameAt(0.008) : nearest;
  state.position.copy(frame.point);
  state.position.y = 0.02;
  state.heading = Math.atan2(frame.tangent.x, frame.tangent.z);
  state.velocity.set(0, 0, 0);
  state.steering = 0;
  state.driftAngle = 0;
  state.drifting = false;
  state.boostTime = 0;
  state.nearestIndex = track.nearest(state.position).index;
  state.previousIndex = state.nearestIndex;
  car.group.position.copy(state.position);
  car.group.rotation.y = state.heading;
  if (fullReset) {
    state.lap = 1;
    state.nitro = 0;
    state.driftScore = 0;
    state.bestLap = Infinity;
    state.startProgress = state.nearestIndex / 900;
    state.progress = state.startProgress;
    state.nextLap = state.startProgress + 1;
    ui.best.textContent = '--:--.---';
    ui.lap.textContent = '1';
  } else {
    state.progress = (state.lap - 1) + state.nearestIndex / 900;
    state.nextLap = state.startProgress + state.lap;
    state.nitro = Math.max(0, state.nitro - 25);
    showToast('车辆已重置 · 氮气 -25');
  }
}
resetCar(true);
camera.position.copy(state.position).add(new THREE.Vector3(Math.sin(0.72) * 8.4, 2.55, Math.cos(0.72) * 8.4));
cameraLook.copy(state.position).add(new THREE.Vector3(-2.0, 0.75, 0));
camera.lookAt(cameraLook);

function startRace() {
  audio.init();
  resetCar(true);
  Object.keys(input).forEach((key) => { input[key] = false; });
  ui.start.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.finish.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.countdown.classList.remove('hidden');
  if (isTouch) ui.touch.classList.remove('hidden');
  state.mode = 'countdown';
  countdownStart = performance.now();
  countdownValue = null;
  const forward = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
  camera.position.copy(state.position).addScaledVector(forward, -8).add(new THREE.Vector3(0, 3.4, 0));
  cameraLook.copy(state.position).addScaledVector(forward, 5).add(new THREE.Vector3(0, 0.8, 0));
}

function togglePause(forceResume = false) {
  if (state.mode === 'racing' && !forceResume) {
    state.mode = 'paused';
    ui.pause.classList.remove('hidden');
  } else if (state.mode === 'paused') {
    state.mode = 'racing';
    const now = performance.now();
    state.pauseDuration = (state.pauseDuration || 0) + (state.pauseStarted ? now - state.pauseStarted : 0);
    state.totalPause = (state.totalPause || 0) + (state.pauseStarted ? now - state.pauseStarted : 0);
    ui.pause.classList.add('hidden');
  }
  if (state.mode === 'paused') state.pauseStarted = performance.now();
}

function cycleCamera() {
  state.cameraMode = (state.cameraMode + 1) % 3;
  showToast(['追尾视角', '引擎盖视角', '远距视角'][state.cameraMode]);
}

ui.startBtn.addEventListener('click', startRace);
$('#resume-btn').addEventListener('click', () => togglePause(true));
$('#restart-btn').addEventListener('click', startRace);
$('#race-again-btn').addEventListener('click', startRace);
$('#pause-btn').addEventListener('click', () => togglePause());
$('#camera-btn').addEventListener('click', cycleCamera);
$('#sound-btn').addEventListener('click', () => { audio.init(); audio.toggle(); });
$('.brand').addEventListener('click', (event) => event.preventDefault());

addEventListener('keydown', (event) => {
  if (keyMap[event.code]) {
    input[keyMap[event.code]] = true;
    event.preventDefault();
  }
  if (event.repeat) return;
  if (event.code === 'Enter' && (state.mode === 'intro' || state.mode === 'finished')) startRace();
  if (event.code === 'Escape' || event.code === 'KeyP') togglePause();
  if (event.code === 'KeyC') cycleCamera();
  if (event.code === 'KeyM') audio.toggle();
  if (event.code === 'KeyR' && state.mode === 'racing') resetCar(false);
});
addEventListener('keyup', (event) => {
  if (keyMap[event.code]) { input[keyMap[event.code]] = false; event.preventDefault(); }
});
for (const button of document.querySelectorAll('[data-control]')) {
  const control = button.dataset.control;
  const set = (value) => { input[control] = value; button.classList.toggle('active', value); };
  button.addEventListener('pointerdown', (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); set(true); });
  button.addEventListener('pointerup', () => set(false));
  button.addEventListener('pointercancel', () => set(false));
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'racing') togglePause();
});

function completeLap(now) {
  const lapTime = now - state.lapStart - (state.pauseDuration || 0);
  state.pauseDuration = 0;
  if (lapTime > 5000 && lapTime < state.bestLap) {
    state.bestLap = lapTime;
    ui.best.textContent = formatTime(lapTime);
  }
  if (state.lap >= 3) {
    state.mode = 'finished';
    state.velocity.multiplyScalar(0.5);
    ui.finish.classList.remove('hidden');
    ui.touch.classList.add('hidden');
    $('#total-time').textContent = formatTime(now - state.raceStart - (state.totalPause || 0));
    $('#finish-best-time').textContent = formatTime(state.bestLap);
    return;
  }
  state.lap++;
  state.nextLap += 1;
  state.lapStart = now;
  ui.lap.textContent = state.lap;
  showToast(state.lap === 3 ? '最终圈 · 全力冲刺' : `第 ${state.lap} 圈 · ${formatTime(lapTime)}`);
  state.nitro = Math.min(100, state.nitro + 20);
}

function updateCountdown(now) {
  const elapsed = (now - countdownStart) / 1000;
  const value = elapsed < 3 ? 3 - Math.floor(elapsed) : 0;
  if (value !== countdownValue) {
    countdownValue = value;
    const span = ui.countdown.querySelector('span');
    span.textContent = value || 'GO!';
    span.style.color = value ? '#fff' : '#54eaff';
    span.style.animation = 'none';
    void span.offsetWidth;
    span.style.animation = '';
    ui.countdown.querySelector('small').textContent = value ? 'READY' : 'FULL THROTTLE';
  }
  if (elapsed >= 3 && state.mode === 'countdown') {
    state.mode = 'racing';
    state.raceStart = state.lapStart = now;
    state.pauseDuration = 0;
    state.totalPause = 0;
  }
  if (elapsed > 3.7) ui.countdown.classList.add('hidden');
}

function updatePhysics(dt, now) {
  const active = state.mode === 'racing';
  const throttle = active && input.gas ? 1 : 0;
  const braking = active && input.brake;
  let forward = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
  let right = new THREE.Vector3(forward.z, 0, -forward.x);
  let forwardSpeed = state.velocity.dot(forward);
  let lateralSpeed = state.velocity.dot(right);
  const speed = state.velocity.length();
  const steerInput = active ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
  state.steering = lerp(state.steering, steerInput, 1 - Math.exp(-7 * dt));
  state.drifting = active && input.drift && speed > 10 && Math.abs(state.steering) > 0.08;

  if (throttle) {
    const boost = state.boostTime > 0;
    const maxSpeed = boost ? 98 : 84;
    const acceleration = (boost ? 39 : 29) * (1 - clamp(Math.max(0, forwardSpeed) / maxSpeed, 0, 0.93));
    state.velocity.addScaledVector(forward, acceleration * dt);
  }
  if (braking) {
    if (forwardSpeed > 1.5) state.velocity.addScaledVector(forward, -43 * dt);
    else if (forwardSpeed > -12) state.velocity.addScaledVector(forward, -14 * dt);
  }
  if (!throttle && !braking && speed > 0.1) state.velocity.multiplyScalar(Math.max(0, 1 - 0.18 * dt));
  state.velocity.addScaledVector(state.velocity, -0.00062 * speed * dt);

  const direction = forwardSpeed >= 0 ? 1 : -1;
  const steerAuthority = clamp(speed / 5, 0, 1) * (0.65 + Math.min(speed / 35, 1.05));
  const turnRate = state.steering * steerAuthority * (state.drifting ? 1.75 : 1.05) * direction;
  state.heading -= turnRate * dt;
  forward = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
  right = new THREE.Vector3(forward.z, 0, -forward.x);
  forwardSpeed = state.velocity.dot(forward);
  lateralSpeed = state.velocity.dot(right);
  const grip = state.drifting ? 1.35 : (speed > 45 ? 6.2 : 8.5);
  lateralSpeed *= Math.exp(-grip * dt);
  if (state.drifting) forwardSpeed *= Math.exp(-0.16 * dt);
  state.velocity.copy(forward).multiplyScalar(forwardSpeed).addScaledVector(right, lateralSpeed);
  state.driftAngle = lerp(state.driftAngle, Math.atan2(lateralSpeed, Math.max(3, Math.abs(forwardSpeed))), 1 - Math.exp(-8 * dt));

  if (state.drifting && Math.abs(lateralSpeed) > 1.2) {
    const gain = (6 + Math.abs(lateralSpeed) * 1.25) * dt;
    state.nitro = Math.min(100, state.nitro + gain);
    state.driftScore += Math.abs(lateralSpeed) * speed * dt * 1.4;
    for (const index of [0, 1]) {
      effects.emitDrift(car.wheelWorldPosition(index), state.velocity, Math.abs(lateralSpeed) / 8);
      if (Math.random() < dt * 18) effects.addSkid(car.wheelWorldPosition(index), state.heading);
    }
  }
  if (state.wasDrifting && !state.drifting) {
    if (state.nitro >= 25 && active) {
      state.boostTime = 0.65 + state.nitro / 100 * 1.6;
      showToast(`氮气释放 · ${Math.round(state.driftScore)} 漂移分`);
      state.nitro = 0;
      state.driftScore = 0;
    } else if (state.driftScore > 20) {
      showToast(`漂移 ${Math.round(state.driftScore)} 分 · 蓄能不足`);
      state.driftScore = 0;
    }
  }
  state.wasDrifting = state.drifting;
  state.boostTime = Math.max(0, state.boostTime - dt);
  if (state.boostTime > 0) {
    const backward = forward.clone().negate();
    for (const side of [-0.55, 0.55]) {
      const exhaust = car.group.localToWorld(new THREE.Vector3(side, 0.34, -2.35));
      effects.emitNitro(exhaust, backward, speed);
    }
  }

  state.position.addScaledVector(state.velocity, dt);
  state.position.y = 0.02;
  const nearest = track.nearest(state.position, state.nearestIndex);
  state.nearestIndex = nearest.index;
  const deltaIndexRaw = nearest.index - (state.previousIndex ?? nearest.index);
  const deltaIndex = Math.abs(deltaIndexRaw) > 450 ? deltaIndexRaw - Math.sign(deltaIndexRaw) * 900 : deltaIndexRaw;
  if (active) state.progress += deltaIndex / 900;
  state.previousIndex = nearest.index;
  if (active && state.progress >= state.nextLap && forwardSpeed > 4) completeLap(now);

  state.collisionCooldown = Math.max(0, state.collisionCooldown - dt);
  const wallLimit = TRACK_WIDTH / 2 + 0.06;
  if (Math.abs(nearest.lateral) > wallLimit) {
    const side = Math.sign(nearest.lateral);
    const outward = nearest.normal.clone().multiplyScalar(side);
    const penetration = Math.abs(nearest.lateral) - wallLimit;
    state.position.addScaledVector(outward, -(penetration + 0.025));
    const impactVelocity = state.velocity.dot(outward);
    if (impactVelocity > 0) state.velocity.addScaledVector(outward, -impactVelocity * 1.45);
    state.velocity.multiplyScalar(state.collisionCooldown <= 0 ? 0.58 : Math.exp(-2.6 * dt));
    const trackDirection = Math.sign(forward.dot(nearest.tangent)) || 1;
    const desiredHeading = Math.atan2(nearest.tangent.x * trackDirection, nearest.tangent.z * trackDirection);
    let angleDelta = desiredHeading - state.heading;
    angleDelta = Math.atan2(Math.sin(angleDelta), Math.cos(angleDelta));
    state.heading += angleDelta * dt * 3.5;
    if (state.collisionCooldown <= 0 && speed > 4) {
      state.collisionCooldown = 0.55;
      state.shake = Math.min(1.3, 0.35 + speed / 45);
      effects.emitCollision(state.position.clone().addScaledVector(outward, 1).setY(0.45), outward.clone().negate());
      audio.impact();
      showToast('碰撞 · 速度受损', true);
      ui.impact.style.opacity = '0.75';
    }
  }

  const tangentVelocity = state.velocity.dot(nearest.tangent);
  state.wrongWayTime = tangentVelocity < -4 && speed > 7 ? state.wrongWayTime + dt : Math.max(0, state.wrongWayTime - dt * 2);
  ui.wrongWay.classList.toggle('hidden', state.wrongWayTime < 1.2);

  car.group.position.copy(state.position);
  car.group.rotation.y = state.heading;
  car.update({
    speed: forwardSpeed * dt / 0.016,
    steering: state.steering,
    driftAngle: state.driftAngle,
    braking,
    boosting: state.boostTime > 0,
    time: now / 1000,
  });
  track.update(now / 1000, speed * 3.6);
  effects.update(dt, state.position, speed * 3.6);
  audio.update(speed, throttle, state.drifting, state.boostTime > 0, active);
  updateHUD(speed, forwardSpeed, now, dt);
}

function updateHUD(speed, forwardSpeed, now, dt) {
  const kmh = Math.round(speed * 3.6);
  ui.speed.textContent = String(kmh).padStart(3, '0');
  const thresholds = [0, 32, 65, 102, 145, 195, 250];
  let gear = 1;
  for (let i = 1; i < thresholds.length; i++) if (kmh >= thresholds[i]) gear = i + 1;
  if (forwardSpeed < -1) gear = 0;
  ui.gear.textContent = gear === 0 ? 'R' : gear;
  const low = thresholds[Math.max(0, gear - 1)] || 0;
  const high = thresholds[gear] || 310;
  const rpmRatio = clamp((kmh - low) / (high - low) + 0.15, 0, 1);
  const bars = $('#rpm').children;
  for (let i = 0; i < bars.length; i++) {
    bars[i].classList.toggle('active', i / bars.length < rpmRatio);
    bars[i].classList.toggle('red', i > 8);
  }
  if (state.mode === 'racing') ui.lapTime.textContent = formatTime(now - state.lapStart - (state.pauseDuration || 0));
  ui.drift.classList.toggle('active', state.drifting || state.nitro > 0);
  ui.driftScore.textContent = `+${Math.round(state.driftScore)}`;
  ui.nitro.style.width = `${state.nitro}%`;
  ui.speedLines.style.opacity = String(clamp((kmh - 85) / 210 + (state.boostTime > 0 ? 0.22 : 0), 0, 0.42));
  state.shake = Math.max(0, state.shake - dt * 2.1);
  ui.impact.style.opacity = String(Math.max(0, parseFloat(ui.impact.style.opacity || 0) - dt * 2.7));
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) ui.toast.classList.remove('show');
  }
}

function updateCamera(dt, now) {
  const forward = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const speed = state.velocity.length();
  if (state.mode === 'intro') {
    introTime += dt;
    const angle = 0.72 + Math.sin(introTime * 0.16) * 0.24;
    const desired = state.position.clone().add(new THREE.Vector3(Math.sin(angle) * 8.4, 2.55, Math.cos(angle) * 8.4));
    camera.position.lerp(desired, 1 - Math.exp(-2 * dt));
    cameraLook.lerp(state.position.clone().add(new THREE.Vector3(-2.0, 0.75, 0)), 1 - Math.exp(-2 * dt));
    camera.fov = lerp(camera.fov, 53, 0.04);
  } else {
    let desired;
    let look;
    if (state.cameraMode === 1) {
      desired = state.position.clone().addScaledVector(forward, 0.25).add(new THREE.Vector3(0, 1.29, 0));
      look = state.position.clone().addScaledVector(forward, 35).add(new THREE.Vector3(0, 0.75, 0));
      camera.position.lerp(desired, 1 - Math.exp(-16 * dt));
    } else {
      const far = state.cameraMode === 2;
      const distance = (far ? 10.8 : 7.4) + speed * (far ? 0.017 : 0.012);
      desired = state.position.clone().addScaledVector(forward, -distance)
        .addScaledVector(right, state.driftAngle * 3.3)
        .add(new THREE.Vector3(0, (far ? 4.6 : 3.0) + speed * 0.006, 0));
      look = state.position.clone().addScaledVector(forward, 6 + speed * 0.06).add(new THREE.Vector3(0, 0.85, 0));
      camera.position.lerp(desired, 1 - Math.exp(-5.5 * dt));
    }
    cameraLook.lerp(look, 1 - Math.exp(-8 * dt));
    const targetFov = state.cameraMode === 1 ? 69 + speed * 0.12 : 58 + speed * 0.17 + (state.boostTime > 0 ? 7 : 0);
    camera.fov = lerp(camera.fov, Math.min(targetFov, 82), 1 - Math.exp(-3 * dt));
  }
  if (state.shake > 0) {
    camera.position.add(clockVector.set((Math.random() - 0.5) * state.shake * 0.22, (Math.random() - 0.5) * state.shake * 0.16, (Math.random() - 0.5) * state.shake * 0.22));
  }
  camera.updateProjectionMatrix();
  camera.lookAt(cameraLook);
  moon.position.copy(state.position).add(new THREE.Vector3(-60, 110, 35));
  moon.target.position.copy(state.position);
  moon.target.updateMatrixWorld();
}
scene.add(moon.target);

const mapContext = ui.minimap.getContext('2d');
const mapBounds = track.samples.reduce((bounds, sample) => ({
  minX: Math.min(bounds.minX, sample.point.x), maxX: Math.max(bounds.maxX, sample.point.x),
  minZ: Math.min(bounds.minZ, sample.point.z), maxZ: Math.max(bounds.maxZ, sample.point.z),
}), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
function mapPoint(position) {
  const padding = 38;
  const w = ui.minimap.width - padding * 2;
  const h = ui.minimap.height - padding * 2;
  const scale = Math.min(w / (mapBounds.maxX - mapBounds.minX), h / (mapBounds.maxZ - mapBounds.minZ));
  return [
    ui.minimap.width / 2 + (position.x - (mapBounds.minX + mapBounds.maxX) / 2) * scale,
    ui.minimap.height / 2 + (position.z - (mapBounds.minZ + mapBounds.maxZ) / 2) * scale,
  ];
}
function drawMinimap() {
  const ctx = mapContext;
  ctx.clearRect(0, 0, ui.minimap.width, ui.minimap.height);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  track.samples.forEach((sample, i) => {
    const [x, y] = mapPoint(sample.point);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.strokeStyle = 'rgba(2,5,10,.7)'; ctx.lineWidth = 15; ctx.stroke();
  ctx.strokeStyle = 'rgba(97,132,157,.45)'; ctx.lineWidth = 7; ctx.stroke();
  ctx.strokeStyle = 'rgba(152,197,217,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
  const [sx, sy] = mapPoint(track.frameAt(0).point);
  ctx.strokeStyle = '#d9f7ff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(sx - 6, sy); ctx.lineTo(sx + 6, sy); ctx.stroke();
  const [x, y] = mapPoint(state.position);
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI - state.heading);
  ctx.shadowColor = '#54eaff'; ctx.shadowBlur = 14;
  ctx.fillStyle = '#75efff';
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3.5); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - previousTime) / 1000, 0.2);
  previousTime = now;
  state.elapsed += dt;
  if (state.mode === 'countdown' || !ui.countdown.classList.contains('hidden')) updateCountdown(now);
  if (state.mode !== 'paused') updatePhysics(dt, now);
  else audio.update(0, 0, false, false, false);
  updateCamera(dt, now);
  drawMinimap();
  composer.render();
}
requestAnimationFrame(animate);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  composer.setSize(innerWidth, innerHeight);
});
