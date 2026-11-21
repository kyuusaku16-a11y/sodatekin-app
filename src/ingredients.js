import { INGREDIENT_TABLE } from './ingredient-table.js';
import { FOODS, NUTRIENTS } from './foods.js';

const aliases = {
  茄子: 'なす', 胡瓜: 'きゅうり', 白菜: 'はくさい', 大根: 'だいこん', 人参: 'にんじん',
  玉葱: 'たまねぎ', 玉ねぎ: 'たまねぎ', 葱: 'ねぎ', 小松菜: 'こまつな', ほうれん草: 'ほうれんそう',
  南瓜: 'かぼちゃ', 椎茸: 'しいたけ', 舞茸: 'まいたけ', 筍: 'たけのこ', 山芋: 'やまのいも',
  里芋: 'さといも', 馬鈴薯: 'じゃがいも', 鮭: 'さけ', 鯖: 'さば', 鰤: 'ぶり', 鮪: 'まぐろ',
  鶏肉: '鶏', とり肉: '鶏', とりもも: '鶏もも', とりむね: '鶏むね', 胸肉: 'むね', もも肉: 'もも',
  豚肉: '豚', ぶた肉: '豚', 牛肉: '牛', 挽肉: 'ひき肉', 挽き肉: 'ひき肉', ひきにく: 'ひき肉',
  醤油: 'しょうゆ', 味噌: 'みそ', 生姜: 'しょうが', 大豆: 'だいず', たまご: '卵', 玉子: '卵', とうふ: '豆腐',
  炒め: 'いため', 焼いた: '焼き', 茹で: 'ゆで', 木綿: 'もめん', 絹ごし: 'きぬごし',
};
const spellings = new RegExp(Object.keys(aliases).sort((a, b) => b.length - a.length).join('|'), 'g');
function normalize(text) {
  return text.normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 96))
    .replace(spellings, word => aliases[word]);
}
const groups = ['穀類', 'いも でんぷん', '砂糖 甘味', '豆類', '種実 ナッツ', '野菜', '果物', 'きのこ', '海藻', '魚介', '肉', '卵', '乳製品', '油脂', '菓子 おやつ', '飲み物', '調味料 香辛料'];
const commonCodes = ['11221','11224','11220','11163','11124','11089','12004','04032','04033','06191','06153','06065','06215','06061','06268','06087','06182','02018','08016','10134','10154','17007'];
const priority = new Map(commonCodes.map((code, i) => [code, i]));
const index = INGREDIENT_TABLE.map(row => {
  const name = normalize(row[1]);
  const meat = /^(鶏|豚|牛) /.exec(name);
  const cut = meat && name.match(/ひき肉|かたろーす|ろーす|ばら|もも|むね|ささみ|ひれ/);
  const shorthand = cut ? meat[1] + cut[0] : '';
  const group = groups[Number(row[0].slice(0, 2)) - 1];
  return { row, key: [row[0], name, shorthand, group].join(' ') };
}).sort((a, b) => (priority.get(a.row[0]) ?? Infinity) - (priority.get(b.row[0]) ?? Infinity));
export const ingredientCount = index.length;
const presetIds = new Set(FOODS.map(food => food.id));
export function findIngredients(query, foods = []) {
  const words = normalize(query).trim().split(/\s+/);
  const matches = key => words.every(word => key.includes(word));
  const personal = [];
  for (const food of foods) {
    if (presetIds.has(food.id) || food.id.startsWith('ingredient-') || !matches(normalize(food.name))) continue;
    const amount = food.amount.normalize('NFKC').trim();
    const match = /^(\d+(?:\.\d+)?)\s*g$/i.exec(amount) || /^[^()]+\((\d+(?:\.\d+)?)\s*g\)$/i.exec(amount);
    const grams = Number(match?.[1]);
    if (Number.isFinite(grams) && grams > 0) personal.push(['user-' + food.id, food.name, ...NUTRIENTS.map(({ key }) => food[key] == null ? null : food[key] * 100 / grams)]);
  }
  return [...personal, ...index.filter(({ key }) => matches(key)).map(({ row }) => row)];
}

export function weighedIngredient(row, grams) {
  if (!row || !Number.isFinite(grams) || grams < 0.1 || grams > 1000 || !Number.isInteger(grams * 10)) return null;
  const [code, name, ...per100g] = row;
  const [kcal, protein, fat, carbs] = per100g.map(value => value === null ? null : Number((value * grams / 100).toFixed(6)));
  if (kcal > 10000 || [protein, fat, carbs].some(value => value > 1000)) return null;
  return { id: 'ingredient-' + code + '-' + grams, name, amount: grams + 'g', kcal, protein, fat, carbs, icon: 'meal' };
}
