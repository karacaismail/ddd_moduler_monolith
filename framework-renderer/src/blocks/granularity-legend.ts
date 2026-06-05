import type { BlockRenderer } from '@/engine/registry';
import {
  GRANULARITY_LABEL,
  GRANULARITY_ICON,
  GRANULARITY_SP,
  type Granularity,
} from '@/types/content';

type Block = { type: 'granularity-legend'; title?: string };

const ORDER: Granularity[] = ['kaya', 'buyuk-tas', 'orta-tas', 'kucuk-tas', 'kum', 'toz', 'atom'];

const DESCRIPTIONS: Record<Granularity, string> = {
  kaya: 'Modül — sidebar\'da bir başlık. Örn: HRMS / İşe Alım. Birden çok kapsam içerir.',
  'buyuk-tas': 'Kapsam — modül içindeki bir items[] başlığı. Örn: Aday Havuzu, İzin Bakiyeleri.',
  'orta-tas': 'Sayfa — form / liste / tablo görüntüsü. Örn: Çalışan profili sayfası.',
  'kucuk-tas': 'Bölüm — bir formdaki block / section. Örn: "Acil durum iletişim" alanları.',
  kum: 'Alan — input / dropdown / kolon. Örn: TCKN field, Para input, Status dropdown.',
  toz: 'Validator — alana takılan kural / coercion / formatter. Örn: IBAN check, Decimal coercion.',
  atom: 'Primitive — type system, scalar, id-gen. Örn: UUID v7, Decimal(20,4), Phone(E.164).',
};

export const granularityLegendRenderer: BlockRenderer<Block> = (block) => {
  const wrap = document.createElement('div');
  wrap.className = 'block-gran-legend';

  const h = document.createElement('h5');
  h.className = 'block-gran-legend__title';
  h.innerHTML = `<i class="ph ph-stack-simple"></i> ${block.title ?? 'Kilometre taşları — granularity'}`;
  wrap.appendChild(h);

  const intro = document.createElement('p');
  intro.className = 'block-gran-legend__intro';
  intro.textContent =
    'Bir feature\'ın büyüklüğünü (Story Point, fibonacci) bu yedi taneçik üzerinden hesaplıyoruz. Sidebar\'da modül = kaya, items[] = büyük taş, bir form = orta taş, bir field = kum, bir validator = toz, type primitive = atom.';
  wrap.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'gran-grid';
  for (const g of ORDER) {
    const card = document.createElement('div');
    card.className = `gran-grid__item gran-grid__item--${g}`;
    card.innerHTML = `
      <div class="gran-grid__head">
        <i class="ph-duotone ${GRANULARITY_ICON[g]}"></i>
        <span class="gran-grid__label">${GRANULARITY_LABEL[g]}</span>
        <span class="gran-grid__sp">~${GRANULARITY_SP[g]} SP</span>
      </div>
      <div class="gran-grid__desc">${DESCRIPTIONS[g]}</div>
    `;
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  return wrap;
};
