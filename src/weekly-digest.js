import { exerciseById } from './exercise-catalog.js';
import { derive, isPaused, shiftDate, today as currentDate, uniqueRecords, validDate } from './model.js';
import { PARTS } from './rules.js';

const rounded = value => Math.round(value * 1e8) / 1e8;

/**
 * A calendar-week reflection, rebuilt from the current records without saving a snapshot.
 * `today` is a Japan calendar date (the application's today() supplies that default).
 * Only this week and last week are exposed; even a current-week future record is excluded.
 */
export function weeklyDigest(state, { weekOffset = 0, today = currentDate() } = {}) {
  if (!validDate(today)) throw new RangeError('振り返りの日付が正しくありません。');
  if (weekOffset !== 0 && weekOffset !== -1) throw new RangeError('今週か先週を選んでください。');
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const start = shiftDate(today, -((weekday + 6) % 7) + weekOffset * 7);
  const end = shiftDate(start, 6);
  const through = end < today ? end : today;
  const beforeDate = shiftDate(start, -1);
  const before = derive(state, beforeDate);
  const after = derive(state, through);
  const inWeek = record => record.date >= start && record.date <= through;
  // Deduplicate before selecting a week: an edited record may have moved across its boundary.
  const workouts = uniqueRecords(state.workouts).filter(record => inWeek(record) && exerciseById(state, record.exerciseId));
  const meals = uniqueRecords(state.meals).filter(inWeek);
  const mealDates = new Set(meals.map(record => record.date));
  const restDates = new Set(state.restDays);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(start, index);
    const future = date > today;
    const records = workouts.filter(record => record.date === date);
    return {
      date, future,
      trained: records.length > 0,
      sets: records.reduce((sum, record) => sum + record.sets, 0),
      meal: mealDates.has(date),
      rest: !future && (restDates.has(date) || isPaused(state, date)),
    };
  });
  const parts = PARTS.map(part => ({
    ...part,
    xp: rounded(after.parts[part.id].xp - before.parts[part.id].xp),
    beforeLevel: before.parts[part.id].level,
    afterLevel: after.parts[part.id].level,
    levelGain: after.parts[part.id].level - before.parts[part.id].level,
  }));
  const workoutDays = days.filter(day => day.trained).length;
  const restDays = days.filter(day => day.rest).length;
  const hasEvidence = workouts.length > 0 || meals.length > 0 || restDays > 0;
  return {
    weekOffset, start, end, through, beforeDate,
    isCurrent: weekOffset === 0,
    partial: through < end,
    before, after, days, parts,
    grownParts: parts.filter(part => part.xp > 0),
    earnedXP: rounded(after.totalXP - before.totalXP),
    workoutDays,
    sets: workouts.reduce((sum, record) => sum + record.sets, 0),
    mealDays: mealDates.size,
    mealBonusDays: days.filter(day => day.trained && day.meal).length,
    restDays,
    restAndWorkoutDays: days.filter(day => day.rest && day.trained).length,
    hasEvidence,
    // Keep a first-run home quiet; returning users can still reflect on a week without records.
    canReflect: hasEvidence || before.workoutDays > 0,
  };
}
