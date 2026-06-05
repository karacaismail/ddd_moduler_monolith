import type { BlockRenderer } from '@/engine/registry';

type RefGridBlock = { type: 'ref-grid'; title?: string; refs: string[] };

export const refGridRenderer: BlockRenderer<RefGridBlock> = (block, ctx) => {
  const wrap = document.createElement('div');
  wrap.className = 'block-ref-grid';
  if (block.title) {
    const h = document.createElement('h5');
    h.className = 'block-ref-grid__title';
    h.textContent = block.title;
    wrap.appendChild(h);
  }
  const list = document.createElement('div');
  list.className = 'block-ref-grid__items';
  for (const id of block.refs) {
    const target = ctx.resolveRef(id);
    const a = document.createElement('a');
    a.className = target ? 'ref-card' : 'ref-card ref-card--missing';
    a.href = `#${id}`;
    a.innerHTML = `
      <span class="ref-card__title">${target?.title ?? id}</span>
      <span class="ref-card__group">${target?.cluster ?? '?'}</span>
      <i class="ph ph-arrow-right ref-card__arrow"></i>
    `;
    list.appendChild(a);
  }
  wrap.appendChild(list);
  return wrap;
};
