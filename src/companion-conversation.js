import { exerciseById } from './exercise-catalog.js';
import { dayNumber, isPaused, today, uniqueRecords } from './model.js';
import { storyOf } from './story.js';
import { storyMemories } from './story-memory.js';

const dateLabel = (date, current) => `${date.slice(0, 4) === current.slice(0, 4) ? '' : `${date.slice(0, 4)}年`}${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`;
// 実施日を優先。過去入力を「いちばん最近したこと」と取り違えない。
const ordered = records => records.map((record, index) => ({ record, index })).sort((a, b) =>
  a.record.date.localeCompare(b.record.date) || a.record.createdAt.localeCompare(b.record.createdAt) || a.index - b.index).map(item => item.record);

/**
 * 任意の短い会話。記録、選択、現在の日付だけから作り、読む操作を実績にしない。
 * offset は画面内だけの値。「別の話」で現在成立する話題をすべて辿れる。
 * 永続の閲覧履歴を持たないため、再訪ごとの未読保証やコンプリート表示はしない。
 */
export function companionConversation(state, date = today(), { offset = 0 } = {}) {
  const book = storyOf(state, date);
  const workouts = ordered(uniqueRecords(state.workouts).filter(record => record.date <= date && exerciseById(state, record.exerciseId)));
  const meals = ordered(uniqueRecords(state.meals).filter(record => record.date <= date));
  const resting = isPaused(state, date) || state.restDays.includes(date);
  const topics = storyMemories(state, date, { includeToday: true }).map(memory => ({ ...memory, topic: '旅の思い出' }));

  const unanswered = book.earned.find(chapter => !chapter.conversation?.selected);
  if (unanswered) topics.push({
    id: 'conversation.story', topic: '本を開いてみよう', chapterId: unanswered.id, chapterTitle: unanswered.title,
    line: `「${unanswered.title}」に、ふたりの相談を残してあるぞ。読むだけでもいいし、気が向いたら返事を聞かせてくれ。`,
  });

  if (workouts.length) {
    const latest = workouts.at(-1), exercise = exerciseById(state, latest.exerciseId);
    const count = workouts.filter(record => record.date === latest.date && record.exerciseId === latest.exerciseId).reduce((sum, record) => sum + record.count * record.sets, 0);
    topics.push({
      id: 'conversation.latest', topic: '記録をひとつ、振り返る',
      line: `${dateLabel(latest.date, date)}の${exercise.name}、合わせて${count.toLocaleString('ja-JP')}${exercise.unit}が記録に残ってるぞ。ひとつずつの分が、ここに並んでるな。`,
    });
  }
  if (book.days > 1) {
    const { firstDate, firstRecord } = book.earned[0].evidence;
    topics.push({
      id: 'conversation.first', topic: '最初の足あと',
      line: `最初の記録は${dateLabel(firstDate, date)}の${firstRecord}。いまは${book.days}日ぶん、同じ地図に残ってるぞ。`,
    });
  }
  if (meals.length) {
    const latest = meals.at(-1);
    topics.push({
      id: 'conversation.meal', topic: '食事の足あと',
      line: `食事の欄には、${dateLabel(latest.date, date)}の「${latest.name}」。食べたものの足あとも、ちゃんとここに残ってるな。`,
    });
  }
  if (!topics.length) topics.push({
    id: 'conversation.welcome', topic: 'ひと息つこう',
    line: 'よっ。話をしに来たんだな。おれ、ひと息つく係なら得意だぞ。',
  });
  if (resting) topics.unshift({
    id: 'conversation.rest', topic: '今日は、のんびり',
    line: '今日はひと休みだな。ここでも、のんびり話そうぜ。',
  });

  const step = Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
  const start = resting ? 0 : (dayNumber(date) + book.days) % topics.length;
  const position = (start + step % topics.length) % topics.length;
  return { ...topics[position], expression: resting ? 'rest' : 'normal', position: position + 1, total: topics.length };
}
