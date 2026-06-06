import type { Block, BlockType } from '@/types/content';
import type { RenderContext } from './renderer';

/**
 * BlockRegistry — block type → renderer function eşlemesi.
 * Yeni bir block tipi eklemek için bir renderer yazıp register etmek yeterli.
 */

export type BlockRenderer<T extends Block = Block> = (
  block: T,
  ctx: RenderContext,
) => HTMLElement;

export class BlockRegistry {
  private renderers = new Map<BlockType, BlockRenderer>();

  register<T extends Block>(type: T['type'], renderer: BlockRenderer<T>): this {
    this.renderers.set(type, renderer as BlockRenderer);
    return this;
  }

  has(type: string): boolean {
    return this.renderers.has(type as BlockType);
  }

  render(block: Block, ctx: RenderContext): HTMLElement {
    const renderer = this.renderers.get(block.type);
    if (!renderer) {
      console.warn(`[registry] no renderer for block type: ${block.type}`);
      return makeErrorBlock(
        'Bu blok tipi henüz desteklenmiyor',
        `<code>${escapeText(block.type)}</code> bloğu için renderer kayıtlı değil. JSON şemasını veya registry'yi kontrol edin.`,
        'ph-puzzle-piece',
      );
    }
    try {
      return renderer(block, ctx);
    } catch (err) {
      console.error(`[registry] render failed for ${block.type}:`, err);
      const message = err instanceof Error ? err.message : String(err);
      return makeErrorBlock(
        `Render hatası — ${block.type}`,
        escapeText(message),
        'ph-warning-circle',
      );
    }
  }
}

function escapeText(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;',
  );
}

function makeErrorBlock(title: string, message: string, icon: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'block-error';
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <i class="ph ${icon}" aria-hidden="true"></i>
    <div class="block-error__body">
      <strong>${escapeText(title)}</strong>
      <div class="block-error__msg">${message}</div>
    </div>
  `;
  return el;
}
