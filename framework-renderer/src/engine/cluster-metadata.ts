import type { Block, Cluster } from '@/types/content';

/**
 * Cluster metadata yardımcıları:
 * - estReadMin verilmediyse blocks içindeki tüm string'lerden kelime sayar
 *   (200 kelime/dakika kabulüyle dakikaya çevirir; min 1).
 * - lastUpdated için kısa Türkçe formatlama.
 */

const WPM = 200;

function collectText(node: unknown, acc: string[]): void {
  if (!node) return;
  if (typeof node === 'string') {
    acc.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) collectText(v, acc);
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const SKIP = new Set(['id', 'icon', 'storageKey', 'tone', 'state', 'file', 'order', 'type']);
      if (SKIP.has(k)) continue;
      collectText(v, acc);
    }
  }
}

export function estimateReadMinutes(blocks: Block[]): number {
  const acc: string[] = [];
  collectText(blocks, acc);
  const words = acc.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WPM));
}

export function readMinutes(cluster: Cluster): number {
  return cluster.estReadMin ?? estimateReadMinutes(cluster.blocks);
}

const MONTHS_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

export function formatLastUpdated(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mm, dd] = m;
  const month = MONTHS_TR[Number(mm) - 1] ?? mm;
  return `${dd} ${month} ${y}`;
}
