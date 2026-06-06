import type { Manifest } from '@/types/content';

export function mountFilterBar(
  target: HTMLElement,
  manifest: Manifest,
  onChange: (filter: { layer?: string; cluster?: string }) => void,
  initial: { layer?: string; cluster?: string } = {},
): void {
  const layers = ['kernel', 'scale', 'l1', 'l2', 'l3', 'atomic'];

  const activeCount = (initial.layer ? 1 : 0) + (initial.cluster ? 1 : 0);

  target.innerHTML = `
    <button class="filter-bar__toggle" data-filter-toggle aria-expanded="false" aria-controls="filter-bar-body">
      <i class="ph ph-funnel"></i>
      <span>Filtrele</span>
      ${activeCount > 0 ? `<span class="filter-bar__count">${activeCount}</span>` : ''}
      <i class="ph ph-caret-down filter-bar__chevron"></i>
    </button>
    <div class="filter-bar__body" id="filter-bar-body">
      <div class="filter-bar__group">
        <span class="filter-bar__label">Layer:</span>
        <div class="filter-bar__chips" data-filter="layer">
          <button class="chip${!initial.layer ? ' chip--active' : ''}" data-value="">Tümü</button>
          ${layers.map((l) => `<button class="chip chip--${l}${initial.layer === l ? ' chip--active' : ''}" data-value="${l}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="filter-bar__group">
        <span class="filter-bar__label">Grup:</span>
        <div class="filter-bar__chips" data-filter="cluster">
          <button class="chip${!initial.cluster ? ' chip--active' : ''}" data-value="">Tümü</button>
          ${manifest.groups
            .map(
              (g) =>
                `<button class="chip${initial.cluster === g.id ? ' chip--active' : ''}" data-value="${g.id}">${g.label}</button>`,
            )
            .join('')}
        </div>
      </div>
      <button class="filter-bar__clear" data-filter-clear>
        <i class="ph ph-x"></i> Tümünü temizle
      </button>
    </div>
  `;

  const state: { layer?: string; cluster?: string } = { ...initial };

  // Toggle collapse (mobile-first: default collapsed)
  const toggle = target.querySelector<HTMLButtonElement>('[data-filter-toggle]')!;
  const body = target.querySelector<HTMLElement>('.filter-bar__body')!;
  const isMobile = (): boolean => window.matchMedia('(max-width: 819px)').matches;
  const setExpanded = (open: boolean): void => {
    target.classList.toggle('filter-bar--open', open);
    toggle.setAttribute('aria-expanded', String(open));
    body.style.display = open ? '' : isMobile() ? 'none' : '';
  };
  // Initial: desktop açık, mobile kapalı
  setExpanded(!isMobile());
  toggle.addEventListener('click', () =>
    setExpanded(toggle.getAttribute('aria-expanded') !== 'true'),
  );

  const updateCountBadge = (): void => {
    const count = (state.layer ? 1 : 0) + (state.cluster ? 1 : 0);
    const old = toggle.querySelector('.filter-bar__count');
    old?.remove();
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'filter-bar__count';
      badge.textContent = String(count);
      toggle.insertBefore(badge, toggle.querySelector('.filter-bar__chevron'));
    }
  };

  target.querySelectorAll<HTMLButtonElement>('.filter-bar__chips .chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = btn.parentElement!;
      const filterKey = wrap.dataset.filter as 'layer' | 'cluster';
      const val = btn.dataset.value || undefined;
      wrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip--active'));
      btn.classList.add('chip--active');
      state[filterKey] = val;
      updateCountBadge();
      onChange(state);
    });
  });

  // Tümünü temizle
  target.querySelector<HTMLButtonElement>('[data-filter-clear]')?.addEventListener('click', () => {
    state.layer = undefined;
    state.cluster = undefined;
    target.querySelectorAll<HTMLButtonElement>('.filter-bar__chips').forEach((wrap) => {
      wrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip--active'));
      wrap.querySelector('.chip[data-value=""]')?.classList.add('chip--active');
    });
    updateCountBadge();
    onChange(state);
  });

  // Resize: mobile↔desktop geçişinde uygun state
  window.addEventListener('resize', () => {
    if (!isMobile()) setExpanded(true);
  });
}
