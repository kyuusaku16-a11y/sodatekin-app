import { id as createId, validateWeightKg } from './model.js';

export function parseWeightText(text) {
  const normalized = typeof text === 'string' ? text.normalize('NFKC').trim() : '';
  if (!/^\d+(?:\.\d)?$/.test(normalized)) {
    throw new Error('体重は小数第1位までの数字で入力してください。');
  }
  return validateWeightKg(Number(normalized));
}

export function upsertWeight(state, { date, kg, createdAt, id }) {
  validateWeightKg(kg);
  const existing = state.weights.find(record => record.date === date);
  const record = { id: existing?.id ?? id ?? createId(), date, kg, createdAt };
  const weights = existing
    ? state.weights.map(row => row === existing ? record : row)
    : [...state.weights, record];
  return { ...state, weights };
}

export function removeWeight(state, id) {
  return { ...state, weights: state.weights.filter(record => record.id !== id) };
}

export function latestWeight(state, date) {
  let latest = null;
  for (const record of state.weights) {
    if (record.date <= date && (!latest || latest.date < record.date)) latest = record;
  }
  return latest && { date: latest.date, kg: latest.kg };
}
