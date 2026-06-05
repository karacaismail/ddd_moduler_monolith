import type { BlockRenderer } from '@/engine/registry';
import { enrichButtonsHtml } from '@/components/popover';
import { makeDetailKey, makeDetailKeyFromText } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type Block = {
  type: 'steps';
  title?: string;
  items: Array<{ title: string; body: string; icon?: string; enrich?: Enrichment }>;
};

export const stepsRenderer: BlockRenderer<Block> = (block, ctx) => {
  const wrap = document.createElement('div');
  wrap.className = 'block-steps';
  if (block.title) {
    const h = document.createElement('h5');
    h.className = 'block-steps__title';
    h.innerHTML = `<i class="ph ph-steps"></i> ${block.title}`;
    wrap.appendChild(h);
  }
  const ol = document.createElement('ol');
  ol.className = 'steps';
  block.items.forEach((it, idx) => {
    const li = document.createElement('li');
    li.className = 'step';
    const dk = it.enrich
      ? makeDetailKey(it.enrich, { title: it.title, summary: it.body, contextLabel: ctx.cluster.title })
      : makeDetailKeyFromText(`${it.title}\n\n${it.body}`, { title: it.title, contextLabel: ctx.cluster.title });
    if (dk) {
      li.dataset.detailKey = dk;
      li.classList.add('is-clickable');
    }
    li.innerHTML = `
      <div class="step__num"><span>${idx + 1}</span></div>
      <div class="step__content">
        <div class="step__title">${it.icon ? `<i class="ph ${it.icon}"></i> ` : ''}${escape(it.title)}</div>
        <div class="step__body">${ctx.renderMarkup(it.body)}</div>
      </div>
    `;
    const btns = enrichButtonsHtml(it.enrich);
    if (btns) {
      const titleEl = li.querySelector<HTMLElement>('.step__title')!;
      titleEl.insertAdjacentHTML('beforeend', ` <span class="enrich-btns enrich-btns--inline">${btns}</span>`);
    }
    ol.appendChild(li);
  });
  wrap.appendChild(ol);
  return wrap;
};

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));
}
