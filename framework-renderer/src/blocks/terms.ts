import type { BlockRenderer } from '@/engine/registry';
import { registerDetail } from '@/components/detail-panel';
import type { Term } from '@/types/content';

type Block = { type: 'terms'; title?: string; terms: Term[] };

export const termsRenderer: BlockRenderer<Block> = (block, ctx) => {
  const wrap = document.createElement('div');
  wrap.className = 'block-terms';
  const h = document.createElement('h5');
  h.className = 'block-terms__title';
  h.innerHTML = `<i class="ph ph-book-open-text"></i> ${block.title ?? 'Terim sözlüğü'}`;
  wrap.appendChild(h);

  const dl = document.createElement('dl');
  dl.className = 'block-terms__dl';
  for (const t of block.terms) {
    // Terim için detay panele tek kayıt
    const dk = registerDetail({
      contextLabel: ctx.cluster.title,
      title: t.term + (t.abbrev_of ? ` (${t.abbrev_of})` : ''),
      summary: t.abbrev_tr,
      detail: `**Anlamı:** ${t.meaning}${t.why ? `\n\n**Neden bu kavram önemli?** ${t.why}` : ''}`,
      terms: [t],
    });
    // Bir wrapper div ile dt+dd'yi sarıp tıklanır yapalım
    const pair = document.createElement('div');
    pair.className = 'block-terms__pair';
    if (dk) {
      pair.dataset.detailKey = dk;
      pair.classList.add('is-clickable');
      pair.setAttribute('role', 'button');
      pair.setAttribute('tabindex', '0');
    }
    const dt = document.createElement('dt');
    dt.innerHTML = `<strong>${escapeHtml(t.term)}</strong>${
      t.abbrev_of
        ? ` <span class="term__abbrev">= ${escapeHtml(t.abbrev_of)}</span>${
            t.abbrev_tr ? ` <span class="term__tr">(${escapeHtml(t.abbrev_tr)})</span>` : ''
          }`
        : ''
    }`;
    pair.appendChild(dt);
    const dd = document.createElement('dd');
    dd.innerHTML = `${escapeHtml(t.meaning)}${
      t.why ? `<div class="term__why"><em>Neden:</em> ${escapeHtml(t.why)}</div>` : ''
    }`;
    pair.appendChild(dd);
    dl.appendChild(pair);
  }
  wrap.appendChild(dl);
  return wrap;
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
