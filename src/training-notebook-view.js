const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateText = date => `${Number(date.slice(0, 4))}年${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`;
const number = value => value.toLocaleString('ja-JP');

export function notebookOnBench(page, reading = false) {
  return `<button type="button" class="notebook-on-bench${reading ? ' is-reading' : ''}" data-action="notebook" data-id="${page.exercise.id}" aria-label="ふたりの練習ノートを開く。${esc(page.exercise.name)}のページ"><span class="notebook-prop" aria-hidden="true"><i class="notebook-cover"></i><i class="notebook-seat"></i></span><span class="notebook-tag">練習ノート</span></button>`;
}

export function notebookShelf(pages) {
  return pages.length
    ? `<button type="button" class="notebook-shelf" data-action="notebook"><strong>ふたりの練習ノート</strong><span>${pages.length}種目のページを開く ›</span></button>`
    : '<p class="notebook-hint">最初の筋トレを記録すると、庭にふたりの練習ノートが届きます。</p>';
}

function notebookEntry(label, row, exercise) {
  return `<li><div><span>${label}</span><time datetime="${row.date}">${dateText(row.date)}</time></div><p><strong>${number(row.volume)}${exercise.unit}</strong> · ${number(row.sets)}セット${row.weight !== null ? ` · 最大${number(row.weight)}kg` : ''}</p></li>`;
}

export function notebookContent(pages, page) {
  const { exercise, first, bookmark, latest, days } = page;
  const selector = pages.length > 1 ? `<label class="field notebook-picker">ページをめくる<select id="notebook-page" aria-controls="notebook-sheet">${pages.map(p => `<option value="${p.exercise.id}" ${p === page ? 'selected' : ''}>${esc(p.exercise.name)}</option>`).join('')}</select></label>` : '';
  const line = days === 1
    ? `${exercise.name}の最初の一行だ。合わせて${number(first.volume)}${exercise.unit}って書いておいたぞ。`
    : `最初の日は、合わせて${number(first.volume)}${exercise.unit}だったな。あの日のこと、ここに書いてあるぞ。`;
  return `${selector}<article id="notebook-sheet" class="notebook-paper${bookmark ? ' is-bookmarked' : ''}" data-notebook-page="${exercise.id}"><header><span>一緒に記録した ${number(days)}日</span><h3>${esc(exercise.name)}</h3></header><blockquote>「${esc(line)}」</blockquote><ol>${notebookEntry('はじめての日', first, exercise)}${bookmark ? notebookEntry('しおりを挟んだ日', bookmark, exercise) : ''}${latest.date !== first.date && latest.date !== bookmark?.date ? notebookEntry('いちばん最近の日', latest, exercise) : ''}</ol></article>`;
}
