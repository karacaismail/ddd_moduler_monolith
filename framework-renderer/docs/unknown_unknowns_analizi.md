# Unknown-Unknowns Gap Analizi

> **Soru**: Bu özel proje (15 SaaS ürünü taşıyacak DDD modüler monolith
> framework, 60+ yaş için eğitim dokümanı), şu an 77 cluster içeriyor.
> Bir öğrenci buradan başlasa, **bilmesi gereken ama bu eğitim verisinde
> hiç anlatılmayan kavramlar/mekanizmalar** neler? Mimari planda hangi
> önemli yerler boş?
>
> Bu rapor: **bilmediğini bilmediği** alanları ortaya koyar (unk-unks).

---

## 1. Yöntem

İki tarama yapıldı:

**Tarama A — Eğitim verisi yeterlilik**: 60+ kullanıcı 11 ünite + 77 cluster'ı
bitirip "mimar olarak çalışmaya" başladığında, hangi kavram/mekanizma/araç
karşısına çıkar ama eğitim verisinde **hiç geçmemiş**?

**Tarama B — Mimari plan eksiklik**: 15 ürün taşıyacak bir SaaS framework
için olması gereken ama mevcut 77 cluster'ın hiçbirinin işlemediği teknik
katmanlar.

### 1.1 Çıkış stratejisi
- Önce var olan 77 cluster'ı kategoriye topla
- Her kategoride "olması beklenir ama yok" boşlukları işaretle
- Kritiklik seviyesini bel (🔴 P0 / 🟡 P1 / 🟢 P2)

---

## 2. Tarama A — Eğitim verisi unk-unks

### 2.1 🔴 P0 — Mutlaka olmalı, **YOK**

#### 2.1.1 Veri tasarımı: Normalleştirme, foreign key, junction tablo
- **Var olan**: edu-u04 (Veritabanı temelleri)
- **Anlatılan**: PostgreSQL nedir, kolon, indeks, transaction
- **Eksik**: 1NF/2NF/3NF normalleştirme, foreign key constraint kuralları, junction tablo (many-to-many), denormalize ne zaman
- **Neden kritik**: Yanlış normalleştirilmiş tablo 3 ay sonra çorba olur; öğrenci "fatura kalemleri" gibi en yaygın many-to-many kurmayı bilmek zorunda
- **Önerilen cluster**: `edu-u04` zenginleştirme veya `edu-u04b: Veri Tasarımı — normalleştirme + ilişkiler`

#### 2.1.2 Hata yönetimi: try/catch, retry, dead-letter queue
- **Var olan**: hiçbir cluster özel olarak hata yönetimi anlatmıyor
- **Eksik**: ne zaman try/catch, ne zaman retry, ne zaman vazgeç (DLQ), idempotency vs retry, circuit breaker (Hystrix paterni)
- **Neden kritik**: Üretimde 1. yıl en çok %40 yazılım çöküşü hata yönetimi eksikliğinden
- **Önerilen cluster**: `edu-u11: Hata Yönetimi — try/catch'ten DLQ'ya`

#### 2.1.3 Loglama disiplini ve structured logging
- **Var olan**: cc-obs (observability)
- **Anlatılan**: yüksek seviye — Grafana, alarm
- **Eksik**: log seviyeleri (DEBUG/INFO/WARN/ERROR), correlation ID, structured logging (JSON log), log injection güvenlik açığı
- **Neden kritik**: Çökmüş üretimi debug etmek için log disiplini olmadan saatler kaybedilir
- **Önerilen cluster**: `cc-obs` zenginleştirme + `edu-uXX: Log Disiplini`

#### 2.1.4 Migration disiplini — schema evrimi
- **Var olan**: l1-misc'te "Migration Engine" geçer
- **Eksik**: Forward-only mu rollback'li mi, expand/contract pattern (Stripe), zero-downtime migration, data backfill, migration testing
- **Neden kritik**: Çalışan üretimde tablo değiştirmek = en yüksek riskli iş; öğrenci bunu yapamazsa hiçbir özellik canlıya çıkamaz
- **Önerilen cluster**: `edu-u12: Migration Disiplini — şema evrimi`

#### 2.1.5 Caching katmanı
- **Var olan**: scale-counter (hot counter) — bu spesifik bir kullanım
- **Eksik**: cache-aside, write-through, write-behind, cache invalidation (2 büyük problemden 1'i), Redis vs application memory vs CDN
- **Neden kritik**: 10K istek/sn ölçeğe çıkmadan cache olmadan sistem yıkılır
- **Önerilen cluster**: `scale-cache: Caching katmanı — pattern + invalidation`

#### 2.1.6 Rate limit + throttling
- **Var olan**: hiçbir cluster
- **Eksik**: token bucket, leaky bucket, müşteri başına quota, ücretsiz/ücretli tier, DDoS koruması
- **Neden kritik**: Pazarlama spam'i, AI ajan loop'u, kötü niyetli istek yağmuru — hepsi rate limit ister
- **Önerilen cluster**: `scale-ratelimit: Rate Limit + Quota`

#### 2.1.7 Kullanıcı arayüzü temelleri (UX prensipleri)
- **Var olan**: frontend tech-stack (8 cluster) — TEKNİK; UX değil
- **Eksik**: 60+ kullanıcı odağı UX yaklaşımı bütünüyle yok. Form tasarımı, hata mesajı yazımı, accessibility, mobile-first UX, dark mode
- **Neden kritik**: 60+ hedef kitle için tasarlanan dokümanın kendisi, UX prensiplerini öğretmiyor
- **Önerilen cluster**: `edu-uXX: UX Prensipleri — kullanıcının kafası karışmasın`

#### 2.1.8 Veri tipinde gizli karmaşıklık — para, tarih, zaman dilimi
- **Var olan**: edu-u02 (veri ve tipler) — yüzeysel; atomic-types — referans
- **Eksik**: Para tutarı float yerine Decimal **neden**, kuruş yuvarlama, çoklu kur, tarih+saat+timezone (UTC vs local), DST (gün ışığından yararlanma), TR'de Ramazan/Bayram tatil takvimi
- **Neden kritik**: Yanlış para tipi muhasebede yıllık ciroyu kuruş kuruş kaybeder; yanlış timezone sipariş "dün yapıldı" diye görünür
- **Önerilen cluster**: `edu-u02b: Para + Tarih + Timezone — gizli karmaşıklık`

### 2.2 🟡 P1 — Önemli, ama kademeli eklenebilir

#### 2.2.1 Test piramidi
- **Var olan**: cc-obs bahsediyor; sus-conformance plugin sözleşme testi
- **Eksik**: Unit test → integration → e2e piramidi, test pyramid kavramı, mocking vs stubbing, snapshot test, %coverage hedefi (öğrenci için 60+ uygun olarak)
- **Önerilen cluster**: `edu-uXX: Test Piramidi`

#### 2.2.2 Git workflow + commit disiplini
- **Var olan**: deploy-yap (deploy otomasyonu), edu-u10 (deploy)
- **Eksik**: Branch strategy (main/feature/release), conventional commits, semantic versioning, pre-commit hooks, code review etiketleri
- **Önerilen cluster**: `edu-uXX: Git Disiplini`

#### 2.2.3 Performans ölçümü
- **Var olan**: cc-obs (gözlemleme)
- **Eksik**: Profiling, flame graph, N+1 query, slow query log, EXPLAIN ANALYZE, p50/p95/p99 ne anlama gelir
- **Önerilen cluster**: `scale-perf: Performans Ölçümü + Profiling`

#### 2.2.4 Güvenlik temelleri (OWASP top 10)
- **Var olan**: cc-security, k-authz, k-identity, edu-u07 (yetkilendirme)
- **Anlatılan**: yetki sistemi (kim ne yapabilir)
- **Eksik**: OWASP top 10 (SQL injection, XSS, CSRF, SSRF, IDOR), input validation disiplini, parola hashing (bcrypt vs argon2), secret management, principle of least privilege somut örnekleri
- **Önerilen cluster**: `edu-uXX: Güvenlik Tuzakları — OWASP perspektifi`

#### 2.2.5 Backup + disaster recovery
- **Var olan**: cc-obs (DR — disaster recovery bahsi)
- **Eksik**: RPO/RTO ne demek, point-in-time recovery, backup test (asla test edilmemiş backup = backup değil), geo-replication
- **Önerilen cluster**: `cc-obs` zenginleştirme + `edu-uXX: Backup Disiplini`

#### 2.2.6 Para birimi + uluslararasılaştırma
- **Var olan**: l1-misc (i18n, Money) — yüzeysel
- **Eksik**: çoklu kur dönüştürme, kur tarihi (geçmiş işlemde geçmiş kur), TR Vergi Sistemi (KDV %1/%8/%18, gelir/kurumlar vergi), uluslararası ödeme (Stripe/Paddle vs yerel sağlayıcı)
- **Önerilen cluster**: `cc-tr` zenginleştirme + `stack: Money + Tax — derinleştirme`

#### 2.2.7 Email + SMS gönderim güvenirliği
- **Var olan**: l1-notification (bildirim)
- **Eksik**: SMTP vs SES vs SendGrid, bounce + complaint handling, SPF/DKIM/DMARC, SMS provider seçimi (Twilio vs yerel), bildirim sequence (mail → SMS → push fallback)
- **Önerilen cluster**: `l1-notification` zenginleştirme

#### 2.2.8 Dosya işleme: yükleme, küçültme, virüs taraması
- **Var olan**: l1-file (dosya)
- **Eksik**: presigned URL (S3 direkt yükleme), image resize/optimize, antivirus tarama (ClamAV), MIME type validation, dosya boyutu limit, video encoding (FFmpeg)
- **Önerilen cluster**: `l1-file` zenginleştirme

### 2.3 🟢 P2 — Bonus / ileri

#### 2.3.1 Time-series veri (IoT, metrikler)
- **Eksik**: TimescaleDB, downsampling, retention policy
- **Önerilen cluster**: yok — ileri seviye

#### 2.3.2 Streaming veri işleme
- **Eksik**: Kafka Streams, real-time aggregation, windowing
- **Önerilen cluster**: yok — modüler monolit'in yeri değil

#### 2.3.3 Coğrafi veri (PostGIS)
- **Var olan**: atomic-types'da "Geo Coordinate" geçer
- **Eksik**: PostGIS sorguları, mesafe hesabı, geofencing
- **Önerilen cluster**: `atomic-types` zenginleştirme veya yeni cluster

---

## 3. Tarama B — Mimari plan unk-unks

### 3.1 🔴 P0 — Modern SaaS için olmazsa olmaz, mevcut planda BOŞ

#### 3.1.1 Multi-region / Active-Active deployment
- **Var olan**: cc-obs DR var
- **Eksik**: Read replica vs primary, region failover, conflict resolution (CRDT), GDPR veri-yerelleştirme (TR vatandaşının verisi TR'de)
- **Neden kritik**: 15 SaaS ürünü uluslararası genişlerse veya TR + AB iki bölge istenirse mimari hazır olmalı
- **Önerilen cluster**: `scale-multiregion: Multi-region + DR`

#### 3.1.2 Feature flag / kademeli rollout
- **Var olan**: hiçbir cluster
- **Eksik**: LaunchDarkly tarzı feature flag, % kullanıcıya açma, A/B test, kill switch
- **Neden kritik**: Risk azaltma — yeni özellik %5'e aç, izle, sonra %100; çökerse anında kapat
- **Önerilen cluster**: `cc-rollout: Feature Flag + Kademeli Rollout`

#### 3.1.3 Webhook'ları dış sistemler için sunmak
- **Var olan**: l1-misc'te "Webhook" geçer; scale-outbox iç event yayın
- **Eksik**: Dış sisteme webhook **göndermek** (HMAC imzalama, retry, exponential backoff, signature verification dökümantasyonu, replay protection)
- **Neden kritik**: Marketplace ekosistemi webhook olmadan kurulamaz
- **Önerilen cluster**: `scale-webhook: Outbound Webhook` veya `l1-misc` zenginleştirme

#### 3.1.4 Billing + Subscription management
- **Var olan**: s-commerce (e-ticaret) — TEK seferlik ödeme odaklı
- **Eksik**: Subscription (abonelik), trial, prorated billing, dunning (ödeme alınamazsa), tax çıkartma, fatura PDF üretimi
- **Neden kritik**: 15 SaaS ürünü SaaS olarak satılacak → subscription mimarisi zorunlu
- **Önerilen cluster**: `s-billing: Billing + Subscription` veya `s-commerce` zenginleştirme

#### 3.1.5 API Gateway + Public API documentation
- **Var olan**: k-schema (DocType → REST/GraphQL otomatik)
- **Eksik**: API gateway (Kong/Tyk), rate limit gateway katmanında, API key management, public API portal (Swagger UI), versioning gateway tarafında
- **Önerilen cluster**: `dx-api-gateway: API Gateway + Developer Portal`

#### 3.1.6 Real-time / WebSocket / Server-Sent Events
- **Var olan**: l1-misc (Realtime) — yüzeysel; fe-ai-rt (frontend tarafı)
- **Eksik**: Backend WebSocket disiplini, pub/sub kanal yönetimi, connection scaling (1M concurrent), presence (kim online), SSE vs WebSocket seçimi
- **Önerilen cluster**: `scale-realtime: Real-time Backend`

#### 3.1.7 Search dışında: full-text + autocomplete + faceted
- **Var olan**: l1-search (BM25 + vector)
- **Eksik**: Autocomplete (typeahead), faceted search (filtre kategoriler), search analytics (kullanıcı neyi aradı), spell check, "did you mean", spatial search
- **Önerilen cluster**: `l1-search` zenginleştirme

#### 3.1.8 KVKK + GDPR — somut implementasyon
- **Var olan**: cc-tr (TR uyumu) — yüzeysel
- **Eksik**: Right to be forgotten (silme talebi), data portability (veri verme talebi), consent management (rıza paneli), data retention policy, breach notification (72 saat içinde)
- **Önerilen cluster**: `cc-tr` zenginleştirme veya `cc-privacy: Veri Mahremiyeti — KVKK + GDPR implementasyon`

### 3.2 🟡 P1 — Önemli ama ikinci dalga

#### 3.2.1 SSO + SAML + OAuth federation
- **Var olan**: k-identity (kimlik)
- **Eksik**: SAML 2.0, OAuth 2.0 / OpenID Connect, SSO with Google/Microsoft/Apple, multi-factor authentication (TOTP, WebAuthn/Passkey), enterprise SSO (Okta entegrasyonu)
- **Önerilen cluster**: `k-identity` zenginleştirme veya `k-sso: SSO + Federation`

#### 3.2.2 Background job scheduler — cron + delay
- **Var olan**: scale-workers (workers + scheduler)
- **Eksik**: Cron expression syntax, delayed job (\"şu kadar sonra çalış\"), recurring job, retry strategy (exponential backoff), job priority
- **Önerilen cluster**: `scale-workers` zenginleştirme

#### 3.2.3 Veri dışa aktarma — CSV, Excel, PDF
- **Var olan**: hiçbir cluster
- **Eksik**: Sipariş listesi CSV indirme, fatura PDF üretimi, Excel report (xlsx), büyük export (100K satır → background job + email link)
- **Önerilen cluster**: `l1-export: Veri Dışa Aktarma`

#### 3.2.4 Import — CSV upload + validation + dry-run
- **Var olan**: hiçbir cluster
- **Eksik**: CSV upload, schema validation, dry-run preview, partial commit (geçenleri al, hatalıları rapor et)
- **Önerilen cluster**: `l1-import: Veri İçe Aktarma`

#### 3.2.5 Webhook receiving — dış sistemden gelen webhook'ları doğrula
- **Var olan**: l1-misc'te webhook (gönderme) bahsi
- **Eksik**: Stripe/PayPal/Sentry vs.den gelen webhook'u **almak**, HMAC verification, idempotency için event ID kullanma, replay protection
- **Önerilen cluster**: `l1-misc` zenginleştirme

#### 3.2.6 Health check + readiness/liveness probe
- **Var olan**: cc-obs (gözlemleme)
- **Eksik**: /health, /ready, /live endpoint'leri ne farkı var, Kubernetes probe konfigürasyonu (gelecek için bile)
- **Önerilen cluster**: `cc-obs` zenginleştirme

#### 3.2.7 Static asset + CDN strategy
- **Var olan**: fe-deploy (frontend deploy)
- **Eksik**: CDN seçimi (CloudFront/Fastly/Bunny), cache invalidation, signed URL, image optimization at edge
- **Önerilen cluster**: `fe-deploy` zenginleştirme

#### 3.2.8 Database sharding (büyük ölçek)
- **Var olan**: k-tenancy (multi-tenant) — tek shard üzerinde tenant ayırma
- **Eksik**: Yatay shard'lama (tenant başına ayrı DB veya schema), shard key seçimi, cross-shard query problemi
- **Önerilen cluster**: ileri seviye — `k-tenancy` zenginleştirme

### 3.3 🟢 P2 — Bonus / niş

#### 3.3.1 Notification scheduling — quiet hours
- **Eksik**: Kullanıcının saat dilimi + uyku saati = bildirim göndermeme

#### 3.3.2 Internationalization derin
- **Var olan**: l1-misc (i18n)
- **Eksik**: pluralization (1 elma, 2 elma vs İngilizce 1 apple, 2 apples), RTL (sağdan sola: Arapça, İbranice), date formatlama yerelleştirme

#### 3.3.3 Accessibility — backend tarafı
- **Eksik**: Ekran okuyucu için API yanıt yapısı (alt metin neyi gerektirir), high contrast theme

---

## 4. Bilmediğini-bilmediği özet: 21 boşluk

### 4.1 Eğitim verisi (8 P0 + 8 P1 + 3 P2 = 19)
- 🔴 Veri tasarımı, hata yönetimi, log, migration, cache, rate limit, UX, para+tarih
- 🟡 Test piramidi, git workflow, perf ölçümü, güvenlik tuzakları, backup, money+tax, email, file
- 🟢 Time-series, streaming, GIS

### 4.2 Mimari plan (8 P0 + 8 P1 + 3 P2 = 19)
- 🔴 Multi-region, feature flag, outbound webhook, billing, API gateway, real-time, search derin, KVKK derin
- 🟡 SSO/SAML, cron derin, export, import, inbound webhook, health check, CDN, sharding
- 🟢 Quiet hours, derin i18n, a11y

### 4.3 Çift sayım yok — toplam **38 boşluk**

---

## 5. Önerilen yeni cluster listesi (önceliklendirilmiş)

### 🔴 P0 — Şimdi eklenmeli (16 cluster)

**Eğitim grubu**:
| ID | Başlık | Grup |
|---|---|---|
| `edu-u04b` | Veri Tasarımı — normalleştirme + ilişkiler | edu |
| `edu-u11` | Hata Yönetimi — try/catch'ten DLQ'ya | edu |
| `edu-u12` | Migration Disiplini — şema evrimi | edu |
| `edu-u13` | Log Disiplini | edu |
| `edu-u14` | Cache + Rate Limit | edu |
| `edu-u15` | UX Prensipleri — 60+ form tasarımı | edu |
| `edu-u02b` | Para + Tarih + Timezone — gizli karmaşıklık | edu |

**Mimari grubu**:
| ID | Başlık | Grup |
|---|---|---|
| `scale-cache` | Caching katmanı — pattern + invalidation | scale |
| `scale-ratelimit` | Rate Limit + Quota | scale |
| `scale-multiregion` | Multi-region + DR | scale |
| `scale-realtime` | Real-time Backend — WebSocket + SSE | scale |
| `cc-rollout` | Feature Flag + Kademeli Rollout | crosscut |
| `cc-privacy` | KVKK + GDPR implementasyon detay | crosscut |
| `s-billing` | Billing + Subscription (SaaS satış) | stack |
| `dx-api-gateway` | API Gateway + Developer Portal | dx |
| `scale-webhook` | Outbound Webhook | scale |

### 🟡 P1 — İkinci dalga (16 cluster)

**Eğitim grubu**:
- `edu-uXX-test`: Test Piramidi
- `edu-uXX-git`: Git Disiplini
- `edu-uXX-perf`: Performans Ölçümü
- `edu-uXX-owasp`: Güvenlik Tuzakları (OWASP)
- `edu-uXX-backup`: Backup Disiplini
- `edu-uXX-money`: Money + Tax derinleştirme
- `edu-uXX-email`: Email + SMS Güvenirliği
- `edu-uXX-file`: Dosya İşleme

**Mimari grubu**:
- `k-sso`: SSO + Federation
- `scale-workers-deep`: Cron + Recurring + Backoff (mevcut workers'ı genişlet)
- `l1-export`: Veri Dışa Aktarma
- `l1-import`: Veri İçe Aktarma
- `l1-webhook-in`: Inbound Webhook (gelen)
- `cc-obs-deep`: Health Check + Probes
- `fe-cdn`: CDN Strategy
- `k-tenancy-deep`: Sharding (büyük ölçek)

### 🟢 P2 — Bonus (6 cluster)

- Time-series (TimescaleDB)
- Streaming (Kafka)
- GIS (PostGIS)
- Quiet hours
- Derin i18n (RTL, pluralization)
- Backend a11y

---

## 6. Etki yarıçapı: yeni cluster ekleme

### 6.1 Aynı v15-v17 patterni — sadece veri
- `content/manifest.json` — 16 yeni P0 entry
- `content/clusters/*.json` — 16 yeni dosya
- **Engine/HTML/SCSS/Test: dokunulmaz** ✓
- Mevcut 77 cluster'a dokunulmaz

### 6.2 Cluster sayısı projeksiyon
- v15: 77
- v17 sonrası P0: **93**
- + P1: **109**
- + P2: **115**

### 6.3 Çözüm üretim sırası
1. v18-A: P0 eğitim ünitelerini ekle (7 cluster)
2. v18-B: P0 mimari cluster'larını ekle (9 cluster)
3. v19: P1 dalga
4. v20: P2 bonus

---

## 7. Ne **YOK** demiyoruz

Bazı kavramlar küme 1 + küme 2'de yeterince işlendi:

- ✓ Modüler monolit felsefesi → philosophy + sus-boundaries
- ✓ DocType / metadata-driven → k-schema + sus-timi + sus-declarative
- ✓ Outbox + CQRS + Saga → scale-* + sus-durable
- ✓ Identity + Authz + Tenancy → k-* + sus-actions
- ✓ Event bus + plugin → k-bus + k-plugin
- ✓ AI altyapı → s-ai + sus-actions
- ✓ Audit + immutability → l1-audit + sus-bitemporal
- ✓ CI sınır + sözleşme → sus-boundaries + sus-bc-policy
- ✓ Versiyon disiplini → sus-versioning + sus-codemod

**Bu 9 alan zaten güçlü.** Eksiklik diğer 38 alanda.

---

## 8. Ana mesaj

Mevcut 77 cluster, **mimarinin omurgasını** ve **uzun-ömür mekanizmalarını**
çok iyi anlatıyor. Ama:

- 🔴 **Eğitim tarafında** 60+ öğrencinin "mimar olarak çalışmaya" başladığında
  ilk haftada karşılaşacağı 8 temel kavram boş: veri tasarımı, hata yönetimi,
  log, migration, cache, rate limit, UX, para+tarih.
- 🔴 **Mimari tarafında** 15 SaaS ürünü taşıyacak framework için 8 modern SaaS
  zorunluluğu eksik: multi-region, feature flag, billing, API gateway,
  real-time, outbound webhook, KVKK detay, search derin.

Bu 16 P0 cluster eklenirse eğitim materyali ve mimari plan **operasyonel
olgunluğa** ulaşır. v17'deki menü reorganizasyonu için zaten ideal grup
yapısı kuruldu — yeni cluster'lar doğrudan ilgili gruplara oturur.

**Önerilen sonraki adım**: v18-A (7 yeni edu) + v18-B (9 yeni mimari) batch'i.

---

*Rapor tarihi: 2026-06-06.*
*Yöntem: 77 cluster yeterlilik taraması + 15-SaaS framework gereksinim taraması.*
*Hedef: 60+ yaş öğrencinin "mimar olarak çalışmaya başladığı gün" karşılaşacağı boşluklar.*
