import { EXERCISES, PARTS } from './rules.js';

export const EXERCISE_GROUPS = [
  { id: 'body', name: '自重', hint: '腕立て伏せ・スクワット', icon: 'pushup' },
  { id: 'weighted', name: '加重', hint: '自重に重りを足す種目', icon: 'weightPlate' },
  { id: 'free', name: 'フリーウェイト', hint: 'ダンベル・バーベルなど', icon: 'dumbbell' },
  { id: 'machine', name: 'マシン・ケーブル', hint: 'レッグプレス・ラットプル', icon: 'cableMachine' },
];
const groupById = new Map(EXERCISE_GROUPS.map(group => [group.id, group]));
const builtins = new Map(EXERCISES.map(ex => [ex.id, ex]));
const nameKey = name => name.normalize('NFKC').trim().toLowerCase();

export function countStep(unit) {
  return unit === '秒' ? 5 : 1;
}

export function exerciseGroup(ex) {
  if (ex.category) return ex.category;
  if (ex.equipment.includes('自重')) return 'body';
  return ex.equipment.includes('マシン') ? 'machine' : 'free';
}

function customDefinition(row) {
  const group = groupById.get(row.category);
  return { ...row, primary: [row.part], secondary: [], usesWeight: row.category !== 'body',
    equipment: group.name, icon: group.icon, custom: true };
}

export function exercisesFor(state) {
  return state?.customExercises?.length ? [...EXERCISES, ...state.customExercises.map(customDefinition)] : EXERCISES;
}

export function exerciseById(state, id) {
  const builtin = builtins.get(id);
  if (builtin) return builtin;
  const row = state?.customExercises?.find(ex => ex.id === id);
  return row && customDefinition(row);
}

export function validateCustomExercises(rows) {
  if (!Array.isArray(rows) || rows.length > 50000) throw new Error('自作種目の一覧を確認してください。');
  const ids = new Set();
  const names = new Set(EXERCISES.map(ex => nameKey(ex.name)));
  return rows.map(row => {
    if (!row || typeof row.id !== 'string' || !/^custom-[a-z0-9-]{1,80}$/.test(row.id) || ids.has(row.id)) throw new Error('自作種目のIDが不正または重複しています。');
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    if (!name || name.length > 60) throw new Error('種目名は1〜60文字で入力してください。');
    if (names.has(nameKey(name))) throw new Error('同じ名前の種目があります。別の名前を入力してください。');
    if (!groupById.has(row.category) || !PARTS.some(p => p.id === row.part) || !['回', '秒'].includes(row.unit)) throw new Error('種類・部位・単位を選んでください。');
    if (!Number.isInteger(row.count) || row.count < 1 || row.count > 86400 || !Number.isInteger(row.sets) || row.sets < 1 || row.sets > 100) throw new Error('回数・秒数は1〜86400、セット数は1〜100の整数で入力してください。');
    ids.add(row.id); names.add(nameKey(name));
    return { id: row.id, name, category: row.category, part: row.part, unit: row.unit, count: row.count, sets: row.sets };
  });
}
