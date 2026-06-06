/* eslint-disable no-console */
/**
 * Lesson benzersizlik audit'i.
 *
 * Sahte zenginlik tespiti:
 *  - Aynı analoji'nin sistem genelinde tekrar sayısı
 *  - Aynı cluster içi 'nicin' / 'nasil' benzersizlik oranı
 *
 * Çıkar:
 *  - Eşik altı (benzersizlik < %60) cluster'ları listele
 *  - CI'da --strict ile fail edebilir
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'content', 'clusters');

interface Lesson {
  ne?: string; nicin?: string; nasil?: string; nerede?: string;
  ne_zaman?: string; kim?: string; analoji?: string;
  frontend?: unknown; backend?: unknown;
}
interface LessonRecord { cluster: string; title: string; lesson: Lesson }

const records: LessonRecord[] = [];

function walk(node: unknown, cluster: string): void {
  if (!node) return;
  if (Array.isArray(node)) { for (const v of node) walk(v, cluster); return; }
  if (typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  if (obj.enrich && typeof obj.enrich === 'object') {
    const en = obj.enrich as { lesson?: Lesson };
    if (en.lesson && typeof en.lesson === 'object') {
      const title = String(obj.text ?? obj.body ?? obj.label ?? obj.name ?? obj.title ?? obj.term ?? '?').slice(0, 80);
      records.push({ cluster, title, lesson: en.lesson });
    }
  }
  for (const v of Object.values(obj)) walk(v, cluster);
}

const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json')).sort();
for (const f of files) {
  const data = JSON.parse(readFileSync(join(CONTENT_DIR, f), 'utf8'));
  walk(data, (data as { id?: string }).id ?? f);
}

// 1) Sistem geneli analoji tekrarları
const analojiCount = new Map<string, number>();
for (const r of records) {
  const a = (r.lesson.analoji ?? '').slice(0, 80);
  if (a) analojiCount.set(a, (analojiCount.get(a) ?? 0) + 1);
}
const topDups = [...analojiCount.entries()]
  .filter(([, c]) => c > 1)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

// 2) Cluster içi benzersizlik
interface ClusterStat { id: string; total: number; uniqueNicin: number; uniqueNasil: number; pct: number }
const byCluster = new Map<string, Lesson[]>();
for (const r of records) {
  const arr = byCluster.get(r.cluster) ?? [];
  arr.push(r.lesson);
  byCluster.set(r.cluster, arr);
}
const stats: ClusterStat[] = [];
for (const [id, lessons] of byCluster) {
  if (lessons.length < 3) continue;
  const nicin = new Set(lessons.map((l) => (l.nicin ?? '').slice(0, 60)));
  const nasil = new Set(lessons.map((l) => (l.nasil ?? '').slice(0, 60)));
  const pct = Math.round((Math.min(nicin.size, nasil.size) / lessons.length) * 100);
  stats.push({ id, total: lessons.length, uniqueNicin: nicin.size, uniqueNasil: nasil.size, pct });
}
const lowUnique = stats.filter((s) => s.pct < 60).sort((a, b) => a.pct - b.pct);

// Çıktı
console.log('═══ Lesson Benzersizlik Audit ═══');
console.log(`Toplam lesson: ${records.length}`);
console.log(`Benzersiz analoji: ${analojiCount.size}`);
console.log(`Tekrar eden analoji: ${topDups.length}`);

if (topDups.length > 0) {
  console.log('\nEn çok tekrar eden analoji (top 10):');
  for (const [a, c] of topDups) {
    console.log(`  ${String(c).padStart(3)}x: ${a.slice(0, 70)}`);
  }
}

if (lowUnique.length > 0) {
  console.log(`\nCluster içi benzersizlik < %60 (${lowUnique.length} cluster):`);
  for (const s of lowUnique.slice(0, 15)) {
    console.log(`  ⚠ ${s.id.padEnd(25)} ${s.total} lesson, ${s.uniqueNicin}/${s.uniqueNasil} unique (%${s.pct})`);
  }
}

const strict = process.argv.includes('--strict');
if (strict) {
  if (lowUnique.length > 0) {
    console.error(`\n❌ ${lowUnique.length} cluster benzersizlik eşik altı — exit 1`);
    process.exit(1);
  }
  if (topDups.some(([, c]) => c >= 10)) {
    console.error('\n❌ Bir analoji 10+ kez tekrar ediyor — exit 1');
    process.exit(1);
  }
  console.log('\n✓ Benzersizlik kontrolü geçti');
}
