import Phaser from 'phaser';
import { GAME_HEIGHT, GAP_SIZE_MIN } from '../constants';

/** Axis-aligned bounding rectangle used for collision checks. */
export interface ObstacleRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * Obstacle – a pair of Flappy Bird-style pipe columns with a gap.
 *
 * Visual style (outline trick throughout):
 *   Every shape is drawn TWICE — first in 0x000000 slightly larger (outline),
 *   then in the fill colour on top.
 *
 * Layout per column:
 *   1. Column body  – COLUMN_WIDTH wide, flat green with highlight + shadow stripes
 *   2. Pipe cap     – COLUMN_WIDTH + 20 wide, 28 px tall, at the gap-facing edge
 *   3. Cap spikes   – 5 triangles on the cap edge pointing into the gap
 *
 * The origin of this Graphics object is at (x, 0); all local coords are from there.
 */
export class Obstacle extends Phaser.GameObjects.Graphics {
    /** Y centre of the gap opening. */
    public readonly gapY: number;

    /** Set to true once the fish has passed this obstacle (for scoring). */
    public passed: boolean = false;

    /** Width of each pipe column body. */
    private static readonly COLUMN_WIDTH = 64;

    /** Extra width added to each horizontal side of the pipe cap. */
    private static readonly CAP_OVERHANG = 10;

    /** Height of the pipe cap in pixels. */
    private static readonly CAP_H = 28;

    /** Height of each spike in pixels. */
    private static readonly SPIKE_H = 8;

    private readonly gapSize: number;

    constructor(scene: Phaser.Scene, x: number, gapY: number, gapSize: number = GAP_SIZE_MIN) {
        super(scene, { x, y: 0 });
        this.gapY  = gapY;
        this.gapSize = gapSize;
        scene.add.existing(this);
        this.drawColumns();
    }

    /** Returns the collision rect for the top column (world-space). */
    public getTopRect(): ObstacleRect {
        const topHeight = this.gapY - this.gapSize / 2;
        return { x: this.x, y: 0, w: Obstacle.COLUMN_WIDTH, h: topHeight };
    }

    /** Returns the collision rect for the bottom column (world-space). */
    public getBottomRect(): ObstacleRect {
        const bottomY = this.gapY + this.gapSize / 2;
        return { x: this.x, y: bottomY, w: Obstacle.COLUMN_WIDTH, h: GAME_HEIGHT - bottomY };
    }

    // ── Drawing ───────────────────────────────────────────────────────────────

    private drawColumns(): void {
        const CW       = Obstacle.COLUMN_WIDTH;
        const OVH      = Obstacle.CAP_OVERHANG;
        const CAP_H    = Obstacle.CAP_H;
        const capX     = -OVH;           // cap starts OVH px left of column body
        const capW     = CW + OVH * 2;   // 84 px total cap width

        const topHeight = this.gapY - this.gapSize / 2;
        const bottomY   = this.gapY + this.gapSize / 2;

        // ── Top column ────────────────────────────────────────────────────
        this.drawColumnBody(0, 0, CW, topHeight);
        this.drawCap(capX, topHeight - CAP_H, capW, CAP_H);
        this.drawCapSpikes(capX, topHeight, capW, false);   // pointing down

        // ── Bottom column ─────────────────────────────────────────────────
        this.drawColumnBody(0, bottomY, CW, GAME_HEIGHT - bottomY);
        this.drawCap(capX, bottomY, capW, CAP_H);
        this.drawCapSpikes(capX, bottomY, capW, true);      // pointing up
    }

    /**
     * Draws a flat pipe column body.
     * Outline trick + left highlight stripe (8 px) + right shadow stripe (8 px).
     */
    private drawColumnBody(x0: number, y0: number, w: number, h: number): void {
        if (h <= 0) return;

        // Outline (pass 1) – 3 px larger on every side
        this.fillStyle(0x000000, 1);
        this.fillRect(x0 - 3, y0 - 3, w + 6, h + 6);

        // Base fill (pass 2)
        this.fillStyle(0x74bf2e, 1);
        this.fillRect(x0, y0, w, h);

        // Left highlight stripe
        this.fillStyle(0x96d63e, 1);
        this.fillRect(x0, y0, 8, h);

        // Right shadow stripe
        this.fillStyle(0x5aa61e, 1);
        this.fillRect(x0 + w - 8, y0, 8, h);
    }

    /**
     * Draws the wider pipe cap at the gap-facing edge.
     * Outline trick + left highlight (10 px) + right shadow (10 px).
     */
    private drawCap(x0: number, y0: number, w: number, h: number): void {
        // Outline (pass 1)
        this.fillStyle(0x000000, 1);
        this.fillRect(x0 - 3, y0 - 3, w + 6, h + 6);

        // Base fill (pass 2)
        this.fillStyle(0x74bf2e, 1);
        this.fillRect(x0, y0, w, h);

        // Left highlight stripe
        this.fillStyle(0x96d63e, 1);
        this.fillRect(x0, y0, 10, h);

        // Right shadow stripe
        this.fillStyle(0x5aa61e, 1);
        this.fillRect(x0 + w - 10, y0, 10, h);
    }

    /**
     * Draws 5 triangular pixel spikes on the cap edge, pointing into the gap.
     * Outline trick: black triangle slightly larger, dark-green fill on top.
     *
     * @param capX    Local x of the cap's left edge.
     * @param edgeY   Y coordinate of the gap-facing cap edge.
     * @param capW    Total width of the cap.
     * @param pointUp True for the bottom cap (spikes point up); false for top cap.
     */
    private drawCapSpikes(capX: number, edgeY: number, capW: number, pointUp: boolean): void {
        const COUNT   = 5;
        const SW      = 10;                   // half base width of each spike
        const SH      = Obstacle.SPIKE_H;
        const spacing = Math.floor(capW / COUNT);
        const dir     = pointUp ? -1 : 1;     // -1 = tip goes up, +1 = tip goes down

        for (let i = 0; i < COUNT; i++) {
            const cx = capX + Math.floor(spacing * (i + 0.5));

            // Outline (pass 1)
            this.fillStyle(0x000000, 1);
            this.fillTriangle(
                cx - SW - 2, edgeY,
                cx + SW + 2, edgeY,
                cx,          edgeY + dir * (SH + 2),
            );

            // Fill (pass 2)
            this.fillStyle(0x5aa61e, 1);
            this.fillTriangle(
                cx - SW, edgeY,
                cx + SW, edgeY,
                cx,      edgeY + dir * SH,
            );
        }
    }
}
