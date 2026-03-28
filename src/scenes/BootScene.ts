import Phaser from 'phaser';
import { OceanBackground } from '../objects/OceanBackground';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

/**
 * BootScene – splash screen + asset bootstrap.
 *
 * Flow:
 *   1. preload()  – loads the DigitalDiamonds SVG logo
 *   2. create()   – generates shared textures (background, bubble),
 *                   then plays the splash animation
 *   3. After animation completes → starts MenuScene
 */
export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload(): void {
        this.load.svg('dd-logo', 'assets/DigitalDiamonds-Logo.svg', { width: 620, height: 280 });
    }

    create(): void {
        // Generate shared textures immediately so MenuScene has them ready
        OceanBackground.generate(this, 'background');
        this.generateBubbleTexture();

        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        // ── Background – deep dark blue-purple to complement the diamond gradient ──
        this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0c0c20);

        // ── Soft radial glow behind the diamond ──────────────────────────────────
        // Concentric circles from innermost (bright) to outermost (faint)
        const glowColors: [number, number][] = [
            [0x6d28d9, 0.18],
            [0x5b21b6, 0.13],
            [0x4c1d95, 0.09],
            [0x3b0e6e, 0.06],
            [0x1e0a40, 0.04],
        ];
        const glow = this.add.graphics().setAlpha(0);
        glowColors.forEach(([color, alpha], i) => {
            glow.fillStyle(color, alpha);
            glow.fillCircle(cx, cy, 220 - i * 30);
        });

        // ── Logo ─────────────────────────────────────────────────────────────────
        const logoScale = Math.min((GAME_WIDTH * 0.85) / 620, 1);
        const logo = this.add.image(cx, cy, 'dd-logo')
            // Visual content center in SVG space ≈ (332, 168) within a 620×280 viewBox.
            // Using setOrigin to map that point to (cx, cy) on screen instead of the
            // geometric center (310, 140), which would leave the content off-center.
            .setOrigin(332 / 620, 168 / 280)
            .setScale(logoScale * 0.8)
            .setAlpha(0);

        // ── Animation sequence ───────────────────────────────────────────────────
        // 1. Fade in + spring scale  (650 ms)
        this.tweens.add({
            targets: [glow, logo],
            alpha: 1,
            duration: 600,
            ease: 'Quad.easeOut',
        });

        this.tweens.add({
            targets: logo,
            scaleX: logoScale,
            scaleY: logoScale,
            duration: 700,
            ease: 'Back.easeOut',
            onComplete: () => {

                // 2. Subtle shimmer pulse on the logo (2 × 400 ms)
                this.tweens.add({
                    targets: logo,
                    alpha: 0.75,
                    duration: 380,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {

                        // 3. Hold, then fade everything out
                        this.time.delayedCall(600, () => {
                            this.tweens.add({
                                targets: [glow, logo],
                                alpha: 0,
                                duration: 480,
                                ease: 'Quad.easeIn',
                                onComplete: () => {
                                    this.scene.start('MenuScene');
                                },
                            });
                        });
                    },
                });
            },
        });
    }

    /**
     * Cartoon-style semi-transparent bubble.
     * Outline trick: black filled circle first, pale blue fill on top,
     * small white specular dot at top-left.
     */
    private generateBubbleTexture(): void {
        const r   = 8;
        const gfx = this.make.graphics({ x: 0, y: 0 });

        // Outline (pass 1)
        gfx.fillStyle(0x000000, 0.55);
        gfx.fillCircle(r + 2, r + 2, r + 2);

        // Fill (pass 2) – pale blue-white
        gfx.fillStyle(0xc8ecff, 0.72);
        gfx.fillCircle(r + 2, r + 2, r);

        // Specular highlight
        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillCircle(r - 1, r - 1, 3);

        gfx.generateTexture('bubble', (r + 2) * 2, (r + 2) * 2);
        gfx.destroy();
    }
}
