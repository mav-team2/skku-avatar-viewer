import { Assets, Texture, Sprite } from 'pixi.js';

export type SpriteAction = 'walk' | 'stand' | 'run';

export interface SpriteSet {
  walk?: Texture;
  stand?: Texture;
  run?: Texture;
}

export class SpriteManager {
  private static instance: SpriteManager;
  private spriteCache: Map<string, SpriteSet> = new Map();
  private loadingPromises: Map<string, Promise<SpriteSet>> = new Map();

  private constructor() {}

  static getInstance(): SpriteManager {
    if (!SpriteManager.instance) {
      SpriteManager.instance = new SpriteManager();
    }
    return SpriteManager.instance;
  }

  /**
   * Build sprite URL based on CloudFront domain, avatar ID, and action
   */
  buildSpriteUrl(domain: string, avatarId: string, action: SpriteAction): string {
    return `https://www.${domain}/${avatarId}/${action}`;
  }

  /**
   * Parse sprite base URL to extract domain and avatar ID
   */
  parseSpriteBaseUrl(baseUrl: string): { domain: string; avatarId: string } | null {
    try {
      const urlMatch = baseUrl.match(/https?:\/\/www\.([^\/]+)\/([^\/]+)/);
      if (urlMatch) {
        return {
          domain: urlMatch[1],
          avatarId: urlMatch[2],
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to parse sprite base URL:', error);
      return null;
    }
  }

  /**
   * Load sprite set for an avatar (walk, stand, run)
   */
  async loadSpriteSet(baseUrl: string): Promise<SpriteSet> {
    // Check cache first
    if (this.spriteCache.has(baseUrl)) {
      return this.spriteCache.get(baseUrl)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(baseUrl)) {
      return this.loadingPromises.get(baseUrl)!;
    }

    // Parse URL to get domain and avatar ID
    const parsed = this.parseSpriteBaseUrl(baseUrl);
    if (!parsed) {
      console.warn(`Invalid sprite base URL: ${baseUrl}`);
      return {};
    }

    const { domain, avatarId } = parsed;

    // Create loading promise
    const loadingPromise = this.loadSpritesFromServer(domain, avatarId);
    this.loadingPromises.set(baseUrl, loadingPromise);

    try {
      const spriteSet = await loadingPromise;
      this.spriteCache.set(baseUrl, spriteSet);
      return spriteSet;
    } finally {
      this.loadingPromises.delete(baseUrl);
    }
  }

  /**
   * Load individual sprite action textures from server
   */
  private async loadSpritesFromServer(domain: string, avatarId: string): Promise<SpriteSet> {
    const actions: SpriteAction[] = ['walk', 'stand', 'run'];
    const spriteSet: SpriteSet = {};

    const loadPromises = actions.map(async (action) => {
      try {
        const url = this.buildSpriteUrl(domain, avatarId, action);
        const texture = await Assets.load(url);
        spriteSet[action] = texture;
        console.log(`✅ Loaded sprite: ${avatarId}/${action}`);
      } catch (error) {
        console.warn(`⚠️ Failed to load sprite: ${avatarId}/${action}`, error);
        // Continue loading other sprites even if one fails
      }
    });

    await Promise.all(loadPromises);
    return spriteSet;
  }

  /**
   * Create a sprite from a loaded sprite set
   */
  createSprite(spriteSet: SpriteSet, defaultAction: SpriteAction = 'stand'): Sprite {
    // Try to use the default action texture
    let texture = spriteSet[defaultAction];

    // Fallback to any available texture
    if (!texture) {
      texture = spriteSet.stand || spriteSet.walk || spriteSet.run;
    }

    // Final fallback to white texture
    if (!texture) {
      texture = Texture.WHITE;
    }

    return new Sprite(texture);
  }

  /**
   * Get texture for specific action from sprite set
   */
  getActionTexture(spriteSet: SpriteSet, action: SpriteAction): Texture | undefined {
    return spriteSet[action];
  }

  /**
   * Check if sprite set has a specific action
   */
  hasAction(spriteSet: SpriteSet, action: SpriteAction): boolean {
    return !!spriteSet[action];
  }

  /**
   * Clear cache for a specific base URL
   */
  clearCache(baseUrl: string): void {
    this.spriteCache.delete(baseUrl);
  }

  /**
   * Clear all cached sprites
   */
  clearAllCache(): void {
    this.spriteCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cached: number; loading: number } {
    return {
      cached: this.spriteCache.size,
      loading: this.loadingPromises.size,
    };
  }
}
