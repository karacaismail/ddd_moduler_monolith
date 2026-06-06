import { describe, it, expect, beforeEach } from 'vitest';
import { parseRoute, updateQuery, hasActiveFilter } from '@/engine/router';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('parseRoute', () => {
  it('hash + query parametrelerini okur', () => {
    window.history.replaceState({}, '', '/?layer=kernel&cluster=k-schema#section');
    const state = parseRoute();
    expect(state.hash).toBe('#section');
    expect(state.filterLayer).toBe('kernel');
    expect(state.filterCluster).toBe('k-schema');
  });
  it('boş URL\'de undefined döner', () => {
    const state = parseRoute();
    expect(state.filterLayer).toBeUndefined();
    expect(state.filterCluster).toBeUndefined();
  });
});

describe('updateQuery', () => {
  it('default replace mode history\'ye yazmaz', () => {
    const before = window.history.length;
    updateQuery({ layer: 'kernel' });
    expect(window.history.length).toBe(before);
    expect(window.location.search).toContain('layer=kernel');
  });
  it('push mode history\'ye yazar', () => {
    updateQuery({ layer: 'kernel' }, 'push');
    expect(window.location.search).toContain('layer=kernel');
  });
  it('null veya \'\' değer paramı siler', () => {
    window.history.replaceState({}, '', '/?layer=kernel');
    updateQuery({ layer: null });
    expect(window.location.search).not.toContain('layer');
  });
});

describe('hasActiveFilter', () => {
  it('hiç filter yoksa false', () => {
    expect(hasActiveFilter()).toBe(false);
  });
  it('layer set ise true', () => {
    window.history.replaceState({}, '', '/?layer=meta');
    expect(hasActiveFilter()).toBe(true);
  });
});
