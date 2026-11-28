import { continuedDates } from './diet-summary.js';
import { exerciseById, exercisesFor, validateCustomExercises } from './exercise-catalog.js';
import { RULES, PARTS, LEGACY_FOODS } from './rules.js';
import { FOODS, ADDED_FOODS, BREAKFAST, PORTIONS, NUTRIENTS, foodValues, mealNutrition, portionLabel } from './foods.js';
import { MEAL_SLOTS } from './meal-diary.js';
import { SCENES } from './cosmetics.js';
import { emptyProfile, validateProfile } from './profile.js';
import { growthStage, partLevel } from './growth.js';
import { emptyDataSafety, validateDataSafety } from './data-safety.js';
import { emptyCollection, validateCollection } from './collection.js';
import { STORY_CHAPTERS, validStoryReplies } from './story-data.js';
import { validBodyType } from './body-types.js';
import { wardrobeOf, validateWardrobe } from './wardrobe.js';

export const SCHEMA_VERSION = 5;
export const STORAGE_KEY = 'sodatekin.v1';
const DAY = 86400000;
export const clone = value => globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
// LAN内のHTTPプレビューではrandomUUIDが使えないブラウザにも対応。
export const id = () => globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
export function today(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export const dayNumber = date => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY);
export const shiftDate = (date, amount) => new Date((dayNumber(date) + amount) * DAY).toISOString().slice(0, 10);
export const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(dayNumber(date)) && shiftDate(date, 0) === date && date >= '2000-01-01' && date <= '2100-12-31';
export function withinInputWindow(date, now = today()) { return validDate(date) && date <= now && date >= shiftDate(now, -7); }
// Old explicitly selected souvenir skies keep their appearance after upgrade.
export function backgroundModeOf(settings = {}) {
  if (['studio', 'journey', 'souvenir'].includes(settings.backgroundMode)) return settings.backgroundMode;
  return settings.scene === 'dawn' || settings.scene === 'sunset' ? 'souvenir' : 'journey';
}
export function emptyState() {
  return { schemaVersion: SCHEMA_VERSION, rulesVersion: RULES.version, legacyLevelRecords: null, collection: emptyCollection(), customExercises: [], workouts: [], meals: [], weights: [], restDays: [], restPeriods: [], foods: clone(FOODS), mealSets: [clone(BREAKFAST)], settings: { favorites: ['pushup', 'squat', 'plank'], reducedMotion: false, sound: false, partnerName: '相棒', weeklyGoal: null, scene: 'garden', backgroundMode: 'studio', titleBadge: false, bodyType: 'studio', wardrobe: wardrobeOf(), storyPin: null, storyReplies: {}, profile: emptyProfile(), dataSafety: emptyDataSafety(), insightHistory: { return: null, total: null, weekday: null, trend: null } } };
}
export function uniqueRecords(records) { return [...new Map(records.map(record => [record.id, record])).values()]; }
export function lastWorkout(state, exerciseId) {
  // 同時に保存したセットはcreatedAtが同じになる。配列の後の行を直近として使う。
  let last;
  for (const row of state.workouts) {
    if (row.exerciseId !== exerciseId) continue;
    if (!last || row.date > last.date || (row.date === last.date && Date.parse(row.createdAt) >= Date.parse(last.createdAt))) last = row;
  }
  return last;
}
export function workoutDefaults(state, exerciseId) {
  const ex = exerciseById(state, exerciseId);
  const last = lastWorkout(state, exerciseId);
  return { count: last?.count ?? ex.count, sets: last?.sets ?? ex.sets, weight: last?.weight ?? null };
}
export function makeWorkout(state, exerciseId, values = {}) {
  return { id: id(), exerciseId, date: today(), ...workoutDefaults(state, exerciseId), memo: '', createdAt: new Date().toISOString(), ...values };
}
export function foodPortion(food, factor) {
  if (factor === 1) return { amount: food.amount, protein: food.protein };
  // Only scale a single quantity. Mixed dishes retain the original description.
  const match = food.amount.normalize('NFKC').trim().match(/^(\d{1,6}(?:\.\d{1,3})?)\s*(g|kg|ml|mL|L|個|杯|本|枚|粒|袋|食|パック|切れ|人前)$/);
  const amount = match ? `${Number(match[1]) * factor}${match[2]}` : food.amount && `（${food.amount}）の${factor === 0.5 ? '半分' : '2倍'}`;
  return { amount, protein: food.protein === null ? null : Math.round(food.protein * factor * 10) / 10 };
}
export function mealProtein(meals) {
  const { value, missing } = mealNutrition(meals).protein;
  return { grams: value ?? 0, missing };
}
export function mealDetail(meals) {
  const { grams, missing } = mealProtein(meals);
  const protein = missing && missing === meals.length ? '未入力' : `${grams.toLocaleString('ja-JP', { maximumFractionDigits: 1, useGrouping: false })}g${missing ? `（未入力${missing}件）` : ''}`;
  const amount = meals.length === 1 ? portionLabel(meals[0].amount, meals[0].portions) : '';
  return `${amount ? amount + ' · ' : ''}たんぱく質 ${protein}`;
}
export function makeMeal(food, date = today(), portions = 1, mealSlot, { id: mealId = id(), createdAt = new Date().toISOString() } = {}) {
  return { id: mealId, foodId: food.foodId ?? food.id, ...foodValues(food), portions, date, ...(mealSlot && { mealSlot }), createdAt };
}
export function isPaused(state, date) { return state.restPeriods.some(p => p.start <= date && (p.end === null || date <= p.end)); }
export const earnedXP = (raw, meal) => Math.min(RULES.dailyCap, raw) * (meal ? RULES.mealBonus : 1);

export function legacyLevelState(state) {
  const legacy = state.legacyLevelRecords;
  if (!legacy) return null;
  const workouts = new Set(legacy.workoutIds), meals = new Set(legacy.mealIds);
  return { ...state, legacyLevelRecords: null, workouts: state.workouts.filter(r => workouts.has(r.id)), meals: state.meals.filter(r => meals.has(r.id)) };
}

// 記録を正とし、集計結果は保存しません。入力順序・編集・削除に依存しない再計算。
export function derive(state, date = today()) {
  const oldState = legacyLevelState(state);
  const oldParts = oldState ? derive(oldState, date).parts : null;
  const workouts = uniqueRecords(state.workouts).filter(r => r.date <= date);
  const meals = uniqueRecords(state.meals).filter(r => r.date <= date);
  const mealDates = new Set(meals.map(r => r.date));
  const days = {};
  for (const record of workouts) {
    const ex = exerciseById(state, record.exerciseId);
    if (!ex) continue;
    days[record.date] ??= Object.fromEntries(PARTS.map(p => [p.id, 0]));
    for (const p of ex.primary) days[record.date][p] += record.sets * RULES.primaryXP;
    for (const p of ex.secondary) days[record.date][p] += record.sets * RULES.secondaryXP;
  }
  const sortedDates = Object.keys(days).sort();
  const parts = Object.fromEntries(PARTS.map(part => {
    let xp = 0;
    for (const day of sortedDates) xp += earnedXP(days[day][part.id], mealDates.has(day));
    xp = Math.round(xp * 1e8) / 1e8;
    const trainedDates = sortedDates.filter(d => days[d][part.id] > 0);
    // 旧ルールの互換計算のみ。v0.3以降、表示・台詞・成長の良し悪しには使わない。
    const condition = calculateCondition(state, trainedDates, date);
    return [part.id, { xp, ...partLevel(xp, oldParts?.[part.id].xp), stage: growthStage(xp), condition, lastTrained: trainedDates.at(-1) ?? null, todayXP: Math.min(RULES.dailyCap, days[date]?.[part.id] || 0) * (mealDates.has(date) ? RULES.mealBonus : 1), todayRaw: days[date]?.[part.id] || 0 }];
  }));
  const totalXP = Math.round(Object.values(parts).reduce((sum, p) => sum + p.xp, 0) * 1e8) / 1e8;
  const todayMeals = meals.filter(r => r.date === date);
  const nutrition = mealNutrition(todayMeals);
  return { parts, totalXP, level: 1 + Math.floor(totalXP / RULES.totalXP), progress: totalXP % RULES.totalXP, todayXP: Object.values(parts).reduce((sum, p) => sum + p.todayXP, 0), todayWorkouts: workouts.filter(r => r.date === date), todayMeals, nutrition, protein: nutrition.protein.value, missingProtein: nutrition.protein.missing, workoutDays: sortedDates.length, paused: state.restPeriods.some(p => p.start <= date && p.end === null), mealBonus: mealDates.has(date), days };
}

// 日を追って状態を再生。休養モードは低下だけを止め、再開時にも失った調子を一度に戻しません。
export function calculateCondition(state, trainedDates, date) {
  if (!trainedDates.length) return 100;
  const trained = new Set(trainedDates);
  let condition = 100;
  let last = dayNumber(trainedDates[0]);
  for (let n = last + 1; n <= dayNumber(date); n++) {
    const d = new Date(n * DAY).toISOString().slice(0, 10);
    if (trained.has(d)) { condition = Math.min(100, condition + RULES.conditionRecovery); last = n; }
    else if (n - last > RULES.graceDays && !isPaused(state, d)) condition = Math.max(RULES.minCondition, condition - RULES.conditionLoss);
  }
  return condition;
}

const bounded = (v, min, max, integer = false) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v));
const string = (v, max, required = true) => typeof v === 'string' && v.length <= max && (!required || v.trim().length > 0);
const assert = (test, message) => { if (!test) throw new Error(message); };
export function validateWeightKg(kg) {
  assert(bounded(kg, 20, 300) && Number.isInteger(kg * 10), '体重は20〜300kgの範囲で、小数第1位まで入力してください。');
  return kg;
}
export function validateState(input, currentDate = today()) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'バックアップの形式を確認してください。');
  const legacyFoodFormat = input.schemaVersion === 1;
  assert([1, 2, 3, 4, SCHEMA_VERSION].includes(input.schemaVersion), 'このデータ形式のバージョンには対応していません。');
  assert([1, 2, 3, RULES.version].includes(input.rulesVersion), 'このゲームルールのバージョンには対応していません。');
  for (const key of ['workouts', 'meals', 'restDays', 'restPeriods', 'foods', 'mealSets']) assert(Array.isArray(input[key]) && input[key].length <= 50000, `${key} の形式または件数が正しくありません。`);
  const customExercises = validateCustomExercises(input.schemaVersion < 3 && input.customExercises === undefined ? [] : input.customExercises);
  assert(!customExercises.length || input.schemaVersion >= 3, '自作種目には保存形式v3以上が必要です。');
  const exerciseIds = new Set(exercisesFor({ customExercises }).map(ex => ex.id));
  const allIds = new Set();
  const recordId = r => { assert(r && typeof r === 'object' && string(r.id, 100), '記録IDが正しくありません。'); assert(!allIds.has(r.id), '同じ記録IDが重複しています。'); allIds.add(r.id); };
  const dateCheck = d => assert(validDate(d) && d <= currentDate, '記録の日付が正しくありません。未来の日付は復元できません。');
  const timestamp = r => assert(string(r.createdAt, 50) && Number.isFinite(Date.parse(r.createdAt)), '作成日時が正しくありません。');
  for (const r of input.workouts) {
    recordId(r); dateCheck(r.date); timestamp(r);
    assert(exerciseIds.has(r.exerciseId), '未対応の筋トレ種目が含まれています。');
    assert(bounded(r.count, 1, 86400, true) && bounded(r.sets, 1, 100, true) && (r.weight === null || bounded(r.weight, 0, 2000)) && string(r.memo, 500, false), '筋トレ記録の数値またはメモが正しくありません。');
  }
  const checkFood = f => {
    assert(f && string(f.name, 60) && (string(f.amount, 60) || (!legacyFoodFormat && f.amount === '')), '食品名・量を確認してください。');
    if (input.schemaVersion >= 3) assert(f.protein !== undefined, 'たんぱく質の未入力はnullで保存してください。');
    if (legacyFoodFormat) assert(bounded(f.protein, 0, 1000), 'たんぱく質量を確認してください。');
    for (const { key } of NUTRIENTS) assert(f[key] == null || bounded(f[key], 0, key === 'kcal' ? 10000 : 1000), '栄養値を確認してください。');
  };
  for (const r of input.meals) {
    recordId(r); dateCheck(r.date); timestamp(r); checkFood(r);
    assert(r.mealSlot === undefined || (typeof r.mealSlot === 'string' && Object.hasOwn(MEAL_SLOTS, r.mealSlot)), '食事の区分が正しくありません。');
    assert(string(r.foodId, 100) && (r.portions === undefined || PORTIONS.includes(r.portions)), '食事の食品ID・分量が正しくありません。');
  }
  const weights = input.schemaVersion < 5 && input.weights === undefined ? [] : input.weights;
  assert(Array.isArray(weights) && weights.length <= 50000, '体重の記録の形式または件数が正しくありません。');
  const weightDates = new Set();
  for (const r of weights) {
    recordId(r); dateCheck(r.date); timestamp(r);
    validateWeightKg(r.kg);
    assert(!weightDates.has(r.date), '同じ日付の体重が重複しています。');
    weightDates.add(r.date);
  }
  const foodIds = new Set();
  for (const f of input.foods) { checkFood(f); assert(string(f.id, 100) && !foodIds.has(f.id), '食品IDが重複または不正です。'); foodIds.add(f.id); assert(['shaker', 'meal', 'egg', 'rice'].includes(f.icon), '食品アイコンが正しくありません。'); }
  const setIds = new Set();
  for (const s of input.mealSets) {
    assert(s && string(s.id, 100) && !setIds.has(s.id) && string(s.name, 60) && Array.isArray(s.foodIds) && s.foodIds.length > 0 && s.foodIds.length <= 30 && new Set(s.foodIds).size === s.foodIds.length && s.foodIds.every(i => foodIds.has(i)), '食事セットの形式が正しくありません。');
    assert(s.portions === undefined || (Array.isArray(s.portions) && s.portions.length === s.foodIds.length && s.portions.every(v => PORTIONS.includes(v))), '食事セットの分量を確認してください。');
    setIds.add(s.id);
  }
  const legacyCatalog = legacyFoodFormat || (input.foods.length > 0 && input.foods.every(f => !Object.hasOwn(f, 'kcal')));
  const foods = input.foods.map(f => {
    if (legacyCatalog && LEGACY_FOODS.some(old => Object.entries(old).every(([key, value]) => f[key] === value))) {
      return { ...FOODS.find(food => food.id === f.id) };
    }
    return { id: f.id, ...foodValues(f), icon: f.icon };
  });
  const mealSets = input.mealSets.map(s => ({ id: s.id, name: s.name, foodIds: [...s.foodIds], ...(s.portions && { portions: [...s.portions] }) }));
  for (const f of legacyCatalog ? FOODS : ADDED_FOODS) {
    if (!foodIds.has(f.id) && foods.length < 50000) foods.push({ ...f });
  }
  if (legacyCatalog && !mealSets.length && BREAKFAST.foodIds.every(id => foods.some(f => f.id === id && f.name === FOODS.find(p => p.id === id).name))) mealSets.push(clone(BREAKFAST));
  const restIds = new Set();
  for (const d of input.restDays) { dateCheck(d); assert(!restIds.has(d), '休養日が重複しています。'); restIds.add(d); }
  let end = null;
  for (const p of [...input.restPeriods].sort((a, b) => String(a?.start).localeCompare(String(b?.start)))) {
    assert(p && validDate(p.start) && p.start <= currentDate && (p.end === null || (validDate(p.end) && p.end >= p.start && p.end <= currentDate)), '休養モードの期間が正しくありません。');
    assert(end === null || p.start > end, '休養モードの期間が重複しています。'); end = p.end ?? '9999-12-31';
  }
  const settings = input.settings;
  assert(settings && Array.isArray(settings.favorites) && settings.favorites.length <= 3 && new Set(settings.favorites).size === settings.favorites.length && settings.favorites.every(i => exerciseIds.has(i)) && typeof settings.reducedMotion === 'boolean' && typeof settings.sound === 'boolean', '設定の形式が正しくありません。');
  assert(settings.partnerName === undefined || string(settings.partnerName, 12), '相棒の名前は1〜12文字にしてください。');
  assert(settings.weeklyGoal === undefined || settings.weeklyGoal === null || bounded(settings.weeklyGoal, 1, 7, true), '週の目標は1〜7日、または設定なしにしてください。');
  assert(settings.scene === undefined || SCENES.some(s => s.id === settings.scene), '背景の設定が正しくありません。');
  assert(settings.backgroundMode === undefined || ['studio', 'journey', 'souvenir'].includes(settings.backgroundMode), '背景の表示方法が正しくありません。');
  assert(settings.titleBadge === undefined || typeof settings.titleBadge === 'boolean', '称号の設定が正しくありません。');
  assert(settings.storyPin === undefined || settings.storyPin === null || STORY_CHAPTERS.some(c => c.id === settings.storyPin), '物語の記念品が正しくありません。');
  assert(settings.bodyType === undefined || validBodyType(settings.bodyType), '相棒の体型が正しくありません。');
  const wardrobe = validateWardrobe(settings.wardrobe);
  const storyReplies = settings.storyReplies === undefined ? {} : settings.storyReplies;
  assert(validStoryReplies(storyReplies), '物語の返事が正しくありません。');
  const profile = validateProfile(settings.profile);
  const collection = validateCollection(input.collection, currentDate);
  if (input.collection?.sceneArrivals === undefined) {
    // Existing records are not a new arrival on the first upgraded load.
    const days = continuedDates(input, currentDate).length;
    collection.sceneArrivals = STORY_CHAPTERS.filter(chapter => chapter.days <= days).map(chapter => chapter.id);
  }
  const dataSafety = validateDataSafety(settings.dataSafety);
  const history = settings.insightHistory ?? {};
  assert(history && typeof history === 'object' && !Array.isArray(history), '相棒の気づきの設定が正しくありません。');
  const insightHistory = Object.fromEntries(['return', 'total', 'weekday', 'trend'].map(family => {
    const date = history[family] ?? null;
    assert(date === null || (validDate(date) && date <= currentDate), '相棒の気づきの日付が正しくありません。');
    return [family, date];
  }));
  let legacyLevelRecords = input.rulesVersion === 1 ? { workoutIds: input.workouts.map(r => r.id), mealIds: input.meals.map(r => r.id) } : input.legacyLevelRecords ?? null;
  if (legacyLevelRecords !== null) {
    assert(typeof legacyLevelRecords === 'object' && !Array.isArray(legacyLevelRecords), '旧レベルの互換情報が正しくありません。');
    for (const key of ['workoutIds', 'mealIds']) assert(Array.isArray(legacyLevelRecords[key]) && legacyLevelRecords[key].length <= 50000 && legacyLevelRecords[key].every(v => string(v, 100)) && new Set(legacyLevelRecords[key]).size === legacyLevelRecords[key].length, '旧レベルの記録IDが正しくありません。');
    const w = new Set(input.workouts.map(r => r.id)), m = new Set(input.meals.map(r => r.id));
    legacyLevelRecords = { workoutIds: legacyLevelRecords.workoutIds.filter(id => w.has(id)), mealIds: legacyLevelRecords.mealIds.filter(id => m.has(id)) };
  }
  // 許可した項目だけを新しいオブジェクトへ取り込みます。
  return {
    schemaVersion: SCHEMA_VERSION, rulesVersion: RULES.version, legacyLevelRecords, collection, customExercises,
    weights: weights.map(({ id, date, kg, createdAt }) => ({ id, date, kg, createdAt })),
    workouts: input.workouts.map(({ id, exerciseId, date, count, sets, weight, memo, createdAt }) => ({ id, exerciseId, date, count, sets, weight, memo, createdAt })),
    meals: input.meals.map(r => ({ id: r.id, foodId: r.foodId, ...foodValues(r), portions: r.portions ?? 1, date: r.date, ...(r.mealSlot && { mealSlot: r.mealSlot }), createdAt: r.createdAt })),
    foods, mealSets,
    restDays: [...input.restDays], restPeriods: input.restPeriods.map(({ start, end }) => ({ start, end })),
    settings: { favorites: [...settings.favorites], reducedMotion: settings.reducedMotion, sound: settings.sound, partnerName: settings.partnerName?.trim() || '相棒', weeklyGoal: settings.weeklyGoal ?? null, scene: settings.scene ?? 'garden', backgroundMode: backgroundModeOf(settings), titleBadge: settings.titleBadge ?? false, bodyType: settings.bodyType ?? 'classic', wardrobe, storyPin: settings.storyPin ?? null, storyReplies: { ...storyReplies }, profile, dataSafety, insightHistory },
  };
}
