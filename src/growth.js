import { RULES } from './rules.js';

export const SHAPE_ANCHORS = Object.freeze([1, 250, 500, 750, 999]);
// 数字のレベルとは独立した長期カーブ。プレビューも同じ1〜999で描画する。
export function shapeFromXP(xp = 0) {
  const value = Number.isFinite(xp) ? Math.max(0, Math.min(RULES.shapeXPMax, xp)) : 0;
  return 1 + 998 * (value / RULES.shapeXPMax) ** RULES.shapeExponent;
}
// 逆算したXP境界で判定し、浮動小数点の丸めで到達が遅れないようにする。
export const growthStage = xp => RULES.shapeXPAnchors.findLastIndex(anchor => (Number.isFinite(xp) ? Math.max(0, xp) : 0) >= anchor);

export const levelCost = level => RULES.partXP + (level - 1) * RULES.partXPStep;
export const levelStartXP = level => (level - 1) * (2 * RULES.partXP + (level - 2) * RULES.partXPStep) / 2;
export function partLevel(xp, legacyXP = 0) {
  // 旧記録から得たレベルと、そのレベル内の進捗割合を維持する。
  // レベル値を保存せず旧記録のXPから再計算するので、訂正・削除にも追従する。
  const legacy = Math.max(0, Math.min(xp, legacyXP));
  const oldLevel = 1 + Math.floor(legacy / RULES.partXP);
  const earned = Math.round((xp - legacy + levelStartXP(oldLevel) + (legacy % RULES.partXP) / RULES.partXP * levelCost(oldLevel)) * 1e8) / 1e8;
  const b = RULES.partXP - RULES.partXPStep / 2;
  let level = 1 + Math.floor((Math.sqrt(b * b + 2 * RULES.partXPStep * earned) - b) / RULES.partXPStep);
  while (levelStartXP(level + 1) <= earned) level++;
  while (levelStartXP(level) > earned) level--;
  return { level, progress: Math.round((earned - levelStartXP(level)) * 1e8) / 1e8, nextXP: levelCost(level) };
}
