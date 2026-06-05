import type { BlockRenderer } from '@/engine/registry';
import { enrichButtonsHtml, stateBadgeHtml } from '@/components/popover';
import { makeDetailKey } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type FeatureItem = {
  name: string;
  desc?: string;
  critical?: boolean;
  icon?: string;
  enrich?: Enrichment;
};

type FeatureListBlock = {
  type: 'feature-list';
  title?: string;
  filterable?: boolean;
  items: FeatureItem[];
};

const STATES: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'Tümü' },
  { id: 'critical', label: 'Kritik' },
  { id: 'missing', label: 'Eksik' },
  { id: 'ok', label: 'Hazır' },
  { id: 'planned', label: 'Planlı' },
  { id: 'wip', label: 'Geliştiriliyor' },
];

export const featureListRenderer: BlockRenderer<FeatureListBlock> = (block, ctx) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'block-feature-list';

  if (block.title) {
    const h = document.createElement('h5');
    h.className = 'block-feature-list__title';
    h.textContent = block.title;
    wrapper.appendChild(h);
  }

  const ul = document.createElement('ul');
  ul.className = 'feature-list';

  const showFilter = block.filterable !== false && block.items.length >= 6;
  if (showFilter) {
    const bar = document.createElement('div');
    bar.className = 'mini-filter';
    bar.innerHTML = `
      <div class="mini-filter__chips">
        ${STATES.map(
          (s, i) =>
            `<button class="chip chip--xs${i === 0 ? ' chip--active' : ''}" data-state="${s.id}">${s.label}</button>`,
        ).join('')}
      </div>
      <div class="mini-filter__search">
        <i class="ph ph-magnifying-glass"></i>
        <input type="search" placeholder="filtrele…" />
      </div>
    `;
    wrapper.appendChild(bar);

    queueMicrotask(() => {
      const chips = bar.querySelectorAll<HTMLButtonElement>('.chip');
      const input = bar.querySelector<HTMLInputElement>('input')!;
      let activeState = 'all';
      let query = '';

      const apply = (): void => {
        const items = ul.querySelectorAll<HTMLLIElement>('li.feature-list__item');
        items.forEach((li) => {
          const matchState =
            activeState === 'all' ||
            li.dataset.state === activeState ||
            (activeState === 'critical' && li.dataset.critical === '1');
          const matchQ =
            !query || (li.textContent ?? '').toLowerCase().includes(query.toLowerCase());
          li.style.display = matchState && matchQ ? '' : 'none';
        });
      };

      chips.forEach((c) => {
        c.addEventListener('click', () => {
          chips.forEach((x) => x.classList.remove('chip--active'));
          c.classList.add('chip--active');
          activeState = c.dataset.state ?? 'all';
          apply();
        });
      });
      input.addEventListener('input', () => {
        query = input.value.trim();
        apply();
      });
    });
  }

  for (const item of block.items) {
    const en = item.enrich;
    const isCritical = item.critical;
    const state = en?.state ?? (isCritical ? 'critical' : undefined);

    const li = document.createElement('li');
    li.className = isCritical
      ? 'feature-list__item feature-list__item--critical'
      : 'feature-list__item';
    if (state) li.dataset.state = state;
    if (isCritical) li.dataset.critical = '1';

    const detailKey = makeDetailKey(en, {
      title: item.name,
      summary: item.desc,
      contextLabel: ctx.cluster.title,
    });
    if (detailKey) {
      li.dataset.detailKey = detailKey;
      li.classList.add('is-clickable');
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
    }

    const head = document.createElement('div');
    head.className = 'feature-list__head';

    if (isCritical || state === 'critical') {
      head.insertAdjacentHTML('beforeend', `<span class="feature-list__tag">Kritik</span>`);
    } else if (state) {
      head.insertAdjacentHTML('beforeend', stateBadgeHtml(state));
    }

    const name = document.createElement('strong');
    name.className = 'feature-list__name';
    if (item.icon) {
      name.insertAdjacentHTML('beforeend', `<i class="ph ${item.icon}"></i>`);
    }
    name.appendChild(document.createTextNode(item.name));
    head.appendChild(name);

    const enBtns = enrichButtonsHtml(en);
    if (enBtns) {
      const span = document.createElement('span');
      span.className = 'enrich-btns';
      span.innerHTML = enBtns;
      head.appendChild(span);
    }

    if (en?.granularity) {
      head.insertAdjacentHTML(
        'beforeend',
        `<span class="gran-chip gran-chip--${en.granularity}" title="${en.granularity}">${en.granularity}</span>`,
      );
    }

    li.appendChild(head);

    if (item.desc) {
      const desc = document.createElement('div');
      desc.className = 'feature-list__desc';
      desc.innerHTML = ctx.renderMarkup(item.desc);
      li.appendChild(desc);
    }

    ul.appendChild(li);
  }
  wrapper.appendChild(ul);
  return wrapper;
};
