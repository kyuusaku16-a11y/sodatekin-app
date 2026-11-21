import { FOODS, PORTIONS, mealNutrition, portionLabel } from './foods.js';
import { groupedFoodOptions, nutritionGrid } from './food-view.js';
import { mountIngredientPicker } from './ingredient-picker.js';
import { PHOTO_FOODS } from './meal-photo-foods.js';
import { PHOTO_SIZE, initialPhotoRows, photoCatalog } from './meal-photo.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const specificFoods = { '魚': ['salmon','mackerel','tuna'], '汁物': ['mext-17050','mext-18005'], '鶏肉・鴨肉': ['grilled-chicken','chicken'], '麺': ['udon','soba','pasta'], '卵': ['egg','boiled-egg','mext-12021'], '豆腐': ['silken-tofu','firm-tofu'] };

function letterboxedPixels(image) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const scale = PHOTO_SIZE / Math.max(image.naturalWidth, image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  ctx.fillStyle = '#727272'; ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  ctx.drawImage(image, (PHOTO_SIZE - width) / 2, (PHOTO_SIZE - height) / 2, width, height);
  return ctx.getImageData(0, 0, PHOTO_SIZE, PHOTO_SIZE).data;
}

export function mountMealPhoto(host, { foods, dateFields, mealSlotField = '', formActions, onSave }) {
  const catalog = photoCatalog(foods, PHOTO_FOODS);
  let options = groupedFoodOptions(catalog);
  host.innerHTML = `<div class="photo-source"><button type="button" class="button button-primary" data-pick="camera">カメラで撮る</button><button type="button" class="button button-light" data-pick="album">写真を選ぶ</button></div>
    <input hidden type="file" id="meal-camera" accept="image/*" capture="environment"><input hidden type="file" id="meal-album" accept="image/*">
    <p class="field-help">写真はこの端末で解析し、画面を閉じると破棄します。解析用データは約25 MBです。</p>
    <img class="photo-preview" alt="選んだ食事の写真" hidden>
    <p class="photo-status" role="status" aria-live="polite"></p>
    <form id="meal-photo-form" hidden>
      <h3>今回食べたもの</h3><p class="field-help">食品と量を確認してください。個数は写真からの候補、重さやひと皿の量は食品の基準量です。</p>
      <div data-photo-rows></div>
      <label class="field">食品を追加<select data-photo-add><option value="">食品を選ぶ</option><option value="-1">料理名を直接入力</option>${options}</select></label>
      <details class="food-details"><summary>食材をグラムで追加</summary><div data-ingredient-picker></div></details>
      <div data-photo-totals aria-live="polite"></div>
      ${mealSlotField}<details class="food-details"><summary>記録日</summary>${dateFields}</details>
      ${formActions('確認した内容を記録')}
    </form>`;
  const form = host.querySelector('form'), list = host.querySelector('[data-photo-rows]');
  const status = host.querySelector('.photo-status'), preview = host.querySelector('img');
  let rows = [], generation = 0, worker = null, timeout = null, imageUrl = '';
  const ingredientHost = host.querySelector('[data-ingredient-picker]');
  mountIngredientPicker(ingredientHost, { label: '今回の食事に追加', foods: catalog,
    onPick(food) {
      let index = catalog.findIndex(f => f.id === food.id);
      if (index === -1) {
        index = catalog.push(food) - 1;
        options = groupedFoodOptions(catalog);
        form.querySelector('[data-photo-add]').add(new Option(food.name + ' · ' + food.amount, String(index)));
      }
      rows.push({ label: '', name: food.name, index, portions: 1 });
      renderRows(); ingredientHost.closest('details').open = false;
    },
  });
  function releaseWorker() {
    clearTimeout(timeout);
    worker?.terminate();
    worker = null;
  }
  function releaseImage() {
    preview.removeAttribute('src'); preview.hidden = true;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = '';
  }
  function choice(row) {
    return catalog[row.index] || { name: row.name.trim(), amount: '1食分', protein: null, kcal: null, fat: null, carbs: null };
  }
  function refreshTotals() {
    const selected = rows.map(row => ({ ...choice(row), portions: row.portions }));
    host.querySelector('[data-photo-totals]').innerHTML = selected.length ? `<h3>今回の栄養の目安</h3>${nutritionGrid(mealNutrition(selected))}` : '';
    form.querySelector('[type="submit"]').disabled = !selected.length || selected.some(f => !f.name);
  }
  function renderRows() {
    list.innerHTML = rows.map((row,i) => {
      const base = choice(row);
      const closeMatches = (specificFoods[row.label] || []).map(id => catalog.findIndex(f => f.id === id)).filter(n => n >= 0);
      const suggestions = closeMatches.length ? `<optgroup label="種類の候補">${closeMatches.map(n => `<option value="${n}">${escape(catalog[n].name)}</option>`).join('')}</optgroup>` : '';
      return `<fieldset class="photo-item" data-row="${i}"><legend>${row.label ? '写真の候補 · '+escape(row.label) : '追加した食品'}</legend>
        <label class="field">食品<select data-field="food"><option value="-1">料理名で記録（栄養未入力）</option>${suggestions}${options}</select></label>
        ${row.index === -1 ? `<label class="field">料理名<input data-field="name" type="text" maxlength="60" required value="${escape(row.name)}"></label>` : ''}
        <div class="photo-portion"><label class="field">食べた量<select data-field="amount">${PORTIONS.map(q => `<option value="${q}"${q === row.portions ? ' selected' : ''}>${escape(portionLabel(base.amount,q))}</option>`).join('')}</select></label>
        <button type="button" class="text-button" data-remove aria-label="${escape(base.name || 'この食品')}を候補から外す">外す</button></div></fieldset>`;
    }).join('');
    list.querySelectorAll('[data-field=food]').forEach((select,i) => { select.value = String(rows[i].index); });
    refreshTotals();
  }
  function review(message, items = []) {
    generation++;
    releaseWorker();
    rows = initialPhotoRows(items, catalog, FOODS, PHOTO_FOODS);
    status.textContent = message;
    form.hidden = false;
    renderRows();
  }
  async function analyze(file) {
    const active = ++generation;
    releaseWorker(); releaseImage();
    rows = []; form.hidden = true;
    if (file.size > 32 * 1024 * 1024 || (file.type && (!file.type.startsWith('image/') || file.type === 'image/svg+xml'))) {
      review('32 MB以下の食事写真を選んでください。食品を手動でも追加できます。'); return;
    }
    imageUrl = URL.createObjectURL(file);
    const image = new Image(); image.src = imageUrl;
    status.textContent = '写真を読み込み中…';
    try {
      await image.decode();
      if (active !== generation) return;
      preview.src = imageUrl; preview.hidden = false;
      const pixels = letterboxedPixels(image);
      status.textContent = 'この端末で写真を解析中…';
      worker = new Worker(new URL('./meal-photo-worker.js', import.meta.url), { type: 'module' });
      timeout = setTimeout(() => {
        if (active === generation) review('解析に時間がかかっています。写真を選び直すか、食品を追加してください。');
      }, 90000);
      worker.onmessage = ({ data }) => {
        if (active !== generation) return;
        if (data.error) review(data.error);
        else review(data.items.length ? `${data.items.length}種類の候補が見つかりました。` : '食品を判別できませんでした。食品を追加するか、別の写真を選んでください。', data.items);
      };
      worker.onerror = () => {
        if (active === generation) review('解析機能を読み込めませんでした。再度試すか、食品を手動で追加してください。');
      };
      worker.postMessage(pixels, [pixels.buffer]);
    } catch {
      if (active === generation) review('この写真を解析できませんでした。JPEGなどの写真を選び直すか、食品を追加してください。');
    }
  }
  host.addEventListener('click', e => {
    const picker = e.target.closest('[data-pick]');
    if (picker) host.querySelector('#meal-' + picker.dataset.pick).click();
    const remove = e.target.closest('[data-remove]');
    if (remove) {
      const i = Number(remove.closest('[data-row]').dataset.row);
      rows.splice(i,1); renderRows();
      (list.children[Math.min(i,rows.length-1)]?.querySelector('select') || form.querySelector('[data-photo-add]')).focus();
    }
  });
  host.addEventListener('change', e => {
    const field = e.target;
    if (field.type === 'file') {
      const file = field.files[0]; field.value = '';
      if (file) void analyze(file);
    } else if (field.hasAttribute('data-photo-add') && field.value !== '') {
      rows.push({ label: '', name: '', index: Number(field.value), portions: 1 });
      field.value = ''; renderRows();
      (list.lastElementChild.querySelector('[data-field=name]') || list.lastElementChild.querySelector('[data-field=amount]')).focus();
    } else if (field.dataset.field === 'food') {
      const i = Number(field.closest('[data-row]').dataset.row);
      rows[i].index = Number(field.value); rows[i].portions = 1;
      renderRows();
      (list.children[i].querySelector('[data-field=name]') || list.children[i].querySelector('[data-field=food]')).focus();
    } else if (field.dataset.field === 'amount') {
      rows[Number(field.closest('[data-row]').dataset.row)].portions = Number(field.value); refreshTotals();
    }
  });
  host.addEventListener('input', e => {
    if (e.target.dataset.field !== 'name') return;
    rows[Number(e.target.closest('[data-row]').dataset.row)].name = e.target.value; refreshTotals();
  });
  form.addEventListener('submit', e => {
    e.preventDefault(); e.stopPropagation();
    if (form.hidden || form.querySelector('[type="submit"]').disabled) return;
    onSave(rows.map(row => ({ food: choice(row), portions: row.portions })), form.elements.date.value, form);
  });
  return () => { generation++; releaseWorker(); releaseImage(); };
}
