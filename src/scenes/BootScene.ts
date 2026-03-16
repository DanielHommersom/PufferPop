import Phaser from 'phaser';
import { OceanBackground } from '../objects/OceanBackground';

/**
 * BootScene – first scene that runs on startup.
 *
 * Generates all shared textures (background, bubble) then launches MenuScene.
 * Fish and coral are drawn procedurally in GameScene via PufferFish / Obstacle,
 * so no placeholder textures are needed for those.
 */
export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    /** Preload real assets here when available (sounds, spritesheets, etc.). */
    preload(): void {}

    /** Generate all shared textures, then launch MenuScene. */
    create(): void {
        // Cartoon ocean background used by MenuScene, GameOverScene, and GameScene
        OceanBackground.generate(this, 'background');

        // Bubble used in the death particle burst
        this.generateBubbleTexture();

        this.scene.start('MenuScene');
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
