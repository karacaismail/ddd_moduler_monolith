import type { BlockRenderer } from '@/engine/registry';
import { enrichButtonsHtml } from '@/components/popover';
import { makeDetailKey } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type ExamplesBlock = {
  type: 'examples';
  title?: string;
  items: Array<{ label?: string; text: string; enrich?: Enrichment }>;
};

export const examplesRenderer: BlockRenderer<ExamplesBlock> = (block, ctx) => {
  const wrap = document.createElement('div');
  wrap.className = 'block-examples';
  const h = document.createElement('h5');
  h.className = 'block-examples__title';
  h.innerHTML = `<i class="ph ph-list-bullets"></i> ${block.title ?? 'Gerçek dünya örnekleri'}`;
  wrap.appendChild(h);

  const ul = document.createElement('ul');
  for (const item of block.items) {
    const li = document.createElement('li');
    if (item.label) {
      const strong = document.createElement('strong');
      strong.textContent = `${item.label}: `;
      li.appendChild(strong);
    }
    const span = document.createElement('span');
    span.innerHTML = ctx.renderMarkup(item.text);
    li.appendChild(span);
    const btns = enrichButtonsHtml(item.enrich);
    if (btns) {
      const ew = document.createElement('span');
      ew.className = 'enrich-btns enrich-btns--inline';
      ew.innerHTML = btns;
      li.appendChild(ew);
    }
    const dk = makeDetailKey(item.enrich, {
      title: item.label ?? item.text.slice(0, 60),
      summary: item.label ? item.text : undefined,
      contextLabel: ctx.cluster.title,
    });
    if (dk) {
      li.dataset.detailKey = dk;
      li.classList.add('is-clickable');
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
    }
    ul.appendChild(li);
  }
  wrap.appendChild(ul);
  return wrap;
};
