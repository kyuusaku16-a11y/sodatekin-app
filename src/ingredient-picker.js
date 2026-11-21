import { findIngredients, weighedIngredient } from './ingredients.js';
import { mealNutrition } from './foods.js';
import { nutritionGrid } from './food-view.js';
import { id } from './model.js';

// The same picker can add a weighed ingredient to a meal, a photo draft or a set.
export function mountIngredientPicker(host, { query = '', label, foods, onPick, onCreate }) {
  host.classList.add('ingredient-picker');
  host.innerHTML = `<label class="field">食材を検索<input type="search" data-query placeholder="例：鶏もも肉、なす、玉ねぎ"></label>
    <p data-count class="field-help" role="status"></p>
    ${onCreate ? '<button type="button" class="text-button" data-new-ingredient hidden></button>' : ''}
    <label class="field">食材・調理状態<select data-choice></select></label>
    <button type="button" class="text-button" data-more>次の候補を表示</button>
    <label class="field">食べた重さ（g）<input type="text" data-grams inputmode="decimal" placeholder="例：85"></label>
    <div data-preview aria-live="polite"></div><button type="button" class="button button-primary" data-add></button>`;
  const search = host.querySelector('[data-query]'), choice = host.querySelector('select');
  const grams = host.querySelector('[data-grams]'), add = host.querySelector('[data-add]');
  const more = host.querySelector('[data-more]');
  const create = host.querySelector('[data-new-ingredient]');
  search.value = query;
  add.textContent = label;
  let limit = 30, matches = [];
  function selected() {
    const weight = Number(grams.value.trim().normalize('NFKC'));
    return weighedIngredient(matches[choice.selectedIndex - 1], weight);
  }
  function preview() {
    const food = selected();
    const invalidWeight = choice.value && grams.value.trim() && !food;
    grams.setAttribute('aria-invalid', String(Boolean(invalidWeight)));
    host.querySelector('[data-preview]').innerHTML = food ? nutritionGrid(mealNutrition([food])) : invalidWeight ? '重さは0.1〜1,000gを0.1g単位で入力してください。栄養値が上限を超える場合は基準量も確認してください。' : '';
    add.disabled = !food;
  }
  function list() {
    const previous = choice.value;
    choice.replaceChildren(new Option('食材を選ぶ', ''));
    for (const row of matches.slice(0, limit)) choice.add(new Option(row[1], row[0]));
    if ([...choice.options].some(opt => opt.value === previous)) choice.value = previous;
    more.hidden = matches.length <= limit;
    host.querySelector('[data-count]').textContent = matches.length ? `${matches.length}件中 ${Math.min(matches.length, limit)}件を表示` : '一致する食材がありません。別の名前で探せます。';
    if (create) {
      create.hidden = matches.length > 0;
      create.textContent = `「${search.value.trim().slice(0, 60)}」を自分の食品に追加`;
    }
    preview();
  }
  function searchItems() { limit = 30; matches = findIngredients(search.value, foods); list(); }
  create?.addEventListener('click', () => onCreate(search.value));
  search.addEventListener('input', searchItems);
  more.addEventListener('click', () => { limit += 30; list(); choice.focus(); });
  choice.addEventListener('change', preview);
  grams.addEventListener('input', preview);
  host.addEventListener('keydown', event => {
    if (event.key === 'Enter' && ['search', 'text'].includes(event.target.type) && !event.isComposing) event.preventDefault();
  });
  add.addEventListener('click', () => {
    const food = selected();
    const existing = food && foods.find(item => item.id === food.id);
    if (food && (food.id.length > 100 || (existing && Object.keys(food).some(key => existing[key] !== food[key])))) food.id = id();
    if (food && onPick(food) !== false) { choice.selectedIndex = 0; grams.value = ''; preview(); }
  });
  searchItems();
}
