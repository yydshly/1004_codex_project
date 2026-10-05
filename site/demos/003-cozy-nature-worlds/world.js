/** Pure, deterministic world data. No rendering or browser dependencies. */
export const WORLD_BOUNDS = Object.freeze({ minX: -32, maxX: 32, minZ: -32, maxZ: 32 });
export const OBJECT_TYPES = Object.freeze(['tree', 'grass', 'flower', 'rock']);
export const MAX_OBJECTS = 2000;
export const RIVER_END_Z = -30;
const TAU = Math.PI * 2;
const MAX_JSON_LENGTH = 1024 * 1024;
const ATMOSPHERES = ['morning', 'sunset', 'mist'];
const QUALITIES = ['auto', 'low', 'medium', 'high'];
const SPACING = { tree: 1.25, grass: 0.24, flower: 0.32, rock: 0.72 };
const MAX_SLOPE = { tree: 0.92, grass: 1.15, flower: 0.9, rock: 2.2 };

function invalid(message) {
  throw new Error(`Invalid world: ${message}`);
}

function numberIn(value, min, max, label, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    invalid(`${label} must be ${integer ? 'an integer' : 'finite'} in [${min}, ${max}]`);
  }
  return value;
}

function record(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid(`${label} must be an object`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(`${label} must be a plain object`);
  for (const key of Object.keys(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') invalid(`${label} contains a forbidden key`);
    if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')) invalid(`${label} cannot contain accessors`);
  }
  return value;
}

function field(value, key, label) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid(`${label}.${key} is required and must be a data property`);
  return descriptor.value;
}

function enumValue(value, allowed, label) {
  if (!allowed.includes(value)) invalid(`${label} has an unsupported value`);
  return value;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function smoothstep(min, max, value) {
  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Mulberry32; a seed is always a finite unsigned 32-bit integer. */
function randomFromSeed(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The terrain and river use this exact centerline, including after moving a spring. */
function riverCenterX(z, world) {
  const t = clamp((world.spring.z - z) / (world.spring.z - RIVER_END_Z), 0, 1);
  const phase = ((world.seed % 997) / 997) * TAU;
  const envelope = Math.sin(Math.PI * t);
  return world.spring.x * (1 - t) + envelope * (2.6 * Math.sin(TAU * t + phase) + 0.65 * Math.sin(5 * Math.PI * t));
}

/** Sample the fixed heightfield in world units. Accepts any finite x/z. */
export function heightAt(x, z, world) {
  numberIn(x, -1000000, 1000000, 'x');
  numberIn(z, -1000000, 1000000, 'z');
  const phase = ((world.seed % 991) / 991) * TAU;
  const distance = x - riverCenterX(z, world);
  const valley = 1 - Math.exp(-(distance * distance) / ((world.terrain.riverWidth + 2.2) ** 2));
  const rolling = 2.5 + 0.8 * Math.sin(x * 0.15 + phase) * Math.cos(z * 0.11 - phase);
  const hills = 1.4 * Math.exp(-((x + 16) ** 2 + (z - 7) ** 2) / 150)
    + 1.8 * Math.exp(-((x - 16) ** 2 + (z - 15) ** 2) / 170);
  const bed = Math.max(0, 0.65 + (z + 27) * 0.075);
  const shore = smoothstep(0, 5, 32 - Math.abs(x)) * smoothstep(0, 5, 32 - Math.abs(z));
  return clamp((bed + valley * (rolling + hills)) * shore * world.terrain.height / 9, 0, world.terrain.height);
}

/** Stage A scenic path only: no water accumulation, dam simulation, or erosion. */
export function riverPath(world) {
  return Array.from({ length: 96 }, (_, index) => {
    const t = index / 95;
    const z = world.spring.z + (RIVER_END_Z - world.spring.z) * t;
    const x = riverCenterX(z, world);
    return { x, y: heightAt(x, z, world) + 0.06, z };
  });
}

function newObjectId(used, start) {
  let index = start;
  let id;
  do { id = `o${String(index++).padStart(6, '0')}`; } while (used.has(id));
  used.add(id);
  return { id, next: index };
}

function canPlace(world, type, x, z, nearby) {
  if (Math.abs(x) > 31 || Math.abs(z) > 31) return false;
  if (Math.abs(x - riverCenterX(z, world)) < world.terrain.riverWidth * 0.5 + 0.65 && z <= world.spring.z && z >= RIVER_END_Z) return false;
  const y = heightAt(x, z, world);
  if (y < 0.35) return false;
  const dx = (heightAt(x + 0.3, z, world) - heightAt(x - 0.3, z, world)) / 0.6;
  const dz = (heightAt(x, z + 0.3, world) - heightAt(x, z - 0.3, world)) / 0.6;
  if (Math.hypot(dx, dz) > MAX_SLOPE[type]) return false;
  const spacingSquared = SPACING[type] ** 2;
  return !nearby.some((object) => (object.x - x) ** 2 + (object.z - z) ** 2 < spacingSquared);
}

function objectAt(type, x, z, random, id) {
  const scaleRange = type === 'tree' ? [0.65, 1.35] : type === 'rock' ? [0.5, 1.35] : [0.6, 1.3];
  return { id, type, x, z, scale: scaleRange[0] + random() * (scaleRange[1] - scaleRange[0]), rotation: random() * TAU, variant: Math.floor(random() * 3) };
}

/** Mutates world.objects; returns the actually added objects, possibly fewer than requested. */
export function scatterAt(world, type, x, z, radius = 3, count = 12, seed = (world.seed + world.objects.length) >>> 0) {
  enumValue(type, OBJECT_TYPES, 'object type');
  numberIn(x, -32, 32, 'brush x');
  numberIn(z, -32, 32, 'brush z');
  numberIn(radius, 0.1, 12, 'brush radius');
  numberIn(count, 0, 250, 'brush count', true);
  numberIn(seed, 0, 0xffffffff, 'brush seed', true);
  if (!Array.isArray(world.objects) || world.objects.length > MAX_OBJECTS) invalid('objects exceed the supported limit');
  const target = Math.min(count, MAX_OBJECTS - world.objects.length);
  const random = randomFromSeed(seed);
  const used = new Set(world.objects.map((object) => object.id));
  const nearby = world.objects.filter((object) => object.type === type && Math.abs(object.x - x) <= radius + SPACING[type] && Math.abs(object.z - z) <= radius + SPACING[type]);
  let idIndex = world.objects.length + 1;
  const added = [];
  for (let attempt = 0; attempt < target * 18 && added.length < target; attempt++) {
    const angle = random() * TAU;
    const distance = Math.sqrt(random()) * radius;
    const px = x + Math.cos(angle) * distance;
    const pz = z + Math.sin(angle) * distance;
    if (!canPlace(world, type, px, pz, nearby)) continue;
    const allocation = newObjectId(used, idIndex);
    idIndex = allocation.next;
    const object = objectAt(type, px, pz, random, allocation.id);
    added.push(object);
    nearby.push(object);
  }
  world.objects.push(...added);
  return added;
}

export function createInitialWorld(seed = 20261005) {
  numberIn(seed, 0, 0xffffffff, 'seed', true);
  const world = {
    version: 1, seed,
    terrain: { size: 64, height: 9, riverWidth: 1.5 },
    objects: [], spring: { x: 4, z: 21 },
    name: '我的自然小世界', atmosphere: 'morning', reducedMotion: false, quality: 'medium',
  };
  const random = randomFromSeed(seed ^ 0xa5a5a5a5);
  const used = new Set();
  let idIndex = 1;
  for (const [type, target] of [['tree', 230], ['grass', 320], ['flower', 140], ['rock', 55]]) {
    const nearby = [];
    let count = 0;
    for (let attempt = 0; attempt < target * 30 && count < target; attempt++) {
      const x = random() * 58 - 29;
      const z = random() * 57 - 29;
      if (!canPlace(world, type, x, z, nearby)) continue;
      // Trees stay mostly on the slopes, leaving a meadow beside the river.
      if (type === 'tree' && Math.abs(x - riverCenterX(z, world)) < 4 && random() < 0.88) continue;
      const allocation = newObjectId(used, idIndex);
      idIndex = allocation.next;
      const object = objectAt(type, x, z, random, allocation.id);
      world.objects.push(object);
      nearby.push(object);
      count++;
    }
  }
  return world;
}

/** Strict boundary validation with a fresh safe copy; unknown harmless fields are discarded. */
export function validateWorld(value) {
  const source = record(value, 'world');
  if (field(source, 'version', 'world') !== 1) invalid('unsupported version');
  const seed = numberIn(field(source, 'seed', 'world'), 0, 0xffffffff, 'seed', true);
  const terrainSource = record(field(source, 'terrain', 'world'), 'terrain');
  if (field(terrainSource, 'size', 'terrain') !== 64) invalid('terrain.size must be 64');
  const terrain = {
    size: 64,
    height: numberIn(field(terrainSource, 'height', 'terrain'), 5, 12, 'terrain.height'),
    riverWidth: numberIn(field(terrainSource, 'riverWidth', 'terrain'), 0.8, 3, 'terrain.riverWidth'),
  };
  const springSource = record(field(source, 'spring', 'world'), 'spring');
  const spring = {
    x: numberIn(field(springSource, 'x', 'spring'), -12, 12, 'spring.x'),
    z: numberIn(field(springSource, 'z', 'spring'), -12, 24, 'spring.z'),
  };
  const array = field(source, 'objects', 'world');
  if (!Array.isArray(array) || Object.getPrototypeOf(array) !== Array.prototype || array.length > MAX_OBJECTS) invalid(`objects must be an array of at most ${MAX_OBJECTS} items`);
  const ids = new Set();
  const objects = Array.from({ length: array.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(array, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid('objects cannot be sparse or contain accessors');
    const item = record(descriptor.value, `objects[${index}]`);
    const id = field(item, 'id', `objects[${index}]`);
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id) || ids.has(id)) invalid('object ids must be valid and unique');
    ids.add(id);
    return {
      id,
      type: enumValue(field(item, 'type', 'object'), OBJECT_TYPES, 'object.type'),
      x: numberIn(field(item, 'x', 'object'), -31, 31, 'object.x'),
      z: numberIn(field(item, 'z', 'object'), -31, 31, 'object.z'),
      scale: numberIn(field(item, 'scale', 'object'), 0.15, 2.5, 'object.scale'),
      rotation: numberIn(field(item, 'rotation', 'object'), -TAU, TAU, 'object.rotation'),
      variant: numberIn(field(item, 'variant', 'object'), 0, 2, 'object.variant', true),
    };
  });
  const name = field(source, 'name', 'world');
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) invalid('name must contain 1–80 printable characters');
  const reducedMotion = field(source, 'reducedMotion', 'world');
  if (typeof reducedMotion !== 'boolean') invalid('reducedMotion must be boolean');
  return {
    version: 1, seed, terrain, objects, spring, name: name.trim(),
    atmosphere: enumValue(field(source, 'atmosphere', 'world'), ATMOSPHERES, 'atmosphere'),
    reducedMotion,
    quality: enumValue(field(source, 'quality', 'world'), QUALITIES, 'quality'),
  };
}

export function cloneWorld(world) { return validateWorld(world); }
export function serializeWorld(world) { return JSON.stringify(validateWorld(world), null, 2); }
export function deserializeWorld(text) {
  if (typeof text !== 'string' || text.length > MAX_JSON_LENGTH) invalid('JSON text must be a string no larger than 1 MiB characters');
  let parsed;
  try { parsed = JSON.parse(text); } catch { invalid('malformed JSON'); }
  return validateWorld(parsed);
}

export function worldSummary(world) {
  const counts = Object.fromEntries(OBJECT_TYPES.map((type) => [type, 0]));
  for (const object of world.objects) counts[object.type]++;
  const path = riverPath(world);
  const riverLength = path.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - path[index].x, point.z - path[index].z), 0);
  return { seed: world.seed, objectCount: world.objects.length, counts, riverLength };
}
