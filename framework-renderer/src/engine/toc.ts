import type { Cluster, Manifest } from '@/types/content';

/**
 * TOC builder + accordion sidebar.
 *
 * ## TEK-AÇIK ACCORDION KURALI (kullanıcı kararı, asla bozma)
 * ──────────────────────────────────────────────────────────────
 * 1. Aynı anda SADECE BİR grup açık olur. Bir grup açılınca diğerleri kapanır.
 * 2. İçerikte aktif olan cluster'ın bulunduğu grup otomatik açık tutulur.
 * 3. Scrollspy aktif cluster'ı değiştirince → onun grubu açılır, diğerleri kapanır.
 * 4. Kullanıcı bir grup başlığına tıklayınca → o grup açılır, diğerleri kapanır.
 * 5. Aktif cluster'ın grubu manuel kapatılırsa, scrollspy bir sonraki aktif tetikte
 *    tekrar açar (zorla değil; tutarlılık için).
 *
 * Bu kural localStorage persistence'ı geçersiz kılar.
 */

export interface TocGroup {
  id: string;
  label: string;
  icon?: string;
  clusters: Array<{ id: string; title: string; layer?: string }>;
}

const STORAGE_PREFIX = 'fw.toc.group.';

export function buildToc(manifest: Manifest, loadedClusters: Cluster[]): TocGroup[] {
  const groupMap = new Map<string, TocGroup>();
  for (const g of manifest.groups) {
    groupMap.set(g.id, { id: g.id, label: g.label, icon: g.icon, clusters: [] });
  }

  const sortedClusters = [...loadedClusters].sort((a, b) => a.order - b.order);
  for (const cluster of sortedClusters) {
    const group = groupMap.get(cluster.cluster);
    if (!group) {
      console.warn(`[toc] unknown group: ${cluster.cluster} (cluster ${cluster.id})`);
      continue;
    }
    group.clusters.push({ id: cluster.id, title: cluster.title, layer: cluster.layer });
  }

  return manifest.groups
    .sort((a, b) => a.order - b.order)
    .map((g) => groupMap.get(g.id))
    .filter((g): g is TocGroup => !!g && g.clusters.length > 0);
}

/**
 * TEK-AÇIK kuralında: sadece aktif cluster'ın grubu açılır.
 * localStorage artık sadece "son açık grup" bilgisini tutar — multi-state YOK.
 */
const STORAGE_OPEN_GROUP = 'fw.toc.openGroup';

function loadOpenGroup(): string | null {
  return localStorage.getItem(STORAGE_OPEN_GROUP);
}

function saveOpenGroup(groupId: string | null): void {
  if (groupId) localStorage.setItem(STORAGE_OPEN_GROUP, groupId);
  else localStorage.removeItem(STORAGE_OPEN_GROUP);
}

/**
 * TEK grup aç — diğerlerini kapat. TOC element içindeki tüm grupları gezer.
 */
function openOnlyGroup(toc: HTMLElement, targetGroupId: string): void {
  toc.querySelectorAll<HTMLElement>('.toc__group').forEach((g) => {
    const id = g.getAttribute('data-group-id');
    const isTarget = id === targetGroupId;
    g.setAttribute('data-collapsed', String(!isTarget));
    const header = g.querySelector<HTMLButtonElement>('.toc__group-header');
    if (header) header.setAttribute('aria-expanded', String(isTarget));
  });
  saveOpenGroup(targetGroupId);
}

export function renderTocElement(toc: TocGroup[], activeClusterId?: string): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'toc';
  nav.setAttribute('aria-label', 'İçerik');

  // TEK-AÇIK kuralı: hangisini açacağız?
  // 1) activeClusterId'nin grubu (öncelik)
  // 2) localStorage'daki son açık grup
  // 3) ilk grup (fallback)
  let openGroupId: string | undefined;
  if (activeClusterId) {
    const matchGroup = toc.find((g) => g.clusters.some((c) => c.id === activeClusterId));
    if (matchGroup) openGroupId = matchGroup.id;
  }
  if (!openGroupId) {
    const stored = loadOpenGroup();
    if (stored && toc.some((g) => g.id === stored)) openGroupId = stored;
  }
  if (!openGroupId && toc[0]) openGroupId = toc[0].id;

  toc.forEach((group) => {
    const initiallyOpen = group.id === openGroupId;

    const section = document.createElement('div');
    section.className = 'toc__group';
    section.setAttribute('data-group-id', group.id);
    section.setAttribute('data-collapsed', String(!initiallyOpen));

    // Header (accordion trigger)
    const headerId = `toc-header-${group.id}`;
    const bodyId = `toc-body-${group.id}`;

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'toc__group-header';
    header.id = headerId;
    header.setAttribute('aria-expanded', String(initiallyOpen));
    header.setAttribute('aria-controls', bodyId);

    if (group.icon) {
      const icon = document.createElement('i');
      icon.className = `ph ${group.icon} toc__group-icon`;
      icon.setAttribute('aria-hidden', 'true');
      header.appendChild(icon);
    }

    const label = document.createElement('span');
    label.className = 'toc__group-label';
    label.textContent = group.label;
    header.appendChild(label);

    const count = document.createElement('span');
    count.className = 'toc__group-count';
    count.textContent = `${group.clusters.length}`;
    header.appendChild(count);

    const chevron = document.createElement('i');
    chevron.className = 'ph ph-caret-down toc__chevron';
    chevron.setAttribute('aria-hidden', 'true');
    header.appendChild(chevron);

    header.addEventListener('click', () => {
      const wasCollapsed = section.getAttribute('data-collapsed') === 'true';
      if (wasCollapsed) {
        // TEK-AÇIK kuralı: bu grubu aç, diğerlerini kapat
        openOnlyGroup(nav, group.id);
      } else {
        // Açıkken tıklarsa kapat (hiç açık grup kalmaz; scrollspy ileride açar)
        section.setAttribute('data-collapsed', 'true');
        header.setAttribute('aria-expanded', 'false');
        saveOpenGroup(null);
      }
    });

    section.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'toc__group-body';
    body.id = bodyId;
    body.setAttribute('role', 'region');
    body.setAttribute('aria-labelledby', headerId);

    const ol = document.createElement('ol');
    ol.className = 'toc__list';
    for (const c of group.clusters) {
      const li = document.createElement('li');
      li.className = `toc__item${c.layer ? ` toc__item--${c.layer}` : ''}`;
      const a = document.createElement('a');
      a.href = `#${c.id}`;
      a.textContent = c.title;
      a.setAttribute('data-cluster-id', c.id);
      if (c.id === activeClusterId) a.classList.add('toc__link--active');
      li.appendChild(a);
      ol.appendChild(li);
    }
    body.appendChild(ol);
    section.appendChild(body);

    nav.appendChild(section);
  });

  return nav;
}

/** Aktif scroll pozisyonuna göre TOC link'i highlight. */
export function setupScrollSpy(toc: HTMLElement): void {
  const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('a[data-cluster-id]'));
  const sectionMap = new Map<string, HTMLElement>();
  for (const link of links) {
    const id = link.dataset.clusterId;
    if (!id) continue;
    const section = document.getElementById(id);
    if (section) sectionMap.set(id, section);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          for (const link of links) {
            link.classList.toggle('toc__link--active', link.dataset.clusterId === id);
          }
          // TEK-AÇIK kuralı: aktif link'in grubunu aç, diğerlerini kapat
          const activeLink = links.find((l) => l.dataset.clusterId === id);
          if (activeLink) {
            const group = activeLink.closest<HTMLElement>('.toc__group');
            const groupId = group?.getAttribute('data-group-id');
            if (groupId) openOnlyGroup(toc, groupId);
            // Sidebar viewport içinde değilse scroll-into-view
            const sidebar = activeLink.closest<HTMLElement>('.sidebar');
            if (sidebar) {
              const linkRect = activeLink.getBoundingClientRect();
              const sbRect = sidebar.getBoundingClientRect();
              if (linkRect.top < sbRect.top + 40 || linkRect.bottom > sbRect.bottom - 40) {
                activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        }
      }
    },
    { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
  );

  for (const section of sectionMap.values()) observer.observe(section);
}

/**
 * TEK-AÇIK kuralında "tümünü aç" anlamsız — sadece "tümünü kapat" mantıklı.
 * Yine de eski API kalabilir; open=true geldiğinde sadece ilki açılır.
 */
export function setAllGroups(toc: HTMLElement, open: boolean): void {
  if (!open) {
    toc.querySelectorAll<HTMLElement>('.toc__group').forEach((g) => {
      g.setAttribute('data-collapsed', 'true');
      g.querySelector<HTMLButtonElement>('.toc__group-header')?.setAttribute('aria-expanded', 'false');
    });
    saveOpenGroup(null);
    return;
  }
  const first = toc.querySelector<HTMLElement>('.toc__group');
  const firstId = first?.getAttribute('data-group-id');
  if (firstId) openOnlyGroup(toc, firstId);
}
