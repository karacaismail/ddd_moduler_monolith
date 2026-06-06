import type { BlockRegistry } from '@/engine/registry';
import { paragraphRenderer } from './paragraph';
import { headingRenderer } from './heading';
import { codeRenderer } from './code';
import { calloutRenderer } from './callout';
import { listRenderer } from './list';
import { featureListRenderer } from './feature-list';
import { tableRenderer } from './table';
import { gridRenderer } from './grid';
import { layerCardsRenderer } from './layer-cards';
import { examplesRenderer } from './examples';
import { kvRowRenderer } from './kv-row';
import { treeRenderer } from './tree';
import { refGridRenderer } from './ref-grid';
import { dividerRenderer } from './divider';
import { granularityLegendRenderer } from './granularity-legend';
import { userStoriesRenderer } from './user-stories';
import { termsRenderer } from './terms';
import { checklistRenderer } from './checklist';
import { stepsRenderer } from './steps';
import { lessonHeaderRenderer } from './lesson-header';
import { mermaidRenderer } from './mermaid';
import { imageRenderer } from './image';
import { videoRenderer } from './video';

/**
 * Tüm built-in block renderer'larını registry'e kayıt eder.
 * Yeni block tipi eklemek istersen: renderer'ını yaz, burada register et.
 */
export function registerAllBlocks(registry: BlockRegistry): BlockRegistry {
  return registry
    .register('paragraph', paragraphRenderer)
    .register('heading', headingRenderer)
    .register('code', codeRenderer)
    .register('callout', calloutRenderer)
    .register('list', listRenderer)
    .register('feature-list', featureListRenderer)
    .register('table', tableRenderer)
    .register('grid', gridRenderer)
    .register('layer-cards', layerCardsRenderer)
    .register('examples', examplesRenderer)
    .register('kv-row', kvRowRenderer)
    .register('tree', treeRenderer)
    .register('ref-grid', refGridRenderer)
    .register('divider', dividerRenderer)
    .register('granularity-legend', granularityLegendRenderer)
    .register('user-stories', userStoriesRenderer)
    .register('terms', termsRenderer)
    .register('checklist', checklistRenderer)
    .register('steps', stepsRenderer)
    .register('lesson-header', lessonHeaderRenderer)
    .register('mermaid', mermaidRenderer)
    .register('image', imageRenderer)
    .register('video', videoRenderer);
}
