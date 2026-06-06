import type { SearchIndex, SearchHit } from '@/engine/search';

/**
 * Search box bileşeni — input + results dropdown + recent queries.
 *
 * Recent queries:
 *   - Son 10 arama localStorage'da tutulur.
 *   - Input boş + focus durumunda "Son aramaların" başlığıyla görünür.
 *   - Tıklama yeniden arama tetikler.
 */

const RECENT_KEY = 'fw.search.recent';
const RECENT_MAX = 10;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}
function saveRecent(q: string): void {
  const cur = loadRecent().filter((x) => x !== q);
  cur.unshift(q);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, RECENT_MAX)));
  } catch {
    /* ignore */
  }
}
function clearRecent(): void {
  try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
}

export function mountSearchBox(target: HTMLElement, index: SearchIndex): void {
  target.innerHTML = `
    <div class="search-box__inner">
      <i class="ph ph-magnifying-glass search-box__icon"></i>
      <input type="search" class="search-box__input"
        placeholder="Ara… (örn. outbox, e-defter, polyglot)" autocomplete="off" />
      <kbd class="search-box__hint">/</kbd>
    </div>
    <div class="search-box__results" hidden></div>
  `;

  const input = target.querySelector<HTMLInputElement>('.search-box__input')!;
  const results = target.querySelector<HTMLDivElement>('.search-box__results')!;

  const showRecent = (): void => {
    const recent = loadRecent();
    if (recent.length === 0) {
      results.hidden = true;
      return;
    }
    results.innerHTML = `
      <div class="search-box__recent">
        <div class="search-box__recent-head">
          <span><i class="ph ph-clock-counter-clockwise"></i> Son aramaların</span>
          <button type="button" class="search-box__recent-clear">Temizle</button>
        </div>
        ${recent.map((q) =>
          `<button type="button" class="search-box__recent-item" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`
        ).join('')}
      </div>
    `;
    results.hidden = false;
    results.querySelector<HTMLButtonElement>('.search-box__recent-clear')?.addEventListener('click', () => {
      clearRecent();
      results.hidden = true;
    });
    results.querySelectorAll<HTMLButtonElement>('.search-box__recent-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.q ?? '';
        input.value = q;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      });
    });
  };

  let debounce: number | undefined;
  input.addEventListener('input', () => {
    if (debounce) window.clearTimeout(debounce);
    debounce = window.setTimeout(() => {
      const q = input.value.trim();
      if (q.length === 0) {
        showRecent();
        return;
      }
      if (q.length < 2) {
        results.hidden = true;
        results.innerHTML = '';
        return;
      }
      const hits = index.search(q);
      renderResults(results, hits, q);
      if (hits.length > 0) saveRecent(q);
    }, 120);
  });

  // Klavye navigasyon: ↑/↓/Enter/Esc
  let activeIdx = -1;
  const updateActive = (): void => {
    const items = results.querySelectorAll<HTMLAnchorElement>('a.search-result');
    items.forEach((el, i) => el.classList.toggle('is-active', i === activeIdx));
    const active = activeIdx >= 0 ? items[activeIdx] : undefined;
    if (active) active.scrollIntoView({ block: 'nearest' });
  };
  input.addEventListener('keydown', (e) => {
    const items = results.querySelectorAll<HTMLAnchorElement>('a.search-result');
    if (e.key === 'Escape') {
      input.value = '';
      results.hidden = true;
      activeIdx = -1;
      input.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      updateActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, -1);
      updateActive();
    } else if (e.key === 'Enter') {
      const pick = activeIdx >= 0 ? items[activeIdx] : items[0];
      if (pick) {
        pick.click();
        results.hidden = true;
      }
    }
  });

  // "/" hotkey
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!target.contains(e.target as Node)) results.hidden = true;
  });
  input.addEventListener('focus', () => {
    if (input.value.trim().length === 0) {
      showRecent();
    } else if (results.children.length > 0) {
      results.hidden = false;
    }
  });
}

function renderResults(container: HTMLDivElement, hits: SearchHit[], query: string): void {
  if (hits.length === 0) {
    container.innerHTML = `
      <div class="search-box__empty">
        <i class="ph-duotone ph-magnifying-glass-minus"></i>
        <p><strong>"${escapeHtml(query)}"</strong> için sonuç yok.</p>
        <p class="search-box__empty-hint">İpucu: outbox, doctype, polyglot, kvkk, tenancy gibi kelimeler dene.</p>
      </div>`;
    container.hidden = false;
    return;
  }
  container.hidden = false;
  container.innerHTML = `
    <div class="search-box__count" aria-live="polite">${hits.length} sonuç bulundu</div>
  `;
  for (const hit of hits) {
    const a = document.createElement('a');
    a.className = 'search-result';
    a.href = `#${hit.clusterId}`;
    a.addEventListener('click', () => {
      container.hidden = true;
    });
    a.innerHTML = `
      <div class="search-result__title">${highlight(hit.title, query)}</div>
      <div class="search-result__snippet">${highlight(hit.snippet, query)}</div>
      <div class="search-result__meta">${hit.clusterId}</div>
    `;
    container.appendChild(a);
  }
  // a11y-live region için anons
  const live = document.getElementById('a11y-live');
  if (live) live.textContent = `${hits.length} sonuç`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

function highlight(text: string, query: string): string {
  const escaped = text.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let out = escaped;
  for (const t of tokens) {
    const re = new RegExp(`(${escapeRegex(t)})`, 'gi');
    out = out.replace(re, '<mark>$1</mark>');
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
