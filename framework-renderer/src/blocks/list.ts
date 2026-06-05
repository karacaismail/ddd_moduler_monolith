import type { BlockRenderer } from '@/engine/registry';
import { enrichButtonsHtml } from '@/components/popover';
import { makeDetailKey, makeDetailKeyFromText } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type ListItem = string | { text: string; enrich?: Enrichment };

type ListBlock = { type: 'list'; ordered?: boolean; items: ListItem[] };

export const listRenderer: BlockRenderer<ListBlock> = (block, ctx) => {
  const tag = block.ordered ? 'ol' : 'ul';
  const el = document.createElement(tag);
  el.className = 'block-list';
  for (const raw of block.items) {
    const li = document.createElement('li');
    if (typeof raw === 'string') {
      li.innerHTML = ctx.renderMarkup(raw);
      const dk = makeDetailKeyFromText(raw, { contextLabel: ctx.cluster.title });
      if (dk) {
        li.dataset.detailKey = dk;
        li.classList.add('is-clickable');
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');
      }
    } else {
      const span = document.createElement('span');
      span.innerHTML = ctx.renderMarkup(raw.text);
      li.appendChild(span);
      const btns = enrichButtonsHtml(raw.enrich);
      if (btns) {
        const wrap = document.createElement('span');
        wrap.className = 'enrich-btns enrich-btns--inline';
        wrap.innerHTML = btns;
        li.appendChild(wrap);
      }
      // Detay paneline kayıt
      const plainText = raw.text.replace(/\*\*|`|\{\{ref:[a-z0-9-]+\}\}/g, '').slice(0, 80);
      const dk = makeDetailKey(raw.enrich, { title: plainText, contextLabel: ctx.cluster.title });
      if (dk) {
        li.dataset.detailKey = dk;
        li.classList.add('is-clickable');
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');
      }
    }
    el.appendChild(li);
  }
  return el;
};
