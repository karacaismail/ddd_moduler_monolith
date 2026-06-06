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

  // ESC sırası (priority): popover → detail-panel → sidebar drawer
  // Hangisi açıksa onu kapat. Aynı anda iki açık olabilir.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // 1. Popover en üstteki layer
    const pop = document.querySelector<HTMLElement>('.pop:not([hidden])');
    if (pop) {
      pop.hidden = true;
      return;
    }
    // 2. Detail panel
    const dpOpen = document.querySelector('.detail-panel.detail-panel--open');
    if (dpOpen) {
      closeDetail();
      return;
    }
    // 3. Sidebar drawer (sadece mobile)
    const sbOpen = document.querySelector('.sidebar.sidebar--open');
    if (sbOpen) {
      closeSidebar();
      return;
    }
  });

  // Cluster header — Enter/Space ile toggle (accordion)
  document.body.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList?.contains('cluster__header')) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const sec = target.closest<HTMLElement>('.cluster');
    if (!sec) return;
    sec.classList.toggle('cluster--collapsed');
    const collapsed = sec.classList.contains('cluster--collapsed');
    target.setAttribute('aria-expanded', String(!collapsed));
  });

  // Toggle butonu — Space/Enter
  document.body.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    if (!target.matches?.('[data-cluster-toggle]')) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const sec = target.closest<HTMLElement>('.cluster');
    if (!sec) return;
    sec.classList.toggle('cluster--collapsed');
    const collapsed = sec.classList.contains('cluster--collapsed');
    sec.querySelector('.cluster__header')?.setAttribute('aria-expanded', String(!collapsed));
  });

  // Focus trap — drawer / detail-panel açıkken
  const trapFocus = (e: KeyboardEvent, container: HTMLElement): void => {
    if (e.key !== 'Tab') return;
    const focusable = container.querySelectorAll<HTMLElement>(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const isMobile = window.matchMedia('(max-width: 1239px)').matches;
    if (!isMobile) return;
    const dp = document.querySelector<HTMLElement>('.detail-panel.detail-panel--open');
    if (dp) trapFocus(e, dp);
    const sb = document.querySelector<HTMLElement>('.sidebar.sidebar--open');
    if (sb) trapFocus(e, sb);
  });

  // aria-live region — search/filter sonuç sayısı için
  if (!document.getElementById('a11y-live')) {
    const live = document.createElement('div');
    live.id = 'a11y-live';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    document.body.appendChild(live);
  }

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
  // Lazy-render helper — applyFilter ve toggle/expand'in ortak kullanımı için BURADA
  type LazyCluster = HTMLElement & { __renderBody?: () => void };
  const lazyRender = (el: LazyCluster): void => {
    if (typeof el.__renderBody === 'function') el.__renderBody();
  };
  const applyFilter = (filter: { layer?: string; cluster?: string }): void => {
    const isFiltered = !!(filter.layer || filter.cluster);
    if (isFiltered) {
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
    // FILTER APPLIED → ilgili cluster'ları auto-expand (kullanıcı içerik görsün)
    if (isFiltered) {
      contentEl.querySelectorAll<HTMLElement>('.cluster').forEach((el) => {
        lazyRender(el as LazyCluster);
        el.classList.remove('cluster--collapsed');
        el.querySelector('.cluster__header')?.setAttribute('aria-expanded', 'true');
      });
    }
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

  // Cluster accordion toggle + hash hedefini otomatik aç + LAZY RENDER
  const expandCluster = (id: string) => {
    const el = document.getElementById(id) as LazyCluster | null;
    if (!el || !el.classList.contains('cluster')) return;
    lazyRender(el);
    el.classList.remove('cluster--collapsed');
    const h = el.querySelector('.cluster__header');
    h?.setAttribute('aria-expanded', 'true');
  };
  const toggleCluster = (el: HTMLElement) => {
    const wasCollapsed = el.classList.contains('cluster--collapsed');
    if (wasCollapsed) lazyRender(el as LazyCluster);
    el.classList.toggle('cluster--collapsed');
    const collapsed = el.classList.contains('cluster--collapsed');
    el.querySelector('.cluster__header')?.setAttribute('aria-expanded', String(!collapsed));
  };

  // Click hierarchy (P5):
  //   1. Toggle butonu      → SADECE expand/collapse (detail panel açma)
  //   2. Header (collapsed) → expand + detail panel aç (iki action birlikte)
  //   3. Header (açık)      → detail panel aç (toggle YOK — eğer kapatmak istersen butonu kullan)
  document.body.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // Link / enrich-btn / detail close / sidebar elements → bypass
    if (target.closest('a, .enrich-btn, .dp__close, .sidebar__close, .sidebar-backdrop')) return;
    // 1. Toggle butonuna tıkla → sadece toggle (detail panel'i KÜLLİYEN AÇMA)
    const toggleBtn = target.closest<HTMLElement>('[data-cluster-toggle]');
    if (toggleBtn) {
      e.stopPropagation();
      e.preventDefault();
      const sec = toggleBtn.closest<HTMLElement>('.cluster');
      if (sec) toggleCluster(sec);
      return;
    }
    // 2. Collapsed header → expand, ama detail panel handler'ı da çalışsın
    const header = target.closest<HTMLElement>('.cluster__header');
    if (header) {
      const sec = header.closest<HTMLElement>('.cluster');
      if (sec && sec.classList.contains('cluster--collapsed')) {
        // SADECE expand — detail panel açmaya devam etsin (event continue)
        lazyRender(sec as LazyCluster);
        sec.classList.remove('cluster--collapsed');
        header.setAttribute('aria-expanded', 'true');
        // event.preventDefault YOK → detail panel handler tetiklenir
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
      // Hedef cluster DOM'da yok mu? (Filter aktif olabilir) → filtreyi temizle, re-render
      const exists = document.getElementById(state.hash);
      if (!exists) {
        const targetCluster = loader.getCluster(state.hash);
        if (targetCluster) {
          // Filter aktifken farklı gruba atlama → filtreyi sıfırla
          applyFilter({});
          // Filter chip'lerini de "Tümü" yap
          document.querySelectorAll<HTMLElement>('.filter-bar__chips').forEach((wrap) => {
            wrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip--active'));
            wrap.querySelector('.chip[data-value=""]')?.classList.add('chip--active');
          });
        }
      }
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
