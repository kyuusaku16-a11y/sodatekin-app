const DAY = 86400000;
export const emptyDataSafety = () => ({ persistRequested: false, installDismissed: false, lastBackupAt: null, backupReminderShown: false });
// 永続化の要求とホーム追加の案内は端末ごとの状態。別ブラウザの値で省略しない。
export const dataSafetyAfterRestore = (imported, current) => ({ ...imported, persistRequested: current.persistRequested, installDismissed: current.installDismissed });
export function validateDataSafety(input) {
  if (input === undefined) return emptyDataSafety();
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('データ保護設定の形式が正しくありません。');
  const result = emptyDataSafety();
  for (const key of ['persistRequested', 'installDismissed', 'backupReminderShown']) {
    if (input[key] !== undefined && typeof input[key] !== 'boolean') throw new Error('データ保護設定の形式が正しくありません。');
    result[key] = input[key] ?? false;
  }
  const at = input.lastBackupAt ?? null;
  if (at !== null && (typeof at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at) || !Number.isFinite(Date.parse(at)) || new Date(at).toISOString() !== at)) throw new Error('最終バックアップ日時が正しくありません。');
  result.lastBackupAt = at;
  return result;
}
export function needsPersistence(state, event) {
  return !state.settings.dataSafety.persistRequested && ['workout', 'meal', 'rest'].includes(event?.kind) && state.workouts.length + state.meals.length + state.restDays.length > 0;
}
export async function requestPersistence(navigatorLike = globalThis.navigator) {
  try { return typeof navigatorLike?.storage?.persist === 'function' ? !!(await navigatorLike.storage.persist()) : false; }
  catch { return false; }
}
export function isIOSSafari(navigatorLike = globalThis.navigator, windowLike = globalThis.window) {
  const ua = navigatorLike?.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigatorLike?.maxTouchPoints > 1);
  const standalone = navigatorLike?.standalone || windowLike?.matchMedia?.('(display-mode: standalone)').matches;
  return ios && /Version\//.test(ua) && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua) && !standalone;
}
export function shouldSuggestInstall(state, recordedDays, safari = isIOSSafari()) {
  return safari && recordedDays >= 3 && !state.settings.dataSafety.installDismissed;
}
export function shouldRemindBackup(state, now = Date.now()) {
  const safety = state.settings.dataSafety;
  if (safety.backupReminderShown) return false;
  const records = [...state.workouts, ...state.meals];
  if (new Set(records.map(r => r.id)).size < 10) return false;
  // 未書き出しの場合は最初の保存日時から14日。実施日の後日入力では前倒ししない。
  const from = safety.lastBackupAt ? Date.parse(safety.lastBackupAt) : records.reduce((min, r) => Math.min(min, Date.parse(r.createdAt)), Infinity);
  return Number.isFinite(from) && now - from >= 14 * DAY;
}
