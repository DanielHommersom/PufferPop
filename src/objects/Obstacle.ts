import Phaser from 'phaser';
import {
    GAME_HEIGHT,
    GAP_SIZE_MIN,
    CORAL_BASE_COLOR,
    CORAL_HIGHLIGHT_COLOR,
    CORAL_SPINE_COLOR,
} from '../constants';

/** Axis-aligned bounding rectangle used for collision checks. */
export interface ObstacleRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * Obstacle – a pair of coral columns with a gap in the middle.
 * Extends Graphics and draws itself in the constructor.
 * The x/y origin is at the left edge of the obstacle.
 */
export class Obstacle extends Phaser.GameObjects.Graphics {
    /** Y centre of the opening between the two coral columns. */
    public readonly gapY: number;

    /** Set to true once the fish has passed this obstacle (for scoring). */
    public passed: boolean = false;

    /** Pixel width of each coral column. */
    private static readonly COLUMN_WIDTH = 64;

    /** The gap size used when this obstacle was spawned. */
    private readonly gapSize: number;

    constructor(scene: Phaser.Scene, x: number, gapY: number, gapSize: number = GAP_SIZE_MIN) {
        super(scene, { x, y: 0 });
        this.gapY = gapY;
        this.gapSize = gapSize;
        scene.add.existing(this);
        this.drawColumns();
    }

    /**
     * Returns the collision rectangle for the top coral column.
     * Coordinates are in world space.
     */
    public getTopRect(): ObstacleRect {
        const topHeight = this.gapY - this.gapSize / 2;
        return {
            x: this.x,
            y: 0,
            w: Obstacle.COLUMN_WIDTH,
            h: topHeight,
        };
    }

    /**
     * Returns the collision rectangle for the bottom coral column.
     * Coordinates are in world space.
     */
    public getBottomRect(): ObstacleRect {
        const bottomY = this.gapY + this.gapSize / 2;
        return {
            x: this.x,
            y: bottomY,
            w: Obstacle.COLUMN_WIDTH,
            h: GAME_HEIGHT - bottomY,
        };
    }

    /** Draws both coral columns with highlights and decorative sea-urchin spines. */
    private drawColumns(): void {
        const cw = Obstacle.COLUMN_WIDTH;
        const topHeight = this.gapY - this.gapSize / 2;
        const bottomY = this.gapY + this.gapSize / 2;

        // ── Top column ────────────────────────────────────────────────────
        this.fillStyle(CORAL_BASE_COLOR, 1);
        this.fillRect(0, 0, cw, topHeight);

        // Highlight stripe
        this.fillStyle(CORAL_HIGHLIGHT_COLOR, 1);
        this.fillRect(6, 0, 10, topHeight);

        // Bottom edge of top column (darker shadow)
        this.fillStyle(0x0d5028, 1);
        this.fillRect(0, topHeight - 6, cw, 6);

        // Sea-urchin spines at the bottom opening edge of the top column
        this.drawSpines(0, topHeight, cw, false);

        // ── Bottom column ─────────────────────────────────────────────────
        this.fillStyle(CORAL_BASE_COLOR, 1);
        this.fillRect(0, bottomY, cw, GAME_HEIGHT - bottomY);

        // Highlight stripe
        this.fillStyle(CORAL_HIGHLIGHT_COLOR, 1);
        this.fillRect(6, bottomY, 10, GAME_HEIGHT - bottomY);

        // Top edge of bottom column (darker shadow)
        this.fillStyle(0x0d5028, 1);
        this.fillRect(0, bottomY, cw, 6);

        // Sea-urchin spines at the top opening edge of the bottom column
        this.drawSpines(0, bottomY, cw, true);
    }

    /**
     * Draws a row of small triangular sea-urchin spines along the opening edge.
     * @param colX    Left x of the column (local coords, always 0 here).
     * @param edgeY   Y of the gap-facing edge.
     * @param colW    Width of the column.
     * @param pointUp Whether the spines point upward (bottom column) or downward (top column).
     */
    private drawSpines(
        colX: number,
        edgeY: number,
        colW: number,
        pointUp: boolean
    ): void {
        const spineCount = 5;
        const spineW = colW / spineCount;
        const spineH = 10;

        this.fillStyle(CORAL_SPINE_COLOR, 1);

        for (let i = 0; i < spineCount; i++) {
            const baseX = colX + i * spineW;
            const tipX = baseX + spineW / 2;

            if (pointUp) {
                // Triangle pointing up into the gap
                this.fillTriangle(
                    baseX,     edgeY,
                    baseX + spineW, edgeY,
                    tipX,      edgeY - spineH
                );
            } else {
                // Triangle pointing down into the gap
                this.fillTriangle(
                    baseX,     edgeY,
                    baseX + spineW, edgeY,
                    tipX,      edgeY + spineH
                );
            }
        }
    }
}
