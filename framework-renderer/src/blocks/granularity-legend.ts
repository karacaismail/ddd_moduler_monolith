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
  kaya: 'Modül — sidebar\'da bir başlık. Örn: HRMS / E-ticaret. Birden çok kapsam içerir.',
  'buyuk-tas': 'Kapsam — modül içindeki bir items[] başlığı. Örn: İşe Alım, İzin Bakiyeleri, Bordro.',
  'orta-tas': 'Sayfa — form / liste / tablo görüntüsü. Örn: Çalışan profili sayfası, Aday formu.',
  'kucuk-tas': 'Bölüm — bir formdaki block / section. Örn: "Acil durum iletişim" alanları.',
  kum: 'Alan — input / dropdown / kolon. Örn: TCKN field, Para input, Status dropdown.',
  toz: 'Validator — alana takılan kural / coercion / formatter. Örn: IBAN check, Decimal coercion.',
  atom: 'Primitive — type system, scalar, id-gen. Örn: UUID v7, Decimal(20,4), Phone(E.164).',
};

// Tipik proje (15 modül) için her tanecik kategorisinden YAKLAŞIK toplam adet
const TYPICAL_COUNT: Record<Granularity, string> = {
  kaya: '~15',          // 15 modül
  'buyuk-tas': '~250',  // 15 × ~16 kapsam
  'orta-tas': '~1.500', // ~250 × ~6 sayfa
  'kucuk-tas': '~6.000',// ~1500 × ~4 bölüm
  kum: '~50.000',       // ~6000 × ~8 alan
  toz: '~15.000',       // ~kum / 3
  atom: '~80',          // sabit primitive havuzu
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
  intro.innerHTML =
    'Bir feature\'ın <strong>karmaşıklığını</strong> (Story Point, fibonacci) bu yedi taneçik üzerinden hesaplıyoruz. <em>SP = bir adetin iş yükü</em>, adet sayısı değildir. Bir kaya 89 SP\'lik iş, ama içinde 15-20 büyük taş, her büyük taş ~6 orta taş içerir. Aşağıda tipik bir 15 modüllük proje için yaklaşık toplam adetler de var.';
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
        <span class="gran-grid__sp" title="1 adet için iş yükü (Fibonacci SP)">~${GRANULARITY_SP[g]} SP / adet</span>
      </div>
      <div class="gran-grid__counts">Tipik projede <strong>${TYPICAL_COUNT[g]} adet</strong></div>
      <div class="gran-grid__desc">${DESCRIPTIONS[g]}</div>
    `;
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  return wrap;
};
