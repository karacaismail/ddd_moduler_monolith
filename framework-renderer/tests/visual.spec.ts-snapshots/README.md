# Visual regression snapshots

Bu klasör `tests/visual.spec.ts` tarafından üretilen ekran görüntüsü
referans dosyalarını içerir.

## Baseline üretimi

Yerel makinede ilk kez koşturuyorsan:

```bash
npm run test:visual:update
git add tests/visual.spec.ts-snapshots/
git commit -m "test: visual baseline güncel"
```

## OS farkı

Playwright snapshot'ları **render eden işletim sistemine** bağlıdır.
CI Linux + Mac fark eder. CI'da `linux/chromium` baseline, Mac'te
`darwin/chromium` baseline ayrı tutulur.

Eğer CI'da snapshot eksikse `continue-on-error: true` ile job düşmez;
log'da hangi snapshot'ın eksik olduğu görünür. Sonra:

```bash
# CI'dan visual-diff artifact'ini indir, repo'ya yerleştir, commit at.
```

## Dinamik öğeler

Snapshot karşılaştırması sırasında otomatik gizlenen elemanlar:
- `.read-chip` (okuma süresi — zaman bağımlı)
- `.updated-chip` (son güncelleme — git'e bağımlı)
- `.reading-progress__fill` (scroll yüzdesi)

Yeni dinamik bir element eklenince `tests/visual.spec.ts` içindeki
`addStyleTag` bloğuna ekle.
