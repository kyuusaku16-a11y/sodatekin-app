import { characterSVG, icon } from './character.js';

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const number = value => new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(value);
const shortDate = date => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
const fullDate = date => `${date.slice(0, 4)}年${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`;
const weekName = digest => digest.isCurrent ? '今週' : '先週';

/** Optional compact entry; no empty first-run card or automatic opening. */
export function weeklyDigestEntry(digest) {
  if (!digest.canReflect) return '';
  const detail = digest.workoutDays
    ? `${digest.workoutDays}日、${number(digest.sets)}セットの足あと`
    : `週のはじめと、${digest.partial ? 'いま' : 'おわり'}の姿を見比べる`;
  return `<button type="button" class="weekly-digest-entry" data-action="weekly-digest">${icon('history')}<span><strong>相棒と、一週間を振り返る</strong><small>${detail}</small></span>${icon('chevron')}</button>`;
}

function reflection(digest) {
  if (digest.workoutDays) return `${digest.workoutDays}日、${number(digest.sets)}セット。一緒に積み重ねたな。`;
  if (digest.restDays) return '休養を選んだ日も、ふたりの足あと。';
  if (digest.mealDays) return `食事を${digest.mealDays}日、記録したな。`;
  return digest.before.workoutDays ? '記録のない週も、これまでの積み重ねはそのまま。' : 'ここから、ふたりの足あとを残していこう。';
}

/** Modal body. The host handles data-action buttons and calls paintCharacters() after rendering. */
export function weeklyDigestView(state, digest, { back = false, comparisonOpen = false } = {}) {
  const name = state.settings.partnerName || '相棒';
  const bodyType = state.settings.bodyType;
  const label = weekName(digest);
  const range = `${fullDate(digest.start)} — ${shortDate(digest.end)}`;
  const endLabel = digest.partial ? 'いまの姿' : '週のおわり';
  return `<article class="weekly-digest" data-week-offset="${digest.weekOffset}">
    <nav class="weekly-digest-weeks" aria-label="振り返る週を選ぶ">${[[-1, '先週'], [0, '今週']].map(([offset, text]) => `<button type="button" data-action="weekly-digest-week" data-id="${offset}" aria-pressed="${digest.weekOffset === offset}">${text}</button>`).join('')}</nav>
    <header class="weekly-digest-heading"><p>${label}の足あと</p><h3>${range}</h3><small>${digest.partial ? `${shortDate(digest.through)}までの記録` : '月曜から日曜までの記録'}</small></header>
    <div class="weekly-digest-voice"><span>${esc(name)}</span><p>${reflection(digest)}</p></div>
    ${digest.mealDays || digest.restDays ? `<ul class="weekly-digest-facts">${digest.mealDays ? `<li>${icon('meal')}食事の記録 ${digest.mealDays}日</li>` : ''}${digest.restDays ? `<li>${icon('moon')}休養を選んだ日 ${digest.restDays}日</li>` : ''}</ul>` : ''}
    ${digest.grownParts.length ? `<section class="weekly-digest-growth" aria-label="${label}に育った部位"><div class="weekly-digest-growth-heading"><h4>この週に育った部位</h4><p>この週の合計 <strong>+${number(digest.earnedXP)} XP</strong></p></div><ul>${digest.grownParts.map(part => `<li><span>${icon(part.icon)}${part.name}</span><div><b>+${number(part.xp)} XP</b><small>${part.levelGain > 0 ? `Lv.${number(part.beforeLevel)} → ${number(part.afterLevel)}` : `Lv.${number(part.afterLevel)}`}</small></div></li>`).join('')}</ul><p class="weekly-digest-growth-note">見た目は少しずつ。数字にも、この週の積み重ねが残っています。</p></section>` : `<p class="weekly-digest-empty">${digest.workoutDays ? `${label}の筋トレ記録は${digest.workoutDays}日分。XPの変化はありません。` : `${label}の筋トレ記録はありません。${digest.before.workoutDays ? '育った姿は、そのまま残っています。' : '記録した筋トレから、相棒が少しずつ育ちます。'}`}</p>`}
    <details class="weekly-digest-comparison"${comparisonOpen ? ' open' : ''}><summary>週の姿を見比べる</summary>
    <div class="weekly-digest-pair" aria-label="${esc(name)}の週のはじめと${endLabel}を同じ向きと大きさで比較">
      <figure><figcaption>週のはじめ<small>${shortDate(digest.beforeDate)}までの姿</small></figcaption><div class="weekly-digest-character">${characterSVG(digest.before.parts, { back, bodyType })}</div></figure>
      <figure><figcaption>${endLabel}<small>${shortDate(digest.through)}までの姿</small></figcaption><div class="weekly-digest-character">${characterSVG(digest.after.parts, { back, bodyType })}</div></figure>
    </div>
    <div class="weekly-digest-facing"><span>${back ? '後ろ姿' : '正面'}で見比べています</span><button type="button" class="text-button" data-action="weekly-digest-turn" aria-label="ふたりの姿を${back ? '正面' : '後ろ姿'}に切り替える">${icon('turn')}${back ? '正面を見る' : '後ろ姿を見る'}</button></div>
    </details>
    <details class="weekly-digest-notes"><summary>この振り返りについて</summary><p>筋トレをした日付でまとめています。同じ日の記録を分けても1日、セット数は実際に記録した合計です。${digest.mealBonusDays ? `食事を記録した${digest.mealBonusDays}日分の筋トレには、食事ボーナスが含まれます。` : ''}${digest.restAndWorkoutDays ? `筋トレと休養の両方がある${digest.restAndWorkoutDays}日は、それぞれに含めています。` : ''}</p><p>姿はそれぞれの日までの累計、この週のXPはこの週に増えた分です。記録を編集・削除すると内容も変わります。XPと姿はゲーム内の成長です。</p></details>
    <button type="button" class="button button-light weekly-digest-close" data-action="close-modal">振り返りを閉じる</button>
  </article>`;
}
