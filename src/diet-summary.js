import { exerciseById } from './exercise-catalog.js';
import { shiftDate, validDate } from './model.js';
import { latestWeight } from './weights.js';

export function weightTrend(weights, date) {
  const weekStart = shiftDate(date, -6);
  const previousStart = shiftDate(date, -13);
  const last = latestWeight({ weights }, date);
  let count = 0, previousCount = 0;
  let total = 0, previousTotal = 0;
  // 0.1kg単位の整数で合計し、平均と平均との差は最後に丸める。
  for (const record of weights) {
    if (record.date > date || record.date < previousStart) continue;
    if (record.date >= weekStart) {
      total += Math.round(record.kg * 10);
      count++;
    } else {
      previousTotal += Math.round(record.kg * 10);
      previousCount++;
    }
  }
  if (!count) return { mode: last ? 'last' : 'none', average: null, count, diff: null, last };
  const average = Math.round(total / count) / 10;
  const diff = previousCount
    ? (Math.round((total * previousCount - previousTotal * count) / (count * previousCount)) || 0) / 10
    : null;
  return { mode: 'average', average, count, diff, last };
}

// 同じIDは既存集計と同様に最後の行を採用する。同日の振り返りは筋トレ→食事→体重。
function* continuedRecords(state, from, to) {
  const seen = new Set();
  for (const [kind, rows] of [['workout', state.workouts], ['meal', state.meals], ['weight', state.weights]]) {
    const records = rows ?? [];
    for (let i = records.length - 1; i >= 0; i--) {
      const record = records[i];
      if (!record?.id || seen.has(record.id)) continue;
      seen.add(record.id);
      if (record.date < from || record.date > to || !validDate(record.date)) continue;
      if (kind === 'workout' && !exerciseById(state, record.exerciseId)) continue;
      yield { kind, record };
    }
  }
}

export function recordKindsByDate(state, from, to) {
  const days = new Map();
  for (const { kind, record } of continuedRecords(state, from, to)) {
    if (!days.has(record.date)) days.set(record.date, new Set());
    days.get(record.date).add(kind);
  }
  return days;
}

export function continuedDates(state, date, from = '') {
  return [...recordKindsByDate(state, from, date).keys()].sort();
}

function compareEntryTime(a, b) {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id);
}

export function firstRecordOn(state, date) {
  let first = null;
  for (const entry of continuedRecords(state, date, date)) {
    if (first && entry.kind !== first.kind) break;
    if (!first || compareEntryTime(entry.record, first.record) < 0) first = entry;
  }
  if (!first) return null;
  const { kind, record } = first;
  const exercise = kind === 'workout' ? exerciseById(state, record.exerciseId).name : null;
  return { date, exercise, label: exercise ?? (kind === 'meal' ? `食事の記録（${record.name}）` : '体重の記録') };
}

export function continuedDays(state, date) {
  const start = date.slice(0, 7) + '-01';
  const previousEnd = shiftDate(start, -1);
  const dates = continuedDates(state, date, previousEnd.slice(0, 7) + '-01');
  const thisMonth = dates.filter(day => day >= start).length;
  return { thisMonth, lastMonth: dates.length - thisMonth };
}

export function todayChecks(state, date) {
  return {
    weightKg: state.weights.find(record => record.date === date)?.kg ?? null,
    mealCount: state.meals.filter(record => record.date === date).length,
    workoutCount: state.workouts.filter(record => record.date === date).length,
  };
}
