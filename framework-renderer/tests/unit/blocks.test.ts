import { describe, it, expect, beforeEach } from 'vitest';
import type { RenderContext } from '@/engine/renderer';
import type { Cluster } from '@/types/content';
import { paragraphRenderer } from '@/blocks/paragraph';
import { listRenderer } from '@/blocks/list';
import { calloutRenderer } from '@/blocks/callout';
import { codeRenderer } from '@/blocks/code';
import { kvRowRenderer } from '@/blocks/kv-row';
import { termsRenderer } from '@/blocks/terms';
import { checklistRenderer } from '@/blocks/checklist';

function mkCtx(): RenderContext {
  const cluster: Cluster = {
    id: 'test', title: 'Test Cluster', cluster: 'meta', order: 0,
    blocks: [],
  } as unknown as Cluster;
  return {
    cluster,
    loader: { getCluster: () => null, allClusters: () => [] } as never,
    registry: { render: (b: { type: string }) => document.createTextNode(b.type) as never } as never,
    resolveRef: () => null,
    renderMarkup: (s: string) => s,
    renderBlock: () => document.createElement('div'),
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('paragraphRenderer', () => {
  it('text\'i renderMarkup üzerinden p > innerHTML\'e basar', () => {
    const el = paragraphRenderer({ type: 'paragraph', text: 'merhaba' }, mkCtx());
    expect(el.tagName).toBe('P');
    expect(el.classList.contains('block-paragraph')).toBe(true);
    expect(el.innerHTML).toContain('merhaba');
  });
  it('enrich varsa is-clickable + data-detail-key alır', () => {
    const el = paragraphRenderer({
      type: 'paragraph', text: 'merhaba dünya',
      enrich: { lesson: { ne: 'test' } },
    }, mkCtx());
    expect(el.classList.contains('is-clickable')).toBe(true);
    expect(el.dataset.detailKey).toBeTruthy();
  });
});

describe('listRenderer', () => {
  it('items array\'ini ul > li\'lere böler', () => {
    const el = listRenderer({ type: 'list', items: ['bir', 'iki', 'üç'] }, mkCtx());
    expect(el.tagName).toBe('UL');
    expect(el.querySelectorAll('li')).toHaveLength(3);
  });
  it('item object ise text alanını okur', () => {
    const el = listRenderer({
      type: 'list',
      items: [{ text: 'item', enrich: { info: 'hint' } }],
    }, mkCtx());
    const li = el.querySelector('li');
    expect(li?.textContent).toContain('item');
  });
});

describe('calloutRenderer', () => {
  it.each(['tip', 'info', 'warning', 'critical', 'tr'] as const)(
    'variant=%s render eder', (variant) => {
      const el = calloutRenderer({
        type: 'callout', variant, label: 'Başlık', body: 'Gövde',
      }, mkCtx());
      expect(el.classList.contains(`block-callout--${variant}`)).toBe(true);
      expect(el.textContent).toContain('Başlık');
      expect(el.textContent).toContain('Gövde');
    },
  );
});

describe('codeRenderer', () => {
  it('details > summary + pre yapısı kurar', () => {
    const el = codeRenderer({
      type: 'code', lang: 'typescript', content: 'const x = 1;',
    }, mkCtx());
    expect(el.tagName).toBe('DETAILS');
    expect(el.querySelector('summary')).toBeTruthy();
    expect(el.querySelector('pre code')?.innerHTML).toContain('const');
  });
  it('lang bilinmiyorsa içerik escape edilir', () => {
    const el = codeRenderer({
      type: 'code', lang: 'plain', content: '<script>alert(1)</script>',
    }, mkCtx());
    expect(el.querySelector('code')?.innerHTML).not.toContain('<script>');
    expect(el.querySelector('code')?.innerHTML).toContain('&lt;script');
  });
  it('summary tıklaması propagate edilmez (cluster header çakışmasın)', () => {
    const el = codeRenderer({
      type: 'code', lang: 'plain', content: 'x',
    }, mkCtx());
    const summary = el.querySelector('summary')!;
    let bubbled = false;
    document.addEventListener('click', () => { bubbled = true; }, { once: true });
    summary.click();
    // stopPropagation summary'de bağlı — bubble engellenmiş olmalı
    expect(bubbled).toBe(false);
  });
});

describe('kvRowRenderer', () => {
  it('pairs\'i dl/dt/dd olarak render eder', () => {
    const el = kvRowRenderer({
      type: 'kv-row',
      pairs: [{ key: 'Ad', value: 'Ali' }, { key: 'Yaş', value: '30' }],
    }, mkCtx());
    expect(el.querySelectorAll('.block-kv__pair, .kv__pair')).toHaveLength(2);
    expect(el.textContent).toContain('Ad');
    expect(el.textContent).toContain('Ali');
  });
});

describe('termsRenderer', () => {
  it('her terimi başlık + anlam ile basar', () => {
    const el = termsRenderer({
      type: 'terms',
      terms: [{ term: 'DDD', meaning: 'Domain Driven Design' }],
    }, mkCtx());
    expect(el.textContent).toContain('DDD');
    expect(el.textContent).toContain('Domain');
  });
});

describe('checklistRenderer', () => {
  it('items kadar checkbox üretir', () => {
    const el = checklistRenderer({
      type: 'checklist',
      title: 'Test',
      storageKey: 'test-chk',
      items: [{ label: 'bir' }, { label: 'iki' }],
    }, mkCtx());
    expect(el.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
  });

  it('checkbox tıklanınca localStorage güncellenir', () => {
    const el = checklistRenderer({
      type: 'checklist',
      title: 'T',
      storageKey: 'tk',
      items: [{ label: 'a' }],
    }, mkCtx());
    document.body.appendChild(el);
    const cb = el.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    const stored = localStorage.getItem('fw.chk.tk');
    expect(stored).toBe('[true]');
  });

  it('opsiyonel item\'ları progress\'e saymaz', () => {
    const el = checklistRenderer({
      type: 'checklist',
      title: 'T',
      storageKey: 'tk2',
      items: [{ label: 'zorunlu' }, { label: 'op', optional: true }],
    }, mkCtx());
    const prog = el.querySelector('.block-checklist__progress');
    // İlk durumda 0/1 (sadece zorunlu sayılır)
    expect(prog?.textContent).toMatch(/0\/1/);
  });
});
