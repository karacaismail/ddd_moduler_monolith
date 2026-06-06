/* eslint-disable no-console */
/** Tüm yüksek + orta bulguları yazdır (dosya yolu ile) — düzeltme için kaynak. */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'content', 'clusters');

const JARGON = ['primitive','pipeline','consume','idempotent','hook','manifest','runtime','marshalling','serialization','concurrency','mutex','throttle','dispatch','polyglot','embedding','projection','transactional','gRPC','OAuth','RBAC','ABAC','KVKK','CQRS','WASM','sidecar','fan-out','fan-in','bounded context','orchestration','aggregate','idempotency','observability','on-call','CI/CD','monolith','microservice','meta-framework','kernel-adjacent','in-tree','first-party','downstream','upstream','rollback','rollout','deploy','commit','PR','merge','refactor','monorepo','opt-in','opt-out','native','metadata-driven','vector store','RLS','JWT','MCP','LLM','agentic','tenant','tenancy'];

function countJargon(s: string): { hits: string[]; count: number } {
  const lower = s.toLowerCase();
  const hits = JARGON.filter((j) => new RegExp(`\\b${j.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(lower));
  return { hits, count: hits.length };
}

interface Hit { cluster: string; path: string; field: string; text: string; jargon: string[]; count: number }

function walk(node: unknown, path: string, cluster: string, out: Hit[]): void {
  if (!node) return;
  if (typeof node === 'string') {
    const j = countJargon(node);
    if (j.count >= 3) {
      const field = path.split('.').pop() ?? '';
      out.push({ cluster, path, field, text: node.slice(0, 200), jargon: j.hits, count: j.count });
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`, cluster, out));
    return;
  }
  if (typeof node === 'object') {
    const SKIP = new Set(['id','cluster','order','file','icon','state','granularity','tone','type','tags','storageKey','sp','level']);
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (SKIP.has(k)) continue;
      walk(v, `${path}.${k}`, cluster, out);
    }
  }
}

const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json')).sort();
const all: Hit[] = [];
for (const f of files) {
  const data = JSON.parse(readFileSync(join(CONTENT_DIR, f), 'utf8'));
  const out: Hit[] = [];
  walk(data, '', (data as { id?: string }).id ?? f, out);
  all.push(...out);
}

// Sadece info alanları (popover hover) - kullanıcının direkt göreceği yer
const infoHits = all.filter((h) => h.field === 'info').sort((a, b) => b.count - a.count);
console.log(`=== INFO alanlarında 3+ jargon: ${infoHits.length} ===`);
for (const h of infoHits) {
  console.log(`[${h.cluster}] path=${h.path}`);
  console.log(`  jargon: ${h.jargon.join(', ')}`);
  console.log(`  text: ${h.text.replace(/\n/g, ' ').slice(0, 120)}`);
  console.log();
}
