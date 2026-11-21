import { notebookShelf } from './training-notebook-view.js';
import { wardrobeEntry } from './wardrobe-view.js';
import { SCENES } from './cosmetics.js';
import { icon } from './character.js';
import { sceneMode } from './journey-scene.js';

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function backgroundModeOptions(state) {
  const mode = sceneMode(state.settings);
  return `<div class="background-modes" role="group" aria-label="相棒の背景の表示方法"><button type="button" data-action="background-mode" data-id="studio" aria-pressed="${mode === 'studio'}"><strong>スタジオ</strong><span>窓から光が差す練習室</span></button><button type="button" data-action="background-mode" data-id="journey" aria-pressed="${mode === 'journey'}"><strong>旅の景色</strong><span>今いる章と、端末の時刻に合わせる</span></button><button type="button" data-action="background-mode" data-id="souvenir" aria-pressed="${mode === 'souvenir'}"><strong>記念品の背景</strong><span>庭・朝の光・夕暮れから選ぶ</span></button></div>`;
}
export function milestonePeek(milestones) {
  const target = milestones.next?.days ?? milestones.nextMemory;
  const label = milestones.next ? '次の記念品' : '次の思い出';
  return `<button type="button" class="milestone-peek" data-action="milestones">${icon('star')}<span>${target ? `${label} · 累計${target}日` : 'ふたりの記念品'}</span><b>${milestones.days}${target ? ` / ${target}` : ''}日</b>${icon('chevron')}</button>`;
}
export function milestoneContent(state, milestones, pages = []) {
  const nextMemory = !milestones.next && milestones.nextMemory ? `<div class="next-memory"><strong>次は、累計${milestones.nextMemory}日の思い出。</strong><p>あと${milestones.nextMemory - milestones.days}記録日で、あゆみに思い出が増えます。連続でなくて大丈夫。</p><button type="button" class="text-button" data-action="tab" data-id="journey">あゆみを見る →</button></div>` : '';
  return `<p class="milestone-intro">一緒に続けた日、<strong>累計${milestones.days}日</strong>。連続でなくて大丈夫。</p>${nextMemory}${notebookShelf(pages)}${wardrobeEntry(state.settings.bodyType)}<div class="background-choice"><h3>相棒の背景</h3>${backgroundModeOptions(state)}</div><div class="milestone-list">${milestones.rewards.map(r => `<article class="milestone-card ${r.earned ? 'is-earned' : ''}" data-milestone="${r.days}"><div class="milestone-card-heading"><span class="milestone-number">${r.days}<small>日</small></span><div><span class="milestone-date">${r.earned ? `${r.date.replaceAll('-', '/')} の記念` : `あと${r.days - milestones.days}記録日`}</span><h3>${r.title}</h3></div>${r.earned ? icon('check') : ''}</div><p>${r.detail}</p>${r.earned && r.days === 7 ? `<button type="button" class="button button-light" data-action="title-badge" aria-pressed="${milestones.titleVisible}">${milestones.titleVisible ? '称号を外す' : '称号を付ける'}</button>` : ''}${r.earned && r.days === 14 ? `<blockquote class="milestone-conversation">${esc(milestones.conversation)}</blockquote>` : ''}${r.days === 30 ? `<div class="scene-options" aria-label="相棒の背景">${SCENES.map(s => `<button type="button" class="scene-option" data-action="scene" data-id="${s.id}" aria-pressed="${sceneMode(state.settings) === 'souvenir' && milestones.scene === s.id}" ${milestones.days < s.days ? 'disabled' : ''}><span class="scene-swatch scene-${s.id}" aria-hidden="true"></span><span>${s.name}</span></button>`).join('')}</div>${sceneMode(state.settings) === 'souvenir' && milestones.requestedScene !== milestones.scene ? '<p class="field-help">記録の訂正で30日未満になったため、いつもの庭を表示中。30日に戻ると、選んだ背景も戻ります。</p>' : ''}` : ''}</article>`).join('')}</div><p class="milestone-note">記念は今ある体重・食事・筋トレを記録した日から作られます。休養だけの日や同日の追加では日数は増えません。称号・背景・着替えは、XPや体形を変えません。</p>`;
}
export function milestoneSection(state, milestones, pages = []) {
  return `<details class="milestones-section album-shelf" data-journey-section="milestones"><summary><h2>ふたりの記念品<small>着替え・背景${milestones.next ? ` · 次は累計${milestones.next.days}日` : ''}</small></h2></summary>${milestoneContent(state, milestones, pages)}</details>`;
}
