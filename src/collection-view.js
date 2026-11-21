import { SPEECH_CATALOG } from './speech-catalog.js';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function collectionSection(collection) {
  const heard = new Map((collection?.heard || []).map(row => [row.id, row]));
  const count = SPEECH_CATALOG.filter(row => heard.has(row.id)).length;
  // 操作や記録追加を「達成条件」にしない。聞いた後はこれまで通り全文を残す。
  const quiet = new Set(['record.edit','workout.past','workout.capped','workout.additional','meal.already','meal.additional']);
  const visible = SPEECH_CATALOG.filter(item => heard.has(item.id) || !quiet.has(item.id));
  return `<details class="words-collection album-shelf" data-journey-section="words"><summary><h2>相棒のことば<small>これまでに聞いたことば · ${count}件</small></h2></summary><p class="words-help">記録を直しても、聞いたことばはここに残ります。</p><div class="words-grid">${visible.map(item => {
    const row = heard.get(item.id);
    return `<article class="word-card ${row ? 'heard' : 'unheard'}" data-speech-id="${item.id}"><span class="word-group">${item.group}</span>${row ? `<p>${esc(row.text)}</p><time datetime="${row.date}">初めて聞いた日 ${row.date.replaceAll('-','/')}</time>` : `<p class="word-unknown">？？？</p><span class="word-hint">${item.hint}</span>`}</article>`;
  }).join('')}</div></details>`;
}
