# Test piramidi

## Katmanlar

| Katman | Araç | Konum | Komut |
|---|---|---|---|
| Unit | Vitest + jsdom | `tests/unit/**.test.ts` | `npm test` |
| Integration | Vitest + jsdom | `tests/integration/**.test.ts` | `npm test` |
| E2E | Playwright | `tests/*.spec.ts` | `npm run test:e2e` |
| A11y | Playwright + axe-core | `tests/a11y.spec.ts` | `npm run test:a11y` |

## Kurulum

```bash
npm install
npx playwright install --with-deps
```

## CI gate (öneri)

`.github/workflows/test.yml` — PR'da:
1. `npm run typecheck`
2. `npm test` (unit + integration)
3. `npm run validate:content`
4. `npm run build`
5. `npm run test:e2e -- --project=chromium` (hızlı)
6. (nightly) `npm run test:e2e` (full matrix) + `npm run test:a11y`

## Coverage hedefi

- Engine modülleri: ≥80%
- Block renderer'lar: ≥60%
- Genel: ≥70%

## Eksik testler (TODO)

- [ ] `loader.test.ts` — fetch hata durumu, partial load
- [ ] `registry.test.ts` — bilinmeyen block fallback
- [ ] `toc.test.ts` — tek-açık kuralı, scrollspy mock
- [ ] `detail-panel.test.ts` — auto 5N1K item-specific injection
- [ ] `checklist.test.ts` — localStorage state kaydetme/okuma
- [ ] Integration: cluster JSON → render → DOM snapshot
- [ ] E2E: filter + hash navigation roundtrip
- [ ] E2E: popover keyboard navigation
- [ ] Visual regression: Percy/Chromatic snapshots
