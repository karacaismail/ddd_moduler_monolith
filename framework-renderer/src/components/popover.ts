/**
 * Popover — gecikmeli (hover) veya anında (click/focus) açılan açıklama balonu.
 * Tek instance, tüm sayfa için. data-popover-* attribute'larını dinler.
 *
 * Kullanım:
 *   <button data-popover="info"   data-info-text="kısa açıklama" />
 *   <button data-popover="detail" data-detail-key="123" />  ← detay store'dan
 *
 * Detail içerikleri büyük olabileceği için `setDetail(key, html)` ile
 * kayıt edilir, butonda sadece key tutulur.
 */

import type { Term, UserStory, Enrichment } from '@/types/content';

const HOVER_DELAY_OPEN = 120;
const HOVER_DELAY_CLOSE = 320;

interface PopoverInstance {
  el: HTMLElement;
  arrow: HTMLElement;
  body: HTMLElement;
  openTimer?: number;
  closeTimer?: number;
  current?: HTMLElement;
}

const detailStore = new Map<string, string>();
let inst: PopoverInstance | null = null;
let keyCounter = 0;

function ensureInstance(): PopoverInstance {
  if (inst) return inst;
  const el = document.createElement('div');
  el.className = 'pop';
  el.setAttribute('role', 'tooltip');
  el.hidden = true;
  const arrow = document.createElement('div');
  arrow.className = 'pop__arrow';
  const body = document.createElement('div');
  body.className = 'pop__body';
  el.appendChild(arrow);
  el.appendChild(body);
  document.body.appendChild(el);

  // Backdrop — mobile'da popover dışında bir yere tıklayınca kapansın
  const backdrop = document.createElement('div');
  backdrop.className = 'pop-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.addEventListener('click', () => closeNow());
  document.body.appendChild(backdrop);

  // Mouse-leave-into-popover keeps it open
  el.addEventListener('mouseenter', () => {
    if (inst?.closeTimer) {
      window.clearTimeout(inst.closeTimer);
      inst.closeTimer = undefined;
    }
  });
  el.addEventListener('mouseleave', () => scheduleClose());

  inst = { el, arrow, body };
  return inst;
}

function position(target: HTMLElement, kind: 'info' | 'detail'): void {
  if (!inst) return;
  const { el, arrow } = inst;
  el.classList.toggle('pop--detail', kind === 'detail');
  el.classList.toggle('pop--info', kind === 'info');

  el.style.left = '-9999px';
  el.style.top = '0';
  el.hidden = false;

  const r = target.getBoundingClientRect();
  const pr = el.getBoundingClientRect();
  const margin = 10;
  const gap = 8;

  // position: fixed → viewport koordinatları (scrollY EKLENMEZ)
  let top = r.bottom + gap;
  let placement: 'top' | 'bottom' = 'bottom';
  if (r.bottom + pr.height + gap + margin > window.innerHeight) {
    top = r.top - pr.height - gap;
    placement = 'top';
  }

  let left = r.left + r.width / 2 - pr.width / 2;
  const minLeft = margin;
  const maxLeft = window.innerWidth - pr.width - margin;
  if (left < minLeft) left = minLeft;
  if (left > maxLeft) left = maxLeft;

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.dataset.placement = placement;

  // arrow x
  const arrowX = r.left + window.scrollX + r.width / 2 - left;
  arrow.style.left = `${Math.max(12, Math.min(pr.width - 12, arrowX))}px`;
}

function scheduleClose(): void {
  if (!inst) return;
  if (inst.closeTimer) window.clearTimeout(inst.closeTimer);
  inst.closeTimer = window.setTimeout(() => closeNow(), HOVER_DELAY_CLOSE);
}

function closeNow(): void {
  if (!inst) return;
  inst.el.hidden = true;
  inst.current?.removeAttribute('aria-expanded');
  inst.current = undefined;
  document.querySelector('.pop-backdrop')?.classList.remove('is-visible');
  document.body.classList.remove('pop-open');
}

function openFor(target: HTMLElement, kind: 'info' | 'detail'): void {
  const i = ensureInstance();
  if (i.openTimer) window.clearTimeout(i.openTimer);
  if (i.closeTimer) {
    window.clearTimeout(i.closeTimer);
    i.closeTimer = undefined;
  }
  i.current?.removeAttribute('aria-expanded');

  if (kind === 'info') {
    const txt = target.dataset.infoText ?? '';
    // Markdown — **bold**, *italic*, `code` desteklensin
    i.body.innerHTML = `<div class="pop__short">${inlineMd(txt)}</div>`;
  } else {
    const key = target.dataset.detailKey ?? '';
    const html = detailStore.get(key) ?? '<em>detay bulunamadı</em>';
    i.body.innerHTML = html;
  }
  i.current = target;
  target.setAttribute('aria-expanded', 'true');
  // Mobile'da backdrop göster — detail popover için
  if (kind === 'detail' && window.matchMedia('(max-width: 719px)').matches) {
    document.querySelector('.pop-backdrop')?.classList.add('is-visible');
    document.body.classList.add('pop-open');
  }
  position(target, kind);
}

function scheduleOpen(target: HTMLElement, kind: 'info' | 'detail'): void {
  const i = ensureInstance();
  if (i.openTimer) window.clearTimeout(i.openTimer);
  i.openTimer = window.setTimeout(() => openFor(target, kind), HOVER_DELAY_OPEN);
}

function cancelOpen(): void {
  if (inst?.openTimer) {
    window.clearTimeout(inst.openTimer);
    inst.openTimer = undefined;
  }
}

/**
 * Sayfa düzeyinde bir kere mount edilir. Tüm data-popover butonlarını dinler.
 */
export function mountPopover(): void {
  ensureInstance();

  const root = document.body;
  root.addEventListener(
    'mouseover',
    (e) => {
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-popover]');
      if (!t) return;
      const kind = t.dataset.popover as 'info' | 'detail';
      scheduleOpen(t, kind);
    },
    true,
  );
  root.addEventListener(
    'mouseout',
    (e) => {
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-popover]');
      if (!t) return;
      cancelOpen();
      scheduleClose();
    },
    true,
  );
  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-popover]');
    if (!t) return;
    e.preventDefault();
    const kind = t.dataset.popover as 'info' | 'detail';
    if (inst?.current === t && !inst.el.hidden) {
      closeNow();
    } else {
      openFor(t, kind);
    }
  });
  root.addEventListener('focusin', (e) => {
    const t = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-popover]');
    if (!t) return;
    const kind = t.dataset.popover as 'info' | 'detail';
    openFor(t, kind);
  });
  root.addEventListener('focusout', (e) => {
    const t = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-popover]');
    if (!t) return;
    scheduleClose();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && inst && !inst.el.hidden) closeNow();
  });
  window.addEventListener(
    'scroll',
    () => {
      if (inst && !inst.el.hidden && inst.current) {
        position(inst.current, (inst.current.dataset.popover as 'info' | 'detail') ?? 'info');
      }
    },
    { passive: true },
  );
}

// ============================================================================
// Builder: enrichment'tan butonları üretir
// ============================================================================

export function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

function renderInlineMarkup(text: string): string {
  // Block-level: inlineMd + paragraph break + line break desteği
  let out = inlineMd(text);
  out = out.replace(/\n\n+/g, '</p><p>');
  out = out.replace(/\n/g, '<br/>');
  return out;
}

/** Inline markdown — popover içi kısa metin alanları için. */
function inlineMd(text: string): string {
  let out = htmlEscape(text);
  out = out.replace(/`([^`]+)`/g, (_, c: string) => `<code>${c}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, b: string) => `<strong>${b}</strong>`);
  out = out.replace(/(^|[\s(>])\*([^*\s][^*]*?)\*(?=[\s).,;:!?<]|$)/g,
    (_m, lead: string, em: string) => `${lead}<em>${em}</em>`);
  out = out.replace(/~~([^~]+)~~/g, (_, s: string) => `<del>${s}</del>`);
  out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    (_, t: string, u: string) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
  return out;
}

function termsHtml(terms: Term[]): string {
  if (!terms.length) return '';
  const rows = terms
    .map((t) => {
      const abbrev = t.abbrev_of
        ? `<div class="pop__abbrev"><strong>${inlineMd(t.term)}</strong> = ${inlineMd(t.abbrev_of)}${
            t.abbrev_tr ? ` <span class="pop__tr">(${inlineMd(t.abbrev_tr)})</span>` : ''
          }</div>`
        : `<div class="pop__abbrev"><strong>${inlineMd(t.term)}</strong></div>`;
      const why = t.why ? `<div class="pop__why"><em>Neden:</em> ${inlineMd(t.why)}</div>` : '';
      return `<div class="pop__term">
        ${abbrev}
        <div class="pop__meaning">${inlineMd(t.meaning)}</div>
        ${why}
      </div>`;
    })
    .join('');
  return `<div class="pop__section">
    <h6><i class="ph ph-book-open-text"></i> Terim sözlüğü</h6>
    ${rows}
  </div>`;
}

function storiesHtml(stories: UserStory[]): string {
  if (!stories.length) return '';
  const items = stories
    .map(
      (s) => `<div class="pop__story">
        <div class="pop__persona"><i class="ph ph-user"></i> ${inlineMd(s.persona)}</div>
        <div class="pop__context">${inlineMd(s.context)}</div>
        <div class="pop__outcome"><i class="ph ph-arrow-right"></i> ${inlineMd(s.outcome)}</div>
      </div>`,
    )
    .join('');
  return `<div class="pop__section">
    <h6><i class="ph ph-user-focus"></i> Gerçek dünya örnekleri</h6>
    ${items}
  </div>`;
}

/**
 * Bir enrichment objesinden ! (info) + ? (detail) butonlarını üretir.
 * Hiçbiri tanımlı değilse boş string döner.
 */
export function enrichButtonsHtml(en?: Enrichment): string {
  if (!en) return '';
  let html = '';

  if (en.info) {
    html += `<button type="button"
      class="enrich-btn enrich-btn--info"
      data-popover="info"
      data-info-text="${htmlEscape(en.info)}"
      aria-label="Kısa açıklama"
><i class="ph-bold ph-lightbulb"></i></button>`;
  }

  const hasDetail =
    !!en.detail || (en.terms && en.terms.length > 0) || (en.stories && en.stories.length > 0);
  if (hasDetail) {
    const key = `d${++keyCounter}`;
    const parts: string[] = [];
    if (en.detail) parts.push(`<div class="pop__lead"><p>${renderInlineMarkup(en.detail)}</p></div>`);
    if (en.terms?.length) parts.push(termsHtml(en.terms));
    if (en.stories?.length) parts.push(storiesHtml(en.stories));
    detailStore.set(key, parts.join(''));
    html += `<button type="button"
      class="enrich-btn enrich-btn--detail"
      data-popover="detail"
      data-detail-key="${key}"
      aria-label="Detaylı açıklama"
><i class="ph-bold ph-book-open-text"></i></button>`;
  }

  return html;
}

/**
 * Bir state veya granularity badge render eder (chip).
 */
export function stateBadgeHtml(state?: string): string {
  if (!state) return '';
  const label =
    ({
      ok: 'Hazır',
      missing: 'Eksik',
      critical: 'Kritik',
      partial: 'Kısmen',
      planned: 'Planlandı',
      wip: 'Geliştiriliyor',
      blocked: 'Bloke',
      deprecated: 'Eskimiş',
    } as Record<string, string>)[state] ?? state;
  return `<span class="state-chip state-chip--${state}">${label}</span>`;
}
