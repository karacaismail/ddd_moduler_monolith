# Menu Hiyerarşisi Audit + Pragmatik Yeniden Düzenleme Önerisi

> **Soru**: Mevcut 11+1 group menü düzeni 60+ yaş bir öğrenci için
> aşamalı öğrenmeye uygun mu?
>
> **Kısa cevap**: **HAYIR**. Eğitim üniteleri 5 farklı gruba dağılmış,
> sürdürülebilirlik en sona itilmiş, GENEL grubunda mimari + felsefe +
> eğitim girişi karışmış. Aşamalı öğrenme **kırık**.

---

## 1. Mevcut durum — somut sayım

77 cluster, 12 group:

| Sıra | Group | Cluster | Eğitim ünitesi (edu-*) |
|---|---|---|---|
| 0 | Genel | 5 | 2 (edu-overview, edu-u01) |
| 1 | Kum Tanesi — Atomik | 2 | 1 (edu-u02) |
| 2 | Layer 0 — Kernel | **11** | 4 (edu-u03, u04, u06, u07, u09) |
| 3 | Scale Primitives | 7 | 1 (edu-u08) |
| 4 | Layer 1 — In-tree | 8 | 1 (edu-u05) |
| 5 | Layer 2 — First-party | 12 | 0 |
| 6 | Çapraz-kesen | 3 | 0 |
| 7 | Plugin DX | 2 | 0 |
| 8 | Services — Dış | 1 | 0 |
| 9 | Build & Anti-pattern | 6 | 1 (edu-u10) |
| 10 | Frontend Tech-Stack | 8 | 0 |
| 11 | Sürdürülebilirlik | 12 | 0 |
| **Toplam** | | **77** | **11** |

### 1.1 Acı gerçek: eğitim akışı kırık

10 eğitim ünitesi + edu-overview = 11 eğitim cluster'ı **6 farklı grupta dağılmış**:

| Ünite | Konu | Düştüğü grup |
|---|---|---|
| edu-overview | Müfredat tanıtım | Genel |
| edu-u01 | Yazılım nedir? | Genel |
| edu-u02 | Veri ve Tipler | Kum Tanesi |
| edu-u03 | DocType ile Model | Layer 0 (kernel arasında) |
| edu-u04 | Veritabanı Temelleri | Layer 0 (kernel arasında) |
| edu-u05 | API: REST/GraphQL | Layer 1 (party/file arasında) |
| edu-u06 | Multi-tenancy | Layer 0 |
| edu-u07 | Yetkilendirme & Güvenlik | Layer 0 |
| edu-u08 | Event Bus & Outbox | Scale (outbox arasında) |
| edu-u09 | Plugin Mimarisi | Layer 0 |
| edu-u10 | Deploy & Operations | Build & Anti-pattern |

**Sonuç**: 60+ kullanıcı "u01'i okudum, u02 nerede?" derken **3. group'a atlamak zorunda**. u05'i bulmak için Layer 1'e geçmek lazım. Müfredat sırası **menüde görünmüyor**.

---

## 2. Sorunların listesi (mevcut)

### 2.1 🔴 Eğitim üniteleri parçalanmış (P0)
6 farklı grup içinde dağınık → sıralı okuma imkansız.

### 2.2 🔴 "Genel" grubu karışık (P0)
İçinde 3 mimari (overview, philosophy, board) + 2 eğitim girişi (edu-overview, edu-u01) → ne mimari katalog ne eğitim girişi belli değil.

### 2.3 🟡 Order alanı tutarsız (P1)
- `edu-u04` order=1, `edu-u03` order=2 → DocType önce gelmesi gereken Veritabanı'ndan sonra geliyor.
- `edu-u08` order=0, ama kernel cluster'ları order=10+ → sıralama numarası farklı semantik taşıyor.

### 2.4 🟡 Group sayısı çok (P1)
12 group + 11 ana kategori → sidebar 11 satır gösteriyor (ekran görüntüsünde sığıyor ama dikey kayıyor).

### 2.5 🟡 Sürdürülebilirlik en sonda (P1)
12 cluster'lık önemli bir konu en altta — keşfedilme oranı düşer.

### 2.6 🟢 "Services — Dış" tek cluster (P2)
Tek bir cluster için ayrı group — hiyerarşi gürültüsü.

### 2.7 🟢 "Plugin DX" iki cluster (P2)
"DX & Marketplace" daha doğru tek group olabilir.

---

## 3. Pragmatik yeni düzen önerisi

### 3.1 İlke: 60+ kullanıcı yukarıdan aşağıya okur

**Sıralama mantığı**:
1. **Önce eğitim** (sıfırdan öğrenme)
2. **Sonra genel resim** (overview + philosophy)
3. **Sonra katmanlar yukarıdan aşağıya** (atom → kernel → scale → L1 → L2)
4. **Sonra çapraz konular** (cross-cut, plugin, services)
5. **Sonra üretim** (build + deploy + anti-pattern)
6. **Sonra frontend**
7. **En sonda da uzun ömür mekanizmaları** (sürdürülebilirlik — ileri seviye)

### 3.2 Yeni group yapısı (13 grup)

| Yeni # | Group adı | İkon | Cluster sayısı | İçerik |
|---|---|---|---|---|
| 0 | 🎓 **Eğitim Yolu** | `ph-graduation-cap` | **11** | edu-overview + u01-u10 (sırayla) |
| 1 | 🗺 **Genel Harita** | `ph-list-checks` | **3** | overview, philosophy, board |
| 2 | 🧱 **Atomik Tipler** | `ph-circle-half` | **1** | atomic-types |
| 3 | ⚙ **Kernel — Layer 0** | `ph-cube` | **6** | k-schema, k-identity, k-authz, k-tenancy, k-bus, k-plugin |
| 4 | 📈 **Scale Primitives** | `ph-trend-up` | **6** | outbox, projections, counter, workers, saga, idempotency |
| 5 | 🔧 **Layer 1 — In-tree** | `ph-stack` | **7** | party, file, workflow, notification, audit, search, misc |
| 6 | 📦 **Layer 2 — Stack ürünler** | `ph-package` | **12** | commerce, accounting, hrms, pms, lms, cms, social, mrp, ai, marketing, helpdesk, drive |
| 7 | 🔀 **Çapraz-kesen** | `ph-arrows-out` | **3** | cc-tr, cc-security, cc-obs |
| 8 | 🧩 **Plugin DX + Services** | `ph-puzzle-piece` | **3** | dx-cli, dx-marketplace, services |
| 9 | 🚀 **Build & Deploy** | `ph-flag-banner` | **5** | file-layout, product-mapping, build-sequence, anti-patterns, deploy-yap |
| 10 | 🖥 **Frontend Tech-Stack** | `ph-device-mobile` | **8** | fe-* (8 cluster) |
| 11 | ♾ **Sürdürülebilirlik — 50 yıl yaşam** | `ph-infinity` | **12** | sus-* (12 cluster) |
| **Toplam** | | | **77** | (aynı) |

### 3.3 Eğitim Yolu grubu (en üstte) — detay

```
🎓 EĞİTİM YOLU (11)
  ├─ edu-overview     "Müfredat — bu dökümanı nasıl okumalı"
  ├─ edu-u01          "Ünite 01: Yazılım nedir?"
  ├─ edu-u02          "Ünite 02: Veri ve Tipler"
  ├─ edu-u03          "Ünite 03: DocType ile Model"
  ├─ edu-u04          "Ünite 04: Veritabanı Temelleri"
  ├─ edu-u05          "Ünite 05: API: REST ve GraphQL"
  ├─ edu-u06          "Ünite 06: Multi-tenancy"
  ├─ edu-u07          "Ünite 07: Yetkilendirme & Güvenlik"
  ├─ edu-u08          "Ünite 08: Event Bus & Outbox"
  ├─ edu-u09          "Ünite 09: Plugin Mimarisi"
  └─ edu-u10          "Ünite 10: Deploy & Operations"
```

60+ kullanıcı **tek bir gruba klikleyip 11 satırı sırayla okuyabilir**.

---

## 4. Etki yarıçapı analizi (neyi değiştirmek lazım?)

### 4.1 JSON dosyaları — **GÜNCELLEME GEREK**

| Dosya | Değişiklik |
|---|---|
| `content/manifest.json` | 13 group + her cluster'ın `cluster` alanı yeni gruba taşınır |
| `content/clusters/*.json` (11 edu) | her edu cluster'ın `cluster: "meta"` → `cluster: "edu"` ataması |
| `content/clusters/*.json` (services) | `cluster: "services"` → `cluster: "dx"` (birleştirme) |
| Diğer ~65 cluster | order veya cluster alanı sadece kozmetik değişebilir |

**Toplam etki**: manifest + ~15 cluster JSON dosyası.

### 4.2 TypeScript/Engine kodu — **DEĞİŞTİRMEK GEREK YOK** ✓

Engine `manifest.groups` listesini olduğu gibi okur ve cluster'ları `cluster` alanına göre gruplar. **Hardcoded group adı yok.**

Doğrulama: `src/engine/toc.ts` içinde:
```ts
const groupMap = new Map<string, TocGroup>();
for (const g of manifest.groups) {
  groupMap.set(g.id, { id: g.id, label: g.label, ... });
}
```

→ Tamamen veri-tabanlı, group adı/sayısı serbest.

### 4.3 HTML — **DEĞİŞTİRMEK GEREK YOK** ✓

`index.html` sadece `<nav id="toc">` div'ini bekler; içerik runtime'da JSON'dan üretilir.

### 4.4 SCSS — **DEĞİŞTİRMEK GEREK YOK** ✓

`.toc__group` ve `.toc__item` selector'ları group adına bağlı değil. Group sayısı değişirse otomatik uyum sağlar.

### 4.5 Zod schema — **DEĞİŞTİRMEK GEREK YOK** ✓

`ClusterLayerSchema` (kernel/scale/l1/l2/l3/atomic/meta) zaten enum — sadece **yeni "edu" değeri eklenmesi** gerekirse Zod tarafında 1 satır:

```ts
export const ClusterLayerSchema = z.enum([
  'kernel', 'scale', 'l1', 'l2', 'l3', 'atomic', 'meta',
  'edu', 'sus',  // YENİ — eğitim ve sürdürülebilirlik katmanları
]);
```

Ama bu **opsiyonel** çünkü `layer` alanı zaten optional; sadece `cluster` (group ID) zorunlu.

### 4.6 Test piramidi — **DEĞİŞTİRMEK GEREK YOK** ✓

Birim testleri manifest'i mock'lar; grup adına bağımlı değil.

### 4.7 CI / Audit script'leri — **DEĞİŞTİRMEK GEREK YOK** ✓

`validate:content` Zod ile sözleşme bütünlüğünü kontrol eder; group adına bağımlı değil. `audit-60plus` ve `audit-lesson-uniqueness` cluster bazlı çalışır; group sırası önemsiz.

---

## 5. Çözüm planı — adım adım

### Adım 1: Manifest güncelleme (1 dosya)
- 13 yeni group tanımı (sıralama doğru)
- Her cluster'ın `cluster` alanı doğru gruba taşınır
- Order alanı her grup içinde yeniden numaralanır (1, 2, 3...)

### Adım 2: Edu cluster'ların `cluster` alanı (11 dosya)
- `meta` / `atomic` / `layer0` / `scale` / `layer1` / `build` gruplarından
- → tamamı yeni `"edu"` group ID'sine taşınır

### Adım 3: Services + DX birleştirme (1 dosya)
- `services` cluster'ının `cluster: "services"` → `"dx"`

### Adım 4: Doğrulama (otomatik)
- `npx tsc --noEmit` → temiz
- `npm run validate:content` → 0 kırık ref
- `audit:60plus` → 0/0/0
- Tarayıcıda görsel kontrol

### Adım 5: Belgeleme
- `AUDIT-REPORT v17` güncellenir
- Bu doküman repo'da kalır (gelecek referans)

**Tahmini değişim**: 1 manifest + 12 cluster JSON = **13 dosya**.
**Engine + UI + Test kodu**: **DOKUNULMAZ**.

---

## 6. Sayısal karşılaştırma — eski vs yeni

| Metrik | Mevcut | Önerilen |
|---|---|---|
| Group sayısı | 12 | 13 |
| Eğitim üniteleri tek grupta | ✗ (6 grupta dağınık) | ✓ (1 grup: Eğitim Yolu) |
| 60+ kullanıcı sıralı okuyabilir | ✗ | ✓ |
| GENEL grubu karışık | ✗ (mimari+eğitim) | ✓ (sadece genel harita) |
| Sürdürülebilirlik ön planda | ✗ (en sonda) | ✓ (ayrı grup, görünür) |
| Services + DX birleşik | ✗ (2 ayrı grup) | ✓ (tek grup) |
| Engine değişikliği | yok | yok ✓ |
| HTML/SCSS değişikliği | — | yok ✓ |
| Toplam değişen dosya | — | ~13 (sadece veri) |

---

## 7. Sonuç & Aksiyon

**Mevcut durum**: 60+ kullanıcı için eğitim akışı **kırık**. Müfredat sırası 6 farklı grupta dağınık; kullanıcı "u02 nerede?" sorusunu sormak zorunda.

**Önerilen**: Pragmatik 13 grup düzeni — eğitim üstte, sürdürülebilirlik ayrı görünür grup, services+DX birleştirme.

**Etki**:
- ✅ Eğitim sıralı okunabilir (tek grup, 11 ünite)
- ✅ Group başlıkları açık (mimari katalog ≠ eğitim ≠ frontend)
- ✅ Kullanıcı yukarıdan aşağıya nezih akış izler
- ✅ **Engine/HTML/SCSS dokunulmaz** — sadece veri güncellenir
- ✅ Yeni eklenen sus grubu görünür kalır
- ✅ Test/CI script'leri etkilenmez

**Önerilen aksiyon**: Adım 1-5 sırayla yap → ~13 JSON dosyası güncellenir, tarayıcıda anında yeni menü görünür.

---

*Audit tarihi: 2026-06-06.*
*Hazırlayan: küme 1 + küme 2 birleşik 77 cluster analiziyle.*
