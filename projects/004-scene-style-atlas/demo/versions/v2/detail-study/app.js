import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildScene } from './scene-builder.js';

// V2 is a separate study. The complete V1 source remains in ../versions/v1/.
const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { phase: 'refined', style: 'natural', scale: 22, sunAngle: 25, motion: !reducedMotion };
const labels = { blockout: '基础体块', refined: '细化样板', natural: '自然写实', miniature: '温暖微缩', wasteland: '荒凉废土' };
const looks = {
  natural: { sky: '#363e35', top: '#d4dbc9', lower: '#817653', sun: '#ffe6bf', fill: '#a3bdc5', exposure: .96 },
  miniature: { sky: '#4b4b37', top: '#ece6c4', lower: '#ac9b66', sun: '#ffdda1', fill: '#bed4d6', exposure: 1.08 },
  wasteland: { sky: '#363b3e', top: '#c2c9ce', lower: '#706451', sun: '#e1e7e9', fill: '#96a8c2', exposure: .94 },
};
let renderer, camera, controls, scene, sunlight, fill, ambient, sample, environment, observer;
let lastTime = performance.now(), elapsed = 0, lastStats = 0, hidden = document.hidden;
let savedFrame = '';

function setStatus(message = '') {
  $('detail-status').textContent = `${labels[state.phase]} / ${labels[state.style]} · ${state.motion ? '动态观察中' : '已暂停'}${message ? ' · ' + message : ''}`;
}
function updateControls() {
  for (const button of document.querySelectorAll('button[data-phase]')) {
    button.setAttribute('aria-pressed', String(button.dataset.phase === state.phase));
  }
  for (const button of document.querySelectorAll('button[data-style]')) {
    button.setAttribute('aria-pressed', String(button.dataset.style === state.style));
  }
  $('camera-distance').value = state.scale;
  $('camera-output').textContent = `${state.scale} · ${state.scale < 19 ? '细节' : state.scale > 27 ? '场景' : '中景'}`;
  $('sun-angle').value = state.sunAngle;
  $('sun-output').textContent = `${state.sunAngle}°`;
  $('detail-motion').textContent = state.motion ? '暂停动态' : '播放动态';
  $('detail-motion').setAttribute('aria-pressed', String(state.motion));
  setStatus();
}
function lightPosition() {
  const angle = THREE.MathUtils.degToRad(state.sunAngle);
  sunlight.position.set(Math.sin(angle) * 20, 24, Math.cos(angle) * 20);
}
function createEnvironment(look) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, look.top); gradient.addColorStop(.5, '#f0eee2');
  gradient.addColorStop(.62, look.lower); gradient.addColorStop(1, '#34382c');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 128);
  // A broad bright patch provides restrained reflections on glass and metal.
  const patch = ctx.createRadialGradient(178, 32, 0, 178, 32, 25);
  patch.addColorStop(0, 'rgba(255,245,215,.8)'); patch.addColorStop(1, 'rgba(255,245,215,0)');
  ctx.fillStyle = patch; ctx.fillRect(145, 0, 66, 68);
  const source = new THREE.CanvasTexture(canvas);
  source.colorSpace = THREE.SRGBColorSpace; source.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(source);
  source.dispose(); pmrem.dispose();
  return target;
}
function rebuild() {
  if (sample) { scene.remove(sample.group); sample.dispose(); }
  sample = buildScene(THREE, { style: state.style, phase: state.phase });
  scene.add(sample.group);
  const look = looks[state.style];
  scene.background = new THREE.Color(look.sky);
  scene.fog = new THREE.FogExp2(look.sky, .006);
  sunlight.color.set(look.sun); sunlight.intensity = state.style === 'wasteland' ? 2.2 : 2.65;
  fill.color.set(look.fill); fill.intensity = .32;
  ambient.color.set(look.top); ambient.groundColor.set(look.lower); ambient.intensity = .62;
  renderer.toneMappingExposure = look.exposure;
  if (environment) environment.dispose();
  environment = createEnvironment(look); scene.environment = environment.texture;
  scene.environmentIntensity = .2;
  lightPosition(); updateControls();
  renderer.render(scene, camera); recordStats();
}
function resize() {
  const bounds = $('detail-canvas').parentElement.getBoundingClientRect();
  const width = Math.max(1, Math.floor(bounds.width)), height = Math.max(1, Math.floor(bounds.height));
  const aspect = width / height;
  // Keep the whole comparison readable on a narrow viewport.
  const verticalSpan = state.scale * Math.max(1, 1.15 / aspect);
  camera.left = -verticalSpan * aspect / 2; camera.right = verticalSpan * aspect / 2;
  camera.top = verticalSpan / 2; camera.bottom = -verticalSpan / 2;
  camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
}
function resetView() {
  state.scale = 22; state.sunAngle = 25;
  camera.position.set(18, 16, 20); camera.zoom = 1;
  controls.target.set(0, 1.3, 0); camera.lookAt(controls.target);
  controls.update(); lightPosition(); resize(); updateControls();
}
function recordStats() {
  const format = value => new Intl.NumberFormat('zh-CN').format(value);
  $('detail-triangles').textContent = format(renderer.info.render.triangles);
  $('detail-drawcalls').textContent = format(renderer.info.render.calls);
  let meshes = 0;
  sample.group.traverse(object => { if (object.isMesh) meshes++; });
  $('detail-meshes').textContent = format(meshes);
}
function snapshot() {
  renderer.render(scene, camera);
  savedFrame = renderer.domElement.toDataURL('image/png');
  $('detail-snapshot-image').src = savedFrame;
  $('detail-snapshot-download').href = savedFrame;
  $('detail-snapshot-download').download = `scene-atlas-v2-${state.phase}-${state.style}.png`;
  $('detail-snapshot-dialog').showModal();
}
function wire() {
  for (const button of document.querySelectorAll('button[data-phase]')) button.addEventListener('click', () => {
    if (state.phase === button.dataset.phase) return;
    state.phase = button.dataset.phase; rebuild();
  });
  for (const button of document.querySelectorAll('button[data-style]')) button.addEventListener('click', () => {
    if (state.style === button.dataset.style) return;
    state.style = button.dataset.style; rebuild();
  });
  $('camera-distance').addEventListener('input', event => { state.scale = Number(event.target.value); camera.zoom = 1; resize(); updateControls(); });
  $('sun-angle').addEventListener('input', event => { state.sunAngle = Number(event.target.value); lightPosition(); updateControls(); });
  $('detail-reset').addEventListener('click', resetView);
  $('detail-motion').addEventListener('click', () => { state.motion = !state.motion; updateControls(); });
  $('detail-snapshot').addEventListener('click', snapshot);
  $('detail-snapshot-close').addEventListener('click', () => $('detail-snapshot-dialog').close());
  $('detail-canvas').addEventListener('keydown', event => {
    const direction = { ArrowLeft: [-.6, 0], ArrowRight: [.6, 0], ArrowUp: [0, -.6], ArrowDown: [0, .6] }[event.key];
    if (direction) {
      event.preventDefault(); camera.position.x += direction[0]; controls.target.x += direction[0];
      camera.position.z += direction[1]; controls.target.z += direction[1]; controls.update();
    }
    if (event.key === '+' || event.key === '-') {
      event.preventDefault(); state.scale = THREE.MathUtils.clamp(state.scale + (event.key === '+' ? -1 : 1), 14, 32);
      camera.zoom = 1; resize(); updateControls();
    }
  });
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; lastTime = performance.now(); });
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, .04); lastTime = now;
  if (hidden) return;
  if (state.motion) elapsed += dt;
  sample.update(dt, elapsed, state.motion); controls.update(); renderer.render(scene, camera);
  if (now - lastStats > 1000) { recordStats(); lastStats = now; }
}
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('detail-canvas'), antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-15, 15, 11, -11, .1, 130);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
  controls.minPolarAngle = .25; controls.maxPolarAngle = 1.4; controls.minZoom = .65; controls.maxZoom = 1.7;
  sunlight = new THREE.DirectionalLight('#ffe6bf', 2.65);
  sunlight.shadow.mapSize.set(2048, 2048); sunlight.shadow.camera.left = -22; sunlight.shadow.camera.right = 22;
  sunlight.shadow.camera.top = 22; sunlight.shadow.camera.bottom = -22;
  sunlight.shadow.camera.near = .5; sunlight.shadow.camera.far = 70;
  sunlight.shadow.bias = -.0002; sunlight.shadow.normalBias = .025; sunlight.castShadow = true; scene.add(sunlight);
  fill = new THREE.DirectionalLight('#b5ccda', .75); fill.position.set(-10, 12, -14); scene.add(fill);
  ambient = new THREE.HemisphereLight('#dde8d1', '#8a765a', 1.15); scene.add(ambient);
  resetView(); rebuild(); wire();
  observer = new ResizeObserver(resize); observer.observe($('detail-canvas').parentElement);
  $('detail-loading').hidden = true;
  requestAnimationFrame(frame);
} catch (error) {
  console.error('V2 scene study failed:', error);
  $('detail-loading').hidden = true; $('detail-error').hidden = false;
  $('detail-status').textContent = '三维预览加载失败；下方制作记录仍可阅读。';
}
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  if (sample) sample.dispose(); if (environment) environment.dispose();
  if (observer) observer.disconnect(); if (controls) controls.dispose(); if (renderer) renderer.dispose();
}, { once: true });
