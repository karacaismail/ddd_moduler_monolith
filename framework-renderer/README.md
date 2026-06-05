# Framework Renderer

Block-based JSON content engine. Master döküman içeriği JSON cluster dosyalarına bölündü; TypeScript engine bunları dinamik olarak render eder.

## Mimari

```
content/
  manifest.json              -> tüm cluster dosyalarını listeler
  clusters/
    *.json                   -> bir küme = bir dosya
src/
  types/                     -> Zod schema + TypeScript tip
  engine/
    loader.ts                -> JSON fetch + validate
    registry.ts              -> block type → renderer mapping
    renderer.ts              -> dispatcher
    refs.ts                  -> {{ref:id}} cross-reference
    search.ts                -> in-memory full-text index
    toc.ts                   -> otomatik TOC üretim
    router.ts                -> hash routing
  blocks/                    -> her block tipi için bir renderer
    paragraph.ts
    code.ts
    callout.ts
    list.ts
    table.ts
    grid.ts
    layer-cards.ts
    domain-card.ts
    examples.ts
    tree.ts
    kv-row.ts
  components/                -> reusable UI (sidebar, header, search)
  main.ts                    -> entry
  styles/                    -> SCSS (Roboto, Phosphor, minimalist)
```

## İçerik modeli — block-based

Bir cluster JSON'unun temel yapısı:

```jsonc
{
  "id": "k-schema",
  "title": "Schema / Metadata Engine (DocType)",
  "cluster": "layer0",
  "layer": "kernel",
  "order": 3,
  "icon": "ph-database",
  "badge": "Layer 0 — Kernel #1",
  "tags": ["doctype", "metadata", "schema"],
  "blocks": [
    { "type": "paragraph", "text": "Bu framework'ün **kalbi**..." },
    { "type": "heading", "level": 4, "text": "Domain modeli" },
    { "type": "code", "lang": "python", "content": "..." },
    { "type": "callout", "variant": "critical", "label": "Tuzak", "body": "..." },
    { "type": "list", "items": ["..."] },
    { "type": "table", "headers": ["..."], "rows": [["...", "..."]] }
  ],
  "related": ["k-identity", "k-authz"]
}
```

## Block tipleri

| Type | Açıklama |
|------|----------|
| `paragraph` | Markdown inline destekli paragraf (`**bold**`, `*em*`, `` `code` ``, `{{ref:id}}`) |
| `heading` | h2..h5 |
| `code` | Kod bloğu, dil etiketli |
| `callout` | Tip/warning/critical/tr varyantları |
| `list` | Bulleted/numbered |
| `list-detailed` | Açıklamalı liste; critical flag desteği |
| `table` | Header + rows; compact varyant |
| `grid` | 2 veya 3 kolonlu kutular |
| `layer-cards` | Layer rengiyle kart grid'i |
| `domain-card` | Domain başlığını ve badge'ini sarmalayan kart başlangıcı |
| `examples` | Gerçek dünya örnek listesi |
| `kv-row` | Anahtar-değer iki kolon |
| `tree` | Dosya/dizin ağacı |
| `ref-grid` | İlişkili cluster bağlantıları |

Yeni block tipi eklemek istersen:
1. `src/types/content.ts` içine union'a yeni tip ekle.
2. `src/blocks/` altına `<my-block>.ts` renderer yaz.
3. `src/main.ts` içinde registry'e register et.
4. JSON'larda kullanmaya başla.

## Cross-reference

Bir paragraf veya callout içinde `{{ref:k-identity}}` yazarsan, renderer otomatik olarak <a href="#k-identity">Identity</a> bağlantısına çevirir. Hedef bulunamazsa düz metin döner ama console.warn düşer.

## Cluster eklemek

1. `content/clusters/` altına yeni `xx-new.json` dosyası yaz.
2. `content/manifest.json` `clusters` array'ine satır ekle:

   ```json
   { "file": "clusters/30-stack-marketing.json", "id": "s-marketing", "title": "Marketing/CRM Stack", "cluster": "stack", "order": 30 }
   ```

3. Dev server kapalıysa restart; açıksa Vite hot-reload zaten yakalar.

## Komutlar

```sh
pnpm install
pnpm dev       # http://localhost:5173
pnpm build     # dist/
pnpm preview
```

## Schema doğrulama

Engine her JSON'u Zod ile doğrular. Eksik alan veya geçersiz block tipi → console error + UI'da kırmızı placeholder.

## Smart features

- **Manifest discovery** — `import.meta.glob('./content/clusters/*.json')` dev'de auto-discover; prod'da manifest.json kullanılır.
- **Search** — tüm paragraph + heading'i index'ler, fuzzy substring + tag arama.
- **TOC** — render sonrası h2/h3 tarayıp sidebar TOC üretir.
- **Filter** — layer/cluster bazlı filter (URL param: `?layer=kernel`).
- **Hash routing** — `#k-schema` → scroll + highlight.
- **Lazy load** — büyük cluster'lar görünür olduğunda fetch edilir.
- **Anchor autogen** — heading'ler için ID otomatik üretilir.

## CSP / yasaklar

- Next.js yasak — vanilla TS + Vite + native templates.
- No emoji — Phosphor icons.
- Roboto font, min 300 weight, min 1rem text.
- Flowbite opsiyonel — gerekirse component'lerde kullan, zorunlu değil.
- SCSS modül, tipografi token'ları `variables.scss`.

## Lisans

LGPLv3 (parent project ile tutarlı).
