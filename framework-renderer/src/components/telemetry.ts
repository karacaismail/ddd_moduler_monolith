/**
 * Telemetry (gözlemleme) — error monitoring + lightweight analytics.
 *
 * - Sentry: opsiyonel; window.__SENTRY_DSN tanımlıysa CDN'den yüklenir.
 * - Analytics: opsiyonel; window.__POSTHOG_HOST + __POSTHOG_KEY varsa init.
 * - Yoksa: sadece console.error/info'ya yazılır (geliştirici görür).
 *
 * Hiçbir kullanıcı verisi izin alınmadan toplanmaz; bu modül **stub**'dur.
 * Gerçek 3. parti açmadan önce KVKK/GDPR rıza bandı eklenmeli.
 */

let initialized = false;

interface ErrorEvent { message: string; stack?: string; source: 'window' | 'unhandled' }

function reportError(e: ErrorEvent): void {
  // 1) Geliştirici konsoluna (her zaman)
  console.error('[telemetry]', e.source, e.message, e.stack);
  // 2) Sentry yüklüyse
  const w = window as Window & { Sentry?: { captureException: (err: unknown) => void } };
  if (w.Sentry) {
    w.Sentry.captureException(new Error(e.message));
  }
}

export function initTelemetry(): void {
  if (initialized) return;
  initialized = true;

  window.addEventListener('error', (ev) => {
    reportError({
      message: ev.message || 'window.error',
      stack: (ev.error as Error | undefined)?.stack,
      source: 'window',
    });
  });
  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev.reason;
    reportError({
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      source: 'unhandled',
    });
  });

  // İsteğe bağlı Sentry init — runtime config window.__SENTRY_DSN
  const dsn = (window as Window & { __SENTRY_DSN?: string }).__SENTRY_DSN;
  if (dsn) {
    const s = document.createElement('script');
    s.src = 'https://browser.sentry-cdn.com/7.x/bundle.min.js';
    s.crossOrigin = 'anonymous';
    s.async = true;
    s.onload = () => {
      const w = window as Window & {
        Sentry?: { init: (cfg: { dsn: string; tracesSampleRate?: number }) => void };
      };
      w.Sentry?.init({ dsn, tracesSampleRate: 0.1 });
      console.info('[telemetry] Sentry initialized');
    };
    document.head.appendChild(s);
  }

  // İsteğe bağlı PostHog
  const phHost = (window as Window & { __POSTHOG_HOST?: string }).__POSTHOG_HOST;
  const phKey = (window as Window & { __POSTHOG_KEY?: string }).__POSTHOG_KEY;
  if (phHost && phKey) {
    // PostHog snippet — basit init (rıza alındıktan sonra çağrılmalı)
    console.info('[telemetry] PostHog yüklenmeye hazır; rıza bandı sonrası init et.');
  }
}

/** Olay raporla (sayfa görüntüleme, link tıklama, vs.) — analytics provider varsa iletir. */
export function track(event: string, props: Record<string, unknown> = {}): void {
  // Geliştirici konsolu — production'da provider hooklu
  if (import.meta.env?.DEV) {
    console.info('[track]', event, props);
  }
  const w = window as Window & { posthog?: { capture: (e: string, p: Record<string, unknown>) => void } };
  w.posthog?.capture(event, props);
}

/**
 * Real User Monitoring (RUM) — Web Vitals'ı ölç ve track() üzerinden gönder.
 * web-vitals paketi opsiyonel: npm i web-vitals → bu modül dynamic import eder.
 * Olmazsa sessizce skip; üretim build'i bozulmaz.
 */
export async function initWebVitals(): Promise<void> {
  try {
    // Dynamic import — paket yoksa hata atar, biz yutarız.
    // TS module resolution'dan kaçmak için indirection (web-vitals opsiyonel dependency).
    const modName = 'web-vitals';
    const wv = await (Function('m', 'return import(m)')(modName) as Promise<unknown>).catch(() => null);
    if (!wv) {
      console.info('[telemetry] web-vitals yüklü değil; npm i web-vitals ile RUM aktif olur');
      return;
    }
    const lib = wv as {
      onLCP?: (cb: (m: { name: string; value: number; rating: string; id: string }) => void) => void;
      onINP?: (cb: (m: { name: string; value: number; rating: string; id: string }) => void) => void;
      onCLS?: (cb: (m: { name: string; value: number; rating: string; id: string }) => void) => void;
      onTTFB?: (cb: (m: { name: string; value: number; rating: string; id: string }) => void) => void;
      onFCP?: (cb: (m: { name: string; value: number; rating: string; id: string }) => void) => void;
    };
    const report = (metric: { name: string; value: number; rating: string; id: string }): void => {
      track('web-vital', {
        name: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating,
        id: metric.id,
        path: window.location.pathname + window.location.hash,
      });
    };
    lib.onLCP?.(report);
    lib.onINP?.(report);
    lib.onCLS?.(report);
    lib.onTTFB?.(report);
    lib.onFCP?.(report);
    console.info('[telemetry] web-vitals aktif');
  } catch (err) {
    console.warn('[telemetry] RUM init başarısız:', err);
  }
}
