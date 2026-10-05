/** Walking rules shared by the renderer and deterministic regression tests. */
import { heightAt, riverPath } from './world.js';

const WALK_BOUND = 29.5;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Return the original object references that the relocated river does not hide. */
export function visibleWorldObjects(world) {
  const path = riverPath(world);
  const channelRadiusSquared = (world.terrain.riverWidth * .5 + .35) ** 2;
  return world.objects.filter((object) => !path.some((point) =>
    (object.x - point.x) ** 2 + (object.z - point.z) ** 2 < channelRadiusSquared));
}

/** objects must be the visible subset used for rendering, so hidden objects do not collide. */
export function canWalkAt(world, objects, x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)
    || Math.abs(x) > WALK_BOUND || Math.abs(z) > WALK_BOUND
    || heightAt(x, z, world) < .5) return false;
  return !objects.some((object) => {
    if (object.type !== 'tree' && object.type !== 'rock') return false;
    const radius = (object.type === 'tree' ? .48 : .55) * object.scale;
    return (object.x - x) ** 2 + (object.z - z) ** 2 < radius ** 2;
  });
}

/** Pick a verified free position; never return the final unverified spiral candidate. */
export function findWalkSpawn(world, objects, preferred = { x: 7, z: 10 }) {
  if (!Number.isFinite(preferred.x) || !Number.isFinite(preferred.z)) {
    throw new Error('Walk spawn preference must have finite coordinates');
  }
  if (canWalkAt(world, objects, preferred.x, preferred.z)) {
    return { x: preferred.x, z: preferred.z };
  }
  for (let index = 0; index < 250; index++) {
    const angle = index * GOLDEN_ANGLE;
    const radius = .35 * Math.sqrt(index + 1);
    const x = preferred.x + Math.cos(angle) * radius;
    const z = preferred.z + Math.sin(angle) * radius;
    if (canWalkAt(world, objects, x, z)) return { x, z };
  }
  // A dense brush stroke can obstruct the entire nearby spiral. Search the island next.
  for (let z = -WALK_BOUND; z <= WALK_BOUND; z += 1) {
    for (let x = -WALK_BOUND; x <= WALK_BOUND; x += 1) {
      if (canWalkAt(world, objects, x, z)) return { x, z };
    }
  }
  throw new Error('This landscape has no free place to begin walking');
}

/** Camera yaw zero faces -Z; a diagonal cannot move faster than a cardinal direction. */
export function walkDelta(yaw, forward, side, distance) {
  if (![yaw, forward, side, distance].every(Number.isFinite)) {
    throw new Error('Walking direction and distance must be finite');
  }
  const divisor = Math.max(1, Math.hypot(forward, side));
  return {
    dx: (-Math.sin(yaw) * forward + Math.cos(yaw) * side) / divisor * distance,
    dz: (-Math.cos(yaw) * forward - Math.sin(yaw) * side) / divisor * distance,
  };
}
