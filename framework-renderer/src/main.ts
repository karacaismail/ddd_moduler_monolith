import { ContentLoader } from '@/engine/loader';
import { BlockRegistry } from '@/engine/registry';
import { Renderer } from '@/engine/renderer';
import { SearchIndex } from '@/engine/search';
import { buildToc, renderTocElement } from '@/engine/toc';
import { onRouteChange, parseRoute, scrollToHash, updateQuery } from '@/engine/router';

import { registerAllBlocks } from '@/blocks';
import { mountSearchBox } from '@/components/search-box';
import { renderHero } from '@/components/hero';
import { mountFilterBar } from '@/components/filter-bar';
import { mountPopover } from '@/components/popover';
import { mountDetailPanel, setRefResolver, setClusterLookup, closeDetail } from '@/components/detail-panel';
import { mountReadingProgress } from '@/components/reading-progress';
import { initTelemetry, initWebVitals } from '@/components/telemetry';
import { getBookmarks } from '@/components/bookmarks';
import { getCompareIds, mountCompareView } from '@/components/compare-mode';

import '@/styles/main.scss';

async function boot(): Promise<void> {
  // 0. Telemetry (hata yakalama + isteğe bağlı Sentry/PostHog)
  initTelemetry();
  // 0.0 Real User Monitoring — web-vitals dynamic import (opsiyonel paket)
  void initWebVitals();

  // 0.1 Global popover instance (sayfa düzeyinde tek)
  mountPopover();
  const detailPanelEl = document.getElementById('detail-panel');
  if (detailPanelEl) mountDetailPanel(detailPanelEl);

  // Reading progress bar — appbar altında
  mountReadingProgress(document.body);

  // Bookmark sayacı + tıklayınca ilk yer imine git
  const bmToggle = document.getElementById('bookmarks-toggle');
  const bmCount = document.getElementById('bookmarks-count');
  const refreshBookmarksBadge = (): void => {
    const set = getBookmarks();
    if (!bmCount) return;
    if (set.size === 0) {
      bmCount.setAttribute('hidden', '');
      bmCount.textContent = '0';
    } else {
      bmCount.removeAttribute('hidden');
      bmCount.textContent = String(set.size);
    }
  };
  refreshBookmarksBadge();
  window.addEventListener('fw:bookmarks-changed', refreshBookmarksBadge);
  bmToggle?.addEventListener('click', async () => {
    const set = Array.from(getBookmarks());
    if (set.length === 0) {
      const { toast } = await import('@/components/toast');
      toast('Henüz yer imin yok. Bir cluster\'ın yıldız simgesine tıkla.', 'info');
      return;
    }
    // İlk yer imine git
    window.location.hash = '#' + set[0];
  });

  // PWA "yeni sürüm geldi" toast'u
  window.addEventListener('fw:sw-update-ready', async (e) => {
    const { toast } = await import('@/components/toast');
    const newSw = (e as CustomEvent<ServiceWorker>).detail;
    const t = toast(
      'Yeni sürüm hazır — yenile',
      'info',
      0, // süresiz
      () => newSw?.postMessage({ type: 'SKIP_WAITING' }),
    );
    void t;
  });

  // Sidebar desktop collapse toggle (sadece >=1024px)
  const sidebarForCollapse = document.getElementById('sidebar');
  if (sidebarForCollapse) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sidebar__collapse';
    btn.setAttribute('aria-label', 'Kenar çubuğunu daralt/genişlet');
    btn.innerHTML = '<i class="ph ph-caret-left"></i>';
    sidebarForCollapse.appendChild(btn);
    const restored = localStorage.getItem('fw.sidebar-collapsed') === '1';
    if (restored) document.body.classList.add('sidebar-collapsed');
    btn.addEventListener('click', () => {
      const collapsed = document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem('fw.sidebar-collapsed', collapsed ? '1' : '0');
    });
  }

  // Appbar height + iOS visualViewport için dinamik CSS variables
  const appbarEl = document.getElementById('appbar');
  const setAppbarHeight = (): void => {
    if (!appbarEl) return;
    const h = appbarEl.getBoundingClientRect().height;
    if (h > 0) {
      document.documentElement.style.setProperty('--appbar-h', `${Math.round(h)}px`);
    }
  };
  setAppbarHeight();
  if (appbarEl && 'ResizeObserver' in window) {
    const ro = new ResizeObserver(setAppbarHeight);
    ro.observe(appbarEl);
  }
  window.addEventListener('resize', setAppbarHeight);
  // iOS Safari: URL bar gizlenince viewport değişir → visualViewport listener
  if ('visualViewport' in window && window.visualViewport) {
    const setVh = (): void => {
      const vh = window.visualViewport!.height;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.visualViewport.addEventListener('resize', setVh);
    window.visualViewport.addEventListener('scroll', setVh);
  } else {
    document.documentElement.style.setProperty('--vh', '100vh');
  }

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

  // Mobile swipe-to-close: drawer açıkken sola sürükle → kapat
  if (sidebarEl) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchActive = false;
    sidebarEl.addEventListener('touchstart', (e) => {
      if (!sidebarEl.classList.contains('sidebar--open') || !isDrawer()) return;
      const t = e.touches[0];
      if (!t) return;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchActive = true;
    }, { passive: true });
    sidebarEl.addEventListener('touchmove', (e) => {
      if (!touchActive) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      // Dikey scroll'a izin ver — sadece belirgin yatay sola kayma
      if (Math.abs(dy) > Math.abs(dx)) { touchActive = false; return; }
      if (dx < -16) {
        sidebarEl.style.transform = `translateX(${dx}px)`;
      }
    }, { passive: true });
    sidebarEl.addEventListener('touchend', (e) => {
      if (!touchActive) return;
      touchActive = false;
      const t = e.changedTouches[0];
      if (!t) { sidebarEl.style.transform = ''; return; }
      const dx = t.clientX - touchStartX;
      sidebarEl.style.transform = '';
      if (dx < -80) {
        closeSidebar();
      }
    });
  }

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

  // Share URL (Web Share API → clipboard fallback)
  const shareToggle = document.getElementById('share-toggle');
  shareToggle?.addEventListener('click', async () => {
    const url = window.location.href;
    const title = document.title;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      /* ignore — user cancel */
    }
    try {
      await navigator.clipboard.writeText(url);
      const { toast } = await import('@/components/toast');
      toast('Bağlantı kopyalandı', 'success');
    } catch {
      const { toast } = await import('@/components/toast');
      toast('Kopyalanamadı — URL: ' + url, 'error', 6000);
    }
  });

  // Edit on GitHub — aktif cluster ID'sine göre dosya yolunu kur
  const editLink = document.getElementById('edit-on-github') as HTMLAnchorElement | null;
  const updateEditLink = (): void => {
    if (!editLink) return;
    const hash = window.location.hash.slice(1);
    const base = 'https://github.com/karacaismail/ddd_moduler_monolith/blob/main/framework-renderer/content/clusters';
    if (hash && /^[a-z0-9-]+$/i.test(hash)) {
      // Dosya formatı: NN-prefix.json — sadece hash'i path olarak gösteremeyiz, GitHub search'e yönlendir
      editLink.href = `https://github.com/karacaismail/ddd_moduler_monolith/search?q=${encodeURIComponent('"id":"' + hash + '"')}+path%3Aframework-renderer%2Fcontent`;
      editLink.title = `"${hash}" cluster JSON'ını GitHub'da bul`;
    } else {
      editLink.href = `${base}`;
      editLink.title = 'İçerik klasörünü GitHub\'da aç';
    }
  };
  window.addEventListener('hashchange', updateEditLink);
  updateEditLink();

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
  /**
   * Filter uygula. `pushState` true ise back butonu ile geri gelebilir
   * (kullanıcı tetikli). false ise sadece URL'i replace eder (initial / pop).
   */
  const applyFilter = (
    filter: { layer?: string; cluster?: string },
    opts: { pushState?: boolean } = {},
  ): void => {
    const isFiltered = !!(filter.layer || filter.cluster);
    if (isFiltered) {
      renderer.renderFiltered(contentEl, filter);
    } else {
      renderer.renderAll(contentEl);
    }
    updateQuery(
      {
        layer: filter.layer ?? null,
        cluster: filter.cluster ?? null,
      },
      opts.pushState ? 'push' : 'replace',
    );
    // PAGE-PER-CLUSTER: scroll-spy kapalı (tek cluster sayfada; sidebar bağımsız scroll).
    // void setupScrollSpy — eski uzun-scroll moduna geri dönülürse uncomment.
    // FILTER APPLIED → ilgili cluster'ları auto-expand (kullanıcı içerik görsün)
    // GROUP-SCOPED MODE: cluster'lar default KAPALI gelir (sadece başlık görünür).
    // Aktif/hedef cluster onRouteChange içinde expandCluster ile açılır.
    // Eski "filter applied → hepsini aç" mantığı kaldırıldı.
    // Filter-bar UI state'i de sync olsun (popstate sonrası)
    if (filterBarEl) {
      filterBarEl.querySelectorAll<HTMLElement>('.chip').forEach((chip) => {
        const layer = chip.dataset.layer;
        const cluster = chip.dataset.cluster;
        const isActive =
          (layer && layer === filter.layer) || (cluster && cluster === filter.cluster);
        chip.classList.toggle('chip--active', !!isActive);
      });
    }
  };
  // Filter state key — popstate'te tekrar tetiklemeyi önlemek için tutuluyor
  let lastFilterKey = (initialRoute.filterLayer ?? '') + '|' + (initialRoute.filterCluster ?? '');
  if (filterBarEl) {
    // Filter bar'dan gelen değişiklik → pushState (back butonu ile geri gelebilsin)
    mountFilterBar(
      filterBarEl,
      manifest,
      (f) => {
        lastFilterKey = (f.layer ?? '') + '|' + (f.cluster ?? '');
        applyFilter(f, { pushState: true });
      },
      {
        layer: initialRoute.filterLayer,
        cluster: initialRoute.filterCluster,
      },
    );
  }

  // 9. Compare modu mu? (URL ?compare=a,b varsa)
  const compareIds = getCompareIds();
  if (compareIds.length > 0) {
    mountCompareView(contentEl, loader, renderer);
  } else {
    // 9b. Normal ilk render
    // GROUP-SCOPED MODE: hash bir cluster ID ise hash öncelikli — eski ?cluster= baskılanır.
    // parseRoute() hash'i '#' ile döndürüyor; loader.getCluster() temiz ID istiyor.
    let initialGroupId: string | undefined;
    const cleanHash = (initialRoute.hash ?? '').replace(/^#/, '');
    if (cleanHash) {
      const c = loader.getCluster(cleanHash);
      if (c) initialGroupId = c.cluster; // hash → cluster → group ID (URL'i override eder)
    }
    if (!initialGroupId) initialGroupId = initialRoute.filterCluster;
    applyFilter({
      layer: initialRoute.filterLayer,
      cluster: initialGroupId,
    });
    // lastFilterKey'i ilk render ile senkronize et (loop önler)
    lastFilterKey = (initialRoute.filterLayer ?? '') + '|' + (initialGroupId ?? '');
  }

  // 10. Hash scroll — initial hedef cluster'ı aç + scroll
  // parseRoute() hash'i '#' prefix'i ile veriyor — temizle.
  if (initialRoute.hash) {
    setTimeout(() => {
      const cleanHash = initialRoute.hash!.replace(/^#/, '');
      if (!cleanHash) return;
      const el = document.getElementById(cleanHash);
      const sec = el?.closest<HTMLElement>('.cluster');
      // SADECE aktif/hedef cluster expand olur — diğerleri kapalı kalır.
      if (sec) sec.classList.remove('cluster--collapsed');
      scrollToHash('#' + cleanHash, 'auto');
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
    // Filter state senkronizasyonu — back/forward butonu URL'i değiştirince
    // applyFilter'ı tetikle (ama loop'a girmemek için key check)
    const filterKey = (state.filterLayer ?? '') + '|' + (state.filterCluster ?? '');
    if (filterKey !== lastFilterKey) {
      lastFilterKey = filterKey;
      applyFilter({
        layer: state.filterLayer,
        cluster: state.filterCluster,
      });
    }

    if (state.hash && state.hash !== lastHash) {
      closeDetail();
      lastHash = state.hash;
      // parseRoute() hash'i '#' ile veriyor; cluster ID için temizle.
      const clean = state.hash.replace(/^#/, '');
      // GROUP-SCOPED MODE: hash bir cluster ID'si ise, o cluster'ın grubuna ait TÜM cluster'lar
      // content'te render edilir. Hash, URL'deki eski ?cluster='ı OVERRIDE eder.
      const targetCluster = loader.getCluster(clean);
      if (targetCluster) {
        const groupId = targetCluster.cluster;
        const alreadyOnGroup = document.getElementById(clean) !== null;
        if (!alreadyOnGroup) {
          applyFilter({ cluster: groupId });
          lastFilterKey = '|' + groupId;
        }
        // Tıklanan cluster'ı aç + ona scroll
        setTimeout(() => {
          expandCluster(clean);
          scrollToHash('#' + clean);
        }, alreadyOnGroup ? 0 : 50);
        return;
      }
      // hash bir cluster ID değil → cluster içi anchor.
      const targetEl = document.getElementById(clean);
      const parentCluster = targetEl?.closest<HTMLElement>('.cluster');
      if (parentCluster) {
        expandCluster(parentCluster.id);
        setTimeout(() => scrollToHash('#' + clean), 30);
      } else if (clean) {
        setTimeout(() => scrollToHash('#' + clean), 30);
      }
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
