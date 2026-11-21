import { calorieComparison } from './calorie-view.js';
import { NUTRIENTS, nutrientText } from './foods.js';

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function heroOverlay(trend, days) {
  let weight = '体重を記録すると、ここに傾向が出ます';
  if (trend.mode === 'average') {
    const difference = trend.diff === 0 ? '先週と同じ' : trend.diff === null ? ''
      : `先週より ${trend.diff < 0 ? '−' : '+'}${Math.abs(trend.diff).toFixed(1)}`;
    weight = `体重 7日平均<strong>${esc(trend.average.toFixed(1))}kg</strong>
      <small>${esc(trend.count)}件${difference ? ` · ${esc(difference)}` : ''}</small>`;
  } else if (trend.mode === 'last') {
    const [, month, day] = trend.last.date.split('-');
    weight = `最後の記録 ${Number(month)}/${Number(day)}<strong>${esc(trend.last.kg.toFixed(1))}kg</strong>`;
  }
  let continued = '最初の記録で、ここから数えます';
  if (days.thisMonth) continued = `今月の続いた日<strong>${esc(days.thisMonth)}日</strong>`;
  else if (days.lastMonth) continued = `今月はこれから<small>先月 ${esc(days.lastMonth)}日</small>`;
  return `<div class="hero-chip weight-trend">${weight}</div><div class="hero-chip continued-days">${continued}</div>`;
}

export function recordButtons({ weightKg, mealCount, workoutCount }) {
  const actions = [
    ['weight-entry', '体重', weightKg === null ? null : `${weightKg}kg`],
    ['tab', '食事', mealCount ? `${mealCount}件` : null],
    ['workout-sheet', '筋トレ', workoutCount ? `${workoutCount}件` : null],
  ];
  return `<div class="record-buttons">${actions.map(([action, name, value]) =>
    `<button type="button" data-action="${action}"${action === 'tab' ? ' data-id="food"' : ''} class="record-button${value ? ' is-recorded' : ''}"><strong>${name}</strong><span>${value ? `<span aria-label="記録済み">✓</span> ${esc(value)}` : '未記録'}</span></button>`
  ).join('')}</div>`;
}

export function calorieCard(nutrition, target) {
  const macros = NUTRIENTS.filter(({ key }) => key !== 'kcal');
  const edit = target === null ? '' : '<button type="button" class="text-button calorie-edit" data-action="calorie-setup">目安を変更</button>';
  return `<section class="calorie-card"><div class="calorie-heading"><h2>今日のカロリー</h2>${edit}</div>
    <div class="calorie-total">${target === null
      ? `<strong>${esc(nutrientText(nutrition.kcal, 'kcal'))}</strong><button type="button" class="text-button" data-action="calorie-setup">目安を出す</button>`
      : calorieComparison(nutrition.kcal, target)}</div>
    <dl>${macros.map(({ key, label }) => `<div><dt>${label}</dt><dd>${esc(nutrientText(nutrition[key], key))}</dd></div>`).join('')}</dl></section>`;
}
