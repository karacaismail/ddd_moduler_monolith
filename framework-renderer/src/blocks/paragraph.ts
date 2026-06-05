import type { BlockRenderer } from '@/engine/registry';
import { enrichButtonsHtml } from '@/components/popover';
import { makeDetailKey, makeDetailKeyFromText } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type ParagraphBlock = { type: 'paragraph'; text: string; enrich?: Enrichment };

export const paragraphRenderer: BlockRenderer<ParagraphBlock> = (block, ctx) => {
  const p = document.createElement('p');
  p.className = 'block-paragraph';
  p.innerHTML = ctx.renderMarkup(block.text);
  const btns = enrichButtonsHtml(block.enrich);
  if (btns) p.insertAdjacentHTML('beforeend', ` <span class="enrich-btns enrich-btns--inline">${btns}</span>`);

  // Tıklanabilirlik: enrich varsa zengin detay, yoksa metnden auto-detail.
  const dk = block.enrich
    ? makeDetailKey(block.enrich, { title: block.text.slice(0, 80), summary: block.text.slice(0, 140), contextLabel: ctx.cluster.title })
    : makeDetailKeyFromText(block.text, { contextLabel: ctx.cluster.title });
  if (dk) {
    p.dataset.detailKey = dk;
    p.classList.add('is-clickable');
  }
  return p;
};
