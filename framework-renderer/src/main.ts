import { ContentLoader } from '@/engine/loader';
import { BlockRegistry } from '@/engine/registry';
import { Renderer } from '@/engine/renderer';
import { SearchIndex } from '@/engine/search';
import { buildToc, renderTocElement, setupScrollSpy } from '@/engine/toc';
import { onRouteChange, parseRoute, scrollToHash, updateQuery } from '@/engine/router';

import { registerAllBlocks } from '@/blocks';
import { mountSearchBox } from '@/components/search-box';
import { renderHero } from '@/components/hero';
import { mountFilterBar } from '@/components/filter-bar';
import { mountPopover } from '@/components/popover';
import { mountDetailPanel, setRefResolver, closeDetail } from '@/components/detail-panel';

import '@/styles/main.scss';

async function boot(): Promise<void> {
  // 0. Global popover instance (sayfa düzeyinde tek)
  mountPopover();
  const detailPanelEl = document.getElementById('detail-panel');
  if (detailPanelEl) mountDetailPanel(detailPanelEl);

  // 1. Registry + tüm block renderer'ları
  const registry = new BlockRegistry();
  registerAllBlocks(registry);

  // 2. Content loader
  // Vite içerikleri publicDir'den (./content) serve eder. GH Pages alt-dizininde
  // base-url Vite tarafından inject edilir (import.meta.env.BASE_URL).
  const loader = new ContentLoader(import.meta.env.BASE_URL || '/');
  const manifest = await loader.loadManifest();
  console.info(`[boot] manifest yüklendi: ${manifest.name} v${manifest.version}`);

  // 3. Cluster'ları yükle (paralel)
  const clusters = await loader.loadAll();
  console.info(`[boot] ${clusters.length}/${manifest.clusters.length} cluster yüklendi`);

  // Detail panel için ref resolver
  setRefResolver((id) => {
    const c = loader.getCluster(id);
    return c ? { title: c.title, cluster: c.cluster } : null;
  });
  if (loader.errors().length > 0) {
    console.warn(`[boot] ${loader.errors().length} cluster hatalı:`, loader.errors());
  }

  // 4. Hero
  const heroEl = document.getElementById('hero');
  if (heroEl) renderHero(heroEl, manifest, clusters.length);

  // 5. TOC (accordion) — aktif cluster (URL hash'inden) ile grup otomatik açık.
  const tocData = buildToc(manifest, clusters);
  const tocTarget = document.getElementById('toc');
  const initialHash = window.location.hash.slice(1) || undefined;
  if (tocTarget) {
    const tocEl = renderTocElement(tocData, initialHash);
    tocTarget.replaceWith(tocEl);
    tocEl.id = 'toc';
  }

  // 6. Search index
  const searchIndex = new SearchIndex();
  for (const cluster of clusters) searchIndex.add(cluster);
  const searchBoxEl = document.getElementById('search-box');
  if (searchBoxEl) mountSearchBox(searchBoxEl, searchIndex);

  // 7. Content render
  const contentEl = document.getElementById('content');
  if (!contentEl) {
    console.error('[boot] #content bulunamadı');
    return;
  }
  const renderer = new Renderer(registry, loader);

  // 8. Filter bar
  const filterBarEl = document.getElementById('filter-bar');
  const initialRoute = parseRoute();
  const applyFilter = (filter: { layer?: string; cluster?: string }): void => {
    if (filter.layer || filter.cluster) {
      renderer.renderFiltered(contentEl, filter);
    } else {
      renderer.renderAll(contentEl);
    }
    updateQuery({
      layer: filter.layer ?? null,
      cluster: filter.cluster ?? null,
    });
    // Re-setup scroll spy after re-render
    const tocEl = document.getElementById('toc');
    if (tocEl) setupScrollSpy(tocEl);
  };
  if (filterBarEl) {
    mountFilterBar(filterBarEl, manifest, applyFilter, {
      layer: initialRoute.filterLayer,
      cluster: initialRoute.filterCluster,
    });
  }

  // 9. İlk render
  applyFilter({
    layer: initialRoute.filterLayer,
    cluster: initialRoute.filterCluster,
  });

  // 10. Hash scroll
  if (initialRoute.hash) {
    setTimeout(() => scrollToHash(initialRoute.hash, 'auto'), 50);
  }

  let lastHash = window.location.hash;
  onRouteChange((state) => {
    if (state.hash && state.hash !== lastHash) {
      closeDetail();
      lastHash = state.hash;
    }
    if (state.hash) scrollToHash(state.hash);
  });

  console.info('[boot] tamamlandı');
}

boot().catch((err) => {
  console.error('[boot] başarısız:', err);
  const root = document.getElementById('content');
  if (root) {
    root.innerHTML = `
      <div class="boot-error">
        <h2><i class="ph ph-warning-circle"></i> Yükleme başarısız</h2>
        <p>${err instanceof Error ? err.message : String(err)}</p>
        <p>Console'a bak.</p>
      </div>
    `;
  }
});
