import { continuedDates } from './diet-summary.js';
import { exerciseById } from './exercise-catalog.js';
import { PARTS, RULES } from './rules.js';
import { derive, earnedXP, today, shiftDate, uniqueRecords, isPaused, legacyLevelState } from './model.js';
import { growthStage, partLevel } from './growth.js';

export const DAY_MILESTONES = [3, 7, 14, 30, 50, 100, 250, 365, 500, 1000];
const rounded = n => Math.round(n * 1e8) / 1e8;

// Derived from the current ledger, never stored separately. One memory per day
// keeps the first record, body changes and day milestones from flooding the UI.
export function journeyOf(state, date = today(), summary = derive(state, date)) {
  const dates = continuedDates(state, date);
  const mealDates = new Set(uniqueRecords(state.meals).filter(r => r.date <= date).map(r => r.date));
  const xp = Object.fromEntries(PARTS.map(p => [p.id, 0]));
  const oldState = legacyLevelState(state), oldDays = oldState ? derive(oldState, date).days : {};
  const oldMeals = new Set(oldState?.meals.map(r => r.date) || []);
  const oldXP = Object.fromEntries(PARTS.map(p => [p.id, 0]));
  const stages = Object.fromEntries(PARTS.map(p => [p.id, 0]));
  const memories = [];
  dates.forEach((day, index) => {
    const changes = [];
    const workout = summary.days[day];
    if (workout) {
      for (const part of PARTS) {
        xp[part.id] = rounded(xp[part.id] + earnedXP(workout[part.id], mealDates.has(day)));
        oldXP[part.id] = rounded(oldXP[part.id] + earnedXP(oldDays[day]?.[part.id] || 0, oldMeals.has(day)));
        const { level } = partLevel(xp[part.id], oldXP[part.id]);
        const stage = growthStage(xp[part.id]);
        if (stage > stages[part.id]) changes.push({ ...part, level, fromStage: stages[part.id], stage });
        stages[part.id] = stage;
      }
    }
    const days = index + 1, milestone = DAY_MILESTONES.includes(days);
    if (index === 0 || milestone || changes.length) memories.push({
      id: `memory:${day}`, date: day, first: index === 0, milestone, days, changes,
      title: index === 0 ? 'はじめての、一歩。' : milestone ? `一緒に続けて、${days}日。` : 'からだに、新しい変化。',
      detail: index === 0 ? 'ここから、ふたりの積み重ねが始まった。' : milestone ? '間が空いても、一日ずつ重ねた証。' : '記録を重ねて、相棒の輪郭が育った。',
    });
  });
  return {
    memories: memories.reverse(), days: dates.length,
    firstDate: dates[0] || null, lastDate: dates.at(-1) || null,
    nextMilestone: DAY_MILESTONES.find(n => n > dates.length) || null,
    grownParts: PARTS.filter(p => summary.parts[p.id].xp > 0),
    xp,
  };
}

export function weekOf(state, date = today()) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const start = shiftDate(date, -((weekday + 6) % 7)), end = shiftDate(start, 6);
  const workouts = uniqueRecords(state.workouts).filter(r => r.date >= start && r.date <= date);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = shiftDate(start, i), records = workouts.filter(r => r.date === day);
    return { date: day, trained: records.length > 0, sets: records.reduce((n, r) => n + r.sets, 0), rest: day <= date && (state.restDays.includes(day) || isPaused(state, day)), future: day > date, today: day === date };
  });
  const parts = PARTS.map(p => ({ ...p, sets: workouts.reduce((n, r) => {
    const exercise = exerciseById(state, r.exerciseId);
    return n + (exercise && [...exercise.primary, ...exercise.secondary].includes(p.id) ? r.sets : 0);
  }, 0) }));
  return { start, end, days, parts, trainedDays: days.filter(d => d.trained).length, restDays: days.filter(d => d.rest).length, sets: workouts.reduce((n, r) => n + r.sets, 0), goal: state.settings.weeklyGoal ?? null };
}
