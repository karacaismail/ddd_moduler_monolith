/* eslint-disable no-console */
/**
 * Her cluster JSON dosyası için `lastUpdated` alanını git log'dan en son
 * commit tarihiyle günceller. CI'da build öncesi koşturulması önerilir.
 *
 * Çalıştırma:
 *   npx tsx scripts/sync-last-updated.ts            # dry-run
 *   npx tsx scripts/sync-last-updated.ts --write    # gerçekten yaz
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT_DIR = join(ROOT, 'content', 'clusters');
const REPO_ROOT = join(ROOT, '..'); // monorepo varsayımı

function lastCommitDate(file: string): string | null {
  try {
    const rel = relative(REPO_ROOT, file);
    const out = execSync(`git log -1 --format=%cs -- "${rel}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
    return out || null;
  } catch (err) {
    console.warn('git log failed for', file, err);
    return null;
  }
}

function main(): void {
  const apply = process.argv.includes('--write');
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json')).sort();
  let updated = 0;
  for (const f of files) {
    const p = join(CONTENT_DIR, f);
    const date = lastCommitDate(p);
    if (!date) continue;
    const raw = readFileSync(p, 'utf8');
    const data = JSON.parse(raw) as { id?: string; lastUpdated?: string };
    if (data.lastUpdated === date) continue;
    data.lastUpdated = date;
    updated++;
    if (apply) {
      writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
      console.log(`  ${data.id ?? f}: ${date}`);
    } else {
      console.log(`  (dry) ${data.id ?? f}: ${date}`);
    }
  }
  console.log(`\n${updated} dosya ${apply ? 'güncellendi' : 'güncellenmesi gerekiyor'}.`);
  if (!apply) console.log('Gerçekten yazmak için --write ekleyin.');
}

main();
