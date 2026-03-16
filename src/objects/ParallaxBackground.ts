import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

/** Tile width – double the canvas so repeats take longer to notice. */
const TILE_W = GAME_WIDTH * 2; // 960 px

/**
 * ParallaxBackground – three-layer scrolling pixel-art ocean backdrop.
 *
 * Each layer is baked once into a texture via Graphics + generateTexture,
 * then scrolled each frame via TileSprite.tilePositionX.
 *
 *  Layer 1 (depth −3, ~0.1× speed) – deep background + bioluminescent particles
 *  Layer 2 (depth −2, ~0.25× speed) – mid-distance coral silhouettes + scan lines
 *  Layer 3 (depth −1, ~0.5× speed) – foreground coral stumps + pixel seaweed
 */
export class ParallaxBackground {
    private readonly layer1: Phaser.GameObjects.TileSprite;
    private readonly layer2: Phaser.GameObjects.TileSprite;
    private readonly layer3: Phaser.GameObjects.TileSprite;

    constructor(scene: Phaser.Scene) {
        this.ensureTextures(scene);

        this.layer1 = scene.add
            .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'px-layer-1')
            .setOrigin(0, 0)
            .setDepth(-3);

        this.layer2 = scene.add
            .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'px-layer-2')
            .setOrigin(0, 0)
            .setDepth(-2);

        this.layer3 = scene.add
            .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'px-layer-3')
            .setOrigin(0, 0)
            .setDepth(-1);
    }

    /**
     * Advances each layer's horizontal tile position at its own parallax speed.
     * At 60 fps (delta ≈ 16.7 ms) this yields roughly 0.2 / 0.5 / 1.0 px per frame.
     * @param delta Frame delta in milliseconds supplied by Phaser's update callback.
     */
    public update(delta: number): void {
        this.layer1.tilePositionX += delta * 0.012;
        this.layer2.tilePositionX += delta * 0.030;
        this.layer3.tilePositionX += delta * 0.060;
    }

    // ── Texture generation ────────────────────────────────────────────────────

    /** Generate all three layer textures if they are not already cached. */
    private ensureTextures(scene: Phaser.Scene): void {
        if (!scene.textures.exists('px-layer-1')) this.genLayer1(scene);
        if (!scene.textures.exists('px-layer-2')) this.genLayer2(scene);
        if (!scene.textures.exists('px-layer-3')) this.genLayer3(scene);
    }

    /**
     * Layer 1 – deep mid-water.
     * Transparent base (OceanBackground teal shows through) with 40 seeded
     * bioluminescent 2×2 dots – slightly brighter so they read on the teal.
     */
    private genLayer1(scene: Phaser.Scene): void {
        const gfx = scene.make.graphics({ x: 0, y: 0 });

        // No solid fill – the static OceanBackground teal is the base colour

        // 40 bioluminescent particles – seeded LCG for reproducibility
        gfx.fillStyle(0xffffff, 0.18);
        let seed = 9437;
        for (let i = 0; i < 40; i++) {
            seed = ((seed * 1664525 + 1013904223) >>> 0);
            const px = seed % TILE_W;
            seed = ((seed * 1664525 + 1013904223) >>> 0);
            const py = seed % GAME_HEIGHT;
            gfx.fillRect(px, py, 2, 2);
        }

        gfx.generateTexture('px-layer-1', TILE_W, GAME_HEIGHT);
        gfx.destroy();
    }

    /**
     * Layer 2 – mid-distance.
     * Four rounded coral silhouettes (0x0d2a4a) at the bottom of the tile,
     * plus full-height horizontal scan lines at 3 % alpha for a CRT feel.
     */
    private genLayer2(scene: Phaser.Scene): void {
        const gfx = scene.make.graphics({ x: 0, y: 0 });

        // Rounded coral silhouettes – [x, y, w, h, radius]
        // Dark teal-navy so they read clearly against the bright OceanBackground teal base
        gfx.fillStyle(0x1a6070, 0.85);
        const corals: [number, number, number, number, number][] = [
            [60,  GAME_HEIGHT - 60, 100, 60, 15],
            [250, GAME_HEIGHT - 80, 120, 80, 20],
            [460, GAME_HEIGHT - 50,  80, 50, 12],
            [680, GAME_HEIGHT - 70, 110, 70, 18],
        ];
        for (const [x, y, w, h, r] of corals) {
            gfx.fillRoundedRect(x, y, w, h, r);
        }

        // CRT scan lines – 1 px high, every 12 px, near-black at 3 % alpha
        gfx.fillStyle(0x000000, 0.03);
        for (let y = 0; y < GAME_HEIGHT; y += 12) {
            gfx.fillRect(0, y, TILE_W, 1);
        }

        gfx.generateTexture('px-layer-2', TILE_W, GAME_HEIGHT);
        gfx.destroy();
    }

    /**
     * Layer 3 – foreground details.
     * Short rounded coral stumps (0x1a3a5a) near the bottom,
     * plus pixel seaweed (0x1e5a7a): zigzag stacks of 4×4 blocks.
     */
    private genLayer3(scene: Phaser.Scene): void {
        const gfx = scene.make.graphics({ x: 0, y: 0 });

        // Coral stumps – [x, width, height]
        gfx.fillStyle(0x1a5060, 1);
        const stumps: [number, number, number][] = [
            [40,  28, 35],
            [220, 24, 28],
            [400, 30, 40],
            [590, 22, 32],
            [780, 26, 36],
        ];
        for (const [x, w, h] of stumps) {
            gfx.fillRoundedRect(x, GAME_HEIGHT - h, w, h, 4);
        }

        // Seaweed plants – 8-segment zigzag stacks of 4×4 blocks
        gfx.fillStyle(0x267a60, 1);
        const seaweedRoots = [150, 460, 750];
        for (const sx of seaweedRoots) {
            for (let seg = 0; seg < 8; seg++) {
                const offsetX = (seg % 2 === 0) ? 0 : 4;
                gfx.fillRect(sx + offsetX, GAME_HEIGHT - 4 - (seg + 1) * 4, 4, 4);
            }
        }

        gfx.generateTexture('px-layer-3', TILE_W, GAME_HEIGHT);
        gfx.destroy();
    }
}
