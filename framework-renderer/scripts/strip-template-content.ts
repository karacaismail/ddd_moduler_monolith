/* eslint-disable no-console */
/**
 * Template-kirli enrich alanlarını topluca temizle.
 *
 * Hedef: eski autogenerate edilmiş enrich.detail ve enrich.stories alanlarını
 * tespit edip SİL. Geride sadece manuel yazılmış lesson/info/terms kalır.
 * Render engine "lesson yoksa placeholder" davranışını gösterir.
 *
 * Çalıştırma:
 *   npx tsx scripts/strip-template-content.ts          → DRY RUN (raporla, dosyaya yazma)
 *   npx tsx scripts/strip-template-content.ts --write  → değişiklikleri uygula
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'content', 'clusters');

// Template kalıntı kalıpları — bu cümleler varsa autogenerate'den geliyor
const TEMPLATE_MARKERS = [
  'Framework bu özelliği primitive olarak sunar — plugin geliştirici',
  'pratiğini sıfırdan yazmaz',
  'özelliğini sistem tasarımı sürecinde kullanmak ister',
  'özelliği bu süreçte devreye girer',
  'Manifest\'ten talep eder, kodda hazır API çağırır',
  'UI\'da nihai çıktıyı (form/sayfa/akış) deneyimler',
  'Bu özellik o modülün vazgeçilmez parçalarından biridir',
  'Sıfırdan açıklama:** Hiç sistem bilmeyen biri için',
  'Yan etkisi: tek noktadan tutarlı davranış, daha az hata',
  '**Amaç:** Framework\'ün modüler bir parçası',
  'Aşağıdaki gerçek dünya örneklerinde 3 farklı kullanıcı perspektifinden',
  'tekrar tekrar ihtiyaç duyulan bir yetkinliktir',
  'çözümünün gerekçesi: aynı problemi farklı yerlerde yeniden çözmek',
  'tek-noktadan tutarlı** bir karar yayar',
  'Tutarsızlık ve kopya kod riskini ortadan kaldırır',
  '**primitive** olarak sunar: plugin/kullanıcı sıfırdan yazmaz',
  'frontend tarafında UI bileşeni / sayfa / form alanı',
  'backend tarafında DocType / hook / scale primitive seviyesinde yer alır',
  'Olayın türü',
  '**Plugin geliştirici** bu primitive\'i tanımlar/genişletir',
];

function hasTemplate(s: string): boolean {
  return TEMPLATE_MARKERS.some((m) => s.includes(m));
}

function isTemplateStory(story: unknown): boolean {
  if (!story || typeof story !== 'object') return false;
  const s = story as { persona?: string; context?: string; outcome?: string };
  const blob = `${s.persona ?? ''} ${s.context ?? ''} ${s.outcome ?? ''}`;
  return hasTemplate(blob);
}

interface CleanReport {
  cluster: string;
  detailsCleared: number;
  storiesRemoved: number;
}

function clean(node: unknown, report: CleanReport): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) clean(item, report);
    return;
  }
  const obj = node as Record<string, unknown>;
  if ('enrich' in obj && obj.enrich && typeof obj.enrich === 'object') {
    const en = obj.enrich as Record<string, unknown>;
    // detail: template ise sil
    if (typeof en.detail === 'string' && hasTemplate(en.detail)) {
      delete en.detail;
      report.detailsCleared++;
    }
    // stories: her birini değerlendir, template olanları çıkar
    if (Array.isArray(en.stories)) {
      const filtered = (en.stories as unknown[]).filter((s) => !isTemplateStory(s));
      const removed = (en.stories as unknown[]).length - filtered.length;
      if (removed > 0) {
        report.storiesRemoved += removed;
        if (filtered.length === 0) delete en.stories;
        else en.stories = filtered;
      }
    }
  }
  for (const v of Object.values(obj)) clean(v, report);
}

function main(): void {
  const apply = process.argv.includes('--write');
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json')).sort();
  const totals: CleanReport = { cluster: 'TOPLAM', detailsCleared: 0, storiesRemoved: 0 };
  const perFile: CleanReport[] = [];

  for (const f of files) {
    const p = join(CONTENT_DIR, f);
    const raw = readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    const report: CleanReport = { cluster: f, detailsCleared: 0, storiesRemoved: 0 };
    clean(data, report);
    if (report.detailsCleared + report.storiesRemoved > 0) {
      perFile.push(report);
      totals.detailsCleared += report.detailsCleared;
      totals.storiesRemoved += report.storiesRemoved;
      if (apply) {
        writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
      }
    }
  }

  console.log('═══ Template Strip Raporu ═══');
  console.log(`Dosya başına temizlenen detail ve story:`);
  for (const r of perFile.sort((a, b) => b.detailsCleared + b.storiesRemoved - (a.detailsCleared + a.storiesRemoved))) {
    console.log(`  ${r.cluster.padEnd(30)} detail: ${String(r.detailsCleared).padStart(3)}  stories: ${String(r.storiesRemoved).padStart(3)}`);
  }
  console.log('───────────────────────');
  console.log(`TOPLAM detail temizlendi:  ${totals.detailsCleared}`);
  console.log(`TOPLAM story temizlendi:   ${totals.storiesRemoved}`);
  console.log(apply ? '\n✓ Yazıldı.' : '\nDRY RUN — --write ile uygula.');
}

main();
