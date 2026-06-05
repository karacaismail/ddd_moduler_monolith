import type { BlockRenderer } from '@/engine/registry';
import { enrichButtonsHtml } from '@/components/popover';
import { makeDetailKey, makeDetailKeyFromText } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type Item = { label: string; hint?: string; optional?: boolean; enrich?: Enrichment };
type Block = {
  type: 'checklist';
  title?: string;
  storageKey?: string;
  items: Item[];
};

function loadState(key: string, count: number): boolean[] {
  try {
    const raw = localStorage.getItem(`fw.chk.${key}`);
    if (!raw) return new Array(count).fill(false);
    const arr = JSON.parse(raw) as boolean[];
    return Array.from({ length: count }, (_, i) => Boolean(arr[i]));
  } catch {
    return new Array(count).fill(false);
  }
}
function saveState(key: string, arr: boolean[]): void {
  try {
    localStorage.setItem(`fw.chk.${key}`, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

export const checklistRenderer: BlockRenderer<Block> = (block, ctx) => {
  const wrap = document.createElement('div');
  wrap.className = 'block-checklist';

  const h = document.createElement('div');
  h.className = 'block-checklist__head';
  h.innerHTML = `<i class="ph ph-list-checks"></i> <strong>${block.title ?? 'Kontrol listesi'}</strong>`;
  const progress = document.createElement('span');
  progress.className = 'block-checklist__progress';
  h.appendChild(progress);
  wrap.appendChild(h);

  const storage = block.storageKey ?? `${ctx.cluster.id}.${(block.title ?? 'chk').toLowerCase().replace(/\s+/g, '-')}`;
  const state = loadState(storage, block.items.length);

  const ul = document.createElement('ul');
  ul.className = 'checklist';

  const updateProgress = (): void => {
    const requiredIdxs: number[] = [];
    block.items.forEach((it, idx) => {
      if (!it.optional) requiredIdxs.push(idx);
    });
    const requiredDone = requiredIdxs.filter((i) => state[i]).length;
    progress.textContent = `${requiredDone}/${requiredIdxs.length}`;
    const pct = requiredIdxs.length === 0 ? 100 : Math.round((requiredDone / requiredIdxs.length) * 100);
    progress.dataset.pct = String(pct);
    progress.style.setProperty('--pct', `${pct}%`);
  };

  block.items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'checklist__item' + (state[idx] ? ' checklist__item--done' : '');
    if (item.optional) li.classList.add('checklist__item--optional');
    const dk = item.enrich
      ? makeDetailKey(item.enrich, { title: item.label, summary: item.hint, contextLabel: ctx.cluster.title })
      : makeDetailKeyFromText(`${item.label}${item.hint ? '\n\n' + item.hint : ''}`, { title: item.label.slice(0, 80), contextLabel: ctx.cluster.title });
    if (dk) {
      li.dataset.detailKey = dk;
      li.classList.add('is-clickable');
    }

    const id = `chk-${storage}-${idx}`;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.checked = Boolean(state[idx]);
    cb.addEventListener('change', () => {
      state[idx] = cb.checked;
      li.classList.toggle('checklist__item--done', cb.checked);
      saveState(storage, state);
      updateProgress();
    });
    li.appendChild(cb);

    const label = document.createElement('label');
    label.htmlFor = id;
    label.className = 'checklist__label';
    label.innerHTML = ctx.renderMarkup(item.label);
    if (item.optional) {
      label.insertAdjacentHTML('beforeend', ' <span class="checklist__opt">(opsiyonel)</span>');
    }
    const btns = enrichButtonsHtml(item.enrich);
    if (btns) label.insertAdjacentHTML('beforeend', ` <span class="enrich-btns enrich-btns--inline">${btns}</span>`);
    li.appendChild(label);

    if (item.hint) {
      const hint = document.createElement('div');
      hint.className = 'checklist__hint';
      hint.innerHTML = ctx.renderMarkup(item.hint);
      li.appendChild(hint);
    }
    ul.appendChild(li);
  });
  wrap.appendChild(ul);
  updateProgress();
  return wrap;
};
