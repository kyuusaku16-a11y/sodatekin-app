import { shapeStage } from './character-mesh.js';

export const LIFE_TIMING = Object.freeze({ breathSeconds: 4, blinkCycleSeconds: 18, blinkCentersSeconds: Object.freeze([3.2, 6, 11.2, 15.6]) });
export const LIFE_WAIST = 290;
const round = n => Math.round(n * 1000) / 1000;
const eye = (x, y, rx = 12.2, ry = 8) => ({ x, y, rx, ry });
// Measured in the existing 400 x 552 portrait, rather than a new face asset.
const eyes = {
  slim: [eye(178.5, 97), eye(221.8, 97)],
  natural: [eye(178, 97), eye(220.7, 96.7)],
  round: [eye(178, 98.2), eye(221.5, 97.7)],
};
const classicEyes = [
  [eye(179.1, 92, 11.8, 7.5), eye(218.1, 91.5, 11.8, 7.5)],
  [eye(179.5, 92, 11.8, 7.5), eye(217.9, 92, 11.8, 7.5)],
  [eye(179.3, 92, 11.8, 7.5), eye(218.2, 91.6, 11.8, 7.5)],
  [eye(180.5, 90.3, 11.8, 7.3), eye(218.5, 89.8, 11.8, 7.3)],
  [eye(180, 89.8, 11.8, 7.3), eye(220, 88.4, 11.8, 7.3)],
];

export function livingEnabled({ living = false, preview = false, expression = 'normal' } = {}) {
  return living === true && !preview && expression !== 'cheer';
}

export function lifeHeadPose(expression) {
  return expression === 'proud' ? { angle: -.055, drop: -3 } : expression === 'rest' ? { angle: .055, drop: 7 } : { angle: 0, drop: 0 };
}

export function lifeEyes(values, { bodyType = 'classic', back = false } = {}) {
  if (back) return [];
  if (eyes[bodyType]) return eyes[bodyType].map(e => ({ ...e }));
  // The original series blends all five face frames along with its head mesh.
  const stage = Object.values(values).reduce((sum, value) => sum + shapeStage(value), 0) / 8;
  const low = Math.min(3, Math.floor(stage)), t = stage - low;
  return classicEyes[low].map((a, i) => Object.fromEntries(Object.keys(a).map(key => [key, a[key] + (classicEyes[low + 1][i][key] - a[key]) * t])));
}

function lidMarkup(e, index) {
  return `<g class="character-life-eye" data-eye="${index}"><ellipse class="character-life-lid-cover" cx="${round(e.x)}" cy="${round(e.y)}" rx="${e.rx}" ry="${e.ry}"/><path d="M${round(e.x - e.rx + 2)} ${round(e.y - 1)} Q${round(e.x)} ${round(e.y + 4)} ${round(e.x + e.rx - 2)} ${round(e.y - 1)}" class="character-life-lid-line"/></g>`;
}

export function characterLifeMarkup(values, options = {}) {
  const { angle, drop } = lifeHeadPose(options.expression);
  const lids = lifeEyes(values, options);
  const head = `translate(0 ${drop}) rotate(${round(angle * 180 / Math.PI)} 200 145)`;
  const eyelids = lids.length ? `<g transform="${head}"><g class="character-life-eyelids">${lids.map(lidMarkup).join('')}</g></g>` : '';
  const upperOverlay = (options.outfitLayers?.upper || '') + eyelids;
  const lowerOverlay = options.outfitLayers?.lower;
  // Keep the canvases in HTML. In iOS Safari a canvas composited inside an
  // SVG foreignObject can paint outside the scaled portrait and over the form.
  return `<div class="character-life" aria-hidden="true"><div class="character-life-frame">
    <canvas class="character-life-lower" width="800" height="${(552 - LIFE_WAIST) * 2}"></canvas>
    <div class="character-life-breath" style="transform-origin:50% ${100 * LIFE_WAIST / 552}%">
      <canvas class="character-life-upper" width="800" height="${LIFE_WAIST * 2}"></canvas>
      ${upperOverlay ? `<svg viewBox="0 0 400 552">${upperOverlay}</svg>` : ''}
    </div>
    ${lowerOverlay ? `<svg viewBox="0 0 400 552">${lowerOverlay}</svg>` : ''}
  </div></div>`;
}

export function paintCharacterLife(canvas, options) {
  const character = canvas.parentElement;
  if (!options.living || !CSS.supports('width', '1cqh')) return;
  const upper = character.querySelector('.character-life-upper'), lower = character.querySelector('.character-life-lower');
  if (!upper || !lower) return;
  const split = LIFE_WAIST * 2;
  const topContext = upper.getContext('2d'), bottomContext = lower.getContext('2d');
  topContext.clearRect(0, 0, upper.width, upper.height);
  bottomContext.clearRect(0, 0, lower.width, lower.height);
  topContext.drawImage(canvas, 0, 0, canvas.width, split, 0, 0, upper.width, upper.height);
  bottomContext.drawImage(canvas, 0, split, canvas.width, canvas.height - split, 0, 0, lower.width, lower.height);
  const context = canvas.getContext('2d');
  const { angle, drop } = lifeHeadPose(options.expression);
  lifeEyes(options.values, options).forEach((e, i) => {
    const x = e.x - 200, y = e.y + 10 - 145;
    const px = 200 + x * Math.cos(angle) - y * Math.sin(angle);
    const py = 145 + x * Math.sin(angle) + y * Math.cos(angle) + drop;
    const color = [...context.getImageData(Math.round(px * 2), Math.round(py * 2), 1, 1).data].slice(0, 3);
    character.querySelector(`[data-eye="${i}"]`).style.setProperty('--lid-skin', `rgb(${color.join(' ')})`);
  });
  character.classList.add('life-ready');
}
