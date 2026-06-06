/**
 * Hash routing — #cluster-id → scroll + highlight.
 * URL'de ?layer=kernel gibi filter param desteği.
 */

export interface RouteState {
  hash: string;        // "#k-schema"
  filterLayer?: string;
  filterCluster?: string;
  search?: string;
}

export function parseRoute(): RouteState {
  const url = new URL(window.location.href);
  return {
    hash: window.location.hash,
    filterLayer: url.searchParams.get('layer') ?? undefined,
    filterCluster: url.searchParams.get('cluster') ?? undefined,
    search: url.searchParams.get('q') ?? undefined,
  };
}

export function scrollToHash(hash: string, behavior: ScrollBehavior = 'smooth'): void {
  if (!hash || hash === '#') return;
  const id = hash.slice(1);
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[router] no element for hash: ${hash}`);
    return;
  }
  el.scrollIntoView({ behavior, block: 'start' });
  el.classList.add('cluster--highlight');
  setTimeout(() => el.classList.remove('cluster--highlight'), 1500);
}

export function onRouteChange(handler: (state: RouteState) => void): () => void {
  const listener = () => handler(parseRoute());
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  return () => {
    window.removeEventListener('hashchange', listener);
    window.removeEventListener('popstate', listener);
  };
}

/**
 * Query params güncelle.
 * @param params - null/undefined ise param silinir
 * @param mode - 'replace' (default, history'ye yazmaz) | 'push' (back butonu ile geri gelebilir)
 *
 * Filter state'i için `push` öneririz: kullanıcı filter uyguladıktan sonra
 * back butonuna basınca filter'sız sayfaya dönsün.
 */
export function updateQuery(
  params: Partial<Record<string, string | null>>,
  mode: 'replace' | 'push' = 'replace',
): void {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  if (mode === 'push') {
    window.history.pushState({}, '', url.toString());
  } else {
    window.history.replaceState({}, '', url.toString());
  }
}

/** Mevcut route bir filter içeriyor mu? */
export function hasActiveFilter(state: RouteState = parseRoute()): boolean {
  return !!(state.filterLayer || state.filterCluster || state.search);
}
