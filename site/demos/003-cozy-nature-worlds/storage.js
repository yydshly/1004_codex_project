import { validateWorld } from './world.js';

export const SAVE_KEY = 'yiyu-world-v1';
const MAX_SAVE_LENGTH = 1024 * 1024;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function invalid(message) {
  throw new Error(`Invalid save: ${message}`);
}

function checkStorage(storage, method) {
  if (storage === null || storage === undefined || typeof storage[method] !== 'function') {
    throw new TypeError(`Storage adapter must implement ${method}()`);
  }
}

function checkTimestamp(value) {
  if (typeof value !== 'string' || !ISO_UTC.test(value)) invalid('savedAt must be an ISO UTC timestamp');
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) invalid('savedAt is not a valid calendar date');
  return value;
}

/**
 * Validate and fully serialize before touching storage. Native localStorage.setItem
 * is atomic on failure, so validation/serialization/quota failures preserve the old save.
 * Storage errors intentionally propagate to the UI; this module never retries or clears.
 */
export function saveWorld(storage, world) {
  const safeWorld = validateWorld(world);
  const savedAt = new Date().toISOString();
  const text = JSON.stringify({ format: 'yiyu-save', version: 1, savedAt, world: safeWorld });
  if (text.length > MAX_SAVE_LENGTH) invalid('serialized save exceeds the supported size');
  checkStorage(storage, 'setItem');
  storage.setItem(SAVE_KEY, text);
  return { savedAt, world: safeWorld };
}

/** Returns a fresh validated world, null for an absent save, or throws for corruption. */
export function loadWorld(storage) {
  checkStorage(storage, 'getItem');
  const text = storage.getItem(SAVE_KEY);
  if (text === null) return null;
  if (typeof text !== 'string' || text.length > MAX_SAVE_LENGTH) invalid('stored save must be JSON text within the supported size');
  let envelope;
  try { envelope = JSON.parse(text); } catch { invalid('malformed JSON'); }
  if (envelope === null || typeof envelope !== 'object' || Array.isArray(envelope)) invalid('envelope must be an object');
  if (Object.hasOwn(envelope, '__proto__') || Object.hasOwn(envelope, 'prototype') || Object.hasOwn(envelope, 'constructor')) invalid('envelope contains a forbidden key');
  for (const key of ['format', 'version', 'savedAt', 'world']) {
    if (!Object.hasOwn(envelope, key)) invalid(`envelope.${key} is required`);
  }
  if (envelope.format !== 'yiyu-save') invalid('unsupported format');
  if (envelope.version !== 1) invalid('unsupported version');
  const savedAt = checkTimestamp(envelope.savedAt);
  const world = validateWorld(envelope.world);
  return { savedAt, world };
}
