/**
 * Reading progress bar — sayfa içinde scroll yüzdesini gösteren ince bant.
 * Appbar altında sticky pozisyonda.
 */

export function mountReadingProgress(parent: HTMLElement): void {
  const bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.innerHTML = '<div class="reading-progress__fill" aria-hidden="true"></div>';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Sayfa okuma ilerlemesi');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-valuenow', '0');
  parent.appendChild(bar);

  const fill = bar.querySelector<HTMLElement>('.reading-progress__fill')!;
  let raf = 0;
  const update = (): void => {
    raf = 0;
    const doc = document.documentElement;
    const scrolled = doc.scrollTop;
    const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
    const pct = Math.min(100, Math.max(0, (scrolled / max) * 100));
    fill.style.width = `${pct}%`;
    bar.setAttribute('aria-valuenow', String(Math.round(pct)));
  };
  const onScroll = (): void => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}
