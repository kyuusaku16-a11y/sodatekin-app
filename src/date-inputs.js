import { shiftDate, validDate } from './model.js';

export function dateInputLimits(today, original = null) {
  const recent = shiftDate(today, -7);
  return { min: validDate(original) && original < recent ? original : recent, max: today };
}

export function dateRolloverMessage(today, original = null) {
  const label = date => date.replaceAll('-', '/');
  const recent = shiftDate(today, -7);
  return `日付が変わりました。入力中の実施日は変更していません。${label(recent)}〜${label(today)}から選べます。${validDate(original) && original < recent ? `元の実施日（${label(original)}）も保存できます。` : ''}`;
}

export function refreshWorkoutSetDateLabels(form, today) {
  const date = form.elements.namedItem('date')?.value || '';
  const memo = form.elements.namedItem('memo')?.value || '';
  const short = validDate(date) ? `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}` : '日付未入力';
  const relative = date === today ? '今日' : date === shiftDate(today, -1) ? '昨日' : '';
  const shown = `${short}${relative ? `（${relative}）` : ''}`;
  const status = form.querySelector('.workout-sets-status>span');
  if (status) status.textContent = `実施日 ${shown}`;
  const summary = form.querySelector('.workout-sets-extras>summary>span');
  if (summary) summary.textContent = `${shown}${memo ? '・メモあり' : ''}`;
}

// Keep existing controls and their values/focus; only the calendar constraints
// and explanatory text change. History is not limited to the input window.
export function refreshDateInputs(root, today) {
  for (const input of root.querySelectorAll('input[type="date"]')) {
    if (input.id === 'history-from' || input.id === 'history-to') {
      input.max = today;
      continue;
    }
    if (input.name !== 'date' || !['weight-form', 'workout-form', 'workout-sets-form', 'food-form'].includes(input.form?.id)) continue;
    const original = input.dataset.originalDate || null;
    const limits = dateInputLimits(today, original);
    input.min = limits.min;
    input.max = limits.max;
    const noticeId = `${input.form.id}-date-rollover`;
    let notice = input.form.querySelector(`#${noticeId}`);
    if (!notice) {
      notice = input.ownerDocument.createElement('p');
      notice.id = noticeId;
      notice.className = 'field-help';
      notice.setAttribute('role', 'status');
      (input.closest('.form-row') || input.closest('label')).insertAdjacentElement('afterend', notice);
      input.setAttribute('aria-describedby', [...new Set(`${input.getAttribute('aria-describedby') || ''} ${noticeId}`.trim().split(/\s+/))].join(' '));
    }
    notice.textContent = dateRolloverMessage(today, original);
    if (input.form.id === 'workout-sets-form') refreshWorkoutSetDateLabels(input.form, today);
  }
}
