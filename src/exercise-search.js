import { workoutDaysByExercise } from './personal-bests.js';
import { EXERCISE_GROUPS, exerciseGroup, exercisesFor } from './exercise-catalog.js';
import { EXERCISES, PARTS } from './rules.js';

const partReadings = {
  chest: 'むね', back: 'せなか', shoulders: 'かた', arms: 'うで',
  abs: 'おなか 腹筋 ふっきん', glutes: 'おしり', thighs: 'ふともも 脚 足 あし', calves: '脚 足 あし',
};

function searchable(text) {
  return text.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

const partTerms = new Map(PARTS.map(part => [part.id, `${part.name} ${partReadings[part.id] || ''}`]));
function indexEntry(exercise) {
  const parts = [...exercise.primary, ...exercise.secondary];
  const terms = [exercise.name, exercise.custom ? '' : exercise.id.replaceAll('-', ' '), exercise.aliases, exercise.equipment, EXERCISE_GROUPS.find(group => group.id === exerciseGroup(exercise)).name, ...parts.map(id => partTerms.get(id))];
  return { exercise, parts, text: searchable(terms.join(' ')) };
}
const builtins = EXERCISES.map(indexEntry);

export function findExercises(query, part = '', state) {
  const index = state?.customExercises?.length ? [...builtins, ...exercisesFor(state).filter(ex => ex.custom).map(indexEntry)] : builtins;
  const words = searchable(query).trim().split(/\s+/);
  return index.filter(entry => (!part || entry.parts.includes(part)) && words.every(word => entry.text.includes(word)))
    .map(entry => entry.exercise);
}

export function recentExerciseDays(state, date) {
  return workoutDaysByExercise(state, date).sort((a, b) =>
    b.date.localeCompare(a.date) || Date.parse(b.lastCreatedAt) - Date.parse(a.lastCreatedAt) || b.lastId.localeCompare(a.lastId));
}

export function recentExerciseIds(state, limit = 5) {
  const ids = new Set(recentExerciseDays(state).map(day => day.exerciseId));
  return [...ids].slice(0, Math.max(0, limit));
}
