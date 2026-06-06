/**
 * Detail Panel — sağdaki sticky panel; tıklanan karta ait derin açıklama,
 * terim sözlüğü, gerçek dünya örnekleri, ilgili linkler gösterir.
 *
 * Kullanım:
 *   detailStore.set(key, { contextLabel, title, summary, detail?, terms?, stories?, refs? })
 *   <li data-detail-key="…"> → otomatik tıklanır
 */

import type { Term, UserStory, Enrichment, Lesson } from '@/types/content';

export interface FiveWH {
  ne?: string;        // What
  nicin?: string;     // Why
  nasil?: string;     // How
  nerede?: string;    // Where
  ne_zaman?: string;  // When
  kim?: string;       // Who
}
export interface SideUsage {
  yer: string;          // Hangi katman/component/bileşen
  gereklilik: string;   // Neden lazım
  ornek: string;        // Somut örnek
}

export interface DetailPayload {
  contextLabel?: string;
  title: string;
  summary?: string;
  detail?: string;
  terms?: Term[];
  stories?: UserStory[];
  refs?: string[];
  /** 60+ pedagojik içerik — manuel yazılır, otomatik üretilmez. */
  lesson?: Lesson;
  /** Geri uyumluluk için — yeni kullanım `lesson` üzerinden. */
  fivewh?: FiveWH;
  frontend?: SideUsage;
  backend?: SideUsage;
}

const store = new Map<string, DetailPayload>();
let keyCounter = 0;
let panelInner: HTMLElement | null = null;
let currentKey: string | null = null;
let refResolver: ((id: string) => { title: string; cluster: string } | null) | null = null;
let clusterLookup: ((titleQuery: string) => { id: string; title: string; subtitle?: string } | null) | null = null;

export function setRefResolver(fn: typeof refResolver): void {
  refResolver = fn;
}
export function setClusterLookup(fn: typeof clusterLookup): void {
  clusterLookup = fn;
}

export function registerDetail(payload: DetailPayload): string {
  const key = `dp${++keyCounter}`;
  store.set(key, payload);
  return key;
}

/**
 * Bir enrichment objesinden DetailPayload üretir.
 * Enrich yoksa bile başlık + özet ile minimum kayıt üretilir — kart yine tıklanabilir.
 */
export function makeDetailKey(
  enrich: Enrichment | undefined,
  ctx: { title: string; summary?: string; contextLabel?: string },
): string | null {
  if (!ctx.title && !ctx.summary) return null;
  return registerDetail({
    contextLabel: ctx.contextLabel,
    title: ctx.title,
    summary: ctx.summary,
    detail: enrich?.detail ?? enrich?.info,
    terms: enrich?.terms,
    stories: enrich?.stories,
    refs: enrich?.refs,
    lesson: enrich?.lesson,
  });
}

/**
 * Hiç enrich yokken, salt metinden auto-detail üretir (amaç + süreç + 3 persona).
 * Cluster bağlamı domain'e göre persona seçer.
 */
const AUTO_PERSONAS: Record<string, Array<[string, string, string]>> = {
  default: [
    ['Yazılım mimarı', 'Bu konuya mimari kararla yaklaşır.', 'Sistemde nereye koyacağına, sınırlarını nasıl çizeceğine karar verir.'],
    ['Geliştirici / plugin yazarı', 'Bu özelliği günlük kodunda kullanır.', 'Hazır API üzerinden çağırır; sıfırdan yazmaz, framework primitif olarak sunar.'],
    ['Son kullanıcı', 'Bu özelliğin sonucunu UI/UX olarak deneyimler.', 'Form, sayfa veya akış olarak son çıktıyı görür; arkadaki teknik detayı bilmek zorunda değildir.'],
  ],
};

function stripMarkup(s: string): string {
  return s
    .replace(/\{\{ref:[^}]+\}\}/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function makeDetailKeyFromText(
  text: string,
  ctx: { title?: string; contextLabel?: string },
): string | null {
  const clean = stripMarkup(text);
  if (!clean || clean.length < 6) return null;

  // Cluster ref tespiti: ilk kelimeler bir cluster başlığıyla eşleşiyor mu?
  if (clusterLookup) {
    const hit = clusterLookup(clean.slice(0, 80));
    if (hit) {
      // O cluster'a yönlendiren mini-detail — minimal, jenerik metin yok
      return registerDetail({
        contextLabel: ctx.contextLabel,
        title: hit.title,
        summary: hit.subtitle || clean.slice(0, 200),
        detail:
          `**Bu konunun ana sayfası var:** [${hit.title}](#${hit.id}).\n\n` +
          `Detaylı açıklama, terim sözlüğü ve örnekler ana sayfasında.`,
        refs: [hit.id],
      });
    }
  }

  // ARTIK template-content üretmiyoruz — kullanıcı düz metin tıkladığında
  // sadece "metnin kendisi" + placeholder uyarısı görünür.
  // Gerçek pedagojik içerik için JSON'da enrich.lesson alanı doldurulmalı.
  void AUTO_PERSONAS; // legacy reference — kaldırılabilir
  const title = ctx.title || clean.slice(0, 60) + (clean.length > 60 ? '…' : '');
  return registerDetail({
    contextLabel: ctx.contextLabel,
    title,
    summary: clean.length > 200 ? clean.slice(0, 200) + '…' : clean,
    // detail yok → placeholderNotice render edilir, kullanıcı "yazılmamış" gerçeğini görür.
  });
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));
}

/**
 * Inline markdown — etiketsiz (paragraf sarmaz, sadece string'i markup'a çevirir).
 * 5N1K cell, frontend/backend value, term meaning gibi tek satırlık alanlar için.
 * Destek: **bold**, *italic*, `code`, ~~strike~~, [link](url)
 */
function inlineMd(text: string): string {
  let out = htmlEscape(text);
  out = out.replace(/`([^`]+)`/g, (_, c: string) => `<code>${c}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, b: string) => `<strong>${b}</strong>`);
  // italic (tek *): bold'tan sonra, kaçırılmasın diye bold pattern olmayanı
  out = out.replace(/(^|[\s(>])\*([^*\s][^*]*?)\*(?=[\s).,;:!?<]|$)/g,
    (_m, lead: string, em: string) => `${lead}<em>${em}</em>`);
  out = out.replace(/~~([^~]+)~~/g, (_, s: string) => `<del>${s}</del>`);
  // basit external link
  out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    (_, t: string, u: string) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
  return out;
}

/**
 * Block markdown — paragraf sarmalı, çift satır = yeni paragraf.
 * detail, analoji gibi uzun metin alanları için.
 */
function inlineMarkup(text: string): string {
  let out = inlineMd(text);
  out = out.replace(/\n\n+/g, '</p><p>');
  out = out.replace(/\n/g, '<br/>');
  return `<p>${out}</p>`;
}

function termsHtml(terms: Term[]): string {
  return `<section class="dp__section">
    <h4><i class="ph-duotone ph-book-open-text"></i> Terim sözlüğü</h4>
    <div class="dp__terms">
      ${terms.map((t) => `
        <article class="dp__term">
          <div class="dp__term-head">
            <strong>${inlineMd(t.term)}</strong>
            ${t.abbrev_of ? `<span class="dp__term-abbrev">= ${inlineMd(t.abbrev_of)}</span>` : ''}
            ${t.abbrev_tr ? `<span class="dp__term-tr">(${inlineMd(t.abbrev_tr)})</span>` : ''}
          </div>
          <div class="dp__term-meaning">${inlineMd(t.meaning)}</div>
          ${t.why ? `<div class="dp__term-why"><span>Neden:</span> ${inlineMd(t.why)}</div>` : ''}
        </article>
      `).join('')}
    </div>
  </section>`;
}

function storiesHtml(stories: UserStory[]): string {
  return `<section class="dp__section">
    <h4><i class="ph-duotone ph-user-focus"></i> Gerçek dünya örnekleri</h4>
    <div class="dp__stories">
      ${stories.map((s) => `
        <article class="dp__story">
          <div class="dp__story-persona"><i class="ph ph-user-circle"></i> ${inlineMd(s.persona)}</div>
          <div class="dp__story-context"><span class="dp__story-tag">Bağlam</span>${inlineMd(s.context)}</div>
          <div class="dp__story-outcome"><span class="dp__story-tag dp__story-tag--out">Sonuç</span>${inlineMd(s.outcome)}</div>
        </article>
      `).join('')}
    </div>
  </section>`;
}

function fiveWhHtml(f: FiveWH): string {
  const rows: Array<[string, string | undefined, string]> = [
    ['Ne?',       f.ne,       'ph-question'],
    ['Niçin?',    f.nicin,    'ph-target'],
    ['Nasıl?',    f.nasil,    'ph-path'],
    ['Nerede?',   f.nerede,   'ph-map-pin'],
    ['Ne zaman?', f.ne_zaman, 'ph-clock'],
    ['Kim?',      f.kim,      'ph-user-circle'],
  ];
  const items = rows
    .filter(([, val]) => !!val)
    .map(([k, v, icon]) => `
      <div class="dp__5n1k-row">
        <div class="dp__5n1k-key"><i class="ph ${icon}"></i> ${k}</div>
        <div class="dp__5n1k-val">${inlineMd(v as string)}</div>
      </div>
    `).join('');
  if (!items) return '';
  return `<section class="dp__section">
    <h4><i class="ph-duotone ph-list-magnifying-glass"></i> 5N1K analizi</h4>
    <div class="dp__5n1k">${items}</div>
  </section>`;
}

function sideUsageHtml(side: 'frontend' | 'backend', usage: SideUsage): string {
  const isFE = side === 'frontend';
  const label = isFE ? 'Frontend tarafı' : 'Backend tarafı';
  const icon = isFE ? 'ph-monitor' : 'ph-database';
  const tone = isFE ? 'fe' : 'be';
  return `<section class="dp__section">
    <h4><i class="ph-duotone ${icon}"></i> ${label}</h4>
    <div class="dp__side dp__side--${tone}">
      <div class="dp__side-row"><span class="dp__side-label">Yeri:</span> ${inlineMd(usage.yer)}</div>
      <div class="dp__side-row"><span class="dp__side-label">Gereklilik:</span> ${inlineMd(usage.gereklilik)}</div>
      <div class="dp__side-row"><span class="dp__side-label">Örnek:</span> ${inlineMd(usage.ornek)}</div>
    </div>
  </section>`;
}

function refsHtml(refs: string[]): string {
  if (!refResolver) return '';
  const items = refs
    .map((id) => {
      const t = refResolver!(id);
      if (!t) return '';
      return `<a class="dp__ref" href="#${id}"><i class="ph ph-link"></i> ${htmlEscape(t.title)}</a>`;
    })
    .filter(Boolean)
    .join('');
  if (!items) return '';
  return `<section class="dp__section">
    <h4><i class="ph-duotone ph-graph"></i> İlgili konular</h4>
    <div class="dp__refs">${items}</div>
  </section>`;
}

// ─── DÜRÜST PLACEHOLDER ──────────────────────────────────────────────────────
// ESKİ autoFiveWH/Frontend/Backend "title değişiyor ama içerik aynı" üretiyordu.
// Bu öğrenme deneyimini bozuyordu (60+ kullanıcı bunu kopya gibi okur).
// Yeni davranış: lesson içeriği YOKSA "bu içerik henüz yazılmadı" işareti.
// ─────────────────────────────────────────────────────────────────────────────

function lessonToFiveWH(l: Lesson | undefined): FiveWH | undefined {
  if (!l) return undefined;
  const out: FiveWH = {
    ne: l.ne, nicin: l.nicin, nasil: l.nasil,
    nerede: l.nerede, ne_zaman: l.ne_zaman, kim: l.kim,
  };
  return Object.values(out).some(Boolean) ? out : undefined;
}

function placeholderNotice(title: string): string {
  return `
    <section class="dp__section dp__placeholder">
      <div class="dp__placeholder-row">
        <i class="ph-duotone ph-warning-octagon"></i>
        <div>
          <strong>"${htmlEscape(title)}" için eğitim içeriği henüz hazırlanmadı.</strong>
          <p>Bu konunun 60+ yaş ve yazılıma yeni başlayanlar için anlaşılır
          açıklaması, frontend/backend taraf örnekleri ve gündelik analojisi
          ilgili cluster JSON dosyasında <code>enrich.lesson</code> alanında
          tanımlanmalı. Boş bırakılan kart, kasıtlı olarak template-içerikle
          doldurulmamaktadır.</p>
        </div>
      </div>
    </section>
  `;
}

function render(payload: DetailPayload): string {
  const lesson = payload.lesson;
  // 5N1K — lesson öncelikli, geri uyumluluk için payload.fivewh fallback
  const fivewh = lessonToFiveWH(lesson) ?? payload.fivewh;
  const frontend = lesson?.frontend ?? payload.frontend;
  const backend = lesson?.backend ?? payload.backend;

  const hasLesson =
    !!(fivewh || frontend || backend || lesson?.analoji || payload.detail);
  const hasAnyContent =
    hasLesson ||
    (payload.terms && payload.terms.length > 0) ||
    (payload.stories && payload.stories.length > 0) ||
    (payload.refs && payload.refs.length > 0);

  return `
    <button class="dp__close" aria-label="Detay panelini kapat"><i class="ph ph-x"></i></button>
    <div class="dp__head">
      ${payload.contextLabel ? `<div class="dp__context">${inlineMd(payload.contextLabel)}</div>` : ''}
      <h3 class="dp__title">${inlineMd(payload.title)}</h3>
      ${payload.summary ? `<p class="dp__summary">${inlineMd(payload.summary)}</p>` : ''}
    </div>
    ${payload.detail ? `<section class="dp__section dp__detail">${inlineMarkup(payload.detail)}</section>` : ''}
    ${lesson?.analoji ? `
      <section class="dp__section dp__analogy">
        <h4><i class="ph-duotone ph-tree-evergreen"></i> Gündelik analoji</h4>
        <p>${inlineMarkup(lesson.analoji)}</p>
      </section>` : ''}
    ${fivewh ? fiveWhHtml(fivewh) : ''}
    ${frontend ? sideUsageHtml('frontend', frontend) : ''}
    ${backend ? sideUsageHtml('backend', backend) : ''}
    ${payload.terms && payload.terms.length > 0 ? termsHtml(payload.terms) : ''}
    ${payload.stories && payload.stories.length > 0 ? storiesHtml(payload.stories) : ''}
    ${payload.refs && payload.refs.length > 0 ? refsHtml(payload.refs) : ''}
    ${!hasAnyContent ? placeholderNotice(payload.title) : ''}
  `;
}

const PLACEHOLDER = `
  <div class="detail-panel__placeholder">
    <i class="ph-duotone ph-cursor-click"></i>
    <div class="detail-panel__placeholder-title">Bir karta tıkla</div>
    <p>Soldaki herhangi bir konu veya alana tıklayınca; <strong>detaylı açıklama</strong>, <strong>terim sözlüğü</strong> ve <strong>gerçek dünya örnekleri</strong> burada görünür.</p>
  </div>
`;

function ensureBackdrop(): HTMLElement {
  let b = document.querySelector<HTMLElement>('.detail-panel-backdrop');
  if (!b) {
    b = document.createElement('div');
    b.className = 'detail-panel-backdrop';
    b.setAttribute('aria-hidden', 'true');
    b.addEventListener('click', () => closeDetail());
    document.body.appendChild(b);
  }
  return b;
}

// Drawer modu: panel sticky değil, fixed/overlay olarak açılır
function isDrawerMode(): boolean {
  return window.matchMedia('(max-width: 1239px)').matches;
}

export function openDetail(key: string): void {
  const payload = store.get(key);
  if (!payload || !panelInner) return;
  currentKey = key;
  panelInner.innerHTML = render(payload);
  panelInner.scrollTop = 0;
  panelInner.parentElement?.classList.add('detail-panel--open');
  // Backdrop ve body lock SADECE drawer modunda (mobile/tablet)
  if (isDrawerMode()) {
    ensureBackdrop().classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }
  highlightActive(key);
}

export function closeDetail(): void {
  if (!panelInner) return;
  panelInner.innerHTML = PLACEHOLDER;
  panelInner.parentElement?.classList.remove('detail-panel--open');
  document.querySelector('.detail-panel-backdrop')?.classList.remove('is-visible');
  document.body.style.overflow = '';
  highlightActive(null);
  currentKey = null;
}

function highlightActive(key: string | null): void {
  document.querySelectorAll<HTMLElement>('[data-detail-key]').forEach((el) => {
    el.classList.toggle('is-detail-active', el.dataset.detailKey === key);
  });
}

export function mountDetailPanel(panel: HTMLElement): void {
  panelInner = panel.querySelector<HTMLElement>('.detail-panel__inner');
  if (!panelInner) return;

  document.body.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.dp__close')) {
      closeDetail();
      return;
    }
    // Link/button/checkbox/label tıklamalarına müdahale etme
    if (target.closest('a, button:not(.dp__close), input, label, summary')) return;

    const trigger = target.closest<HTMLElement>('[data-detail-key]');
    if (!trigger) return;
    const key = trigger.dataset.detailKey;
    if (!key) return;
    if (currentKey === key) {
      closeDetail();
    } else {
      openDetail(key);
    }
  });
}
