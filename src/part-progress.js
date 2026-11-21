import { exercisesFor } from './exercise-catalog.js';
import { PARTS } from './rules.js';
import { derive, shiftDate, today as currentDate, uniqueRecords, validDate } from './model.js';
import { studioCrop } from './studio-character.js';
import { initialParts } from './comparison.js';

// 400×552の既存描画を切り出す。成長量に合わせて倍率や中心を動かさない。
// 肩・腕は片側、背中・お尻は背面。他の部位も現在の全身の姿から拡大する。
export const PART_PROGRESS_CROPS = Object.freeze({
  chest: Object.freeze({ x: 100, y: 140, width: 200, height: 115, back: false, area: '胸のまわり' }),
  back: Object.freeze({ x: 100, y: 145, width: 200, height: 155, back: true, area: '背中のまわり' }),
  shoulders: Object.freeze({ x: 210, y: 135, width: 140, height: 105, back: false, area: '肩の片側' }),
  arms: Object.freeze({ x: 225, y: 175, width: 130, height: 185, back: false, area: '腕の片側' }),
  abs: Object.freeze({ x: 115, y: 215, width: 170, height: 115, back: false, area: 'お腹のまわり' }),
  glutes: Object.freeze({ x: 100, y: 270, width: 200, height: 115, back: true, area: 'お尻のまわり' }),
  thighs: Object.freeze({ x: 95, y: 325, width: 210, height: 100, back: false, area: '太もものまわり' }),
  calves: Object.freeze({ x: 90, y: 395, width: 220, height: 130, back: false, area: 'ふくらはぎのまわり' }),
});

export function partProgress(state, partId, { today = currentDate() } = {}) {
  const part = PARTS.find(item => item.id === partId);
  if (!part) throw new RangeError('部位を選び直してください。');
  if (!validDate(today)) throw new RangeError('振り返りの日付が正しくありません。');
  const start = shiftDate(today, -27), beforeDate = shiftDate(start, -1);
  const before = derive(state, beforeDate), current = derive(state, today);
  const exerciseIds = new Set(exercisesFor(state).filter(exercise => [...exercise.primary, ...exercise.secondary].includes(partId)).map(exercise => exercise.id));
  const records = uniqueRecords(state.workouts).filter(record => record.date >= start && record.date <= today && exerciseIds.has(record.exerciseId));
  return {
    part, crop: state.settings.bodyType === 'studio' ? { ...PART_PROGRESS_CROPS[partId], ...studioCrop(partId) } : PART_PROGRESS_CROPS[partId], start, through: today,
    before: { parts: initialParts() }, current,
    recent: {
      days: new Set(records.map(record => record.date)).size,
      sets: records.reduce((sum, record) => sum + record.sets, 0),
      xp: Math.round((current.parts[partId].xp - before.parts[partId].xp) * 1e8) / 1e8,
    },
  };
}
