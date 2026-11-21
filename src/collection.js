import { SPEECH_CATALOG } from './speech-catalog.js';
import { STORY_CHAPTERS } from './story-data.js';
const ids = new Set(SPEECH_CATALOG.map(s => s.id));
const storyIds = new Set(STORY_CHAPTERS.map(s => s.id));
export const emptyCollection = () => ({ heard: [], rareDays: [], storiesRead: [], sceneArrivals: [] });
export function mergeCollections(...collections) {
  const found = new Map(), rareDays = new Map();
  // 最初の抽選結果を保持。取消・削除・古いバックアップ復元で引き直さない。
  for (const row of collections.flatMap(c => c?.rareDays || [])) if (!rareDays.has(row.date)) rareDays.set(row.date, { ...row });
  for (const row of collections.flatMap(c => c?.heard || [])) {
    const previous = found.get(row.id);
    if (!previous || row.date < previous.date) found.set(row.id, { ...row });
  }
  return { heard: [...found.values()].sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)), rareDays: [...rareDays.values()].sort((a,b) => a.date.localeCompare(b.date)), storiesRead: [...new Set(collections.flatMap(c => c?.storiesRead || []))].sort(), sceneArrivals: [...new Set(collections.flatMap(c => c?.sceneArrivals || []))].sort() };
}
export function validateCollection(input, currentDate) {
  if (input === undefined) return emptyCollection();
  if (!input || typeof input !== 'object' || !Array.isArray(input.heard) || input.heard.length > 1000) throw new Error('ことば図鑑の形式が正しくありません。');
  const heard = input.heard.map(row => {
    const time = typeof row?.date === 'string' ? Date.parse(`${row.date}T00:00:00Z`) : NaN;
    if (!row || !ids.has(row.id) || !/^\d{4}-\d\d-\d\d$/.test(row.date) || !Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== row.date || row.date < '2000-01-01' || row.date > currentDate || typeof row.text !== 'string' || !row.text.trim() || row.text.length > 1000) throw new Error('ことば図鑑のID・日付・本文が正しくありません。');
    return { id: row.id, date: row.date, text: row.text };
  });
  const rareDays = input.rareDays ?? [];
  if (!Array.isArray(rareDays) || rareDays.length > 50000) throw new Error('相棒の反応履歴が正しくありません。');
  for (const row of rareDays) {
    const time = typeof row?.date === 'string' ? Date.parse(`${row.date}T00:00:00Z`) : NaN;
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== row.date || row.date < '2000-01-01' || row.date > currentDate || !(row.id === null || (typeof row.id === 'string' && /^rare\.[1-5]$/.test(row.id)))) throw new Error('相棒の反応履歴が正しくありません。');
  }
  const storiesRead = input.storiesRead === undefined ? [] : input.storiesRead;
  if (!Array.isArray(storiesRead) || storiesRead.length > 1000 || !storiesRead.every(id => storyIds.has(id))) throw new Error('物語のしおりが正しくありません。');
  const sceneArrivals = input.sceneArrivals === undefined ? [] : input.sceneArrivals;
  if (!Array.isArray(sceneArrivals) || sceneArrivals.length > storyIds.size || !sceneArrivals.every(id => storyIds.has(id))) throw new Error('旅の景色の到達履歴が正しくありません。');
  return mergeCollections({ heard, rareDays: rareDays.map(({date,id}) => ({date,id})), storiesRead, sceneArrivals });
}
// その場で画面に出た文だけを収録。可変の名前・数字を含む初回の全文を残す。
export function rememberVoice(collection, voice, date) {
  const entries = voice?.entries || (voice?.id ? [{ id: voice.id, line: voice.line }] : []);
  return mergeCollections(collection, { heard: entries.filter(e => ids.has(e.id) && e.line).map(e => ({ id: e.id, date, text: e.line })) });
}
