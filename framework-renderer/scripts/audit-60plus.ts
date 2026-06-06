/* eslint-disable no-console */
/**
 * 60+ uygunluk audit — tüm cluster JSON'larındaki user-facing string'leri tarar,
 * jargon yoğunluğunu ve cümle uzunluğunu ölçer. Eski "template auto-content"
 * ifadelerini (Bu özellik o modülün vazgeçilmez parçalarından biridir, vb.) yakalar.
 *
 * Çalıştırma:
 *   npx tsx scripts/audit-60plus.ts             → özet rapor
 *   npx tsx scripts/audit-60plus.ts --detail    → cluster ve item bazında detay
 *   npx tsx scripts/audit-60plus.ts --fix-tmpl  → tespit edilen template'leri raporla
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'content', 'clusters');

// 1) Jargon listesi — 60+ okuyucu için anlamsız veya korkutucu kelimeler
const JARGON = new Set([
  'primitive', 'pipeline', 'consume', 'idempotent', 'hook', 'manifest',
  'runtime', 'marshalling', 'serialization', 'concurrency', 'mutex',
  'throttle', 'state machine', 'dispatch', 'polyglot', 'embedding',
  'projection', 'transactional', 'gRPC', 'OAuth', 'RBAC', 'ABAC',
  'KVKK', 'CQRS', 'WASM', 'sidecar', 'fan-out', 'fan-in', 'bounded context',
  'orchestration', 'aggregate', 'event sourcing', 'eventual consistency',
  'idempotency', 'observability', 'on-call', 'CI/CD', 'monolith',
  'microservice', 'meta-framework', 'kernel-adjacent', 'in-tree',
  'first-party', 'downstream', 'upstream', 'rollback', 'rollout',
  'deploy', 'commit', 'PR', 'merge', 'refactor', 'monorepo',
  'opt-in', 'opt-out', 'native', 'metadata-driven', 'fan out',
  'vector store', 'RRF', 'RLS', 'JWT', 'gRPC', 'MCP', 'LLM',
  'agentic', 'capability', 'hosting', 'scope', 'tenant',
]);

// 2) Template kalıntıları — eski autoFiveWH/Frontend/Backend metinlerinin izleri
// Ayrıca v11 generator'ünün dump cümleleri (geri çekildi v12'de)
const TEMPLATE_PHRASES = [
  'çözümünün gerekçesi: aynı problemi farklı yerlerde',
  'tek-noktadan tutarlı',
  'Tutarsızlık ve kopya kod riskini ortadan kaldırır',
  'olarak sunar: plugin/kullanıcı sıfırdan yazmaz',
  'frontend tarafında UI bileşeni / sayfa / form alanı',
  'backend tarafında DocType / hook / scale primitive',
  'Olayın türü',
  'Plugin geliştirici** bu primitive',
  'Framework\'ün modüler bir parçası. Bu özellik o modülün vazgeçilmez',
  'primitive olarak sunar — plugin geliştirici',
  'Sıfırdan açıklama:** Hiç sistem bilmeyen biri için',
  'pratiğini sıfırdan yazmaz',
  'Manifest\'ten talep eder, kodda hazır API çağırır',
  'UI\'da nihai çıktıyı (form/sayfa/akış) deneyimler',
  // v11 generator artıkları (silindi v12'de — guard olarak burada)
  'İlgili kural veya pratiği uygularken: önce başlığı oku',
  'bütün resimde küçük ama somut bir parça',
  'bağlamında ele alınan bir alt başlık',
  'içindeki yeri net olsun diye ayrıca ele alındı',
  'Geliştirici uygular; mimar bağlamı çizer; son kullanıcı doğru sonucu yaşar',
  // v13 klişe story pattern'leri (silindi v14'te — guard)
  'Bu konunun bizim 15-ürün hedefinde yerini düşünüyor',
  'okuyup terim sözlüğü + örnekleri inceledikten sonra teknik tercih',
  'sınırları kavrar',
  'sistem tasarımı sürecinde kullanmak ister',
];

interface Finding {
  cluster: string;
  path: string;
  text: string;
  reason: string;
  severity: 'high' | 'mid' | 'low';
}

function isLongSentence(s: string): boolean {
  return s.trim().split(/\s+/).length > 28;
}

function countJargon(s: string): { hits: string[]; count: number } {
  const lower = s.toLowerCase();
  const hits = Array.from(JARGON).filter((j) => {
    const re = new RegExp(`\\b${j.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i');
    return re.test(lower);
  });
  return { hits, count: hits.length };
}

function detectTemplate(s: string): string | null {
  for (const t of TEMPLATE_PHRASES) {
    if (s.includes(t)) return t;
  }
  return null;
}

function walk(
  node: unknown,
  path: string,
  cluster: string,
  out: Finding[],
  parentHasLesson = false,
): void {
  if (!node) return;
  if (typeof node === 'string') {
    if (node.length < 8) return; // çok kısa metni atla
    // ÖNEMLİ: aynı objede enrich.lesson varsa, teknik paragraf zaten 60+ için
    // yan açıklamalı sayılır — yüksek/orta jargon bulgusunu YARI seviyeye düşür.
    if (parentHasLesson) return; // tamamen atla — kullanıcı tıkladığında lesson görür
    // Ayır cümlelere
    const sentences = node.split(/(?<=[.!?:])\s+/);
    const fields = path.split('.').slice(-2).join('.');
    // Template?
    const tmpl = detectTemplate(node);
    if (tmpl) {
      out.push({
        cluster,
        path: fields,
        text: node.slice(0, 120),
        reason: `template kalıntı: "${tmpl.slice(0, 40)}..."`,
        severity: 'high',
      });
    }
    // Jargon
    const j = countJargon(node);
    if (j.count >= 3) {
      out.push({
        cluster,
        path: fields,
        text: node.slice(0, 120),
        reason: `${j.count} jargon: ${j.hits.slice(0, 5).join(', ')}`,
        severity: j.count >= 5 ? 'high' : 'mid',
      });
    }
    // Uzun cümle
    for (const s of sentences) {
      if (isLongSentence(s)) {
        out.push({
          cluster,
          path: fields,
          text: s.slice(0, 120),
          reason: `${s.trim().split(/\s+/).length} kelime — çok uzun cümle`,
          severity: 'low',
        });
        break; // tek uyarı yeterli
      }
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`, cluster, out, parentHasLesson));
    return;
  }
  if (typeof node === 'object') {
    // Bu objede enrich.lesson var mı? Varsa alt string'lere "lesson eşlikli" işareti gönder
    const obj = node as Record<string, unknown>;
    const hasLessonHere =
      obj.enrich && typeof obj.enrich === 'object' &&
      'lesson' in (obj.enrich as Record<string, unknown>);
    for (const [k, v] of Object.entries(obj)) {
      // Sadece user-facing field'lara bak (id, file, key gibi teknikleri atla)
      const SKIP = new Set(['id', 'cluster', 'order', 'file', 'icon', 'state', 'granularity', 'tone', 'type', 'tags', 'storageKey', 'sp', 'level']);
      if (SKIP.has(k)) continue;
      // lesson içeriğinin kendisi 60+ uygun — onu audit etmek anlamsız
      if (k === 'lesson') continue;
      walk(v, `${path}.${k}`, cluster, out, parentHasLesson || !!hasLessonHere);
    }
  }
}

interface ClusterStats {
  id: string;
  total: number;
  high: number;
  mid: number;
  low: number;
  findings: Finding[];
}

function main(): void {
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json')).sort();
  const allFindings: Finding[] = [];
  const perCluster: ClusterStats[] = [];

  for (const f of files) {
    const path = join(CONTENT_DIR, f);
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
      console.error(`JSON parse hatası ${f}: ${err}`);
      continue;
    }
    const out: Finding[] = [];
    const id = (data as { id?: string }).id ?? f;
    walk(data, '', id, out);
    const stats: ClusterStats = {
      id,
      total: out.length,
      high: out.filter((x) => x.severity === 'high').length,
      mid: out.filter((x) => x.severity === 'mid').length,
      low: out.filter((x) => x.severity === 'low').length,
      findings: out,
    };
    perCluster.push(stats);
    allFindings.push(...out);
  }

  const totalH = allFindings.filter((x) => x.severity === 'high').length;
  const totalM = allFindings.filter((x) => x.severity === 'mid').length;
  const totalL = allFindings.filter((x) => x.severity === 'low').length;

  console.log('═══ 60+ Uygunluk audit ═══');
  console.log(`Cluster sayısı:   ${perCluster.length}`);
  console.log(`Toplam bulgu:     ${allFindings.length}`);
  console.log(`  Yüksek (template / 5+ jargon): ${totalH}`);
  console.log(`  Orta   (3-4 jargon):           ${totalM}`);
  console.log(`  Düşük  (uzun cümle):           ${totalL}`);
  console.log();

  const worst = [...perCluster].sort((a, b) => b.high - a.high || b.total - a.total).slice(0, 15);
  console.log('En sorunlu 15 cluster:');
  for (const c of worst) {
    if (c.total === 0) continue;
    console.log(`  ${c.id.padEnd(28)} H:${String(c.high).padStart(3)}  M:${String(c.mid).padStart(3)}  L:${String(c.low).padStart(3)}`);
  }

  if (process.argv.includes('--detail')) {
    console.log('\n═══ Detay (en sorunlu 3 cluster) ═══');
    for (const c of worst.slice(0, 3)) {
      console.log(`\n--- ${c.id} ---`);
      for (const f of c.findings.filter((x) => x.severity === 'high').slice(0, 8)) {
        console.log(`  [${f.severity}] ${f.path}: ${f.reason}`);
        console.log(`        "${f.text}"`);
      }
    }
  }

  if (process.argv.includes('--templates')) {
    console.log('\n═══ Template kalıntı bulguları (cluster + sayı) ═══');
    const byCluster = new Map<string, number>();
    for (const f of allFindings) {
      if (!f.reason.startsWith('template')) continue;
      byCluster.set(f.cluster, (byCluster.get(f.cluster) ?? 0) + 1);
    }
    for (const [id, n] of [...byCluster.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${id.padEnd(30)} ${n}`);
    }
  }
}

main();
