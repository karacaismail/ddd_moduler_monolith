import type { BlockRenderer } from '@/engine/registry';
import { enrichButtonsHtml } from '@/components/popover';
import { makeDetailKey } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type GridBlock = {
  type: 'grid';
  columns: 2 | 3;
  items: Array<{
    title: string;
    body: string;
    icon?: string;
    tone?: 'good' | 'bad' | 'neutral';
    enrich?: Enrichment;
  }>;
};

export const gridRenderer: BlockRenderer<GridBlock> = (block, ctx) => {
  const wrapper = document.createElement('div');
  wrapper.className = `block-grid block-grid--cols-${block.columns}`;
  for (const item of block.items) {
    const card = document.createElement('div');
    card.className = `block-grid__item${item.tone ? ` block-grid__item--${item.tone}` : ''}`;

    const dk = makeDetailKey(item.enrich, { title: item.title, summary: item.body, contextLabel: ctx.cluster.title });
    if (dk) {
      card.dataset.detailKey = dk;
      card.classList.add('is-clickable');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
    }

    const h = document.createElement('h5');
    h.className = 'block-grid__title';
    if (item.icon) h.insertAdjacentHTML('beforeend', `<i class="ph ${item.icon}"></i>`);
    h.appendChild(document.createTextNode(item.title));
    const btns = enrichButtonsHtml(item.enrich);
    if (btns) {
      const ew = document.createElement('span');
      ew.className = 'enrich-btns';
      ew.innerHTML = btns;
      h.appendChild(ew);
    }
    card.appendChild(h);
    const body = document.createElement('div');
    body.className = 'block-grid__body';
    body.innerHTML = ctx.renderMarkup(item.body);
    card.appendChild(body);
    wrapper.appendChild(card);
  }
  return wrapper;
};
