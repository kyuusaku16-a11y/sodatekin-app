import { continuedDates } from './diet-summary.js';
import { today } from './model.js';
import { PARTS } from './rules.js';
import { partShape, shapeStage } from './character-mesh.js';

const accessories = Object.freeze(['towel', 'wristbands']);
const emptyWardrobe = () => ({ wear: 'growth', color: 'sand', accessories: [] });

/** Save only selections. Eligibility always comes from current records. */
export function validateWardrobe(input) {
  if (input === undefined) return emptyWardrobe();
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || !['growth', 'none'].includes(input.wear)
    || !['sand', 'navy'].includes(input.color)
    || !Array.isArray(input.accessories) || input.accessories.length > 50000
    || !input.accessories.every(id => accessories.includes(id))) {
    throw new Error('相棒のウェア・小物の設定が正しくありません。');
  }
  return { wear: input.wear, color: input.color, accessories: accessories.filter(id => input.accessories.includes(id)) };
}

export const wardrobeOf = (settings = {}) => validateWardrobe(settings.wardrobe);

export function wardrobeProgress(state, date = today()) {
  const days = continuedDates(state, date).length;
  return { days, unlocked: { towel: days >= 7, wristbands: days >= 30, navy: days >= 100 } };
}

/** Rendered clothes follow the same eight continuous stages as the body. */
export function outfitFor(state, parts, { date = today() } = {}) {
  const selected = wardrobeOf(state.settings), { unlocked } = wardrobeProgress(state, date);
  const stage = Math.floor(PARTS.reduce((sum, part) => sum + shapeStage(partShape(parts?.[part.id] || {})), 0) / PARTS.length);
  return {
    garment: selected.wear === 'none' ? 'none' : stage === 0 ? 'relaxed-tee' : stage === 1 ? 'tee' : 'tank',
    color: selected.color === 'navy' && unlocked.navy ? 'navy' : 'sand',
    accessories: selected.accessories.filter(id => unlocked[id]),
  };
}
