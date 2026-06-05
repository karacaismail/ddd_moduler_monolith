import type { SearchIndex, SearchHit } from '@/engine/search';

/**
 * Search box bileşeni — input + results dropdown.
 */

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

  let debounce: number | undefined;
  input.addEventListener('input', () => {
    if (debounce) window.clearTimeout(debounce);
    debounce = window.setTimeout(() => {
      const q = input.value.trim();
      if (q.length < 2) {
        results.hidden = true;
        results.innerHTML = '';
        return;
      }
      const hits = index.search(q);
      renderResults(results, hits, q);
    }, 120);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      results.hidden = true;
      input.blur();
    } else if (e.key === 'Enter') {
      const first = results.querySelector<HTMLAnchorElement>('a.search-result');
      if (first) {
        first.click();
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
    if (results.children.length > 0) results.hidden = false;
  });
}

function renderResults(container: HTMLDivElement, hits: SearchHit[], query: string): void {
  if (hits.length === 0) {
    container.innerHTML = '<div class="search-box__empty">Sonuç yok.</div>';
    container.hidden = false;
    return;
  }
  container.hidden = false;
  container.innerHTML = '';
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
      <div class="search-result__meta">${hit.clusterId} · score ${hit.score}</div>
    `;
    container.appendChild(a);
  }
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
