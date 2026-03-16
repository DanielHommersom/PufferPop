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
 * Extends Graphics and redraws itself every frame using the Flappy Bird
 * cartoon outline trick: every shape is drawn twice — first in 0x000000
 * (slightly larger), then in the fill colour on top.
 */
export class PufferFish extends Phaser.GameObjects.Graphics {
    /** Current vertical velocity in pixels per frame. */
    public velY: number = 0;

    /** Current inflate level (0 – FISH_MAX_INFLATE). */
    public inflateLevel: number = 0;

    /** Whether the player is currently holding the inflate input. */
    public isInflating: boolean = false;

    // ── Blink state ───────────────────────────────────────────────────────────
    /** Frames elapsed since last blink reset. */
    private blinkTimer: number = 0;
    /** True for 6 frames every 180-frame cycle. */
    private isBlinking: boolean = false;

    // ── Tail wag state ────────────────────────────────────────────────────────
    /** Current vertical wag offset in logical units (range ±2). */
    private wagOffset: number = 0;
    /** Oscillation direction (+1 or -1). */
    private wagDirection: number = 1;

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
     * Advances physics, blink and wag timers, then redraws.
     */
    public update(): void {
        // ── Physics ───────────────────────────────────────────────────────────
        if (this.isInflating) {
            this.inflateLevel = Math.min(FISH_MAX_INFLATE, this.inflateLevel + INFLATE_SPEED);
            this.velY -= INFLATE_SPEED;
        } else {
            this.inflateLevel = Math.max(0, this.inflateLevel - DEFLATE_SPEED);
            this.velY += GRAVITY;
        }

        this.velY = Phaser.Math.Clamp(this.velY, MAX_VEL_UP, MAX_VEL_DOWN);
        this.y += this.velY;

        // ── Blink timer ───────────────────────────────────────────────────────
        this.blinkTimer++;
        if (this.blinkTimer >= 180) this.isBlinking = true;
        if (this.blinkTimer >= 186) {
            this.isBlinking = false;
            this.blinkTimer = 0;
        }

        // ── Tail wag ──────────────────────────────────────────────────────────
        this.wagOffset += 0.15 * this.wagDirection;
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

    /**
     * Top-level draw dispatcher.
     * Painter's order: tail (behind body) → body → spines → eye → mouth.
     */
    private draw(): void {
        this.clear();
        this.drawTail();
        this.drawBody();
        if (this.inflateLevel > 3) this.drawSpines();
        this.drawEye();
        this.drawMouth();
    }

    /**
     * Draws the body ellipse (cartoon outline trick).
     *   Pass 1 – black circle (r + 3)
     *   Pass 2 – ellipse in body colour (r × 2.2 wide, r × 1.9 tall)
     *   Pass 3 – belly: lighter ellipse on the underside
     *   Pass 4 – top-left specular highlight ellipse at 60 % alpha
     */
    private drawBody(): void {
        const r         = this.getRadius();
        const bodyColor = this.getBodyColor();

        // Outline (pass 1)
        this.fillStyle(0x000000, 1);
        this.fillCircle(0, 0, r + 3);

        // Main body (pass 2)
        this.fillStyle(bodyColor, 1);
        this.fillEllipse(0, 0, r * 2.2, r * 1.9);

        // Belly – lighter underside
        const bellyColor = Phaser.Display.Color.IntegerToColor(bodyColor).lighten(25).color;
        this.fillStyle(bellyColor, 1);
        this.fillEllipse(r * 0.1, r * 0.3, r * 1.1, r * 0.7);

        // Top-left specular highlight
        this.fillStyle(0xffffff, 0.60);
        this.fillEllipse(-r * 0.25, -r * 0.35, r * 0.7, r * 0.45);
    }

    /**
     * Draws the tail triangle pointing left.
     *   Pass 1 – black outline triangle (each corner offset 3 px outward)
     *   Pass 2 – dark-orange fill triangle
     *   Pass 3 – small white highlight strip at the tail base
     */
    private drawTail(): void {
        const r         = this.getRadius();
        const tailBaseX = -(r * 1.05);
        const tailHalfH = r * 0.55;
        const tailDepth = r * 0.55;
        const wagY      = this.wagOffset * 3;   // ±6 px

        // Outline (pass 1)
        this.fillStyle(0x000000, 1);
        this.fillTriangle(
            tailBaseX + 3, wagY - tailHalfH - 3,
            tailBaseX + 3, wagY + tailHalfH + 3,
            tailBaseX - tailDepth - 3, wagY,
        );

        // Fill (pass 2) – dark orange
        this.fillStyle(0xf4921a, 1);
        this.fillTriangle(
            tailBaseX, wagY - tailHalfH,
            tailBaseX, wagY + tailHalfH,
            tailBaseX - tailDepth, wagY,
        );

        // Highlight strip at tail base
        this.fillStyle(0xffffff, 0.70);
        this.fillRect(Math.round(tailBaseX), Math.round(wagY) - 3, 2, 6);
    }

    /**
     * Draws the eye with cartoon detail (outline, sclera, iris, pupil, highlight).
     * Blink replaces the eye with a flat horizontal rect.
     */
    private drawEye(): void {
        const r    = this.getRadius();
        const eyeX = r * 0.5;
        const eyeY = -(r * 0.25);

        if (this.isBlinking) {
            // Closed-eye slit centered on the eye position
            this.fillStyle(0x222222, 1);
            this.fillRect(
                eyeX - r * 0.275,
                eyeY - r * 0.06,
                r * 0.55,
                r * 0.12,
            );
            return;
        }

        // Outline (pass 1)
        this.fillStyle(0x000000, 1);
        this.fillCircle(eyeX, eyeY, r * 0.32 + 3);

        // White sclera (pass 2)
        this.fillStyle(0xffffff, 1);
        this.fillCircle(eyeX, eyeY, r * 0.32);

        // Blue iris
        this.fillStyle(0x4a90d9, 1);
        this.fillCircle(eyeX + r * 0.04, eyeY + r * 0.03, r * 0.18);

        // Dark pupil
        this.fillStyle(0x000000, 1);
        this.fillCircle(eyeX + r * 0.07, eyeY + r * 0.05, r * 0.11);

        // Specular highlight dot
        this.fillStyle(0xffffff, 1);
        this.fillCircle(eyeX + r * 0.02, eyeY - r * 0.01, Math.max(1, r * 0.06));
    }

    /**
     * Draws the mouth based on inflate level:
     *   < WARNING   → small smile (two offset fillRects)
     *   ≥ DANGER    → worried O-mouth (black filled circle)
     *   in-between  → no mouth (neutral)
     */
    private drawMouth(): void {
        const r = this.getRadius();

        if (this.inflateLevel >= INFLATE_THRESHOLD_DANGER) {
            // Worried O-mouth
            const mx = r * 0.40;
            const my = r * 0.28;
            this.fillStyle(0x000000, 1);
            this.fillCircle(mx, my, r * 0.12 + 2);   // outline pass
            this.fillCircle(mx, my, r * 0.12);        // fill (same black = solid mouth)
        } else if (this.inflateLevel < INFLATE_THRESHOLD_WARNING) {
            // Small smile – two slightly offset horizontal fillRects
            this.fillStyle(0x000000, 0.70);
            this.fillRect(Math.round(r * 0.30), Math.round(r * 0.25), 4, 2);
            this.fillRect(Math.round(r * 0.55), Math.round(r * 0.28), 4, 2);
        }
    }

    /**
     * Draws 8 outward-pointing isoceles triangle spines (cartoon outline trick).
     * Height scales from 6 px at inflate level 4 up to 14 px at FISH_MAX_INFLATE.
     * Base width is 6 px.
     */
    private drawSpines(): void {
        const r       = this.getRadius();
        const t       = Math.min((this.inflateLevel - 4) / (FISH_MAX_INFLATE - 4), 1);
        const spineH  = 6 + t * 8;     // 6 → 14 px
        const halfW   = 3;             // half of 6 px base

        const directions: [number, number][] = [
            [ 1,  0], [-1,  0], [ 0,  1], [ 0, -1],
            [ 1,  1], [ 1, -1], [-1,  1], [-1, -1],
        ];

        for (const [nx, ny] of directions) {
            const len = Math.sqrt(nx * nx + ny * ny);
            const ux  = nx / len;   // unit outward direction
            const uy  = ny / len;
            const px  = -uy;        // perpendicular to outward direction
            const py  =  ux;

            const baseX = ux * r * 1.05;
            const baseY = uy * r * 1.05;
            const tipX  = ux * (r * 1.05 + spineH);
            const tipY  = uy * (r * 1.05 + spineH);

            // Outline (pass 1)
            this.fillStyle(0x000000, 1);
            this.fillTriangle(
                baseX + px * (halfW + 2), baseY + py * (halfW + 2),
                baseX - px * (halfW + 2), baseY - py * (halfW + 2),
                tipX  + ux * 2,           tipY  + uy * 2,
            );

            // Fill (pass 2)
            this.fillStyle(0xffffff, 1);
            this.fillTriangle(
                baseX + px * halfW, baseY + py * halfW,
                baseX - px * halfW, baseY - py * halfW,
                tipX,               tipY,
            );
        }
    }

    /** Returns the body fill colour based on the current inflate level. */
    private getBodyColor(): number {
        if (this.inflateLevel >= INFLATE_THRESHOLD_DANGER) return INFLATE_COLORS.danger;
        if (this.inflateLevel >= INFLATE_THRESHOLD_WARNING) return INFLATE_COLORS.warning;
        return INFLATE_COLORS.safe;
    }
}
