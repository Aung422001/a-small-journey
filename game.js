import { WORLD, buildings, people, fruit, places, freshState, move, discover, nearby, interact, objective, completed, nextStop } from './model.js';

const $ = id => document.getElementById(id);
const canvas = $('world');
const ctx = canvas.getContext('2d');
const conversation = $('conversation');
const mapDialog = $('map-dialog');
const keys = new Set();
let state = freshState();
let started = false, paused = false, won = false;
let width = 900, height = 600, last = 0, uiSignature = '';
let camera = { x: 0, y: 0 };
const zoom = 0.87;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function ellipse(c, x, y, rx, ry, color) {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}
function rect(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(x, y, w, h); }
function line(c, points, color, thickness = 1) {
  c.strokeStyle = color; c.lineWidth = thickness; c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
}
function text(c, label, x, y, size = 11, color = '#42583c') {
  c.font = `600 ${size}px "DM Sans", sans-serif`; c.textAlign = 'center'; c.fillStyle = color; c.fillText(label, x, y);
}
function tree(c, x, y, size = 1) {
  c.save(); c.translate(x, y); c.scale(size, size);
  ellipse(c, 12, 14, 37, 15, '#344a3025');
  rect(c, -4, -8, 8, 29, '#82734e');
  ellipse(c, 0, -22, 34, 31, '#617d4e');
  ellipse(c, -14, -28, 23, 25, '#789052');
  ellipse(c, 12, -35, 24, 24, '#8c9e5a');
  ellipse(c, 9, -43, 13, 11, '#a3ae6c'); c.restore();
}
function pot(c, x, y) {
  ellipse(c, x + 3, y + 5, 12, 5, '#344a3020');
  rect(c, x - 7, y - 4, 14, 15, '#b17e55');
  ellipse(c, x, y - 6, 12, 9, '#66874c');
  ellipse(c, x - 4, y - 12, 6, 10, '#87a163');
}
function building(c, b) {
  const { x, y, w, h } = b;
  rect(c, x + 13, y + 14, w, h + 6, '#3b4e3326');
  rect(c, x, y + 18, w, h - 18, '#d4bf8f');
  rect(c, x + 6, y + h - 40, w - 12, 40, '#b79d72');
  rect(c, x + w / 2 - 14, y + h - 38, 28, 38, '#5d6650');
  [x + 25, x + w - 53].forEach(wx => {
    rect(c, wx, y + h - 39, 28, 23, '#5c705c');
    line(c, [[wx + 14, y + h - 39], [wx + 14, y + h - 16]], '#a7ac84', 2);
  });
  rect(c, x - 8, y, w + 16, h - 50, b.color);
  for (let i = 5; i < w + 16; i += 12) line(c, [[x - 8 + i, y + 3], [x - 8 + i, y + h - 53]], '#f5e5b521', 2);
  line(c, [[x - 8, y + (h - 50) / 2], [x + w + 8, y + (h - 50) / 2]], '#5a594445', 4);
  rect(c, x - 10, y + h - 54, w + 20, 6, '#766344');
  if (b.name === 'Market' || b.name === 'River tea shop') {
    const aw = w + 10;
    for (let i = 0; i < aw; i += 20) {
      rect(c, x - 5 + i, y + h - 22, Math.min(20, aw - i), 31, (i / 20) % 2 ? '#eee0b8' : b.name === 'Market' ? '#b7714f' : '#768d68');
    }
    line(c, [[x - 5, y + h + 9], [x - 5, y + h + 27]], '#84704d', 3);
    line(c, [[x + w + 5, y + h + 9], [x + w + 5, y + h + 27]], '#84704d', 3);
  }
  pot(c, x - 20, y + h - 3); pot(c, x + w + 20, y + h - 3);
}

const scenery = document.createElement('canvas');
scenery.width = WORLD.width; scenery.height = WORLD.height;
const art = scenery.getContext('2d');
function paintTown() {
  rect(art, 0, 0, WORLD.width, WORLD.height, '#b6c494');
  let seed = 73;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 5200; i++) {
    const x = random() * WORLD.river, y = random() * WORLD.height;
    rect(art, x, y, random() * 4 + 1, 2, i % 3 ? '#8fa57535' : '#e5d8a533');
  }
  // All lanes stay open; decorative plants never create invisible collision walls.
  [[0, 405, 1475, 155], [730, 0, 145, 1250], [0, 900, 1500, 120], [1320, 0, 145, 1250], [870, 555, 440, 140]].forEach(r => {
    rect(art, r[0] - 7, r[1] - 7, r[2] + 14, r[3] + 14, '#c7c596');
    rect(art, ...r, '#d7c99e');
  });
  for (let i = 0; i < 1000; i++) {
    const x = random() * 1480, y = random() * WORLD.height;
    if ((y > 410 && y < 550) || (x > 740 && x < 865) || (y > 905 && y < 1015) || (x > 1330 && x < 1450)) rect(art, x, y, 3, 1, '#ac9e6e35');
  }
  rect(art, WORLD.river - 20, 0, 24, WORLD.height, '#dad1aa');
  rect(art, WORLD.river, 0, WORLD.width - WORLD.river, WORLD.height, '#7caaa4');
  for (let i = 0; i < 140; i++) {
    const x = WORLD.river + random() * 270, y = random() * WORLD.height;
    line(art, [[x, y], [x + 10 + random() * 40, y]], '#c0d0b747', 2);
  }
  // Garden plots and a small timber landing by the water.
  [[80, 835], [1020, 60], [450, 1080]].forEach(([x, y]) => {
    rect(art, x, y, 145, 65, '#a49c6f');
    for (let j = 0; j < 4; j++) {
      line(art, [[x + 8, y + 9 + j * 15], [x + 138, y + 9 + j * 15]], '#d3c696', 2);
      for (let i = 0; i < 8; i++) ellipse(art, x + 12 + i * 17, y + 7 + j * 15, 5, 4, '#6d8a50');
    }
  });
  rect(art, 1465, 1075, 180, 66, '#a38a60');
  for (let y = 1080; y < 1140; y += 10) line(art, [[1465, y], [1645, y]], '#d2ba8b', 2);
  ellipse(art, 1690, 1120, 16, 55, '#596c57'); ellipse(art, 1690, 1115, 10, 44, '#b69864');
  buildings.forEach(b => building(art, b));
  // Open-air produce tables at the market.
  [[220, 380], [330, 380], [540, 380]].forEach(([x, y], table) => {
    rect(art, x, y, 65, 25, '#9c8259');
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) ellipse(art, x + 9 + i * 12, y + 7 + j * 10, 5, 4, table === 1 ? '#ca8750' : '#a6a058');
  });
  // Tea tables, stools, and cups sit outside the shop.
  [[1170, 855], [1280, 860], [1170, 960], [1280, 960]].forEach(([x, y]) => {
    ellipse(art, x + 4, y + 8, 22, 13, '#40533321');
    ellipse(art, x, y, 21, 15, '#a38a60');
    [[-29, 0], [29, 0]].forEach(([dx, dy]) => ellipse(art, x + dx, y + dy, 7, 6, '#a3885b'));
    ellipse(art, x - 6, y - 2, 4, 3, '#f3e6bf'); ellipse(art, x + 6, y + 3, 4, 3, '#f3e6bf');
  });
  [[85, 120, 1.3], [110, 330, 1], [680, 220, 1.3], [650, 80, 1], [900, 90, 1], [1180, 85, 1.2], [1450, 150, 1.2], [95, 600, 1.2], [380, 690, .9], [680, 770, 1.2], [890, 800, 1.3], [1010, 870, .9], [1400, 660, 1.1], [1415, 815, .8], [80, 1100, 1.2], [480, 1190, 1.1], [700, 1120, 1.2], [1160, 1150, 1.2], [1420, 1190, 1]].forEach(t => tree(art, ...t));
  // Laundry and fencing are visual only, leaving the lane freely explorable.
  line(art, [[355, 650], [425, 650]], '#766e50', 2);
  ['#e8dcad', '#a56e59', '#8c9b88'].forEach((color, i) => rect(art, 362 + i * 20, 650, 14, 23, color));
  for (let i = 0; i < 12; i++) rect(art, 175 + i * 19, 1175, 5, 18, '#9a9263');
  line(art, [[175, 1181], [390, 1181]], '#9a9263', 3);
  text(art, 'MARKET STREET', 520, 540, 13, '#94845a');
  text(art, 'RESIDENTIAL LANE', 440, 995, 12, '#94845a');
  text(art, 'RIVER TEA SHOP', 1210, 680, 12, '#6d7752');
  art.save(); art.translate(1478, 725); art.rotate(-Math.PI / 2); text(art, 'RIVERSIDE PATH', 0, 0, 12, '#6c8261'); art.restore();
  // Festive fabric shades the market lane without adding another gameplay system.
  line(art, [[190, 130], [640, 160]], '#8b8a60', 1);
  for (let i = 0; i < 16; i++) {
    const x = 200 + i * 27, y = 131 + i * 1.8;
    art.fillStyle = ['#b4774f', '#d5bd75', '#80946b'][i % 3]; art.beginPath(); art.moveTo(x, y); art.lineTo(x + 13, y + 2); art.lineTo(x + 7, y + 19); art.fill();
  }
}
paintTown();

function person(c, p) {
  ellipse(c, p.x + 3, p.y + 9, 12, 5, '#233c2a30');
  rect(c, p.x - 6, p.y - 2, 12, 14, '#5c6852');
  ellipse(c, p.x, p.y - 6, 9, 11, p.color);
  ellipse(c, p.x, p.y - 17, 7, 7, '#c29468');
  ellipse(c, p.x - 1, p.y - 21, 7, 3, '#4b5240');
}
function bicycle(c, time, moving) {
  c.save(); c.translate(state.x, state.y); c.rotate(state.angle);
  ellipse(c, 3, 8, 27, 9, '#203d292b');
  c.strokeStyle = '#425e50'; c.lineWidth = 3;
  [-19, 19].forEach(x => { c.beginPath(); c.ellipse(x, 0, 10, 5, 0, 0, Math.PI * 2); c.stroke(); });
  line(c, [[-19, 0], [-4, -7], [9, 1], [-19, 0], [0, 8], [9, 1], [19, 0]], '#c59557', 3);
  line(c, [[17, -10], [15, 8]], '#4d5e4c', 3);
  const pedal = moving && !reducedMotion ? Math.sin(time * .02) * 4 : 0;
  line(c, [[-3, -12 + pedal], [5, 8 - pedal]], '#4d635b', 5);
  ellipse(c, -3, -3, 10, 12, '#e6d6a8');
  line(c, [[-2, -10], [13, -9]], '#ba9067', 4);
  ellipse(c, -3, -4, 7, 7, '#ba9067');
  ellipse(c, -5, -5, 10, 9, '#d7b971');
  ellipse(c, -6, -7, 7, 6, '#e6cd8e');
  rect(c, -28, -9, 12, 18, '#a57f4a');
  if (state.parcel) { rect(c, -27, -7, 10, 14, '#e1c996'); line(c, [[-22, -7], [-22, 7]], '#ad8250', 1); }
  c.restore();
}
function marker(c, target, time) {
  if (!target) return;
  const y = target.y - 46 + (reducedMotion ? 0 : Math.sin(time / 350) * 3);
  c.fillStyle = '#efd18b'; c.beginPath(); c.moveTo(target.x, y + 8); c.lineTo(target.x - 7, y); c.lineTo(target.x, y - 8); c.lineTo(target.x + 7, y); c.closePath(); c.fill();
  c.strokeStyle = '#755b39'; c.lineWidth = 1; c.stroke();
}
function draw(time, moving) {
  const vw = width / zoom, vh = height / zoom;
  camera.x = Math.max(0, Math.min(WORLD.width - vw, state.x - vw / 2));
  camera.y = Math.max(0, Math.min(WORLD.height - vh, state.y - vh / 2));
  ctx.clearRect(0, 0, width, height);
  ctx.save(); ctx.scale(zoom, zoom); ctx.translate(-camera.x, -camera.y);
  ctx.drawImage(scenery, 0, 0);
  if (!reducedMotion) {
    for (let i = 0; i < 16; i++) {
      const y = (i * 89 + time * .009) % WORLD.height;
      line(ctx, [[1555, y], [1595 + Math.sin(i + time / 1800) * 14, y]], '#d9e4c644', 2);
    }
  }
  people.forEach(p => person(ctx, p));
  if (!state.helped) fruit.filter(f => !state.collected.includes(f.id)).forEach(f => {
    ellipse(ctx, f.x + 2, f.y + 3, 8, 4, '#57643725'); ellipse(ctx, f.x, f.y, 7, 5, '#d5a74c');
    line(ctx, [[f.x, f.y - 3], [f.x + 4, f.y - 7]], '#5e7a40', 2);
  });
  marker(ctx, nextStop(state), time);
  bicycle(ctx, time, moving);
  const near = nearby(state);
  if (near) {
    ellipse(ctx, near.x, near.y + 16, 18, 7, '#fcf4c44d');
    text(ctx, near.label, near.x, near.y - 33, 11, '#2e4937');
  }
  ctx.restore();
  // A fixed compass remains readable as the camera follows the rider.
  text(ctx, 'N', width - 32, height - 82, 10, '#3f5a46');
  line(ctx, [[width - 32, height - 74], [width - 32, height - 54]], '#526d4e', 1);
  line(ctx, [[width - 36, height - 68], [width - 32, height - 74], [width - 28, height - 68]], '#526d4e', 1);
}

function renderMap() {
  const map = $('town-map'), c = map.getContext('2d');
  c.clearRect(0, 0, map.width, map.height);
  c.drawImage(scenery, 0, 0, map.width, map.height);
  const sx = map.width / WORLD.width, sy = map.height / WORLD.height;
  places.forEach(p => {
    const x = p.x * sx, y = p.y * sy;
    rect(c, x - 57, y + 9, 114, 21, '#f9f5e6ed'); text(c, p.name, x, y + 23, 10);
  });
  const target = nextStop(state);
  if (target) { c.save(); c.translate(target.x * sx, target.y * sy); c.rotate(Math.PI / 4); rect(c, -5, -5, 10, 10, '#eac372'); c.strokeStyle = '#715b30'; c.strokeRect(-5, -5, 10, 10); c.restore(); }
  ellipse(c, state.x * sx, state.y * sy, 7, 7, '#fff6da'); ellipse(c, state.x * sx, state.y * sy, 4, 4, '#234c42');
  text(c, 'N ↑', 575, 25, 12);
}

function updateUI() {
  const signature = JSON.stringify([state.parcel, state.delivered, state.helping, state.helped, state.collected, state.discovered]);
  if (signature !== uiSignature) {
    uiSignature = signature;
    $('objective').textContent = objective(state);
    const tasks = [
      ['Collect the market parcel', state.parcel || state.delivered],
      ['Help your neighbor', state.helped],
      ['Deliver to the tea shop', state.delivered]
    ];
    $('tasks').replaceChildren(...tasks.map(([label, done]) => { const li = document.createElement('li'); li.textContent = label; li.classList.toggle('done', done); return li; }));
    $('discoveries').replaceChildren(...places.map(p => { const li = document.createElement('li'); li.textContent = p.name; li.classList.toggle('found', state.discovered.includes(p.id)); return li; }));
    $('discovery-count').textContent = `${state.discovered.length} / 4`;
    $('inventory').textContent = state.parcel ? `Tea cups${state.collected.length && !state.helped ? ` · ${state.collected.length} mangoes` : ''}` : state.collected.length && !state.helped ? `${state.collected.length} mangoes` : state.delivered ? 'A little gratitude' : 'Room for a small adventure';
    $('mood').textContent = completed(state) ? 'A good afternoon. Your journey continues.' : 'A little kindness goes a long way.';
  }
  const nearestPlace = [...places].sort((a, b) => Math.hypot(state.x - a.x, state.y - a.y) - Math.hypot(state.x - b.x, state.y - b.y))[0];
  $('location').textContent = nearestPlace.name;
  const near = nearby(state);
  $('interaction').hidden = !near || !started || paused || conversation.open || mapDialog.open;
  if (near) $('interaction-text').textContent = near.id.startsWith('fruit') ? 'Collect mango' : `Talk to ${near.label.toLowerCase()}`;
}
function clearKeys() { keys.clear(); }
function showDialog(speaker, speech, kicker = 'AROUND TOWN') {
  clearKeys(); $('speaker').textContent = speaker; $('speech').textContent = speech; $('dialog-kicker').textContent = kicker;
  conversation.showModal(); updateUI();
}
function talk() {
  if (!started || paused || conversation.open || mapDialog.open) return;
  const target = nearby(state);
  if (!target) return;
  const speech = interact(state, target.id);
  if (!speech) return;
  if (completed(state) && !won) {
    won = true;
    showDialog('A good afternoon.', `${speech}\n\nJOURNEY COMPLETE — Your neighbor is helped and the parcel is delivered. Keep riding to discover all four corners of town, or start a new afternoon.`, 'DELIVERY COMPLETE · KINDNESS RETURNED');
  } else showDialog(target.name, speech);
  updateUI();
}
function togglePause() {
  if (!started || conversation.open || mapDialog.open) return;
  paused = !paused; clearKeys();
  $('pause-overlay').hidden = !paused;
  $('pause').textContent = paused ? 'Continue journey' : 'Pause journey';
  if (paused) $('resume').focus(); else canvas.focus({ preventScroll: true });
  updateUI();
}
function openMap() {
  if (!started || paused || conversation.open || mapDialog.open) return;
  clearKeys(); renderMap(); mapDialog.showModal(); updateUI();
}
function reset() {
  if (started && !confirm('Start a new afternoon? Your current journey will be reset.')) return;
  state = freshState(); won = false; paused = false; clearKeys(); uiSignature = '';
  $('pause-overlay').hidden = true; $('pause').textContent = 'Pause journey';
  discover(state); updateUI();
  if (started) canvas.focus({ preventScroll: true });
}
$('start').onclick = () => { started = true; $('welcome').hidden = true; canvas.focus({ preventScroll: true }); updateUI(); };
$('help').onclick = () => {
  if (conversation.open || mapDialog.open) return;
  showDialog('Find your own pace.', 'Ride with WASD or the arrow keys. On a touch screen, use the direction buttons.\n\nLook for the gold diamond marking your next stop. Ride close to a person or mango and press E (or Talk / collect). Press M for the town map and Escape to pause.\n\nCollect the market parcel, help your neighbor, and deliver to the tea shop. You can do the tasks in either order. There is no timer or combat.\n\nThis is a small fictional Myanmar-inspired town. Progress lasts until you refresh the page or start a new afternoon.', 'HOW TO PLAY');
};
$('close-dialog').onclick = () => conversation.close();
$('close-map').onclick = () => mapDialog.close();
for (const dialog of [conversation, mapDialog]) dialog.addEventListener('close', () => {
  clearKeys(); if (started && !paused) canvas.focus({ preventScroll: true }); updateUI();
});
$('map-button').onclick = openMap;
$('pause').onclick = togglePause;
$('resume').onclick = togglePause;
$('restart').onclick = reset;
$('touch-interact').onclick = talk;
canvas.addEventListener('pointerdown', () => canvas.focus({ preventScroll: true }));
window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (conversation.open || mapDialog.open) {
    if (key === 'e' && !event.repeat) { if (conversation.open) conversation.close(); }
    return;
  }
  if (key === 'escape') { event.preventDefault(); togglePause(); return; }
  if (!started || paused) return;
  if (document.activeElement !== canvas && document.activeElement !== document.body) return;
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', 'm', ' '].includes(key)) event.preventDefault();
  if (key === 'e' && !event.repeat) talk();
  else if (key === 'm' && !event.repeat) openMap();
  else keys.add(key);
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', clearKeys);
document.addEventListener('visibilitychange', () => { clearKeys(); if (document.hidden && started && !paused && !conversation.open && !mapDialog.open) togglePause(); });
document.querySelectorAll('[data-key]').forEach(button => {
  button.addEventListener('pointerdown', event => { event.preventDefault(); if (started && !paused && !conversation.open && !mapDialog.open) { button.setPointerCapture(event.pointerId); keys.add(button.dataset.key); } });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => keys.delete(button.dataset.key));
});
new ResizeObserver(() => {
  const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  width = box.width; height = box.height; canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}).observe(canvas);
function frame(time) {
  const dt = last ? (time - last) / 1000 : 0; last = time;
  const active = started && !paused && !conversation.open && !mapDialog.open;
  const dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  const dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
  if (active) { move(state, dx, dy, dt); discover(state); }
  draw(time, active && Boolean(dx || dy)); updateUI();
  requestAnimationFrame(frame);
}
discover(state); updateUI(); requestAnimationFrame(frame);
