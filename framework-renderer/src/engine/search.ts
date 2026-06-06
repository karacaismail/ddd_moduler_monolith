import type { Block, Cluster } from '@/types/content';

/**
 * Basit in-memory full-text search.
 * Tüm cluster'ları index'ler; substring + tag arama, basit ranking.
 */

export interface SearchHit {
  clusterId: string;
  title: string;
  snippet: string;
  score: number;
}

interface IndexEntry {
  clusterId: string;
  title: string;
  cluster: string;
  tags: string[];
  text: string;       // flattened searchable text
  textLower: string;  // tr-aware normalize edilmiş
}

/**
 * Türkçe karakter normalize (i/İ + ş/ğ/ü/ö/ç) — toLowerCase('tr-TR') yetmez
 * çünkü ş, ğ vb karakterler aramayı sonuçsuz bırakır.
 */
export function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİiI]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c');
}

export class SearchIndex {
  private entries: IndexEntry[] = [];

  add(cluster: Cluster): void {
    const text = [cluster.title, cluster.subtitle ?? '', ...(cluster.tags ?? []), ...flattenBlocks(cluster.blocks)]
      .filter(Boolean)
      .join(' ');
    this.entries.push({
      clusterId: cluster.id,
      title: cluster.title,
      cluster: cluster.cluster,
      tags: cluster.tags ?? [],
      text,
      textLower: normalizeTr(text),
    });
  }

  reset(): void {
    this.entries = [];
  }

  search(query: string, limit = 20): SearchHit[] {
    const q = normalizeTr(query.trim());
    if (q.length < 2) return [];
    const tokens = q.split(/\s+/).filter(Boolean);

    const hits: SearchHit[] = [];
    for (const entry of this.entries) {
      let score = 0;
      const titleNorm = normalizeTr(entry.title);
      // Title match — yüksek puan
      if (titleNorm.includes(q)) score += 10;
      // Tag match
      for (const t of tokens) {
        if (entry.tags.some((tag) => normalizeTr(tag).includes(t))) score += 5;
      }
      // Body match — token başına 1 puan
      for (const t of tokens) {
        if (entry.textLower.includes(t)) score += 1;
      }
      if (score === 0) continue;
      hits.push({
        clusterId: entry.clusterId,
        title: entry.title,
        snippet: makeSnippet(entry.text, query),
        score,
      });
    }

    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit);
  }
}

function flattenBlocks(blocks: Block[]): string[] {
  const out: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        out.push(block.text);
        break;
      case 'heading':
        out.push(block.text);
        break;
      case 'callout':
        out.push(block.label ?? '', block.body);
        break;
      case 'list':
        out.push(...block.items.map((it) => (typeof it === 'string' ? it : it.text)));
        break;
      case 'feature-list':
        out.push(...block.items.map((i) => `${i.name} ${i.desc ?? ''}`));
        break;
      case 'table':
        out.push(
          ...block.headers,
          ...block.rows.flat().map((c) => (typeof c === 'string' ? c : c.text)),
        );
        break;
      case 'grid':
        out.push(...block.items.map((i) => `${i.title} ${i.body}`));
        break;
      case 'examples':
        out.push(...block.items.map((i) => `${i.label ?? ''} ${i.text}`));
        break;
      case 'kv-row':
        out.push(...block.pairs.flatMap((p) => [p.key, p.value]));
        break;
      case 'code':
        out.push(block.title ?? '', block.content);
        break;
      case 'layer-cards':
        out.push(...block.cards.map((c) => `${c.name} ${c.desc}`));
        break;
      case 'ref-grid':
        out.push(block.title ?? '');
        break;
      case 'tree':
      case 'divider':
        break;
      default: {
        // Bilinmeyen block tipleri — yüzeysel metin alanlarını topla (forward-compat)
        const anyBlock = block as Record<string, unknown>;
        for (const key of ['title', 'subtitle', 'text', 'name', 'desc', 'label', 'body']) {
          const v = anyBlock[key];
          if (typeof v === 'string') out.push(v);
        }
      }
    }
  }
  return out;
}

function makeSnippet(text: string, query: string, len = 140): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return text.slice(0, len) + (text.length > len ? '…' : '');
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return prefix + text.slice(start, end) + suffix;
}
