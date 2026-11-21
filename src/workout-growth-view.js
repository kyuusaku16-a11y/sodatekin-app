import { characterMarkup } from './character-renderer.js';
import { partShape, portraitCoordinates } from './character-mesh.js';

import { studioGrowthHighlight } from './studio-character.js';

const number = value => value.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
// Top, bottom and inner/outer mesh columns on one side of the existing portrait.
const regions = {
  chest: [177, 213, .12, 1.94], back: [177, 249, .12, 1.94],
  shoulders: [174, 205, 4.02, 5.92], arms: [209, 275, 4.12, 5.88],
  abs: [220, 273, .12, 1.70], glutes: [288, 341, .16, 1.88],
  thighs: [348, 397, 1.08, 1.94], calves: [412, 471, 1.08, 1.94],
};
const rearOnly = id => id === 'back' || id === 'glutes';
const frontOnly = id => id === 'chest' || id === 'abs';

function highlight(at, row, back) {
  if (back ? frontOnly(row.id) : rearOnly(row.id)) return '';
  const [top, bottom, inner, outer] = regions[row.id];
  const path = [-1, 1].map(side => {
    const pt = (height, width) => {
      const point = at(top + (bottom - top) * height, side, inner + (outer - inner) * width);
      return `${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    };
    return `M${pt(.05,.45)} Q${pt(0,1)} ${pt(.22,1)} Q${pt(.68,1)} ${pt(.89,.62)} Q${pt(1,.18)} ${pt(.9,.04)} Q${pt(.44,0)} ${pt(.17,.05)} Q${pt(.09,.08)} ${pt(.05,.45)}Z`;
  }).join(' ');
  return `<path class="growth-muscle ${row.primary ? 'is-primary' : 'is-secondary'}" data-muscle="${row.id}" d="${path}"/>`;
}

function levelChange({ before, after }, confirmed) {
  return after.level > before.level ? `<strong class="growth-level-up">Lv.${after.level}${confirmed ? '到達' : 'へ'}</strong>` : '';
}

function primaryStat(row, confirmed) {
  const { name, before, gain } = row;
  const end = Math.min(before.progress + gain, before.nextXP);
  const progress = gain ? `${number(before.progress)} → ${number(end)}` : number(before.progress);
  return `<div class="growth-stat" data-part="${row.id}">
    <div class="growth-stat-title"><strong>${name}</strong><b>+${number(gain)}<small> XP</small></b></div>
    <div class="growth-scale"><span>Lv.${before.level} ${levelChange(row, confirmed)}</span><span>${progress} / ${number(before.nextXP)}</span></div>
    <div class="growth-track" aria-hidden="true"><i style="width:${100 * end / before.nextXP}%;--growth-start:${100 * before.progress / before.nextXP}%"></i><b style="width:${100 * before.progress / before.nextXP}%"></b></div>
    ${gain === 0 ? '<small class="growth-limit">本日の部位XP上限</small>' : ''}
  </div>`;
}

export function growthContent(rows, confirmed = false) {
  const secondary = rows.filter(row => !row.primary);
  const aux = secondary.map(row => `<span>${row.name} <b>+${number(row.gain)}</b>${levelChange(row, confirmed)}${row.gain === 0 ? '（上限）' : ''}</span>`).join('');
  return `<h3>${confirmed ? '記録したセットの成長' : 'この1セットの成長予告'}</h3>${rows.filter(row => row.primary).map(row => primaryStat(row, confirmed)).join('')}${secondary.length ? `<div class="growth-secondary"><small>補助</small>${aux}</div>` : ''}`;
}

export function growthPreviewView(exercise, rows, parts, { bodyType, outfit, flipped = false } = {}) {
  const defaultBack = exercise.primary.some(rearOnly) || exercise.primary[0] === 'calves';
  const back = flipped ? !defaultBack : defaultBack;
  const mixed = rows.some(row => frontOnly(row.id)) && rows.some(row => rearOnly(row.id));
  const values = Object.fromEntries(Object.entries(parts).map(([id, part]) => [id, partShape(part)]));
  const at = bodyType === 'studio' ? null : portraitCoordinates(values, { bodyType, back });
  const overlay = rows.map(row => at ? highlight(at, row, back) : studioGrowthHighlight(row, back)).join('');
  const upperBody = !rows.some(row => ['glutes', 'thighs', 'calves'].includes(row.id));
  const direction = back ? '後ろ姿' : '正面';
  return `<section class="exercise-growth" data-growth-exercise="${exercise.id}" data-back="${back}" aria-label="この1セットの成長予告">
    <div class="growth-figure"><div class="growth-portrait${upperBody ? ' growth-upper-body' : ''}" aria-hidden="true"><div class="growth-model">${characterMarkup(parts, { bodyType, outfit, back })}<svg class="growth-overlay" viewBox="0 0 400 552" aria-hidden="true">${overlay}</svg></div></div>
    ${mixed ? `<button type="button" class="growth-turn" data-action="growth-turn" data-id="${exercise.id}" aria-label="${back ? '正面' : '後ろ姿'}の対象部位を見る">${direction} ⇄</button>` : `<span class="growth-direction">${direction}</span>`}</div>
    <div class="growth-content">${growthContent(rows)}</div>
  </section>`;
}

export function growthSummaryText(rows) {
  return rows.map(row => `${row.name} +${number(row.gain)} XP${row.gain === 0 ? '（上限）' : row.after.level > row.before.level ? `（Lv.${row.after.level}へ）` : ''}`).join('　');
}
