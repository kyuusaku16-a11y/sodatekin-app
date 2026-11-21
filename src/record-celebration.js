import { PARTS } from './rules.js';
import { derive, today, validDate } from './model.js';
import { addedRecords } from './comparison.js';

const rounded = value => Math.round(value * 1e8) / 1e8;
const mealFields = ['id', 'foodId', 'name', 'amount', 'portions', 'kcal', 'protein', 'fat', 'carbs', 'date', 'createdAt'];

function sameMeals(before, after) {
  if (before === after) return true;
  if (before.length !== after.length) return false;
  const records = new Map(after.map(record => [record.id, record]));
  return records.size === after.length && before.every(record => {
    const other = records.get(record.id);
    return other && mealFields.every(field => other[field] === record[field]);
  });
}

function sameLegacy(before, after) {
  if (before == null || after == null) return before == null && after == null;
  return ['workoutIds', 'mealIds'].every(key => {
    const ids = new Set(after[key]);
    return before[key].length === after[key].length && before[key].every(id => ids.has(id));
  });
}

/**
 * A single successful, newly added workout event. The caller starts it once,
 * after persistence succeeds; this pure function does not keep a played-ID log.
 * Optional summaries must be derive(previous/date) and derive(next/date).
 * `parts.from/to` are part levels; `shapeChanges.from/to` are zero-based stages.
 */
export function recordCelebration(previous, next, event, date = today(), { beforeSummary, afterSummary } = {}) {
  if (event?.kind !== 'workout' || !validDate(date)) return null;
  const records = addedRecords(previous, next, event);
  if (!records || records[0].date !== date) return null;
  // Do not attribute a simultaneous food edit or compatibility migration to
  // this workout. Settings/collection changes do not affect earned growth.
  if (previous.rulesVersion !== next.rulesVersion || !sameMeals(previous.meals, next.meals) || !sameLegacy(previous.legacyLevelRecords, next.legacyLevelRecords)) return null;

  const before = beforeSummary ?? derive(previous, date);
  const after = afterSummary ?? derive(next, date);
  const parts = PARTS.map(({ id }) => ({
    id,
    xp: rounded(after.parts[id].xp - before.parts[id].xp),
    from: before.parts[id].level,
    to: after.parts[id].level,
  })).filter(part => part.xp > 0);
  if (!parts.length) return null;

  const shapeChanges = parts.filter(({ id }) => after.parts[id].stage > before.parts[id].stage).map(({ id }) => ({ id, from: before.parts[id].stage, to: after.parts[id].stage }));
  const kind = shapeChanges.length ? 'shape' : parts.some(part => part.to > part.from) || after.level > before.level ? 'level' : 'workout';
  return { kind, parts, totalXP: rounded(parts.reduce((sum, part) => sum + part.xp, 0)), duration: 800, shapeChanges };
}
