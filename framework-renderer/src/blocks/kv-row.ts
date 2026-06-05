import type { BlockRenderer } from '@/engine/registry';
import { enrichButtonsHtml } from '@/components/popover';
import { makeDetailKey, makeDetailKeyFromText } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type KvRowBlock = {
  type: 'kv-row';
  pairs: Array<{ key: string; value: string; enrich?: Enrichment }>;
};

export const kvRowRenderer: BlockRenderer<KvRowBlock> = (block, ctx) => {
  const dl = document.createElement('dl');
  dl.className = 'block-kv';
  for (const { key, value, enrich } of block.pairs) {
    // Pair'i tek bir satır kapsayıcı div'de göster ki tıklanabilir olsun
    const row = document.createElement('div');
    row.className = 'block-kv__pair';

    const dk = enrich
      ? makeDetailKey(enrich, { title: key, summary: value, contextLabel: ctx.cluster.title })
      : makeDetailKeyFromText(`${key}: ${value}`, { title: key, contextLabel: ctx.cluster.title });
    if (dk) {
      row.dataset.detailKey = dk;
      row.classList.add('is-clickable');
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
    }

    const dt = document.createElement('dt');
    dt.textContent = key;
    const btns = enrichButtonsHtml(enrich);
    if (btns) dt.insertAdjacentHTML('beforeend', `<span class="enrich-btns enrich-btns--inline">${btns}</span>`);
    row.appendChild(dt);

    const dd = document.createElement('dd');
    dd.innerHTML = ctx.renderMarkup(value);
    row.appendChild(dd);

    dl.appendChild(row);
  }
  return dl;
};
