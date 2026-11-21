import { exerciseById } from './exercise-catalog.js';
import { BOOKMARK_DAYS } from './training-notebook.js';
import { PARTS } from './rules.js';
import { derive, dayNumber, today, uniqueRecords, mealDetail } from './model.js';
import { partShape } from './character-mesh.js';
import { personalBests } from './personal-bests.js';
import { patternInsight } from './insights.js';
import { DAY_MILESTONES } from './journey.js';
import { selectRareReaction, RARE_LINES, SPIRIT_LINES } from './speech-catalog.js';
import { forecastReaction } from './forecast.js';
import { storyMemory } from './story-memory.js';
import { addedRecords } from './comparison.js';

import { dailySpirit } from './spirit.js';
import { continuedDates, todayChecks } from './diet-summary.js';

function spiritVoice({ level, reason }, date, id = `spirit.${reason}`) {
  const lines = SPIRIT_LINES[reason];
  return { id, line: lines[dayNumber(date) % lines.length], expression: level === 'great' ? 'proud' : 'normal', spirit: level };
}

function feedbackVoice(state, feedback, date) {
  if (feedback.kind === 'meal' || feedback.kind === 'weight') {
    const recordDate = feedback.date || date;
    return spiritVoice(dailySpirit(todayChecks(state, recordDate)), recordDate, feedback.id);
  }
  return { id: feedback.id, entries: feedback.entries, line: feedback.line, expression: feedback.expression, insight: feedback.insight };
}

function speak(result, id, line) {
  Object.assign(result, { id, line, entries: [{ id, line }] });
}

export function personalBestLine(best) {
  if (best.weight && best.volume) return '重さも今日の合計回数も、これまでの自分を超えたな。自己ベストだ！';
  return best.weight ? '重さの自己ベストだ。積み重ねが記録に残ったな！' : '今日の合計回数が自己ベストだ。分けて残した記録も、ちゃんと足してあるぞ。';
}

const rounded = n => Math.round(n * 1e8) / 1e8;
// 週2回の3〜4日間隔では、通常の回想を引き続き使う。
const RETURN_INTERVAL_DAYS = 5;
function latestWorkoutThrough(records, date) {
  let last = null;
  for (const record of records) {
    if (record.date > date) continue;
    if (!last || record.date > last.date ||
        (record.date === last.date && Date.parse(record.createdAt) >= Date.parse(last.createdAt))) last = record;
  }
  return last;
}

function workoutDetail(records, exercise) {
  const detail = record => `${record.count}${exercise.unit}${records.length === 1 || record.sets !== 1 ? ` × ${record.sets}セット` : ''}${record.weight !== null ? ` · ${record.weight}kg` : ''}`;
  if (records.length === 1) return detail(records[0]);
  const shown = records.slice(0, 3).map((record, index) => `${index + 1}: ${detail(record)}`).join(' / ');
  const remainingSets = records.slice(3).reduce((sum, record) => sum + record.sets, 0);
  return shown + (remainingSets ? ` / ほか${remainingSets}セット（履歴で確認）` : '');
}

function savedPersonalBest(beforeState, afterState, records, date) {
  const bests = personalBests(afterState, date);
  // 日単位の印は1件だけ。createdAtが同じときは最後に入力した行以外に付くこともある。
  const best = records.map(record => bests[record.id]).find(Boolean);
  if (!best) return null;
  const priorWeights = uniqueRecords(beforeState.workouts).filter(record => record.date === records[0].date && record.exerciseId === records[0].exerciseId && record.weight !== null).map(record => record.weight);
  const weight = best.weight && (!priorWeights.length || best.weightValue > Math.max(...priorWeights));
  // 低い重量を追加しただけなら、その日の既存の重量PBを新しい更新として繰り返さない。
  return weight || best.volume ? { ...best, weight } : null;
}
const bodyPride = {
  chest: 'おれの胸、ちょっと頼もしくなったろ？',
  back: '後ろ姿も、ちょっと見てみな。',
  shoulders: 'この肩、ちょっと見せたくなるな。',
  arms: 'この腕、なかなかだろ？',
  abs: 'お腹まわりも、育ってきたな。',
  glutes: '後ろ姿もちょっと変わったぞ。',
  thighs: 'この脚、頼りになりそうだろ？',
  calves: '足もとまで、育ってきたな。',
};

// 回数ではなく実施日の集合で数える。同日の追加で「続けた日」は増やさない。
export function trainingMemory(state, exerciseId, date = today()) {
  const records = uniqueRecords(state.workouts).filter(r => r.exerciseId === exerciseId && r.date <= date);
  return { days: new Set(records.map(r => r.date)).size, sameDayRecords: records.filter(r => r.date === date).length };
}

// 記録の事実だけを使う。上限到達・過去入力・編集を、新しい成長と取り違えない。
export function recordFeedback(beforeState, afterState, event, date = today(), { retrospective = false, random = null } = {}) {
  if (!event) return null;
  const records = addedRecords(beforeState, afterState, event);
  if (['workout', 'meal', 'weight'].includes(event.kind) && (!records || records[0].date > date)) return null;
  const before = derive(beforeState, date), after = derive(afterState, date);
  const changes = PARTS.map(p => ({ id: p.id, name: p.name, xp: rounded(after.parts[p.id].xp - before.parts[p.id].xp), from: before.parts[p.id].level, to: after.parts[p.id].level })).filter(p => p.xp !== 0);
  const result = { kind: event.kind, date: event.date || date, changes, totalXP: rounded(after.totalXP - before.totalXP), recordIds: records?.map(record => record.id) || [], label: '', detail: '', line: '', expression: 'normal', current: true };
  const positive = changes.filter(p => p.xp > 0);
  result.changedPartsAtMax = positive.length > 0 && positive.every(p => partShape(before.parts[p.id]) >= 999);
  const levels = changes.filter(p => p.to > p.from);
  result.stageChanges = ['workout', 'meal'].includes(event.kind) ? PARTS.filter(p => after.parts[p.id].stage > before.parts[p.id].stage).map(p => ({ id: p.id, name: p.name, from: before.parts[p.id].stage, to: after.parts[p.id].stage })) : [];
  if (event.kind === 'weight') {
    const [record] = records;
    return { ...result, date: record.date, label: '体重を記録', detail: `${record.kg}kg` };
  }
  if (event.kind === 'rest') return { ...result, id: 'rest', label: '休養日を記録', detail: '獲得したレベルは、そのまま。', line: '今日は休みか。じゃ、おれものんびりする。', expression: 'rest' };
  if (event.kind === 'edit') {
    const edited = { ...result, id: 'record.edit', label: '記録を変更', detail: '変更した内容で、経験値と自己ベストを計算し直しました。', line: '記録、直しておいたぞ。これでよし。' };
    if (event.id === undefined) return edited;
    const workout = afterState.workouts.find(record => record.id === event.id);
    if (workout) {
      const exercise = exerciseById(afterState, workout.exerciseId);
      return exercise ? { ...edited, date: workout.date, recordIds: [workout.id], personalBest: personalBests(afterState, date)[workout.id], unit: exercise.unit, label: `${exercise.name}の記録を変更`, detail: workoutDetail([workout], exercise) } : null;
    }
    const meal = afterState.meals.find(record => record.id === event.id);
    return meal ? { ...edited, date: meal.date, recordIds: [meal.id], label: `${meal.name}の記録を変更`, detail: mealDetail([meal]) } : null;
  }
  if (event.kind === 'workout') {
    const record = records.find(record => record.id === event.id);
    const ex = exerciseById(afterState, record.exerciseId);
    const savedSets = records.reduce((sum, record) => sum + record.sets, 0);
    result.personalBest = savedPersonalBest(beforeState, afterState, records, date);
    result.unit = ex.unit;
    Object.assign(result, { date: record.date, label: `${ex.name}${records.length > 1 ? ` ${savedSets}セット` : ''}を記録`, detail: workoutDetail(records, ex), expression: result.totalXP > 0 ? 'proud' : 'normal' });
    const previous = uniqueRecords(beforeState.workouts).filter(r => r.date <= record.date);
    const lastDate = latestWorkoutThrough(previous, record.date)?.date;
    const returning = record.date === date && lastDate && dayNumber(date) - dayNumber(lastDate) >= RETURN_INTERVAL_DAYS;
    const memory = trainingMemory(afterState, record.exerciseId, record.date);
    const priorMemory = trainingMemory(beforeState, record.exerciseId, record.date);
    if (!retrospective && !priorMemory.sameDayRecords) {
      // A backdated entry can complete the third day of an existing set of records.
      const totalDays = record.date === date ? memory.days : trainingMemory(afterState, record.exerciseId, date).days;
      if (totalDays === 1 || totalDays === BOOKMARK_DAYS) {
        result.notebookExerciseId = ex.id;
        result.notebookBookmark = totalDays === BOOKMARK_DAYS;
      }
    }
    result.trainingDays = memory.days;
    result.recordsOnDate = memory.sameDayRecords;
    const changedShape = changes.find(p => after.parts[p.id].stage > before.parts[p.id].stage);
    const favoritePart = PARTS.find(p => p.id === ex.primary[0]);
    const primaryGrew = partShape(after.parts[favoritePart.id]) > partShape(before.parts[favoritePart.id]);
    const proudOf = changedShape ? bodyPride[changedShape.id] : memory.days % 5 === 0 && primaryGrew && after.parts[favoritePart.id].stage > 0 ? bodyPride[favoritePart.id] : `${favoritePart.name}はLv.${after.parts[favoritePart.id].level}だ。なかなかだろ？`;
    if (result.totalXP === 0) speak(result, 'workout.capped', `${record.date === date ? '今日' : 'この日'}の経験値は上限だ。記録はちゃんと残したぞ。`);
    else if (record.date !== date) speak(result, 'workout.past', `${Number(record.date.slice(5, 7))}月${Number(record.date.slice(8))}日の分だな。受け取ったぞ。`);
    else if (!beforeState.workouts.length) speak(result, 'workout.first', changedShape ? `最初の一歩で${changedShape.name}がLv.${changedShape.to}に！ちょっと見直したろ？` : '最初の一歩だな。おれがどう育つか、楽しみにしとけよ。');
    else if (returning) speak(result, 'workout.return', `また一緒にできたな。今日の${ex.name}も、ここに残しておくぞ。`);
    else if (priorMemory.sameDayRecords > 0) speak(result, 'workout.additional', `${records.length > 1 ? `${savedSets}セット、まとめて残したぞ。` : ''}今日の${ex.name}は${memory.sameDayRecords}件。${levels.length ? `${levels[0].name}はLv.${levels[0].to}に。おれも少し得意げだぜ。` : `おれの${changes[0]?.name || favoritePart.name}にも、力が届いてるぞ。`}`);
    else if (memory.days > 1) speak(result, 'workout.continued', `${ex.name}を記録した日、これで${memory.days}日。${proudOf}`);
    else speak(result, 'workout.new-exercise', `${ex.name}は初めてだな。${changedShape ? bodyPride[changedShape.id] : 'おれの育ち方も、少し変わっていきそうだな。'}`);
    if (result.personalBest) {
      const line = personalBestLine(result.personalBest).replace('合計回数', ex.unit === '秒' ? '合計秒数' : '合計回数').replace('回数×セット', ex.unit === '秒' ? '秒数×セット' : '回数×セット').replace('今日の', record.date === date ? '今日の' : 'この日の');
      result.line += ` ${line}`;
      result.entries.push({ id: result.personalBest.weight && result.personalBest.volume ? 'best.both' : result.personalBest.weight ? 'best.weight' : 'best.volume', line });
      result.expression = 'proud';
    }
    const continued = continuedDates(afterState, date);
    const reachedMilestone = DAY_MILESTONES.includes(continued.length) && continuedDates(beforeState, date).length < continued.length;
    const important = !previous.length || record.date !== date || result.totalXP === 0 || result.personalBest || changedShape || returning || reachedMilestone || (memory.days > priorMemory.days && memory.days % 5 === 0);
    result.canNotice = !important && !after.paused && !afterState.restDays.includes(date);
    if (!retrospective && result.canNotice) {
      result.forecast = forecastReaction(afterState, positive.map(p=>p.id), date, after);
      if (result.forecast) speak(result, result.forecast.id, result.forecast.line);
      else {
        result.insight = patternInsight(beforeState, afterState, record, date);
        if (result.insight) speak(result, result.insight.id, result.insight.line);
      }
    }
    // 初回入力だけで1日の機会を確定。自己ベストや入力の分割数で抽選回数を変えない。
    if (!retrospective && typeof random === 'function' && record.date === date && !beforeState.workouts.some(r => r.date === date) && !afterState.collection?.rareDays?.some(r => r.date === date)) {
      const eligible = previous.length > 0 && !(lastDate && dayNumber(date) - dayNumber(lastDate) >= 7) && !after.paused && !afterState.restDays.includes(date);
      const rare = eligible ? selectRareReaction(random, afterState.collection?.heard) : null;
      result.rareDraw = { date, id: rare?.id || null };
    }
    // 画面外で当たった返事を次の入力で失わない。初めて実際に読むまで同じ返事を添える。
    const pending = record.date === date ? afterState.collection?.rareDays?.find(r => r.date === date && r.id && !afterState.collection.heard.some(h => h.id === r.id)) : null;
    const rareId = result.rareDraw?.id || pending?.id;
    if (rareId) {
      const rare = { id: rareId, line: RARE_LINES[Number(rareId.split('.')[1]) - 1] };
      result.line += ` ${rare.line}`; result.entries.push(rare); result.rare = rare;
    }
    return result;
  }
  if (event.kind === 'meal') {
    result.date = records[0].date;
    result.label = `${event.name || (records.length === 1 ? records[0].name : `食事${records.length}件`)}を記録`;
    result.detail = mealDetail(records);
    const previouslyLogged = beforeState.meals.some(r => r.date === result.date);
    const hasWorkout = afterState.workouts.some(r => r.date === result.date);
    const day = result.date === date ? '今日' : `${Number(result.date.slice(5, 7))}月${Number(result.date.slice(8))}日`;
    result.mealEffect = result.totalXP > 0 ? 'bonus' : hasWorkout && previouslyLogged ? 'already' : 'food-only';
    result.note = result.mealEffect === 'bonus' ? `${day}の筋トレ分に +${result.totalXP}XP · 食事ボーナス`
      : result.mealEffect === 'already' ? '食事ボーナスは反映済み · 1日10%まで'
      : '食事の記録を保存 · 筋トレXPの追加はありません';
    result.line = result.mealEffect === 'bonus' ? `${day}の筋トレに、食事ボーナスで+${result.totalXP}XPだ。`
      : result.mealEffect === 'already' ? '食事の記録、追加したぞ。1日10%のボーナスは反映済みだ。'
      : previouslyLogged ? '食事の足あと、もうひとつ残したぞ。' : '食事の足あとを残したぞ。';
    result.id = `meal.${result.mealEffect === 'bonus' ? 'bonus' : result.mealEffect === 'already' ? 'already' : previouslyLogged ? 'additional' : 'first'}`;
    result.expression = result.totalXP > 0 ? 'proud' : 'normal';
    return result;
  }
  return null;
}

// 再読み込み時も最近の記録を表示。差分は現在の記録から再計算し、保存値に依存しない。
export function recentFeedback(state, date = today()) {
  // 同じミリ秒に複数セットを保存した場合は、配列の後ろに追加した行を直近1件とする。
  const recent = [...state.workouts.map(r => ({ record: r, kind: 'workout' })), ...state.meals.map(r => ({ record: r, kind: 'meal' }))]
    .reverse().sort((a, b) => b.record.createdAt.localeCompare(a.record.createdAt))[0];
  if (!recent) return null;
  const key = recent.kind === 'workout' ? 'workouts' : 'meals';
  const before = { ...state, [key]: state[key].filter(r => r.id !== recent.record.id) };
  const result = recordFeedback(before, state, { kind: recent.kind, id: recent.record.id, ids: [recent.record.id] }, date, { retrospective: true });
  return result ? { ...result, current: false, stageChanges: [] } : null;
}

export function companionVoice(state, summary, feedback, date = today(), arrival = null) {
  if (feedback?.current && ['workout', 'meal', 'weight'].includes(feedback.kind) && arrival) return { id: 'milestone.14', line: arrival + (feedback.rare ? ` ${feedback.rare.line}` : ''), entries: [{id:'milestone.14',line:arrival}, ...(feedback.rare ? [feedback.rare] : [])], expression: 'proud' };
  if (feedback?.current) return feedbackVoice(state, feedback, date);
  if (summary.paused || state.restDays.includes(date)) return { id: 'rest', line: '今日は休みか。じゃ、おれものんびりする。', expression: 'rest' };
  if (feedback?.date === date) return feedbackVoice(state, feedback, date);
  const last = latestWorkoutThrough(state.workouts, date);
  if (last && dayNumber(date) - dayNumber(last.date) >= RETURN_INTERVAL_DAYS) {
    const exercise = exerciseById(state, last.exerciseId);
    if (exercise) {
      const line = `おかえり。${exercise.name}のページ、開いて待ってたぞ。`;
      return { id:'home.return', line, expression:'normal', returnExerciseId:exercise.id };
    }
  }
  const spirit = dailySpirit(todayChecks(state, date));
  if (spirit.reason !== 'none') return spiritVoice(spirit, date);
  if (summary.workoutDays) {
    const memory = storyMemory(state, date);
    if (memory) return memory;
    const strongest = [...PARTS].sort((a, b) => summary.parts[b.id].xp - summary.parts[a.id].xp)[0];
    return { id: 'home.summary', line: `一緒に鍛えた日が${summary.workoutDays}日。おれの${strongest.name}はLv.${summary.parts[strongest.id].level}だ。ここまで育てたんだな。`, expression: 'normal' };
  }
  if (state.weights.length || state.meals.length || state.restDays.length) return spiritVoice(spirit, date);
  return { id: 'home.hello', line: 'よっ、今日から相棒だな。まずは今日の体重を記録してみようぜ。', expression: 'normal' };
}
