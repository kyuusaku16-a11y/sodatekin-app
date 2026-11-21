import { PARTS } from './rules.js';
import { SHAPE_ANCHORS, shapeFromXP } from './growth.js';
import { buildBodyMesh } from './body-mesh.js';

export { SHAPE_ANCHORS };
export const SHAPE_NAMES = ['はじめ', '少し成長', '成長中', 'たくましく', '最大'];
export const ATLAS_URL = './src/assets/character/growth-atlas-v1.png';
export const MESH_WIDTH = 400, MESH_HEIGHT = 552;
const centers = [154, 430, 704, 977, 1252];
const mix = (a, b, t) => a + (b - a) * t;
export const clampShape = v => Math.max(1, Math.min(999, Number(v) || 1));
export function shapeStage(value) {
  const v = clampShape(value);
  const i = Math.min(3, SHAPE_ANCHORS.findLastIndex(n => v >= n));
  return i + (v - SHAPE_ANCHORS[i]) / (SHAPE_ANCHORS[i + 1] - SHAPE_ANCHORS[i]);
}
export function partShape(part = {}) {
  if (part.shape !== undefined) return clampShape(part.shape);
  return shapeFromXP(part.xp);
}
const sample = (array, stage) => {
  const i = Math.min(3, Math.floor(Math.max(0, stage)));
  return mix(array[i], array[i + 1], Math.min(1, stage - i));
};

// Corresponding anatomical rows in the ten source figures. Widths are in atlas pixels.
// b: torso / outer leg, i: torso center detail / inner leg, a/o: inner / outer arm.
const rows = [
  { y: 0, head: true }, { y: 12, head: true }, { y: 65, head: true },
  { y: 105, head: true }, { y: 132, head: true },
  { y: 145, b:[19,21,23,28,53], a:[21,23,25,30,55], o:[23,25,28,37,64], region:'neck' },
  { y: 155, b:[24,30,35,43,65], a:[25,31,36,44,66], o:[31,40,44,59,95], region:'shoulder' },
  { y: 170, b:[34,41,46,53,76], a:[35,42,47,54,77], o:[51,61,68,80,107], region:'chest' },
  { y: 190, b:[33,39,43,49,74], a:[34,40,44,50,75], o:[53,63,70,83,113], region:'chest' },
  { y: 210, b:[31,35,39,46,65], a:[34,39,42,48,68], o:[57,67,75,89,123], region:'chestEnd' },
  { y: 235, b:[28,32,36,43,60], a:[42,47,50,53,66], o:[64,74,83,95,128], region:'abs' },
  { y: 260, b:[29,33,36,40,47], a:[45,50,54,59,76], o:[72,81,90,104,134], region:'waist' },
  { y: 280, b:[34,38,41,47,56], a:[52,58,64,70,90], o:[72,81,90,102,129], region:'hips' },
  { y: 305, b:[39,43,48,55,69], a:[52,57,63,68,85], o:[76,85,93,106,132], region:'hips' },
  { y: 330, b:[40,46,52,61,78], i:[2,2,1,1,1], a:[52,57,63,68,89], o:[77,85,93,105,130], region:'crotch' },
  { y: 350, b:[40,46,54,62,81], i:[5,6,4,1,1], a:[60,63,70,80,105], o:[80,90,100,110,135], region:'thighs' },
  { y: 375, b:[39,44,48,54,74], i:[10,11,11,9,6], region:'thighs' },
  { y: 395, b:[40,45,50,56,76], i:[12,14,14,15,21], region:'knees' },
  { y: 420, b:[46,52,59,67,87], i:[13,15,15,14,14], region:'calves' },
  { y: 450, b:[44,50,56,63,79], i:[18,20,21,22,26], region:'calves' },
  { y: 485, b:[44,50,55,60,77], i:[22,25,27,30,37], region:'ankles' },
  { y: 510, b:[65,70,75,79,96], i:[18,21,23,26,33], region:'feet' },
  { y: 536, b:[66,71,76,80,97], i:[18,21,23,26,33], region:'feet' },
  { y: 552, b:[66,71,76,80,97], i:[18,21,23,26,33], region:'feet' },
];
function profile(row, stage, back) {
  if (row.head) return [0, 18, 36, 52, 65, 82, 104, 123, 139];
  // Rear silhouettes differ slightly; the source UV and destination share this calibration.
  const rear = back && row.y >= 210 && row.y <= 485 ? 2 : 0;
  const b = sample(row.b, stage) + rear;
  const inside = row.i ? sample(row.i, stage) : b * .48;
  const a = row.a ? sample(row.a, stage) + rear : b + 14;
  const o = row.o ? sample(row.o, stage) + rear : b + 35;
  return [0, inside, b, (b + a) / 2, a, (a + o) / 2, o, o + 4, 139];
}
function influence(row, s, back) {
  const torso = back ? s.back : s.chest;
  const middle = back ? s.back : s.abs;
  const legs = (s.thighs + s.calves) / 2;
  switch (row.region) {
    case 'neck': return [torso * .3 + s.shoulders * .7, s.shoulders];
    case 'shoulder': return [torso * .7 + s.shoulders * .3, s.shoulders];
    case 'chest': return [torso, s.shoulders];
    case 'chestEnd': return [torso, s.shoulders * .3 + s.arms * .7];
    case 'abs': return [middle * .8 + torso * .2, s.arms];
    case 'waist': return [middle, s.arms];
    case 'hips': return [s.glutes, s.arms];
    case 'crotch': return [s.glutes * .4 + s.thighs * .6, s.arms];
    case 'thighs': return [s.thighs, s.arms];
    case 'knees': return [s.thighs * .35 + s.calves * .65, s.arms];
    case 'calves': return [s.calves, s.arms];
    case 'ankles': case 'feet': return [legs, legs];
    default: return [Object.values(s).reduce((a, b) => a + b, 0) / 8, 0];
  }
}

// Each vertex carries all five registered UVs. Adjacent parts share vertices: no
// independent cutout seams. Texture weights and silhouette coordinates interpolate.
export function buildCharacterMesh(values, { back = false, active = [], smooth = false, bodyType = 'classic', expression = 'normal' } = {}) {
  if (['slim','natural','round'].includes(bodyType)) {
    const mesh = buildBodyMesh(values,{bodyType,back,active,smooth},shapeStage);
    return { ...mesh, vertices: poseVertices(mesh.vertices, expression) };
  }
  const s = Object.fromEntries(PARTS.map(p => [p.id, shapeStage(values[p.id])]));
  const poseStage = Math.max(back ? s.back : s.chest, s.shoulders, s.arms * .65, s.glutes * .7);
  let vertices = [];
  for (const row of rows) {
    const [bodyStage, armStage] = influence(row, s, back);
    const body = profile(row, bodyStage, back), arm = profile(row, armStage, back);
    const target = [...body];
    if (!row.head && row.y <= 350) {
      // The whole arm follows a consistent pose. Its thickness still comes from
      // shoulders/arms, so a large chest does not create a kink at the elbow.
      const pose = profile(row, poseStage, back);
      const support = row.region === 'neck' ? .15 : row.region === 'shoulder' ? .6 : row.y === 170 ? .55 : row.y === 190 ? .35 : row.y === 210 ? .1 : 0;
      target[2] = mix(body[2], Math.max(body[2], pose[2]), support);
      target[1] = body[1] * target[2] / body[2];
      const halfWidth = (arm[6] - arm[4]) / 2;
      const center = Math.max(pose[5], target[2] + halfWidth + 1);
      target[4] = center - halfWidth; target[5] = center;
      target[6] = center + halfWidth; target[7] = target[6] + 4;
      target[3] = (target[2] + target[4]) / 2;
    }
    target[8] = 190;
    for (let col = -8; col <= 8; col++) {
      const j = Math.abs(col), sign = Math.sign(col);
      const stage = row.head ? bodyStage : j <= 2 ? bodyStage : armStage;
      const uv = [];
      for (let k = 0; k < 5; k++) {
        uv.push((centers[k] + sign * profile(row, k, back)[j]) / 1402, (row.y + (back ? 560 : 0)) / 1122);
      }
      const region = row.head ? null : j >= 4 && row.y <= 350 ? (row.y < 200 ? 'shoulders' : 'arms') : row.region === 'chest' || row.region === 'chestEnd' ? (back ? 'back' : 'chest') : row.region === 'hips' || row.region === 'crotch' ? 'glutes' : row.region;
      // The empty armpit/hand gap must stay empty when posing stretches its UVs.
      // Without this anatomical mask, an outline pixel can become a dark streak.
      const gap = j === 3 && row.y >= 210 && row.y <= 350 ? 0 : 1;
      vertices.push([200 + sign * target[j], row.y, ...uv, Math.max(0, Math.min(4, stage)), active.includes(region) ? 1 : 0, gap]);
    }
  }
  if (smooth) {
    const dense = [];
    for (let y = 0; y < rows.length - 1; y++) for (let step = 0; step < 4; step++) {
      const t = step / 4, curve = t * t * (3 - 2 * t);
      for (let x = 0; x < 17; x++) {
        const a = vertices[y * 17 + x], b = vertices[(y + 1) * 17 + x];
        // Shared convex interpolation keeps rows ordered, preventing folds.
        dense.push(a.map((v, i) => mix(v, b[i], i === 1 || i >= 3 && i <= 11 && i % 2 ? t : curve)));
      }
    }
    dense.push(...vertices.slice(-17)); vertices = dense;
  }
  vertices = poseVertices(vertices, expression);
  const triangles = [];
  for (let y = 0; y < vertices.length / 17 - 1; y++) for (let x = 0; x < 16; x++) {
    const a = y * 17 + x, b = a + 1, c = a + 17, d = c + 1;
    triangles.push(a, b, c, b, d, c);
  }
  return { vertices, triangles };
}

// Both meshes use the same 17-column anatomy and portrait coordinates.
// Reactions move the existing portrait, never its growth values or texture.
// Apply after subdivision so the head and shoulders join smoothly.
function poseVertices(vertices, expression) {
  if (expression === 'cheer') return vertices.map((vertex, index) => {
    const column = Math.abs(index % 17 - 8);
    // Keep head/torso/legs and their geometry intact. The SVG arm layer replaces
    // only the dangling arms; no elbow fold is introduced into this shared mesh.
    return column >= 3 && vertex[1] >= 145 && vertex[1] <= 375 ? [...vertex.slice(0, 14), 0] : vertex;
  });
  if (expression !== 'proud' && expression !== 'rest') return vertices;
  return vertices.map((vertex, index) => {
    const [x, y] = vertex;
    if (y >= 375 || expression === 'rest' && y >= 235) return vertex;
    const column = Math.abs(index % 17 - 8);
    const headBlend = Math.max(0, Math.min(1, (235 - y) / 103));
    const head = headBlend * headBlend * (3 - 2 * headBlend);
    const angle = (expression === 'proud' ? -.055 : .055) * head;
    const headDrop = (expression === 'proud' ? -3 : 7) * head;
    const neckX = x - 200, neckY = y - 145;
    let posedX = 200 + neckX * Math.cos(angle) - neckY * Math.sin(angle);
    const posedY = 145 + neckX * Math.sin(angle) + neckY * Math.cos(angle) + headDrop;
    // Open below the elbows, where all body types have a clear arm/torso gap.
    // Inner/outer arm columns move together, preserving each arm's width.
    const arm = column <= 2 || column === 8 ? 0 : column === 3 ? .5 : 1;
    const spread = y <= 260 ? 0 : y <= 340 ? (y - 260) / 80 : (375 - y) / 35;
    const spreadEase = spread * spread * (3 - 2 * spread) * arm;
    posedX += Math.sign(x - 200) * (expression === 'proud' ? 16 : 0) * spreadEase;
    return [posedX, posedY, ...vertex.slice(2)];
  });
}

// Sample the shared 17-column portrait grid for clothing and body-part overlays.
export function portraitCoordinates(values, { bodyType, back = false, expression = 'normal' }) {
  const options = { bodyType, back, smooth: true };
  const lerp = (a, b, t) => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });
  const neutral = buildCharacterMesh(values, options).vertices;
  const posed = expression === 'proud' || expression === 'rest' ? buildCharacterMesh(values, { ...options, expression }).vertices : neutral;
  return (y, side = 0, distance = 2, pad = 0) => {
    let row = 0;
    while (row + 17 < neutral.length && neutral[row + 17][1] < y) row += 17;
    const column = 8 + side * distance;
    const low = Math.floor(column), high = Math.ceil(column), across = column - low;
    const next = Math.min(row + 17, neutral.length - 17);
    const t = Math.max(0, Math.min(1, (y - neutral[row][1]) / (neutral[next][1] - neutral[row][1] || 1)));
    const pointAt = start => lerp({ x: posed[start + low][0], y: posed[start + low][1] }, { x: posed[start + high][0], y: posed[start + high][1] }, across);
    const result = lerp(pointAt(row), pointAt(next), t);
    return { x: result.x + side * pad, y: result.y };
  };
}
