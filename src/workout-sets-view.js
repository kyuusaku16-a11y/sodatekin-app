import { exerciseById } from './exercise-catalog.js';
import { icon } from './character.js';
import { shiftDate, today as currentDate } from './model.js';
import { MAX_WORKOUT_SET_ROWS } from './workout-sets.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const marked = (error, field, rowIndex = null) => error?.field === field && error.rowIndex === rowIndex;
const invalid = (match, errorId = 'workout-sets-error') => match ? ` aria-invalid="true" aria-describedby="${errorId}"` : '';
const displayDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}` : date;

/** This entry only opens an unsaved draft; it never means these sets were performed. */
export function previousWorkoutSetsEntry(summary) {
  if (!summary) return '';
  if (!summary.copyable) return `<p class="workout-sets-previous-note">${esc(summary.reason)}</p>`;
  return `<div class="workout-sets-previous"><button type="button" class="button button-light" data-action="workout-previous-sets" data-id="${esc(summary.exerciseId)}">前回${esc(summary.sets)}セットを使う</button><p class="workout-sets-help">${esc(summary.date)}の全セットを下書きにします。今回できた分を確認してから記録してください。</p></div>`;
}

export function workoutSetsView(draft, { error = null, today = currentDate(), state } = {}) {
  const exercise = exerciseById(state, draft.exerciseId);
  const weightLabel = exercise?.category === 'weighted' ? '追加重量' : '重量';
  const unit = exercise?.unit ?? '回';
  const countLabel = unit === '秒' ? '秒数' : '回数';
  const weightFirst = exercise?.usesWeight || draft.rows.some(row => row.weight !== null && row.weight !== undefined && row.weight !== '');
  const rowError = Number.isInteger(error?.rowIndex) && error.rowIndex >= 0 && error.rowIndex < draft.rows.length;
  const extrasError = marked(error, 'date') || marked(error, 'memo');
  const sourceAttributes = draft.source ? ` data-copy-source-date="${esc(draft.source.date)}" data-copy-source-sets="${esc(draft.source.sets)}" data-copy-source-records="${esc(draft.source.recordCount)}"` : '';
  const extrasOpen = draft.date !== today || draft.memo || ['date', 'memo'].includes(error?.field);
  const submit = `<button type="submit" class="button button-primary">${icon('check')}入力した${draft.rows.length}セットを記録</button>`;
  return `<form id="workout-sets-form" class="workout-sets-form" data-exercise="${esc(draft.exerciseId)}"${sourceAttributes} novalidate>
    <div class="workout-sets-top"><p class="workout-sets-status"><strong>未保存</strong><span>実施日 ${esc(displayDate(draft.date))}${draft.date === today ? '（今日）' : ''}</span></p>${submit}</div>
    <div class="xp-preview sets-growth-preview"></div><p class="workout-sets-intro">${draft.source ? `${esc(draft.source.date)}の${esc(draft.source.sets)}セットを下書きにしました。` : ''}実際に行った分だけを確認して記録してください。</p>
    <div class="workout-sets-pause"><button type="button" class="button button-light" data-action="workout-set-timer">${icon('timer')}休憩タイマー</button><button type="button" class="button button-light" data-action="close-modal">下書きを残して閉じる</button></div>
    <p class="workout-sets-help workout-sets-resume-note">閉じても、このページを開いている間は続きから入力できます。再読み込みやページを閉じると下書きは消えます。</p>
    <p class="form-error workout-sets-error" id="workout-sets-error" role="alert" tabindex="-1">${rowError || extrasError ? '' : esc(error?.message ?? '')}</p>
    <div class="workout-set-rows" aria-label="セットごとの${countLabel}と重量">${draft.rows.map((row, index) => {
      const countField = `<label class="field">${countLabel}<div class="input-unit"><input type="text" inputmode="numeric" name="set-count-${index}" value="${esc(row.count)}" aria-label="${index + 1}セット目の${countLabel}" required autocomplete="off"${invalid(marked(error, 'count', index), `workout-set-error-${index}`)}><span>${unit}</span></div></label>`;
      const weightField = `<label class="field">${weightLabel} <span class="workout-set-optional">任意</span><div class="input-unit"><input type="text" inputmode="decimal" name="set-weight-${index}" value="${esc(row.weight)}" aria-label="${index + 1}セット目の${weightLabel}（kg、任意）" placeholder="未入力" autocomplete="off"${invalid(marked(error, 'weight', index), `workout-set-error-${index}`)}><span>kg</span></div></label>`;
      return `<fieldset class="workout-set-row${error?.rowIndex === index ? ' has-error' : ''}" data-workout-set-row="${index}"><legend class="workout-set-legend">${index + 1}セット目</legend><span class="workout-set-number" aria-hidden="true">${index + 1}</span>${weightFirst ? weightField + countField : countField + weightField}<button type="button" class="icon-button workout-set-remove" data-action="workout-set-remove" data-index="${index}" aria-label="${index + 1}セット目を削除"${draft.rows.length === 1 ? ' disabled' : ''}>${icon('trash')}</button>${error?.rowIndex === index ? `<p class="workout-set-row-error" id="workout-set-error-${index}" role="alert">${esc(error.message)}</p>` : ''}</fieldset>`;
    }).join('')}</div>
    <button type="button" class="button button-light workout-set-add" data-action="workout-set-add"${draft.rows.length >= MAX_WORKOUT_SET_ROWS ? ' disabled' : ''}>${icon('plus')}セットを追加</button>
    <p class="workout-sets-help">次のセットには直前の回数・秒数と重量が入ります。一度に${MAX_WORKOUT_SET_ROWS}セットまで。</p>
    <details class="workout-sets-extras"${extrasOpen ? ' open' : ''}><summary>日付・メモ <span>${esc(displayDate(draft.date))}${draft.memo ? '・メモあり' : ''}</span></summary><div class="workout-sets-extras-fields"><label class="field workout-sets-date">共通の実施日<input type="date" name="date" value="${esc(draft.date)}" min="${shiftDate(today, -7)}" max="${today}" required${invalid(marked(error, 'date'), 'workout-sets-date-error')}>${marked(error, 'date') ? `<span class="workout-set-row-error" id="workout-sets-date-error" role="alert">${esc(error.message)}</span>` : ''}</label><label class="field workout-sets-memo">共通メモ <span class="optional">任意</span><textarea name="memo" maxlength="500" rows="2" placeholder="この日の気づきをひとこと"${invalid(marked(error, 'memo'), 'workout-sets-memo-error')}>${esc(draft.memo)}</textarea>${marked(error, 'memo') ? `<span class="workout-set-row-error" id="workout-sets-memo-error" role="alert">${esc(error.message)}</span>` : ''}</label></div></details>
    <p class="workout-sets-help workout-sets-saving-note">各行を「1セットの記録」として保存します。入力した${draft.rows.length}行は、履歴では${draft.rows.length}件になります。回数・重量が同じ行も、別の実施分として保存されます。</p>
    <div class="form-actions">${submit}</div><button type="button" class="workout-sets-discard" data-action="workout-set-discard">この下書きを破棄</button>
  </form>`;
}

/** Read before every add/remove rerender so unfinished text is kept as typed. */
export function readWorkoutSetDraft(form) {
  const value = name => form.elements.namedItem(name)?.value ?? '';
  return {
    exerciseId: form.dataset.exercise,
    date: value('date'),
    memo: value('memo'),
    ...(form.dataset.copySourceDate ? { source: { date: form.dataset.copySourceDate, sets: Number(form.dataset.copySourceSets), recordCount: Number(form.dataset.copySourceRecords) } } : {}),
    rows: [...form.querySelectorAll('[data-workout-set-row]')].map(row => ({
      count: value(`set-count-${row.dataset.workoutSetRow}`),
      weight: value(`set-weight-${row.dataset.workoutSetRow}`),
    })),
  };
}

/** Error results use the same target shape; for a new row pass { field:'count', rowIndex }. */
export function focusWorkoutSetField(form, { field = 'count', rowIndex = 0 } = {}) {
  const name = ['count', 'weight'].includes(field) && Number.isInteger(rowIndex) ? `set-${field}-${rowIndex}` : field;
  const target = form.elements.namedItem(name) ?? form.querySelector('.form-error');
  if (!target) return false;
  const details = target.closest?.('details');
  if (details) details.open = true;
  target.focus({ preventScroll: true });
  (target.closest?.('[data-workout-set-row]') ?? target.closest?.('.field') ?? target).scrollIntoView({ block: 'nearest', behavior: 'instant' });
  return true;
}
