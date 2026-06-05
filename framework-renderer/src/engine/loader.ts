import {
  ClusterSchema,
  ManifestSchema,
  type Cluster,
  type Manifest,
  type ManifestEntry,
} from '@/types/content';

/**
 * ContentLoader — JSON cluster dosyalarını fetch eder, Zod ile valide eder,
 * cache'ler. Eksik veya bozuk JSON kullanıcıya hata olarak gösterilir.
 */
export class ContentLoader {
  private clusterCache = new Map<string, Cluster>();
  private manifestCache: Manifest | null = null;
  private fetchErrors: Array<{ file: string; error: string }> = [];

  constructor(private contentBase: string = '/') {}

  /** Manifest'i yükler (cached). */
  async loadManifest(): Promise<Manifest> {
    if (this.manifestCache) return this.manifestCache;

    const url = `${this.contentBase}manifest.json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Manifest fetch failed: ${res.status} ${url}`);
    }
    const json = await res.json();
    const parsed = ManifestSchema.safeParse(json);
    if (!parsed.success) {
      console.error('Manifest validation failed:', parsed.error.format());
      throw new Error('Manifest schema invalid; see console.');
    }
    this.manifestCache = parsed.data;
    return parsed.data;
  }

  /** Bir cluster dosyasını yükler. */
  async loadCluster(entry: ManifestEntry): Promise<Cluster | null> {
    const cached = this.clusterCache.get(entry.id);
    if (cached) return cached;

    const url = `${this.contentBase}${entry.file}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const parsed = ClusterSchema.safeParse(json);
      if (!parsed.success) {
        const msg = JSON.stringify(parsed.error.format(), null, 2);
        console.error(`Cluster validation failed: ${entry.file}\n${msg}`);
        this.fetchErrors.push({
          file: entry.file,
          error: `Schema invalid: ${parsed.error.issues[0]?.message ?? 'unknown'}`,
        });
        return null;
      }
      // ID tutarlılığı: dosyadaki id manifest entry ile eşleşmeli
      if (parsed.data.id !== entry.id) {
        console.warn(
          `Cluster id mismatch in ${entry.file}: manifest=${entry.id}, file=${parsed.data.id}`,
        );
      }
      this.clusterCache.set(parsed.data.id, parsed.data);
      return parsed.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to load ${entry.file}: ${msg}`);
      this.fetchErrors.push({ file: entry.file, error: msg });
      return null;
    }
  }

  /** Manifest'teki tüm cluster'ları yükler (paralel). */
  async loadAll(): Promise<Cluster[]> {
    const manifest = await this.loadManifest();
    const results = await Promise.all(
      manifest.clusters.map((entry) => this.loadCluster(entry)),
    );
    return results.filter((c): c is Cluster => c !== null);
  }

  /** Bir cluster'ı id ile getir (cache'lenmiş olmalı). */
  getCluster(id: string): Cluster | undefined {
    return this.clusterCache.get(id);
  }

  /** Tüm cache'lenmiş cluster'lar. */
  allClusters(): Cluster[] {
    return Array.from(this.clusterCache.values()).sort((a, b) => a.order - b.order);
  }

  /** Yükleme hataları. */
  errors(): ReadonlyArray<{ file: string; error: string }> {
    return this.fetchErrors;
  }
}
