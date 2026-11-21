import { calorieSuggestion, effectiveTarget, roundedBmr } from './calorie-target.js';
import { PROFILE_FIELDS, profileFromForm } from './profile.js';

// 保存済みの値と検証済みの入力だけを表示する。
const num = new Intl.NumberFormat('ja-JP').format;
const withWeight = (profile, latestKg) => ({ ...profile, weightKg: latestKg ?? profile.weightKg });

export function calorieComparison({ value, missing }, target) {
  const kcal = value === null ? null : Math.round(value);
  const total = kcal === null ? '未入力' : num(kcal);
  let difference = '';
  if (kcal !== null) {
    difference = kcal <= target ? `あと ${num(target - kcal)}` : `目安を ${num(kcal - target)} kcal 超えました`;
  }
  const qualifier = kcal !== null && missing ? '（入力分）' : '';
  return `<strong>${total}${qualifier} / ${num(target)} kcal</strong> ${difference ? `<span>${difference}</span>` : ''}`;
}

export function profileField(field, profile) {
  const value = profile[field.key];
  if (field.options) {
    const options = Object.entries(field.options).map(([key, label]) =>
      `<option value="${key}"${key === value ? ' selected' : ''}>${label}</option>`).join('');
    return `<label class="field">${field.label}<select name="${field.key}"><option value="">未入力</option>${options}</select></label>`;
  }
  const hint = field.key === 'calorieTarget' ? '空欄で自動' : '未入力';
  const range = field.integer ? `${field.min}〜${field.max}の整数` : '';
  const help = field.key === 'calorieTarget' ? `${range}。空欄で自動。` : range;
  return `<label class="field">${field.label}（${field.unit}）<input type="text" inputmode="${field.integer ? 'numeric' : 'decimal'}" name="${field.key}" value="${value ?? ''}" placeholder="${hint}" maxlength="12" autocomplete="off">${help ? `<small>${help}</small>` : ''}</label>`;
}

export function calorieSetupFields(profile, latestKg) {
  const result = calorieSuggestion(withWeight(profile, latestKg));
  if (result.ok) return '';
  return PROFILE_FIELDS.filter(({ key }) => result.missing.includes(key)).map(field => profileField(field, profile)).join('');
}

export function profileDraft(profile, data) {
  return profileFromForm(new Map([...Object.entries(profile), ...data]));
}

export function caloriePreview(profile, latestKg) {
  const inputs = withWeight(profile, latestKg);
  const result = calorieSuggestion(inputs);
  const values = result.ok ? `<dl class="calorie-estimates">
    <div><dt>基礎代謝</dt><dd>${num(result.bmr)} kcal</dd></div>
    <div><dt>消費の目安</dt><dd>${num(result.tdee)} kcal</dd></div>
    <div><dt>提案する目安</dt><dd>${num(result.target)} kcal</dd></div></dl>` : '';
  const warning = effectiveTarget(profile, latestKg).belowBmr
    ? `<p>基礎代謝（${num(roundedBmr(inputs))}kcal）より低い目安です。無理のない範囲で。</p>` : '';
  return values + warning;
}
