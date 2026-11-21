import { RULES, PARTS } from './rules.js';
import { SHAPE_ANCHORS, growthStage, levelStartXP, partLevel } from './growth.js';
import { derive, earnedXP, today, shiftDate, uniqueRecords, dayNumber } from './model.js';

// Project a new workout against its own training day and the companion's current levels.
// The level-relative XP carries forward the converted progress of legacy records.
export function workoutGrowth(state, summary, exercise, sets = 1, date = today()) {
  const raw = summary.days[date] || {};
  const meal = date === today() ? summary.mealBonus : uniqueRecords(state.meals).some(row => row.date === date);
  return [...exercise.primary, ...exercise.secondary].map(id => {
    const primary = exercise.primary.includes(id), before = summary.parts[id];
    const base = sets * (primary ? RULES.primaryXP : RULES.secondaryXP);
    const already = raw[id] || 0;
    const gain = Math.round((earnedXP(already + base, meal) - earnedXP(already, meal)) * 1e8) / 1e8;
    const after = partLevel(levelStartXP(before.level) + before.progress + gain);
    return { id, name: PARTS.find(part => part.id === id).name, primary, before, gain, after };
  });
}

// 暦の直近7日で割る。休んだ日を除いて速いペースに見せず、日上限と食事を反映。
export function growthForecast(state, partId, date = today(), summary = derive(state, date)) {
  const part = summary.parts[partId];
  if (!part || summary.paused || state.restDays.includes(date)) return null;
  const nextShape = SHAPE_ANCHORS[growthStage(part.xp) + 1];
  if (!nextShape) return null;
  const mealDates = new Set(uniqueRecords(state.meals).filter(r => r.date <= date).map(r => r.date));
  let recentXP = 0, trainedDays = 0;
  for (let i = 0; i < 7; i++) {
    const day = shiftDate(date, -i);
    const gained = earnedXP(summary.days[day]?.[partId] || 0, mealDates.has(day));
    recentXP += gained;
    if (gained > 0) trainedDays++;
  }
  const pace = recentXP / 7;
  if (!(pace > 0) || !Number.isFinite(pace)) return null;
  const targetXP = RULES.shapeXPAnchors[growthStage(part.xp) + 1];
  const remainingXP = Math.max(0, targetXP - part.xp);
  const days = Math.max(1, Math.ceil(remainingXP / pace));
  const firstDay = Object.keys(summary.days).filter(d => summary.days[d][partId] > 0).sort()[0];
  // 開始直後の1件を7日分の習慣とみなさず、遠い未来を精密な日数で約束しない。
  const reliable = trainedDays >= 3 && dayNumber(date) - dayNumber(firstDay) >= 6;
  return { partId, nextShape, targetXP, remainingXP, recentXP, pace, days, reliable, showDays: reliable && days <= 21 };
}
export function forecastReaction(state, partIds, date = today(), summary = derive(state, date)) {
  const forecast = partIds.map(id => growthForecast(state,id,date,summary)).filter(f => f?.showDays && f.days <= 3).sort((a,b)=>a.days-b.days)[0];
  if (!forecast) return null;
  const name = PARTS.find(p=>p.id===forecast.partId).name;
  return { ...forecast, id: forecast.days === 1 ? 'forecast.almost' : 'forecast.near', line: forecast.days === 1 ? `${name}の見た目、そろそろ変わりそうだ。ここまでの積み重ね、楽しみだな。` : `最近、${name}の輪郭が育ってきたな。もうすぐ変わる気がする。` };
}
