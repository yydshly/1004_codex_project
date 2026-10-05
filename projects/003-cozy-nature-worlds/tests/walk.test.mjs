import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialWorld, heightAt, riverPath, validateWorld } from '../demo/world.js';
import { visibleWorldObjects, canWalkAt, findWalkSpawn, walkDelta } from '../demo/walk.js';

function emptyWorld() {
  const world = createInitialWorld();
  world.objects = [];
  return world;
}

test('a relocated channel hides original object references and hidden rocks do not collide', () => {
  const world = emptyWorld();
  world.spring = { x: 10, z: 24 };
  const center = riverPath(world)[8];
  assert.ok(heightAt(center.x, center.z, world) >= .5);
  const hidden = { id: 'hidden', type: 'rock', x: center.x, z: center.z, scale: 1 };
  const visible = { id: 'visible', type: 'tree', x: -15, z: 12, scale: 1 };
  world.objects = [hidden, visible];
  const objects = visibleWorldObjects(world);
  assert.equal(objects.length, 1);
  assert.equal(objects[0], visible);
  assert.equal(world.objects.length, 2, 'hiding does not delete saved objects');
  assert.equal(canWalkAt(world, objects, center.x, center.z), true);
  assert.equal(canWalkAt(world, world.objects, center.x, center.z), false);
});

test('walking respects island boundaries, shallow shore, and visible tree/rock radii only', () => {
  const world = emptyWorld();
  assert.equal(canWalkAt(world, [], 29.5, 15), true);
  assert.equal(canWalkAt(world, [], 29.5001, 15), false);
  assert.equal(canWalkAt(world, [], -29.5001, 15), false);
  assert.equal(canWalkAt(world, [], 0, 29.5001), false);
  assert.ok(heightAt(0, -29.5, world) < .5);
  assert.equal(canWalkAt(world, [], 0, -29.5), false);
  assert.equal(canWalkAt(world, [], NaN, 12), false);
  assert.equal(canWalkAt(world, [], 7, Infinity), false);
  for (const [type, radius] of [['tree', .48], ['rock', .55]]) {
    const objects = [{ type, x: 7, z: 10, scale: 2 }];
    assert.equal(canWalkAt(world, objects, 7 + radius * 2 - .001, 10), false);
    assert.equal(canWalkAt(world, objects, 7 + radius * 2 + .001, 10), true);
  }
  assert.equal(canWalkAt(world, [{ type: 'flower', x: 7, z: 10, scale: 2 }], 7, 10), true);
  assert.equal(canWalkAt(world, [{ type: 'grass', x: 7, z: 10, scale: 2 }], 7, 10), true);
});

test('default world spawn is outside the rock that previously trapped the first walk', () => {
  const world = createInitialWorld();
  const objects = visibleWorldObjects(world);
  const blockingRock = objects.find((object) => object.type === 'rock'
    && Math.abs(object.x - 7.4137) < .001 && Math.abs(object.z - 9.9946) < .001);
  assert.ok(blockingRock, 'keep the actual default seed regression fixture');
  assert.equal(canWalkAt(world, objects, 7, 10), false);
  const spawn = findWalkSpawn(world, objects);
  assert.equal(canWalkAt(world, objects, spawn.x, spawn.z), true);
  assert.ok(Math.hypot(spawn.x - blockingRock.x, spawn.z - blockingRock.z) >= .55 * blockingRock.scale);
  assert.deepEqual(findWalkSpawn(world, objects), spawn, 'spawn is deterministic');
});

test('spawn checks preferred, falls back to the full island, and throws if no spot is free', () => {
  const world = emptyWorld();
  const preferred = { x: 7, z: 10 };
  assert.deepEqual(findWalkSpawn(world, [], preferred), preferred);
  assert.notEqual(findWalkSpawn(world, [], preferred), preferred);
  // Valid imported rocks can overlap and obstruct all 250 nearby spiral samples.
  const dense = [];
  for (let z = 4; z <= 16; z += 1) for (let x = 1; x <= 13; x += 1) {
    dense.push({ id: `dense${dense.length}`, type: 'rock', x, z, scale: 2.5, rotation: 0, variant: 0 });
  }
  validateWorld({ ...world, objects: dense });
  const spawn = findWalkSpawn(world, dense);
  assert.ok(Math.hypot(spawn.x - 7, spawn.z - 10) > .35 * Math.sqrt(250));
  assert.equal(canWalkAt(world, dense, spawn.x, spawn.z), true);
  const blocked = [];
  for (let z = -29.5; z <= 29.5; z += 1.5) for (let x = -29.5; x <= 29.5; x += 1.5) {
    blocked.push({ id: `blocked${blocked.length}`, type: 'rock', x, z, scale: 2.5, rotation: 0, variant: 0 });
  }
  validateWorld({ ...world, objects: blocked });
  assert.throws(() => findWalkSpawn(world, blocked), /no free place/);
  assert.throws(() => findWalkSpawn(world, [], { x: Infinity, z: 10 }), /finite/);
});

test('walking follows camera yaw and normalizes diagonal WASD speed', () => {
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12);
  const forward = walkDelta(0, 1, 0, .6);
  close(forward.dx, 0); close(forward.dz, -.6);
  const right = walkDelta(0, 0, 1, .6);
  close(right.dx, .6); close(right.dz, 0);
  const rotated = walkDelta(Math.PI / 2, 1, 0, .6);
  close(rotated.dx, -.6); close(rotated.dz, 0);
  for (const yaw of [0, .1, Math.PI / 2, -2.7]) {
    for (const [f, s] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, -1]]) {
      const delta = walkDelta(yaw, f, s, 3.7);
      close(Math.hypot(delta.dx, delta.dz), 3.7);
    }
  }
  const stopped = walkDelta(.3, 0, 0, 5);
  close(stopped.dx, 0); close(stopped.dz, 0);
  assert.throws(() => walkDelta(NaN, 1, 0, .6), /finite/);
});
