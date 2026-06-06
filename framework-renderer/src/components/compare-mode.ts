/**
 * Cluster Compare modu — URL'de ?compare=a,b varsa iki cluster'ı
 * yan yana göster. Üçüncü cluster eklenirse en eski düşer.
 *
 * Tetik: URL query "compare" parametresi.
 * Kapatma: query parametresi silinir.
 */

import type { ContentLoader } from '@/engine/loader';
import type { Renderer } from '@/engine/renderer';

const PARAM = 'compare';
const MAX = 2;

export function getCompareIds(): string[] {
  const sp = new URLSearchParams(window.location.search);
  const raw = sp.get(PARAM);
  if (!raw) return [];
  return raw.split(',').filter(Boolean).slice(0, MAX);
}

export function setCompareIds(ids: string[]): void {
  const url = new URL(window.location.href);
  if (ids.length === 0) {
    url.searchParams.delete(PARAM);
  } else {
    url.searchParams.set(PARAM, ids.slice(0, MAX).join(','));
  }
  window.history.pushState({}, '', url.toString());
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function addToCompare(id: string): void {
  const cur = getCompareIds();
  if (cur.includes(id)) return;
  cur.unshift(id);
  setCompareIds(cur.slice(0, MAX));
}

export function removeFromCompare(id: string): void {
  setCompareIds(getCompareIds().filter((x) => x !== id));
}

/**
 * Compare ekranını monte et. İki cluster id verilirse yan yana iki kart
 * üretir; tek cluster varsa diğerini seçmek için kısa rehber.
 */
export function mountCompareView(
  target: HTMLElement,
  loader: ContentLoader,
  renderer: Renderer,
): boolean {
  const ids = getCompareIds();
  if (ids.length === 0) return false;

  target.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'compare-view';

  const head = document.createElement('header');
  head.className = 'compare-view__head';
  head.innerHTML = `
    <h2><i class="ph ph-arrows-horizontal"></i> Karşılaştırma</h2>
    <button type="button" class="compare-view__close" aria-label="Karşılaştırmadan çık">
      <i class="ph ph-x"></i> Kapat
    </button>
  `;
  head.querySelector('.compare-view__close')?.addEventListener('click', () => {
    setCompareIds([]);
    window.location.reload();
  });
  wrap.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'compare-view__grid';

  for (const id of ids) {
    const cluster = loader.getCluster(id);
    const col = document.createElement('div');
    col.className = 'compare-view__col';
    if (!cluster) {
      col.innerHTML = `
        <div class="compare-view__missing">
          <i class="ph-duotone ph-question"></i>
          <strong>"${escapeHtml(id)}" bulunamadı</strong>
          <button type="button" class="compare-view__remove" data-id="${escapeHtml(id)}">Kaldır</button>
        </div>
      `;
    } else {
      const card = renderer.renderCluster(cluster);
      card.classList.remove('cluster--collapsed');
      const cardCast = card as HTMLElement & { __renderBody?: () => void };
      cardCast.__renderBody?.();
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'compare-view__col-close';
      closeBtn.setAttribute('aria-label', 'Bu sütunu kapat');
      closeBtn.innerHTML = '<i class="ph ph-x"></i>';
      closeBtn.addEventListener('click', () => {
        removeFromCompare(id);
        window.location.reload();
      });
      col.appendChild(closeBtn);
      col.appendChild(card);
    }
    grid.appendChild(col);
  }
  wrap.appendChild(grid);

  // Eğer tek cluster varsa karşıya eklemek için seçim çağrısı
  if (ids.length === 1) {
    const picker = document.createElement('div');
    picker.className = 'compare-view__picker';
    picker.innerHTML = `
      <p>Karşılaştırmak istediğin ikinci cluster'ı sol menüden seç ve URL'e
      <code>?compare=${escapeHtml(ids[0]!)},DIĞER-ID</code> ekle.</p>
    `;
    wrap.appendChild(picker);
  }

  target.appendChild(wrap);

  // "Karşılaştırmaya ekle" rozeti her cluster header'a eklensin
  document.body.addEventListener('click', onAddClick, { once: true });
  return true;
}

function onAddClick(e: Event): void {
  const target = e.target as HTMLElement;
  const btn = target.closest<HTMLButtonElement>('[data-compare-add]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const id = btn.dataset.compareAdd;
  if (id) addToCompare(id);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
