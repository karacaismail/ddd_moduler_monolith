import { describe, it, expect } from 'vitest';
import { highlight } from '@/engine/highlight';

describe('highlight engine', () => {
  it('typescript keyword\'lerini tok-kw span\'a sarar', () => {
    const out = highlight('const x = 1;', 'typescript');
    expect(out).toContain('tok-kw');
    expect(out).toContain('const');
  });
  it('string literal\'leri tok-str\'e sarar', () => {
    const out = highlight('const s = "hello";', 'typescript');
    expect(out).toContain('tok-str');
    expect(out).toContain('hello');
  });
  it('sayıları tok-num\'a sarar', () => {
    const out = highlight('let n = 42;', 'typescript');
    expect(out).toContain('tok-num');
  });
  it('// yorum satırlarını tok-cmt\'ye sarar', () => {
    const out = highlight('// bir yorum\nconst x = 1;', 'typescript');
    expect(out).toContain('tok-cmt');
  });
  it('Python def kelimesi tanınır', () => {
    const out = highlight('def foo(): pass', 'python');
    expect(out).toContain('tok-kw');
    expect(out).toContain('def');
  });
  it('bilinmeyen dil → sadece escape', () => {
    const out = highlight('<x>', 'unknown-lang');
    expect(out).toBe('&lt;x&gt;');
  });
  it('XSS güvenliği — string içinde script escape edilir', () => {
    const out = highlight('"<script>"', 'typescript');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;');
  });
});
