const format = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format;

export function xpSummaryLabel(changes) {
  const gains = changes.filter(part => part.xp > 0).sort((a, b) => b.xp - a.xp);
  if (!gains.length) return '今日の獲得上限に到達';
  const total = gains.reduce((sum, part) => sum + part.xp, 0);
  return `今日 +${format(total)}XP（${gains.map(part => part.name + format(part.xp)).join('・')}）`;
}
