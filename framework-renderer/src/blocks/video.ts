import type { BlockRenderer } from '@/engine/registry';
import { makeDetailKey } from '@/components/detail-panel';
import type { Enrichment } from '@/types/content';

type VideoBlock = {
  type: 'video';
  src: string;
  poster?: string;
  caption?: string;
  /** Otomatik altyazı dosyası (WebVTT). Hedef kitle 60+ — altyazı önerilir. */
  captionsSrc?: string;
  captionsLang?: string;
  enrich?: Enrichment;
};

export const videoRenderer: BlockRenderer<VideoBlock> = (block, ctx) => {
  const fig = document.createElement('figure');
  fig.className = 'block-video';

  const video = document.createElement('video');
  video.controls = true;
  video.preload = 'metadata';
  video.playsInline = true;
  if (block.poster) video.poster = block.poster;

  const source = document.createElement('source');
  source.src = block.src;
  // Tip tahmini — uzantıdan
  if (block.src.endsWith('.webm')) source.type = 'video/webm';
  else if (block.src.endsWith('.ogv')) source.type = 'video/ogg';
  else source.type = 'video/mp4';
  video.appendChild(source);

  if (block.captionsSrc) {
    const track = document.createElement('track');
    track.kind = 'captions';
    track.src = block.captionsSrc;
    track.srclang = block.captionsLang ?? 'tr';
    track.label = block.captionsLang === 'en' ? 'English' : 'Türkçe';
    track.default = true;
    video.appendChild(track);
  } else {
    // A11y uyarısı — geliştirici konsolu için
    console.warn('[block-video] altyazı (captionsSrc) eksik:', block.src);
  }

  fig.appendChild(video);

  if (block.caption) {
    const cap = document.createElement('figcaption');
    cap.className = 'block-video__caption';
    cap.innerHTML = ctx.renderMarkup(block.caption);
    fig.appendChild(cap);
  }

  const dk = makeDetailKey(block.enrich, {
    title: block.caption || 'Video',
    summary: block.caption,
    contextLabel: ctx.cluster.title,
  });
  if (dk) {
    fig.dataset.detailKey = dk;
    fig.classList.add('is-clickable');
  }
  return fig;
};
