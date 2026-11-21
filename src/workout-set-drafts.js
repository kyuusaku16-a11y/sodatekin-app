import { exerciseById } from './exercise-catalog.js';
import { MAX_WORKOUT_SET_ROWS, WorkoutSetDraftError } from './workout-sets.js';

const copy = draft => ({
  exerciseId: draft.exerciseId,
  date: draft.date,
  memo: draft.memo,
  rows: draft.rows.map(row => ({ count: row.count, weight: row.weight })),
  ...(draft.source ? { source: { ...draft.source } } : {}),
});

/** Page-lifetime only. No browser storage or application records are read or written. */
export function createWorkoutSetDraftStore() {
  const drafts = new Map();
  return {
    put(draft, state) {
      if (!exerciseById(state, draft?.exerciseId)) throw new WorkoutSetDraftError('筋トレの種目を選び直してください。', 'exerciseId');
      if (!Array.isArray(draft.rows) || draft.rows.length < 1 || draft.rows.length > MAX_WORKOUT_SET_ROWS) throw new WorkoutSetDraftError(`下書きは1〜${MAX_WORKOUT_SET_ROWS}セットで保持してください。`, 'rows');
      // Invalid or unfinished values are deliberately retained; only the save path validates them.
      const saved = copy(draft);
      drafts.delete(draft.exerciseId);
      drafts.set(draft.exerciseId, saved);
      return copy(saved);
    },
    get(exerciseId) { const draft = drafts.get(exerciseId); return draft ? copy(draft) : null; },
    has(exerciseId) { return drafts.has(exerciseId); },
    list() { return [...drafts.values()].reverse().map(copy); },
    remove(exerciseId) { return drafts.delete(exerciseId); },
    clear() { drafts.clear(); },
  };
}
