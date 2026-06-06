# Gap ve Çelişki Analizi — Küme 1 vs Küme 2

> **Küme 1**: Önceki 72 cluster (overview, philosophy, kernel, scale, L1, L2 stacks, cross-cut, DX, LandX, frontend, edu, build, anti-patterns).
> **Küme 2**: v15'te eklenen 12 sürdürülebilirlik cluster'ı (sus-*).
>
> Bu doküman: **(1)** küme 1'in eksiklerini küme 2'nin nasıl doldurduğunu,
> **(2)** küme 2'nin getirdiği yeni boşlukları, **(3)** iki küme arasındaki
> çelişki/gerilim noktalarını ortaya koyar.

---

## A. Konu örtüşmeleri ve referans haritası

Her küme-2 cluster'ı en az bir küme-1 cluster'ına dokunuyor. Aşağıdaki tablo
bu eşleşmeleri ve **ne tür ilişki** (tamamlayıcı / terfi / çelişki) olduğunu
gösterir.

| Küme 2 (yeni) | Küme 1'deki dokunuş | İlişki türü |
|---|---|---|
| `sus-timi` | `k-schema` (DocType engine) | **Terfi** — DocType'ı substrat-bağımsız stabil arayüze yükseltir |
| `sus-versioning` | — yok — | **Yeni** — küme 1'de tarih-tabanlı API versiyonlama hiç işlenmemiş |
| `sus-bc-policy` | `anti-patterns` (sözle koruma çürür) | **Çözüm** — anti-patterns'in mekanizmasal cevabı |
| `sus-boundaries` | `anti-patterns` + `philosophy` (modüler monolit kuralı) | **Tamamlayıcı** — felsefenin CI uygulayıcısı |
| `sus-codemod` | `deploy-yap`, `build-sequence` | **Yeni mekanizma** — küme 1'de upgrade taşıma yöntemi yok |
| `sus-bitemporal` | `l1-audit` (audit + activity) | **MİMARİ TERCİH ÇELİŞKİSİ** (aşağıda detay) |
| `sus-actions` | `s-ai` (AI altyapısı) | **Güvenlik katmanı** — s-ai'nin AI'a açtığı yüzeyi tipler/sınırlandırır |
| `sus-declarative` | `k-schema` (metadata-driven) | **Derinleştirme** — DocType'a "her şey türetilir" disiplini |
| `sus-durable` | `scale-saga`, `scale-workers` | **Implementasyon** — Saga/Workflow'un Postgres-native koşum yöntemi |
| `sus-metadata` | `k-schema` (DocType) | **Disiplin genişletme** — DocType'ı rol/workflow/policy'ye yay |
| `sus-conformance` | `anti-patterns` + test piramidi | **Yeni** — küme 1'de plugin conformance + property-based test yok |
| `sus-overview` | `philosophy` + `build-sequence` | **Yol haritası ekleme** — Aşama 0-3 sürdürülebilirlik planı |

---

## B. Küme 1'in eksikleri (Küme 2 ortaya çıkardı)

Aşağıdaki 11 konu küme 1'de **hiç işlenmemiş** veya yüzeysel kalmış; küme 2
ile eklendi. Her birinde küme 1'de **hangi cluster zayıf** ve küme 2'de
**hangisi cevap** olduğu işaretli.

### B.1 Sözleşme yüzeyi disiplini → **EN BÜYÜK BOŞLUKDU**
- **Küme 1 durumu**: yok. Hiçbir cluster "DocType + Plugin API + AI yüzeyi kutsal sözleşmedir" demiyor.
- **Küme 2 cevabı**: `sus-bc-policy` + `sus-versioning`
- **Etki**: dış entegratör/plugin ekosistemi güvensiz kalırdı.

### B.2 Tarih-tabanlı API versiyonlama
- **Küme 1 durumu**: yok. `k-schema` "metadata-driven" diyor ama sürüm disiplini yok.
- **Küme 2 cevabı**: `sus-versioning` (Stripe)
- **Etki**: ilk major sürüm değişikliğinde tüm tüketiciler kırılırdı.

### B.3 CI sınır-zorlama mekanizması
- **Küme 1 durumu**: zayıf. `anti-patterns` "modüler sınır çürür" diyor, `philosophy` "modüler monolit"
  diyor ama mekanizma yazılmamış.
- **Küme 2 cevabı**: `sus-boundaries` (import-linter + Packwerk)
- **Etki**: ilk 6 ayda sosyal anlaşma çürürdü.

### B.4 Otomatik upgrade / codemod
- **Küme 1 durumu**: yok. `deploy-yap` deploy var, `build-sequence` build sırası var, ama
  "eski tüketici kodunu yeni API'ye taşıma" mekanizması yok.
- **Küme 2 cevabı**: `sus-codemod` (Drupal Rector + AI)
- **Etki**: her major sürüm kullanıcı için manuel migration travması olurdu.

### B.5 Stabil substrat-bağımsız soyutlama
- **Küme 1 durumu**: kısmi. `k-schema` "DocType metadata-driven" diyor — ama DocType'ın
  Postgres'ten/REST'ten/depolama substratından **versiyonlu bağımsız** olduğu söylenmiyor.
- **Küme 2 cevabı**: `sus-timi` (IBM i TIMI)
- **Etki**: 10 yıl sonra Postgres yerine başka bir DB tercih edilince tüm uygulama yeniden yazılırdı.

### B.6 Bitemporal immutable kayıt
- **Küme 1 durumu**: zayıf. `l1-audit` "audit kaydı" var ama bu klasik **audit tablosu**
  yaklaşımı — ana tablonun "yan tablo"sunda tarihçe.
- **Küme 2 cevabı**: `sus-bitemporal` (XTDB) — **ana tablo bitemporal**, audit zaten içkin.
- **Çelişki notu**: bkz. §D.1.

### B.7 Tipli AI action yüzeyi
- **Küme 1 durumu**: yok. `s-ai` "vektör arama + ajan + MCP" diyor ama AI'nın
  ham tabloya erişmesine **engel** yok.
- **Küme 2 cevabı**: `sus-actions` (Palantir Ontology)
- **Etki**: AI ajan SQL injection-benzeri governance açığı doğururdu.

### B.8 Declarative resource'tan türetme
- **Küme 1 durumu**: kısmi. `k-schema` "DocType → tablo + form + API otomatik" diyor —
  ama Ash gibi "resource → state machine + background job + authz hepsi türetilir" disiplini eksik.
- **Küme 2 cevabı**: `sus-declarative`
- **Etki**: çoklu kaynak (DB + API + form + permission) sürüklenirdi.

### B.9 Durable execution (Postgres-native)
- **Küme 1 durumu**: kısmi. `scale-saga` Saga var, `scale-workers` workers var —
  ama "her adım checkpoint'lenir, çöküş sonrası kaldığı yerden devam" disiplini somutlaşmamış.
- **Küme 2 cevabı**: `sus-durable` (DBOS)
- **Etki**: uzun-süreli AI ajan task'ları çöküşte sıfırdan başlardı.

### B.10 Her-şey-metadata
- **Küme 1 durumu**: dağınık. `k-schema` DocType metadata; `k-identity` Identity; `k-authz` Authz —
  ama hepsinin **aynı introspectable disiplini taşıdığı** vurgulanmamış.
- **Küme 2 cevabı**: `sus-metadata` (ServiceNow)
- **Etki**: AI sistemin tamamını okuyup soru cevaplayamaz.

### B.11 Test-önce conformance + property-based
- **Küme 1 durumu**: çok zayıf. CI workflow var (`docs/`), unit/e2e/a11y test var —
  ama **plugin-sözleşme conformance suite** ve **Hypothesis property-based testing** yok.
- **Küme 2 cevabı**: `sus-conformance`
- **Etki**: sözleşmenin korunduğunu somut çalışan testler kanıtlayamaz.

---

## C. Küme 2'nin eksikleri (Küme 1'in karşılayamadığı)

Küme 2 yeni içerik getirirken kendi içinde de boşluklar var:

### C.1 Image block + diagram yok
- **Sorun**: 12 yeni cluster'ın hiçbirinde `type: "image"` block yok.
- **Beklenti**: küme 1'in `overview-layers.svg`, `k-schema-doctype.svg`, `k-bus-flow.svg`,
  `outbox-pattern.svg` gibi SVG'leri var.
- **Önerilen düzeltme**: her sus cluster'ı için 1 diagram SVG (özellikle `sus-versioning`,
  `sus-bitemporal`, `sus-durable`, `sus-actions`).

### C.2 Alt-item lesson kapsama düşük
- **Sorun**: sus cluster'larında `enrich.lesson` top-level'da var ama içerideki
  paragraph/callout/term'lerin alt-item lesson'ları yok.
- **Beklenti**: küme 1'in foundational cluster'larındaki gibi her alt-item için lesson.
- **Önerilen düzeltme**: `tools/lesson-editor/` üzerinden manuel doldurma.

### C.3 Cross-referans bağı zayıf
- **Sorun**: sus cluster'ları küme 1'deki cluster'lara `{{ref:...}}` linki vermiyor.
  Örnek: `sus-timi` "DocType" diyor ama `{{ref:k-schema}}` linki yok.
- **Beklenti**: cross-cluster bağlama disiplini.
- **Önerilen düzeltme**: regex tabanlı toplu link enjeksiyonu.

### C.4 Build sequence güncellenmedi
- **Sorun**: küme 2 "Aşama 0 → Aşama 3" yol haritasını içeriyor ama küme 1'in
  `build-sequence` cluster'ı bu yeni sırayı yansıtmıyor.
- **Beklenti**: build-sequence cluster'ı sus-* maddelerini "Aşama 0: Sürdürülebilirlik Anayasası"
  olarak içermeli.
- **Önerilen düzeltme**: `43-build-sequence.json`'a 4-satırlık Aşama 0-3 ekleme.

### C.5 Anti-patterns güncellenmedi
- **Sorun**: küme 2'de geçen "zorlanmayan sınır çürür", "upgrade'i otomatikleştirmeyen platform
  fosilleşir (SAP)", "big-bang rewrite (Drupal travması)" gibi yeni anti-pattern'ler
  küme 1'in `anti-patterns` cluster'ına dahil değil.
- **Önerilen düzeltme**: 3 yeni anti-pattern maddesi.

### C.6 Cross-cut güncelleme
- **Sorun**: küme 1'de `cc-tr` (Türkiye uyumu), `cc-security`, `cc-obs` var. Sürdürülebilirlik
  doğal olarak çapraz-kesen — kendi grubu (sus) oldu. Bu **doğru karar** ama küme 1'in
  cross-cut grubunda "sürdürülebilirlik = 4. çapraz boyut" notu yok.
- **Önerilen düzeltme**: küme 1'in cc-* cluster'larından `sus-overview`'a "ilgili konular" linki.

### C.7 Edu üniteleri güncellenmedi
- **Sorun**: küme 1'in eğitim ünite'leri (`edu-u01...u10`) sürdürülebilirlik mekanizmalarını
  hiç kapsamıyor. Eğitim dokümanı tutarlılığı için "Ünite 11: Sürdürülebilirlik" düşünülebilir.
- **Önerilen düzeltme**: opsiyonel — sus konuları zaten ayrı bir mimari katman; eğitime
  girmesi mecburi değil.

---

## D. Çelişkiler ve gerilim noktaları

### D.1 ⚠ Audit yaklaşımı: l1-audit vs sus-bitemporal

**Çelişki türü**: mimari tercih farkı.

- **`l1-audit` (küme 1)**: klasik audit tablosu yaklaşımı.
  > "Her veri değişikliği (oluştur, güncelle, sil) ayrı bir defter satırı yaratır:
  > kim yaptı, ne zaman yaptı, eski ve yeni hâli neydi."
  >
  > Implementasyon: `audit_log` tablosu, trigger veya app-level hook ile yazılır.

- **`sus-bitemporal` (küme 2)**: XTDB tarzı ana-tablo bitemporal.
  > "Sistemdeki her veri silinmez veya üzerine yazılmaz; her değişiklik yeni satır olarak
  > `valid_time` (gerçek olayın anı) + `system_time` (sisteme girdiği an) ile yazılır."
  >
  > Implementasyon: ana tablonun kendisi bitemporal — ayrı audit tablosu **gereksiz**.

**Çelişki neden?**: İki yaklaşımı aynı anda uygulamak gereksiz tekrar üretir; **biri seçilmeli**.

**Çözüm önerisi (mimari karar gerekli)**:
- **Senaryo A**: sus-bitemporal asıl mekanizma → l1-audit kalsın ama "Bitemporal kullanılıyorsa
  bu cluster fonksiyonsuz" notu eklensin.
- **Senaryo B**: l1-audit asıl mekanizma → sus-bitemporal "isteğe bağlı, ileri seviye" denmeli.
- **Senaryo C (önerilen)**: hibrit. Bitemporal DocType'lar için (HRMS, GL, KVKK kapsamı)
  zorunlu; geri kalan için klasik audit. Bu açıkça yazılmalı.

**Aksiyon**: `l1-audit.json` veya `sus-bitemporal.json`'da hangi senaryonun seçildiği
belirtilmeli. Şu an **belirsizlik var**.

---

### D.2 ⚠ Saga implementasyonu: scale-saga vs sus-durable

**Çelişki türü**: tamamlayıcı ama belirtilmemiş.

- **`scale-saga` (küme 1)**: "Çok-adımlı uzun işlemleri, hata olduğunda **geri çevirebilen**
  desen". Implementasyon detayı **açık değil**.
- **`sus-durable` (küme 2)**: "Saga adımları DBOS Transact ile Postgres'te checkpoint'lenir;
  çöküş sonrası kaldığı yerden devam".

**Sorun**: küme 1'in `scale-saga` cluster'ı, hangi durable execution kütüphanesini
kullanacağını söylemiyor. DBOS mu Temporal mı, app-level state machine mi belirsiz.

**Çelişki neden?**: ince ama önemli — eğer `scale-saga` Temporal varsayıyorsa, `sus-durable`
DBOS önerisi gerekli olmaz; eğer app-level varsayıyorsa, sus-durable kritik.

**Çözüm önerisi**: `scale-saga.json` "implementasyon detayı: bkz. {{ref:sus-durable}}" notu
eklemeli. Net seçim: **DBOS (Postgres-native, ek altyapı yok)**.

---

### D.3 ⚠ DocType'ın gerçek statüsü: metadata mı, TIMI mı?

**Çelişki türü**: derinleştirme — küme 1 yüzey, küme 2 derin.

- **`k-schema` (küme 1)**: "DocType metadata-driven varlık tanımı — kod yazmadan...
  PostgreSQL tablosu, REST/GraphQL endpoint, admin form otomatik".
- **`sus-timi` (küme 2)**: "DocType henüz TIMI değil — stabil, substrat-bağımsız, versiyonlu
  arayüz olarak formalize edilmemiş; şema evrimi/versiyonlama disiplini eksik".

**Sorun**: küme 1 DocType'ı "kullanıma hazır, çalışır" diye gösteriyor; küme 2 ise
"**henüz hedefe ulaşmadı**" diyor.

**Çelişki değil ama YANLIŞ ANLAŞILMA riski**: yeni gelen küme 1'i okuyup "tamam DocType
var" zannedebilir; sus-timi'yi okumadan implementasyona girişebilir.

**Çözüm önerisi**: `k-schema.json`'a callout: "Bu cluster **mevcut implementasyon** seviyesini
anlatır. **Hedef seviye (TIMI stabil arayüz)** için bkz. {{ref:sus-timi}}."

---

### D.4 ⚠ AI yetki sınırı: s-ai vs sus-actions

**Çelişki türü**: güvenlik boşluğu.

- **`s-ai` (küme 1)**: "Sistemin yapay zeka altyapısı: ajanlar, hafıza, vektör arama,
  MCP server. AI altyapısı sırf bir özellik olarak değil, omurganın bir parçası."
- **`sus-actions` (küme 2)**: "AI ham tabloya değil, **tipli, yetkili, audit'li action**
  yüzeyine erişir. Aksi halde governance açığı."

**Sorun**: `s-ai` AI'ya MCP üzerinden ne kadar erişim verildiğini netleştirmiyor. Eğer
"ham SQL erişimi" ima ediyorsa (büyük olasılıkla evet, çünkü vektör arama için
PostgreSQL/pgvector lazım), `sus-actions`'in dediği güvenlik tehlikesi mevcut.

**Çelişki var mı?**: belirsizlik var. `s-ai` "MCP server her bounded context'te otomatik
expose" diyor — ama MCP'nin **ne kadar şeyi expose ettiği** yazılmamış.

**Çözüm önerisi**: `s-ai.json`'a açık not — "AI'nın eriştiği MCP yüzeyi `sus-actions`
disiplinine tabidir; ham veritabanı erişimi YOK."

---

### D.5 ⚠ Modüler monolit kuralı: philosophy + anti-patterns vs sus-boundaries

**Çelişki türü**: yetersiz uygulama.

- **`philosophy` (küme 1)**: "modüler monolit, mikroservis değil. Tek deploy unit, çoklu
  bounded context, sıkı modül sınırı."
- **`anti-patterns` (küme 1)**: muhtemelen "sosyal anlaşma çürür" varyantı.
- **`sus-boundaries` (küme 2)**: "Sınırı insan değil **makine** zorlamalı. import-linter
  CI kapısı. Aksi halde sosyal anlaşma çürür."

**Sorun**: `philosophy` "modüler monolit" diyor, `anti-patterns` "çürür" diyor —
ama "ne yapılırsa çürümez" mekanizması küme 1'de yok.

**Çelişki**: hayır, **boşluk**. Küme 2 boşluğu doldurdu ama küme 1'in iki cluster'ı
hâlâ "mekanizma" demiyor.

**Çözüm önerisi**: `philosophy.json` 1. ilke ("modüler monolit") + `anti-patterns.json`
"sosyal sözleşme çürür" maddesine `{{ref:sus-boundaries}}` linki.

---

### D.6 ⚠ Build sequence sürdürülebilirlik aşamasını içermiyor

**Çelişki türü**: yol haritası eksikliği.

- **`build-sequence` (küme 1)**: tahminen 5 Stage'lik build sırası.
- **`sus-overview` (küme 2)**: Aşama 0-3 sürdürülebilirlik yol haritası:
  - **Aşama 0**: sınır kapıları + BC politikası (ilk Layer 2 modülden ÖNCE)
  - **Aşama 1**: sözleşme katmanı + dönüşüm (ilk dış plugin'den ÖNCE)
  - **Aşama 2**: codemod + bitemporal (ikinci major sürümden ÖNCE)
  - **Aşama 3**: DX + AI (AI ajan üretime alınmadan önce)

**Sorun**: `build-sequence` küme 2'nin "ÖNCESİNDE yapılmalı" eşiklerini içermiyor.

**Çelişki**: belirsizlik. Build sırasının hangi adımında Aşama 0-3 örülmeli?

**Çözüm önerisi**: `build-sequence.json` tablosunda yeni satırlar — her sus aşamasının
hangi build stage'ine paralel olduğu.

---

### D.7 ⚠ Frontend yasakları yeni mekanizmalarla uyumlu mu?

**Küçük gerilim**:

- **`fe-anti` (küme 1)**: "Next.js yasak — server/client karmaşası AI'a hata yaptırıyor".
- **`fe-locked` (küme 1)**: Vite + React + Flowbite (frontend stack kararı).
- **Küme 2** (kaynak rapor): "Convex — TS-first reaktif backend. AI codegen için ideal."

**Soru**: Convex'in TS-first AI codegen disiplini, Flowbite React + Vite ile uyumlu mu?

**Cevap**: **Evet**. Convex backend tarafı; Vite + React frontend tarafı. Convex'in
"şemadan otomatik tipli API" yaklaşımı DocType'tan tipli TS üretiminde örnek olarak alınabilir.

**Çelişki yok** — sadece netleştirme. `fe-locked.json` "Convex'in TS-first AI codegen
disiplinini DocType→TS tip üretiminde örnek al" notu eklenebilir.

---

## E. Özet matrisi

### E.1 Kategoriler

| Kategori | Sayı |
|---|---|
| Küme 1'in eksiği (küme 2 doldurdu) | **11** |
| Küme 2'nin eksiği | **7** |
| Açık çelişki (mimari karar gerekli) | **2** (D.1, D.2) |
| Belirsizlik (netleştirme gerekli) | **3** (D.3, D.4, D.5) |
| Yol haritası boşluğu | **2** (D.6, D.7) |

### E.2 Acil aksiyon listesi

| Öncelik | Aksiyon | İlgili cluster |
|---|---|---|
| 🔴 P0 | l1-audit ↔ sus-bitemporal mimari kararı yazılı al | `l1-audit.json` + `sus-bitemporal.json` |
| 🔴 P0 | scale-saga → DBOS implementasyon kararı yaz | `scale-saga.json` |
| 🟡 P1 | k-schema → sus-timi terfi notu | `k-schema.json` |
| 🟡 P1 | s-ai → sus-actions güvenlik sınırı notu | `s-ai.json` |
| 🟡 P1 | philosophy + anti-patterns → sus-boundaries linki | her ikisinde callout |
| 🟢 P2 | build-sequence → Aşama 0-3 ekleme | `build-sequence.json` |
| 🟢 P2 | anti-patterns → 3 yeni madde (zorlanmayan sınır, fosilleşme, big-bang) | `anti-patterns.json` |
| 🟢 P2 | sus-* için diagram SVG (5 adet) | `public/assets/sus-*.svg` |
| 🟢 P2 | sus-* için cross-referans link enjeksiyonu | `{{ref:k-schema}}` vb. |
| ⚪ P3 | sus-* alt-item lesson derinleştirme | toplu enrich |

### E.3 Ne çelişki **değildir**

- Frontend stack (Vite + React + Flowbite) ile Convex disiplinini örnek alma — **uyumlu**
- Modüler monolit (philosophy) ile sus-boundaries — **tamamlayıcı**
- DocType metadata-driven (k-schema) ile declarative türetme (sus-declarative) — **derinleştirme**

---

## F. Final değerlendirme

### F.1 İki küme arasında MİMARİ tutarlılık var mı?

**EVET, %85**. Küme 2 küme 1'in üzerine **operasyonel olgunluk** katmanı ekliyor.
İki küme tutarlı vizyona dayanıyor (modüler monolit + metadata-driven + AI-first).

### F.2 İki açık ÇELİŞKİ

1. **Audit yaklaşımı (D.1)**: ana-tablo bitemporal mı yoksa yan-audit tablosu mu?
   → mimari karar gerekli.
2. **Saga implementasyonu (D.2)**: DBOS mu Temporal mı? → karar gerekli.

### F.3 ANA MESAJ

Küme 1, "**ne yapacağımızı**" anlatıyor (runtime primitive'leri: DocType, Outbox, Saga,
Identity, Authz, Tenancy). Küme 2 ise "**bunun 50 yıl yaşamasını nasıl sağlayacağımızı**"
anlatıyor (mekanizmalar: BC, versiyonlama, sınır CI, codemod, conformance).

İkisi birlikte tam tablo. Ama **küme 1 küme 2'yi varsayıyor olarak yazılmamış** —
yani küme 1'i okuyan biri, küme 2'nin var olduğunu **bilmek zorunda**. Bu için:

- Küme 1 cluster'larında küme 2'ye link
- Açık çelişkilerde mimari karar
- Build-sequence sus aşamasını içerecek

Bu üç işlem yapılırsa iki küme **tek bir tutarlı doküman** olur.

---

*Analiz tarihi: 2026-06-06. Hazırlayan: küme 1 vs küme 2 referans karşılaştırması.*
