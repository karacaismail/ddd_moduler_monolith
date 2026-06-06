import type { BlockRenderer } from '@/engine/registry';
import { makeDetailKey } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type MermaidBlock = {
  type: 'mermaid';
  title?: string;
  content: string;
  enrich?: Enrichment;
};

let mermaidPromise: Promise<unknown> | null = null;
function loadMermaid(): Promise<unknown> {
  if (mermaidPromise) return mermaidPromise;
  mermaidPromise = new Promise((resolve, reject) => {
    const w = window as Window & { mermaid?: unknown };
    if (w.mermaid) return resolve(w.mermaid);
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    s.async = true;
    s.onload = () => {
      const m = (window as Window & { mermaid?: { initialize: (cfg: unknown) => void } }).mermaid;
      if (!m) return reject(new Error('mermaid yüklenemedi'));
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      m.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default', securityLevel: 'strict' });
      resolve(m);
    };
    s.onerror = () => reject(new Error('mermaid CDN erişilemedi'));
    document.head.appendChild(s);
  });
  return mermaidPromise;
}

let counter = 0;

export const mermaidRenderer: BlockRenderer<MermaidBlock> = (block, ctx) => {
  const wrap = document.createElement('figure');
  wrap.className = 'block-mermaid';
  if (block.title) {
    const cap = document.createElement('figcaption');
    cap.className = 'block-mermaid__title';
    cap.textContent = block.title;
    wrap.appendChild(cap);
  }
  const target = document.createElement('div');
  target.className = 'block-mermaid__chart';
  target.id = `mermaid-${++counter}`;
  // İlk durumda metin olarak göster (mermaid yüklenirken kullanıcı içeriği görür)
  target.innerHTML = `<pre class="block-mermaid__source">${escapeHtml(block.content)}</pre>`;
  wrap.appendChild(target);

  // Detail panel kancası
  const dk = makeDetailKey(block.enrich, {
    title: block.title ?? 'Diyagram',
    summary: block.content.slice(0, 200),
    contextLabel: ctx.cluster.title,
  });
  if (dk) {
    wrap.dataset.detailKey = dk;
    wrap.classList.add('is-clickable');
  }

  // Async render
  loadMermaid().then((m) => {
    const mm = m as { render: (id: string, src: string) => Promise<{ svg: string }> };
    return mm.render(target.id + '-svg', block.content);
  }).then(({ svg }) => {
    target.innerHTML = svg;
  }).catch((err) => {
    target.innerHTML = `
      <div class="block-error" role="alert">
        <i class="ph ph-warning-circle"></i>
        <div class="block-error__body">
          <strong>Diyagram çizilemedi</strong>
          <div class="block-error__msg">${escapeHtml(err instanceof Error ? err.message : String(err))}</div>
        </div>
      </div>`;
  });
  return wrap;
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}
