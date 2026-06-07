# v18-v20 — 38 Boşluk Kapama Raporu

## Sonuç

**77 cluster → 115 cluster.** Eğitim verisi + mimari plan unknown-unknowns
analizinde tespit edilen 38 boşluğun tamamı kapatıldı.

| Metrik | v17 | v20 | Değişim |
|---|---|---|---|
| Toplam cluster | 77 | 115 | +38 |
| Eğitim Yolu | 11 | 26 | +15 |
| Scale Primitives | 6 | 15 | +9 |
| Layer 1 — In-tree | 7 | 11 | +4 |
| Stack ürünler | 12 | 13 | +1 |
| Çapraz-kesen | 3 | 8 | +5 |
| Kernel — Layer 0 | 6 | 8 | +2 |
| Plugin DX | 3 | 4 | +1 |
| Frontend | 8 | 9 | +1 |
| Validate hata | 0 | 0 | - |
| Audit bulgu | 0 | 0 | - |
| TypeScript hata | 0 | 0 | - |

## Batch dökümü

### v18-A — P0 Eğitim (7 cluster)

| ID | Başlık | Boşluk |
|---|---|---|
| `edu-u02b` | Para + Tarih + Timezone | Para float yerine Decimal; UTC sakla |
| `edu-u04b` | Veri Tasarımı — normalleştirme | 1NF/2NF/3NF, FK, junction |
| `edu-u11` | Hata Yönetimi — try/catch → DLQ | Retry, idempotency, circuit breaker |
| `edu-u12` | Migration Disiplini | Expand/contract, backfill, zero-downtime |
| `edu-u13` | Log Disiplini | Structured JSON, correlation ID |
| `edu-u14` | Cache + Rate Limit | Cache-aside, token bucket |
| `edu-u15` | UX Prensipleri 60+ | Tap target, hata mesajı, progressive form |

### v18-B — P0 Mimari (9 cluster)

| ID | Başlık | Boşluk |
|---|---|---|
| `scale-cache` | Caching katmanı | Redis pattern + invalidation |
| `scale-ratelimit` | Rate Limit + Quota | Token bucket, tier-based |
| `scale-multiregion` | Multi-region + DR | RPO/RTO, KVKK veri yerelleştirme |
| `scale-realtime` | Real-time Backend | WebSocket vs SSE, pub/sub |
| `scale-webhook` | Outbound Webhook | HMAC + retry + DLQ |
| `cc-rollout` | Feature Flag + Rollout | Kademeli açma + kill switch |
| `cc-privacy` | KVKK + GDPR | 6 zorunlu özellik |
| `s-billing` | Billing + Subscription | Stripe/Iyzico, dunning, prorating |
| `dx-api-gateway` | API Gateway + Portal | OpenAPI + Swagger + key |

### v19-A — P1 Eğitim (8 cluster)

| ID | Başlık | Boşluk |
|---|---|---|
| `edu-u16` | Test Piramidi | Unit/integration/e2e + mock |
| `edu-u17` | Git Disiplini | Branch + Conventional Commits + semver |
| `edu-u18` | Performans Ölçümü | p95/p99, EXPLAIN, N+1 |
| `edu-u19` | Güvenlik OWASP | Top 10 + somut çözümler |
| `edu-u20` | Backup Disiplini | 3-2-1, PITR, test edilmemiş = yok |
| `edu-u21` | Money + Tax | KDV, FX rate tarih, Stripe/Paddle |
| `edu-u22` | Email + SMS | SPF/DKIM/DMARC, multi-channel |
| `edu-u23` | Dosya İşleme | Presigned URL, ClamAV, sharp |

### v19-B — P1 Mimari (8 cluster)

| ID | Başlık | Boşluk |
|---|---|---|
| `k-sso` | SSO + Federation | SAML, OIDC, MFA, passkey |
| `scale-workers-deep` | Background Jobs derinleştirme | Cron, delay, priority, DLQ |
| `l1-export` | Veri Dışa Aktarma | Streaming CSV, xlsx, PDF |
| `l1-import` | Veri İçe Aktarma | Dry-run + partial commit |
| `l1-webhook-in` | Inbound Webhook | HMAC + idempotency |
| `cc-obs-deep` | Health + Probes | /live, /ready, /health |
| `fe-cdn` | CDN Strategy | Cloudflare/Bunny, hash-versioning |
| `k-tenancy-deep` | Sharding | Pool → bridge → silo |

### v20 — P2 Bonus (6 cluster)

| ID | Başlık | Boşluk |
|---|---|---|
| `scale-timeseries` | TimescaleDB | IoT, metrik, downsampling |
| `scale-streaming` | Kafka | Sadece 100K+ event/sn gerekirse |
| `scale-gis` | PostGIS | Coğrafi sorgu, geofencing |
| `l1-quiet-hours` | Sessiz Saatler | Bildirim timing |
| `cc-i18n-deep` | i18n Derin | Pluralization, RTL, format |
| `cc-a11y-backend` | A11y Backend | Alt text, tema tercihi |

## Tutarlılık

Tüm 38 cluster aynı format:

- **id, title, subtitle, cluster, order, icon** — schema
- **granularity** — kaya/buyuk-tas/orta-tas/.../atom
- **enrich.info + detail** — genel + detay markdown
- **enrich.terms** — 4-6 Türkçe sözlük girişi
- **enrich.stories** — 2-3 gerçek 60+ persona metaforu (Hatice Teyze, Murat Bey, Yusuf Bey...)
- **enrich.lesson** — 5N1K + analoji + frontend/backend ayrımı
- **blocks** — paragraph + callout (warning/critical/tip) + table + heading
- **related** — diğer cluster ID'leri ile çapraz bağlantı

## Hedef kitle

Tüm yeni cluster'lar şu profil için yazıldı:

- **60 yaş**
- **12 hafta × 3 saat = 36 saat yazılım eğitimi**
- **Junior'dan daha az bilgili**
- **Vibecoding ile geliştirecek** (AI ajan ile kod üretme)

Bu sebeple her cluster'da:

- "Vibecoding ipucu" callout — AI ajan'a nasıl prompt yazılacak
- "En klasik tuzak" callout — yeni başlayanın düştüğü hata
- "60+ persona" story — Hatice Teyze / Murat Bey / Yusuf Bey gibi gerçek metaforlar
- Pratik karşılaştırma tablosu — doğru/yanlış kolonları

## Etki yarıçapı

| Katman | Değişiklik |
|---|---|
| `content/manifest.json` | ✓ 38 yeni entry |
| `content/clusters/*.json` | ✓ 38 yeni dosya |
| TypeScript engine | ✗ Dokunulmadı |
| HTML (`index.html`) | ✗ Dokunulmadı |
| SCSS | ✗ Dokunulmadı |
| Zod schema | ✗ Dokunulmadı |
| Test piramidi | ✗ Dokunulmadı |
| CI / audit script'leri | ✗ Dokunulmadı |

**Tüm değişim sadece veri katmanında.** v15-v17 patterni korundu.

## Doğrulama

```
$ npx tsx scripts/validate-content.ts
Toplam cluster: 115
Temiz — şema, ref bütünlüğü ve terim tutarlılığı OK.

$ npx tsx scripts/audit-60plus.ts
Cluster sayısı:   122
Toplam bulgu:     0
  Yüksek (template / 5+ jargon): 0
  Orta   (3-4 jargon):           0
  Düşük  (uzun cümle):           0

$ npx tsc --noEmit
(temiz)
```

## Sonraki adımlar

- v17'deki audit raporunda kalan punch list:
  - Lesson kapsama %22 → %50+ hedefi için P0 cluster'lara lesson kart ekleme (yapısal değil içerik)
  - Cross-reference `{{ref:...}}` link expansion (henüz custom syntax)
  - Manual screen reader test (insan görevi)
  - Real device cross-browser testing
  - Sentry DSN
  - Lighthouse live (deploy sonrası)

- Yeni 38 cluster için image block + lesson zenginleştirme (gelecek iterasyon, opsiyonel)

## Git update — absolute URL

```bash
cd /Users/karaca/DEV/ddd_moduler_monolith/framework-renderer

# Status
git status

# Stage all
git add content/manifest.json content/clusters/*.json docs/

# Commit
git commit -m "feat(content): v18-v20 — 38 yeni cluster, unk-unks gap kapama

P0 Eğitim (7): para+tarih+timezone, veri tasarımı, hata yönetimi,
migration, log, cache+ratelimit, UX 60+
P0 Mimari (9): cache, rate limit, multi-region, real-time, webhook,
feature flag, KVKK/GDPR, billing, API gateway
P1 Eğitim (8): test piramidi, git, perf, OWASP, backup, money+tax,
email+sms, dosya
P1 Mimari (8): SSO, workers-deep, export, import, webhook-in,
health probes, CDN, sharding
P2 Bonus (6): time-series, streaming, GIS, quiet hours, i18n derin, a11y backend

77 cluster → 115. Vibecoding + 60+ yaş + 36 saat eğitimli junior altı kitleye göre.
Validate 0/0/0, audit 0/0/0, tsc temiz."

# Push
git push origin main
```

---

*Rapor tarihi: 2026-06-07.*
*Hedef tamamlandı: 38 boşluk → 0 boşluk.*
