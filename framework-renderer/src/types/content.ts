import { z } from 'zod';

// ============================================================================
// Inline markup notu
// ============================================================================
// `text` alanlarında şu mini-markdown desteklenir:
//   **bold**         → <strong>
//   *italic*         → <em>
//   `code`           → <code>
//   {{ref:id}}       → <a href="#id"> (label cluster registry'den çözülür)
//   [text](url)      → <a href="url" target="_blank">
//   \n               → satır kırılması (paragraf içinde)

// ============================================================================
// Granularity (kilometre taşları)
// ============================================================================
// Felsefe: kaya → büyük taş → orta taş → küçük taş → kum tanesi → toz tanesi → atom
// Bir feature'ın "büyüklüğünü" (story point, fibonacci) hesaplarken kullanılır.
//   kaya (module)           — modül (örn. HRMS / İşe Alım)
//   buyuk-tas (capability)  — items[] altındaki bir başlık (örn. "Aday Havuzu")
//   orta-tas (page)         — form / table / liste sayfası
//   kucuk-tas (section)     — bir form içindeki block / section
//   kum (field)             — input / dropdown / field / kolon
//   toz (validator)         — bir field'a takılan validator / coercion / formatter
//   atom (primitive)        — type system / scalar / id-gen / decimal primitive
// ============================================================================

export const GranularitySchema = z.enum([
  'kaya',
  'buyuk-tas',
  'orta-tas',
  'kucuk-tas',
  'kum',
  'toz',
  'atom',
]);
export type Granularity = z.infer<typeof GranularitySchema>;

// Fibonacci SP eşlemesi (üretim için)
export const GRANULARITY_SP: Record<Granularity, number> = {
  kaya: 89,
  'buyuk-tas': 34,
  'orta-tas': 13,
  'kucuk-tas': 5,
  kum: 2,
  toz: 1,
  atom: 1,
};

export const GRANULARITY_LABEL: Record<Granularity, string> = {
  kaya: 'Kaya',
  'buyuk-tas': 'Büyük taş',
  'orta-tas': 'Orta taş',
  'kucuk-tas': 'Küçük taş',
  kum: 'Kum tanesi',
  toz: 'Toz tanesi',
  atom: 'Atom',
};

export const GRANULARITY_ICON: Record<Granularity, string> = {
  kaya: 'ph-mountains',
  'buyuk-tas': 'ph-cube',
  'orta-tas': 'ph-square',
  'kucuk-tas': 'ph-squares-four',
  kum: 'ph-dots-nine',
  toz: 'ph-dot-outline',
  atom: 'ph-atom',
};

// ============================================================================
// State (durum) — bir özellik için
// ============================================================================

export const StateSchema = z.enum([
  'ok',
  'missing',
  'critical',
  'partial',
  'planned',
  'wip',
  'blocked',
  'deprecated',
]);
export type State = z.infer<typeof StateSchema>;

export const STATE_LABEL: Record<State, string> = {
  ok: 'Hazır',
  missing: 'Eksik',
  critical: 'Kritik eksik',
  partial: 'Kısmen',
  planned: 'Planlandı',
  wip: 'Geliştiriliyor',
  blocked: 'Bloke',
  deprecated: 'Kullanımdan kalkacak',
};

// ============================================================================
// Enrichment — info / detail / training data
// ============================================================================
// Her data noktasının yanına ! ve ? butonları eklenir:
//   info   = ! → kısa açıklama (tooltip)
//   detail = ? → detaylı popover (terim sözlüğü + gerçek dünya örnekleri)
// Hover gecikmeli (300ms) açılır, fokuslanırsa anında açılır.
// ============================================================================

export const TermSchema = z.object({
  term: z.string(),
  abbrev_of: z.string().optional(),
  abbrev_tr: z.string().optional(),
  meaning: z.string(),
  why: z.string().optional(),
});

export const UserStorySchema = z.object({
  persona: z.string(),
  context: z.string(),
  outcome: z.string(),
});

/**
 * Lesson — 60+ yaş, yazılım geliştirmeye yeni başlayanlar için
 * pedagojik içerik. Otomasyonla üretilmez, manuel yazılır.
 * Yoksa render engine "bu içerik henüz yazılmadı" placeholder gösterir.
 */
export const LessonSchema = z.object({
  /** 1-2 cümle: "X nedir?" sorusuna 60+ yaşa anlaşılır cevap. Jargon yok. */
  ne: z.string().optional(),
  /** Niçin bu konu önemli; gerçek hayattan eş değer. */
  nicin: z.string().optional(),
  /** Nasıl çalışır — adım adım, somut, beklenen sonuç. */
  nasil: z.string().optional(),
  /** Hangi bağlamda/yerde karşımıza çıkar — örnekli. */
  nerede: z.string().optional(),
  /** Hangi durumda devreye girer — somut tetik. */
  ne_zaman: z.string().optional(),
  /** Hangi roller etkilenir — kullanıcı, geliştirici, operasyon. */
  kim: z.string().optional(),
  /** Frontend tarafı — kullanıcıya görünen yüz; gerçek örnek. */
  frontend: z
    .object({
      yer: z.string(),
      gereklilik: z.string(),
      ornek: z.string(),
    })
    .optional(),
  /** Backend tarafı — perde arkası; gerçek örnek. */
  backend: z
    .object({
      yer: z.string(),
      gereklilik: z.string(),
      ornek: z.string(),
    })
    .optional(),
  /** 60+ analoji: gündelik hayattan benzer durum. */
  analoji: z.string().optional(),
});

export const EnrichmentSchema = z.object({
  info: z.string().optional(),
  detail: z.string().optional(),
  terms: z.array(TermSchema).optional(),
  stories: z.array(UserStorySchema).optional(),
  state: StateSchema.optional(),
  granularity: GranularitySchema.optional(),
  sp: z.number().int().nonnegative().optional(),
  refs: z.array(z.string()).optional(),
  /** 60+ pedagojik içerik — auto-template yerine manuel yazılmış. */
  lesson: LessonSchema.optional(),
});

export type Enrichment = z.infer<typeof EnrichmentSchema>;
export type Term = z.infer<typeof TermSchema>;
export type UserStory = z.infer<typeof UserStorySchema>;
export type Lesson = z.infer<typeof LessonSchema>;

// ============================================================================
// Block tipleri
// ============================================================================

export const ParagraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  text: z.string(),
  enrich: EnrichmentSchema.optional(),
});

export const HeadingBlockSchema = z.object({
  type: z.literal('heading'),
  level: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  text: z.string(),
  id: z.string().optional(),
  icon: z.string().optional(),
  enrich: EnrichmentSchema.optional(),
});

export const CodeBlockSchema = z.object({
  type: z.literal('code'),
  lang: z.string().default('plain'),
  content: z.string(),
  title: z.string().optional(),
  enrich: EnrichmentSchema.optional(),
});

export const CalloutBlockSchema = z.object({
  type: z.literal('callout'),
  variant: z.enum(['tip', 'warning', 'critical', 'tr', 'info']),
  label: z.string().optional(),
  icon: z.string().optional(),
  body: z.string(),
  enrich: EnrichmentSchema.optional(),
});

export const ListBlockSchema = z.object({
  type: z.literal('list'),
  ordered: z.boolean().optional(),
  items: z.array(
    z.union([
      z.string(),
      z.object({
        text: z.string(),
        enrich: EnrichmentSchema.optional(),
      }),
    ]),
  ),
});

export const FeatureListBlockSchema = z.object({
  type: z.literal('feature-list'),
  title: z.string().optional(),
  filterable: z.boolean().optional(),
  items: z.array(
    z.object({
      name: z.string(),
      desc: z.string().optional(),
      critical: z.boolean().optional(),
      icon: z.string().optional(),
      enrich: EnrichmentSchema.optional(),
    }),
  ),
});

export const TableCellSchema = z.union([
  z.string(),
  z.object({
    text: z.string(),
    state: StateSchema.optional(),
    enrich: EnrichmentSchema.optional(),
  }),
]);

export const TableBlockSchema = z.object({
  type: z.literal('table'),
  headers: z.array(z.string()),
  rows: z.array(z.array(TableCellSchema)),
  compact: z.boolean().optional(),
  caption: z.string().optional(),
  filterable: z.boolean().optional(),
  stateColumn: z.number().int().nonnegative().optional(),
});

export const GridBlockSchema = z.object({
  type: z.literal('grid'),
  columns: z.union([z.literal(2), z.literal(3)]),
  items: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      icon: z.string().optional(),
      tone: z.enum(['good', 'bad', 'neutral']).optional(),
      enrich: EnrichmentSchema.optional(),
    }),
  ),
});

export const LayerCardsBlockSchema = z.object({
  type: z.literal('layer-cards'),
  cards: z.array(
    z.object({
      tag: z.string(),
      name: z.string(),
      desc: z.string(),
      tone: z.enum(['kernel', 'scale', 'l1', 'l2', 'l3', 'atomic']),
      enrich: EnrichmentSchema.optional(),
    }),
  ),
});

export const ExamplesBlockSchema = z.object({
  type: z.literal('examples'),
  title: z.string().optional(),
  items: z.array(
    z.object({
      label: z.string().optional(),
      text: z.string(),
      enrich: EnrichmentSchema.optional(),
    }),
  ),
});

export const KvRowBlockSchema = z.object({
  type: z.literal('kv-row'),
  pairs: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      enrich: EnrichmentSchema.optional(),
    }),
  ),
});

type TreeNode = {
  name: string;
  comment?: string;
  children?: TreeNode[];
  enrich?: Enrichment;
};
const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    comment: z.string().optional(),
    children: z.array(TreeNodeSchema).optional(),
    enrich: EnrichmentSchema.optional(),
  }),
);

export const TreeBlockSchema = z.object({
  type: z.literal('tree'),
  title: z.string().optional(),
  root: TreeNodeSchema,
});

export const RefGridBlockSchema = z.object({
  type: z.literal('ref-grid'),
  title: z.string().optional(),
  refs: z.array(z.string()),
});

export const DividerBlockSchema = z.object({
  type: z.literal('divider'),
});

export const GranularityLegendBlockSchema = z.object({
  type: z.literal('granularity-legend'),
  title: z.string().optional(),
});

export const UserStoriesBlockSchema = z.object({
  type: z.literal('user-stories'),
  title: z.string().optional(),
  stories: z.array(UserStorySchema),
});

export const TermsBlockSchema = z.object({
  type: z.literal('terms'),
  title: z.string().optional(),
  terms: z.array(TermSchema),
});

// Checklist — sınav değil, kontrol listesi. localStorage'da persist.
export const ChecklistBlockSchema = z.object({
  type: z.literal('checklist'),
  title: z.string().optional(),
  storageKey: z.string().optional(),  // verilirse persist edilir
  items: z.array(
    z.object({
      label: z.string(),
      hint: z.string().optional(),
      optional: z.boolean().optional(),
      enrich: EnrichmentSchema.optional(),
    }),
  ),
});

// Steps — sıralı adım anlatımı (1, 2, 3 …)
export const StepsBlockSchema = z.object({
  type: z.literal('steps'),
  title: z.string().optional(),
  items: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      icon: z.string().optional(),
      enrich: EnrichmentSchema.optional(),
    }),
  ),
});

// Lesson — eğitim ünitesi başlığı + meta (süre, seviye, ön-koşul)
export const LessonHeaderBlockSchema = z.object({
  type: z.literal('lesson-header'),
  unit: z.string(),                            // "Ünite 02"
  title: z.string(),                           // "Veri ve Tipler"
  level: z.enum(['baslangic', 'orta', 'ileri']).optional(),
  duration_min: z.number().int().positive().optional(),
  prereq: z.array(z.string()).optional(),      // önceki ünite id'leri
  goals: z.array(z.string()).optional(),       // bu ünitede öğrenecekleri
});

// ────────────────────────────────────────────────────────────────────────────
// Media + Diagram block tipleri — image, video, mermaid
// ────────────────────────────────────────────────────────────────────────────
export const MermaidBlockSchema = z.object({
  type: z.literal('mermaid'),
  title: z.string().optional(),
  content: z.string(),
  enrich: EnrichmentSchema.optional(),
});

export const ImageBlockSchema = z.object({
  type: z.literal('image'),
  src: z.string(),
  alt: z.string(), // 60+ + a11y: zorunlu
  caption: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  enrich: EnrichmentSchema.optional(),
});

export const VideoBlockSchema = z.object({
  type: z.literal('video'),
  src: z.string(),
  poster: z.string().optional(),
  caption: z.string().optional(),
  captionsSrc: z.string().optional(),
  captionsLang: z.string().optional(),
  enrich: EnrichmentSchema.optional(),
});

export const BlockSchema = z.discriminatedUnion('type', [
  ParagraphBlockSchema,
  HeadingBlockSchema,
  CodeBlockSchema,
  CalloutBlockSchema,
  ListBlockSchema,
  FeatureListBlockSchema,
  TableBlockSchema,
  GridBlockSchema,
  LayerCardsBlockSchema,
  ExamplesBlockSchema,
  KvRowBlockSchema,
  TreeBlockSchema,
  RefGridBlockSchema,
  DividerBlockSchema,
  GranularityLegendBlockSchema,
  UserStoriesBlockSchema,
  TermsBlockSchema,
  ChecklistBlockSchema,
  StepsBlockSchema,
  LessonHeaderBlockSchema,
  MermaidBlockSchema,
  ImageBlockSchema,
  VideoBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;
export type BlockType = Block['type'];

// ============================================================================
// Cluster
// ============================================================================

export const ClusterLayerSchema = z.enum([
  'kernel',
  'scale',
  'l1',
  'l2',
  'l3',
  'atomic',
  'meta',
]);
export type ClusterLayer = z.infer<typeof ClusterLayerSchema>;

export const DifficultySchema = z.enum(['baslangic', 'orta', 'ileri']);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  baslangic: 'Başlangıç',
  orta: 'Orta',
  ileri: 'İleri',
};
export const DIFFICULTY_ICON: Record<Difficulty, string> = {
  baslangic: 'ph-seedling',
  orta: 'ph-tree',
  ileri: 'ph-mountains',
};

export const ClusterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be kebab-case'),
  title: z.string(),
  subtitle: z.string().optional(),
  cluster: z.string(),
  layer: ClusterLayerSchema.optional(),
  order: z.number().int().nonnegative(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  tags: z.array(z.string()).optional(),
  granularity: GranularitySchema.optional(),
  state: StateSchema.optional(),
  /** Zorluk seviyesi — beginner/intermediate/advanced (60+ için Türkçe etiket). */
  difficulty: DifficultySchema.optional(),
  /** Son güncelleme tarihi (ISO 8601). Yazar manuel girer; CI git log'dan da basabilir. */
  lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  /** Tahmini okuma süresi dakika; verilmezse render anında kelime sayısından hesaplanır. */
  estReadMin: z.number().int().positive().optional(),
  enrich: EnrichmentSchema.optional(),
  blocks: z.array(BlockSchema),
  related: z.array(z.string()).optional(),
});

export type Cluster = z.infer<typeof ClusterSchema>;

// ============================================================================
// Manifest
// ============================================================================

export const ManifestEntrySchema = z.object({
  file: z.string(),
  id: z.string(),
  title: z.string(),
  cluster: z.string(),
  order: z.number().int().nonnegative(),
  layer: ClusterLayerSchema.optional(),
  granularity: GranularitySchema.optional(),
});

export const ManifestGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number().int().nonnegative(),
  icon: z.string().optional(),
  description: z.string().optional(),
});

export const ManifestSchema = z.object({
  version: z.string(),
  name: z.string(),
  generated_at: z.string().optional(),
  groups: z.array(ManifestGroupSchema),
  clusters: z.array(ManifestEntrySchema),
});

export type Manifest = z.infer<typeof ManifestSchema>;
export type ManifestEntry = z.infer<typeof ManifestEntrySchema>;
export type ManifestGroup = z.infer<typeof ManifestGroupSchema>;
