import Phaser from 'phaser';

/** All colour and unlock data for a single skin. */
export interface SkinDefinition {
    id: string;
    name: string;
    unlockScore: number;
    bodyColor: number;
    bellyColor: number;
    spineColor: number;
    eyeColor: number;
    tailColor: number;
    outlineColor: number;
}

/** Master list of all skins — single source of truth for colours and unlock thresholds. */
export const SKINS: SkinDefinition[] = [
    {
        id: 'default',   name: 'PUFFERFISH', unlockScore: 0,
        bodyColor: 0xf4a832, bellyColor: 0xf07820, spineColor: 0xfff9e6,
        eyeColor:  0x4a90d9, tailColor:  0xf4921a, outlineColor: 0x000000,
    },
    {
        id: 'ghost',     name: 'GHOST',      unlockScore: 10,
        bodyColor: 0xdce8f0, bellyColor: 0xb8d0e0, spineColor: 0xffffff,
        eyeColor:  0xff4444, tailColor:  0xc8dce8, outlineColor: 0x6688aa,
    },
    {
        id: 'lava',      name: 'LAVA',       unlockScore: 20,
        bodyColor: 0xe84020, bellyColor: 0xc02010, spineColor: 0xffaa00,
        eyeColor:  0xffff00, tailColor:  0xc03010, outlineColor: 0x000000,
    },
    {
        id: 'ocean',     name: 'DEEP SEA',   unlockScore: 35,
        bodyColor: 0x1a6aaa, bellyColor: 0x0d4a7a, spineColor: 0x88ddff,
        eyeColor:  0x00ffaa, tailColor:  0x0d4a7a, outlineColor: 0x000000,
    },
    {
        id: 'gold',      name: 'GOLDEN',     unlockScore: 50,
        bodyColor: 0xf7c234, bellyColor: 0xe0a020, spineColor: 0xfffacc,
        eyeColor:  0xff6600, tailColor:  0xe0a020, outlineColor: 0x8b6000,
    },
    {
        id: 'shadow',    name: 'SHADOW',     unlockScore: 75,
        bodyColor: 0x1a1a2e, bellyColor: 0x0d0d1a, spineColor: 0x9b59b6,
        eyeColor:  0x9b59b6, tailColor:  0x0d0d1a, outlineColor: 0x9b59b6,
    },
];

/**
 * Stateless fish renderer — single source of truth for all pufferfish visuals.
 * Both the in-game PufferFish object and the skin-selector preview use this class
 * so the player always sees exactly what they will play with.
 */
export class SkinRenderer {
    /**
     * Clears and redraws a pufferfish graphic using the supplied skin and state.
     *
     * Painter's order: tail → body outline → body fill → belly → highlight →
     *   spines (if inflated) → eye.
     *
     * @param gfx          Target Graphics object — its origin is the fish centre.
     * @param skin         Skin definition supplying all colour values.
     * @param radius       Current body radius in pixels.
     * @param inflateLevel Current inflate level (0–14); drives spine count and size.
     */
    static draw(
        gfx: Phaser.GameObjects.Graphics,
        skin: SkinDefinition,
        radius: number,
        inflateLevel: number = 0,
    ): void {
        gfx.clear();

        const r  = radius;
        const ol = skin.outlineColor;

        // ── Tail ─────────────────────────────────────────────────────────────
        gfx.fillStyle(ol, 1);
        gfx.fillTriangle(-r * 1.1, -r * 0.55, -r * 1.1, r * 0.55, -r * 1.7, 0);
        gfx.fillStyle(skin.tailColor, 1);
        gfx.fillTriangle(-r * 1.0, -r * 0.48, -r * 1.0, r * 0.48, -r * 1.6, 0);

        // ── Body ─────────────────────────────────────────────────────────────
        gfx.fillStyle(ol, 1);
        gfx.fillEllipse(0, 0, r * 2.3 + 6, r * 2.0 + 6);
        gfx.fillStyle(skin.bodyColor, 1);
        gfx.fillEllipse(0, 0, r * 2.3, r * 2.0);

        // Belly shading
        gfx.fillStyle(skin.bellyColor, 0.35);
        gfx.fillEllipse(r * 0.1, r * 0.3, r * 1.4, r * 0.85);

        // Top-left specular highlight
        gfx.fillStyle(0xffffff, 0.45);
        gfx.fillEllipse(-r * 0.2, -r * 0.35, r * 0.75, r * 0.42);

        // ── Spines ───────────────────────────────────────────────────────────
        if (inflateLevel > 3) {
            const spineCount = Math.min(10, Math.floor(inflateLevel * 1.1));
            const angleStep  = (Math.PI * 2) / spineCount;
            for (let i = 0; i < spineCount; i++) {
                const angle  = i * angleStep;
                const sx     = Math.cos(angle) * r * 1.08;
                const sy     = Math.sin(angle) * r * 0.92;
                const spineR = Phaser.Math.Clamp(inflateLevel * 0.22, 1.2, 3.5);
                gfx.fillStyle(ol, 1);
                gfx.fillCircle(sx, sy, spineR + 2);
                gfx.fillStyle(skin.spineColor, 1);
                gfx.fillCircle(sx, sy, spineR);
            }
        }

        // ── Eye ──────────────────────────────────────────────────────────────
        gfx.fillStyle(ol, 1);
        gfx.fillCircle(r * 0.55, -r * 0.22, r * 0.32 + 3);
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(r * 0.55, -r * 0.22, r * 0.30);
        gfx.fillStyle(skin.eyeColor, 1);
        gfx.fillCircle(r * 0.58, -r * 0.20, r * 0.18);
        gfx.fillStyle(ol, 1);
        gfx.fillCircle(r * 0.61, -r * 0.18, r * 0.10);
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(r * 0.52, -r * 0.27, r * 0.07);
    }
}
