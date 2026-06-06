# Mobile-First UI/UX/UED — Kural

> Bu doküman ZORUNLU. Yeni bileşen yazan herkes bu pattern'i uygular.

## Tek temel referans

```
min-text-size = 1rem (16px)
```

Hiçbir okunabilir metin 1rem'in altına inmez. Chip, badge, hint, tooltip,
meta-row, footer mikro yazı — hepsi en az 1rem.

İkonlar farklı: ikon büyüklüğü 0.85rem - 1.5rem arası serbest.

## Mobile-first CSS pattern

### Yanlış (desktop-first):
```scss
.foo {
  font-size: 1.25rem;
  padding: 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;

  @media (max-width: 720px) {
    font-size: 1rem;
    padding: 1rem;
    grid-template-columns: 1fr;
  }
}
```

### Doğru (mobile-first):
```scss
.foo {
  font-size: 1rem;
  padding: 1rem;
  display: grid;
  grid-template-columns: 1fr;

  @media (min-width: 720px) {
    font-size: 1.125rem;
    padding: 1.5rem;
    grid-template-columns: 1fr 1fr;
  }
  @media (min-width: 1024px) {
    font-size: 1.25rem;
    padding: 2rem;
    grid-template-columns: 1fr 1fr 1fr;
  }
}
```

## Breakpoint'ler

| Ad | min-width | Hedef |
|---|---|---|
| (base) | 0 | telefon dik, 320-419px |
| sm | 420px | telefon yatay / küçük tablet |
| md | 720px | tablet |
| lg | 1024px | dizüstü |
| xl | 1240px | masaüstü geniş |

## UX (kullanıcı deneyimi)

- **Tap target**: en az 44×44px (Apple HIG) / 48×48dp (Material).
- **Hit slop**: butonların etrafında 8px görünmez genişleme.
- **Scroll**: yatay scroll YASAK; sadece tablo ve kod blokları için izinli.
- **Sticky**: appbar + filter-bar yapışkan; içerik bunların ALTINDA kaymalı.
- **Tek elle erişim**: bottom-actions tercih (top toolbar değil).

## UED (kullanıcı arayüz dinamiği)

- **Animasyon**: 200-300ms, `cubic-bezier(0.2, 0.8, 0.2, 1)` (Material spring).
- **Hover**: telefonlarda yok; touch-action ile dokun-bekle gözardı.
- **Focus**: 3px outline, accent renk, 2px offset — klavye erişilebilir.
- **Reduced motion**: `prefers-reduced-motion: reduce` durumunda
  tüm animasyonlar 0.01ms'ye iner.

## Spacing

| Token | Mobile | Desktop |
|---|---|---|
| --space-1 | 0.25rem | 0.25rem |
| --space-2 | 0.5rem | 0.5rem |
| --space-3 | 0.75rem | 0.75rem |
| --space-4 | 1rem | 1.25rem |
| --space-5 | 1.25rem | 1.5rem |
| --space-6 | 1.5rem | 2rem |

> Mobil için padding/margin --space-4'ten KÜÇÜK olmalı (1rem ≤). Daha
> büyük değerler ekranın ¼'ünü kaplar.

## Çakışma denetimi

Bu kuralları ihlal eden CSS için audit script eklenecek
(`scripts/audit-mobile-first.ts` — gelecek). Şimdilik kod gözden
geçirmede el ile kontrol.

## Önemli yasaklar

- ❌ `font-size: 0.X rem` (1rem'in altı)
- ❌ `@media (max-width: ...)` ilk önce — sadece "büyük ekran sadeleştirmesi" için
- ❌ `position: fixed` ile çakışan iki tane (sadece tek katman)
- ❌ `overflow-x: scroll` body düzeyinde
- ❌ `tap-highlight-color: none` (sadece spesifik buton için)

## Uygunluk kontrolü (örnekler)

```bash
# Sub-1rem font-size bul
grep -E "font-size: 0\.[0-9]+rem" src/styles/main.scss

# max-width media queries (mobile-first için azalmalı)
grep -c "@media (max-width" src/styles/main.scss

# min-width media queries (artmalı)
grep -c "@media (min-width" src/styles/main.scss
```

## Mevcut durum (audit)

- Sub-1rem text font-size: **0** (v8 sonrası tamamı 1rem'e çıkarıldı)
- max-width queries: 68 (azaltılması hedef)
- min-width queries: 52 (artırılması hedef)
- min-text token: `--fs-xs: 1rem` ✓
