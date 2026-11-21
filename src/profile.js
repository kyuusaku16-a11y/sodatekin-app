// すべて任意。身長・体重は従来の保存形式でも必ずキーを持つ。
export const PROFILE_FIELDS = [
  { key: 'heightCm', label: '身長', unit: 'cm', min: 1, max: 300 },
  { key: 'weightKg', label: '体重', unit: 'kg', min: 1, max: 1000 },
  { key: 'age', label: '年齢', unit: '歳', min: 10, max: 100, integer: true },
  { key: 'sex', label: '性別', options: { male: '男性', female: '女性', unspecified: '回答しない' } },
  { key: 'activity', label: '活動量', options: { low: '低い：座り仕事が多い', normal: 'ふつう：週に数回運動', high: '高い：毎日よく動く' } },
  { key: 'calorieTarget', label: '目標カロリー', unit: 'kcal', min: 800, max: 6000, integer: true },
];
export const emptyProfile = () => Object.fromEntries(PROFILE_FIELDS.map(({ key }) => [key, null]));

function validateField(value, field) {
  if (value === null) return null;
  if (field.options) {
    if (typeof value !== 'string' || !Object.hasOwn(field.options, value)) throw new Error(`${field.label}を選択してください。`);
  } else {
    const precisionValid = field.integer ? Number.isInteger(value) : Math.abs(value * 10 - Math.round(value * 10)) <= 1e-8;
    if (!Number.isFinite(value) || value < field.min || value > field.max || !precisionValid) {
      throw new Error(`${field.label}は${field.min}〜${field.max}${field.unit}の${field.integer ? '整数' : '数値（小数第1位まで）'}を入力するか、空欄にしてください。`);
    }
  }
  return value;
}

export function validateProfile(input) {
  if (input === undefined) return emptyProfile();
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('プロフィールの形式が正しくありません。');
  const profile = emptyProfile();
  for (const field of PROFILE_FIELDS) {
    if (field.key === 'heightCm' || field.key === 'weightKg' || Object.hasOwn(input, field.key)) {
      profile[field.key] = validateField(input[field.key], field);
    }
  }
  return profile;
}

export function profileFromForm(data) {
  const profile = emptyProfile();
  for (const field of PROFILE_FIELDS) {
    const text = String(data.get(field.key) ?? '').normalize('NFKC').trim();
    if (!text) continue;
    if (field.options) profile[field.key] = text;
    else {
      if (!(field.integer ? /^\d+$/ : /^\d+(?:\.\d)?$/).test(text)) {
        throw new Error(`${field.label}は${field.integer ? '整数' : '小数第1位までの数字'}で入力してください。単位の入力は不要です。`);
      }
      profile[field.key] = Number(text);
    }
  }
  return validateProfile(profile);
}
