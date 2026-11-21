const sexConstant = { male: 5, female: -161, unspecified: -78 };
const activityFactor = { low: 1.2, normal: 1.55, high: 1.725 };
const required = ['age', 'sex', 'heightCm', 'weightKg', 'activity'];

function basalMetabolism({ age, sex, heightCm, weightKg }) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant[sex];
}

// 活動量が未入力でも、手入力した目安と基礎代謝は比較できる。
export function roundedBmr(profile) {
  if (profile.age == null || profile.sex == null || profile.heightCm == null || profile.weightKg == null) return null;
  return Math.round(basalMetabolism(profile));
}

export function calorieSuggestion(profile) {
  const missing = required.filter(key => profile[key] == null);
  if (missing.length) return { ok: false, missing };
  const bmr = basalMetabolism(profile);
  const tdee = bmr * activityFactor[profile.activity];
  return { ok: true, bmr: Math.round(bmr), tdee: Math.round(tdee), target: Math.round(Math.max(tdee - 300, bmr)) };
}

export function effectiveTarget(profile, latestKg) {
  const inputs = { ...profile, weightKg: latestKg ?? profile.weightKg };
  if (profile.calorieTarget != null) {
    const bmr = roundedBmr(inputs);
    return { target: profile.calorieTarget, source: 'manual', belowBmr: bmr !== null && profile.calorieTarget < bmr };
  }
  const suggestion = calorieSuggestion(inputs);
  return suggestion.ok ? { target: suggestion.target, source: 'auto', belowBmr: false }
    : { target: null, source: 'none', belowBmr: false };
}
