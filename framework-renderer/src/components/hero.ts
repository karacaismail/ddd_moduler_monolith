import type { Manifest } from '@/types/content';

export function renderHero(target: HTMLElement, manifest: Manifest, clusterCount: number): void {
  target.innerHTML = `
    <div class="hero__inner">
      <div class="hero__eyebrow">Framework Master · v${manifest.version}</div>
      <h1 class="hero__title">${manifest.name}</h1>
      <p class="hero__lede">
        Bu sayfa, JSON dosyalarından dinamik olarak render edilir.
        Bir cluster içerik olarak büyür ya da yeni cluster eklenir &mdash; engine değişmeden render eder.
      </p>
      <div class="hero__meta">
        <span><i class="ph ph-files"></i> ${clusterCount} cluster yüklü</span>
        <span><i class="ph ph-stack"></i> ${manifest.groups.length} grup</span>
        <span><i class="ph ph-shield"></i> LGPLv3</span>
      </div>
    </div>
  `;
}
