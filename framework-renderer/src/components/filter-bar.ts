import type { Manifest } from '@/types/content';

export function mountFilterBar(
  target: HTMLElement,
  manifest: Manifest,
  onChange: (filter: { layer?: string; cluster?: string }) => void,
  initial: { layer?: string; cluster?: string } = {},
): void {
  const layers = ['kernel', 'scale', 'l1', 'l2', 'l3', 'atomic'];

  target.innerHTML = `
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
  `;

  const state: { layer?: string; cluster?: string } = { ...initial };

  target.querySelectorAll<HTMLButtonElement>('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = btn.parentElement!;
      const filterKey = wrap.dataset.filter as 'layer' | 'cluster';
      const val = btn.dataset.value || undefined;
      wrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip--active'));
      btn.classList.add('chip--active');
      state[filterKey] = val;
      onChange(state);
    });
  });
}
