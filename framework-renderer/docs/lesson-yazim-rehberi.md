# Lesson içeriği yazım rehberi — 60+ yaş hedef kitlesi için

Bu rehber, cluster JSON'larındaki `enrich.lesson` alanını **dürüstçe** doldurmak içindir.
Eski "autoFiveWH" yaklaşımı (template'e başlık enjekte etme) artık devre dışı — boş
bırakılan kartlar UI'da açıkça "henüz yazılmadı" şeklinde işaretlenir.

## Hedef kitle

- **Yaş**: 60+
- **Teknik geçmiş**: Yok / minimum
- **Beklenti**: Anlasınlar, korkmasınlar, kullanabilsinler

## Stories (Gerçek dünya örnekleri) — **YENİ KURAL**

`enrich.stories` alanı **gerçek dünya yaşamından metaforlu kullanım örnekleri**
olmalı. Soyut "yazılım mimarı kavrar" değil; **gerçek bir kişi, gerçek bir
ihtiyaç, somut bir sonuç**.

### Yanlış (klişe / soyut):
```json
{
  "persona": "Yazılım mimarı",
  "context": "Bu konunun bizim 15-ürün hedefinde yerini düşünüyor.",
  "outcome": "Cluster'ı okuyup terim sözlüğü + örnekleri inceledikten sonra teknik tercih + sınırları kavrar."
}
```

### Doğru (gerçek dünyadan metafor):
```json
{
  "persona": "Mahalle bakkalı Ahmet Amca",
  "context": "60 yaşında, defterle hesap tutar. Oğlu 'baba dijital sistem alalım' der.",
  "outcome": "Bu sistemde önce muhasebe modülünü açar; stok, müşteri kartı, fatura yan yana. Defterin dijital ikizi gibi, ama el ile toplama yok."
}
```

### Stories yazım kuralları
1. **Persona**: somut kişi tanımı + meslek + yaş varsa belirt (Ahmet Amca, Zeynep Hanım, Veteriner Aslı...)
2. **Context**: günlük yaşamda karşılaştığı somut bir ihtiyaç/sorun
3. **Outcome**: bu yazılım özelliğinin bu kişinin sorununu nasıl çözdüğü
4. **Yasak kelimeler**: düşünüyor, kavrar, tercih kullanır, ortaya çıkar, yerini bulur
5. **Metafor tonu**: 60+ okuyucu kendi hayatından bir örnek tanımalı

### Modal info'lar (popover) için de aynı
`!` ve `?` butonlarına tıklayınca açılan modallardaki tüm içerik bu
metaforlu tonu kullanmalı.

## Yasak kelimeler (jargon)

Aşağıdaki kelimeler **lesson içinde yer almaz** veya açıklamasız geçmez. Eğer geçecekse, ilk geçişinde parantezde günlük dil karşılığı verilir.

`primitive`, `consume`, `pattern`, `pipeline`, `endpoint`, `payload`, `latency`, `idempotent`, `marshalling`, `serialization`, `concurrency`, `mutex`, `throttle`, `eventual consistency`, `state machine`, `dispatch`, `event bus`, `hook`, `manifest`, `runtime`, `deploy`, `framework`, `monolith`, `microservices`, `CI/CD`, `observability`, `on-call`

İyi örnek:
> "Plugin geliştirici bu primitive'i tanımlar" ❌

> "Eklenti geliştiricisi (yazılım eklentisi yazan kişi), sistemin temel bir parçasını kendi ihtiyacı için biraz değiştirir." ✓

## Şema

```json
{
  "enrich": {
    "lesson": {
      "ne": "X nedir? (1-3 cümle, jargonsuz)",
      "nicin": "Niçin var? Olmazsa ne kaybederiz?",
      "nasil": "Nasıl çalışır? Somut, adım adım.",
      "nerede": "Günlük hayatta veya UI'da nerede karşımıza çıkar?",
      "ne_zaman": "Hangi anda devreye girer?",
      "kim": "Kim etkilenir? (rolleri günlük dilde söyle: 'eklenti yazan kişi' gibi)",
      "frontend": {
        "yer": "Kullanıcının ekranda gördüğü şey nedir?",
        "gereklilik": "Niye görünmesi gerekir?",
        "ornek": "Tanıdık bir uygulamadan somut örnek."
      },
      "backend": {
        "yer": "Perde arkasında ne olur?",
        "gereklilik": "Niye orada da çalışması gerekir?",
        "ornek": "Adım sırasıyla bir senaryo."
      },
      "analoji": "Gündelik hayattan benzer durum (restoran, postane, ev aletleri…)"
    }
  }
}
```

## Yazım kuralları

1. **Tek bir cümle 25 kelimeyi geçmesin.** Uzun cümle 60+ okuyucu için yorucu.
2. **Önce somut, sonra teknik.** "WhatsApp'taki gönder tuşu…" deyip sonra "buna 'event' deriz" diyebilirsin.
3. **Pasif çatı yerine etken.** "Sistem tarafından işlenir" değil, "sistem bunu yapar".
4. **Analoji zorunlu.** Lesson dolduran her kart için bir günlük hayat analojisi yaz.
5. **"Sen" dili kullan, "kullanıcı" değil.** Daha yakın hissettirir.
6. **Korkutma.** "Çökerse felaket olur" yerine "olmazsa şu rahatsızlık çıkar".

## Örnek — iyi vs kötü

**Kötü** (mevcut auto-content):
> "Plugin Mimarisi — primitive — Framework, Plugin Mimarisi'nı primitive olarak sunar: plugin/kullanıcı sıfırdan yazmaz, hazır API'yi çağırır veya kuralı consume eder. Değişiklik tek noktadan yapılır, tüm tüketiciler otomatik fayda görür."

**İyi** (lesson.nasil):
> "Eklenti yazan kişi, bir 'tanıtım kartı' (manifest) yazar. Bu kartta 'Ben kimim, ne yapıyorum, neye bağlıyım' yazar. Ana sistem bu kartı okur, eklentiyi listesine ekler ve ihtiyaç olduğunda çağırır."

## Mevcut örnekler

`content/clusters/70-edu-overview.json` içinde **3 ünite** için (Ünite 01 Yazılım nedir, 09 Plugin Mimarisi, 10 Deploy & Operations) tam lesson yazıldı. Diğer 7 ünite için aynı pattern kullanılmalı.

## Diğer cluster'lar için yapılacaklar listesi

| Cluster | Durum | Öncelik |
|---|---|---|
| 70-edu-overview ünite 01 (Yazılım nedir?) | ✅ Yazıldı | — |
| 70-edu-overview ünite 02 (Veri ve Tipler) | ✅ Yazıldı | — |
| 70-edu-overview ünite 09 (Plugin Mimarisi) | ✅ Yazıldı | — |
| 70-edu-overview ünite 10 (Deploy & Operations) | ✅ Yazıldı | — |
| 70-edu-overview üniteler 03-08 | Bekliyor | P0 |
| 71-edu-u01-yazilim.json içi item'lar | Bekliyor | P0 |
| 72-edu-u02-veri.json içi item'lar | Bekliyor | P1 |
| LandX 33 modül | Bekliyor | P1 |
| Kernel + Scale primitives (00-15) | Bekliyor | P2 |
| Frontend tech-stack 8 cluster | Bekliyor | P2 |

## Engine davranışı

- `enrich.lesson` varsa → 5N1K + Frontend/Backend + Analoji **gerçek içerikten** render.
- `enrich.lesson` yoksa → "Bu içerik henüz yazılmadı" placeholder (sarı uyarı kutusu).
- Hiçbir koşulda artık template enjeksiyonu **yapılmaz**.

## Test pattern

Yeni bir item'a lesson eklediğinde:

1. `npm run validate:content` → şema OK mu?
2. Tarayıcıda item'a tıkla → sağ panelde "Bu içerik henüz yazılmadı" YERINE gerçek içerik görmeli.
3. Başka bir item'a tıkla → farklı içerik görmeli.
4. Aynı item'a tekrar tıkla → kapanmalı (toggle).
