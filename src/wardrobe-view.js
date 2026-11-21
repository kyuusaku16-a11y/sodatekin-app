import { characterSVG } from './character.js';
import { wardrobeOf, wardrobeProgress, outfitFor } from './wardrobe.js';

const GARMENTS = { 'relaxed-tee': 'ゆったりTシャツ', tee: '半袖Tシャツ', tank: 'タンクトップ', none: 'トップスなし' };
const ITEMS = [{ id: 'towel', name: '首のタオル', days: 7 }, { id: 'wristbands', name: 'リストバンド', days: 30 }];
const COLORS = [{ id: 'sand', name: 'サンド', days: 0 }, { id: 'navy', name: 'ネイビー', days: 100 }];
const itemIcon = id => `<svg viewBox="0 0 40 40" aria-hidden="true">${id === 'towel' ? '<path d="M13 8q7-6 14 0l4 25H21l-1-17-1 17H9Z" fill="var(--swatch-sand)" stroke="var(--accent-ink)" stroke-width="1.5"/><path d="M11 28h7m5 0h6M14 8q6 8 12 0" fill="none" stroke="var(--accent)" stroke-width="2"/>' : '<rect x="6" y="10" width="12" height="22" rx="4" fill="var(--accent)" stroke="var(--accent-ink)" stroke-width="1.5"/><rect x="22" y="10" width="12" height="22" rx="4" fill="var(--accent)" stroke="var(--accent-ink)" stroke-width="1.5"/><path d="M7 16h10m6 0h10M7 26h10m6 0h10" stroke="var(--text)" stroke-width="2"/>'}</svg>`;

export function wardrobeEntry(bodyType) {
  if (bodyType === 'studio') return '<button type="button" class="wardrobe-entry" data-action="wardrobe"><span><strong>相棒のウェア</strong><small>スタジオの専用ウェアを見る</small></span><span aria-hidden="true">→</span></button>';
  return '<button type="button" class="wardrobe-entry" data-action="wardrobe"><span><strong>相棒の着替え</strong><small>7日でタオル · 30日でリストバンド · 100日で新色</small></span><span aria-hidden="true">→</span></button>';
}

export function wardrobeContent(state, parts, { back = false } = {}) {
  if (state.settings.bodyType === 'studio') {
    return `<figure class="wardrobe-preview"><div class="wardrobe-character">${characterSVG(parts, { bodyType: 'studio', back })}</div><figcaption>スタジオの専用ウェア</figcaption><button type="button" class="text-button" data-action="wardrobe-turn">${back ? '正面へ' : '後ろ姿を見る'}</button></figure><p class="wardrobe-note">黒の短丈タンクトップとショートスパッツ。ほかの相棒のウェアは「姿を選ぶ」で相棒を切り替えて試せます。</p>`;
  }
  const choices = wardrobeOf(state.settings);
  const progress = wardrobeProgress(state);
  const outfit = outfitFor(state, parts);
  const waiting = choices.accessories.some(id => !progress.unlocked[id]) || (choices.color === 'navy' && !progress.unlocked.navy);
  return `<div class="wardrobe-layout"><figure class="wardrobe-preview"><div class="wardrobe-character">${characterSVG(parts, { bodyType: state.settings.bodyType, back, expression: 'normal', outfit })}</div><figcaption>${GARMENTS[outfit.garment]} · ${back ? '後ろ姿' : '正面'}</figcaption><button type="button" class="text-button" data-action="wardrobe-turn">${back ? '正面へ' : '後ろ姿を見る'}</button></figure><div class="wardrobe-controls"><section aria-labelledby="wardrobe-wear-title"><h3 id="wardrobe-wear-title">ウェア</h3><div class="wardrobe-wear" role="group" aria-label="ウェアの表示"><button type="button" data-action="wardrobe-wear" data-id="growth" aria-pressed="${choices.wear === 'growth'}">成長に合わせる</button><button type="button" data-action="wardrobe-wear" data-id="none" aria-pressed="${choices.wear === 'none'}">トップスなし</button></div><p class="wardrobe-help">Tシャツからタンクトップへ、体形の成長に合わせて変わります。</p></section><section aria-labelledby="wardrobe-colors-title"><h3 id="wardrobe-colors-title">ウェアの色</h3><div class="wardrobe-colors" role="group" aria-label="ウェアの色">${COLORS.map(color => {
    const selected = choices.color === color.id, unlocked = !color.days || progress.unlocked.navy;
    return `<button type="button" data-action="wardrobe-color" data-id="${color.id}" aria-pressed="${selected}" ${!unlocked ? 'disabled' : ''}><span class="wardrobe-swatch wardrobe-swatch--${color.id}" aria-hidden="true"></span><strong>${color.name}</strong><small>${!unlocked ? `累計${color.days}日で届く` : selected ? choices.wear === 'none' ? '次に着る色' : '選択中' : '選ぶ'}</small></button>`;
  }).join('')}</div></section><section aria-labelledby="wardrobe-items-title"><h3 id="wardrobe-items-title">小物</h3><div class="wardrobe-items">${ITEMS.map(item => {
    const selected = choices.accessories.includes(item.id), unlocked = progress.unlocked[item.id];
    return `<button type="button" class="wardrobe-item" data-action="wardrobe-item" data-id="${item.id}" aria-pressed="${selected}" ${!unlocked && !selected ? 'disabled' : ''}>${itemIcon(item.id)}<span><strong>${item.name}</strong><small>${!unlocked ? selected ? '選択を保留中 · 外せます' : `累計${item.days}日で届く` : selected ? '着用中 · 外す' : '身に着ける'}</small></span><b aria-hidden="true">${selected ? '✓' : '＋'}</b></button>`;
  }).join('')}</div></section>${waiting ? '<p class="wardrobe-pending" role="status">記録の訂正で日数が変わったため、一部の装いを保留しています。選択は残り、必要な日数に戻ると再び身に着けます。</p>' : ''}</div></div><p class="wardrobe-note">一緒に続けた日、累計${progress.days}日。連続でなくて大丈夫。小物と新色は体重・食事・筋トレを記録した日数で届きます。休養だけの日や同日の追加では日数は増えません。着替えはXP・体形を変えず、成長比較はウェアと小物を外して表示します。</p><button type="button" class="text-button wardrobe-return" data-action="wardrobe-return">戻る</button>`;
}
