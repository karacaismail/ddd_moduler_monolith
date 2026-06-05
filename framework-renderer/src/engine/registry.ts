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
      const placeholder = document.createElement('div');
      placeholder.className = 'block-error';
      placeholder.innerHTML = `<strong>Renderer eksik:</strong> ${block.type}`;
      return placeholder;
    }
    try {
      return renderer(block, ctx);
    } catch (err) {
      console.error(`[registry] render failed for ${block.type}:`, err);
      const placeholder = document.createElement('div');
      placeholder.className = 'block-error';
      placeholder.innerHTML = `<strong>Render hatası (${block.type}):</strong> ${
        err instanceof Error ? err.message : String(err)
      }`;
      return placeholder;
    }
  }
}
