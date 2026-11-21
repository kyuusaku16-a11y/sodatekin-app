const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export function conversationContent(state, conversation) {
  return `<article class="companion-conversation story-reader"><div class="story-conversation"><small>${esc(conversation.topic)}</small><div class="story-response" role="status" aria-live="polite" tabindex="-1"><p><b>${esc(state.settings.partnerName || '相棒')}</b>${esc(conversation.line)}</p></div></div>${conversation.chapterId ? `<button type="button" class="text-button" data-action="story" data-id="${esc(conversation.chapterId)}">「${esc(conversation.chapterTitle)}」を開く →</button>` : ''}<div class="form-actions"><button type="button" class="button button-light" data-action="close-modal">閉じる</button>${conversation.total > 1 ? '<button type="button" class="button button-primary" data-action="companion-talk-next">別の話</button>' : ''}</div></article>`;
}
