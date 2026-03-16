import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

/**
 * OceanBackground – cartoon Flappy-Bird-underwater style static background.
 *
 * Visual recipe (outline trick throughout):
 *  1. Bright teal fill (0x4ec0ca) base
 *  2. Horizontal light bands for depth shimmer
 *  3. Three bubble clusters – each bubble: black outline circle, teal-white fill, white highlight
 *  4. Green ground strip at bottom – black outline, flat green fill, lighter highlight
 *  5. Five coral stumps rising from the ground – black outline, orange-red fill, left highlight
 *
 * The "outline trick": every shape is drawn TWICE.
 *   Pass 1 – slightly larger shape in 0x000000 (the outline)
 *   Pass 2 – normal-sized shape in the fill colour (on top)
 *
 * Usage:
 *   OceanBackground.generate(scene);               // generates texture 'background'
 *   OceanBackground.generate(scene, 'bg-menu');    // custom key
 */
export class OceanBackground {
    /**
     * Generates and caches the ocean background as a Phaser texture.
     * No-ops if the texture already exists (safe to call on scene restart).
     *
     * @param scene      The Phaser.Scene to use for Graphics creation.
     * @param textureKey Texture cache key (default: 'background').
     */
    static generate(scene: Phaser.Scene, textureKey: string = 'background'): void {
        if (scene.textures.exists(textureKey)) return;

        const gfx = scene.make.graphics({ x: 0, y: 0 });
        const W   = GAME_WIDTH;
        const H   = GAME_HEIGHT;

        // ── 1. Base teal fill ─────────────────────────────────────────────────
        gfx.fillStyle(0x4ec0ca, 1);
        gfx.fillRect(0, 0, W, H);

        // ── 2. Horizontal light bands (depth shimmer) ─────────────────────────
        gfx.fillStyle(0x6dd6e2, 0.22);
        for (let y = 40; y < H - 80; y += 90) {
            gfx.fillRect(0, y, W, 28);
        }

        // ── 3. Bubble clusters ────────────────────────────────────────────────
        // Three seeded clusters scattered through the water column.
        const clusters: { cx: number; cy: number; count: number }[] = [
            { cx: 72,       cy: Math.round(H * 0.55), count: 6 },
            { cx: Math.round(W * 0.55), cy: Math.round(H * 0.32), count: 5 },
            { cx: Math.round(W * 0.83), cy: Math.round(H * 0.62), count: 7 },
        ];

        for (const { cx, cy, count } of clusters) {
            let seed = (cx * 7 + cy * 3) | 0;
            for (let i = 0; i < count; i++) {
                seed = ((seed * 1664525 + 1013904223) >>> 0);
                const bx = cx + (seed % 64) - 32;
                seed = ((seed * 1664525 + 1013904223) >>> 0);
                const by = cy + (seed % 90) - 45;
                seed = ((seed * 1664525 + 1013904223) >>> 0);
                const br = 6 + (seed % 9); // radius 6–14 px

                // Outline (pass 1) – solid black circle, 3 px larger radius
                gfx.fillStyle(0x000000, 1);
                gfx.fillCircle(bx, by, br + 3);

                // Fill (pass 2) – pale blue-white bubble
                gfx.fillStyle(0xd8f4ff, 0.72);
                gfx.fillCircle(bx, by, br);

                // Specular highlight – small white dot at top-left
                const hlr = Math.max(2, Math.round(br * 0.28));
                gfx.fillStyle(0xffffff, 0.95);
                gfx.fillCircle(bx - Math.round(br * 0.3), by - Math.round(br * 0.32), hlr);
            }
        }

        // ── 4. Ground strip ───────────────────────────────────────────────────
        const groundY = H - 58;

        // Outline (pass 1) – 4 px black border above and around
        gfx.fillStyle(0x000000, 1);
        gfx.fillRect(0, groundY - 4, W, H - groundY + 4);

        // Fill (pass 2) – flat grass green
        gfx.fillStyle(0x5bc85b, 1);
        gfx.fillRect(0, groundY, W, H - groundY);

        // Highlight – lighter green top strip (8 px)
        gfx.fillStyle(0x7ee878, 1);
        gfx.fillRect(0, groundY, W, 8);

        // ── 5. Coral stumps ───────────────────────────────────────────────────
        const stumps: { x: number; w: number; h: number }[] = [
            { x: 44,  w: 34, h: 46 },
            { x: 148, w: 28, h: 36 },
            { x: 274, w: 40, h: 54 },
            { x: 376, w: 30, h: 42 },
            { x: 436, w: 26, h: 32 },
        ];

        for (const { x, w, h } of stumps) {
            const sy = groundY - h;

            // Outline (pass 1) – 4 px black rounded rect
            gfx.fillStyle(0x000000, 1);
            gfx.fillRoundedRect(x - 4, sy - 4, w + 8, h + 8, 7);

            // Fill (pass 2) – warm coral-red
            gfx.fillStyle(0xe04828, 1);
            gfx.fillRoundedRect(x, sy, w, h, 4);

            // Highlight – lighter left strip (4 px wide, inset 4 px)
            gfx.fillStyle(0xff6e50, 1);
            gfx.fillRoundedRect(x + 5, sy + 6, 5, h - 12, 3);
        }

        gfx.generateTexture(textureKey, W, H);
        gfx.destroy();
    }
}
