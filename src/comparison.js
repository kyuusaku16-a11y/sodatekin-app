import { exerciseById } from './exercise-catalog.js';
import { PARTS } from './rules.js';

export const initialParts = () => Object.fromEntries(PARTS.map(p => [p.id, { level: 1, progress: 0, xp: 0 }]));

const recordFields = {
  weights: ['id', 'date', 'kg', 'createdAt'],
  workouts: ['id', 'exerciseId', 'date', 'count', 'sets', 'weight', 'memo', 'createdAt'],
  meals: ['id', 'foodId', 'name', 'amount', 'portions', 'kcal', 'protein', 'fat', 'carbs', 'date', 'createdAt'],
};

// 1回の保存に含まれる新規記録を、イベントの順で返す。保存形式にbatch IDは足さない。
// 一部だけのID、重複、既存記録の編集/削除を含む操作は「新規保存」と取り違えない。
export function addedRecords(beforeState, afterState, event) {
  const key = event?.kind === 'workout' ? 'workouts' : event?.kind === 'meal' ? 'meals' : event?.kind === 'weight' ? 'weights' : null;
  if (!key) return null;
  const ids = event.kind !== 'meal' && event.ids === undefined ? [event.id] : event.ids;
  if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) return null;
  if (event.kind !== 'meal' && !ids.includes(event.id)) return null;
  const before = new Map(beforeState[key].map(record => [record.id, record]));
  const after = new Map(afterState[key].map(record => [record.id, record]));
  if (before.size !== beforeState[key].length || after.size !== afterState[key].length || after.size !== before.size + ids.length) return null;
  const records = ids.map(id => after.get(id));
  if (records.some((record, index) => !record || before.has(ids[index]))) return null;
  if ([...before].some(([id, record]) => !after.has(id) || recordFields[key].some(field => after.get(id)[field] !== record[field]))) return null;
  if (records.some(record => record.date !== records[0].date)) return null;
  if (event.kind === 'workout' && (!exerciseById(afterState, records[0].exerciseId) || records.some(record => record.exerciseId !== records[0].exerciseId))) return null;
  return records;
}

// 成功した新規記録の直前だけを一時保持する。履歴の逆算は「当時の姿」としない。
export function captureComparison(beforeState, afterState, event, beforeSummary, afterSummary) {
  if (!addedRecords(beforeState, afterState, event)) return null;
  if (beforeSummary.totalXP === afterSummary.totalXP) return null;
  return { level: beforeSummary.level, progress: beforeSummary.progress, totalXP: beforeSummary.totalXP, parts: Object.fromEntries(PARTS.map(p => [p.id, { ...beforeSummary.parts[p.id] }])) };
}

// 絵・レベル・進捗を同じ時点から取る。現在の情報を過去の絵に混ぜない。
export function comparisonAt(mode, current, before = null) {
  if (mode === 'initial') return { mode, label: 'はじめ', level: 1, progress: 0, totalXP: 0, parts: initialParts() };
  if (mode === 'before' && before) return { ...before, mode, label: 'この記録の前' };
  return { ...current, mode: 'current', label: 'いま' };
}
