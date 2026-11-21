import { today } from './model.js';

// A headline for the same record difference shown in the receipt. It is not another reward.
// Keep corrections, capped records, old activity and resting homes out of the celebration.
export function growthFocus(feedback, date = today(), { resting = false, visibleParts = [] } = {}) {
  if (!feedback || !['workout', 'meal'].includes(feedback.kind)) return null;
  if (!feedback.current && (feedback.date !== date || resting)) return null;
  if (!(feedback.totalXP > 0)) return null;
  const parts = feedback.changes.filter(part => part.xp > 0);
  if (!parts.length) return null;
  const ordered = [...parts].sort((a, b) => Number(b.to > b.from) - Number(a.to > a.from) || b.xp - a.xp
    || Number(visibleParts.includes(b.id)) - Number(visibleParts.includes(a.id)));
  return { ...ordered[0], levelUp: ordered[0].to > ordered[0].from, otherParts: parts.length - 1, meal: feedback.kind === 'meal', current: !!feedback.current, date: feedback.date };
}
