import { DISH_GROUPS } from './food-catalog.js';
import { PHOTO_FOODS } from './meal-photo-foods.js';

// 一般食品は文部科学省「日本食品標準成分表（八訂）増補2023年」から引用。
// 右端は食品番号。可食部100gの値を表示分量に換算している。商品2品の出典はREADMEを参照。
const originalFoods = [
  { id: 'protein', name: 'プロテイン', amount: '1杯（粉末28g・水割り）', kcal: 102, protein: 20, fat: 0.2, carbs: 5.8, icon: 'shaker' },
  { id: 'chicken', name: 'サラダチキン', amount: '1袋（90g）', kcal: 92, protein: 18.5, fat: 1.8, carbs: 0.4, icon: 'meal' },
  { id: 'natto', name: '納豆', amount: '1パック（40g）', kcal: 73.6, protein: 6.6, fat: 4, carbs: 4.84, icon: 'meal' }, // 04046
  { id: 'egg', name: '卵', amount: '1個（50g）', kcal: 71, protein: 6.1, fat: 5.1, carbs: 0.2, icon: 'egg' }, // 12004
  { id: 'yogurt', name: 'プレーンヨーグルト', amount: '100g', kcal: 56, protein: 3.6, fat: 3, carbs: 4.9, icon: 'meal' }, // 13025
  { id: 'rice', name: 'おにぎり（具なし）', amount: '1個（100g）', kcal: 170, protein: 2.7, fat: 0.3, carbs: 39.4, icon: 'rice' }, // 01111
  { id: 'white-rice', name: 'ごはん（白米）', amount: '1膳（150g）', kcal: 234, protein: 3.75, fat: 0.45, carbs: 55.65, icon: 'rice' }, // 01088
  { id: 'brown-rice', name: '玄米ごはん', amount: '1膳（150g）', kcal: 228, protein: 4.2, fat: 1.5, carbs: 53.4, icon: 'rice' }, // 01085
  { id: 'bread', name: '食パン', amount: '1枚（60g）', kcal: 148.8, protein: 5.34, fat: 2.46, carbs: 27.84, icon: 'meal' }, // 01026
  { id: 'oats', name: 'オートミール', amount: '1食（30g）', kcal: 105, protein: 4.11, fat: 1.71, carbs: 20.73, icon: 'meal' }, // 01004
  { id: 'udon', name: 'うどん（ゆで）', amount: '1玉（200g）', kcal: 190, protein: 5.2, fat: 0.8, carbs: 43.2, icon: 'meal' }, // 01039
  { id: 'soba', name: 'そば（ゆで）', amount: '1食（200g）', kcal: 260, protein: 9.6, fat: 2, carbs: 52, icon: 'meal' }, // 01128
  { id: 'pasta', name: 'スパゲッティ（ゆで）', amount: '1食（200g）', kcal: 300, protein: 11.6, fat: 1.8, carbs: 64.4, icon: 'meal' }, // 01064
  { id: 'cereal', name: 'コーンフレーク', amount: '1食（40g）', kcal: 152, protein: 3.12, fat: 0.68, carbs: 33.44, icon: 'meal' }, // 01137
  { id: 'firm-tofu', name: '木綿豆腐', amount: '1皿（150g）', kcal: 109.5, protein: 10.5, fat: 7.35, carbs: 2.25, icon: 'meal' }, // 04032
  { id: 'silken-tofu', name: '絹ごし豆腐', amount: '1皿（150g）', kcal: 84, protein: 7.95, fat: 5.25, carbs: 3, icon: 'meal' }, // 04033
  { id: 'soy-milk', name: '豆乳（無調整）', amount: '1杯（200g）', kcal: 86, protein: 7.2, fat: 5.6, carbs: 4.6, icon: 'meal' }, // 04052
  { id: 'milk', name: '牛乳', amount: '1杯（200g）', kcal: 122, protein: 6.6, fat: 7.6, carbs: 9.6, icon: 'meal' }, // 13003
  { id: 'cheese', name: 'プロセスチーズ', amount: '1個（15g）', kcal: 46.95, protein: 3.405, fat: 3.9, carbs: 0.195, icon: 'meal' }, // 13040
  { id: 'boiled-egg', name: 'ゆで卵', amount: '1個（50g）', kcal: 67, protein: 6.25, fat: 5.2, carbs: 0.15, icon: 'egg' }, // 12005
  { id: 'grilled-chicken', name: '鶏むね肉（皮なし・焼き）', amount: '1皿（100g）', kcal: 177, protein: 38.8, fat: 3.3, carbs: 0.1, icon: 'meal' }, // 11288
  { id: 'salmon', name: '焼き鮭', amount: '1切れ（80g）', kcal: 128, protein: 23.28, fat: 4.08, carbs: 0.08, icon: 'meal' }, // 10136
  { id: 'mackerel', name: '焼きさば', amount: '1切れ（80g）', kcal: 211.2, protein: 20.16, fat: 17.92, carbs: 0.32, icon: 'meal' }, // 10156
  { id: 'tuna', name: 'ツナ（水煮・ライト）', amount: '1食（70g）', kcal: 49, protein: 11.2, fat: 0.49, carbs: 0.14, icon: 'meal' }, // 10260
  { id: 'ham', name: 'ロースハム', amount: '1枚（20g）', kcal: 42.2, protein: 3.72, fat: 2.9, carbs: 0.4, icon: 'meal' }, // 11176
  { id: 'edamame', name: '枝豆（ゆで・むき身）', amount: '1皿（50g）', kcal: 59, protein: 5.75, fat: 3.05, carbs: 4.45, icon: 'meal' }, // 06016
  { id: 'broccoli', name: 'ブロッコリー（ゆで）', amount: '1皿（70g）', kcal: 21, protein: 2.73, fat: 0.28, carbs: 3.64, icon: 'meal' }, // 06264
  { id: 'cabbage', name: 'キャベツ（生）', amount: '1皿（70g）', kcal: 16.1, protein: 0.84, fat: 0.07, carbs: 3.64, icon: 'meal' }, // 06061
  { id: 'tomato', name: 'トマト', amount: '1個（150g）', kcal: 30, protein: 1.05, fat: 0.15, carbs: 7.05, icon: 'meal' }, // 06182
  { id: 'spinach', name: 'ほうれん草（ゆで）', amount: '1皿（70g）', kcal: 16.1, protein: 1.82, fat: 0.35, carbs: 2.8, icon: 'meal' }, // 06268
  { id: 'potato', name: 'じゃがいも（蒸し）', amount: '1個（100g）', kcal: 76, protein: 1.9, fat: 0.3, carbs: 18.1, icon: 'meal' }, // 02018
  { id: 'sweet-potato', name: 'さつまいも（蒸し）', amount: '1切れ（100g）', kcal: 131, protein: 1.2, fat: 0.2, carbs: 31.9, icon: 'meal' }, // 02007
  { id: 'banana', name: 'バナナ', amount: '1本（100g）', kcal: 93, protein: 1.1, fat: 0.2, carbs: 22.5, icon: 'meal' }, // 07107
  { id: 'apple', name: 'りんご（皮つき）', amount: '1個（200g）', kcal: 112, protein: 0.4, fat: 0.6, carbs: 32.4, icon: 'meal' }, // 07176
  { id: 'kiwi', name: 'キウイ', amount: '1個（80g）', kcal: 40.8, protein: 0.8, fat: 0.16, carbs: 10.72, icon: 'meal' }, // 07054
  { id: 'almond', name: 'アーモンド（無塩）', amount: '1食（20g）', kcal: 121.6, protein: 4.06, fat: 10.82, carbs: 4.14, icon: 'meal' }, // 05040
];

export const ADDED_FOODS = [
  ...Object.values(DISH_GROUPS).flat().map(([id, name, amount, kcal, protein, fat, carbs]) =>
    ({ id, name, amount, kcal, protein, fat, carbs, icon: 'meal' })),
  ...PHOTO_FOODS.map(({ classId, ...food }) => food),
];
export const FOODS = [...originalFoods, ...ADDED_FOODS];

export const BREAKFAST = { id: 'breakfast', name: 'いつもの朝食', foodIds: ['white-rice', 'natto', 'egg'] };
export const NUTRIENTS = [
  { key: 'kcal', label: 'カロリー', unit: 'kcal' },
  { key: 'protein', label: 'たんぱく質', unit: 'g' },
  { key: 'fat', label: '脂質', unit: 'g' },
  { key: 'carbs', label: '炭水化物', unit: 'g' },
];
export const PORTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5];
export const foodValues = food => ({
  name: food.name, amount: food.amount, kcal: food.kcal ?? null, protein: food.protein ?? null,
  fat: food.fat ?? null, carbs: food.carbs ?? null,
});

export function portionLabel(amount, portions = 1) {
  if (!amount || portions === 1) return amount;
  const spoons = /^(大さじ|小さじ)(\d+(?:\.\d+)?)(?:（(\d+(?:\.\d+)?)g）)?$/.exec(amount);
  const match = spoons || /^(\d+(?:\.\d+)?)(膳|個|枚|皿|切れ|杯|パック|玉|袋|食|本|尾|貫|人前|小鉢|鉢|粒|g)(?:（(\d+(?:\.\d+)?)g）)?$/.exec(amount);
  if (!match) return `${amount} × ${portions}`;
  const scale = value => Number((Number(value) * portions).toPrecision(15));
  const label = spoons ? match[1] + scale(match[2]) : scale(match[1]) + match[2];
  return label + (match[3] ? `（${scale(match[3])}g）` : '');
}

// Keep unknown fields separate from genuine zeroes. Round only for display.
export function mealNutrition(meals) {
  const result = {};
  for (const { key } of NUTRIENTS) {
    let sum = 0, missing = 0;
    for (const meal of meals) {
      if (meal[key] == null) missing++;
      else sum += meal[key] * (meal.portions ?? 1);
    }
    result[key] = { value: meals.length && missing === meals.length ? null : Number(sum.toFixed(8)), missing };
  }
  return result;
}

export function nutrientText({ value, missing }, key) {
  if (value === null) return '未入力';
  const formatted = value.toLocaleString('ja-JP', { maximumFractionDigits: key === 'kcal' ? 0 : 1 });
  return formatted + (key === 'kcal' ? ' kcal' : 'g') + (missing ? '（入力分）' : '');
}
