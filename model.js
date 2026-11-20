export const WORLD = { width: 1800, height: 1250, river: 1530 };
export const buildings = [
  { x: 180, y: 180, w: 210, h: 170, color: '#b66e46', name: 'Market' },
  { x: 430, y: 220, w: 190, h: 150, color: '#8b9b72', name: 'Dry goods' },
  { x: 155, y: 620, w: 170, h: 155, color: '#b3946c', name: 'Home' },
  { x: 430, y: 710, w: 190, h: 165, color: '#798e79', name: 'Home' },
  { x: 170, y: 1010, w: 220, h: 130, color: '#b77c59', name: 'Home' },
  { x: 925, y: 170, w: 180, h: 180, color: '#b58b5c', name: 'Workshop' },
  { x: 1190, y: 220, w: 190, h: 150, color: '#87967a', name: 'Home' },
  { x: 1120, y: 690, w: 195, h: 130, color: '#aa694a', name: 'River tea shop' },
  { x: 930, y: 1030, w: 170, h: 120, color: '#a19975', name: 'Home' }
];
export const people = [
  { id: 'seller', name: 'The market seller', x: 470, y: 455, color: '#a55542', label: 'Market seller' },
  { id: 'neighbor', name: 'Your neighbor', x: 990, y: 505, color: '#6c6483', label: 'Neighbor' },
  { id: 'tea', name: 'The tea shop owner', x: 1230, y: 865, color: '#f0dfac', label: 'Tea shop owner' },
  { id: 'local', name: 'A local gardener', x: 670, y: 970, color: '#769357', label: 'Gardener' },
  { id: 'river', name: 'A riverside regular', x: 1430, y: 1050, color: '#c08351', label: 'Riverside regular' }
];
export const fruit = [
  { id: 'fruit0', x: 1045, y: 585 },
  { id: 'fruit1', x: 965, y: 695 },
  { id: 'fruit2', x: 1100, y: 645 }
];
export const places = [
  { id: 'market', name: 'Market street', x: 510, y: 480 },
  { id: 'homes', name: 'Residential lane', x: 620, y: 960 },
  { id: 'tea', name: 'River tea shop', x: 1240, y: 900 },
  { id: 'river', name: 'Riverside path', x: 1430, y: 1070 }
];
export function freshState() {
  return { x: 615, y: 495, angle: 0, parcel: false, delivered: false, helping: false, helped: false, collected: [], discovered: [] };
}
export function walkable(x, y) {
  const r = 16;
  return Number.isFinite(x) && Number.isFinite(y) && x >= r && x <= WORLD.river - r && y >= r && y <= WORLD.height - r &&
    !buildings.some(b => x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r);
}
export function move(state, dx, dy, seconds) {
  const length = Math.hypot(dx, dy);
  if (!length || !Number.isFinite(length) || !Number.isFinite(seconds) || seconds <= 0) return;
  const distance = 185 * Math.min(seconds, 0.05);
  const vx = dx / length * distance, vy = dy / length * distance;
  if (walkable(state.x + vx, state.y)) state.x += vx;
  if (walkable(state.x, state.y + vy)) state.y += vy;
  state.angle = Math.atan2(dy, dx);
}
export function discover(state) {
  for (const p of places) {
    if (Math.hypot(state.x - p.x, state.y - p.y) < 170 && !state.discovered.includes(p.id)) state.discovered.push(p.id);
  }
}
export function targets(state) {
  return [...people, ...(state.helping && !state.helped ? fruit.filter(f => !state.collected.includes(f.id)).map(f => ({ ...f, name: 'A fallen mango', label: 'Collect mango' })) : [])];
}
export function nearby(state) {
  return targets(state).filter(p => Math.hypot(state.x - p.x, state.y - p.y) < 66)
    .sort((a, b) => Math.hypot(state.x - a.x, state.y - a.y) - Math.hypot(state.x - b.x, state.y - b.y))[0];
}
export function completed(state) { return state.delivered && state.helped; }
export function nextStop(state) {
  if (!state.parcel && !state.delivered) return people[0];
  if (!state.helping || (state.collected.length === 3 && !state.helped)) return people[1];
  if (!state.helped) return fruit.find(f => !state.collected.includes(f.id));
  if (!state.delivered) return people[2];
  return null;
}
export function objective(state) {
  if (completed(state)) return 'Parcel delivered. Neighbor helped. The rest of the afternoon is yours — keep exploring.';
  if (!state.parcel && !state.delivered) return 'Your first stop: the market seller. A parcel is waiting for you.';
  if (!state.helping) return 'Your neighbor is beside the road east of the market. Stop and say hello.';
  if (!state.helped && state.collected.length < 3) return `Help gather the fallen mangoes south of your neighbor (${state.collected.length}/3).`;
  if (!state.helped) return 'All three mangoes collected. Return to your neighbor.';
  return 'Take the parcel southeast to the tea shop, near the river. The owner is outside.';
}
export function interact(state, id) {
  const target = nearby(state);
  if (!target || target.id !== id) return null;
  if (id === 'seller') {
    if (state.delivered) return 'You made it! Thank you. Some days, a small delivery is all the adventure you need.';
    if (state.parcel) return 'The tea shop is southeast, toward the river. Take the road east, then head south. There’s no hurry — say hello to the neighbors.';
    state.parcel = true;
    return 'Good afternoon! Would you take this parcel of tea cups to the tea shop by the river?\n\nFollow the road east, then south. Our neighbor is just down the road if you need directions. Mind the cups!';
  }
  if (id === 'neighbor') {
    if (state.helped) return 'Thanks again! The tea shop is southeast of here, beside the river. The owner is waiting outside. There’s always a seat in the shade.';
    if (state.collected.length === 3) {
      state.helped = true;
      return 'Every last one! Thank you for stopping. I was carrying more than this old basket could manage.\n\nThe tea shop is southeast, by the water. Tell the owner I’ll be along shortly.';
    }
    state.helping = true;
    return 'Oh dear, the basket tipped over! Could you pick up those three mangoes just south of me? Ride close to each one and press E.\n\nBring them back and I’ll point you toward the tea shop.';
  }
  if (id.startsWith('fruit')) {
    state.collected.push(id);
    return state.collected.length === 3 ? 'That’s all three. Time to take them back to your neighbor.' : `One mango safely in the basket. ${3 - state.collected.length} more to gather.`;
  }
  if (id === 'tea') {
    if (state.delivered) return 'Stay a while. The best part of the afternoon is having nowhere else you need to be.';
    if (!state.parcel) return 'Welcome! If you’re looking for a little work, the market seller has a parcel for me. You’ll find the market northwest from here.';
    state.parcel = false;
    state.delivered = true;
    return state.helped ? 'The cups arrived safely! And I hear you stopped to help our neighbor.\n\nSit down for a moment. Your delivery is finished, but there’s still a town to explore. This cup is on the house.' : 'The cups arrived safely — thank you!\n\nOur neighbor near the east road could use a hand with a fallen basket. There’s still time to make their afternoon a little easier.';
  }
  if (id === 'local') return 'I like this lane when the afternoon turns quiet. Follow it east and you’ll reach the tea shop. Keep going toward the water for the riverside path.\n\nSometimes a longer route is a better one.';
  if (id === 'river') return 'I come here to watch the light change on the water. No grand plans. Just a little room to breathe.\n\nThe tea shop is a short ride north. You can leave the rushing to someone else.';
  return null;
}
