// IDは文面や数値から作らない。意味が同じ文型は文言の修正後も同じIDを使う。
const entry = (id, group, hint) => ({ id, group, hint });
export const RARE_LINES = Object.freeze([
  '今日の記録、受け取ったぞ。おれたちの物語が、また一行増えたな。',
  '記録がひとつ増えるたび、おれもここにいる理由が増える気がするんだ。',
  '今のひとがんばり、ちゃんと見届けたぞ。今日はそれを、おれが覚えておく。',
  'この記録も、いつか懐かしくなるのかな。未来のおれたちに、残しておこうぜ。',
  'ひとりで残した記録も、ここではふたりの足あとだ。相棒って、そういうものだろ？',
]);
export const SPIRIT_LINES = Object.freeze({
  none: ['よっ、相棒。今日はここでのんびりしてるぜ。', 'ひと息ついていくか？ おれもここにいるぜ。'],
  weight: ['体重、書き留めたな。また一緒に見返そうぜ。', '体重の記録、受け取ったぜ。今日のページができたな。'],
  meal: ['食事の記録だ！ 一緒の食卓を思い浮かべるとうれしいぜ。', '何を食べたか残してくれたんだな。おれもごきげんだぜ！'],
  workout: ['筋トレの記録、見たぜ。今日も一緒に動けたな。', '鍛えた日の足あとが残ったな。また一緒に見返そうぜ。'],
  mixed: ['いろんな記録が並んだな！ 一緒に見返すのが楽しみだぜ。', 'この日のページ、にぎやかだな。おれまでうれしくなるぜ！'],
});
export const SPEECH_CATALOG = Object.freeze([
  entry('home.hello','いつものことば','初めて相棒に会うと…'),
  ...Object.keys(SPIRIT_LINES).map(reason => entry(`spirit.${reason}`, 'いつものことば', '相棒とその日の記録を振り返ると…')),
  entry('home.summary','いつものことば','記録を重ね、別の日に相棒に会うと…'),
  entry('home.return','いつものことば','しばらく空いて、相棒に会うと…'),
  // 選択ごとの収集枠を増やさず、最初に実際に聞いた旅のことばを1つ残す。
  entry('story.memory','旅のことば','物語で返事をした後、別の日に相棒に会うと…'),
  entry('rest','いつものことば','休養日や休養モードにすると…'),
  entry('record.edit','いつものことば','保存した記録を直すと…'),
  ...[
    ['first','初めて筋トレを記録すると…'], ['past','過去の日の筋トレを残すと…'],
    ['capped','日ごとのXP上限後にも記録があると…'], ['return','久しぶりに筋トレを記録すると…'],
    ['additional','同じ日に同じ種目を追加すると…'], ['continued','別の日にも同じ種目を記録すると…'],
    ['new-exercise','初めての種目を記録すると…'],
  ].map(([id,hint])=>entry(`workout.${id}`,'筋トレのことば',hint)),
  ...[
    ['bonus','筋トレと同じ日の食事を記録すると…'], ['already','食事ボーナス反映後に食事を追加すると…'],
    ['first','食事だけを記録する日があると…'], ['additional','食事だけの日に、もうひとつ残すと…'],
  ].map(([id,hint])=>entry(`meal.${id}`,'食事のことば',hint)),
  entry('best.weight','小さな節目','同じ種目で重量の自己ベストを更新すると…'),
  entry('best.volume','小さな節目','回数や秒数×セット数の自己ベストを更新すると…'),
  entry('best.both','小さな節目','重量と回数×セット数を同時に更新すると…'),
  entry('milestone.14','小さな節目','一緒に続けた日が14日に届くと…'),
  entry('insight.return','気づきのことば','久しぶりの部位を鍛えると…'),
  entry('insight.total','気づきのことば','同じ種目の合計実施回数が節目に届くと…'),
  entry('insight.weekday','気づきのことば','同じ曜日の記録が3週分になると…'),
  entry('insight.trend','気づきのことば','最近よく鍛える部位があると…'),
  entry('forecast.near','変化の予告','体形の次の段階が近づくと…'),
  entry('forecast.almost','変化の予告','体形の次の段階が、すぐそこになると…'),
  ...RARE_LINES.map((line,i)=>({...entry(`rare.${i+1}`,'ときどきのことば','筋トレを記録したとき、たまに聞けることば。'),line})),
]);
export function selectRareReaction(random = Math.random, heard = []) {
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= .05) return null;
  const unheard = RARE_LINES.map((_,i)=>i).filter(i=>!heard.some(row=>row.id === `rare.${i+1}`));
  const pool = unheard.length ? unheard : RARE_LINES.map((_,i)=>i);
  const index = pool[Math.min(pool.length - 1, Math.floor(roll / .05 * pool.length))];
  return { id: `rare.${index+1}`, line: RARE_LINES[index] };
}
