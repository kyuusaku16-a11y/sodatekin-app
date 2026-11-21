import { today, uniqueRecords } from './model.js';

// 同じ日に分けて保存したセットも、同種目の一日の実施量としてまとめる。
export function workoutDaysByExercise(state, date = today()) {
  const records = uniqueRecords(state.workouts).filter(r => r.date <= date).sort((a, b) => a.date.localeCompare(b.date) || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
  const days = new Map();
  for (const r of records) {
    const key = `${r.date}:${r.exerciseId}`;
    const day = days.get(key) || { date: r.date, exerciseId: r.exerciseId, sets: 0, volume: 0, weight: null };
    day.sets += r.sets;
    day.volume += r.count * r.sets;
    if (r.weight !== null) day.weight = Math.max(day.weight ?? 0, r.weight);
    day.lastId = r.id;
    day.lastCreatedAt = r.createdAt;
    days.set(key, day);
  }
  return [...days.values()];
}
// 前日までの最高値と比べ、印はその日の最後の記録1件に付ける。
export function personalBests(state, date = today()) {
  const maxima = new Map(), results = Object.create(null);
  for (const r of workoutDaysByExercise(state, date)) {
    const prior = maxima.get(r.exerciseId), volume = r.volume;
    const weightBest = r.weight !== null && prior?.weight !== null && prior?.weight !== undefined && r.weight > prior.weight;
    const volumeBest = !!prior && volume > prior.volume;
    if (weightBest || volumeBest) results[r.lastId] = { weight: weightBest, volume: volumeBest, weightValue: r.weight, volumeValue: volume, previousWeight: prior.weight, previousVolume: prior.volume };
    maxima.set(r.exerciseId, { weight: r.weight === null ? prior?.weight ?? null : Math.max(prior?.weight ?? 0, r.weight), volume: Math.max(prior?.volume ?? 0, volume) });
  }
  return results;
}
export function personalBestLabel(best, unit = '回') {
  if (!best) return '';
  return `自己ベスト · ${[best.weight ? `最大${best.weightValue.toLocaleString('ja-JP')}kg` : '', best.volume ? `1日合計${best.volumeValue.toLocaleString('ja-JP')}${unit}` : ''].filter(Boolean).join('・')}`;
}
