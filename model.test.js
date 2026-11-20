import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, buildings, people, fruit, places, freshState, walkable, move, interact, completed, nextStop, discover } from './model.js';

function visit(state, id) {
  const target = [...people, ...fruit].find(p => p.id === id);
  state.x = target.x; state.y = target.y;
  return interact(state, id);
}
test('full journey: collect parcel, help neighbor, deliver; repeats cannot duplicate progress', () => {
  const s = freshState();
  assert.equal(interact(s, 'seller'), null, 'cannot interact at a distance');
  assert.equal(nextStop(s).id, 'seller');
  visit(s, 'seller'); assert.equal(s.parcel, true);
  visit(s, 'seller'); assert.equal(s.parcel, true);
  visit(s, 'neighbor'); assert.equal(s.helping, true);
  for (const f of fruit) {
    assert.equal(walkable(f.x, f.y), true);
    visit(s, f.id); visit(s, f.id);
  }
  assert.equal(s.collected.length, 3);
  assert.equal(s.helped, false, 'returning the fruit is required');
  assert.equal(nextStop(s).id, 'neighbor');
  visit(s, 'neighbor'); assert.equal(s.helped, true);
  assert.equal(completed(s), false);
  visit(s, 'tea'); assert.equal(completed(s), true);
  assert.equal(s.parcel, false); assert.equal(nextStop(s), null);
  visit(s, 'seller'); assert.equal(s.parcel, false, 'no second parcel after delivery');
});
test('delivery before helping and helping before pickup both remain completable', () => {
  for (const earlyDelivery of [true, false]) {
    const s = freshState();
    visit(s, 'tea'); assert.equal(s.delivered, false);
    if (earlyDelivery) { visit(s, 'seller'); visit(s, 'tea'); }
    visit(s, 'neighbor');
    fruit.forEach(f => visit(s, f.id)); visit(s, 'neighbor');
    if (!earlyDelivery) { visit(s, 'seller'); visit(s, 'tea'); }
    assert.equal(completed(s), true);
  }
});
test('fruit cannot be collected before the neighbor asks', () => {
  const s = freshState();
  assert.equal(visit(s, 'fruit0'), null);
  assert.deepEqual(s.collected, []);
});
test('movement is frame-rate bounded, diagonal-normalized, and respects solids', () => {
  const a = freshState(), b = freshState();
  move(a, 1, 0, .03); move(b, 1, 1, .03);
  const origin = freshState();
  assert.ok(Math.abs(Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y)) < 1e-9);
  const paused = freshState(); move(paused, 1, 0, 20);
  assert.ok(paused.x - origin.x < 10, 'large frame gaps cannot tunnel');
  const wall = { ...freshState(), x: buildings[0].x - 17, y: 250 };
  move(wall, 1, 0, .05); assert.equal(wall.x, buildings[0].x - 17);
  assert.equal(walkable(WORLD.river + 1, 500), false);
  assert.equal(walkable(-1, 500), false);
  assert.equal(walkable(NaN, 500), false);
  move(paused, NaN, 1, .1); assert.ok(Number.isFinite(paused.x));
});
test('all task locations and discoveries are reachable from the starting area', () => {
  const s = freshState(), step = 10;
  const start = [Math.round(s.x / step), Math.round(s.y / step)];
  const queue = [start], seen = new Set([start.join(',')]);
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (!seen.has(key) && walkable(nx * step, ny * step)) { seen.add(key); queue.push([nx, ny]); }
    }
  }
  for (const p of [...people, ...fruit, ...places]) assert.ok(seen.has(`${Math.round(p.x / step)},${Math.round(p.y / step)}`), `${p.id} reachable`);
  for (const p of places) { s.x = p.x; s.y = p.y; discover(s); discover(s); }
  assert.equal(s.discovered.length, 4);
});
