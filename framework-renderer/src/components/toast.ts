/**
 * Toast/snackbar — kısa süreli kullanıcı geri bildirimi.
 * Global tek instance. Otomatik fade-out 2.5sn.
 */

let container: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (container) return container;
  const div = document.createElement('div');
  div.className = 'toast-container';
  div.setAttribute('aria-live', 'polite');
  div.setAttribute('aria-atomic', 'true');
  document.body.appendChild(div);
  container = div;
  return div;
}

export type ToastVariant = 'info' | 'success' | 'error';

export function toast(
  message: string,
  variant: ToastVariant = 'info',
  durationMs = 2500,
  onClick?: () => void,
): HTMLElement {
  const wrap = ensureContainer();
  const el = document.createElement(onClick ? 'button' : 'div');
  el.className = `toast toast--${variant}` + (onClick ? ' toast--clickable' : '');
  if (onClick) {
    (el as HTMLButtonElement).type = 'button';
    el.addEventListener('click', () => {
      onClick();
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 300);
    });
  }
  const icon =
    variant === 'success' ? 'ph-check-circle' :
    variant === 'error' ? 'ph-warning-circle' :
    'ph-info';
  el.innerHTML = `<i class="ph ${icon}"></i><span>${escape(message)}</span>`;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-visible'));
  if (durationMs > 0) {
    setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 300);
    }, durationMs);
  }
  return el;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
