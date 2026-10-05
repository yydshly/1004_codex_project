#!/usr/bin/env node
'use strict';

// Functional checks for the original V4 model, not evidence about human play.
// Run: node projects/005-water-duck-loops/experiments/reservoir-check.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const corePath = path.join(__dirname, 'reservoir-core.js');
if (!fs.existsSync(corePath)) {
  console.error('V4 model is not present yet: ' + corePath);
  process.exit(1);
}
const core = require(corePath);
for (const name of ['createState', 'step', 'setGate', 'release', 'start', 'pause', 'resume', 'waterTotal']) {
  assert.equal(typeof core[name], 'function', 'Missing model API: ' + name);
}

const DT = 1 / 120;
const EPSILON = 1e-6;
const WATER = 120;
const TERMINAL = new Set(['won', 'over']);
const PHASES = new Set(['ready', 'running', 'paused', 'settling', 'won', 'over']);
const results = [];
const strategies = [];
const jsonOnly = process.argv.includes('--json');
function check(name, run) {
  run();
  results.push(name);
  if (!jsonOnly) console.log('PASS ' + name);
}
function close(actual, expected, label) {
  assert.ok(Number.isFinite(actual), label + ' must be finite');
  assert.ok(Math.abs(actual - expected) <= EPSILON,
    label + ': expected ' + expected + ', got ' + actual);
}
function snapshot(state) { return JSON.parse(JSON.stringify(state)); }
function invariant(state, context = '') {
  assert.ok(PHASES.has(state.phase), context + ': valid phase');
  for (const field of ['tank', 'channel', 'lower']) {
    assert.ok(Number.isFinite(state[field]), context + ': finite ' + field);
    assert.ok(state[field] >= -EPSILON, context + ': nonnegative ' + field);
  }
  assert.ok(state.tank <= 60 + EPSILON, context + ': reservoir capacity');
  assert.ok(Array.isArray(state.packets), context + ': packets array');
  let movingWater = 0;
  for (const packet of state.packets) {
    assert.ok(Number.isFinite(packet.amount) && packet.amount >= -EPSILON,
      context + ': nonnegative packet amount');
    assert.ok(Number.isFinite(packet.progress) && packet.progress >= -EPSILON,
      context + ': finite forward packet progress');
    movingWater += packet.amount;
  }
  const independentlySummed = state.tank + state.channel + state.lower + movingWater;
  close(independentlySummed, WATER, context + ': independently summed water');
  close(core.waterTotal(state), independentlySummed, context + ': waterTotal API');
  assert.ok(Array.isArray(state.ducks), context + ': ducks array');
  for (const field of ['rescued', 'returned', 'releases']) {
    assert.ok(Number.isInteger(state[field]) && state[field] >= 0,
      context + ': nonnegative integer ' + field);
  }
  assert.ok(state.rescued <= state.ducks.length, context + ': no duplicate rescues');
  assert.ok(state.returned <= state.rescued, context + ': return only after rescue');
  for (const field of ['elapsed', 'spilled']) {
    assert.ok(Number.isFinite(state[field]) && state[field] >= -EPSILON,
      context + ': finite nonnegative ' + field);
  }
  assert.ok(state.earlyBonus === 0 || state.earlyBonus === 30,
    context + ': early reward is either absent or awarded exactly once');
  if (state.rescued === 0) {
    assert.equal(state.firstRescueTime, null, context + ': first rescue is not invented');
    assert.equal(state.earlyBonus, 0, context + ': waiting alone earns no early reward');
  } else {
    assert.ok(Number.isFinite(state.firstRescueTime) && state.firstRescueTime >= 0,
      context + ': first rescue time is finite');
    assert.equal(state.earlyBonus, state.firstRescueTime <= 5 ? 30 : 0,
      context + ': reward is determined by actual first rescue time');
  }
}
function tick(state, dt = DT, context = '') {
  const rescued = state.rescued;
  const returned = state.returned;
  const spilled = state.spilled;
  const firstRescueTime = state.firstRescueTime;
  core.step(state, dt);
  invariant(state, context);
  assert.ok(state.rescued >= rescued, context + ': rescued never decreases');
  assert.ok(state.returned >= returned, context + ': returned never decreases');
  assert.ok(state.spilled + EPSILON >= spilled, context + ': spill count never decreases');
  if (firstRescueTime !== null) {
    close(state.firstRescueTime, firstRescueTime, context + ': first rescue time is immutable');
  }
}
function runFor(state, seconds, controller = () => {}) {
  for (let frame = 0; frame < Math.ceil(seconds / DT); frame++) {
    controller(state, frame * DT);
    tick(state, DT, 'frame ' + frame);
    if (TERMINAL.has(state.phase)) break;
  }
  return state;
}
function pulseStrategy(amount, maxReleases = Infinity) {
  let releaseCount = 0;
  return state => {
    if (state.phase !== 'running') return;
    if (!state.gate && releaseCount < maxReleases && state.tank >= amount) {
      assert.equal(core.release(state, amount), true, 'available pulse opens the gate');
      releaseCount++;
    }
  };
}
function successful(state, label) {
  assert.equal(state.phase, 'won', label + ': must finish successfully');
  assert.equal(state.rescued, 6, label + ': rescue all six ducks');
  assert.equal(state.returned, 6, label + ': finish visible return for all six');
}
function firstRescue(state, controller = () => {}) {
  for (let frame = 0; frame < 120 / DT && state.rescued === 0; frame++) {
    controller(state);
    tick(state);
    assert.ok(!TERMINAL.has(state.phase), 'round must still allow the first rescue');
  }
  assert.equal(state.rescued, 1, 'the next rescued duck is the first');
}
function expectedScore(state) {
  // Derive rule score from event times rather than replaying the model's scoring.
  const times = state.ducks.map(duck => duck.rescuedAt).filter(Number.isFinite).sort((a,b) => a-b);
  let score = times.reduce((total, time, index) => total + 10 +
    (index > 0 && time - times[index - 1] <= 2.5 ? 5 : 0), 0);
  if (times.length && times[0] <= 5) score += 30;
  if (state.phase === 'won') score += Math.max(0, Math.round((45 - state.rescueTime) * 2));
  return score;
}

check('initial water and ready state', () => {
  const state = core.createState();
  invariant(state, 'initial');
  assert.equal(state.phase, 'ready');
  close(state.tank, 24, 'initial upper tank');
  close(state.channel, 0, 'initial shallow bay');
  close(state.lower, 96, 'initial lower pool');
  assert.equal(state.ducks.length, 6);
  assert.equal(state.rescued, 0);
  assert.equal(state.returned, 0);
  assert.equal(state.releases, 0);
  close(state.elapsed, 0, 'initial elapsed');
  const before = snapshot(state);
  for (let i = 0; i < 30; i++) core.step(state, .1);
  assert.deepEqual(snapshot(state), before, 'ready state must not simulate');
});

check('pause freezes resource, ducks, packets and clock', () => {
  const state = core.createState();
  core.start(state);
  core.setGate(state, true);
  runFor(state, 1.5);
  core.pause(state);
  assert.equal(state.phase, 'paused');
  const before = snapshot(state);
  for (let i = 0; i < 250; i++) core.step(state, .02);
  assert.deepEqual(snapshot(state), before);
  core.resume(state);
  assert.equal(state.phase, 'running');
  tick(state);
  assert.ok(state.elapsed > before.elapsed, 'resuming advances simulation');
});

check('shallow water holds ducks and closing leaves water draining', () => {
  const state = core.createState();
  core.start(state);
  core.setGate(state, true);
  runFor(state, .25);
  assert.ok(state.channel < 12, 'test remains below the water threshold');
  const positions = state.ducks.map(duck => duck.progress);
  core.setGate(state, false);
  const previousWater = state.channel;
  runFor(state, .25);
  assert.deepEqual(state.ducks.map(duck => duck.progress), positions,
    'duck positions stay unchanged below threshold');
  assert.ok(state.channel < previousWater, 'closing does not freeze shallow-bay water');
});

check('invalid or unfunded release cannot spend water or count an action', () => {
  const state = core.createState();
  core.start(state);
  const before = snapshot(state);
  assert.equal(core.release(state, 48), false, 'not enough water for large release');
  assert.equal(core.release(state, 120), false, 'unsupported size is rejected');
  assert.deepEqual(snapshot(state), before);
  assert.equal(core.release(state, 24), true);
  const open = snapshot(state);
  assert.equal(core.release(state, 24), false, 'cannot repeatedly open an open gate');
  assert.deepEqual(snapshot(state), open);
});

check('conservation with deterministic varied gate inputs', () => {
  const state = core.createState();
  core.start(state);
  let seed = 0x5d05;
  runFor(state, 120, (current, time) => {
    if (Math.round(time / DT) % 41 !== 0 || current.phase !== 'running') return;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    core.setGate(current, Boolean((seed >>> 0) & 1));
  });
  assert.ok(TERMINAL.has(state.phase), 'round must have a finite conclusion');
});

check('concentrated releases can complete the whole loop', () => {
  const state = core.createState();
  core.start(state);
  runFor(state, 120, pulseStrategy(48, 2));
  successful(state, 'two concentrated releases');
  assert.equal(state.releases, 2, 'strategy actually used two releases');
  strategies.push({strategy:'two concentrated 48-unit releases', releases:state.releases,
    rescueTime:state.rescueTime, firstRescueTime:state.firstRescueTime,
    earlyBonus:state.earlyBonus, returned:state.returned, score:state.score,
    spilled:state.spilled, releasedWater:state.releasedWater});
});

check('several small releases can complete the whole loop', () => {
  const state = core.createState();
  core.start(state);
  runFor(state, 120, pulseStrategy(24));
  successful(state, 'small releases');
  assert.ok(state.releases >= 3, 'small strategy requires several releases');
  strategies.push({strategy:'several early 24-unit releases', releases:state.releases,
    rescueTime:state.rescueTime, firstRescueTime:state.firstRescueTime,
    earlyBonus:state.earlyBonus, returned:state.returned, score:state.score,
    spilled:state.spilled, releasedWater:state.releasedWater});
});

check('timely first rescue awards thirty points exactly once', () => {
  const state = core.createState();
  core.start(state);
  const controller = pulseStrategy(24);
  firstRescue(state, controller);
  assert.ok(state.firstRescueTime <= 5, 'immediate small release rescues early');
  assert.equal(state.earlyBonus, 30);
  assert.equal(state.score, 40, 'first rescue receives ten plus one thirty-point reward');
  const firstTime = state.firstRescueTime;
  runFor(state, 120, controller);
  successful(state, 'early-reward route');
  close(state.firstRescueTime, firstTime, 'later rescues do not replace first rescue');
  assert.equal(state.earlyBonus, 30, 'later rescues do not repeat the reward');
  assert.equal(state.score, expectedScore(state), 'final score contains only one early reward');
});

check('passing five seconds grants no reward and a later rescue cannot claim it', () => {
  const state = core.createState();
  core.start(state);
  runFor(state, 5.1);
  assert.equal(state.rescued, 0);
  assert.equal(state.firstRescueTime, null);
  assert.equal(state.earlyBonus, 0);
  assert.equal(state.score, 0, 'crossing the deadline does not automatically grant points');
  const controller = pulseStrategy(24);
  firstRescue(state, controller);
  assert.ok(state.firstRescueTime > 5, 'first rescue actually happened after the deadline');
  assert.equal(state.earlyBonus, 0);
  assert.equal(state.score, 10, 'late first rescue earns normal rescue points only');
  runFor(state, 120, controller);
  successful(state, 'late-reward route');
  assert.equal(state.earlyBonus, 0, 'later rescues cannot retroactively grant the bonus');
  assert.equal(state.score, expectedScore(state), 'final score excludes the missed early reward');
});

check('waiting without action spills and ends without automatic rescue', () => {
  const state = core.createState();
  core.start(state);
  runFor(state, 120);
  assert.equal(state.phase, 'over', 'waiting must reach the round deadline');
  assert.ok(state.spilled > 0, 'waiting has a visible overflow cost');
  assert.equal(state.rescued, 0, 'overflow bypass does not grant free rescue');
  assert.equal(state.returned, 0);
});

check('settling preserves pause and scores only once', () => {
  const state = core.createState();
  core.start(state);
  const controller = pulseStrategy(48, 2);
  for (let frame = 0; frame < 120 / DT && state.phase === 'running'; frame++) {
    controller(state);
    tick(state);
  }
  assert.equal(state.phase, 'settling', 'there is a visible return phase');
  assert.ok(state.returned < state.rescued, 'some rescued ducks are still returning');
  core.pause(state);
  const before = snapshot(state);
  core.step(state, 3);
  assert.deepEqual(snapshot(state), before, 'settling also pauses');
  core.resume(state);
  assert.equal(state.phase, 'settling', 'resume does not reopen the rescue phase');
  runFor(state, 20);
  successful(state, 'return settlement');
  const finished = snapshot(state);
  core.step(state, 20);
  core.setGate(state, true);
  core.release(state, 24);
  assert.deepEqual(snapshot(state), finished, 'terminal actions do not add score or advance');
});

check('large time steps preserve finite nonnegative water', () => {
  const state = core.createState();
  core.start(state);
  core.setGate(state, true);
  for (const dt of [.001, .02, .2, 3, 10]) tick(state, dt, 'dt=' + dt);
});

check('new state resets the whole challenge', () => {
  const played = core.createState();
  core.start(played);
  runFor(played, 120, pulseStrategy(24));
  assert.deepEqual(snapshot(core.createState()), snapshot(core.createState()),
    'initial state is deterministic and can be recreated');
  const fresh = core.createState();
  invariant(fresh, 'restart');
  assert.equal(fresh.phase, 'ready');
  assert.equal(fresh.releases, 0);
  assert.equal(fresh.rescued, 0);
  assert.equal(fresh.returned, 0);
  close(fresh.elapsed, 0, 'restart elapsed');
});

console.log(JSON.stringify({kind:'program-check', passed:results.length,
  checks:results, strategies, evidenceLimit:'Model behavior only; no human playability claim.'}, null, 2));
