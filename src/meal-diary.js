export const MEAL_SLOTS = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' };
export const mealSlotLabel = slot => Object.hasOwn(MEAL_SLOTS, slot) ? MEAL_SLOTS[slot] : '未分類';

const japanHour = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: 'numeric', hourCycle: 'h23' });
export function suggestedMealSlot(now = new Date()) {
  const hour = Number(japanHour.formatToParts(now).find(part => part.type === 'hour').value);
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

// 今日の区分が空なら、直近の同じ区分に保存された行を当時の順序で返す。
export function previousMeal(meals, date, slot) {
  let previous = null;
  for (const meal of meals) {
    if (meal.mealSlot !== slot || meal.date > date) continue;
    if (meal.date === date) return null;
    if (!previous || meal.date > previous.date) previous = { date: meal.date, meals: [] };
    if (meal.date === previous.date) previous.meals.push(meal);
  }
  return previous;
}

// コピー元は実際に記録した日と区分でまとめる。選択中の食事自身は候補から外す。
export function reusableMeals(meals, date, slot) {
  const groups = new Map();
  for (const meal of meals) {
    if (meal.date > date || (meal.date === date && meal.mealSlot === slot)) continue;
    const key = meal.date + '/' + (meal.mealSlot || '');
    if (!groups.has(key)) groups.set(key, { date: meal.date, slot: meal.mealSlot, meals: [] });
    groups.get(key).meals.push(meal);
  }
  const order = [...Object.keys(MEAL_SLOTS), undefined];
  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date) || order.indexOf(a.slot) - order.indexOf(b.slot));
}

function mealPortionKey(meal) {
  return JSON.stringify([
    meal.name.normalize('NFKC').trim(), meal.amount || '', meal.portions ?? 1,
    meal.kcal ?? null, meal.protein ?? null, meal.fat ?? null, meal.carbs ?? null,
  ]);
}

// Match each already logged serving only once, including when a source meal contains two identical cups.
export function alreadyLoggedPortions(source, destination) {
  const available = new Map();
  for (const meal of destination) {
    const key = mealPortionKey(meal);
    available.set(key, (available.get(key) || 0) + 1);
  }
  return source.map(meal => {
    const key = mealPortionKey(meal), count = available.get(key) || 0;
    if (!count) return false;
    available.set(key, count - 1);
    return true;
  });
}
