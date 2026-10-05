import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { heightAt, riverPath } from './world.js';
import { visibleWorldObjects, canWalkAt, findWalkSpawn, walkDelta } from './walk.js';

const ASSETS = { tree: ['tree_oak', 'tree_pineRoundA'], grass: ['grass'], flower: ['flower_purpleA', 'flower_yellowA'], rock: ['rock_largeA', 'rock_smallA'] };
const MODEL_SCALE = { tree: 3.6, grass: 1.45, flower: 1.65, rock: 2.3 };
const ENVIRONMENTS = {
  morning: { sky: '#dfe9da', fog: '#dfe9da', ground: '#728759', sun: '#fff6d5', intensity: 2.9, direction: [24, 38, 18], near: 44, far: 135 },
  sunset: { sky: '#edd6be', fog: '#edd6be', ground: '#837a61', sun: '#ffd19a', intensity: 2.65, direction: [-25, 18, 8], near: 40, far: 130 },
  mist: { sky: '#d8e4dd', fog: '#d8e4dd', ground: '#7a9487', sun: '#e7f0e8', intensity: 1.7, direction: [20, 42, 12], near: 13, far: 76 },
};

export async function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 250);
  camera.position.set(32, 38, 49);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 2.4, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.minDistance = 10;
  controls.maxDistance = 95;
  controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_PAN };
  const hemisphere = new THREE.HemisphereLight('#f1f4e6', '#728759', 1.25);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight('#fff6d5', 2.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -43, right: 43, top: 43, bottom: -43, near: 1, far: 110 });
  sun.shadow.bias = -0.0007;
  sun.shadow.normalBias = 0.15;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  const vegetation = new THREE.Group();
  scene.add(vegetation);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(250, 250), new THREE.MeshStandardMaterial({ color: '#a1c5b8', roughness: .8, metalness: 0 }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = .06;
  ocean.receiveShadow = true;
  scene.add(ocean);
  const brushGeometry = new THREE.BufferGeometry();
  const brush = new THREE.LineLoop(brushGeometry, new THREE.LineBasicMaterial({ color: '#fff8d7', transparent: true, opacity: .85, depthTest: false }));
  brush.renderOrder = 4;
  brush.visible = false;
  scene.add(brush);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const loader = new GLTFLoader();
  const loaded = await Promise.all(Object.values(ASSETS).flat().map(async (name) => {
    const gltf = await loader.loadAsync(`./assets/models/${name}.glb`);
    gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const meshes = [];
    gltf.scene.traverse((child) => {
      if (!child.isMesh) return;
      const materials = (Array.isArray(child.material) ? child.material : [child.material]).map((original) => {
        const material = original.clone();
        material.metalness = 0;
        material.roughness = .93;
        // A consistent natural palette; original CC0 GLB bytes stay unchanged.
        if (/leaf/i.test(original.name)) material.color.set(name.includes('pine') ? '#588365' : '#6c9654');
        if (/grass/i.test(original.name)) material.color.set('#83a458');
        if (/wood/i.test(original.name)) material.color.set('#a4845e');
        return material;
      });
      meshes.push({ geometry: child.geometry, material: Array.isArray(child.material) ? materials : materials[0], matrix: child.matrixWorld.clone() });
    });
    return [name, { meshes, minY: box.min.y }];
  }));
  const models = Object.fromEntries(loaded);
  let world, terrain, river, terrainKey;
  let visibleObjects = [];
  let exploring = false, yaw = 0, pitch = -.12, lookPointer = null;
  const keys = new Set();
  let editCamera, editTarget;
  let frame = 0, renderCount = 0, elapsed = 0;
  let lastFrame = performance.now();
  const metrics = { frames: 0, meanFrameMs: 0, maxFrameMs: 0, drawCalls: 0, triangles: 0 };

  function clearVegetation() {
    for (const child of [...vegetation.children]) { vegetation.remove(child); child.dispose(); }
  }

  function rebuildObjects() {
    clearVegetation();
    const grouped = new Map();
    // Rendering and collisions share the same channel visibility rule.
    visibleObjects = visibleWorldObjects(world);
    for (const object of visibleObjects) {
      const choices = ASSETS[object.type];
      const name = choices[object.variant % choices.length];
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).push(object);
    }
    const rootTransform = new THREE.Matrix4();
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const size = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (const [name, objects] of grouped) {
      const model = models[name];
      for (const part of model.meshes) {
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, objects.length);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        for (let i = 0; i < objects.length; i++) {
          const object = objects[i];
          const scale = MODEL_SCALE[object.type] * object.scale;
          position.set(object.x, heightAt(object.x, object.z, world) - model.minY * scale, object.z);
          quaternion.setFromAxisAngle(up, object.rotation);
          size.setScalar(scale);
          rootTransform.compose(position, quaternion, size);
          matrix.multiplyMatrices(rootTransform, part.matrix);
          mesh.setMatrixAt(i, matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        vegetation.add(mesh);
      }
    }
  }

  function rebuildTerrain() {
    if (terrain) { scene.remove(terrain); terrain.geometry.dispose(); terrain.material.dispose(); }
    if (river) { scene.remove(river); river.geometry.dispose(); river.material.dispose(); }
    const segments = world.quality === 'low' ? 96 : 144;
    const geometry = new THREE.PlaneGeometry(64, 64, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const vertices = geometry.attributes.position;
    const colors = new Float32Array(vertices.count * 3);
    const path = [...riverPath(world), ...[-31, -32].map((z) => ({ x: 0, y: heightAt(0, z, world) + .025, z }))];
    const color = new THREE.Color();
    const green = new THREE.Color('#9dbb72');
    const dark = new THREE.Color('#89a563');
    const shore = new THREE.Color('#d3cba2');
    const bank = new THREE.Color('#b4bd87');
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), z = vertices.getZ(i), y = heightAt(x, z, world);
      vertices.setY(i, y);
      const distance = Math.sqrt(Math.min(...path.map((p) => (p.x - x) ** 2 + (p.z - z) ** 2)));
      color.copy(green).lerp(dark, (Math.sin(x * .4) * Math.cos(z * .27) + 1) * .19);
      if (y < .6) color.lerp(shore, 1 - y / .6);
      else if (distance < 2) color.lerp(bank, (2 - distance) / 2);
      color.toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    terrain.receiveShadow = true;
    scene.add(terrain);
    const positions = [], uvs = [], indices = [];
    let distanceAlong = 0;
    for (let i = 0; i < path.length; i++) {
      const p = path[i], previous = path[Math.max(0, i - 1)], next = path[Math.min(path.length - 1, i + 1)];
      const dx = next.x - previous.x, dz = next.z - previous.z, length = Math.hypot(dx, dz);
      const nx = -dz / length, nz = dx / length;
      if (i > 0) distanceAlong += Math.hypot(p.x - previous.x, p.z - previous.z);
      for (const side of [-1, 1]) {
        const x = p.x + nx * world.terrain.riverWidth * .5 * side;
        const z = p.z + nz * world.terrain.riverWidth * .5 * side;
        positions.push(x, Math.max(p.y + .055, heightAt(x, z, world) + .035), z);
        uvs.push(side < 0 ? 0 : 1, distanceAlong);
      }
      if (i < path.length - 1) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const waterGeometry = new THREE.BufferGeometry();
    waterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    waterGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    waterGeometry.setIndex(indices);
    waterGeometry.computeVertexNormals();
    const waterMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, waterColor: { value: new THREE.Color('#66aea3') }, foamColor: { value: new THREE.Color('#d6edca') }, fogColor: { value: new THREE.Color('#dfe9da') }, fogNear: { value: 44 }, fogFar: { value: 135 } },
      vertexShader: `varying vec2 vUv; varying float depth; void main(){vUv=uv; vec4 p=modelViewMatrix*vec4(position,1.0); depth=-p.z;gl_Position=projectionMatrix*p;}`,
      fragmentShader: `uniform float time;uniform vec3 waterColor;uniform vec3 foamColor;uniform vec3 fogColor;uniform float fogNear;uniform float fogFar;varying vec2 vUv;varying float depth;void main(){float wave=sin(vUv.y*5.5-time*1.6+sin(vUv.x*18.0)*.7);float fleck=pow(max(0.0,wave),13.0)*.18;float edge=pow(abs(vUv.x-.5)*2.0,14.0)*.38;vec3 c=mix(waterColor,foamColor,fleck+edge);c=mix(c,fogColor,smoothstep(fogNear,fogFar,depth));gl_FragColor=vec4(c,1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`,
      side: THREE.DoubleSide,
    });
    // Shader include directives must begin on a new line.
    waterMaterial.fragmentShader = waterMaterial.fragmentShader.replace(';#include', ';\n#include');
    river = new THREE.Mesh(waterGeometry, waterMaterial);
    scene.add(river);
  }

  function setWorld(value) {
    world = value;
    const key = JSON.stringify([world.seed, world.spring, world.terrain, world.quality]);
    if (key !== terrainKey) { rebuildTerrain(); terrainKey = key; }
    rebuildObjects();
    const environment = ENVIRONMENTS[world.atmosphere];
    scene.background = new THREE.Color(environment.sky);
    scene.fog = new THREE.Fog(environment.fog, environment.near, environment.far);
    hemisphere.groundColor.set(environment.ground);
    sun.color.set(environment.sun);
    sun.intensity = environment.intensity;
    sun.position.set(...environment.direction);
    river.material.uniforms.fogColor.value.set(environment.fog);
    river.material.uniforms.fogNear.value = environment.near;
    river.material.uniforms.fogFar.value = environment.far;
    controls.enableDamping = !world.reducedMotion;
    renderer.shadowMap.enabled = world.quality !== 'low';
    resize();
    if (exploring) camera.position.y = heightAt(camera.position.x, camera.position.z, world) + 1.7;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const quality = world?.quality ?? 'medium';
    const cap = quality === 'auto' ? Math.max(.75, Math.min(1.5, Math.sqrt(1280 * 720 / (rect.width * rect.height)))) : quality === 'low' ? 1 : quality === 'high' ? 2 : 1.5;
    renderer.setPixelRatio(Math.min(devicePixelRatio, cap));
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }
  function pick(clientX, clientY) {
    if (!terrain) return null;
    const rect = canvas.getBoundingClientRect();
    ndc.set((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObject(terrain)[0]?.point ?? null;
  }
  function setBrush(point, radius, type) {
    brush.visible = Boolean(point) && !exploring;
    if (!point || !world) return;
    const vertices = [];
    for (let i = 0; i < 64; i++) {
      const angle = i / 64 * Math.PI * 2;
      const x = point.x + Math.cos(angle) * radius, z = point.z + Math.sin(angle) * radius;
      vertices.push(x, heightAt(x, z, world) + .12, z);
    }
    brush.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    brush.geometry.computeBoundingSphere();
    brush.material.color.set(type === 'erase' ? '#eed0b4' : '#fff8d7');
  }
  function enterExplore() {
    const spawn = findWalkSpawn(world, visibleObjects);
    editCamera = camera.position.clone(); editTarget = controls.target.clone();
    controls.enabled = false; exploring = true; brush.visible = false; keys.clear();
    camera.position.set(spawn.x, heightAt(spawn.x, spawn.z, world) + 1.7, spawn.z);
    yaw = .1; pitch = -.12;
    canvas.focus({ preventScroll: true });
    return true;
  }
  function leaveExplore() {
    exploring = false; keys.clear(); lookPointer = null;
    camera.position.copy(editCamera); controls.target.copy(editTarget); controls.enabled = true; controls.update();
  }
  function setWalk(key, down) { if (down) keys.add(key); else keys.delete(key); }
  function stepWalk(key) {
    if (!exploring) return;
    const forward = key === 'forward' ? 1 : key === 'backward' ? -1 : 0;
    const side = key === 'right' ? 1 : key === 'left' ? -1 : 0;
    const { dx, dz } = walkDelta(yaw, forward, side, .6);
    if (canWalk(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
    if (canWalk(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
    camera.position.y = heightAt(camera.position.x, camera.position.z, world) + 1.7;
  }
  const keyMap = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
  window.addEventListener('keydown', (event) => {
    if (!exploring || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    const key = keyMap[event.code]; if (key) { keys.add(key); event.preventDefault(); }
  });
  window.addEventListener('keyup', (event) => { const key = keyMap[event.code]; if (key) keys.delete(key); });
  window.addEventListener('blur', () => { keys.clear(); lookPointer = null; });
  canvas.addEventListener('pointerdown', (event) => { if (exploring && event.button === 0) { lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); } });
  canvas.addEventListener('pointermove', (event) => {
    if (!exploring || !lookPointer || lookPointer.id !== event.pointerId) return;
    yaw -= (event.clientX - lookPointer.x) * .004;
    pitch = THREE.MathUtils.clamp(pitch - (event.clientY - lookPointer.y) * .003, -.9, .9);
    lookPointer.x = event.clientX; lookPointer.y = event.clientY;
  });
  function stopLook() { lookPointer = null; }
  canvas.addEventListener('pointerup', stopLook); canvas.addEventListener('pointercancel', stopLook);
  window.addEventListener('resize', resize);
  function canWalk(x, z) {
    return canWalkAt(world, visibleObjects, x, z);
  }
  function animate(now) {
    frame = requestAnimationFrame(animate);
    const rawDelta = now - lastFrame; lastFrame = now;
    const delta = Math.min(rawDelta / 1000, .05);
    if (!world) return;
    if (!world.reducedMotion) elapsed += delta;
    river.material.uniforms.time.value = elapsed;
    if (exploring) {
      const forward = (keys.has('forward') ? 1 : 0) - (keys.has('backward') ? 1 : 0);
      const side = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
      const { dx, dz } = walkDelta(yaw, forward, side, 3.7 * delta);
      if (canWalk(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
      if (canWalk(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
      camera.position.y = heightAt(camera.position.x, camera.position.z, world) + 1.7;
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
    } else controls.update();
    renderer.render(scene, camera);
    renderCount++;
    // DOM diagnostics are for verification only; no network or analytics service.
    if (renderCount > 30 && rawDelta < 1000 && document.visibilityState === 'visible') {
      metrics.frames++;
      metrics.meanFrameMs += (rawDelta - metrics.meanFrameMs) / metrics.frames;
      metrics.maxFrameMs = Math.max(metrics.maxFrameMs, rawDelta);
      metrics.drawCalls = renderer.info.render.calls;
      metrics.triangles = renderer.info.render.triangles;
    }
    if (renderCount % 30 === 0) {
      canvas.dataset.camera = JSON.stringify(camera.position.toArray().map((v) => Math.round(v * 100) / 100));
      canvas.dataset.metrics = JSON.stringify(metrics);
      canvas.dataset.waterTime = elapsed.toFixed(3);
    }
  }
  resize(); frame = requestAnimationFrame(animate);
  return { setWorld, pick, setBrush, enterExplore, leaveExplore, setWalk, stepWalk, resize, metrics, dispose() { cancelAnimationFrame(frame); controls.dispose(); renderer.dispose(); } };
}
