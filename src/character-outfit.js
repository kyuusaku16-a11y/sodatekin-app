import { portraitCoordinates, shapeStage } from './character-mesh.js';

const GARMENTS = ['relaxed-tee', 'tee', 'tank', 'none'];
const ACCESSORIES = ['towel', 'wristbands'];
const palettes = {
  sand: { base: '#eddbb5', shade: '#d2bf97', edge: '#65583f', rib: '#f5e7c8', band: '#eee5ce', stripe: '#8d9c77' },
  navy: { base: '#3d5069', shade: '#2d4058', edge: '#25364a', rib: '#71839a', band: '#6d8198', stripe: '#c9d3ce' },
};
const waist = {
  slim: { front: [288, 287.5, 286.5, 287, 286.5], back: [285.5, 284.5, 285.5, 284.5, 281.5] },
  natural: { front: [288.5, 288.5, 289, 289, 289], back: [282, 282, 282, 282, 281.5] },
  round: { front: [297, 296.5, 297.5, 304, 305], back: [292.5, 292, 291.5, 294, 285] },
  classic: { front: [282.5, 280.5, 279, 277, 272.5], back: [280.5, 277, 275, 274, 269] },
};
const round = n => Math.round(n * 100) / 100;
const p = point => `${round(point.x)} ${round(point.y)}`;
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const curve = points => points.slice(0, -1).map((a, i) => {
  const before = points[Math.max(0, i - 1)], b = points[i + 1], after = points[Math.min(points.length - 1, i + 2)];
  return `C${p({ x: a.x + (b.x - before.x) / 6, y: a.y + (b.y - before.y) / 6 })} ${p({ x: b.x - (after.x - a.x) / 6, y: b.y - (after.y - a.y) / 6 })} ${p(b)}`;
}).join(' ');
const path = (d, fill, stroke, width = 2) => `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"` : ''}/>`;

export function normalizeOutfit(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return { garment: GARMENTS.includes(value.garment) ? value.garment : 'none', color: value.color === 'navy' ? 'navy' : 'sand', accessories: ACCESSORIES.filter(id => Array.isArray(value.accessories) && value.accessories.includes(id)) };
}
export function hasOutfit(value) { const outfit = normalizeOutfit(value); return !!outfit && (outfit.garment !== 'none' || outfit.accessories.length > 0); }
export function outfitLabel(value) {
  const outfit = normalizeOutfit(value);
  if (!hasOutfit(outfit)) return '';
  const name = { 'relaxed-tee': 'ゆったりTシャツ', tee: '半袖Tシャツ', tank: 'タンクトップ' }[outfit.garment];
  return `${name ? `${outfit.color === 'navy' ? 'ネイビー' : 'サンド'}の${name}。` : ''}${outfit.accessories.includes('towel') ? '首にタオル。' : ''}${outfit.accessories.includes('wristbands') ? '両手首にリストバンド。' : ''}`;
}

export function outfitGeometry(values, { bodyType = 'classic', back = false, expression = 'normal', outfit: input } = {}) {
  const outfit = normalizeOutfit(input), type = Object.hasOwn(waist, bodyType) ? bodyType : 'classic';
  const at = portraitCoordinates(values, { bodyType: type, back, expression });
  const stage = shapeStage(values.glutes), low = Math.min(3, Math.floor(stage)), t = stage - low;
  const tops = waist[type][back ? 'back' : 'front'];
  const hem = tops[low] + (tops[low + 1] - tops[low]) * t + (outfit?.garment === 'relaxed-tee' ? 16 : outfit?.garment === 'tee' ? 11 : 8);
  const ease = outfit?.garment === 'relaxed-tee' ? 7 : outfit?.garment === 'tee' ? 3.5 : 1;
  const neckY = type === 'classic' ? 153 : 165;
  const nearNeck = (y, side, width = 28) => {
    const center = at(y), edge = at(y, side);
    return lerp(center, edge, Math.min(1, width / Math.abs(edge.x - center.x)));
  };
  const sleeveY = (outfit?.garment === 'relaxed-tee' ? 225 : 210) + (type === 'classic' ? 0 : 10);
  const sides = [-1, 1].map(side => ({
    side, neck: nearNeck(neckY, side), shoulder: at(type === 'classic' ? 170 : 182, side, 6, 3 + ease * .4), sleeveOuter: at(sleeveY, side, 6, 3 + ease * .55), sleeveInner: at(sleeveY + 3, side, 4, -1),
    strap: outfit?.garment === 'tank' ? lerp(nearNeck(neckY, side), at(type === 'classic' ? 170 : 179, side, 2, 3), .65) : at(type === 'classic' ? 170 : 179, side, 2, 3), pit: at(230, side, 2, ease), chest: at(242, side, 2, ease), waist: at(263, side, 2, ease), hem: at(hem, side, 2, ease),
    bandInnerTop: at(309, side, 4, -1), bandOuterTop: at(309, side, 6, 1), bandInnerBottom: at(321, side, 4, -1), bandOuterBottom: at(321, side, 6, 1),
  }));
  return { outfit, at, nearNeck, sides, hem, expression, back, neckY, sleeveY, ease, bodyType: type };
}

function shirtMarkup(geometry) {
  const { outfit, sides: [l, r], at, hem, expression, back, neckY, sleeveY, ease } = geometry;
  if (outfit.garment === 'none') return '';
  const c = palettes[outfit.color], tank = outfit.garment === 'tank', cheer = expression === 'cheer';
  const neckMid = at(neckY + (back ? 9 : tank ? 33 : 25)), hemMid = at(hem + 2);
  const sideDown = s => `Q${p(s.chest)} ${p(s.waist)} L${p(s.hem)}`;
  const outer = s => [s.neck, at(neckY + 5, s.side, 6, 3), s.shoulder, at(198, s.side, 6, 3 + ease * .5), s.sleeveOuter];
  const leftUpper = tank || cheer ? `L${p(l.strap)} Q${p(at(204, -1, 2, tank ? -6 : 2))} ${p(l.pit)}` : `${curve(outer(l))} Q${p(at(sleeveY + 5, -1, 5))} ${p(l.sleeveInner)} L${p(l.pit)}`;
  const rightUpper = tank || cheer ? `Q${p(at(204, 1, 2, tank ? -6 : 2))} ${p(r.strap)} L${p(r.neck)}` : `L${p(r.sleeveInner)} Q${p(at(sleeveY + 5, 1, 5))} ${p(r.sleeveOuter)} ${curve(outer(r).reverse())}`;
  const outline = `M${p(l.neck)} ${leftUpper} ${sideDown(l)} Q${p(hemMid)} ${p(r.hem)} L${p(r.waist)} Q${p(r.chest)} ${p(r.pit)} ${rightUpper} Q${p(neckMid)} ${p(l.neck)} Z`;
  let html = path(outline, c.base);
  for (const s of [l, r]) {
    const inset = point => ({ x: point.x - s.side * 5, y: point.y });
    html += path(`M${p(s.pit)} Q${p(s.chest)} ${p(s.waist)} L${p(s.hem)} L${p(inset(s.hem))} Q${p(inset(s.waist))} ${p(inset(s.pit))}Z`, c.shade);
    if (!tank && !cheer) html += path(`M${p(s.sleeveOuter)} Q${p(at(sleeveY + 5, s.side, 5))} ${p(s.sleeveInner)}`, 'none', c.rib, 3);
    if (tank) html += path(`M${p(s.strap)} Q${p(at(204, s.side, 2, -6))} ${p(s.pit)}`, 'none', c.rib, 3.2);
  }
  html += path(outline, 'none', c.edge, 2.3);
  html += path(`M${p(l.neck)} Q${p(neckMid)} ${p(r.neck)}`, 'none', c.rib, tank ? 3.4 : 4.5);
  html += path(`M${p({ x: l.hem.x + 3, y: l.hem.y - 5 })} Q${p({ x: hemMid.x, y: hemMid.y - 5 })} ${p({ x: r.hem.x - 3, y: r.hem.y - 5 })}`, 'none', c.shade, 1.5);
  return `<g class="outfit-garment" data-garment="${outfit.garment}">${html}</g>`;
}

function towelMarkup({ at, nearNeck, back, neckY }) {
  const l = nearNeck(neckY, -1, 30), r = nearNeck(neckY, 1, 30);
  const low = at(neckY + 16);
  let html = path(`M${p(l)} Q${p(low)} ${p(r)} L${p(nearNeck(neckY + 7, 1, 32))} Q${p(at(neckY + 27))} ${p(nearNeck(neckY + 7, -1, 32))}Z`, '#f1e7ce', '#a79b7b', 1.5);
  if (!back) for (const side of [-1, 1]) {
    const top = nearNeck(neckY + 5, side, 30), mid = nearNeck(neckY + 33, side, 28), bottom = nearNeck(neckY + (side < 0 ? 72 : 63), side, 27);
    html += path(`M${p({ x: top.x - 6, y: top.y })} Q${p({ x: mid.x - 7, y: mid.y })} ${p({ x: bottom.x - 7, y: bottom.y })} Q${p({ x: bottom.x, y: bottom.y + 3 })} ${p({ x: bottom.x + 7, y: bottom.y })} Q${p({ x: mid.x + 7, y: mid.y })} ${p({ x: top.x + 6, y: top.y })}Z`, '#f1e7ce', '#a79b7b', 1.5);
    html += path(`M${round(bottom.x - 5)} ${round(bottom.y - 7)}L${round(bottom.x + 5)} ${round(bottom.y - 7)}`, 'none', '#8d9d80', 2.7);
  }
  return `<g class="outfit-towel">${html}</g>`;
}

function bandsMarkup({ outfit, sides }) {
  const c = palettes[outfit.color];
  return `<g class="outfit-wristbands">${sides.map(s => {
    const a = s.bandInnerTop, b = s.bandOuterTop, d = s.bandInnerBottom, e = s.bandOuterBottom;
    const midTop = lerp(a, b, .5), midBottom = lerp(d, e, .5);
    return path(`M${p(a)} Q${p({ x: midTop.x, y: midTop.y + 2 })} ${p(b)} L${p(e)} Q${p({ x: midBottom.x, y: midBottom.y + 2 })} ${p(d)}Z`, c.band, c.edge, 1.4) + path(`M${p(lerp(a, d, .6))}L${p(lerp(b, e, .6))}`, 'none', c.stripe, 2.7);
  }).join('')}</g>`;
}

export function outfitLayers(values, options = {}) {
  const outfit = normalizeOutfit(options.outfit);
  if (!hasOutfit(outfit)) return { upper: '', lower: '' };
  const geometry = outfitGeometry(values, { ...options, outfit });
  return {
    upper: shirtMarkup(geometry) + (outfit.accessories.includes('towel') ? towelMarkup(geometry) : ''),
    lower: outfit.accessories.includes('wristbands') && options.expression !== 'cheer' ? bandsMarkup(geometry) : '',
  };
}
export function outfitMarkup(layers) {
  return layers.upper || layers.lower ? `<svg class="character-outfit" viewBox="0 0 400 552" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${layers.upper}${layers.lower}</svg>` : '';
}

export function cheerSleeveMarkup({ radius: r, shoulder: s, elbow: e, rootTop: top, rootBottom: bottom }, value) {
  const outfit = normalizeOutfit(value);
  if (!outfit || !['relaxed-tee', 'tee'].includes(outfit.garment)) return '';
  const c = palettes[outfit.color], t = outfit.garment === 'relaxed-tee' ? .77 : .53;
  const outerStart = { x: s.x + r + 9, y: 182 }, outerEnd = { x: e.x + r * .7, y: e.y - r * .65 };
  const innerStart = { x: s.x - r * .65, y: 199 }, innerControl = { x: e.x - r * .6, y: e.y + r }, innerEnd = { x: e.x, y: e.y + r };
  const out = lerp(outerStart, outerEnd, t), control = lerp(innerStart, innerControl, t), inner = lerp(lerp(innerStart, innerControl, t), lerp(innerControl, innerEnd, t), t);
  const cuff = lerp(out, inner, .5); cuff.y += 2;
  const d = `M${p(top)} Q${round(s.x + r + 5)} 153 ${p(outerStart)} L${p(out)} Q${p(cuff)} ${p(inner)} Q${p(control)} ${p(innerStart)} Q${round(bottom.x + 2)} 200 ${p(bottom)}`;
  return `<g class="outfit-cheer-sleeve">${path(`${d}Z`, c.base)}${path(d, 'none', c.edge, 2)}${path(`M${p(out)}Q${p(cuff)}${p(inner)}`, 'none', c.rib, 3)}</g>`;
}
export function cheerWristbandMarkup({ radius: r, wrist: w }, value) {
  const outfit = normalizeOutfit(value);
  if (!outfit?.accessories.includes('wristbands')) return '';
  const c = palettes[outfit.color], x = w.x, y = w.y + 8, half = r * .76 + 1;
  return `<g class="outfit-cheer-wristband">${path(`M${round(x - half)} ${round(y)}Q${round(x)} ${round(y + 2)} ${round(x + half)} ${round(y)}L${round(x + half + .5)} ${round(y + 11)}Q${round(x)} ${round(y + 13)} ${round(x - half - .5)} ${round(y + 11)}Z`, c.band, c.edge, 1.4)}${path(`M${round(x - half)} ${round(y + 7)}H${round(x + half)}`, 'none', c.stripe, 2.7)}</g>`;
}
