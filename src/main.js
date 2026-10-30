import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { NeonTrack, TRACK_WIDTH } from './track.js';
import { SportsCar } from './car.js';
import { RacingEffects } from './effects.js';
import { RivalManager } from './rivals.js';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const ui = {
  start: $('#start-screen'), startBtn: $('#start-btn'), hud: $('#hud'), countdown: $('#countdown'),
  toast: $('#toast'), toastText: $('#toast span'), speed: $('#speed'), gear: $('#gear'), lap: $('#lap-current'),
  lapTotal: $('#lap-total'), lapTime: $('#lap-time'), best: $('#best-time'), drift: $('#drift-meter'),
  driftScore: $('#drift-score'), nitro: $('#nitro-fill'), speedLines: $('#speed-lines'), impact: $('#impact-flash'),
  pause: $('#pause-screen'), finish: $('#finish-screen'), wrongWay: $('#wrong-way'), minimap: $('#minimap'),
  touch: $('#touch-controls'), sound: $('#sound-btn'), rpm: $('#rpm'), context: $('#context-lost'),
  lapSplits: $('#lap-splits'), finishDrift: $('#finish-drift'), recordTotal: $('#record-total'),
  finishLaps: $('#finish-laps'), racePosition: $('#race-position'), raceTotal: $('#race-total'),
  finishPosition: $('#finish-position'),
};
const rpmBars = [...ui.rpm.children];
const hudCache = { speed: '', gear: '', lapTime: '', drift: '', nitro: '', speedLines: '', impact: '', position: '' };
const GEAR_THRESHOLDS = [0, 32, 65, 102, 145, 195, 250];
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const isTouch = matchMedia('(pointer: coarse)').matches;
const reducedMotionMedia = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = reducedMotionMedia.matches;
reducedMotionMedia.addEventListener?.('change', (event) => { reducedMotion = event.matches; });
const hardwareConcurrency = navigator.hardwareConcurrency || 8;
const lowPower = isTouch || hardwareConcurrency <= 4;
const quality = {
  pixelRatio: Math.min(devicePixelRatio, lowPower ? 1.15 : 1.6),
  shadowMapSize: lowPower ? 1024 : 2048,
  pointLights: lowPower ? 3 : 8,
};
const TOTAL_LAPS = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(quality.pixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', '游戏画面');
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
moon.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
moon.shadow.camera.left = moon.shadow.camera.bottom = -65;
moon.shadow.camera.right = moon.shadow.camera.top = 65;
moon.shadow.camera.near = 1;
moon.shadow.camera.far = 260;
moon.shadow.bias = -0.0003;
scene.add(moon);
const rimLight = new THREE.DirectionalLight(0xff3686, 0.85);
rimLight.position.set(80, 25, -90);
scene.add(rimLight);
const moonOffset = new THREE.Vector3(-60, 110, 35);

const track = new NeonTrack(scene, { pointLights: quality.pointLights });
const car = new SportsCar(scene);
const effects = new RacingEffects(scene);
const rivals = new RivalManager(scene, track, effects, {
  laps: TOTAL_LAPS,
  count: lowPower ? 4 : 7,
  onWreck: (name) => {
    showToast(`撞毁 ${name} · 对手出局`, true);
    state.impactOpacity = 0.78;
    ui.impact.style.opacity = '0.78';
    state.shake = Math.min(1.3, 0.8 + state.velocity.length() / 45);
    audio.impact();
  },
  onBump: (name) => {
    showToast(`与 ${name} 发生碰撞 · 速度受损`, true);
    state.impactOpacity = 0.6;
    ui.impact.style.opacity = '0.6';
    state.shake = Math.min(1.3, 0.5 + state.velocity.length() / 45);
    audio.impact();
  },
});
ui.raceTotal.textContent = String(rivals.totalCars);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.52, 0.38, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  ui.context.classList.remove('hidden');
  if (state.mode === 'racing') togglePause();
});
renderer.domElement.addEventListener('webglcontextrestored', () => {
  ui.context.classList.add('hidden');
  composer.setSize(innerWidth, innerHeight);
});

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
    this.noiseGain.gain.setTargetAtTime(active && this.enabled ? speed * 0.00032 + (drifting ? 0.065 : 0) + (boosting ? 0.045 : 0) : 0, now, 0.06);
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
  suspend() {
    if (this.context && this.context.state === 'running') this.context.suspend();
  }
  resume() {
    if (this.context && this.context.state === 'suspended') this.context.resume();
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.context) this.master.gain.setTargetAtTime(this.enabled ? 0.28 : 0, this.context.currentTime, 0.05);
    ui.sound.classList.toggle('muted', !this.enabled);
    ui.sound.setAttribute('aria-pressed', String(!this.enabled));
    ui.sound.setAttribute('aria-label', this.enabled ? '静音' : '开启声音');
    return this.enabled;
  }
}
const audio = new EngineAudio();

const input = { gas: false, brake: false, left: false, right: false, drift: false, boost: false };
const keyMap = {
  KeyW: 'gas', ArrowUp: 'gas', KeyS: 'brake', ArrowDown: 'brake',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'drift',
  ShiftLeft: 'boost', ShiftRight: 'boost',
};
const RECORD_KEY = 'neon-apex-record-v1';
const record = loadRecord();
let touchUI = isTouch;
const state = {
  mode: 'intro', position: new THREE.Vector3(), velocity: new THREE.Vector3(), heading: 0,
  steering: 0, driftAngle: 0, drifting: false, wasDrifting: false, nitro: 0, driftScore: 0, driftTotal: 0,
  boosting: false, boostDepleted: false, lap: 1, nearestIndex: -1, progress: 0, nextLap: 1, startProgress: 0,
  raceStart: 0, lapStart: 0, bestLap: Infinity, lapTimes: [], collisionCooldown: 0, shake: 0,
  cameraMode: 0, wrongWayTime: 0, toastTimer: 0, elapsed: 0, impactOpacity: 0,
};

function loadRecord() {
  try {
    const data = JSON.parse(localStorage.getItem(RECORD_KEY) || '{}');
    return {
      bestLap: Number.isFinite(data.bestLap) ? data.bestLap : Infinity,
      bestTotal: Number.isFinite(data.bestTotal) ? data.bestTotal : Infinity,
    };
  } catch {
    return { bestLap: Infinity, bestTotal: Infinity };
  }
}
function saveRecord() {
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify({
      bestLap: Number.isFinite(record.bestLap) ? record.bestLap : null,
      bestTotal: Number.isFinite(record.bestTotal) ? record.bestTotal : null,
    }));
  } catch {
    // 隐私模式或存储被禁用时忽略
  }
}
if (import.meta.env.DEV) window.__NEON_DEBUG__ = { scene, car, camera, state, track, rivals, effects, renderer };
let countdownStart = 0;
let countdownValue = null;
let previousTime = performance.now();
let introTime = 0;
const cameraLook = new THREE.Vector3();
const cameraDesired = new THREE.Vector3();
const cameraLookTarget = new THREE.Vector3();
const clockVector = new THREE.Vector3();
const physicsForward = new THREE.Vector3();
const physicsRight = new THREE.Vector3();
const collisionOutward = new THREE.Vector3();
const collisionInward = new THREE.Vector3();
const collisionEffectsPos = new THREE.Vector3();
const nitroBackward = new THREE.Vector3();
const exhaustPos = new THREE.Vector3();
const wheelScratch = new THREE.Vector3();
const WHEEL_INDICES = [0, 1];
const EXHAUST_SIDES = [-0.5, 0.5];

function formatTime(ms) {
  if (!Number.isFinite(ms)) return '--:--.---';
  const value = Math.max(0, ms);
  const minutes = Math.floor(value / 60000);
  const seconds = Math.floor(value / 1000) % 60;
  const millis = Math.floor(value % 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function showToast(text, impact = false) {
  ui.toastText.textContent = text;
  ui.toast.classList.toggle('impact', impact);
  ui.toast.classList.add('show');
  state.toastTimer = 1.6;
}

function resetCar(fullReset = false) {
  const nearest = track.nearest(state.position, state.nearestIndex);
  const frame = fullReset || state.nearestIndex < 0 ? track.frameAt(track.startT) : nearest;
  state.position.copy(frame.point);
  state.position.y = 0.02;
  state.heading = Math.atan2(frame.tangent.x, frame.tangent.z);
  state.velocity.set(0, 0, 0);
  state.steering = 0;
  state.driftAngle = 0;
  state.drifting = false;
  state.boosting = false;
  state.boostDepleted = false;
  state.nearestIndex = track.nearest(state.position).index;
  state.previousIndex = state.nearestIndex;
  car.group.position.copy(state.position);
  car.group.rotation.y = state.heading;
  if (fullReset) {
    state.lap = 1;
    state.nitro = 35;
    state.driftScore = 0;
    state.driftTotal = 0;
    state.lapTimes = [];
    state.bestLap = record.bestLap;
    state.startProgress = state.nearestIndex / track.sampleCount;
    state.progress = state.startProgress;
    state.nextLap = 1;
    ui.best.textContent = formatTime(state.bestLap);
    ui.lap.textContent = '1';
  } else {
    state.driftScore = 0;
    state.progress = (state.lap - 1) + state.nearestIndex / track.sampleCount;
    state.nextLap = state.lap;
    state.nitro = Math.max(0, state.nitro - 25);
    showToast('车辆已重置 · 氮气 -25');
  }
}
ui.lapTotal.textContent = String(TOTAL_LAPS);
ui.finishLaps.textContent = `${TOTAL_LAPS} LAPS`;
resetCar(true);
camera.position.copy(state.position).add(new THREE.Vector3(Math.sin(0.72) * 8.4, 2.55, Math.cos(0.72) * 8.4));
cameraLook.copy(state.position).add(new THREE.Vector3(-2.0, 0.75, 0));
camera.lookAt(cameraLook);

function startRace() {
  audio.init();
  effects.reset();
  resetCar(true);
  rivals.reset();
  hudCache.position = '';
  clearInput();
  ui.start.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.finish.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.countdown.classList.remove('hidden');
  if (touchUI) ui.touch.classList.remove('hidden');
  ui.lapTime.textContent = '00:00.000';
  hudCache.lapTime = '00:00.000';
  state.impactOpacity = 0;
  hudCache.impact = '';
  ui.impact.style.opacity = '0';
  state.mode = 'countdown';
  countdownStart = performance.now();
  countdownValue = null;
  cameraDesired.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  camera.position.copy(state.position).addScaledVector(cameraDesired, -8).y += 3.4;
  cameraLook.copy(state.position).addScaledVector(cameraDesired, 5);
  cameraLook.y += 0.8;
  renderer.domElement.focus({ preventScroll: true });
}

function togglePause(forceResume = false) {
  if (state.mode === 'racing' && !forceResume) {
    state.mode = 'paused';
    ui.pause.classList.remove('hidden');
    clearInput();
    audio.suspend();
    $('#resume-btn').focus({ preventScroll: true });
  } else if (state.mode === 'paused') {
    state.mode = 'racing';
    const now = performance.now();
    state.pauseDuration = (state.pauseDuration || 0) + (state.pauseStarted ? now - state.pauseStarted : 0);
    state.totalPause = (state.totalPause || 0) + (state.pauseStarted ? now - state.pauseStarted : 0);
    ui.pause.classList.add('hidden');
    audio.resume();
    renderer.domElement.focus({ preventScroll: true });
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
function clearInput() {
  for (const key of Object.keys(input)) input[key] = false;
  for (const button of document.querySelectorAll('[data-control].active')) button.classList.remove('active');
}
for (const button of document.querySelectorAll('[data-control]')) {
  const control = button.dataset.control;
  const set = (value) => { input[control] = value; button.classList.toggle('active', value); };
  button.addEventListener('pointerdown', (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); set(true); });
  button.addEventListener('pointerup', () => set(false));
  button.addEventListener('pointercancel', () => set(false));
}
addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch' || touchUI) return;
  touchUI = true;
  if (state.mode === 'racing' || state.mode === 'countdown') ui.touch.classList.remove('hidden');
}, { passive: true });
addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInput();
    if (state.mode === 'racing') togglePause();
  }
});

function completeLap(now) {
  const lapTime = now - state.lapStart - (state.pauseDuration || 0);
  state.pauseDuration = 0;
  state.lapTimes.push(lapTime);
  if (lapTime > 5000 && lapTime < state.bestLap) {
    state.bestLap = lapTime;
    record.bestLap = lapTime;
    saveRecord();
    ui.best.textContent = formatTime(lapTime);
  }
  if (state.lap >= TOTAL_LAPS) {
    state.mode = 'finished';
    state.velocity.multiplyScalar(0.5);
    const finalRank = rivals.playerRank(state.progress);
    ui.racePosition.textContent = String(finalRank);
    ui.finishPosition.textContent = `第 ${finalRank} 名 · ${rivals.totalCars} 车`;
    ui.finish.classList.remove('hidden');
    ui.touch.classList.add('hidden');
    ui.toast.classList.remove('show');
    ui.wrongWay.classList.add('hidden');
    state.toastTimer = 0;
    const total = now - state.raceStart - (state.totalPause || 0);
    if (total < record.bestTotal) {
      record.bestTotal = total;
      saveRecord();
    }
    $('#total-time').textContent = formatTime(total);
    $('#finish-best-time').textContent = formatTime(state.bestLap);
    ui.recordTotal.textContent = formatTime(record.bestTotal);
    ui.finishDrift.textContent = String(Math.round(state.driftTotal));
    ui.lapSplits.innerHTML = state.lapTimes
      .map((time, index) => `<li><span>第 ${index + 1} 圈</span><b>${formatTime(time)}</b></li>`)
      .join('');
    audio.suspend();
    $('#race-again-btn').focus({ preventScroll: true });
    return;
  }
  state.lap++;
  state.nextLap += 1;
  state.lapStart = now;
  ui.lap.textContent = state.lap;
  showToast(state.lap === TOTAL_LAPS ? '最终圈 · 全力冲刺' : `第 ${state.lap} 圈 · ${formatTime(lapTime)}`);
  state.nitro = Math.min(100, state.nitro + 25);
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
  const forward = physicsForward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  const right = physicsRight.set(forward.z, 0, -forward.x);
  let forwardSpeed = state.velocity.dot(forward);
  let lateralSpeed = state.velocity.dot(right);
  const speed = state.velocity.length();
  const steerInput = active ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
  state.steering = lerp(state.steering, steerInput, 1 - Math.exp(-7 * dt));
  state.drifting = active && input.drift && speed > 10 && Math.abs(state.steering) > 0.08;

  state.boosting = active && input.boost && state.nitro > 0.1 && forwardSpeed > -1.5;
  if (state.boosting) {
    state.nitro = Math.max(0, state.nitro - 30 * dt);
    if (state.nitro <= 0.1) state.boosting = false;
  }
  if (!input.boost) state.boostDepleted = false;
  if (active && input.boost && state.nitro <= 0.1 && !state.boostDepleted) {
    state.boostDepleted = true;
    showToast('氮气耗尽 · 漂移补充');
  }

  if (throttle) {
    const acceleration = 29 * (1 - clamp(Math.max(0, forwardSpeed) / 88, 0, 0.93));
    state.velocity.addScaledVector(forward, acceleration * dt);
  }
  if (state.boosting) {
    const boostAcceleration = 37 * (1 - clamp(Math.max(0, forwardSpeed) / 108, 0, 0.92));
    state.velocity.addScaledVector(forward, boostAcceleration * dt);
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
  forward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  right.set(forward.z, 0, -forward.x);
  forwardSpeed = state.velocity.dot(forward);
  lateralSpeed = state.velocity.dot(right);
  const grip = state.drifting ? 1.35 : (speed > 45 ? 6.2 : 8.5);
  lateralSpeed *= Math.exp(-grip * dt);
  if (state.drifting) forwardSpeed *= Math.exp(-0.16 * dt);
  state.velocity.copy(forward).multiplyScalar(forwardSpeed).addScaledVector(right, lateralSpeed);
  state.driftAngle = lerp(state.driftAngle, Math.atan2(lateralSpeed, Math.max(3, Math.abs(forwardSpeed))), 1 - Math.exp(-8 * dt));

  if (state.drifting && Math.abs(lateralSpeed) > 1.2) {
    const gain = (10 + Math.abs(lateralSpeed) * 1.8) * dt;
    state.nitro = Math.min(100, state.nitro + gain);
    state.driftScore += Math.abs(lateralSpeed) * speed * dt * 1.4;
    for (const index of WHEEL_INDICES) {
      car.wheelWorldPosition(index, wheelScratch);
      effects.emitDrift(wheelScratch, state.velocity, Math.abs(lateralSpeed) / 8);
      if (Math.random() < dt * 18) effects.addSkid(wheelScratch, state.heading);
    }
  }
  if (active && !state.drifting && !state.boosting && state.velocity.length() > 4) {
    // 正常行驶时的氮气缓慢回充
    state.nitro = Math.min(100, state.nitro + 2.2 * dt);
  }
  if (state.wasDrifting && !state.drifting && state.driftScore > 20) {
    state.driftTotal += state.driftScore;
    showToast(state.nitro >= 25 ? `漂移 ${Math.round(state.driftScore)} 分 · SHIFT 可用` : `漂移 ${Math.round(state.driftScore)} 分`);
    state.driftScore = 0;
  }
  state.wasDrifting = state.drifting;
  if (state.boosting) {
    nitroBackward.copy(forward).negate();
    for (const side of EXHAUST_SIDES) {
      exhaustPos.set(side, 0.335, -2.4);
      car.group.localToWorld(exhaustPos);
      effects.emitNitro(exhaustPos, nitroBackward, speed);
    }
  }

  state.position.addScaledVector(state.velocity, dt);
  state.position.y = 0.02;
  const nearest = track.nearest(state.position, state.nearestIndex);
  state.nearestIndex = nearest.index;
  const deltaIndexRaw = nearest.index - (state.previousIndex ?? nearest.index);
  const deltaIndex = Math.abs(deltaIndexRaw) > track.sampleCount / 2
    ? deltaIndexRaw - Math.sign(deltaIndexRaw) * track.sampleCount
    : deltaIndexRaw;
  if (active) state.progress += deltaIndex / track.sampleCount;
  state.previousIndex = nearest.index;
  if (active && state.progress >= state.nextLap && forwardSpeed > 4) completeLap(now);

  state.collisionCooldown = Math.max(0, state.collisionCooldown - dt);
  const wallLimit = TRACK_WIDTH / 2 + 0.06;
  if (Math.abs(nearest.lateral) > wallLimit) {
    const side = Math.sign(nearest.lateral);
    collisionOutward.copy(nearest.normal).multiplyScalar(side);
    const penetration = Math.abs(nearest.lateral) - wallLimit;
    state.position.addScaledVector(collisionOutward, -(penetration + 0.025));
    const impactVelocity = state.velocity.dot(collisionOutward);
    if (impactVelocity > 0) state.velocity.addScaledVector(collisionOutward, -impactVelocity * 1.45);
    state.velocity.multiplyScalar(state.collisionCooldown <= 0 ? 0.68 : Math.exp(-2.6 * dt));
    const trackDirection = Math.sign(forward.dot(nearest.tangent)) || 1;
    const desiredHeading = Math.atan2(nearest.tangent.x * trackDirection, nearest.tangent.z * trackDirection);
    let angleDelta = desiredHeading - state.heading;
    angleDelta = Math.atan2(Math.sin(angleDelta), Math.cos(angleDelta));
    state.heading += angleDelta * dt * 2.8;
    if (state.collisionCooldown <= 0 && speed > 4) {
      state.collisionCooldown = 0.55;
      state.shake = Math.min(1.3, 0.35 + speed / 45);
      state.boosting = false;
      collisionEffectsPos.copy(state.position).addScaledVector(collisionOutward, 1);
      collisionEffectsPos.y = 0.45;
      collisionInward.copy(collisionOutward).negate();
      effects.emitCollision(collisionEffectsPos, collisionInward);
      audio.impact();
      showToast('碰撞 · 速度受损', true);
      state.impactOpacity = 0.75;
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
    boosting: state.boosting,
    time: now / 1000,
  });
  effects.update(dt, state.position, speed * 3.6);
  audio.update(speed, throttle, state.drifting, state.boosting, active);
  updateHUD(speed, forwardSpeed, now, dt);
}

function updateHUD(speed, forwardSpeed, now, dt) {
  const kmh = Math.round(speed * 3.6);
  const speedText = String(kmh).padStart(3, '0');
  if (speedText !== hudCache.speed) {
    ui.speed.textContent = speedText;
    hudCache.speed = speedText;
  }
  let gear = 1;
  for (let i = 1; i < GEAR_THRESHOLDS.length; i++) if (kmh >= GEAR_THRESHOLDS[i]) gear = i + 1;
  if (forwardSpeed < -1) gear = 0;
  const gearText = gear === 0 ? 'R' : String(gear);
  if (gearText !== hudCache.gear) {
    ui.gear.textContent = gearText;
    hudCache.gear = gearText;
  }
  const low = GEAR_THRESHOLDS[Math.max(0, gear - 1)] || 0;
  const high = GEAR_THRESHOLDS[gear] || 310;
  const rpmRatio = clamp((kmh - low) / (high - low) + 0.15, 0, 1);
  for (let i = 0; i < rpmBars.length; i++) {
    rpmBars[i].classList.toggle('active', i / rpmBars.length < rpmRatio);
    rpmBars[i].classList.toggle('red', i > 8);
  }
  if (state.mode === 'racing') {
    const lapText = formatTime(now - state.lapStart - (state.pauseDuration || 0));
    if (lapText !== hudCache.lapTime) {
      ui.lapTime.textContent = lapText;
      hudCache.lapTime = lapText;
    }
  }
  ui.drift.classList.toggle('active', state.drifting || state.boosting);
  ui.drift.classList.toggle('boosting', state.boosting);
  const driftText = `+${Math.round(state.driftScore)}`;
  if (driftText !== hudCache.drift) {
    ui.driftScore.textContent = driftText;
    hudCache.drift = driftText;
  }
  const nitroText = `${Math.round(state.nitro)}%`;
  if (nitroText !== hudCache.nitro) {
    ui.nitro.style.width = nitroText;
    hudCache.nitro = nitroText;
  }
  if (state.mode === 'racing' || state.mode === 'countdown') {
    const rankText = String(rivals.playerRank(state.progress));
    if (rankText !== hudCache.position) {
      ui.racePosition.textContent = rankText;
      hudCache.position = rankText;
    }
  }
  const lineOpacity = reducedMotion ? 0 : clamp((kmh - 85) / 210 + (state.boosting ? 0.22 : 0), 0, 0.42);
  const lineText = lineOpacity.toFixed(3);
  if (lineText !== hudCache.speedLines) {
    ui.speedLines.style.opacity = lineText;
    hudCache.speedLines = lineText;
  }
  state.shake = Math.max(0, state.shake - dt * 2.1);
  state.impactOpacity = Math.max(0, state.impactOpacity - dt * 2.7);
  const impactText = state.impactOpacity.toFixed(3);
  if (impactText !== hudCache.impact) {
    ui.impact.style.opacity = impactText;
    hudCache.impact = impactText;
  }
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) ui.toast.classList.remove('show');
  }
}

function updateCamera(dt, now) {
  const forward = physicsForward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  const right = physicsRight.set(forward.z, 0, -forward.x);
  const speed = state.velocity.length();
  const portrait = camera.aspect < 0.8;
  if (state.mode === 'intro') {
    introTime += dt;
    const angle = 0.72 + Math.sin(introTime * 0.16) * 0.24;
    const radius = 8.4 * (portrait ? 1.15 : 1);
    cameraDesired.copy(state.position);
    cameraDesired.x += Math.sin(angle) * radius;
    cameraDesired.y += 2.55;
    cameraDesired.z += Math.cos(angle) * radius;
    camera.position.lerp(cameraDesired, 1 - Math.exp(-2 * dt));
    cameraLookTarget.copy(state.position);
    cameraLookTarget.x -= 2.0;
    cameraLookTarget.y += 0.75;
    cameraLook.lerp(cameraLookTarget, 1 - Math.exp(-2 * dt));
    camera.fov = lerp(camera.fov, 53, 0.04);
  } else {
    if (state.cameraMode === 1) {
      cameraDesired.copy(state.position).addScaledVector(forward, 0.82);
      cameraDesired.y += 0.96;
      cameraLookTarget.copy(state.position).addScaledVector(forward, 35);
      cameraLookTarget.y += 0.72;
      camera.position.lerp(cameraDesired, 1 - Math.exp(-16 * dt));
    } else {
      const far = state.cameraMode === 2;
      const distance = ((far ? 10.8 : 7.4) + speed * (far ? 0.017 : 0.012)) * (portrait ? 1.28 : 1);
      cameraDesired.copy(state.position)
        .addScaledVector(forward, -distance)
        .addScaledVector(right, state.driftAngle * 3.3);
      cameraDesired.y += ((far ? 4.6 : 3.0) + speed * 0.006) * (portrait ? 1.18 : 1);
      cameraLookTarget.copy(state.position).addScaledVector(forward, 6 + speed * 0.06);
      cameraLookTarget.y += 0.85;
      camera.position.lerp(cameraDesired, 1 - Math.exp(-5.5 * dt));
    }
    cameraLook.lerp(cameraLookTarget, 1 - Math.exp(-8 * dt));
    const targetFov = (state.cameraMode === 1 ? 69 + speed * 0.12 : 58 + speed * 0.17 + (state.boosting ? 7 : 0)) + (portrait ? 4 : 0);
    camera.fov = lerp(camera.fov, Math.min(targetFov, 82), 1 - Math.exp(-3 * dt));
  }
  if (state.shake > 0 && !reducedMotion) {
    camera.position.add(clockVector.set((Math.random() - 0.5) * state.shake * 0.22, (Math.random() - 0.5) * state.shake * 0.16, (Math.random() - 0.5) * state.shake * 0.22));
  }
  camera.updateProjectionMatrix();
  camera.lookAt(cameraLook);
  moon.position.copy(state.position).add(moonOffset);
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
const mapBase = document.createElement('canvas');
mapBase.width = ui.minimap.width;
mapBase.height = ui.minimap.height;
const mapBaseContext = mapBase.getContext('2d');
function drawMinimapBase() {
  const ctx = mapBaseContext;
  ctx.clearRect(0, 0, mapBase.width, mapBase.height);
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
}
drawMinimapBase();
function drawMinimap() {
  const ctx = mapContext;
  ctx.clearRect(0, 0, ui.minimap.width, ui.minimap.height);
  ctx.drawImage(mapBase, 0, 0);
  for (const rival of rivals.rivals) {
    if (rival.wrecked || !rival.car.group.visible) continue;
    const [rx, ry] = mapPoint(rival.position);
    ctx.fillStyle = rival.mapColor;
    ctx.beginPath();
    ctx.arc(rx, ry, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
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
  if (state.mode === 'racing') rivals.update(dt, now / 1000, state);
  updateCamera(dt, now);
  if (!ui.hud.classList.contains('hidden')) drawMinimap();
  composer.render();
}
requestAnimationFrame(animate);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.15 : 1.6));
  composer.setSize(innerWidth, innerHeight);
});
