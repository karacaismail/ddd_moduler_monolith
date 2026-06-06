# Performance Budget

Bu doküman, framework-renderer için **uygulanacak performans sınırlarını**
ve bunları doğrulayan araçları belirler. CI'da sınır aşılırsa build kırılır.

## Bundle size eşikleri

| Asset | Limit | Neden |
|---|---|---|
| `main.js` (gzip) | 80 KB | İlk render için tek istek |
| `main.css` (gzip) | 40 KB | Stiller render-blocking |
| `vendor.js` (gzip) | 60 KB | 3. parti (Zod + Phosphor stylesheet) |
| Tek bir resim | 200 KB | Lazy-load + WebP zorunlu |
| Toplam ilk yük (gzip) | **180 KB** | 3G üzerinde <3 sn render |

## Lighthouse eşikleri (CI'da zorunlu)

| Kategori | Min skor | Mevcut hedef |
|---|---|---|
| Performance | 0.85 | warn |
| Accessibility | **0.90** | **error** |
| Best Practices | 0.90 | warn |
| SEO | 0.90 | warn |

`lighthouserc.json` içinde tanımlı; CI `lighthouse` job'unda koşar.

## Web Vitals hedefleri

| Metrik | İyi | Kabul edilebilir | Kötü |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤2.5s | ≤4.0s | >4.0s |
| **INP** (Interaction to Next Paint) | ≤200ms | ≤500ms | >500ms |
| **CLS** (Cumulative Layout Shift) | ≤0.1 | ≤0.25 | >0.25 |
| **TTFB** (Time to First Byte) | ≤600ms | ≤1.5s | >1.5s |

## Bundle analiz aracı

```bash
# Görsel bundle analiz raporu (HTML çıktısı dist/stats.html)
npm install -D rollup-plugin-visualizer
# vite.config.ts → plugins'e ekle:
#   visualizer({ filename: 'dist/stats.html', open: false })
npm run build
open dist/stats.html
```

## Bundle size guard (CI önerisi)

`.github/workflows/test.yml` içine eklenebilecek adım:

```yaml
- name: Bundle size check
  run: |
    npm run build
    js_size=$(du -bk dist/assets/*.js | awk '{s+=$1} END {print s}')
    css_size=$(du -bk dist/assets/*.css | awk '{s+=$1} END {print s}')
    echo "JS: ${js_size}KB, CSS: ${css_size}KB"
    if [ "$js_size" -gt 200 ]; then echo "JS budget exceeded (>200KB)"; exit 1; fi
    if [ "$css_size" -gt 100 ]; then echo "CSS budget exceeded (>100KB)"; exit 1; fi
```

## Optimizasyon önerileri

### CSS
- Critical CSS inline → ilk render için kritik kuralları `<style>` içinde
- Non-critical lazy load
- SCSS modüler import (kullanılmayan değişkenler tree-shake)

### JS
- Mermaid lazy load (zaten yapıldı)
- Sentry lazy load (zaten yapıldı)
- Cluster JSON'lar paralel fetch (zaten yapıldı)
- Cluster JSON'lar paralel fetch (zaten yapıldı)

### Resim/Font
- WebP/AVIF tercih
- `loading="lazy"` (image block zaten kullanır)
- Font subset (Inter sadece Latin + Turkish)

### CDN
- Phosphor + fontlar `preconnect` (zaten yapıldı)
- Service worker stale-while-revalidate (zaten yapıldı)

## Mevcut performans riskleri (yapılacaklar)

- [ ] **Bundle size ölçümü canlıda yapılmadı** — ilk build sonrası rapor
- [ ] **Virtual scroll** — 300+ cluster için kritik (yapıldı)
- [ ] **Resim assets'leri yok** — image block tanımlı, henüz kullanılan yok
- [ ] **Font subset** — Google Fonts'tan tüm Latin yükleniyor; sadece TR + EN ayarı önerilir
- [ ] **Code splitting** — şu an tek bundle; route bazlı split incelenebilir

## İzleme

- **Lighthouse CI** her PR'da koşar (her job 2 run, ortalama)
- **Real User Monitoring (RUM)** — gelecek: `web-vitals` paketi + telemetry.track

## Referans

- [web.dev/vitals](https://web.dev/vitals/)
- [Lighthouse docs](https://developer.chrome.com/docs/lighthouse/overview/)
- [Bundle Phobia](https://bundlephobia.com) — paket boyutu öncesi kontrol
