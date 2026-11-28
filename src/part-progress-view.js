import { characterSVG } from './character.js';
import { partProgress } from './part-progress.js';

const number = value => new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(value);
const shortDate = date => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
const percent = value => `${Math.round(value * 1000000) / 10000}%`;

/** The host inserts this in the part modal, loads part-progress.css, and calls paintCharacters(). */
export function partProgressView(state, partId, options = {}) {
  const progress = partProgress(state, partId, options);
  const { part, crop, recent } = progress;
  const current = progress.current.parts[partId];
  const style = `--part-crop-ratio:${crop.width}/${crop.height};--part-image-width:${percent(400 / crop.width)};--part-image-height:${percent(552 / crop.height)};--part-image-left:${percent(-crop.x / crop.width)};--part-image-top:${percent(-crop.y / crop.height)}`;
  const character = parts => characterSVG(parts, { bodyType: state.settings.bodyType, back: crop.back, expression: 'normal', active: [] });
  return `<details class="part-progress-comparison" data-part-progress="${partId}"><summary>この部位を大きく見比べる</summary>
    <p class="part-progress-direction">${crop.area}を${crop.back ? '後ろ姿' : '正面'}から。同じ姿勢・倍率で拡大しています。</p>
    <p class="part-progress-fallback" role="status">簡易表示：このブラウザでは部位ごとの変化を表示できません。記録に基づくXPは表示しています。</p>
    <p class="part-progress-error" role="status">相棒を表示できませんでした。再読み込みしてください。</p>
    <div class="part-progress-pair" style="${style}" aria-label="${part.name}のはじめと現在を比較">
      <figure><figcaption>はじめ<small>0 XP · Lv.1</small></figcaption><div class="part-progress-crop">${character(progress.before.parts)}</div></figure>
      <figure><figcaption>いま<small>${number(current.xp)} XP · Lv.${number(current.level)}</small></figcaption><div class="part-progress-crop">${character(progress.current.parts)}</div></figure>
    </div>
    <p class="part-progress-loading">相棒を読み込み中…</p>
    <p class="part-progress-note">いまの姿は、すべての部位の記録を反映しています。小さな変化は見分けにくいこともあります。</p>
    <section class="part-progress-recent" aria-label="${part.name}の直近28日の記録"><h4>直近28日 <small>${shortDate(progress.start)}〜${shortDate(progress.through)}</small></h4>${recent.days ? `<p><strong>${recent.days}日</strong> · ${number(recent.sets)}セットの記録 <b>+${number(recent.xp)} XP</b></p>` : '<p>この部位に関係する筋トレ記録はありません。</p>'}<small>主な部位・補助する部位に含まれる種目を、実施日で集計。食事の記録がある日は、食事ボーナスも反映。</small></section>
  </details>`;
}
