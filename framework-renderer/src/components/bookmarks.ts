/**
 * Cluster bookmark — localStorage tabanlı yıldız işareti.
 * "Bu cluster'a sonra dön" düşüncesini destekler.
 *
 * Bağlanma: cluster header'ında bir yıldız butonu + sidebar başında
 * "Yer imleri" grubu (öncelikli).
 */

const KEY = 'fw.bookmarks';

export function getBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function saveBookmarks(set: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

export function toggleBookmark(clusterId: string): boolean {
  const set = getBookmarks();
  if (set.has(clusterId)) set.delete(clusterId);
  else set.add(clusterId);
  saveBookmarks(set);
  return set.has(clusterId);
}

export function isBookmarked(clusterId: string): boolean {
  return getBookmarks().has(clusterId);
}

/**
 * Bookmark toggle butonu — cluster header sağ tarafına eklenir.
 * Tıklanınca event emit eder; ayrıca yıldız simgesini yeniler.
 */
export function createBookmarkButton(clusterId: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cluster__bookmark';
  btn.setAttribute('data-cluster-bookmark', clusterId);
  btn.setAttribute('aria-label', 'Yer imine ekle / kaldır');
  const refresh = (): void => {
    const on = isBookmarked(clusterId);
    btn.classList.toggle('cluster__bookmark--on', on);
    btn.innerHTML = on
      ? '<i class="ph-fill ph-star"></i>'
      : '<i class="ph ph-star"></i>';
    btn.title = on ? 'Yer iminden kaldır' : 'Yer imlerine ekle';
  };
  refresh();
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleBookmark(clusterId);
    refresh();
    window.dispatchEvent(new CustomEvent('fw:bookmarks-changed'));
  });
  return btn;
}
