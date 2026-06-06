import type { BlockRenderer } from '@/engine/registry';
import { enrichButtonsHtml } from '@/components/popover';
import { makeDetailKey, makeDetailKeyFromText } from '@/components/detail-panel';
import { resolveBlockMarkup } from '@/engine/refs';
import type { Enrichment } from '@/types/content';

type ParagraphBlock = { type: 'paragraph'; text: string; enrich?: Enrichment };

export const paragraphRenderer: BlockRenderer<ParagraphBlock> = (block, ctx) => {
  const p = document.createElement('p');
  p.className = 'block-paragraph';
  // Paragraf seviyesi markdown: > quote ve - liste başlangıçları desteklenir.
  // İnline kurallar (bold/italic/code/ref/link) zaten ctx.renderMarkup üzerinden.
  // Block-level genişletme için refs.ts/resolveBlockMarkup kullanılır.
  const refResolver = ctx.resolveRef;
  p.innerHTML = resolveBlockMarkup(block.text, refResolver);
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
