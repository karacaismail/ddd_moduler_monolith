import type { BlockRenderer } from '@/engine/registry';
import { registerDetail } from '@/components/detail-panel';
import type { UserStory } from '@/types/content';

type Block = { type: 'user-stories'; title?: string; stories: UserStory[] };

export const userStoriesRenderer: BlockRenderer<Block> = (block, ctx) => {
  const wrap = document.createElement('div');
  wrap.className = 'block-stories';
  const h = document.createElement('h5');
  h.className = 'block-stories__title';
  h.innerHTML = `<i class="ph ph-user-focus"></i> ${block.title ?? 'Gerçek dünya senaryoları'}`;
  wrap.appendChild(h);

  for (const s of block.stories) {
    const card = document.createElement('article');
    card.className = 'story-card';
    const dk = registerDetail({
      contextLabel: ctx.cluster.title,
      title: s.persona,
      summary: s.context,
      detail: `**Bağlam:** ${s.context}\n\n**Sonuç:** ${s.outcome}`,
      stories: [s],
    });
    if (dk) {
      card.dataset.detailKey = dk;
      card.classList.add('is-clickable');
    }
    card.innerHTML = `
      <div class="story-card__persona"><i class="ph ph-user"></i> ${escapeHtml(s.persona)}</div>
      <div class="story-card__context"><span class="story-card__tag">Bağlam</span>${escapeHtml(s.context)}</div>
      <div class="story-card__outcome"><span class="story-card__tag story-card__tag--out">Sonuç</span>${escapeHtml(s.outcome)}</div>
    `;
    wrap.appendChild(card);
  }
  return wrap;
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
