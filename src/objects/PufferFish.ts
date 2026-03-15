import Phaser from 'phaser';
import {
    FISH_BASE_RADIUS,
    FISH_MAX_INFLATE,
    INFLATE_SPEED,
    DEFLATE_SPEED,
    GRAVITY,
    MAX_VEL_UP,
    MAX_VEL_DOWN,
    INFLATE_COLORS,
    INFLATE_THRESHOLD_WARNING,
    INFLATE_THRESHOLD_DANGER,
} from '../constants';

/**
 * PufferFish – the player-controlled character.
 * Extends Graphics so it draws itself every frame.
 */
export class PufferFish extends Phaser.GameObjects.Graphics {
    /** Current vertical velocity in pixels per frame. */
    public velY: number = 0;

    /** Current inflate level (0 – FISH_MAX_INFLATE). */
    public inflateLevel: number = 0;

    /** Whether the player is currently holding the inflate input. */
    public isInflating: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, { x, y });
        scene.add.existing(this);
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
     * Main per-frame update.
     * Updates physics, clamps values, repositions, then redraws.
     */
    public update(): void {
        if (this.isInflating) {
            this.inflateLevel = Math.min(FISH_MAX_INFLATE, this.inflateLevel + INFLATE_SPEED);
            this.velY -= INFLATE_SPEED;
        } else {
            this.inflateLevel = Math.max(0, this.inflateLevel - DEFLATE_SPEED);
            this.velY += GRAVITY;
        }

        this.velY = Phaser.Math.Clamp(this.velY, MAX_VEL_UP, MAX_VEL_DOWN);
        this.y += this.velY;

        this.draw();
    }

    /**
     * Returns the current collision radius of the fish.
     * Grows slightly as the fish inflates.
     */
    public getRadius(): number {
        return FISH_BASE_RADIUS + this.inflateLevel * 0.85;
    }

    /**
     * Draws the fish sprite every frame using primitive shapes.
     * Colour, size and spines reflect the current inflate level.
     */
    private draw(): void {
        this.clear();

        const r = this.getRadius();
        const color = this.getBodyColor();

        // ── body ellipse ──────────────────────────────────────────────────
        this.fillStyle(color, 1);
        // Phaser's fillEllipse draws relative to the Graphics origin
        this.fillEllipse(0, 0, r * 2.3, r * 1.9);

        // ── tail triangle ─────────────────────────────────────────────────
        const tailColor = Phaser.Display.Color.ValueToColor(color);
        tailColor.darken(20);
        this.fillStyle(tailColor.color, 1);
        this.fillTriangle(
            -r * 1.1, -r * 0.55,
            -r * 1.1,  r * 0.55,
            -r * 1.7,  0
        );

        // ── eye ───────────────────────────────────────────────────────────
        this.fillStyle(0xffffff, 1);
        this.fillCircle(r * 0.55, -r * 0.22, r * 0.28);
        this.fillStyle(0x111111, 1);
        this.fillCircle(r * 0.62, -r * 0.22, r * 0.14);

        // ── spines (visible when inflated enough) ─────────────────────────
        if (this.inflateLevel > 3) {
            this.drawSpines(r);
        }
    }

    /**
     * Draws small spike circles distributed around the body.
     * @param r Current body radius.
     */
    private drawSpines(r: number): void {
        const spineColor = 0xffffff;
        const spineR = Phaser.Math.Clamp(this.inflateLevel * 0.22, 1.2, 3.5);
        const count = Math.floor(this.inflateLevel * 1.1);
        const angleStep = (Math.PI * 2) / count;

        this.fillStyle(spineColor, 0.85);
        for (let i = 0; i < count; i++) {
            const angle = i * angleStep;
            const sx = Math.cos(angle) * r * 1.05;
            const sy = Math.sin(angle) * r * 0.9;
            this.fillCircle(sx, sy, spineR);
        }
    }

    /**
     * Returns the body fill colour based on current inflate level.
     */
    private getBodyColor(): number {
        if (this.inflateLevel >= INFLATE_THRESHOLD_DANGER) {
            return INFLATE_COLORS.danger;
        }
        if (this.inflateLevel >= INFLATE_THRESHOLD_WARNING) {
            return INFLATE_COLORS.warning;
        }
        return INFLATE_COLORS.safe;
    }
}
