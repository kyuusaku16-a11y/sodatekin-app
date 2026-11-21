// Labels follow the class order embedded in the FoodSeg103 model. A broad label
// such as "fish" is not sufficient to choose a species or its nutrition.
const labels = [
  '', 'キャンディ', 'エッグタルト', 'フライドポテト', 'チョコレート', 'ビスケット', 'ポップコーン', 'プリン', 'アイスクリーム', 'チーズ・バター',
  'ケーキ', 'ワイン', 'ミルクシェイク', 'コーヒー', 'ジュース', '牛乳', 'お茶', 'アーモンド', '小豆', 'カシューナッツ',
  'ドライクランベリー', '大豆', 'くるみ', '落花生', '卵', 'りんご', 'デーツ', 'あんず', 'アボカド', 'バナナ',
  'いちご', 'さくらんぼ', 'ブルーベリー', 'ラズベリー', 'マンゴー', 'オリーブ', '桃', 'レモン', '洋なし', 'いちじく',
  'パイナップル', 'ぶどう', 'キウイ', 'メロン', 'オレンジ', 'すいか', 'ステーキ', '豚肉', '鶏肉・鴨肉', 'ソーセージ',
  '揚げた肉', '羊肉', 'ソース', 'かに', '魚', '貝類', 'えび', '汁物', 'パン', 'とうもろこし',
  'ハンバーガー', 'ピザ', '中華まん', 'ワンタン・餃子', 'パスタ', '麺', 'ごはん', 'パイ', '豆腐', 'なす',
  'じゃがいも', 'にんにく', 'カリフラワー', 'トマト', '昆布', '海藻', 'ねぎ', '青菜', 'しょうが', 'オクラ',
  'レタス', 'かぼちゃ', 'きゅうり', '大根', 'にんじん', 'アスパラガス', 'たけのこ', 'ブロッコリー', 'セロリ', '香草',
  'さやえんどう', 'キャベツ', 'もやし', '玉ねぎ', 'ピーマン・パプリカ', 'いんげん', 'さやいんげん', 'エリンギ', 'しいたけ', 'えのき',
  'ひらたけ', 'マッシュルーム', 'サラダ', '',
];
const catalogIds = new Map([
  [15,'milk'], [17,'almond'], [24,'egg'], [25,'apple'], [29,'banana'], [42,'kiwi'],
  [58,'bread'], [64,'pasta'], [66,'white-rice'], [68,'silken-tofu'], [70,'potato'],
  [73,'tomato'], [87,'broccoli'], [91,'cabbage'],
]);
const countable = new Set([24,25,29,42,73]);
export const PHOTO_SIZE = 768;

function overlap(a, b) {
  const width = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const area = width * height;
  return area / (a.w * a.h + b.w * b.h - area);
}

export function photoCandidates(data, dims) {
  // YOLOv8-seg returns [batch, 4 box coordinates + 104 scores + mask coefficients, anchors].
  const [batch, channels, anchors] = dims;
  if (batch !== 1 || channels !== 4 + labels.length + 32 || data.length !== channels * anchors) throw Error('写真解析モデルの形式を確認してください。');
  const hits = [];
  for (let i = 0; i < anchors; i++) {
    let score = 0, cls = 0;
    for (let k = 0; k < labels.length; k++) {
      const value = data[(k + 4) * anchors + i];
      if (value > score) { score = value; cls = k; }
    }
    if (score < 0.30 || !labels[cls]) continue;
    const w = data[2 * anchors + i], h = data[3 * anchors + i];
    if (w > 0 && h > 0) hits.push({ cls, score, w, h, x: data[i] - w / 2, y: data[anchors + i] - h / 2 });
  }
  const picked = [];
  for (const hit of hits.sort((a,b) => b.score - a.score)) {
    if (picked.every(other => other.cls !== hit.cls || overlap(other, hit) < 0.45)) picked.push(hit);
    if (picked.length >= 40) break;
  }
  const counts = new Map();
  for (const { cls } of picked) counts.set(cls, (counts.get(cls) || 0) + 1);
  return [...counts].slice(0, 15).map(([cls, count]) => ({
    label: labels[cls], suggestedId: catalogIds.get(cls) || null,
    portions: countable.has(cls) && count <= 5 ? count : 1,
  }));
}

export function photoCatalog(foods, references) {
  const ids = new Set(foods.map(food => food.id));
  return [...foods, ...references.filter(food => !ids.has(food.id))];
}

export function initialPhotoRows(items, catalog, presets, references) {
  const standards = new Map([...presets, ...references].map(f => [f.id, f.name]));
  const byClass = new Map(references.filter(f => f.classId !== undefined).map(f => [f.classId, f.id]));
  return items.map(item => {
    const classId = labels.indexOf(item.label);
    const id = item.suggestedId || byClass.get(classId === 96 ? 95 : classId);
    // Never silently map a renamed personal preset to an unrelated food in the image.
    let index = id ? catalog.findIndex(f => f.id === id && f.name === standards.get(id)) : -1;
    if (index < 0) index = catalog.findIndex(f => f.name === item.label);
    return { label: item.label, name: item.label, index, portions: item.portions };
  });
}
