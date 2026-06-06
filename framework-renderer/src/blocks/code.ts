import type { BlockRenderer } from '@/engine/registry';
import { escapeHtml } from '@/engine/refs';
import { highlight } from '@/engine/highlight';
import { makeDetailKeyFromText } from '@/components/detail-panel';
import { toast } from '@/components/toast';

type CodeBlock = { type: 'code'; lang: string; content: string; title?: string };

export const codeRenderer: BlockRenderer<CodeBlock> = (block, ctx) => {
  const lang = block.lang || 'plain';
  const lines = block.content.split('\n').length;
  const title = block.title || `Kod örneği`;

  const details = document.createElement('details');
  details.className = `block-code block-code--${lang}`;
  // Code accordion açıldıktan sonra title üstüne tıklamayı detail-panel için ayrı buton ile veriyoruz
  void makeDetailKeyFromText; // unused for now (avoid lint)
  void ctx;
  // varsayılan kapalı (open attribute eklenmez)

  const summary = document.createElement('summary');
  summary.className = 'block-code__summary';
  // Cluster header click handler (detail panel) ile çakışmasın
  summary.addEventListener('click', (e) => e.stopPropagation());
  summary.innerHTML = `
    <span class="block-code__chevron" aria-hidden="true">
      <i class="ph ph-caret-right"></i>
    </span>
    <span class="block-code__title">${escapeHtml(title)}</span>
    <span class="block-code__meta">
      <span class="block-code__lang">${escapeHtml(lang)}</span>
      <span class="block-code__lines">${lines} satır</span>
    </span>
  `;
  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'block-code__body';

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.className = `language-${lang}`;
  // Highlight engine — bilinmeyen dil için escape edilmiş ham içerik döner
  code.innerHTML = highlight(block.content, lang);
  pre.appendChild(code);
  body.appendChild(pre);

  // Copy button (body içinde — sadece açıkken görünür)
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'block-code__copy';
  copyBtn.setAttribute('aria-label', 'Kodu kopyala');
  copyBtn.innerHTML = '<i class="ph ph-copy"></i>';
  copyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(block.content).then(
      () => {
        copyBtn.innerHTML = '<i class="ph ph-check"></i>';
        toast('Kod kopyalandı', 'success');
        setTimeout(() => (copyBtn.innerHTML = '<i class="ph ph-copy"></i>'), 1500);
      },
      () => toast('Kopyalama başarısız', 'error'),
    );
  });
  body.appendChild(copyBtn);

  details.appendChild(body);
  return details;
};
