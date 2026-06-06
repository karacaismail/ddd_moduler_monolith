import type { BlockRenderer } from '@/engine/registry';
import { enrichButtonsHtml, stateBadgeHtml } from '@/components/popover';
import { makeDetailKey, makeDetailKeyFromText } from '@/components/detail-panel';
import type { Enrichment, State } from '@/types/content';

type Cell =
  | string
  | { text: string; state?: State; enrich?: Enrichment };

type TableBlock = {
  type: 'table';
  headers: string[];
  rows: Cell[][];
  compact?: boolean;
  caption?: string;
  filterable?: boolean;
  stateColumn?: number;
};

const STATE_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'Tümü' },
  { id: 'ok', label: 'Hazır' },
  { id: 'critical', label: 'Kritik' },
  { id: 'missing', label: 'Eksik' },
  { id: 'partial', label: 'Kısmen' },
  { id: 'planned', label: 'Planlı' },
  { id: 'wip', label: 'WIP' },
];

function cellText(cell: Cell): string {
  return typeof cell === 'string' ? cell : cell.text;
}
function cellState(cell: Cell): State | undefined {
  return typeof cell === 'string' ? undefined : cell.state;
}
function cellEnrich(cell: Cell): Enrichment | undefined {
  return typeof cell === 'string' ? undefined : cell.enrich;
}

export const tableRenderer: BlockRenderer<TableBlock> = (block, ctx) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'block-table__wrap';

  const showFilter =
    (block.filterable === true || (block.filterable !== false && block.rows.length >= 8)) &&
    block.rows.length > 0;

  // detect row state: from stateColumn or any cell.state on row
  const rowStateOf = (row: Cell[]): State | undefined => {
    if (typeof block.stateColumn === 'number') {
      const c = row[block.stateColumn];
      if (c) {
        const explicit = cellState(c);
        if (explicit) return explicit;
        const txt = cellText(c).toLowerCase().trim();
        if (txt === 'hazır' || txt === 'evet' || txt === 'ok' || txt === '✓') return 'ok';
        if (txt === 'hayır' || txt === 'no' || txt === '✗') return 'missing';
        if (txt === 'kritik') return 'critical';
        if (txt === 'kısmen' || txt === 'partial') return 'partial';
        if (txt === 'planlı' || txt === 'planlandı' || txt === 'planned') return 'planned';
        if (txt === 'wip' || txt === 'geliştiriliyor') return 'wip';
      }
    }
    for (const c of row) {
      const s = cellState(c);
      if (s) return s;
    }
    return undefined;
  };

  let filterBar: HTMLDivElement | undefined;
  if (showFilter) {
    filterBar = document.createElement('div');
    filterBar.className = 'mini-filter mini-filter--table';
    filterBar.innerHTML = `
      <div class="mini-filter__chips">
        ${STATE_FILTERS.map(
          (s, i) => `<button class="chip chip--xs${i === 0 ? ' chip--active' : ''}" data-state="${s.id}">${s.label}</button>`,
        ).join('')}
      </div>
      <div class="mini-filter__search">
        <i class="ph ph-magnifying-glass"></i>
        <input type="search" placeholder="tabloda filtrele…" />
      </div>
    `;
    wrapper.appendChild(filterBar);
  }

  const table = document.createElement('table');
  table.className = block.compact ? 'block-table block-table--compact' : 'block-table';

  if (block.caption) {
    const cap = document.createElement('caption');
    cap.innerHTML = ctx.renderMarkup(block.caption);
    table.appendChild(cap);
  }

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  for (const h of block.headers) {
    const th = document.createElement('th');
    th.innerHTML = ctx.renderMarkup(h);
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of block.rows) {
    const tr = document.createElement('tr');
    const rowState = rowStateOf(row);
    if (rowState) {
      tr.dataset.state = rowState;
      tr.className = `tr--state-${rowState}`;
    }
    // Satırın bütününü tıklanır yap (ilk hücre başlık olarak)
    const firstCellText = cellText(row[0] ?? '');
    const rowJoined = row.map(cellText).join(' | ');
    // Satır seviyesi enrich: ilk hücrenin enrich'i (lesson dahil) satırın detay kaynağı.
    // Böylece her ünite için ayrı 60+ pedagojik içerik tetiklenebilir.
    const firstEnrich = cellEnrich(row[0] ?? '');
    const dk = firstEnrich
      ? makeDetailKey(firstEnrich, {
          title: firstCellText,
          summary: rowJoined.slice(0, 200),
          contextLabel: ctx.cluster.title,
        })
      : makeDetailKeyFromText(rowJoined, { title: firstCellText, contextLabel: ctx.cluster.title });
    if (dk) {
      tr.dataset.detailKey = dk;
      tr.classList.add('is-clickable');
    }

    row.forEach((cell, idx) => {
      const td = document.createElement('td');
      const state = cellState(cell);
      const enrich = cellEnrich(cell);
      const text = cellText(cell);

      // If this cell IS the state column, render a chip + raw text fallback
      if (typeof block.stateColumn === 'number' && idx === block.stateColumn) {
        const s = state ?? rowState;
        if (s) td.innerHTML = stateBadgeHtml(s);
        else td.innerHTML = ctx.renderMarkup(text);
      } else {
        td.innerHTML = ctx.renderMarkup(text);
      }

      if (state && idx !== block.stateColumn) {
        td.classList.add(`td--state-${state}`);
      }
      if (enrich) {
        const btns = enrichButtonsHtml(enrich);
        if (btns) {
          const span = document.createElement('span');
          span.className = 'enrich-btns enrich-btns--inline';
          span.innerHTML = btns;
          td.appendChild(span);
        }
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);

  if (filterBar) {
    queueMicrotask(() => {
      const chips = filterBar!.querySelectorAll<HTMLButtonElement>('.chip');
      const input = filterBar!.querySelector<HTMLInputElement>('input')!;
      // Çoklu state filter — Set
      const activeStates = new Set<string>(['all']);
      let query = '';
      const apply = (): void => {
        let visibleCount = 0;
        tbody.querySelectorAll<HTMLTableRowElement>('tr').forEach((tr) => {
          const matchState =
            activeStates.has('all') ||
            (tr.dataset.state ? activeStates.has(tr.dataset.state) : false);
          const matchQ =
            !query || (tr.textContent ?? '').toLowerCase().includes(query.toLowerCase());
          const show = matchState && matchQ;
          tr.style.display = show ? '' : 'none';
          if (show) visibleCount++;
        });
        // a11y-live region'a anons
        const live = document.getElementById('a11y-live');
        if (live) live.textContent = `${visibleCount} satır görünür`;
      };
      chips.forEach((c) =>
        c.addEventListener('click', () => {
          const state = c.dataset.state ?? 'all';
          if (state === 'all') {
            // "Tümü" → tek başına
            activeStates.clear();
            activeStates.add('all');
          } else {
            // "all"'u kaldır, bu state'i toggle et
            activeStates.delete('all');
            if (activeStates.has(state)) activeStates.delete(state);
            else activeStates.add(state);
            // Hiçbiri kalmadıysa "all"a dön
            if (activeStates.size === 0) activeStates.add('all');
          }
          chips.forEach((x) => {
            const s = x.dataset.state ?? 'all';
            x.classList.toggle('chip--active', activeStates.has(s));
          });
          apply();
        }),
      );
      let debounceTimer: number | undefined;
      input.addEventListener('input', () => {
        if (debounceTimer) window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
          query = input.value.trim();
          apply();
        }, 180);
      });
    });
  }

  return wrapper;
};
