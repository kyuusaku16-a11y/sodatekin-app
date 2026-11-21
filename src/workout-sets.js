import { exerciseById } from './exercise-catalog.js';
import { makeWorkout, shiftDate, today as currentDate, validDate, withinInputWindow } from './model.js';

export const MAX_WORKOUT_SET_ROWS = 100;

export class WorkoutSetDraftError extends Error {
  constructor(message, field, rowIndex = null) {
    super(message);
    this.name = 'WorkoutSetDraftError';
    this.field = field;
    this.rowIndex = rowIndex;
  }
}

const raw = value => value === null || value === undefined ? '' : String(value);
const numberText = value => raw(value).trim().normalize('NFKC');
const decimal = value => /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(numberText(value));
const weightDecimal = value => /^(?:\d+(?:\.\d?)?|\.\d)$/.test(value);
export function parseWorkoutWeight(value, reference = null) {
  const text = numberText(value);
  if (!text) return null;
  const weight = Number(text);
  const isOriginal = reference !== null && text === String(reference);
  return (isOriginal || weightDecimal(text)) && Number.isFinite(weight) && weight >= 0 && weight <= 2000 ? weight : NaN;
}
const rowError = (message, field, rowIndex) => new WorkoutSetDraftError(`${rowIndex + 1}セット目：${message}`, field, rowIndex);
const copyDraft = draft => ({ ...draft, ...(draft.source ? { source: { ...draft.source } } : {}), rows: draft.rows.map(row => ({ ...row })) });
function exerciseForDraft(exerciseId, state) {
  const exercise = exerciseById(state, exerciseId);
  if (!exercise) throw new WorkoutSetDraftError('筋トレの種目を選び直してください。', 'exerciseId');
  return exercise;
}
function validCount(text) {
  const count = Number(numberText(text));
  return decimal(text) && Number.isInteger(count) && count >= 1 && count <= 86400;
}

const checkRows = draft => {
  if (!Array.isArray(draft?.rows) || draft.rows.length < 1 || draft.rows.length > MAX_WORKOUT_SET_ROWS) {
    throw new WorkoutSetDraftError(`セット数は1〜${MAX_WORKOUT_SET_ROWS}で入力してください。`, 'rows');
  }
};

/** Convert the existing equal-set form into an unsaved draft, preserving every raw value. */
export function createWorkoutSetDraft(exerciseId, values = {}, state) {
  const exercise = exerciseForDraft(exerciseId, state);
  const inputSets = values.sets ?? exercise.sets;
  const sets = Number(numberText(inputSets));
  if (!decimal(inputSets) || !Number.isInteger(sets) || sets < 1 || sets > MAX_WORKOUT_SET_ROWS) {
    throw new WorkoutSetDraftError(`セット数は1〜${MAX_WORKOUT_SET_ROWS}の整数で入力してください。`, 'sets');
  }
  return {
    exerciseId,
    date: raw(values.date ?? currentDate()),
    memo: raw(values.memo),
    rows: Array.from({ length: sets }, () => ({ count: raw(values.count ?? exercise.count), weight: raw(values.weight) })),
  };
}

function previousRecords(state, exerciseId, today) {
  exerciseForDraft(exerciseId, state);
  if (!validDate(today)) throw new WorkoutSetDraftError('今回の実施日を確認してください。', 'date');
  // Resolve edited duplicate IDs before selecting the date. Keep the last occurrence's position.
  const unique = new Map();
  state.workouts.forEach((record, index) => unique.set(record.id, { record, index }));
  const candidates = [...unique.values()].filter(({ record }) => record.exerciseId === exerciseId && validDate(record.date) && record.date <= today);
  const date = candidates.reduce((latest, { record }) => record.date > latest ? record.date : latest, '');
  return candidates.filter(item => item.record.date === date).sort((a, b) => (Date.parse(a.record.createdAt) - Date.parse(b.record.createdAt) || 0) || a.index - b.index).map(item => item.record);
}

function previousSummary(records, exerciseId) {
  if (!records.length) return null;
  const validSets = records.every(record => Number.isInteger(record.sets) && record.sets >= 1 && record.sets <= MAX_WORKOUT_SET_ROWS);
  const sets = validSets ? records.reduce((sum, record) => sum + record.sets, 0) : null;
  const reason = !validSets ? '前回のセット数を確認してください。履歴から元の記録を確認できます。'
    : sets > MAX_WORKOUT_SET_ROWS ? `前回は${sets}セットあります。一度に使えるのは${MAX_WORKOUT_SET_ROWS}セットまでです。必要な分を入力してください。` : null;
  return { exerciseId, date: records[0].date, recordCount: records.length, sets, copyable: reason === null, reason };
}

/** Find the matching set on the last training day before today, including grouped sets. */
export function previousDaySet(state, exerciseId, setNumber, date = currentDate()) {
  const records = previousRecords(state, exerciseId, shiftDate(date, -1));
  let total = 0;
  for (const record of records) {
    total += record.sets;
    if (setNumber <= total) return record;
  }
  return null;
}

/** Facts for an optional entry. This latest execution date can be today; it is always shown. */
export function previousWorkoutSetSummary(state, exerciseId, { today = currentDate() } = {}) {
  return previousSummary(previousRecords(state, exerciseId, today), exerciseId);
}

/** Copy a whole execution date into an unsaved draft. No IDs, earned XP, or old memo are copied. */
export function createPreviousWorkoutSetDraft(state, exerciseId, { today = currentDate() } = {}) {
  const records = previousRecords(state, exerciseId, today);
  const summary = previousSummary(records, exerciseId);
  if (!summary) throw new WorkoutSetDraftError('この種目の前回の記録は、まだありません。', 'exerciseId');
  if (!summary.copyable) throw new WorkoutSetDraftError(summary.reason, 'rows');
  return {
    exerciseId,
    date: today,
    memo: '',
    rows: records.flatMap(record => Array.from({ length: record.sets }, () => ({ count: raw(record.count), weight: raw(record.weight) }))),
    source: { date: summary.date, recordCount: summary.recordCount, sets: summary.sets },
  };
}

/** Start the new row at the preceding count, keeping unfinished input in its original row. */
export function addWorkoutSetRow(draft, state) {
  checkRows(draft);
  if (draft.rows.length === MAX_WORKOUT_SET_ROWS) throw new WorkoutSetDraftError(`一度に入力できるのは${MAX_WORKOUT_SET_ROWS}セットまでです。`, 'rows');
  const next = copyDraft(draft);
  const last = draft.rows.at(-1);
  const count = validCount(last.count) ? last.count : exerciseForDraft(draft.exerciseId, state).count;
  next.rows.push({ count: raw(count), weight: raw(last.weight) });
  return next;
}

export function removeWorkoutSetRow(draft, index) {
  checkRows(draft);
  if (!Number.isInteger(index) || index < 0 || index >= draft.rows.length) throw new WorkoutSetDraftError('削除するセットを確認してください。', 'rows');
  const next = copyDraft(draft);
  if (next.rows.length > 1) next.rows.splice(index, 1);
  return next;
}

/** Validate the whole draft before any record IDs or saved-state changes are made. */
export function validateWorkoutSetDraft(draft, { today = currentDate(), state } = {}) {
  try {
    const exercise = exerciseForDraft(draft?.exerciseId, state);
    checkRows(draft);
    if (!withinInputWindow(draft.date, today)) throw new WorkoutSetDraftError('実施日は今日から7日前までを選んでください。', 'date');
    if (typeof draft.memo !== 'string' || draft.memo.length > 500) throw new WorkoutSetDraftError('共通メモは500文字以内で入力してください。', 'memo');
    const countLabel = exercise.unit === '秒' ? '秒数' : '回数';
    const rows = draft.rows.map((row, rowIndex) => {
      const countText = numberText(row?.count);
      const count = Number(countText);
      if (!countText) throw rowError(`${countLabel}を入力してください。`, 'count', rowIndex);
      if (!validCount(countText)) throw rowError(`${countLabel}は1〜86400の整数で入力してください。`, 'count', rowIndex);
      const weight = parseWorkoutWeight(row?.weight);
      if (Number.isNaN(weight)) {
        throw rowError('重量は0〜2000kg、小数1桁までで入力してください。', 'weight', rowIndex);
      }
      return { count, weight };
    });
    return { ok: true, values: { exerciseId: exercise.id, date: draft.date, memo: draft.memo.trim(), rows } };
  } catch (error) {
    if (error instanceof WorkoutSetDraftError) return { ok: false, error };
    throw error;
  }
}

/** Returns all records in row order, or throws without modifying state or creating partial results. */
export function makeWorkoutSetRecords(state, draft, options = {}) {
  const result = validateWorkoutSetDraft(draft, { ...options, state });
  if (!result.ok) throw result.error;
  const { exerciseId, date, memo, rows } = result.values;
  return rows.map(({ count, weight }) => makeWorkout(state, exerciseId, { count, weight, sets: 1, date, memo }));
}
