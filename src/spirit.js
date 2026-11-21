export function dailySpirit({ weightKg, mealCount, workoutCount }) {
  const weight = weightKg != null, meal = mealCount > 0, workout = workoutCount > 0;
  if (Number(weight) + Number(meal) + Number(workout) >= 2) return { level: 'great', reason: 'mixed' };
  if (meal) return { level: 'great', reason: 'meal' };
  if (weight) return { level: 'good', reason: 'weight' };
  if (workout) return { level: 'good', reason: 'workout' };
  return { level: 'calm', reason: 'none' };
}
