// ゲーム内の仮設定。実際の運動効果・栄養必要量の推定値ではありません。
// 総合レベルは8部位を横断する短期報酬として100XP固定を維持する。
// 1部位66XP/日（基本上限60＋食事10%）なら607実施日で最大体形。
// 運動頻度の推奨ではなくゲームの調整値。レベルの計算は変更しない。
const SHAPE_XP_MAX = 40000;
const SHAPE_EXPONENT = .6;
export const RULES = Object.freeze({ version: 4, partXP: 30, partXPStep: 5, totalXP: 100, dailyCap: 60, primaryXP: 10, secondaryXP: 5, mealBonus: 1.1, graceDays: 7, conditionLoss: 2, conditionRecovery: 10, minCondition: 70, shapeXPMax: SHAPE_XP_MAX, shapeExponent: SHAPE_EXPONENT, shapeXPAnchors: Object.freeze([1, 250, 500, 750, 999].map(shape => SHAPE_XP_MAX * ((shape - 1) / 998) ** (1 / SHAPE_EXPONENT))) });
export const PARTS = [
  { id: 'chest', name: '胸', icon: 'chest' }, { id: 'back', name: '背中', icon: 'back' },
  { id: 'shoulders', name: '肩', icon: 'shoulders' }, { id: 'arms', name: '腕', icon: 'arms' },
  { id: 'abs', name: 'お腹', icon: 'abs' }, { id: 'glutes', name: 'お尻', icon: 'glutes' },
  { id: 'thighs', name: '太もも', icon: 'thighs' }, { id: 'calves', name: 'ふくらはぎ', icon: 'calves' },
];
// The original IDs can be used when exporting to the 12-exercise version.
export const ORIGINAL_EXERCISES = [
  { id: 'pushup', name: '腕立て伏せ', unit: '回', primary: ['chest'], secondary: ['shoulders', 'arms'], count: 10, sets: 3, icon: 'pushup', equipment: '自重', aliases: 'うでたてふせ プッシュアップ' },
  { id: 'squat', name: 'スクワット', unit: '回', primary: ['thighs', 'glutes'], secondary: ['abs'], count: 10, sets: 3, icon: 'squat', equipment: '自重', aliases: '自重スクワット' },
  { id: 'pullup', name: '懸垂', unit: '回', primary: ['back'], secondary: ['arms', 'shoulders'], count: 10, sets: 3, icon: 'dumbbell', equipment: '自重 懸垂バー', aliases: 'けんすい チンニング プルアップ' },
  { id: 'plank', name: 'プランク', unit: '秒', primary: ['abs'], secondary: ['shoulders'], count: 30, sets: 1, icon: 'plank', equipment: '自重', aliases: 'フロントプランク' },
  { id: 'hiplift', name: 'ヒップリフト', unit: '回', primary: ['glutes'], secondary: ['thighs'], count: 10, sets: 3, icon: 'squat', equipment: '自重', aliases: 'グルートブリッジ' },
  { id: 'calfraise', name: 'かかと上げ', unit: '回', primary: ['calves'], secondary: [], count: 15, sets: 3, icon: 'squat', equipment: '自重', aliases: 'かかとあげ カーフレイズ スタンディングカーフレイズ' },
  { id: 'lateral', usesWeight: true, name: '肩の横上げ', unit: '回', primary: ['shoulders'], secondary: [], count: 10, sets: 3, icon: 'dumbbell', equipment: 'ダンベル', aliases: 'かたのよこあげ サイドレイズ ラテラルレイズ' },
  { id: 'curl', usesWeight: true, name: 'アームカール', unit: '回', primary: ['arms'], secondary: [], count: 10, sets: 3, icon: 'dumbbell', equipment: 'ダンベル', aliases: 'ダンベルカール' },
  { id: 'bench', usesWeight: true, name: 'ベンチプレス', unit: '回', primary: ['chest'], secondary: ['shoulders', 'arms'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'バーベル', aliases: 'バーベルベンチプレス' },
  { id: 'row', usesWeight: true, name: 'ダンベルロー', unit: '回', primary: ['back'], secondary: ['arms'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'ダンベル', aliases: 'ワンハンドロー ダンベルロウ' },
  { id: 'lunge', name: 'ランジ', unit: '回', primary: ['thighs', 'glutes'], secondary: ['calves'], count: 10, sets: 3, icon: 'squat', equipment: '自重', aliases: 'フロントランジ' },
  { id: 'crunch', name: '腹筋運動', unit: '回', primary: ['abs'], secondary: [], count: 10, sets: 3, icon: 'plank', equipment: '自重', aliases: 'ふっきんうんどう クランチ' },
];
export const EXERCISES = [
  ...ORIGINAL_EXERCISES,
  { id: 'weighted-pullup', name: '加重懸垂', category: 'weighted', unit: '回', primary: ['back'], secondary: ['arms', 'shoulders'], count: 8, sets: 3, icon: 'dumbbell', equipment: '加重 懸垂バー', usesWeight: true, aliases: 'かじゅうけんすい 加重チンニング' },
  { id: 'weighted-dips', name: '加重ディップス', category: 'weighted', unit: '回', primary: ['chest', 'arms'], secondary: ['shoulders'], count: 8, sets: 3, icon: 'dumbbell', equipment: '加重 平行棒', usesWeight: true, aliases: 'かじゅうでぃっぷす' },
  { id: 'chest-press', name: 'チェストプレス', unit: '回', primary: ['chest'], secondary: ['arms', 'shoulders'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'マシン', usesWeight: true, aliases: 'マシンチェストプレス' },
  { id: 'dumbbell-press', name: 'ダンベルベンチプレス', unit: '回', primary: ['chest'], secondary: ['arms', 'shoulders'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'ダンベル', usesWeight: true, aliases: 'ダンベルプレス' },
  { id: 'incline-dumbbell-press', name: 'インクラインダンベルプレス', unit: '回', primary: ['chest'], secondary: ['arms', 'shoulders'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'ダンベル', usesWeight: true, aliases: 'インクラインプレス インクラインダンベルベンチプレス' },
  { id: 'dumbbell-fly', name: 'ダンベルフライ', unit: '回', primary: ['chest'], secondary: ['shoulders'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'ダンベル', usesWeight: true },
  { id: 'pec-fly', name: 'ペックフライ', unit: '回', primary: ['chest'], secondary: [], count: 10, sets: 3, icon: 'dumbbell', equipment: 'マシン', usesWeight: true, aliases: 'ペックデック ペクトラルフライ チェストフライ' },
  { id: 'cable-crossover', name: 'ケーブルクロスオーバー', unit: '回', primary: ['chest'], secondary: ['shoulders'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'ケーブルマシン', usesWeight: true, aliases: 'ケーブルフライ' },
  { id: 'knee-pushup', name: '膝つき腕立て伏せ', unit: '回', primary: ['chest'], secondary: ['arms', 'shoulders'], count: 10, sets: 3, icon: 'pushup', equipment: '自重', aliases: 'ひざつきうでたてふせ 膝つきプッシュアップ ニープッシュアップ' },
  { id: 'dips', name: 'ディップス', unit: '回', primary: ['chest', 'arms'], secondary: ['shoulders'], count: 8, sets: 3, icon: 'pushup', equipment: '自重 平行棒', aliases: 'ディップ' },
  { id: 'lat-pulldown', name: 'ラットプルダウン', unit: '回', primary: ['back'], secondary: ['arms'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'マシン ケーブル', usesWeight: true, aliases: 'ラットプル ラットプルドウン' },
  { id: 'seated-row', name: 'シーテッドロー', unit: '回', primary: ['back'], secondary: ['arms', 'shoulders'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'マシン ケーブル', usesWeight: true, aliases: 'シーテッドロウ シーテッドローイング ケーブルロー ロープーリー' },
  { id: 'bent-over-row', name: 'ベントオーバーロー', unit: '回', primary: ['back'], secondary: ['arms', 'shoulders'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'バーベル', usesWeight: true, aliases: 'ベントオーバーロウ バーベルロー ベントオーバーローイング' },
  { id: 'back-extension', name: 'バックエクステンション', unit: '回', primary: ['back', 'glutes'], secondary: ['thighs'], count: 10, sets: 3, icon: 'plank', equipment: '自重 バックエクステンションベンチ', aliases: 'はいきん 背筋運動' },
  { id: 'deadlift', name: 'デッドリフト', unit: '回', primary: ['glutes', 'thighs'], secondary: ['back'], count: 8, sets: 3, icon: 'dumbbell', equipment: 'バーベル', usesWeight: true, aliases: 'デットリフト コンベンショナルデッドリフト' },
  { id: 'romanian-deadlift', name: 'ルーマニアンデッドリフト', unit: '回', primary: ['thighs', 'glutes'], secondary: ['back'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'バーベル', usesWeight: true, aliases: 'RDL ルーマニアンデットリフト' },
  { id: 'dumbbell-shoulder-press', name: 'ダンベルショルダープレス', unit: '回', primary: ['shoulders'], secondary: ['arms'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'ダンベル', usesWeight: true, aliases: 'ダンベルオーバーヘッドプレス' },
  { id: 'machine-shoulder-press', name: 'マシンショルダープレス', unit: '回', primary: ['shoulders'], secondary: ['arms'], count: 10, sets: 3, icon: 'dumbbell', equipment: 'マシン', usesWeight: true, aliases: 'ショルダープレスマシン' },
  { id: 'rear-raise', name: 'リアレイズ', unit: '回', primary: ['shoulders'], secondary: ['back'], count: 12, sets: 3, icon: 'dumbbell', equipment: 'ダンベル', usesWeight: true, aliases: 'リアデルトフライ リアデルトレイズ リバースフライ' },
  { id: 'face-pull', name: 'フェイスプル', unit: '回', primary: ['shoulders', 'back'], secondary: ['arms'], count: 12, sets: 3, icon: 'dumbbell', equipment: 'ケーブルマシン', usesWeight: true, aliases: 'フェースプル' },
  { id: 'hammer-curl', name: 'ハンマーカール', unit: '回', primary: ['arms'], secondary: [], count: 10, sets: 3, icon: 'dumbbell', equipment: 'ダンベル', usesWeight: true },
  { id: 'barbell-curl', name: 'バーベルカール', unit: '回', primary: ['arms'], secondary: [], count: 10, sets: 3, icon: 'dumbbell', equipment: 'バーベル', usesWeight: true },
  { id: 'triceps-pushdown', name: 'トライセプスプッシュダウン', unit: '回', primary: ['arms'], secondary: [], count: 10, sets: 3, icon: 'dumbbell', equipment: 'ケーブルマシン', usesWeight: true, aliases: 'ケーブルプレスダウン トライセプスプレスダウン' },
  { id: 'french-press', name: 'フレンチプレス', unit: '回', primary: ['arms'], secondary: [], count: 10, sets: 3, icon: 'dumbbell', equipment: 'ダンベル', usesWeight: true, aliases: 'オーバーヘッドトライセプスエクステンション' },
  { id: 'leg-press', name: 'レッグプレス', unit: '回', primary: ['thighs', 'glutes'], secondary: [], count: 10, sets: 3, icon: 'squat', equipment: 'マシン', usesWeight: true, aliases: 'レッグプレスマシン' },
  { id: 'leg-extension', name: 'レッグエクステンション', unit: '回', primary: ['thighs'], secondary: [], count: 10, sets: 3, icon: 'squat', equipment: 'マシン', usesWeight: true, aliases: 'レッグエクステンションマシン' },
  { id: 'leg-curl', name: 'レッグカール', unit: '回', primary: ['thighs'], secondary: [], count: 10, sets: 3, icon: 'squat', equipment: 'マシン', usesWeight: true },
  { id: 'barbell-squat', name: 'バーベルスクワット', unit: '回', primary: ['thighs', 'glutes'], secondary: ['abs'], count: 10, sets: 3, icon: 'squat', equipment: 'バーベル', usesWeight: true, aliases: 'バックスクワット' },
  { id: 'goblet-squat', name: 'ゴブレットスクワット', unit: '回', primary: ['thighs', 'glutes'], secondary: ['abs'], count: 10, sets: 3, icon: 'squat', equipment: 'ダンベル ケトルベル', usesWeight: true },
  { id: 'bulgarian-squat', name: 'ブルガリアンスクワット', unit: '回', primary: ['thighs', 'glutes'], secondary: [], count: 10, sets: 3, icon: 'squat', equipment: '自重 ベンチ', aliases: 'ブルガリアンスプリットスクワット' },
  { id: 'hip-thrust', name: 'ヒップスラスト', unit: '回', primary: ['glutes'], secondary: ['thighs'], count: 10, sets: 3, icon: 'squat', equipment: 'バーベル ベンチ', usesWeight: true, aliases: 'バーベルヒップスラスト' },
  { id: 'hip-abduction', name: 'ヒップアブダクション', unit: '回', primary: ['glutes'], secondary: [], count: 12, sets: 3, icon: 'squat', equipment: 'マシン', usesWeight: true, aliases: 'アウターサイ 外もも そともも' },
  { id: 'hip-adduction', name: 'ヒップアダクション', unit: '回', primary: ['thighs'], secondary: [], count: 12, sets: 3, icon: 'squat', equipment: 'マシン', usesWeight: true, aliases: 'インナーサイ 内もも うちもも' },
  { id: 'seated-calf-raise', name: 'シーテッドカーフレイズ', unit: '回', primary: ['calves'], secondary: [], count: 15, sets: 3, icon: 'squat', equipment: 'マシン', usesWeight: true, aliases: 'シーテッドカーフレーズ' },
  { id: 'side-plank', name: 'サイドプランク', unit: '秒', primary: ['abs'], secondary: ['shoulders', 'glutes'], count: 30, sets: 1, icon: 'plank', equipment: '自重', aliases: 'サイドブリッジ' },
  { id: 'leg-raise', name: 'レッグレイズ', unit: '回', primary: ['abs'], secondary: [], count: 10, sets: 3, icon: 'plank', equipment: '自重', aliases: 'ライイングレッグレイズ 足上げ腹筋 あしあげふっきん' },
  { id: 'bicycle-crunch', name: 'バイシクルクランチ', unit: '回', primary: ['abs'], secondary: [], count: 10, sets: 3, icon: 'plank', equipment: '自重', aliases: 'バイシクルクランチーズ' },
  { id: 'dead-bug', name: 'デッドバグ', unit: '回', primary: ['abs'], secondary: [], count: 10, sets: 3, icon: 'plank', equipment: '自重', aliases: 'デッドバグエクササイズ デッドバッグ' },
];
export { FOODS } from './foods.js';
// 保存形式v1の、編集されていない初期食品を識別するための値。
export const LEGACY_FOODS = [
  { id: 'protein', name: 'プロテイン', amount: '1杯', protein: 20, icon: 'shaker' },
  { id: 'chicken', name: 'サラダチキン', amount: '1個', protein: 23, icon: 'meal' },
  { id: 'natto', name: '納豆', amount: '1パック', protein: 7, icon: 'meal' },
  { id: 'egg', name: '卵', amount: '1個', protein: 6, icon: 'egg' },
  { id: 'yogurt', name: 'ヨーグルト', amount: '100g', protein: 3.6, icon: 'meal' },
  { id: 'rice', name: 'おにぎり', amount: '1個', protein: 3, icon: 'rice' },
];
