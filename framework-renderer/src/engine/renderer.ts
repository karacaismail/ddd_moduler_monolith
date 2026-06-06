import {
  DIFFICULTY_ICON,
  DIFFICULTY_LABEL,
  GRANULARITY_ICON,
  GRANULARITY_LABEL,
  GRANULARITY_SP,
  STATE_LABEL,
  type Block,
  type Cluster,
} from '@/types/content';
import type { BlockRegistry } from './registry';
import type { ContentLoader } from './loader';
import { resolveInlineMarkup, type RefResolver } from './refs';
import { enrichButtonsHtml } from '@/components/popover';
import { makeDetailKey } from '@/components/detail-panel';
import { formatLastUpdated, readMinutes } from './cluster-metadata';
import { createBookmarkButton } from '@/components/bookmarks';

/**
 * Render bağlamı — block renderer'ların erişeceği yardımcılar.
 */
export interface RenderContext {
  cluster: Cluster;
  loader: ContentLoader;
  registry: BlockRegistry;
  resolveRef: RefResolver;
  renderMarkup: (text: string) => string;
  /** Bir alt-block'u render et (recursion için, callout body gibi). */
  renderBlock: (block: Block) => HTMLElement;
}

export class Renderer {
  constructor(
    private registry: BlockRegistry,
    private loader: ContentLoader,
  ) {}

  /** Tek bir cluster'ı render et. */
  renderCluster(cluster: Cluster): HTMLElement {
    const section = document.createElement('section');
    // Collapsed by default — accordion. Hash hedefi olursa main.ts açar.
    section.className = 'cluster cluster--collapsed';
    section.id = cluster.id;
    section.setAttribute('data-cluster', cluster.cluster);
    if (cluster.layer) section.setAttribute('data-layer', cluster.layer);

    // Cluster header — chevron toggle eklenmiş
    const header = this.renderClusterHeader(cluster);
    header.setAttribute('aria-expanded', 'false');
    header.setAttribute('aria-controls', `${cluster.id}__body`);
    section.appendChild(header);

    // Context
    const refResolver: RefResolver = (id) => {
      const target = this.loader.getCluster(id);
      return target ? { title: target.title, cluster: target.cluster } : null;
    };
    const ctx: RenderContext = {
      cluster,
      loader: this.loader,
      registry: this.registry,
      resolveRef: refResolver,
      renderMarkup: (text) => resolveInlineMarkup(text, refResolver),
      renderBlock: (block) => this.registry.render(block, ctx),
    };

    // Body — accordion içeriği (LAZY: ilk expand'te oluştur)
    const body = document.createElement('div');
    body.className = 'cluster__body';
    body.id = `${cluster.id}__body`;
    // Placeholder skeleton — lazy render başlamadan önce shimmer
    body.innerHTML = `
      <div class="cluster__skeleton" aria-hidden="true">
        <div class="cluster__skeleton-line"></div>
        <div class="cluster__skeleton-line cluster__skeleton-line--80"></div>
        <div class="cluster__skeleton-line cluster__skeleton-line--60"></div>
      </div>
    `;
    section.appendChild(body);

    // Lazy render closure — section.dataset üzerinden tetiklenir
    let rendered = false;
    const blocks = Array.isArray(cluster.blocks) ? cluster.blocks : [];
    const renderBody = (): void => {
      if (rendered) return;
      rendered = true;
      // Skeleton'u temizle
      body.innerHTML = '';
      for (const block of blocks) {
        if (!block || typeof block !== 'object' || !('type' in block)) {
          console.warn(`[renderer] cluster=${cluster.id}: invalid block`, block);
          continue;
        }
        try {
          body.appendChild(this.registry.render(block, ctx));
        } catch (err) {
          console.error(`[renderer] cluster=${cluster.id} block=${(block as { type: string }).type} render hatası:`, err);
          const fallback = document.createElement('div');
          fallback.className = 'block-error';
          fallback.innerHTML = `
            <i class="ph ph-warning-circle"></i>
            <span>Bu blok render edilemedi: <code>${(block as { type: string }).type}</code></span>
          `;
          body.appendChild(fallback);
        }
      }
    };
    // Section'a closure'ı bağla; main.ts toggle'da çağıracak
    (section as HTMLElement & { __renderBody?: () => void }).__renderBody = renderBody;
    // Eğer cluster zaten initially açık geldiyse hemen render
    if (!section.classList.contains('cluster--collapsed')) {
      renderBody();
    }

    return section;
  }

  /** Cluster başlığı: badge + icon + title + subtitle. */
  private renderClusterHeader(cluster: Cluster): HTMLElement {
    const header = document.createElement('header');
    header.className = `cluster__header cluster__header--${cluster.layer ?? 'meta'}`;

    if (cluster.badge) {
      const badge = document.createElement('span');
      badge.className = 'cluster__badge';
      badge.textContent = cluster.badge;
      header.appendChild(badge);
    }

    const titleEl = document.createElement('h2');
    titleEl.className = 'cluster__title';
    if (cluster.icon) {
      const icon = document.createElement('i');
      icon.className = `ph-duotone ${cluster.icon}`;
      titleEl.appendChild(icon);
    }
    const titleText = document.createElement('span');
    titleText.textContent = cluster.title;
    titleEl.appendChild(titleText);

    // cluster-level enrichment buttons + detail-key
    const enBtns = enrichButtonsHtml(cluster.enrich);
    if (enBtns) {
      const span = document.createElement('span');
      span.className = 'enrich-btns enrich-btns--title';
      span.innerHTML = enBtns;
      titleEl.appendChild(span);
    }
    const headerDk = makeDetailKey(cluster.enrich, {
      title: cluster.title,
      summary: cluster.subtitle,
      contextLabel: 'Konu',
    });
    if (headerDk) {
      header.dataset.detailKey = headerDk;
      header.classList.add('is-clickable');
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
    }

    header.appendChild(titleEl);

    // granularity + state row
    const meta = document.createElement('div');
    meta.className = 'cluster__meta-row';
    if (cluster.granularity) {
      const g = cluster.granularity;
      meta.insertAdjacentHTML(
        'beforeend',
        `<span class="gran-chip gran-chip--${g}">
          <i class="ph ${GRANULARITY_ICON[g]}"></i>
          ${GRANULARITY_LABEL[g]}
          <span class="gran-chip__sp">~${GRANULARITY_SP[g]} SP</span>
        </span>`,
      );
    }
    if (cluster.state) {
      meta.insertAdjacentHTML(
        'beforeend',
        `<span class="state-chip state-chip--${cluster.state}">${STATE_LABEL[cluster.state]}</span>`,
      );
    }
    // Zorluk chip — başlangıç/orta/ileri (60+ okur için)
    if (cluster.difficulty) {
      const d = cluster.difficulty;
      meta.insertAdjacentHTML(
        'beforeend',
        `<span class="diff-chip diff-chip--${d}" title="Zorluk seviyesi">
          <i class="ph ${DIFFICULTY_ICON[d]}"></i>
          ${DIFFICULTY_LABEL[d]}
        </span>`,
      );
    }
    // Okuma süresi
    const readMin = readMinutes(cluster);
    if (readMin > 0) {
      meta.insertAdjacentHTML(
        'beforeend',
        `<span class="read-chip" title="Tahmini okuma süresi">
          <i class="ph ph-clock"></i>
          ${readMin} dk
        </span>`,
      );
    }
    // Son güncelleme
    const lu = formatLastUpdated(cluster.lastUpdated);
    if (lu) {
      meta.insertAdjacentHTML(
        'beforeend',
        `<span class="updated-chip" title="Son güncelleme">
          <i class="ph ph-calendar-blank"></i>
          ${lu}
        </span>`,
      );
    }
    if (meta.childElementCount > 0) header.appendChild(meta);

    if (cluster.subtitle) {
      const sub = document.createElement('p');
      sub.className = 'cluster__subtitle';
      sub.textContent = cluster.subtitle;
      header.appendChild(sub);
    }

    if (cluster.tags && cluster.tags.length > 0) {
      const tagWrap = document.createElement('div');
      tagWrap.className = 'cluster__tags';
      for (const tag of cluster.tags) {
        const t = document.createElement('span');
        t.className = 'tag';
        t.textContent = tag;
        tagWrap.appendChild(t);
      }
      header.appendChild(tagWrap);
    }

    // Bookmark yıldızı — toggle'dan önce
    const bm = createBookmarkButton(cluster.id);
    header.appendChild(bm);

    // Accordion toggle butonu — sağ üst köşede chevron
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'cluster__toggle';
    toggle.setAttribute('aria-label', 'Aç / kapat');
    toggle.dataset.clusterToggle = '1';
    toggle.innerHTML = '<i class="ph ph-caret-down"></i>';
    header.appendChild(toggle);

    return header;
  }

  /** Tüm cluster'ları order'a göre target'a render et. */
  renderAll(target: HTMLElement): void {
    target.innerHTML = '';
    const clusters = this.loader.allClusters();
    for (const cluster of clusters) {
      target.appendChild(this.renderCluster(cluster));
    }
    setupVirtualScroll(target);
  }

  /** Belirli bir layer'a filtre uygula. */
  renderFiltered(target: HTMLElement, filter: { layer?: string; cluster?: string }): void {
    target.innerHTML = '';
    let clusters = this.loader.allClusters();
    if (filter.layer) clusters = clusters.filter((c) => c.layer === filter.layer);
    if (filter.cluster) clusters = clusters.filter((c) => c.cluster === filter.cluster);
    for (const cluster of clusters) {
      target.appendChild(this.renderCluster(cluster));
    }
    setupVirtualScroll(target);
  }
}

/**
 * Virtual scroll: cluster header viewport'a yaklaşınca body lazy render edilir.
 * Bu, 300+ cluster için "ilk yükleme" maliyetini DOM'a sadece skeleton koymakla sınırlar.
 * Açma/kapama bağımsız çalışır; bu sadece "ön belleğe al" tetikleyicisidir.
 */
function setupVirtualScroll(target: HTMLElement): void {
  if (!('IntersectionObserver' in window)) return;
  const sections = target.querySelectorAll<HTMLElement & { __renderBody?: () => void }>('.cluster');
  if (sections.length === 0) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement & { __renderBody?: () => void };
        // Yalnızca bir kez tetikle, sonra observer'dan çıkar.
        try {
          el.__renderBody?.();
        } catch {
          /* renderer body kendi hatasını yakalıyor */
        }
        io.unobserve(el);
      }
    },
    {
      // 600px önden başlat → scroll hızlıca aşağı kayarken kullanıcı boşluk görmez
      rootMargin: '600px 0px 600px 0px',
      threshold: 0,
    },
  );
  for (const s of sections) io.observe(s);
}
