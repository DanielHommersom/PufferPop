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
 * Obstacle – a pair of coral rock formations with a gap.
 *
 * Visual style (outline trick throughout):
 *   Every shape is drawn TWICE — first in 0x000000 slightly larger (outline),
 *   then in the fill colour on top.
 *
 * Layout per formation:
 *   1. 5 overlapping irregular blocks forming a jagged stalactite / stalagmite shape
 *   2. Triangular jagged edge pointing into the gap
 *   3. Sea anemone decorations
 *   4. Moss / algae texture patches
 *
 * The origin of this Graphics object is at (x, 0); all local coords are from there.
 */
export class Obstacle extends Phaser.GameObjects.Graphics {
    /** Y centre of the gap opening. */
    public readonly gapY: number;

    /** Set to true once the fish has passed this obstacle (for scoring). */
    public passed: boolean = false;

    /** Width of each rock column body. */
    private static readonly COLUMN_WIDTH = 64;

    private readonly gapSize: number;

    /** Reused rect objects — mutated in place each frame to avoid allocation. */
    private readonly _topRect:    ObstacleRect = { x: 0, y: 0, w: 0, h: 0 };
    private readonly _bottomRect: ObstacleRect = { x: 0, y: 0, w: 0, h: 0 };

    constructor(scene: Phaser.Scene, x: number, gapY: number, gapSize: number = GAP_SIZE_MIN) {
        super(scene, { x, y: 0 });
        this.gapY    = gapY;
        this.gapSize = gapSize;
        scene.add.existing(this);
        this.drawColumns();
    }

    /** Returns the collision rect for the top column (world-space). Mutates a cached object — do not store the reference. */
    public getTopRect(): ObstacleRect {
        this._topRect.x = this.x;
        this._topRect.h = this.gapY - this.gapSize / 2;
        return this._topRect;
    }

    /** Returns the collision rect for the bottom column (world-space). Mutates a cached object — do not store the reference. */
    public getBottomRect(): ObstacleRect {
        const bottomY = this.gapY + this.gapSize / 2;
        this._bottomRect.x = this.x;
        this._bottomRect.y = bottomY;
        this._bottomRect.h = GAME_HEIGHT - bottomY;
        return this._bottomRect;
    }

    // ── Drawing ───────────────────────────────────────────────────────────────

    /**
     * Draws both coral rock formations (top and bottom) with jagged edges,
     * sea anemones, and moss decorations.
     */
    private drawColumns(): void {
        const topHeight = this.gapY - this.gapSize / 2;
        const bottomY   = this.gapY + this.gapSize / 2;
        // ── Top coral rock formation ──────────────────────────────────────────
        if (topHeight > 0) {
            // [localX, width, height]
            const topBlocks: [number, number, number][] = [
                [ -4, 52, topHeight * 0.85],   // Block A – main left column
                [  8, 48, topHeight * 0.92],   // Block B – main right column
                [ 16, 36, topHeight * 1.00],   // Block C – centre tallest
                [ -2, 24, topHeight * 0.70],   // Block D – left shorter
                [ 28, 20, topHeight * 0.78],   // Block E – right shorter
            ];

            // Pass 1: black outline, 4 px expanded on each side
            this.fillStyle(0x000000, 1);
            for (const [bx, bw, bh] of topBlocks) {
                this.fillRect(bx - 4, -4, bw + 8, bh + 4);
            }

            // Pass 2: base fill + bottom shadow strip
            for (const [bx, bw, bh] of topBlocks) {
                this.fillStyle(0x8b2020, 1);
                this.fillRect(bx, 0, bw, bh);

                if (bh > 8) {
                    this.fillStyle(0x5a1010, 1);
                    this.fillRect(bx, bh - 8, bw, 8);
                }
            }

            // Highlight stripe: 6 px on left edge of Block C (index 2)
            const [cxT, , chT] = topBlocks[2];
            this.fillStyle(0xb03030, 1);
            this.fillRect(cxT, 0, 6, chT);


            // Sea anemones
            this.drawAnemone(10, topHeight * 0.3);
            this.drawAnemone(36, topHeight * 0.5);
            this.drawAnemone(20, topHeight * 0.7);

            // Moss patches
            this.drawMoss(topHeight, 0);
        }

        // ── Bottom coral rock formation ───────────────────────────────────────
        const bottomH = GAME_HEIGHT - bottomY;
        if (bottomH > 0) {
            // [localX, width, height]
            const bottomBlocks: [number, number, number][] = [
                [ -4, 52, bottomH * 0.85],   // Block A
                [  8, 48, bottomH * 0.92],   // Block B
                [ 16, 36, bottomH * 1.00],   // Block C – full height
                [ -2, 24, bottomH * 0.70],   // Block D
                [ 28, 20, bottomH * 0.78],   // Block E
            ];

            // Pass 1: black outline – blocks anchored at GAME_HEIGHT, growing upward
            this.fillStyle(0x000000, 1);
            for (const [bx, bw, bh] of bottomBlocks) {
                this.fillRect(bx - 4, GAME_HEIGHT - bh - 4, bw + 8, bh + 8);
            }

            // Pass 2: base fill + shadow strip at top of each block (gap-facing edge)
            for (const [bx, bw, bh] of bottomBlocks) {
                this.fillStyle(0x8b2020, 1);
                this.fillRect(bx, GAME_HEIGHT - bh, bw, bh);

                if (bh > 8) {
                    this.fillStyle(0x5a1010, 1);
                    this.fillRect(bx, GAME_HEIGHT - bh, bw, 8);
                }
            }

            // Highlight stripe on Block C (index 2)
            const [cxB, , chB] = bottomBlocks[2];
            this.fillStyle(0xb03030, 1);
            this.fillRect(cxB, GAME_HEIGHT - chB, 6, chB);

            // Sea anemones – positions measured upward from screen bottom
            this.drawAnemone(10, GAME_HEIGHT - bottomH * 0.3);
            this.drawAnemone(36, GAME_HEIGHT - bottomH * 0.5);
            this.drawAnemone(20, GAME_HEIGHT - bottomH * 0.7);

            // Moss patches
            this.drawMoss(bottomH, bottomY);
        }
    }

    /**
     * Draws a single sea anemone at (x, y).
     * Consists of a centre circle (r=5) surrounded by 5 evenly-spaced petal
     * circles (r=3). Each circle is drawn with a black outline first.
     *
     * @param x Local x coordinate of the anemone centre.
     * @param y Local y coordinate of the anemone centre.
     */
    private drawAnemone(x: number, y: number): void {
        const centerR  = 5;
        const petalR   = 3;
        const petalDist = centerR + petalR + 2;   // petals radiate from centre edge

        // 5 evenly-spaced angles, starting from the top (−π/2)
        const angles: number[] = Array.from(
            { length: 5 },
            (_, i) => (i * 2 * Math.PI) / 5 - Math.PI / 2,
        );

        // Outline pass: slightly larger black circles
        this.fillStyle(0x000000, 1);
        for (const angle of angles) {
            const px = x + Math.round(Math.cos(angle) * petalDist);
            const py = y + Math.round(Math.sin(angle) * petalDist);
            this.fillCircle(px, py, petalR + 1);
        }
        this.fillCircle(x, y, centerR + 1);

        // Fill pass: petals then centre
        this.fillStyle(0xf4921a, 1);
        for (const angle of angles) {
            const px = x + Math.round(Math.cos(angle) * petalDist);
            const py = y + Math.round(Math.sin(angle) * petalDist);
            this.fillCircle(px, py, petalR);
        }
        this.fillStyle(0xe85d2a, 1);
        this.fillCircle(x, y, centerR);
    }

    /**
     * Scatters 6 moss / algae patches (4×4 px each) across a rock formation.
     * Positions are fully deterministic so the result is stable across frames.
     *
     * @param formationHeight Height of the formation in pixels.
     * @param startY          Y coordinate where the formation begins.
     */
    private drawMoss(formationHeight: number, startY: number): void {
        const CW      = Obstacle.COLUMN_WIDTH;
        const fh      = Math.max(1, Math.floor(formationHeight));

        for (let blockIndex = 0; blockIndex < 3; blockIndex++) {
            for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
                const mx = (blockIndex * 13 + rowIndex * 7) % (CW - 4);
                const my = (blockIndex * 11 + rowIndex * 5) % fh;

                // Outline (1 px larger on each side)
                this.fillStyle(0x000000, 1);
                this.fillRect(mx - 1, startY + my - 1, 6, 6);

                // Fill
                this.fillStyle(0x2d8a3e, 1);
                this.fillRect(mx, startY + my, 4, 4);
            }
        }
    }
}
