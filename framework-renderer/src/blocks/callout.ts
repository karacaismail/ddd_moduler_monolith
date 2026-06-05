import type { BlockRenderer } from '@/engine/registry';
import { enrichButtonsHtml } from '@/components/popover';
import { makeDetailKey, makeDetailKeyFromText } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type CalloutBlock = {
  type: 'callout';
  variant: 'tip' | 'warning' | 'critical' | 'tr' | 'info';
  label?: string;
  icon?: string;
  body: string;
  enrich?: Enrichment;
};

const ICONS: Record<CalloutBlock['variant'], string> = {
  tip: 'ph-lightbulb',
  warning: 'ph-warning',
  critical: 'ph-warning-circle',
  tr: 'ph-flag',
  info: 'ph-info',
};

const DEFAULT_LABELS: Record<CalloutBlock['variant'], string> = {
  tip: 'Öneri',
  warning: 'Uyarı',
  critical: 'Kritik',
  tr: 'Türkiye',
  info: 'Bilgi',
};

export const calloutRenderer: BlockRenderer<CalloutBlock> = (block, ctx) => {
  const div = document.createElement('div');
  div.className = `block-callout block-callout--${block.variant}`;
  div.setAttribute('role', 'note');

  const dk = block.enrich
    ? makeDetailKey(block.enrich, { title: block.label ?? block.variant, summary: block.body.slice(0, 140), contextLabel: ctx.cluster.title })
    : makeDetailKeyFromText(block.body, { title: block.label, contextLabel: ctx.cluster.title });
  if (dk) {
    div.dataset.detailKey = dk;
    div.classList.add('is-clickable');
    div.setAttribute('tabindex', '0');
  }

  const labelEl = document.createElement('div');
  labelEl.className = 'block-callout__label';
  const icon = document.createElement('i');
  icon.className = `ph ${block.icon || ICONS[block.variant]}`;
  labelEl.appendChild(icon);
  const labelText = document.createElement('span');
  labelText.textContent = block.label ?? DEFAULT_LABELS[block.variant];
  labelEl.appendChild(labelText);
  const enBtns = enrichButtonsHtml(block.enrich);
  if (enBtns) labelEl.insertAdjacentHTML('beforeend', `<span class="enrich-btns enrich-btns--inline">${enBtns}</span>`);
  div.appendChild(labelEl);

  const body = document.createElement('div');
  body.className = 'block-callout__body';
  // Body supports paragraphs separated by blank lines + inline markup
  const paragraphs = block.body.split(/\n\n+/);
  for (const para of paragraphs) {
    const p = document.createElement('p');
    p.innerHTML = ctx.renderMarkup(para);
    body.appendChild(p);
  }
  div.appendChild(body);

  return div;
};
