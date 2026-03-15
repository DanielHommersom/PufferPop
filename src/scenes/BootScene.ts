import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FISH_BASE_RADIUS } from '../constants';

/**
 * BootScene – first scene that runs on startup.
 * Generates all placeholder textures via Graphics and then starts MenuScene.
 */
export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    /** Preload any real assets here in the future; placeholders are generated in create(). */
    preload(): void {
        // Real asset loads go here when available, e.g.:
        // this.load.image('fish', 'assets/images/fish.png');
    }

    /** Generate all placeholder textures via Graphics, then launch MenuScene. */
    create(): void {
        this.generateFishTexture();
        this.generateCoralTextures();
        this.generateBackgroundTexture();
        this.generateBubbleTexture();

        this.scene.start('MenuScene');
    }

    /** Generate a simple orange circle as the fish placeholder. */
    private generateFishTexture(): void {
        const r = FISH_BASE_RADIUS + 8;
        const gfx = this.make.graphics({ x: 0, y: 0 });
        gfx.fillStyle(0xf4a832, 1);
        gfx.fillCircle(r + 4, r, r);
        // tail triangle
        gfx.fillStyle(0xd48020, 1);
        gfx.fillTriangle(4, r - 8, 4, r + 8, 0, r);
        gfx.generateTexture('fish', (r + 4) * 2, r * 2);
        gfx.destroy();
    }

    /** Generate top and bottom coral column placeholder textures. */
    private generateCoralTextures(): void {
        const w = 64;
        const h = 200;

        const top = this.make.graphics({ x: 0, y: 0 });
        top.fillStyle(0x1e7a3c, 1);
        top.fillRect(0, 0, w, h);
        top.fillStyle(0x28a050, 1);
        top.fillRect(4, 0, 8, h);
        top.generateTexture('coral-top', w, h);
        top.destroy();

        const bot = this.make.graphics({ x: 0, y: 0 });
        bot.fillStyle(0x1e7a3c, 1);
        bot.fillRect(0, 0, w, h);
        bot.fillStyle(0x28a050, 1);
        bot.fillRect(4, 0, 8, h);
        bot.generateTexture('coral-bottom', w, h);
        bot.destroy();
    }

    /** Generate a simple deep-blue gradient background placeholder. */
    private generateBackgroundTexture(): void {
        const gfx = this.make.graphics({ x: 0, y: 0 });
        gfx.fillGradientStyle(0x0a1a3a, 0x0a1a3a, 0x0a3a6a, 0x0a3a6a, 1);
        gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        gfx.generateTexture('background', GAME_WIDTH, GAME_HEIGHT);
        gfx.destroy();
    }

    /** Generate a small semi-transparent circle as a bubble placeholder. */
    private generateBubbleTexture(): void {
        const gfx = this.make.graphics({ x: 0, y: 0 });
        gfx.fillStyle(0xaaddff, 0.5);
        gfx.fillCircle(8, 8, 8);
        gfx.lineStyle(1, 0xffffff, 0.6);
        gfx.strokeCircle(8, 8, 8);
        gfx.generateTexture('bubble', 16, 16);
        gfx.destroy();
    }
}
