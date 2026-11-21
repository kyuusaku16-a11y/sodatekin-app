import { continuedDates } from './diet-summary.js';
import { addedRecords } from './comparison.js';
import { exerciseById } from './exercise-catalog.js';
import { STORY_CHAPTERS } from './story-data.js';
import { storyOf } from './story.js';
import { today, validDate, backgroundModeOf } from './model.js';

export const sceneMode = backgroundModeOf;

/** Current earned scenes, independent of bookmarks and played-arrival history. */
export function earnedSceneIds(state, date = today()) {
  const days = continuedDates(state, date).length;
  return STORY_CHAPTERS.filter(chapter => chapter.days <= days).map(chapter => chapter.id);
}

const chapterResult = (chapter, index) => ({ id: chapter.id, number: index + 1, title: chapter.title });

/** The date follows the record calendar; the sky follows the device's local hour. */
export function sceneFor(state, { date = today(), now = new Date(), story = storyOf(state, date) } = {}) {
  if (sceneMode(state.settings) !== 'journey' || !validDate(date)) return null;
  const earned = new Set(story.earned.map(chapter => chapter.id));
  const index = STORY_CHAPTERS.reduce((last, chapter, i) => earned.has(chapter.id) ? i : last, -1);
  const chapterIndex = Math.max(0, index), chapter = STORY_CHAPTERS[chapterIndex];
  const hour = now.getHours();
  let period = hour >= 5 && hour < 10 ? 'morning' : hour >= 10 && hour < 16 ? 'day' : hour >= 16 && hour < 19 ? 'evening' : 'night';
  // The home sky follows the active mode. A closed period still includes its
  // last day in condition history, but turning the mode off restores the sky.
  const resting = state.restDays.includes(date) || state.restPeriods.some(period => period.start <= date && period.end === null);
  if (resting && period !== 'night') period = 'evening';
  return { ...chapterResult(chapter, chapterIndex), period, resting, earned: index >= 0 };
}

const workoutFields = ['id', 'exerciseId', 'date', 'count', 'sets', 'weight', 'memo', 'createdAt'];
function validNewWorkout(state, record, date) {
  return record && typeof record.id === 'string' && record.id.length > 0 && record.id.length <= 100
    && exerciseById(state, record.exerciseId) && validDate(record.date) && record.date <= date
    && Number.isInteger(record.count) && record.count >= 1 && record.count <= 86400
    && Number.isInteger(record.sets) && record.sets >= 1 && record.sets <= 100
    && (record.weight === null || typeof record.weight === 'number' && Number.isFinite(record.weight) && record.weight >= 0 && record.weight <= 2000)
    && typeof record.memo === 'string' && record.memo.length <= 500
    && typeof record.createdAt === 'string' && Number.isFinite(Date.parse(record.createdAt));
}

// As with addedRecords, all supplied IDs must be new and every old record must
// remain identical. Scene progress can also accept a future multi-date workout
// transaction; only this guard permits that, not the same-day set-entry UI.
function addedWorkoutRecords(before, after, event, date) {
  if (!Array.isArray(before?.workouts) || !Array.isArray(after?.workouts)) return null;
  if ([...before.workouts, ...after.workouts].some(record => !record || typeof record !== 'object')) return null;
  const ids = event.ids === undefined ? [event.id] : event.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 50000 || ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length || !ids.includes(event.id)) return null;
  const oldRecords = new Map(before.workouts.map(record => [record.id, record]));
  const newRecords = new Map(after.workouts.map(record => [record.id, record]));
  if (oldRecords.size !== before.workouts.length || newRecords.size !== after.workouts.length || newRecords.size !== oldRecords.size + ids.length) return null;
  if ([...oldRecords].some(([id, record]) => !newRecords.has(id) || workoutFields.some(field => newRecords.get(id)[field] !== record[field]))) return null;
  const records = ids.map(id => newRecords.get(id));
  if (records.some((record, index) => oldRecords.has(ids[index]) || !validNewWorkout(after, record, date))) return null;
  return records;
}

/**
 * Candidate only: call before merging earnedSceneIds into collection, then show
 * once after the whole save succeeds. This function does not mutate or persist.
 */
export function newlyReachedScene(before, after, event, date = today()) {
  if (!event || !validDate(date) || sceneMode(after?.settings) !== 'journey') return null;
  const added = event.kind === 'workout' ? addedWorkoutRecords(before, after, event, date) : addedRecords(before, after, event);
  if (!added || !added.every(record => validDate(record.date) && record.date <= date)) return null;
  const previous = earnedSceneIds(before, date), current = earnedSceneIds(after, date);
  const id = current.at(-1);
  if (!id || previous.includes(id)) return null;
  const seen = new Set([...(before.collection?.sceneArrivals || []), ...(after.collection?.sceneArrivals || [])]);
  if (seen.has(id)) return null;
  const index = STORY_CHAPTERS.findIndex(chapter => chapter.id === id);
  return chapterResult(STORY_CHAPTERS[index], index);
}
