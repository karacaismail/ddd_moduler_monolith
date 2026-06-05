import type { BlockRenderer } from '@/engine/registry';
import { makeDetailKey, makeDetailKeyFromText } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type LayerCardsBlock = {
  type: 'layer-cards';
  cards: Array<{
    tag: string;
    name: string;
    desc: string;
    tone: 'kernel' | 'scale' | 'l1' | 'l2' | 'l3' | 'atomic';
    enrich?: Enrichment;
  }>;
};

export const layerCardsRenderer: BlockRenderer<LayerCardsBlock> = (block, ctx) => {
  const wrap = document.createElement('div');
  wrap.className = 'block-layer-cards';
  wrap.style.setProperty('--cols', String(block.cards.length));
  for (const card of block.cards) {
    const c = document.createElement('div');
    c.className = `layer-card layer-card--${card.tone}`;
    const dk = card.enrich
      ? makeDetailKey(card.enrich, { title: card.name, summary: card.desc, contextLabel: card.tag })
      : makeDetailKeyFromText(`${card.name}: ${card.desc}`, { title: card.name, contextLabel: card.tag });
    if (dk) {
      c.dataset.detailKey = dk;
      c.classList.add('is-clickable');
      c.setAttribute('role', 'button');
      c.setAttribute('tabindex', '0');
    }
    const tag = document.createElement('div');
    tag.className = 'layer-card__tag';
    tag.textContent = card.tag;
    c.appendChild(tag);
    const name = document.createElement('div');
    name.className = 'layer-card__name';
    name.textContent = card.name;
    c.appendChild(name);
    const desc = document.createElement('div');
    desc.className = 'layer-card__desc';
    desc.textContent = card.desc;
    c.appendChild(desc);
    wrap.appendChild(c);
  }
  return wrap;
};
