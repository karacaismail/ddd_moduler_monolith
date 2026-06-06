import { describe, it, expect } from 'vitest';
import { escapeHtml, resolveInlineMarkup, type RefResolver } from '@/engine/refs';

const noResolver: RefResolver = () => null;
const resolver: RefResolver = (id) =>
  id === 'overview' ? { title: 'Overview', cluster: 'meta' } : null;

describe('escapeHtml', () => {
  it('HTML özel karakterlerini escape eder', () => {
    expect(escapeHtml('<script>&"\'</script>')).toBe(
      '&lt;script&gt;&amp;&quot;&#39;&lt;/script&gt;',
    );
  });
  it('düz metni değiştirmez', () => {
    expect(escapeHtml('merhaba dünya')).toBe('merhaba dünya');
  });
});

describe('resolveInlineMarkup — bold/italic/code', () => {
  it('**bold** → <strong>', () => {
    expect(resolveInlineMarkup('bu **kalın** metin', noResolver)).toContain(
      '<strong>kalın</strong>',
    );
  });
  it('*italic* → <em>', () => {
    expect(resolveInlineMarkup('bu *eğik* metin', noResolver)).toContain('<em>eğik</em>');
  });
  it('`code` → <code>', () => {
    expect(resolveInlineMarkup('`foo` çalışır', noResolver)).toContain('<code>foo</code>');
  });
});

describe('resolveInlineMarkup — refs', () => {
  it('bilinen {{ref:overview}} → <a href="#overview">', () => {
    const out = resolveInlineMarkup('bkz. {{ref:overview}}', resolver);
    expect(out).toContain('href="#overview"');
    expect(out).toContain('Overview');
  });
  it('bilinmeyen ref → ref--missing span', () => {
    const out = resolveInlineMarkup('{{ref:yok}}', resolver);
    expect(out).toContain('ref--missing');
    expect(out).toContain('yok');
  });
});

describe('resolveInlineMarkup — external link', () => {
  it('[text](https://…) → external link target="_blank"', () => {
    const out = resolveInlineMarkup('bkz. [docs](https://docs.example.com)', noResolver);
    expect(out).toContain('href="https://docs.example.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener"');
  });
});

describe('resolveInlineMarkup — güvenlik', () => {
  it('XSS denemesi escape edilir', () => {
    const out = resolveInlineMarkup('<img src=x onerror="alert(1)">', noResolver);
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img');
  });
});
