import { describe, it, expect } from 'vitest';
import { BlockRegistry } from '@/engine/registry';
import type { RenderContext } from '@/engine/renderer';

const ctx = {} as RenderContext;

describe('BlockRegistry', () => {
  it('register + has + render çalışır', () => {
    const r = new BlockRegistry();
    r.register('paragraph' as never, (b) => {
      const el = document.createElement('p');
      el.textContent = (b as { text?: string }).text ?? '';
      return el;
    });
    expect(r.has('paragraph')).toBe(true);
    const el = r.render({ type: 'paragraph', text: 'foo' } as never, ctx);
    expect(el.textContent).toBe('foo');
  });

  it('bilinmeyen block tipi → block-error UI', () => {
    const r = new BlockRegistry();
    const el = r.render({ type: 'unknown-type' } as never, ctx);
    expect(el.classList.contains('block-error')).toBe(true);
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.innerHTML).toContain('unknown-type');
    expect(el.innerHTML).toContain('henüz desteklenmiyor');
  });

  it('renderer hata fırlatırsa block-error gösterilir', () => {
    const r = new BlockRegistry();
    r.register('boom' as never, () => {
      throw new Error('patladı');
    });
    const el = r.render({ type: 'boom' } as never, ctx);
    expect(el.classList.contains('block-error')).toBe(true);
    expect(el.innerHTML).toContain('Render hatası');
    expect(el.innerHTML).toContain('patladı');
  });

  it('block-error mesajı escape edilir (XSS koruması)', () => {
    const r = new BlockRegistry();
    r.register('xss' as never, () => {
      throw new Error('<script>alert(1)</script>');
    });
    const el = r.render({ type: 'xss' } as never, ctx);
    expect(el.innerHTML).not.toContain('<script>alert(1)</script>');
    expect(el.innerHTML).toContain('&lt;script');
  });
});
