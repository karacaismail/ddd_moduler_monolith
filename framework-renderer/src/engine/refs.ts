/**
 * Inline markup resolver.
 *
 * Desteklenen mini-markdown:
 *   **bold**         -> <strong>
 *   *italic*         -> <em>
 *   `code`           -> <code>
 *   {{ref:id}}       -> <a href="#id"> (label registry'den çözülür)
 *   [text](url)      -> <a href="url" target="_blank" rel="noopener">
 *
 * HTML escape yapılır; renderer güvenli innerHTML kullanabilir.
 */

export type RefResolver = (id: string) => { title: string; cluster: string } | null;

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}

/** Bir token tipinde inline markup'ı işle, HTML döndür. */
export function resolveInlineMarkup(text: string, resolveRef: RefResolver): string {
  // Escape first
  let out = escapeHtml(text);

  // {{ref:id}}
  out = out.replace(/\{\{ref:([a-z0-9-]+)\}\}/g, (_, id: string) => {
    const target = resolveRef(id);
    if (!target) {
      console.warn(`[refs] unresolved ref: ${id}`);
      return `<span class="ref ref--missing" title="ref bulunamadı: ${id}">${id}</span>`;
    }
    return `<a class="ref ref--internal" href="#${id}" data-ref-id="${id}">${escapeHtml(target.title)}</a>`;
  });

  // [text](url) — external link
  out = out.replace(
    /\[([^\]]+)\]\(((?:https?:|mailto:)[^)\s]+)\)/g,
    (_, txt: string, url: string) =>
      `<a class="link link--external" href="${url}" target="_blank" rel="noopener">${txt}</a>`,
  );

  // `code` (inline)
  out = out.replace(/`([^`]+)`/g, (_, code: string) => `<code>${code}</code>`);

  // **bold**
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, b: string) => `<strong>${b}</strong>`);

  // *italic*
  out = out.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, (_m, lead: string, em: string) => `${lead}<em>${em}</em>`);

  // ~~strikethrough~~
  out = out.replace(/~~([^~]+)~~/g, (_, s: string) => `<del>${s}</del>`);

  // ==highlight==
  out = out.replace(/==([^=]+)==/g, (_, s: string) => `<mark>${s}</mark>`);

  // newlines inside paragraph
  out = out.replace(/\n/g, '<br/>');

  return out;
}

/**
 * Block-level markdown — paragraf bloğu için.
 * Listeler, blok-quote, başlık gibi unsurları paragraf gövdesinde işler.
 * Şu an çok hafif: > quote ve - liste başlangıcı.
 * Daha fazlası için `marked` paketi entegre edilecek (deferred).
 */
export function resolveBlockMarkup(text: string, resolveRef: RefResolver): string {
  // Önce inline pas
  const inline = resolveInlineMarkup(text, resolveRef);
  // > quote bloğu — satır başında "&gt; "
  let out = inline.replace(/(^|<br\/>)&gt;\s+([^<]+?)(?=<br\/>|$)/g,
    (_, lead: string, q: string) => `${lead}<blockquote>${q}</blockquote>`);
  // - liste başlangıçları (basit, iç içe değil) — peş peşe satırları <ul> içine al
  out = out.replace(/((?:(?:^|<br\/>)- [^<]+)+)/g, (m) => {
    const items = m.split(/(?:^|<br\/>)- /).filter(Boolean);
    return '<ul>' + items.map((it) => `<li>${it}</li>`).join('') + '</ul>';
  });
  return out;
}
