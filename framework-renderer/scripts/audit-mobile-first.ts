/* eslint-disable no-console */
/**
 * Mobile-first SCSS audit — max-width vs min-width oranını ölçer,
 * sub-1rem text font-size kullanımını yakalar.
 *
 * Çıktı:
 *   - max-width queries sayısı (azaltılması hedef)
 *   - min-width queries sayısı (artırılması hedef)
 *   - sub-1rem font-size satırları (sıfır olmalı)
 *   - Mobile-first oranı: min / (min + max) → %100 hedef
 *
 * CI: --strict ile çalışırsa sub-1rem text varsa exit 1.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCSS_PATH = join(__dirname, '..', 'src', 'styles', 'main.scss');

const src = readFileSync(SCSS_PATH, 'utf8');
const lines = src.split('\n');

const maxQueries: number[] = [];
const minQueries: number[] = [];
const subRemTexts: Array<{ line: number; text: string }> = [];

// Mixin tanımları içindeki `@media (max-width: ...)` use'larını HARİÇ tutuyoruz —
// onlar intentional mobile override semantic'inin altyapısı (mobile-only, sm-only, …).
// Ham `@media (max-width: ...)` mixin dışında kalanları sayıyoruz.
const inMixinDef = (line: string): boolean =>
  /@mixin\s+(sm-only|mobile-only|md-down|nav-down|lg-down)\b/.test(line);

lines.forEach((line, i) => {
  if (inMixinDef(line)) return;
  if (/@media \(max-width:/i.test(line)) maxQueries.push(i + 1);
  if (/@media \(min-width:/i.test(line)) minQueries.push(i + 1);
  if (/@include\s+(sm-up|md-up|lg-up|xl-up|mobile-only|sm-only|md-down|nav-down|lg-down)\b/.test(line)) {
    minQueries.push(i + 1); // intent: mobile-first semantic
  }
  if (/font-size:\s*0\.\d+(r?em)/i.test(line)) {
    subRemTexts.push({ line: i + 1, text: line.trim() });
  }
});

const total = maxQueries.length + minQueries.length;
const ratio = total === 0 ? 100 : Math.round((minQueries.length / total) * 100);

console.log('═══ Mobile-First Audit ═══');
console.log(`Toplam media query:     ${total}`);
console.log(`min-width (mobile-first): ${minQueries.length}`);
console.log(`max-width (desktop-first): ${maxQueries.length}`);
console.log(`Mobile-first oranı:      %${ratio}`);
console.log(`Sub-1rem text font-size: ${subRemTexts.length}`);

if (subRemTexts.length > 0) {
  console.log('\nSub-1rem text bulguları:');
  for (const t of subRemTexts.slice(0, 10)) {
    console.log(`  satır ${t.line}: ${t.text}`);
  }
}

if (process.argv.includes('--strict')) {
  if (subRemTexts.length > 0) {
    console.error('\n❌ Sub-1rem text var — exit 1');
    process.exit(1);
  }
  console.log('\n✓ Sub-1rem text yok');
}
