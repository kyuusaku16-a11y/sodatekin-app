import { calorieComparison } from './calorie-view.js';
import { FOODS, NUTRIENTS, PORTIONS, mealNutrition, nutrientText, portionLabel } from './foods.js';
import { DISH_GROUPS, homeOf, outOf } from './food-catalog.js';
import { icon } from './character.js';
import { MEAL_SLOTS, mealSlotLabel, alreadyLoggedPortions } from './meal-diary.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const aliases = {
  'white-rice': '白飯 ご飯 はくまい ライス', 'brown-rice': '玄米 ご飯 げんまい',
  egg: 'たまご 玉子 生卵', 'boiled-egg': 'ゆでたまご たまご 玉子', natto: 'なっとう',
  bread: 'しょくぱん', chicken: '鶏肉 とり肉', 'grilled-chicken': '鶏胸肉 とりむね',
  milk: 'ぎゅうにゅう ミルク', 'soy-milk': 'とうにゅう', 'firm-tofu': 'とうふ', 'silken-tofu': 'とうふ',
  pasta: 'パスタ', salmon: 'さけ しゃけ サーモン', mackerel: '鯖', spinach: 'ほうれんそう',
  'mext-18002': '餃子 ギョウザ ギョーザ', 'mext-17050': '味噌汁 みそしる',
  'mext-12021': 'めだまやき 目玉焼', 'mext-10468': '海老 エビ',
};
const originalGroups = {
  'ごはん・麺・パン': 'rice white-rice brown-rice bread oats udon soba pasta cereal',
  '主菜・おかず': 'chicken natto egg firm-tofu silken-tofu boiled-egg grilled-chicken salmon mackerel tuna ham mext-11186 mext-10468 mext-18002 mext-12021',
  '副菜・汁物': 'edamame broccoli cabbage tomato spinach potato sweet-potato mext-02067 mext-04002 mext-06176 mext-06055 mext-06312 mext-06049 mext-06065 mext-06135 mext-06215 mext-06008 mext-06150 mext-06153 mext-06245 mext-06011 mext-08039 mext-08001 mext-08031 mext-17050 mext-18005',
  '果物・おやつ': 'banana apple kiwi almond mext-15116 mext-15098 mext-01136 mext-15086 mext-13043 mext-05005 mext-05014 mext-07006 mext-07012 mext-07124 mext-07146 mext-07132 mext-07097 mext-07178 mext-07077',
  '乳製品・飲み物': 'protein yogurt soy-milk milk cheese mext-16045 mext-16037',
};
const groupsById = new Map();
for (const [group, ids] of Object.entries(originalGroups)) {
  for (const id of ids.split(' ')) groupsById.set(id, group);
}
const dishIds = new Set();
for (const [group, dishes] of Object.entries(DISH_GROUPS)) {
  for (const dish of dishes) {
    const id = dish[0], keywords = dish[7];
    groupsById.set(id, group);
    dishIds.add(id);
    if (keywords) aliases[id] = keywords;
  }
}
const presetNames = new Map(FOODS.map(f => [f.id, f.name]));
const firstSuggestions = ['white-rice', 'mext-18054', 'dish-beef-curry-rice', 'dish-gyudon', 'dish-tofu-miso-soup', 'protein']
  .flatMap(id => outOf(id) ? [outOf(id), id] : [id]);
export const customGroup = '自分の食品';
export function foodGroup(food) {
  return presetNames.get(food.id) === food.name ? groupsById.get(food.id) || customGroup : customGroup;
}
export function foodFilters(foods, active) {
  const groups = ['', ...Object.keys(DISH_GROUPS)];
  if (active === customGroup || foods.some(f => foodGroup(f) === customGroup)) groups.push(customGroup);
  return `<select id="food-category" aria-label="料理の種類で絞り込む" aria-controls="food-results">${groups.map(group =>
    `<option value="${esc(group)}"${group === active ? ' selected' : ''}>${esc(group || 'すべての種類')}</option>`).join('')}</select>`;
}
// 旧データでは外食版が末尾に追加される。両方が候補なら家庭版の位置でまとめる。
function pairedFoodOrder(foods) {
  const presets = new Map(foods.filter(f => presetNames.get(f.id) === f.name).map(f => [f.id, f]));
  return foods.flatMap(food => {
    if (!presets.has(food.id)) return [food];
    if (presets.has(homeOf(food.id))) return [];
    const outside = presets.get(outOf(food.id));
    return outside ? [outside, food] : [food];
  });
}
export function groupedFoodOptions(foods) {
  const options = new Map([...Object.keys(DISH_GROUPS), customGroup].map(group => [group, []]));
  const indices = new Map(foods.map((f, i) => [f.id, i]));
  pairedFoodOrder(foods).forEach(food => options.get(foodGroup(food)).push(`<option value="${indices.get(food.id)}">${esc(food.name)}</option>`));
  return [...options].filter(([, rows]) => rows.length).map(([group, rows]) => `<optgroup label="${group}">${rows.join('')}</optgroup>`).join('');
}
const normalize = text => text.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 96));
export function foodMatches(food, query) {
  if (!query.trim()) return true;
  const names = [food.name, presetNames.get(food.id) === food.name ? aliases[food.id] || '' : ''];
  return normalize(query).trim().split(/\s+/).every(word => names.some(name => normalize(name).includes(word)));
}

export function nutritionGrid(nutrition, nutrients = NUTRIENTS) {
  return '<dl class="nutrient-grid">' + nutrients.map(({ key, label }) => {
    const entry = nutrition[key];
    return `<div><dt>${label}</dt><dd>${nutrientText(entry, key)}</dd></div>`;
  }).join('') + '</dl>';
}

export function dailyNutrition(nutrition, mealCount, target) {
  if (target === null) return mealCount ? nutritionGrid(nutrition) : '';
  const comparison = `<div class="calorie-total">${calorieComparison(nutrition.kcal, target)}</div>`;
  return comparison + (mealCount ? nutritionGrid(nutrition, NUTRIENTS.filter(({ key }) => key !== 'kcal')) : '');
}

export function mealSlotField(selected, allowUnassigned = false) {
  const options = Object.entries(MEAL_SLOTS);
  if (allowUnassigned) options.push(['', '未分類']);
  return `<label class="field meal-choice">食事区分<select name="mealSlot">${options.map(([key, label]) =>
    `<option value="${key}"${key === (selected || '') ? ' selected' : ''}>${label}</option>`).join('')}</select></label>`;
}

export function mealEntryCard({ meals, selected, finder, previous, previousDateLabel, canReuse, button }) {
  const slots = Object.entries(MEAL_SLOTS).map(([key, label]) => {
    const count = meals.filter(meal => meal.mealSlot === key).length;
    return `<button type="button" data-action="meal-slot" data-id="${key}" aria-pressed="${selected === key}"><strong>${label}</strong><small>${count ? count + '品' : '記録なし'}</small></button>`;
  });
  const items = meals.filter(meal => meal.mealSlot === selected);
  const names = items.slice(0, 2).map(meal => meal.name).join('・') + (items.length > 2 ? ` ほか${items.length - 2}品` : '');
  let repeat = '';
  if (previous) {
    const descriptions = previous.meals.map(m => esc(m.name) + ' ' + esc(portionLabel(m.amount, m.portions)));
    const count = descriptions.length;
    const kcal = mealNutrition(previous.meals).kcal;
    repeat = `<section class="meal-repeat"><div class="routine-heading"><h3>${previousDateLabel}の${mealSlotLabel(selected)}</h3>
      <small>${kcal.value === null ? 'カロリー未入力' : nutrientText(kcal, 'kcal')}</small></div>
      <p>${descriptions.slice(0, 3).join('・')}</p>
      ${count > 3 ? `<details><summary>ほか${count - 3}品の内訳</summary><p>${descriptions.slice(3).join('・')}</p></details>` : ''}
      <div class="food-buttons">${button('repeat-meal', `同じ${count}品を記録`, { id: previous.date, class: 'button button-primary' })}
      ${button('meal-reuse', '量・食品を変更', { class: 'button button-light' })}</div></section>`;
  }
  return `<section class="meal-entry"><div class="meal-slots" role="group" aria-label="記録する食事">${slots.join('')}</div>
    <div class="meal-entry-body"><div class="meal-entry-heading"><h2>今日の${mealSlotLabel(selected)}</h2>
    ${button('meal-photo', '写真から記録 <small class="photo-trial">試験中</small>', { class: 'button button-light', icon: 'camera' })}</div>${finder}
    ${items.length ? button('meal-log', esc(names) + ' ›', { id: selected, class: 'text-button meal-log-link', label: mealSlotLabel(selected) + 'の内訳を見る ' + names }) + nutritionGrid(mealNutrition(items)) : ''}
    ${repeat}${canReuse ? button(previous ? 'pick-meal-history' : 'meal-reuse', previous ? '別の履歴から選ぶ' : '履歴から使う', { class: 'text-button meal-history-link' }) : ''}</div></section>`;
}

export function mountMealReuse(form, groups, slot, onSave, destinationMeals = []) {
  const source = form.elements.source;
  source.innerHTML = groups.map((group, i) =>
    `<option value="${i}">${group.date}　${mealSlotLabel(group.slot)}（${group.meals.length}品）</option>`).join('');
  source.selectedIndex = Math.max(0, groups.findIndex(group => group.slot === slot));
  const rows = form.querySelector('[data-reuse-rows]');
  const selectedItems = () => Array.from(rows.querySelectorAll('input:checked'), input => ({
    food: groups[source.selectedIndex].meals[Number(input.value)],
    portions: Number(input.closest('.set-choice').querySelector('select').value),
  }));
  function updateRows() {
    const group = groups[source.selectedIndex];
    const logged = alreadyLoggedPortions(group.meals, destinationMeals);
    rows.innerHTML = group.meals.map((meal, i) => {
      const checked = group.slot && !logged[i];
      return `<div class="set-choice"><label class="checkbox-field"><input type="checkbox" value="${i}" ${checked ? 'checked' : ''}><span>${esc(meal.name)}${logged[i] ? '<small class="meal-already-logged">同じ量を記録済み</small>' : ''}</span></label>
        <select aria-label="${esc(meal.name)}の量" ${checked ? '' : 'disabled'}>${portionOptions(meal.amount, meal.portions ?? 1)}</select></div>`;
    }).join('');
  }
  function updateTotals() {
    const items = selectedItems();
    form.querySelector('[data-reuse-preview]').innerHTML = nutritionGrid(mealNutrition(items.map(({ food, portions }) => ({ ...food, portions }))));
    form.querySelector('[type="submit"]').disabled = !items.length;
  }
  form.addEventListener('change', ({ target }) => {
    if (target === source) updateRows();
    if (target.type === 'checkbox') target.closest('.set-choice').querySelector('select').disabled = !target.checked;
    updateTotals();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    event.stopPropagation();
    const items = selectedItems();
    if (items.length) onSave(items);
  });
  updateRows();
  updateTotals();
}

export function foodResults(foods, meals, query, expanded, button, group = '') {
  const allMatches = foods.filter(f => foodMatches(f, query));
  let matches = group ? allMatches.filter(f => foodGroup(f) === group) : allMatches;
  let notice = '';
  if (!matches.length && group && query.trim() && allMatches.length) {
    matches = allMatches;
    notice = `<p class="finder-count" role="status">「${esc(group)}」に該当なし。ほかの種類に${matches.length}件あります。</p>`;
  }
  if (!matches.length) {
    const name = query.trim().slice(0, 60);
    const message = group ? 'この種類には一致する項目がありません。' : '料理・定番に一致する項目がありません。';
    return `<p class="gentle-empty">${message}</p>` + button('new-food', name ? `「${esc(name)}」を追加` : '料理・食品を追加', { class: 'button button-light custom-food-add', icon: 'plus' });
  }
  matches = pairedFoodOrder(matches);
  if (!query.trim()) {
    const lastUsed = new Map();
    for (const meal of meals) {
      const time = Date.parse(meal.createdAt);
      if (!lastUsed.has(meal.foodId) || time > lastUsed.get(meal.foodId)) lastUsed.set(meal.foodId, time);
    }
    const rank = food => {
      if (group) return dishIds.has(food.id) ? 0 : 1;
      const index = firstSuggestions.indexOf(food.id);
      return index === -1 ? firstSuggestions.length : index;
    };
    matches.sort((a, b) => (lastUsed.get(b.id) ?? Number.MIN_SAFE_INTEGER) - (lastUsed.get(a.id) ?? Number.MIN_SAFE_INTEGER) || rank(a) - rank(b));
  }
  const visible = expanded ? matches : matches.slice(0, query.trim() || group ? 15 : firstSuggestions.length);
  const rows = visible.map(f => `<div class="food-result">
    <div class="food-result-name"><strong>${esc(f.name)}</strong><small>${presetNames.get(f.id) === f.name && outOf(f.id) ? '<span class="food-home-tag">家庭の量</span> ' : ''}${esc(f.amount)} · ${nutrientText({ value: f.kcal ?? null }, 'kcal')}</small></div>
    <div class="food-buttons">${button('portion-food', '量を変更', { id: f.id, class: 'text-button', label: f.name + 'の量を変えて記録' })}${button('quick-food', icon('plus') + '記録', { id: f.id, class: 'button button-light', label: f.name + 'を記録' })}</div>
  </div>`).join('');
  const more = matches.length > visible.length ? button('expand-foods', `全${matches.length}件を見る`, { class: 'text-button' }) : expanded ? button('expand-foods', '表示を少なくする', { class: 'text-button' }) : '';
  return notice + rows + more;
}

function portionOptions(amount, selected, allowSkip = false) {
  const quantities = allowSkip ? [0, ...PORTIONS] : PORTIONS;
  return quantities.map(q => `<option value="${q}"${q === selected ? ' selected' : ''}>${q ? esc(portionLabel(amount, q)) : '今回は含めない'}</option>`).join('');
}

export function portionField(food, index = 0, selected = 1, allowSkip = false) {
  return `<label class="portion-field"><span>${esc(food.name)}</span><select name="portions" data-index="${index}">${portionOptions(food.amount, selected, allowSkip)}</select></label>`;
}

export function foodSetRows(foods, set) {
  return foods.map((f, index) => {
    const pos = set?.foodIds.indexOf(f.id) ?? -1;
    return `<div class="set-choice" data-index="${index}"><label class="checkbox-field"><input type="checkbox" name="food" value="${esc(f.id)}"${pos >= 0 ? ' checked' : ''}>${esc(f.name)}</label><select aria-label="${esc(f.name)}の定番の量" ${pos < 0 ? 'hidden disabled' : ''}>${portionOptions(f.amount, set?.portions?.[pos] ?? 1)}</select></div>`;
  }).join('');
}

export function nutritionFields(value) {
  return `<div class="food-nutrition-fields">${NUTRIENTS.map(({ key, label, unit }) => `<label class="field">${label}（${unit}）<input type="number" name="${key}" inputmode="decimal" min="0" max="${key === 'kcal' ? 10000 : 1000}" step="any" value="${esc(value[key])}" placeholder="未入力"></label>`).join('')}</div>`;
}

export function foodFormValues(data) {
  const values = { name: data.get('name').trim(), amount: data.get('amount').trim() };
  for (const { key } of NUTRIENTS) values[key] = data.get(key) === '' ? null : Number(data.get(key));
  return values;
}

export function portionPreview(foods, selects) {
  return nutritionGrid(mealNutrition(foods.map((food, i) => ({ ...food, portions: Number(selects[i].value) })).filter(f => f.portions > 0)));
}
