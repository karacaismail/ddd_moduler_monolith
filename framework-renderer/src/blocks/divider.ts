import type { BlockRenderer } from '@/engine/registry';

export const dividerRenderer: BlockRenderer<{ type: 'divider' }> = () => {
  const hr = document.createElement('hr');
  hr.className = 'block-divider';
  return hr;
};
