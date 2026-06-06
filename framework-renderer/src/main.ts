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
import { mountDetailPanel, setRefResolver, setClusterLookup, closeDetail } from '@/components/detail-panel';

import '@/styles/main.scss';

async function boot(): Promise<void> {
  // 0. Global popover instance (sayfa düzeyinde tek)
  mountPopover();
  const detailPanelEl = document.getElementById('detail-panel');
  if (detailPanelEl) mountDetailPanel(detailPanelEl);

  // Mobile sidebar drawer — toggle + backdrop + close button + ESC
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const sidebarEl = document.getElementById('sidebar');
  const sidebarClose = document.getElementById('sidebar-close');

  // Backdrop oluştur (lazy)
  let sidebarBackdrop = document.querySelector<HTMLElement>('.sidebar-backdrop');
  if (!sidebarBackdrop) {
    sidebarBackdrop = document.createElement('div');
    sidebarBackdrop.className = 'sidebar-backdrop';
    sidebarBackdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(sidebarBackdrop);
  }

  const isDrawer = () => window.matchMedia('(max-width: 819px)').matches;
  const openSidebar = () => {
    if (!sidebarEl) return;
    sidebarEl.classList.add('sidebar--open');
    sidebarBackdrop?.classList.add('is-visible');
    if (isDrawer()) document.body.style.overflow = 'hidden';
  };
  const closeSidebar = () => {
    if (!sidebarEl) return;
    sidebarEl.classList.remove('sidebar--open');
    sidebarBackdrop?.classList.remove('is-visible');
    document.body.style.overflow = '';
  };

  menuToggle?.addEventListener('click', () => {
    if (sidebarEl?.classList.contains('sidebar--open')) closeSidebar();
    else openSidebar();
  });
  sidebarClose?.addEventListener('click', closeSidebar);
  sidebarBackdrop.addEventListener('click', closeSidebar);

  // Bir link'e tıklayınca drawer'ı kapat (sadece mobile)
  sidebarEl?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a') && isDrawer()) closeSidebar();
  });

  // Dark mode toggle (localStorage persist)
  const darkToggle = document.getElementById('dark-toggle');
  const applyTheme = (t: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('fw.theme', t);
    if (darkToggle) {
      const i = darkToggle.querySelector('i');
      if (i) i.className = t === 'dark' ? 'ph-bold ph-sun' : 'ph-bold ph-moon';
    }
  };
  const savedTheme = (localStorage.getItem('fw.theme') as 'light' | 'dark' | null) ?? 'light';
  applyTheme(savedTheme);
  darkToggle?.addEventListener('click', () => {
    const cur = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ?? 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  // Esc → detail panel + sidebar drawer kapat (global)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetail();
      closeSidebar();
    }
  });

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

  // Cluster fuzzy lookup — tablo satırı vb. metinden başlık eşleştir
  const allClusters = loader.allClusters();
  setClusterLookup((q) => {
    const lc = q.toLowerCase();
    for (const c of allClusters) {
      // 3+ karakter eşleşmesi ve kısa konu adı koşulu
      const t = c.title.toLowerCase();
      if (t.length >= 4 && lc.includes(t.split(' ')[0]!) && lc.includes(t.split(' ')[1] ?? t.split(' ')[0]!)) {
        return { id: c.id, title: c.title, subtitle: c.subtitle };
      }
    }
    return null;
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

  // 10. Hash scroll — initial hedef cluster'ı aç + scroll
  if (initialRoute.hash) {
    setTimeout(() => {
      const hash = initialRoute.hash!;
      // Hedef bir cluster mi yoksa cluster içi anchor mı?
      const el = document.getElementById(hash);
      const sec = el?.closest<HTMLElement>('.cluster');
      if (sec) sec.classList.remove('cluster--collapsed');
      scrollToHash(hash, 'auto');
    }, 50);
  }

  // Cluster accordion toggle + hash hedefini otomatik aç
  const expandCluster = (id: string) => {
    const el = document.getElementById(id);
    if (!el || !el.classList.contains('cluster')) return;
    el.classList.remove('cluster--collapsed');
    const h = el.querySelector('.cluster__header');
    h?.setAttribute('aria-expanded', 'true');
  };
  const toggleCluster = (el: HTMLElement) => {
    el.classList.toggle('cluster--collapsed');
    const collapsed = el.classList.contains('cluster--collapsed');
    el.querySelector('.cluster__header')?.setAttribute('aria-expanded', String(!collapsed));
  };

  // Toggle butonuna VEYA collapsed header'ın gövdesine tıklayınca aç/kapat
  document.body.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // Link / enrich-btn / detail close → toggle değil
    if (target.closest('a, .enrich-btn, .dp__close, .sidebar__close, .sidebar-backdrop')) return;
    // Açıkça toggle butonu
    const toggleBtn = target.closest<HTMLElement>('[data-cluster-toggle]');
    if (toggleBtn) {
      e.stopPropagation();
      const sec = toggleBtn.closest<HTMLElement>('.cluster');
      if (sec) toggleCluster(sec);
      return;
    }
    // Collapsed cluster header'ına tıklayınca da aç (detail panel açılmadan önce)
    const header = target.closest<HTMLElement>('.cluster__header');
    if (header) {
      const sec = header.closest<HTMLElement>('.cluster');
      if (sec && sec.classList.contains('cluster--collapsed')) {
        e.preventDefault();
        toggleCluster(sec);
      }
    }
  }, true); // capture: detail-panel click handler'ından önce çalış

  let lastHash = window.location.hash;
  onRouteChange((state) => {
    if (state.hash && state.hash !== lastHash) {
      closeDetail();
      lastHash = state.hash;
    }
    if (state.hash) {
      // Hedef cluster'ı aç, sonra scroll
      expandCluster(state.hash);
      // Cluster id'si değil item anchor'ı ise, parent cluster'ı bul
      const targetEl = document.getElementById(state.hash);
      const parentCluster = targetEl?.closest<HTMLElement>('.cluster');
      if (parentCluster) expandCluster(parentCluster.id);
      setTimeout(() => scrollToHash(state.hash!), 30);
    }
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
