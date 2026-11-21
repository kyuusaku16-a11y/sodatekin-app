import { exerciseById } from './exercise-catalog.js';
import { PARTS } from './rules.js';
import { today, uniqueRecords, dayNumber, shiftDate } from './model.js';

export const INSIGHT_FAMILIES = ['return', 'total', 'weekday', 'trend'];
const involved = (state, record) => { const ex = exerciseById(state, record.exerciseId); return ex ? [...ex.primary, ...ex.secondary] : []; };
const countDates = records => new Set(records.map(r => r.date)).size;

// 実施済みの記録だけを集計。同じ日の複数セットを「日数」にしない。
export function patternInsight(beforeState, afterState, record, date = today()) {
  if (!record || record.date !== date) return null;
  const ex = exerciseById(afterState, record.exerciseId);
  if (!ex) return null;
  const before = uniqueRecords(beforeState.workouts).filter(r => r.date <= date);
  const records = uniqueRecords(afterState.workouts).filter(r => r.date <= date);
  const allowed = family => { const last = afterState.settings.insightHistory?.[family]; return !last || dayNumber(date) - dayNumber(last) > 1; };
  const part = id => PARTS.find(p => p.id === id).name;
  if (allowed('return')) {
    for (const id of ex.primary) {
      const previous = before.filter(r => involved(beforeState, r).includes(id)).map(r => r.date).sort().at(-1);
      if (previous && dayNumber(date) - dayNumber(previous) >= 14) return { family: 'return', id: 'insight.return', date, line: `${part(id)}は久しぶりだな。また一緒に鍛えられて、うれしいぞ。` };
    }
  }
  if (allowed('total') && ex.unit === '回') {
    const reps = list => list.filter(r => r.exerciseId === ex.id).reduce((n, r) => n + r.count * r.sets, 0);
    const from = reps(before), total = reps(records);
    const milestones = [50, 100, 300, 500, 1000, 3000, 5000, 10000, Math.floor(total / 10000) * 10000];
    if (milestones.some(n => n > from && n <= total)) return { family: 'total', id: 'insight.total', date, line: `${ex.name}、これで通算${total.toLocaleString('ja-JP')}回だ。ひとつずつ、積み重なったな。` };
  }
  if (allowed('weekday')) {
    const dates = new Set(records.map(r => r.date));
    let weeks = 0;
    while (dates.has(shiftDate(date, -7 * weeks))) weeks++;
    if (weeks >= 3) {
      const weekday = ['日', '月', '火', '水', '木', '金', '土'][new Date(`${date}T00:00:00Z`).getUTCDay()];
      return { family: 'weekday', id: 'insight.weekday', date, line: `${weekday}曜に鍛えた記録が、${weeks}週分になったな。よく覚えてるぞ。` };
    }
  }
  if (allowed('trend')) {
    const candidates = ex.primary.map(id => {
      const relevant = records.filter(r => involved(afterState, r).includes(id));
      const recent = countDates(relevant.filter(r => r.date >= shiftDate(date, -13)));
      const previous = countDates(relevant.filter(r => r.date >= shiftDate(date, -27) && r.date < shiftDate(date, -13)));
      return { id, recent, previous };
    }).filter(p => p.recent >= 3 && p.recent > p.previous).sort((a, b) => (b.recent - b.previous) - (a.recent - a.previous));
    if (candidates.length) return { family: 'trend', id: 'insight.trend', date, line: `最近、${part(candidates[0].id)}を鍛えた日が増えたな。記録にも、ちゃんと残ってるぞ。` };
  }
  return null;
}
