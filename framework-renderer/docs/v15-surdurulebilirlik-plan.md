# v15 PLAN — Sürdürülebilirlik İçerik Eklemesi

> Kullanıcı kuralı: **önce planla → data model/schema → test planı → coding → test**.
> Bu plan onaylanmadan koda dokunulmaz.

## 1. Kaynak içerik özeti

**3 dosya okundu:**
- `scompass_artifact_wf-...md` — DDD repo 50-yıl sürdürülebilirlik analizi (P0-1...P2-11, 11 öneri)
- `ek_arastirma_surdurulebilirlik.md` — Sürdürülebilirlik mekanizmaları + kalıtım raporu (7 bölüm)
- `surdurulebilirlik_raporu.html` — Yukarıdaki MD'nin HTML render'ı

**Ana mesaj:** Uzun-ömür "iyi mimari"den değil **mekanizma**dan gelir. 8 referans sistem (Linux, Stripe, Salesforce, Drupal, Shopify, PostgreSQL, IBM i, Odoo) + 11 öneri (P0-1...P2-11).

## 2. Data Model — Yeni Cluster Grubu

### 2.1 Group tanımı (manifest.json'a eklenecek)

```json
{
  "id": "sus",
  "label": "Sürdürülebilirlik",
  "icon": "ph-infinity",
  "order": 11
}
```

### 2.2 12 Yeni Cluster

| # | Cluster ID | Başlık | Kaynak | Order |
|---|---|---|---|---|
| 1 | `sus-overview` | Sürdürülebilirlik haritası — neden mekanizma? | TL;DR + Bölüm 1 giriş | 90 |
| 2 | `sus-bc-policy` | Sözleşme kapısı — "Don't break userspace" | Linux 1.1 + PostgreSQL 1.6 | 91 |
| 3 | `sus-versioning` | Tarih-tabanlı versiyonlama + dönüşüm katmanı | Stripe 1.2 | 92 |
| 4 | `sus-boundaries` | Makine-zorlamalı modül sınırı (CI kapısı) | Shopify Packwerk 1.5 | 93 |
| 5 | `sus-codemod` | Otomatik upgrade — kendini-yükselten döngü | Drupal Rector 1.4 | 94 |
| 6 | `sus-timi` | DocType → TIMI stabil arayüz | IBM i 1.7 | 95 |
| 7 | `sus-bitemporal` | Bitemporal immutable kayıt — tek doğruluk | XTDB 1.5 | 96 |
| 8 | `sus-actions` | Tipli kinetik aksiyon yüzeyi (AI için) | Palantir Ontology Bölüm 2 | 97 |
| 9 | `sus-declarative` | Declarative resource'tan türetme | Ash Framework Bölüm 3 | 98 |
| 10 | `sus-durable` | Postgres-native durable execution | DBOS Bölüm 3 | 99 |
| 11 | `sus-metadata` | Her-şey-metadata (introspectable kayıt) | ServiceNow Bölüm 2 | 100 |
| 12 | `sus-conformance` | Test-önce sözleşme koşumu | PostgreSQL + Hypothesis | 101 |

### 2.3 Cluster JSON şablonu (her cluster için)

```json
{
  "id": "sus-XXX",
  "title": "...",
  "subtitle": "...",
  "cluster": "sus",
  "order": NN,
  "icon": "ph-...",
  "tags": ["sustainability", "...", "..."],
  "enrich": {
    "info": "1 cümlede ne",
    "lesson": {
      "ne": "...",
      "nicin": "...",
      "nasil": "...",
      "nerede": "...",
      "ne_zaman": "...",
      "kim": "...",
      "analoji": "günlük yaşamdan metafor"
    },
    "stories": [
      { "persona": "...", "context": "...", "outcome": "..." },
      { "persona": "...", "context": "...", "outcome": "..." }
    ],
    "terms": [
      { "term": "...", "meaning": "...", "why": "..." }
    ]
  },
  "blocks": [
    { "type": "paragraph", "text": "..." },
    { "type": "callout", "variant": "info", "label": "Miras", "body": "Hangi sistemden geliyor" },
    { "type": "kv-row", "pairs": [{ "key": "Etki", "value": "..." }] },
    { "type": "examples", "title": "Gerçek hayattan", "items": [...] }
  ]
}
```

## 3. Test Planı

### 3.1 Otomatik testler (CI gate)

| Test | Komut | Geçme şartı |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 hata |
| SCSS compile | `npx sass src/styles/main.scss /tmp/out.css` | 0 hata |
| Schema validation | `npm run validate:content` | 0 hata |
| Ref bütünlüğü | aynı script | 0 kırık ref |
| 60+ jargon audit | `npm run audit:60plus` | 0/0/0 |
| Lesson benzersizlik | `npx tsx scripts/audit-lesson-uniqueness.ts` | analoji tekrarı <7x |
| Mobile-first | `npm run audit:mobile` | %100 + sub-1rem 0 |

### 3.2 Manuel görsel kontrol (kullanıcı)

- Tarayıcıda yeni cluster'ları tıkla
- Sağ panelde lesson + stories gerçek metaforlu mu
- Markdown render düzgün (**bold** çalışıyor)
- Neumorphism UI yeni cluster'larda da çalışıyor
- Mobile'da kart genişlikleri uygun

### 3.3 İçerik kalite kontrolü

| Kural | Doğrulama |
|---|---|
| Her cluster lesson taşır | top-level `enrich.lesson` ne/nicin/nasil/analoji mevcut |
| Stories metaforlu | Persona somut kişi + günlük yaşam ihtiyacı |
| Analoji unique | Aynı cluster içinde tekrar yok |
| Jargon sade | "primitive/payload/pipeline" YOK; varsa parantezde açıklama |
| Türkçe | Tüm metin TR |
| Min 1rem text | (engine garantili) |

## 4. Coding Sırası

```
Adım 1: manifest.json'a "sus" group ekle (1 değişiklik)
Adım 2: 12 cluster JSON dosyası oluştur (önce iskelet, sonra içerik)
Adım 3: Her cluster için:
  - enrich.lesson yaz (cluster-specific)
  - enrich.stories yaz (3 metaforlu örnek)
  - enrich.terms yaz (3-5 kavram)
  - blocks yaz (paragraph + callout + table veya kv-row)
Adım 4: Tüm testleri koş (Test Planı §3.1)
Adım 5: Audit sonuçlarını rapora ekle
Adım 6: AUDIT-REPORT v15 güncelle
```

## 5. Etki Yarıçapı Analizi

**Etkilenen sistemler:**
- ✓ `content/manifest.json` — 1 group + 12 cluster entry
- ✓ `content/clusters/` — 12 yeni dosya
- ✗ Engine kodu — değişiklik YOK
- ✗ SCSS — değişiklik YOK
- ✗ TS şema — değişiklik YOK (mevcut Zod yeterli)

**Etkilenmeyenler:**
- Mevcut 72 cluster'ın hiçbirine dokunulmaz
- UI/UX neumorphism aynı kalır
- Audit eşikleri korunur

## 6. Riskler

| Risk | Önlem |
|---|---|
| Yeni içerikte jargon | audit:60plus CI'da fail eder |
| Analoji tekrarı | audit:uniqueness ölçer |
| Schema hatası | validate:content CI'da fail eder |
| Cluster sayısı 72→84 (büyüme) | Manifest order alanı doğru girilir, sus grup ayrı menüde |

## 7. Onay sonrası gidiş

Plan onaylanırsa:
1. Önce manifest.json + boş 12 cluster JSON iskeleti (validate çalışır)
2. Sırayla content (sus-overview → sus-bc-policy → ...)
3. Her cluster sonrası audit gözden geçirme
4. Sonunda v15 AUDIT-REPORT

**Tahmini boyut:** 12 cluster × ~300 satır JSON = ~3.600 satır içerik + 1 manifest güncellemesi.

**Tahmini lesson sayısı kazanımı:** 12 top-level + ~36 alt-item = **~48 yeni manuel lesson**.

---

*Plan hazır. Devam etmek için "yap" veya "uygula" komutu yeterli.*
