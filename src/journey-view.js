import { exerciseById, exercisesFor } from './exercise-catalog.js';
import { isPaused, shiftDate, today } from './model.js';
import { recordKindsByDate } from './diet-summary.js';
import { weightChartSVG } from './weight-chart.js';
import { notebookPages } from './training-notebook.js';
import { milestonesOf } from './milestones.js';
import { milestoneSection } from './milestone-view.js';
import { comparisonAt } from './comparison.js';
import { RULES } from './rules.js';
import { characterSVG, icon } from './character.js';
import { collectionSection } from './collection-view.js';
import { storyOf } from './story.js';
import { storySection } from './story-view.js';
import { weeklyDigestEntry } from './weekly-digest-view.js';

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shortDate = date => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
const fullDate = date => `${date.slice(0, 4)}年${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`;
const number = n => new Intl.NumberFormat('ja-JP').format(n);

export function dayHistoryScrollOffset(button, headerBottom, dialogBottom, noticeTop = button.top) {
  if (button.bottom > dialogBottom) return button.bottom - dialogBottom;
  const top = button.bottom - noticeTop <= dialogBottom - headerBottom ? noticeTop : button.top;
  return Math.min(0, top - headerBottom);
}

function exerciseHistoryEntry(days, state) {
  if (!days.length) return '';
  const last = days[0], ex = exerciseById(state, last.exerciseId);
  const prior = days.find(day => day.exerciseId === ex.id && day.date < last.date);
  const lastAmount = `${number(last.volume)}${ex.unit}`;
  const amounts = prior ? `前回 ${number(prior.volume)}${ex.unit} → 直近 ${lastAmount}` : `${shortDate(last.date)} · 合計 ${lastAmount}`;
  return `<button type="button" class="exercise-history-entry" data-action="exercise-history" data-id="${ex.id}"><span><small>種目別の記録 · 1日合計</small><strong>${esc(ex.name)}</strong><span>${amounts}</span></span>${icon('chevron')}</button>`;
}
export function exerciseHistoryContent(days, id, state) {
  const options = exercisesFor(state).filter(ex => days.some(row => row.exerciseId === ex.id));
  const ex = options.find(option => option.id === id) || options[0];
  if (!ex) return '<p>筋トレを記録すると、種目ごとの実施量がここに残ります。</p>';
  const matches = days.filter(day => day.exerciseId === ex.id);
  return `<label class="field">種目を選ぶ<select id="history-exercise">${options.map(option => `<option value="${option.id}" ${option.id === ex.id ? 'selected' : ''}>${esc(option.name)}</option>`).join('')}</select></label><div class="exercise-day-totals"><p>${esc(ex.name)}を記録した${matches.length}日${matches.length > 5 ? 'のうち、直近5日' : ''}</p><ul>${matches.slice(0,5).map(row => `<li><time datetime="${row.date}">${fullDate(row.date)}</time><span><strong>${number(row.volume)}${ex.unit}</strong> · ${number(row.sets)}セット${row.weight !== null ? ` · 最大${number(row.weight)}kg` : ''}</span></li>`).join('')}</ul><p>同じ日のセットを合計しています。食事やゲーム内のXPは含みません。</p></div>`;
}
export function journeyPeek(journey) {
  const last = journey.memories[0];
  return `<button class="journey-peek" data-action="journey-peek" data-id="${last ? 'memories' : 'story'}">${icon('history')}<span><strong>ふたりのあゆみ</strong><small>${last ? `${shortDate(last.date)}　${esc(last.title)}` : 'はじめの姿と、これからの成長。'}</small></span>${icon('chevron')}</button>`;
}

function weightSection(weights, date, range) {
  const controls = [30, 90, 'all'].map(value => `<button type="button" data-action="chart-range" data-id="${value}" aria-pressed="${range === value}">${value === 'all' ? '全期間' : value + '日'}</button>`).join('');
  return `<section class="journey-diet-card"><div class="diet-card-heading"><h2>体重グラフ</h2><div class="chart-period" role="group" aria-label="表示期間">${controls}</div></div>${weightChartSVG(weights, date, range)}</section>`;
}

function calendarSection(state, date, month) {
  const first = month + '-01';
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  const days = recordKindsByDate(state, first, date < last ? date : last);
  const rests = new Set(state.restDays);
  const marks = { weight: ['●','体重'], meal: ['▲','食事'], workout: ['■','筋トレ'], rest: ['☾','休養'] };
  const weekday = new Date(first + 'T00:00:00Z').getUTCDay();
  const cells = Array.from({ length: Number(last.slice(8)) }, (_, i) => {
    const day = shiftDate(first, i);
    const kinds = Object.keys(marks).filter(kind => days.get(day)?.has(kind));
    if (day <= date && (rests.has(day) || isPaused(state, day))) kinds.push('rest');
    const continued = days.has(day);
    const recorded = continued || (day <= date && rests.has(day));
    const labels = kinds.map(kind => kind === 'rest' && !rests.has(day) ? '休養モード' : marks[kind][1]);
    const label = `${fullDate(day)} ${labels.join('・') || (day > date ? 'これから' : '記録なし')}`;
    const current = day === date ? ' aria-current="date"' : '';
    const face = `<span aria-hidden="true">${i + 1}</span><small aria-hidden="true">${kinds.map(kind => marks[kind][0]).join('')}</small>`;
    const cell = recorded
      ? `<button type="button" class="calendar-date ${continued ? 'calendar-continued' : 'calendar-rest'}" data-action="calendar-day" data-id="${day}" aria-label="${label}の記録を開く"${current}>${face}</button>`
      : `<span class="calendar-date"${current}><span class="sr-only">${label}</span>${face}</span>`;
    return `<li${i === 0 ? ` style="grid-column-start:${weekday + 1}"` : ''}>${cell}</li>`;
  }).join('');
  return `<section class="journey-diet-card"><div class="diet-card-heading"><h2>${year}年${monthNumber}月の続いた日　${days.size}日</h2><div class="month-nav">
    <button type="button" data-action="calendar-month" data-id="prev" aria-label="前月">‹</button>
    <button type="button" data-action="calendar-month" data-id="next" aria-label="次月">›</button></div></div>
    <div class="calendar-weekdays" aria-hidden="true">${[...'日月火水木金土'].map(day => `<span>${day}</span>`).join('')}</div>
    <ol class="record-calendar">${cells}</ol><p class="calendar-key">${Object.values(marks).map(([mark, label]) => `<span>${mark} ${label}</span>`).join('')}</p></section>`;
}

export function journeyPage(state, summary, journey, week, back = false, memoryLimit = 12, digest = null, trainingDays = [], { partGrid = '', before = null, compareBefore = false, date = today(), range = 30, month = date.slice(0, 7) } = {}) {
  const baseline = comparisonAt(compareBefore && before ? 'before' : 'initial', summary, before);
  const grown = journey.grownParts;
  const topXP = Math.max(0, ...grown.map(p => summary.parts[p.id].xp));
  const leaders = grown.filter(p => summary.parts[p.id].xp === topXP);
  const growthCaption = leaders.length
    ? `XPが最も多い部位は${leaders.map(p => p.name).join('・')}。累計 ${number(topXP)} XP`
    : '最初の筋トレで、鍛えた部位にXPが届きます。';
  const max = Math.max(1, ...week.parts.map(p => p.sets));
  return `<header class="journey-heading"><h1>あゆみ</h1></header>
    ${weightSection(state.weights, date, range)}
    ${calendarSection(state, date, month)}
    <section class="comparison-card" aria-labelledby="comparison-title">
      <div class="section-heading"><h2 id="comparison-title" tabindex="-1">${esc(state.settings.partnerName)}の成長</h2><button class="facing-button" data-action="compare-turn" aria-pressed="${back}">${icon('turn')}${back ? '正面を見る' : '後ろ姿を見る'}</button></div>
      ${before ? `<div class="home-comparison" role="group" aria-label="いまの姿と比較する時点を選ぶ">${[['initial', 'はじめ'], ['before', 'この記録の前']].map(([id, label]) => `<button type="button" data-action="journey-compare" data-id="${id}" aria-pressed="${baseline.mode === id}">${label}</button>`).join('')}</div>` : ''}
      <div class="comparison-pair"><figure><figcaption>${baseline.label}の姿<span>Lv.${baseline.level}</span></figcaption><div class="comparison-figure">${characterSVG(baseline.parts, { back, bodyType: state.settings.bodyType })}</div></figure><span class="compare-arrow" aria-hidden="true">→</span><figure class="current-figure"><figcaption>いまの姿<span>Lv.${summary.level}</span></figcaption><div class="comparison-figure">${characterSVG(summary.parts, { back, bodyType: state.settings.bodyType })}</div></figure></div>
      <p class="comparison-caption">総合レベル <strong>Lv.${summary.level}</strong> · 次のレベルまで ${number(RULES.totalXP - summary.progress)} XP · 一緒に鍛えた日 累計${summary.workoutDays}日</p>
      <p class="comparison-caption">${growthCaption}</p>
      <div class="comparison-foot"><span>同じ大きさ・同じ向きで比較しています。</span><button class="text-button" data-action="preview">成長イメージを試す →</button></div>
    </section>
    ${partGrid}
    <details class="partner-archive" data-journey-section="archive"><summary>相棒との記録</summary>
    <div class="archive-links"><button type="button" class="text-button" data-action="companion-talk">相棒と話す</button>
    <button type="button" class="text-button" data-action="weekly-digest">今週の記録</button></div>
    <section class="week-card" aria-labelledby="week-title"><div class="section-heading"><div><h2 id="week-title" tabindex="-1">今週のペース</h2><p>${shortDate(week.start)} — ${shortDate(week.end)}</p></div><button class="text-button" data-action="weekly-goal">${week.goal ? '目標を変更' : '目標を決める'}</button></div>
      <div class="week-summary"><strong>${week.trainedDays}<small>${week.goal ? ` / ${week.goal}日` : ' 日の筋トレ'}</small></strong><span>${week.goal && week.trainedDays >= week.goal ? '今週の目標、達成！' : week.goal ? '自分で決めたペースで。' : '目標は、決めなくても大丈夫。'}</span></div>
      <div class="week-days">${week.days.map((d, i) => `<div class="week-day ${d.trained ? 'is-trained' : d.rest ? 'is-rest' : ''} ${d.today ? 'is-today' : ''} ${d.future ? 'is-future' : ''}" aria-label="${fullDate(d.date)} ${d.trained ? `筋トレ${d.sets}セット` : d.rest ? '休養' : d.future ? 'これから' : '記録なし'}${d.trained && d.rest ? '・休養も記録' : ''}"><span>${['月','火','水','木','金','土','日'][i]}</span><b>${d.trained ? icon('check') : d.rest ? icon('moon') : Number(d.date.slice(8))}</b>${d.today ? '<small>今日</small>' : '<small></small>'}</div>`).join('')}</div>
      <div class="week-legend"><span>${icon('check')}筋トレ</span><span>${icon('moon')}休養</span><span>空白の日も、積み重ねは残ります。</span></div>
      ${week.sets ? `<details class="weekly-details" data-journey-section="week"><summary>今週の${week.sets}セットを振り返る</summary><div class="part-bars">${week.parts.map(p => `<div class="part-bar"><span>${p.name}</span><div><i style="width:${p.sets / max * 100}%"></i></div><b>${p.sets}</b></div>`).join('')}</div><p>関連する部位ごとのセット数。1種目が複数の部位に含まれます。</p></details>` : '<p class="week-empty">記録した筋トレや休養日が、ここに並びます。</p>'}
      ${digest ? weeklyDigestEntry(digest) : ''}
    </section>
    ${exerciseHistoryEntry(trainingDays, state)}
    ${storySection(storyOf(state, date))}
    ${milestoneSection(state, milestonesOf(state, date), notebookPages(trainingDays, state))}
    ${collectionSection(state.collection)}
    <details class="memories-section album-shelf" data-journey-section="memories"><summary><h2>相棒との思い出<small>${journey.memories.length ? `${journey.memories.length}枚 · ${esc(journey.memories[0].title)}` : '最初の記録でアルバムが始まります'}${journey.nextMilestone ? ` · 次の節目は累計${journey.nextMilestone}日` : ''}</small></h2></summary>
      ${journey.memories.length ? `<div class="memory-list">${journey.memories.slice(0, memoryLimit).map((m, i) => `<article class="memory-card ${m.first ? 'first-memory' : ''}"><div class="memory-symbol">${icon(m.first ? 'sprout' : m.milestone ? 'star' : 'dumbbell')}</div><div class="memory-body"><time datetime="${m.date}">${fullDate(m.date)}</time><h3>${esc(m.title)}</h3><p>${esc(m.detail)}</p>${m.changes.length ? `<div class="memory-parts">${m.changes.map(p => `<span>${p.name} <b>Lv.${p.level}</b></span>`).join('')}</div>` : ''}${m.first && m.changes.length ? '<small class="memory-note">最初の記録で、体形にも変化が生まれました。</small>' : ''}</div><span class="memory-number">${String(journey.memories.length - i).padStart(2, '0')}</span></article>`).join('')}</div>${journey.memories.length > memoryLimit ? `<button class="button button-light memory-more" data-action="more-memories">さらに思い出を見る（残り${journey.memories.length - memoryLimit}枚）</button>` : ''}<p class="memory-disclaimer">思い出は今ある記録から作られます。編集や削除をすると、日付や内容も変わります。</p>` : `<div class="memory-empty">${icon('sprout')}<h3>まだ、まっさらなアルバム。</h3><p>最初の記録、育った部位、積み重ねた日数。<br>ひとつずつ、ふたりの思い出になります。</p><button class="button button-primary" data-action="tab" data-id="workout">筋トレを記録する ${icon('arrow')}</button></div>`}
    </details></details>`;
}
