import Phaser from 'phaser';
import { Preferences } from '@capacitor/preferences';
import {
    FISH_BASE_RADIUS,
    FISH_MAX_INFLATE,
    INFLATE_SPEED,
    DEFLATE_SPEED,
    GRAVITY,
    MAX_VEL_UP,
    MAX_VEL_DOWN,
} from '../constants';
import { SKINS, SkinRenderer } from './SkinRenderer';
import type { SkinDefinition } from './SkinRenderer';

/**
 * PufferFish – the player-controlled character.
 * Extends Graphics; all visual drawing is delegated to SkinRenderer.draw()
 * so the active skin is reflected both in-game and in the skin selector preview.
 */
export class PufferFish extends Phaser.GameObjects.Graphics {
    /** Current vertical velocity in pixels per frame. */
    public velY: number = 0;

    /** Current inflate level (0 – FISH_MAX_INFLATE). */
    public inflateLevel: number = 0;

    /** Whether the player is currently holding the inflate input. */
    public isInflating: boolean = false;

    // ── Tail wag state ────────────────────────────────────────────────────────
    private wagOffset: number = 0;
    private wagDirection: number = 1;

    /** Currently active skin — updated by loadSkin(). */
    private skin: SkinDefinition = SKINS[0];

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, { x, y });
        scene.add.existing(this);
    }

    /**
     * Loads the player's selected skin from persistent storage and applies it.
     * Falls back to the default skin if the preference is unavailable.
     */
    public async loadSkin(): Promise<void> {
        try {
            const { value } = await Preferences.get({ key: 'selectedSkin' });
            this.skin = SKINS.find(s => s.id === value) ?? SKINS[0];
        } catch {
            this.skin = SKINS[0];
        }
    }

    /** Call when the player presses the inflate input. */
    public inflate(): void {
        this.isInflating = true;
    }

    /** Call when the player releases the inflate input. */
    public deflate(): void {
        this.isInflating = false;
    }

    /**
     * Main per-frame update. All physics and timers are scaled by delta so
     * behaviour is identical regardless of frame rate.
     * @param delta Frame time in milliseconds from Phaser's update callback.
     */
    public update(delta: number): void {
        const s = delta / 16.667; // 1.0 at 60 fps, 2.0 at 30 fps, 0.5 at 120 fps

        // ── Physics ───────────────────────────────────────────────────────────
        if (this.isInflating) {
            this.inflateLevel = Math.min(FISH_MAX_INFLATE, this.inflateLevel + INFLATE_SPEED * s);
            this.velY -= INFLATE_SPEED * s;
        } else {
            this.inflateLevel = Math.max(0, this.inflateLevel - DEFLATE_SPEED * s);
            this.velY += GRAVITY * s;
        }

        this.velY = Phaser.Math.Clamp(this.velY, MAX_VEL_UP, MAX_VEL_DOWN);
        this.y += this.velY * s;

        // ── Tail wag ──────────────────────────────────────────────────────────
        this.wagOffset += 0.15 * s * this.wagDirection;
        if (Math.abs(this.wagOffset) > 2) this.wagDirection *= -1;

        this.draw();
    }

    /**
     * Returns the current collision radius of the fish.
     * Grows slightly as the fish inflates.
     */
    public getRadius(): number {
        return FISH_BASE_RADIUS + this.inflateLevel * 0.85;
    }

    // ── Draw ──────────────────────────────────────────────────────────────────

    /** Redraws the fish using the active skin via SkinRenderer. */
    private draw(): void {
        SkinRenderer.draw(this, this.skin, this.getRadius(), this.inflateLevel);
    }

}
