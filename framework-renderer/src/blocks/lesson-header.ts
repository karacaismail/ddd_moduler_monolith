import type { BlockRenderer } from '@/engine/registry';
import { makeDetailKeyFromText } from '@/components/detail-panel';

type Block = {
  type: 'lesson-header';
  unit: string;
  title: string;
  level?: 'baslangic' | 'orta' | 'ileri';
  duration_min?: number;
  prereq?: string[];
  goals?: string[];
};

const LEVEL_LABEL = { baslangic: 'Başlangıç', orta: 'Orta', ileri: 'İleri' } as const;

export const lessonHeaderRenderer: BlockRenderer<Block> = (block, ctx) => {
  const wrap = document.createElement('div');
  wrap.className = 'lesson-header';
  const summary = [block.title, (block.goals ?? []).join('. ')].filter(Boolean).join(' — ');
  const dk = makeDetailKeyFromText(summary, { title: `${block.unit} · ${block.title}`, contextLabel: ctx.cluster.title });
  if (dk) { wrap.dataset.detailKey = dk; wrap.classList.add('is-clickable'); }

  const top = document.createElement('div');
  top.className = 'lesson-header__top';
  top.innerHTML = `
    <span class="lesson-header__unit">${esc(block.unit)}</span>
    ${block.level ? `<span class="lesson-header__level lesson-header__level--${block.level}">${LEVEL_LABEL[block.level]}</span>` : ''}
    ${block.duration_min ? `<span class="lesson-header__time"><i class="ph ph-clock"></i> ~${block.duration_min} dk</span>` : ''}
  `;
  wrap.appendChild(top);

  const h = document.createElement('h3');
  h.className = 'lesson-header__title';
  h.textContent = block.title;
  wrap.appendChild(h);

  if (block.prereq && block.prereq.length > 0) {
    const pre = document.createElement('div');
    pre.className = 'lesson-header__prereq';
    pre.innerHTML =
      `<strong><i class="ph ph-stack"></i> Ön-koşul:</strong> ` +
      block.prereq
        .map((id) => {
          const t = ctx.resolveRef(id);
          return t ? `<a href="#${id}">${esc(t.title)}</a>` : `<span>${esc(id)}</span>`;
        })
        .join(' · ');
    wrap.appendChild(pre);
  }

  if (block.goals && block.goals.length > 0) {
    const g = document.createElement('div');
    g.className = 'lesson-header__goals';
    g.innerHTML =
      `<div class="lesson-header__goals-title"><i class="ph ph-target"></i> Bu ünitenin sonunda yapabileceklerin:</div>` +
      `<ul>${block.goals.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    wrap.appendChild(g);
  }

  return wrap;
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));
}
