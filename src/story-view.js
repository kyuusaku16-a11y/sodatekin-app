import { icon } from './character.js';
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const paths = {
  bookmark: '<path d="M14 7h20v34l-10-7-10 7Z" fill="currentColor" opacity=".18"/><path d="M14 7h20v34l-10-7-10 7Z"/><path d="m19 17 4 4 7-7"/>',
  leaf: '<path d="M36 9C13 8 6 25 18 34 32 44 42 26 36 9Z" fill="currentColor" opacity=".18"/><path d="M36 9C13 8 6 25 18 34 32 44 42 26 36 9ZM10 42 32 16m-9 12-8-1m12-4 1-7"/>',
  mug: '<path d="M10 18h24v16q0 9-12 9T10 34Z" fill="currentColor" opacity=".18"/><path d="M10 18h24v16q0 9-12 9T10 34ZM34 20h5q8 9-5 12M16 6q-5 5 0 8m9-10q-5 5 0 9"/>',
  ribbon: '<path d="m23 24-12 17 0-10-8-1 15-14m8 8 11 17 0-10 8-1-15-14" fill="currentColor" opacity=".18"/><path d="m23 24-12 17 0-10-8-1 15-14m8 8 11 17 0-10 8-1-15-14"/><circle cx="24" cy="17" r="9"/>',
  compass: '<circle cx="24" cy="26" r="17" fill="currentColor" opacity=".15"/><circle cx="24" cy="26" r="17"/><path d="m31 16-4 13-10 7 4-13ZM20 9V5h8v4"/>',
  lantern: '<path d="M14 17h20l3 25H11Z" fill="currentColor" opacity=".2"/><path d="M14 17h20l3 25H11ZM12 13h24M18 12V8a6 6 0 0 1 12 0v4M17 36h14m-7-14v10m-5-5h10"/>',
  pinwheel: '<path d="M24 24 12 8 5 24Zm0 0L40 12 24 5Zm0 0 12 16 7-16Zm0 0L8 36 24 43Z" fill="currentColor" opacity=".15"/><path d="M24 44V24L12 8 5 24Zm0-20L40 12 24 5Zm0 0 12 16 7-16Zm0 0L8 36 24 43Z"/>',
  flag: '<path d="M13 7h25l-7 9 7 9H13" fill="currentColor" opacity=".2"/><path d="M13 42V7h25l-7 9 7 9H13M7 42h20m-7-27 3 3 5-5"/>',
};
export function souvenirIcon(mark) { return `<svg class="souvenir-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[mark] || paths.bookmark}</svg>`; }
function cover(chapter, small = false) {
  return `<div class="story-cover story-${chapter.color} ${small ? 'is-small' : ''}" aria-hidden="true"><span class="story-sun"></span><span class="story-land hill-back"></span><span class="story-land hill-front"></span><span class="story-cover-mark">${souvenirIcon(chapter.mark)}</span></div>`;
}
export function storyPeek(book) {
  const featured = book.unread.at(-1) || book.next || book.featured;
  const label = book.unread.length ? `第${featured.number}話「${featured.title}」が開いた` : book.next ? book.days ? `次のお話まで あと${book.next.remaining}記録日` : '最初の記録で、旅がはじまる' : 'いつでも、旅の思い出へ';
  return `<button type="button" class="story-peek" data-action="story" data-id="${featured.id}">${souvenirIcon(featured.mark)}<span><small>${book.unread.length ? '読めるお話 · ふたりの小さな旅' : 'ふたりの小さな旅'}</small><strong>${label}</strong></span>${icon('chevron')}</button>`;
}
export function pinnedSouvenir(book) {
  const c = book.pinned;
  return c ? `<button type="button" class="story-souvenir story-${c.color}" data-action="story" data-id="${c.id}" aria-label="飾っている${c.gift}のお話を読む" title="${c.gift}">${souvenirIcon(c.mark)}</button>` : '';
}
function nextPreview(book) {
  const c = book.next;
  return c ? `<div class="story-next">${cover(c,true)}<div><small>次に開くお話</small><strong>第${c.number}話　${c.title}</strong><p>${c.teaser}</p><b>あと${c.remaining}記録日</b><span>間が空いても、続きから。</span><progress value="${book.progress.value}" max="${book.progress.max}" aria-label="次のお話までの積み重ね"></progress></div></div>` : '<p class="story-finale">8つのお話が、この本に。お気に入りの場所には、いつでも戻れます。</p>';
}
export function storySection(book) {
  return `<details class="story-section album-shelf" data-journey-section="story"><summary><h2>ふたりの小さな旅<small>${book.unread.length ? `未読${book.unread.length}話 · ${book.unread.at(-1).title}` : book.next ? `次のお話まであと${book.next.remaining}記録日` : `全${book.chapters.length}話の本棚`}</small></h2></summary><p class="story-intro">庭から展望台まで、8つのお話。体重・食事・筋トレを記録した日を重ねると開きます。連続でなくて大丈夫。</p><div class="story-shelf">${book.chapters.map(c => `<button type="button" class="story-book ${c.earned ? 'is-earned' : 'is-locked'}" data-action="story" data-id="${c.id}" aria-label="第${c.number}話 ${c.title}、${c.earned ? c.read ? '読んだお話' : '読めるお話' : `あと${c.remaining}記録日で開く`}">${cover(c,true)}<span class="story-book-number">第${c.number}話</span><strong>${c.title}</strong><small>${c.earned ? c.read ? 'しおりを挟んだお話' : '読めるようになりました' : `累計${c.days}日で開く`}</small></button>`).join('')}</div>${nextPreview(book)}</details>`;
}
function storyConversation(chapter, partner) {
  const c = chapter.conversation;
  if (!c) return '';
  return `<section class="story-conversation" aria-label="相棒とのやり取り"><small>${esc(partner)}から、ひとつ相談</small><h4>${c.question}</h4><div class="story-choices">${c.choices.map(choice => `<button type="button" data-action="story-reply" data-id="${chapter.id}" data-choice="${choice.id}" aria-pressed="${c.selected?.id === choice.id}">${choice.label}</button>`).join('')}</div>${c.selected ? `<div class="story-response" role="status" tabindex="-1"><small>あなた：「${c.selected.label}」</small><p><b>${esc(partner)}</b>「${c.selected.reply}」</p></div>` : ''}<p class="story-choice-note">返事はあとで変えられます。読むだけでも大丈夫。</p></section>`;
}
export function storyContent(state, book, id) {
  const c = book.chapters.find(chapter => chapter.id === id) || book.featured;
  const previous = book.chapters[c.number - 2], next = book.chapters[c.number];
  return `<article class="story-reader" data-story-id="${c.id}">${cover(c)}<p class="story-chapter-number">第${c.number}話 / 8</p><h3>${c.title}</h3>${c.earned ? `<time datetime="${c.date}">${c.date.replaceAll('-','/')} · 累計${c.days}記録日で開いたお話</time><div class="story-prose">${c.paragraphs.map(p=>`<p>${esc(p).replaceAll('\n','<br>')}</p>`).join('')}</div>${storyConversation(c, state.settings.partnerName)}<div class="story-fact">${icon('history')}<p>ふたりの最初の記録<br><b>${esc(c.evidence.firstDate.replaceAll('-','/'))} · ${esc(c.evidence.firstRecord)}</b></p></div><div class="story-gift">${souvenirIcon(c.mark)}<div><small>このお話の記念品</small><strong>${c.gift}</strong></div><button class="button button-light" data-action="story-pin" data-id="${c.id}" aria-pressed="${book.pinned?.id === c.id}">${book.pinned?.id === c.id ? '飾りを外す' : '相棒のそばに飾る'}</button></div><div class="story-read-action" tabindex="-1">${c.read ? '<span>✓ このお話に、しおりを挟みました</span>' : `<button class="button button-primary" data-action="story-read" data-id="${c.id}">読んだよ</button>`}</div>` : `<div class="story-locked"><p>${c.teaser}</p><strong>${book.days || c.days !== 1 ? `あと${c.remaining}記録日で、このお話が開きます。` : '最初の記録から、物語がはじまります。'}</strong><p>一日の記録を分けても、旅は一歩。読む日も、記録する日も、自分のペースで。</p><span>お話の記念品：${c.gift}</span></div>`}${c.earned ? nextPreview(book) : ''}<nav class="story-page-nav" aria-label="お話を選ぶ">${previous ? `<button class="text-button" data-action="story" data-id="${previous.id}">← 第${previous.number}話</button>` : '<span></span>'}${next ? `<button class="text-button" data-action="story" data-id="${next.id}">${next.earned ? '次のお話' : '次の表紙'} →</button>` : '<span></span>'}</nav><button type="button" class="button button-light story-close" data-action="close-modal">本を閉じる</button><p class="story-note">これは相棒とのゲーム内の物語です。開くお話と記念品は、今ある実施記録に合わせて変わります。読んだお話のしおりは残ります。</p></article>`;
}
