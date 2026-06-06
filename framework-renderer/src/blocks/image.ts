import type { BlockRenderer } from '@/engine/registry';
import { makeDetailKey } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type ImageBlock = {
  type: 'image';
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  enrich?: Enrichment;
};

export const imageRenderer: BlockRenderer<ImageBlock> = (block, ctx) => {
  const fig = document.createElement('figure');
  fig.className = 'block-image';

  const img = document.createElement('img');
  img.src = block.src;
  img.alt = block.alt; // 60+ uygun: zorunlu alt metin
  img.loading = 'lazy';
  img.decoding = 'async';
  if (block.width) img.width = block.width;
  if (block.height) img.height = block.height;
  fig.appendChild(img);

  if (block.caption) {
    const cap = document.createElement('figcaption');
    cap.className = 'block-image__caption';
    cap.innerHTML = ctx.renderMarkup(block.caption);
    fig.appendChild(cap);
  }

  const dk = makeDetailKey(block.enrich, {
    title: block.alt || 'Görsel',
    summary: block.caption,
    contextLabel: ctx.cluster.title,
  });
  if (dk) {
    fig.dataset.detailKey = dk;
    fig.classList.add('is-clickable');
  }
  return fig;
};
