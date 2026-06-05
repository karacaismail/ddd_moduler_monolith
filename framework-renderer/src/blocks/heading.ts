import type { BlockRenderer } from '@/engine/registry';
import { enrichButtonsHtml } from '@/components/popover';
import { makeDetailKey, makeDetailKeyFromText } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type HeadingBlock = {
  type: 'heading';
  level: 2 | 3 | 4 | 5;
  text: string;
  id?: string;
  icon?: string;
  enrich?: Enrichment;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ç]/g, 'c')
    .replace(/[ğ]/g, 'g')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ş]/g, 's')
    .replace(/[ü]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const headingRenderer: BlockRenderer<HeadingBlock> = (block, ctx) => {
  const tag = `h${block.level}` as keyof HTMLElementTagNameMap;
  const el = document.createElement(tag);
  el.className = `block-heading block-heading--l${block.level}`;

  const id = block.id ?? `${ctx.cluster.id}--${slugify(block.text)}`;
  el.id = id;

  // Heading → her zaman tıklanır (auto-detail)
  const dk = block.enrich
    ? makeDetailKey(block.enrich, { title: block.text, contextLabel: ctx.cluster.title })
    : makeDetailKeyFromText(block.text, { title: block.text, contextLabel: ctx.cluster.title });
  if (dk) {
    el.dataset.detailKey = dk;
    el.classList.add('is-clickable');
  }

  if (block.icon) {
    const icon = document.createElement('i');
    icon.className = `ph-duotone ${block.icon}`;
    el.appendChild(icon);
  }

  const textSpan = document.createElement('span');
  textSpan.innerHTML = ctx.renderMarkup(block.text);
  el.appendChild(textSpan);

  const btns = enrichButtonsHtml(block.enrich);
  if (btns) {
    const ew = document.createElement('span');
    ew.className = 'enrich-btns enrich-btns--inline';
    ew.innerHTML = btns;
    el.appendChild(ew);
  }

  // Hash anchor
  const anchor = document.createElement('a');
  anchor.href = `#${id}`;
  anchor.className = 'heading-anchor';
  anchor.setAttribute('aria-label', 'Bu başlığa bağlantı');
  anchor.innerHTML = '<i class="ph ph-link"></i>';
  el.appendChild(anchor);

  return el;
};
