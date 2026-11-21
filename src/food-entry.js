import { foodValues } from './foods.js';
import { makeMeal } from './model.js';

export function matchingFood(foods, { name, amount }) {
  return foods.find(food => food.name === name && food.amount === amount);
}

// 同じ時刻の登録や復元済みのIDと衝突しても、入力だけから一意に決める。
function availableId(base, used) {
  let id = base;
  for (let n = 2; used.has(id); n++) id = base + '-' + n;
  return id;
}

export function registerAndRecordFood(state, entry) {
  const { date, createdAt, portions, mealSlot } = entry;
  const existing = matchingFood(state.foods, entry);
  const food = existing ?? {
    ...foodValues(entry), icon: 'meal',
    id: availableId('food-' + createdAt, new Set([...state.foods.map(f => f.id), ...state.meals.map(m => m.foodId)])),
  };
  const recordIds = new Set([...state.workouts, ...state.meals, ...state.weights].map(r => r.id));
  const meal = makeMeal(food, date, portions, mealSlot, { id: availableId('meal-' + createdAt, recordIds), createdAt });
  return { ...state, foods: existing ? state.foods : [food, ...state.foods], meals: [...state.meals, meal] };
}
