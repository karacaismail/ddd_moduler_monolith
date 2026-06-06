/* eslint-disable no-console */
/**
 * Cluster içerik validator — pre-commit / CI için.
 *
 * Çalıştırma: npm run validate:content
 *
 * Yapılan kontroller:
 *   1. Manifest şema doğrulaması (Zod)
 *   2. Her cluster JSON için şema doğrulaması
 *   3. Manifest entry → dosya var mı + dosya id == manifest id
 *   4. Cluster-ref ({{ref:id}}) bütünlüğü: referans verilen cluster var mı
 *   5. Terim çakışması: aynı terim iki cluster'da farklı tanımlı mı
 *
 * Exit code:
 *   0 → temiz
 *   1 → şema veya bütünlük hatası
 *   2 → uyarı var (terim çakışması)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClusterSchema, ManifestSchema, type Cluster } from '../src/types/content';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'content');

interface Report {
  errors: string[];
  warnings: string[];
}

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function collectRefs(block: unknown, out: Set<string>): void {
  if (!block || typeof block !== 'object') return;
  for (const v of Object.values(block)) {
    if (typeof v === 'string') {
      const m = v.matchAll(/\{\{ref:([a-z0-9-]+)\}\}/g);
      for (const match of m) out.add(match[1]!);
    } else if (Array.isArray(v)) {
      for (const item of v) collectRefs(item, out);
    } else if (typeof v === 'object') {
      collectRefs(v, out);
    }
  }
}

function collectTerms(cluster: Cluster, registry: Map<string, { def: string; cluster: string }>, report: Report): void {
  for (const block of cluster.blocks ?? []) {
    if (!block || typeof block !== 'object' || !('type' in block)) continue;
    if (block.type !== 'terms') continue;
    const pairs = (block as { pairs?: Array<{ term: string; def: string }> }).pairs ?? [];
    for (const p of pairs) {
      const key = p.term.toLowerCase().trim();
      const existing = registry.get(key);
      if (existing && existing.def !== p.def) {
        report.warnings.push(
          `Terim çakışması: "${p.term}" iki yerde farklı tanımlı — ${existing.cluster} vs ${cluster.id}`,
        );
      } else {
        registry.set(key, { def: p.def, cluster: cluster.id });
      }
    }
  }
}

async function main(): Promise<void> {
  const report: Report = { errors: [], warnings: [] };

  // 1. Manifest
  const manifestFile = join(CONTENT_DIR, 'manifest.json');
  if (!existsSync(manifestFile)) {
    console.error('manifest.json bulunamadı:', manifestFile);
    process.exit(1);
  }
  const manifestJson = loadJson(manifestFile);
  const manifestParsed = ManifestSchema.safeParse(manifestJson);
  if (!manifestParsed.success) {
    report.errors.push('Manifest şema hatası:');
    report.errors.push(JSON.stringify(manifestParsed.error.format(), null, 2));
  }
  const manifest = manifestParsed.success ? manifestParsed.data : null;

  // 2. Cluster dosyaları
  const clusters: Cluster[] = [];
  const clusterIds = new Set<string>();
  if (manifest) {
    for (const entry of manifest.clusters) {
      const file = join(CONTENT_DIR, entry.file);
      if (!existsSync(file)) {
        report.errors.push(`Manifest'te tanımlı dosya yok: ${entry.file}`);
        continue;
      }
      try {
        const raw = loadJson(file);
        const parsed = ClusterSchema.safeParse(raw);
        if (!parsed.success) {
          report.errors.push(`Cluster şema hatası (${entry.file}):`);
          for (const issue of parsed.error.issues.slice(0, 5)) {
            report.errors.push(`  · ${issue.path.join('.')}: ${issue.message}`);
          }
        } else {
          if (parsed.data.id !== entry.id) {
            report.errors.push(
              `ID uyumsuzluğu: manifest=${entry.id}, dosya=${parsed.data.id} (${entry.file})`,
            );
          }
          clusters.push(parsed.data);
          clusterIds.add(parsed.data.id);
        }
      } catch (err) {
        report.errors.push(`JSON parse hatası (${entry.file}): ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // 3. Ref bütünlüğü
  for (const cluster of clusters) {
    const refs = new Set<string>();
    for (const block of cluster.blocks ?? []) collectRefs(block, refs);
    for (const ref of refs) {
      if (!clusterIds.has(ref)) {
        report.errors.push(`Kırık ref: ${cluster.id} → {{ref:${ref}}} (hedef cluster yok)`);
      }
    }
  }

  // 4. Terim çakışması
  const termRegistry = new Map<string, { def: string; cluster: string }>();
  for (const cluster of clusters) collectTerms(cluster, termRegistry, report);

  // 5. Lesson coverage — 60+ pedagojik içerik kapsama oranı
  let totalEnrichable = 0;
  let lessonCount = 0;
  const clusterCoverage: Array<{ id: string; total: number; covered: number }> = [];
  function walkForLessons(node: unknown, counters: { total: number; covered: number }): void {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) walkForLessons(item, counters);
      return;
    }
    const obj = node as Record<string, unknown>;
    if ('enrich' in obj && obj.enrich && typeof obj.enrich === 'object') {
      counters.total++;
      const en = obj.enrich as { lesson?: unknown };
      if (en.lesson && typeof en.lesson === 'object') counters.covered++;
    }
    for (const v of Object.values(obj)) {
      if (typeof v === 'object') walkForLessons(v, counters);
    }
  }
  for (const cluster of clusters) {
    const counters = { total: 0, covered: 0 };
    walkForLessons(cluster.blocks ?? [], counters);
    totalEnrichable += counters.total;
    lessonCount += counters.covered;
    clusterCoverage.push({ id: cluster.id, total: counters.total, covered: counters.covered });
  }

  // Raporla
  console.log(`Toplam cluster: ${clusters.length}`);
  console.log(`Tekil terim: ${termRegistry.size}`);
  if (totalEnrichable > 0) {
    const pct = Math.round((lessonCount / totalEnrichable) * 100);
    console.log(`60+ Lesson kapsama: ${lessonCount}/${totalEnrichable} (%${pct})`);
    if (process.argv.includes('--coverage')) {
      console.log('\nCluster bazında kapsama:');
      for (const c of clusterCoverage.sort((a, b) => a.covered / (a.total || 1) - b.covered / (b.total || 1))) {
        const p = c.total === 0 ? '—' : `%${Math.round((c.covered / c.total) * 100)}`;
        console.log(`  ${c.id.padEnd(30)} ${String(c.covered).padStart(3)}/${String(c.total).padEnd(3)} ${p}`);
      }
    }
  }
  if (report.warnings.length > 0) {
    console.warn(`\nUyarılar (${report.warnings.length}):`);
    for (const w of report.warnings) console.warn('  ⚠ ' + w);
  }
  if (report.errors.length > 0) {
    console.error(`\nHatalar (${report.errors.length}):`);
    for (const e of report.errors) console.error('  ✗ ' + e);
    process.exit(1);
  }
  if (report.warnings.length > 0) {
    process.exit(2);
  }
  console.log('\nTemiz — şema, ref bütünlüğü ve terim tutarlılığı OK.');
}

main().catch((err) => {
  console.error('Validator çöktü:', err);
  process.exit(1);
});
