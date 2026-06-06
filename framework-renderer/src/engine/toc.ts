import type { Cluster, Manifest } from '@/types/content';

/**
 * TOC builder + accordion sidebar.
 * - Her grup (manifest.groups) bir accordion section.
 * - Açık/kapalı state localStorage'da persist edilir.
 * - Aktif cluster'ın grubu otomatik açılır.
 * - IntersectionObserver ile scroll spy.
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
 * Açılış davranışı:
 * - localStorage'da kayıt varsa onu kullan.
 * - Yoksa: ilk 2 grup açık, diğerleri kapalı (kompakt görünüm).
 * - Aktif hash içeren grup her zaman açık.
 */
function defaultOpenState(groupIndex: number): boolean {
  const stored = localStorage.getItem(STORAGE_PREFIX + 'init');
  if (stored === '1') return false; // user previously interacted, use saved state
  return groupIndex < 2;
}

function loadGroupState(groupId: string, fallback: boolean): boolean {
  const v = localStorage.getItem(STORAGE_PREFIX + groupId);
  if (v === null) return fallback;
  return v === '1';
}

function saveGroupState(groupId: string, open: boolean): void {
  localStorage.setItem(STORAGE_PREFIX + groupId, open ? '1' : '0');
  localStorage.setItem(STORAGE_PREFIX + 'init', '1');
}

export function renderTocElement(toc: TocGroup[], activeClusterId?: string): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'toc';
  nav.setAttribute('aria-label', 'İçerik');

  toc.forEach((group, index) => {
    const containsActive =
      !!activeClusterId && group.clusters.some((c) => c.id === activeClusterId);
    const initiallyOpen = containsActive || loadGroupState(group.id, defaultOpenState(index));

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
      const nextOpen = wasCollapsed; // opening
      section.setAttribute('data-collapsed', String(!nextOpen));
      header.setAttribute('aria-expanded', String(nextOpen));
      saveGroupState(group.id, nextOpen);
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
          // Aktif olan link kapalı bir gruptaysa, grubu aç + sidebar'da görünür kıl
          const activeLink = links.find((l) => l.dataset.clusterId === id);
          if (activeLink) {
            const group = activeLink.closest<HTMLElement>('.toc__group');
            if (group && group.getAttribute('data-collapsed') === 'true') {
              group.setAttribute('data-collapsed', 'false');
              const header = group.querySelector<HTMLButtonElement>('.toc__group-header');
              if (header) header.setAttribute('aria-expanded', 'true');
            }
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

/** Tüm grupları aç/kapat. Bağımsız helper. */
export function setAllGroups(toc: HTMLElement, open: boolean): void {
  toc.querySelectorAll<HTMLElement>('.toc__group').forEach((g) => {
    g.setAttribute('data-collapsed', String(!open));
    const header = g.querySelector<HTMLButtonElement>('.toc__group-header');
    if (header) header.setAttribute('aria-expanded', String(open));
    const id = g.getAttribute('data-group-id');
    if (id) saveGroupState(id, open);
  });
}
