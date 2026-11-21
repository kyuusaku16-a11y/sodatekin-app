import { continuedDates, firstRecordOn } from './diet-summary.js';
import { exerciseById } from './exercise-catalog.js';
import { STORY_CHAPTERS, STORY_DIALOGUES } from './story-data.js';
import { today, uniqueRecords } from './model.js';

// 解放日と本文の事実は記録から作る。読む・飾る操作は実績を追加しない。
export function storyOf(state, date = today()) {
  const records = uniqueRecords(state.workouts).filter(r => r.date <= date && exerciseById(state, r.exerciseId));
  const dates = continuedDates(state, date);
  const first = dates.length ? firstRecordOn(state, dates[0]) : null;
  const read = new Set(state.collection?.storiesRead || []);
  const chapters = STORY_CHAPTERS.map((chapter, index) => {
    const earnedDate = dates[chapter.days - 1] || null;
    const dialogue = STORY_DIALOGUES[chapter.id];
    const variety = earnedDate ? new Set(records.filter(r => r.date <= earnedDate).map(r => r.exerciseId)).size : 0;
    const values = {
      partner: state.settings.partnerName || '相棒',
      firstRecord: first?.label,
      firstDate: first ? `${first.date.slice(0,4)}年${Number(first.date.slice(5,7))}月${Number(first.date.slice(8))}日` : '',
      varietyLine: !variety ? '記録した日をたどると、ここまでの道が見えるな。' : variety === 1 ? '同じ種目を積み重ねて、ここまで来たんだな。おれ、そういう足あとも好きだぞ。' : `ここまでに残した種目は${variety}種類。いろんな足あとが、おれたちの道になってるな。`,
    };
    return { ...chapter, number: index + 1, earned: !!earnedDate, date: earnedDate, read: read.has(chapter.id), remaining: Math.max(0, chapter.days - dates.length),
      paragraphs: earnedDate ? chapter.paragraphs.map(p => p.replace(/\{(\w+)\}/g, (_,key) => values[key] ?? '')) : [],
      conversation: earnedDate ? { ...dialogue, selected: dialogue.choices.find(c => c.id === state.settings.storyReplies?.[chapter.id]) || null } : null,
      evidence: earnedDate ? { firstDate: first.date, firstExercise: first.exercise, firstRecord: first.label, days: chapter.days, variety } : null,
    };
  });
  const earned = chapters.filter(c => c.earned), unread = earned.filter(c => !c.read), next = chapters.find(c => !c.earned) || null;
  const previousDays = earned.at(-1)?.days || 0;
  return { days: dates.length, chapters, earned, unread, next, featured: unread[0] || earned.at(-1) || chapters[0],
    progress: next ? { value: dates.length - previousDays, max: next.days - previousDays } : null,
    pinned: earned.find(c => c.id === state.settings.storyPin) || null,
  };
}
