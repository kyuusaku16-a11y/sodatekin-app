import { exercisesFor } from './exercise-catalog.js';

export const BOOKMARK_DAYS = 3;

// Each row is an actual day/exercise total produced by workoutDaysByExercise.
export function notebookPages(exerciseDays, state) {
  const byExercise = new Map();
  for (const day of exerciseDays) {
    if (!byExercise.has(day.exerciseId)) byExercise.set(day.exerciseId, []);
    byExercise.get(day.exerciseId).push(day);
  }
  const pages = [];
  for (const exercise of exercisesFor(state)) {
    const days = byExercise.get(exercise.id);
    if (!days) continue;
    days.sort((a, b) => a.date.localeCompare(b.date));
    pages.push({ exercise, first: days[0], bookmark: days[BOOKMARK_DAYS - 1], latest: days.at(-1), days: days.length });
  }
  return pages.sort((a, b) => a.first.date.localeCompare(b.first.date));
}
