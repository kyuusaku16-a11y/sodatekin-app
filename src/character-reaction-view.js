import { buildCharacterMesh } from './character-mesh.js';
import { cheerSleeveMarkup, cheerWristbandMarkup } from './character-outfit.js';

const round = value => Math.round(value * 100) / 100;
const point = (x, y) => `${round(x)} ${round(y)}`;

// A separate short-lived arm layer avoids folding the continuous body mesh at
// the elbows. Attachment points and arm widths come from that same body mesh.
export function cheerArmGeometry(values, { bodyType = 'classic', back = false } = {}) {
  const { vertices } = buildCharacterMesh(values, { bodyType, back });
  const at = (y, column) => {
    let lower = 0;
    while (lower + 17 < vertices.length && vertices[lower + 17][1] < y) lower += 17;
    const a = vertices[lower + column], b = vertices[Math.min(lower + 17 + column, vertices.length - 17 + column)];
    const t = Math.max(0, Math.min(1, (y - a[1]) / (b[1] - a[1] || 1)));
    return a.map((value, index) => value + (b[index] - value) * t);
  };
  return [-1, 1].map(side => {
    const column = distance => 8 + side * distance;
    const x = (y, distance) => side * (at(y, column(distance))[0] - 200);
    const radius = Math.max(7, Math.min(25, Math.max(...[190, 235].map(y => (x(y, 6) - x(y, 4)) / 2))));
    const shoulder = { x: x(178, 5), y: 174 };
    // Leave room for the outward 18-degree entry, including the clenched fist.
    const elbow = { x: Math.min(156 - radius, shoulder.x + 43 + radius * .25), y: 225 };
    const wrist = { x: elbow.x + 3, y: side < 0 ? 151 : 158 };
    return { side, radius, shoulder, elbow, wrist, rootTop: { x: x(155, 2) - 1, y: 155 }, rootBottom: { x: x(208, 2) - 1, y: 208 }, sample: at(210, column(5)), back };
  });
}

function armMarkup(geometry, outfit) {
  const { side, radius: r, shoulder: s, elbow: e, wrist: w, rootTop: top, rootBottom: bottom, back } = geometry;
  const upper = `M${point(top.x, top.y)} Q${point(s.x + r + 5, 153)} ${point(s.x + r + 9, 182)} L${point(e.x + r * .7, e.y - r * .65)} Q${point(e.x + r * 1.2, e.y + r * .25)} ${point(e.x, e.y + r)} Q${point(e.x - r * .6, e.y + r)} ${point(s.x - r * .65, 199)} Q${point(bottom.x + 2, 200)} ${point(bottom.x, bottom.y)}`;
  const forearm = `M${point(e.x - r * .8, e.y)} Q${point(e.x - r, e.y - r)} ${point(w.x - r * .65, w.y + 2)} L${point(w.x + r * .65, w.y + 2)} Q${point(w.x + r * .9, w.y + 38)} ${point(e.x + r * .8, e.y)} Q${point(e.x, e.y + r * .7)} ${point(e.x - r * .8, e.y)} Z`;
  const f = r * .85 + 3;
  const fist = `M${point(-f * .65, f * .5)} Q${point(-f * 1.08, f * .14)} ${point(-f, -f * .4)} L${point(-f * .85, -f * 1.1)} Q${point(-f * .6, -f * 1.5)} ${point(-f * .28, -f * 1.35)} Q${point(f * .05, -f * 1.65)} ${point(f * .36, -f * 1.35)} Q${point(f * .83, -f * 1.45)} ${point(f * .98, -f * .95)} L${point(f, f * .08)} Q${point(f * .9, f * .5)} ${point(f * .5, f * .6)} Z`;
  const thumb = `M${point(-f * .95, -f * .35)} Q${point(-f * .55, -f * .7)} ${point(-f * .07, -f * .18)} L${point(f * .25, f * .06)} Q${point(f * .4, f * .38)} ${point(f * .08, f * .48)} L${point(-f * .55, f * .18)}`;
  const creases = back ? `M${point(-f * .5, -f * .84)} L${point(-f * .48, -f * .4)} M${point(f * .05, -f * .95)} L${point(f * .03, -f * .5)}` : `M${point(-f * .35, -f * 1.1)} L${point(-f * .38, -f * .57)} M${point(f * .14, -f * 1.15)} L${point(f * .12, -f * .58)} M${point(f * .6, -f * 1)} L${point(f * .58, -f * .55)}`;
  return `<g transform="translate(200 0) scale(${side} 1)"><path d="${upper} Z" class="cheer-skin" stroke="none"/><path d="${upper}" class="cheer-outline" fill="none"/><path d="M${point(s.x + r * .25, 184)} Q${point(s.x + 22, 204)} ${point(e.x - r * .15, e.y + r * .24)}" class="cheer-shade" stroke-width="${round(r * .48)}" fill="none"/>${cheerSleeveMarkup(geometry, outfit)}<g class="character-cheer-forearm" style="transform-origin:${round(e.x)}px ${e.y}px"><path d="${forearm}" class="cheer-skin cheer-outline"/><path d="M${point(e.x + r * .35, e.y - 3)} Q${point(w.x + r * .45, w.y + 31)} ${point(w.x + r * .3, w.y + 10)}" class="cheer-shade" stroke-width="${round(r * .32)}" fill="none"/>${cheerWristbandMarkup(geometry, outfit)}<g transform="translate(${point(w.x, w.y)})"><path d="${fist}" class="cheer-skin cheer-outline"/><path d="${thumb}" class="cheer-skin cheer-outline"/><path d="${creases}" class="cheer-crease" fill="none"/></g></g></g>`;
}

export function cheerArmsMarkup(values, options) {
  return `<svg class="character-cheer-arms" viewBox="0 0 400 552" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${cheerArmGeometry(values, options).map(geometry => armMarkup(geometry, options?.outfit)).join('')}</svg>`;
}
