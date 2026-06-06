/* eslint-disable no-console */
/**
 * Build sonrası sitemap.xml üretir — manifest.json'daki cluster'lardan.
 * dist/sitemap.xml + dist/robots.txt
 *
 * Çalıştırma: npx tsx scripts/generate-sitemap.ts
 * Önerilen: vite build sonrası "postbuild" adımında.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE_URL = process.env.SITE_URL ?? 'https://karacaismail.github.io/ddd_moduler_monolith';

const manifestPath = join(ROOT, 'content', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { clusters: Array<{ id: string }> };

const urls = [
  { loc: BASE_URL + '/', priority: 1.0, changefreq: 'weekly' },
  ...manifest.clusters.map((c) => ({
    loc: `${BASE_URL}/#${c.id}`,
    priority: 0.7,
    changefreq: 'monthly',
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

const outDir = join(ROOT, 'dist');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'sitemap.xml'), xml, 'utf8');
console.log(`✓ sitemap.xml yazıldı (${urls.length} URL)`);
