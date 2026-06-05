/**
 * Detail Panel — sağdaki sticky panel; tıklanan karta ait derin açıklama,
 * terim sözlüğü, gerçek dünya örnekleri, ilgili linkler gösterir.
 *
 * Kullanım:
 *   detailStore.set(key, { contextLabel, title, summary, detail?, terms?, stories?, refs? })
 *   <li data-detail-key="…"> → otomatik tıklanır
 */

import type { Term, UserStory, Enrichment } from '@/types/content';

export interface DetailPayload {
  contextLabel?: string;
  title: string;
  summary?: string;
  detail?: string;
  terms?: Term[];
  stories?: UserStory[];
  refs?: string[];
}

const store = new Map<string, DetailPayload>();
let keyCounter = 0;
let panelInner: HTMLElement | null = null;
let currentKey: string | null = null;
let refResolver: ((id: string) => { title: string; cluster: string } | null) | null = null;

export function setRefResolver(fn: typeof refResolver): void {
  refResolver = fn;
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
  const title = ctx.title || clean.slice(0, 60) + (clean.length > 60 ? '…' : '');
  const detail =
    `**Bu içerik nedir?**\n\n${clean}\n\n` +
    `**Amaç:** Bu paragraf/blok, ${ctx.contextLabel ?? 'konunun'} bir parçası olarak yer alır ve okuyana belirli bir kararı/davranışı/kuralı aktarır.\n\n` +
    `**Hiç bilmeyene açıklama:** Teknik kelimeleri çıkarttığımızda bu metin, sistemin nasıl davrandığını anlatan kısa bir kuraldır. Aşağıdaki üç kullanıcı perspektifi aynı kuralı farklı zaviyelerden tanır.`;
  const stories = (AUTO_PERSONAS['default'] ?? []).map(([persona, context, outcome]) => ({
    persona,
    context,
    outcome,
  }));
  return registerDetail({
    contextLabel: ctx.contextLabel,
    title,
    summary: clean.length > 140 ? clean.slice(0, 140) + '…' : clean,
    detail,
    stories,
  });
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));
}

function inlineMarkup(text: string): string {
  let out = htmlEscape(text);
  out = out.replace(/`([^`]+)`/g, (_, c: string) => `<code>${c}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, b: string) => `<strong>${b}</strong>`);
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
            <strong>${htmlEscape(t.term)}</strong>
            ${t.abbrev_of ? `<span class="dp__term-abbrev">= ${htmlEscape(t.abbrev_of)}</span>` : ''}
            ${t.abbrev_tr ? `<span class="dp__term-tr">(${htmlEscape(t.abbrev_tr)})</span>` : ''}
          </div>
          <div class="dp__term-meaning">${htmlEscape(t.meaning)}</div>
          ${t.why ? `<div class="dp__term-why"><span>Neden:</span> ${htmlEscape(t.why)}</div>` : ''}
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
          <div class="dp__story-persona"><i class="ph ph-user-circle"></i> ${htmlEscape(s.persona)}</div>
          <div class="dp__story-context"><span class="dp__story-tag">Bağlam</span>${htmlEscape(s.context)}</div>
          <div class="dp__story-outcome"><span class="dp__story-tag dp__story-tag--out">Sonuç</span>${htmlEscape(s.outcome)}</div>
        </article>
      `).join('')}
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

function render(payload: DetailPayload): string {
  const hasRichContent =
    !!payload.detail ||
    (payload.terms && payload.terms.length > 0) ||
    (payload.stories && payload.stories.length > 0) ||
    (payload.refs && payload.refs.length > 0);

  return `
    <button class="dp__close" aria-label="Detay panelini kapat"><i class="ph ph-x"></i></button>
    <div class="dp__head">
      ${payload.contextLabel ? `<div class="dp__context">${htmlEscape(payload.contextLabel)}</div>` : ''}
      <h3 class="dp__title">${htmlEscape(payload.title)}</h3>
      ${payload.summary ? `<p class="dp__summary">${htmlEscape(payload.summary)}</p>` : ''}
    </div>
    ${payload.detail ? `<section class="dp__section dp__detail">${inlineMarkup(payload.detail)}</section>` : ''}
    ${payload.terms && payload.terms.length > 0 ? termsHtml(payload.terms) : ''}
    ${payload.stories && payload.stories.length > 0 ? storiesHtml(payload.stories) : ''}
    ${payload.refs && payload.refs.length > 0 ? refsHtml(payload.refs) : ''}
    ${!hasRichContent ? `
      <section class="dp__section dp__empty">
        <i class="ph-duotone ph-pencil-simple-line"></i>
        <p>Bu kart için henüz ek <strong>terim sözlüğü</strong> veya <strong>gerçek dünya örneği</strong> eklenmedi.</p>
        <p class="dp__empty-hint">Geliştirici notu: bu cluster'ın JSON dosyasında ilgili item'a <code>enrich.terms</code> ve <code>enrich.stories</code> alanları eklenebilir.</p>
      </section>
    ` : ''}
  `;
}

const PLACEHOLDER = `
  <div class="detail-panel__placeholder">
    <i class="ph-duotone ph-cursor-click"></i>
    <div class="detail-panel__placeholder-title">Bir karta tıkla</div>
    <p>Soldaki herhangi bir konu veya alana tıklayınca; <strong>detaylı açıklama</strong>, <strong>terim sözlüğü</strong> ve <strong>gerçek dünya örnekleri</strong> burada görünür.</p>
  </div>
`;

export function openDetail(key: string): void {
  const payload = store.get(key);
  if (!payload || !panelInner) return;
  currentKey = key;
  panelInner.innerHTML = render(payload);
  panelInner.scrollTop = 0;
  panelInner.parentElement?.classList.add('detail-panel--open');
  highlightActive(key);
}

export function closeDetail(): void {
  if (!panelInner) return;
  panelInner.innerHTML = PLACEHOLDER;
  panelInner.parentElement?.classList.remove('detail-panel--open');
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
