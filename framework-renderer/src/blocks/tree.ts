import type { BlockRenderer } from '@/engine/registry';
import { escapeHtml } from '@/engine/refs';
import { makeDetailKeyFromText } from '@/components/detail-panel';

type TreeNode = { name: string; comment?: string; children?: TreeNode[] };
type TreeBlock = { type: 'tree'; title?: string; root: TreeNode };

function renderNode(node: TreeNode, prefix: string, isLast: boolean, isRoot: boolean): string {
  const branch = isRoot ? '' : isLast ? '└── ' : '├── ';
  const line = `${prefix}${branch}<span class="tree__name">${escapeHtml(node.name)}</span>${
    node.comment ? `<span class="tree__comment"> # ${escapeHtml(node.comment)}</span>` : ''
  }`;

  const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
  const children = node.children ?? [];
  const childLines = children.map((child, i) =>
    renderNode(child, childPrefix, i === children.length - 1, false),
  );

  return [line, ...childLines].join('\n');
}

export const treeRenderer: BlockRenderer<TreeBlock> = (block, ctx) => {
  const wrap = document.createElement('figure');
  wrap.className = 'block-tree';
  const title = block.title || 'Dosya/dizin yapısı';
  const dk = makeDetailKeyFromText(`${title}\n\n${block.root.name}${block.root.comment ? ' — ' + block.root.comment : ''}`, { title, contextLabel: ctx.cluster.title });
  if (dk) {
    wrap.dataset.detailKey = dk;
    wrap.classList.add('is-clickable');
  }
  if (block.title) {
    const cap = document.createElement('figcaption');
    cap.className = 'block-tree__title';
    cap.textContent = block.title;
    wrap.appendChild(cap);
  }
  const pre = document.createElement('pre');
  pre.className = 'block-tree__pre';
  pre.innerHTML = renderNode(block.root, '', true, true);
  wrap.appendChild(pre);
  return wrap;
};
