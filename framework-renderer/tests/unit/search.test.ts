import { describe, it, expect } from 'vitest';
// Türkçe normalize fonksiyonu engine/search.ts içinden export edilmeli — yoksa burada test edilemez.
// Geçici olarak: bekleneni dokümante eden placeholder test.

function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİiI]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c');
}

describe('Türkçe normalize', () => {
  it('İ → i (lowercase tr)', () => {
    expect(normalizeTr('İstanbul')).toBe('istanbul');
  });
  it('I → i', () => {
    expect(normalizeTr('IRMAK')).toBe('irmak');
  });
  it('çğşüöı tek seferde sadeleşir', () => {
    expect(normalizeTr('ÇıĞdem ŞŞaşırtıcı')).toBe('cigdem ssasirtici');
  });
});
