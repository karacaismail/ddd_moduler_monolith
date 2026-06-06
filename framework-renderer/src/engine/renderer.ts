import {
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

    // Body — accordion içeriği
    const body = document.createElement('div');
    body.className = 'cluster__body';
    body.id = `${cluster.id}__body`;
    for (const block of cluster.blocks) {
      body.appendChild(this.registry.render(block, ctx));
    }
    section.appendChild(body);

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
  }
}
