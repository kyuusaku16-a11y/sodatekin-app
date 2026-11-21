import { dayNumber, today } from './model.js';
import { storyOf } from './story.js';

// ゲーム内で交わした返事だけを思い出す。現実の行動や好みを推測しない。
const lines = Object.freeze({
  'journey-1': {
    scenery: '地図に描いた庭の木、まだブロッコリーに見えるんだよな。景色を残すって、なかなか難しいぜ。',
    footprints: '地図の最初の足あと、ふたり分ちゃんと並んでるぞ。出発点が、すぐ分かるな。',
  },
  'journey-2': {
    front: '地図を開くと、表紙のすぐ後ろにあの葉っぱ。そこに挟もうって話、覚えてるぞ。',
    path: '小道のページに、あそこで拾った葉っぱがある。地図を読むより先に、あの道が浮かぶな。',
  },
  'journey-3': {
    sky: 'ベンチで眺めた雲、マグみたいだったよな。あれを地図に描いても、雲だって分かるかな。',
    map: 'ベンチで眺めた地図、道の線が曲がってただろ。あの曲がり方、けっこう気に入ってるんだ。',
  },
  'journey-4': {
    river: '橋から見た川、地図では点だらけなんだ。きらきらを描こうとすると、こうなるらしい。',
    garden: '橋から見えた庭、地図に丸をつけてあるぞ。小さく見えても、出発点は見失わないな。',
  },
  'journey-5': {
    star: 'コンパスの袋の星、ちょっとふっくらしてるだろ。おかげで、おれのだってすぐ分かる。',
    leaf: 'コンパスの袋の葉っぱ、小道で拾った葉とおそろいだ。目印にも、旅の思い出が増えたな。',
  },
  'journey-6': {
    talk: '星空の下で、最初の日の話をしたな。地図に名前を書く場所で迷ってたの、今でも覚えてるぞ。',
    quiet: 'あの広場で、黙って星を眺めた時間も覚えてるぞ。言葉がなくても、いい時間だったな。',
  },
  'journey-7': {
    breeze: 'そよかぜ号、っていい名前だよな。風車なのに船みたいで、呼ぶとちょっと旅に出たくなる。',
    detour: 'よりみち号。あの風車の名前、気に入ってるぞ。まっすぐじゃない道も、地図に似合うよな。',
  },
  'journey-8': {
    thanks: '地図の最後の「ありがとう」、おれの言葉も隣にあるぞ。あそこを読むと、ちょっと照れるな。',
    again: '「また、ここに来よう」って地図に残したな。展望台の景色、開けばいつでも思い出せるぞ。',
  },
});

// 返事の日時は旧データにないため、自動発話は章の解放翌日以降にする。
// 本人が会話を開いた場合は、当日選んだ返事も振り返れる。日時を台詞で断定しない。
// 記録の削除で未解放に戻った章は、返事や読了の履歴が残っていても候補にしない。
function memoriesOf(book, date, includeToday) {
  return book.earned.filter(chapter => (includeToday || chapter.date < date) && chapter.conversation?.selected).reverse().flatMap(chapter => {
    const choiceId = chapter.conversation.selected.id;
    const line = lines[chapter.id]?.[choiceId];
    return line ? [{ id: 'story.memory', chapterId: chapter.id, chapterTitle: chapter.title, choiceId, line, expression: 'normal' }] : [];
  });
}

export function storyMemories(state, date = today(), { includeToday = false } = {}) {
  if (!Object.keys(state.settings.storyReplies || {}).length) return [];
  return memoriesOf(storyOf(state, date), date, includeToday);
}

// 訪問する暦日で会話の機会を失わない。同じ状態・同じ日は同じ一言にする。
export function storyMemory(state, date = today()) {
  if (!Object.keys(state.settings.storyReplies || {}).length) return null;
  const book = storyOf(state, date);
  const available = memoriesOf(book, date, false);
  if (!available.length) return null;
  const elapsed = dayNumber(date) - dayNumber(book.earned[0].date);
  return available[(elapsed + book.days) % available.length];
}
