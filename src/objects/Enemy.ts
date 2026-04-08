import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

/** 0 = Jellyfish, 1 = Shark, 2 = Urchin */
export type EnemyType = 0 | 1 | 2;

/**
 * Enemy — a moving hazard the player must avoid.
 *
 * Three types, each with distinct movement and appearance:
 *   Type 0 — Jellyfish: floats vertically via sine wave, slow
 *   Type 1 — Shark:     charges horizontally from right to left, fast
 *   Type 2 — Urchin:    bounces diagonally at medium speed
 *
 * Collision is circle-based; call getRadius() to get the hit radius.
 * The draw() method is called every frame from update() and uses
 * this.time to animate tentacles and spine wobble.
 */
export class Enemy extends Phaser.GameObjects.Graphics {
    /** Which enemy variant this instance represents. */
    public readonly enemyType: EnemyType;

    /** Set to true when the enemy has scrolled off the left edge. */
    public isDead: boolean = false;

    private velX: number = 0;
    private velY: number = 0;
    private time: number = 0;
    private baseY: number = 0;
    private radius: number = 0;

    /**
     * @param scene      Phaser scene this enemy belongs to.
     * @param enemyType  0 = Jellyfish, 1 = Shark, 2 = Urchin.
     */
    constructor(scene: Phaser.Scene, enemyType: EnemyType) {
        super(scene, { x: 0, y: 0 });
        this.enemyType = enemyType;
        scene.add.existing(this);
        this.setDepth(4);
        this.init();
    }

    /**
     * Sets the spawn position, velocity, and radius based on enemy type,
     * then performs the initial draw.
     */
    private init(): void {
        switch (this.enemyType) {
            case 0: // Jellyfish
                this.x      = GAME_WIDTH + 40;
                this.y      = Phaser.Math.Between(80, GAME_HEIGHT - 80);
                this.baseY  = this.y;
                this.velX   = -1.2;
                this.velY   = 0;
                this.radius = 22;
                break;
            case 1: // Shark
                this.x      = GAME_WIDTH + 60;
                this.y      = Phaser.Math.Between(60, GAME_HEIGHT - 60);
                this.baseY  = this.y;
                this.velX   = -3.8;
                this.velY   = 0;
                this.radius = 32;
                break;
            case 2: // Urchin
                this.x      = GAME_WIDTH + 30;
                this.y      = Phaser.Math.Between(60, GAME_HEIGHT - 60);
                this.baseY  = this.y;
                this.velX   = -2.0;
                this.velY   = Phaser.Math.Between(-2, 2) === 0 ? 1.4 : -1.4;
                this.radius = 18;
                break;
        }
        this.draw();
    }

    /**
     * Advances the enemy one frame: increments the animation clock,
     * updates position based on type-specific movement, marks isDead
     * when off screen, then redraws.
     */
    public update(): void {
        this.time += 0.04;

        switch (this.enemyType) {
            case 0: // Jellyfish — sine wave vertical drift
                this.x += this.velX;
                this.y  = this.baseY + Math.sin(this.time * 1.8) * 55;
                break;
            case 1: // Shark — straight charge with slow vertical drift
                this.x += this.velX;
                this.y  = this.baseY + Math.sin(this.time * 0.6) * 20;
                break;
            case 2: // Urchin — diagonal bounce
                this.x += this.velX;
                this.y += this.velY;
                if (this.y < 30 || this.y > GAME_HEIGHT - 30) {
                    this.velY *= -1;
                }
                break;
        }

        if (this.x < -80) this.isDead = true;

        this.draw();
    }

    /**
     * Returns the hit radius used for circle-vs-circle collision detection.
     */
    public getRadius(): number {
        return this.radius;
    }

    /**
     * Clears and redraws the enemy graphic for the current frame.
     * Reads this.time for animated elements (tentacles, spine wobble).
     */
    private draw(): void {
        this.clear();

        switch (this.enemyType) {
            case 0:
                this.drawJellyfish();
                break;
            case 1:
                this.drawShark();
                break;
            case 2:
                this.drawUrchin();
                break;
        }
    }

    // ── Jellyfish ─────────────────────────────────────────────────────────────

    private drawJellyfish(): void {
        // Bell (top dome)
        this.fillStyle(0x000000, 1);
        this.fillEllipse(0, 0, 44, 34);
        this.fillStyle(0x9b59b6, 1);
        this.fillEllipse(0, 0, 40, 30);
        this.fillStyle(0xc39bd3, 0.6);
        this.fillEllipse(-6, -8, 18, 10);
        // Inner pattern dots
        this.fillStyle(0x7d3c98, 1);
        this.fillCircle(-8, -4, 3);
        this.fillCircle(0, -6, 3);
        this.fillCircle(8, -4, 3);

        // Tentacles (6 wavy lines as stacked small rects)
        for (let i = 0; i < 6; i++) {
            const baseX = -20 + i * 8;
            for (let j = 0; j < 4; j++) {
                const offset = Math.sin(this.time * 2 + i * 0.8 + j * 0.4) * 4;
                this.fillStyle(0x7d3c98, 1);
                this.fillRect(baseX + offset - 1, 15 + j * 8, 3, 7);
            }
        }

        // Eye
        this.fillStyle(0x000000, 1);
        this.fillCircle(0, -4, 7);
        this.fillStyle(0xffffff, 1);
        this.fillCircle(0, -4, 5);
        this.fillStyle(0x000000, 1);
        this.fillCircle(1, -3, 3);
        this.fillStyle(0xffffff, 1);
        this.fillCircle(-1, -6, 1.5);
    }

    // ── Shark ─────────────────────────────────────────────────────────────────

    private drawShark(): void {
        // Body
        this.fillStyle(0x000000, 1);
        this.fillEllipse(0, 0, 70, 36);
        this.fillStyle(0x5d8aa8, 1);
        this.fillEllipse(0, 0, 66, 32);
        this.fillStyle(0xd6eaf8, 1);
        this.fillEllipse(10, 6, 40, 16);
        this.fillStyle(0x85c1e9, 0.5);
        this.fillEllipse(-8, -8, 22, 10);

        // Dorsal fin (top)
        this.fillStyle(0x000000, 1);
        this.fillTriangle(-4, -16, 14, -16, 8, 0);
        this.fillStyle(0x5d8aa8, 1);
        this.fillTriangle(-2, -14, 12, -14, 7, 0);

        // Tail (right side — pointing away from fish)
        this.fillStyle(0x000000, 1);
        this.fillTriangle(32, -18, 44, -18, 32, 0);
        this.fillTriangle(32, 0, 44, 18, 32, 18);
        this.fillStyle(0x4a7a96, 1);
        this.fillTriangle(33, -16, 42, -16, 33, 0);
        this.fillTriangle(33, 0, 42, 16, 33, 16);

        // Eye
        this.fillStyle(0x000000, 1);
        this.fillCircle(-14, -4, 8);
        this.fillStyle(0xffffff, 1);
        this.fillCircle(-14, -4, 6);
        this.fillStyle(0x000000, 1);
        this.fillCircle(-13, -3, 3);
        this.fillStyle(0xffffff, 1);
        this.fillCircle(-16, -6, 2);

        // Mouth (jagged teeth — shark facing left)
        this.fillStyle(0xffffff, 1);
        this.fillTriangle(-32, -4, -28, 4, -24, -4);
        this.fillTriangle(-26, -4, -22, 4, -18, -4);
        this.lineStyle(2, 0x000000, 1);
        this.strokeRect(-34, -4, 18, 8);
    }

    // ── Urchin ────────────────────────────────────────────────────────────────

    private drawUrchin(): void {
        // Body
        this.fillStyle(0x000000, 1);
        this.fillCircle(0, 0, 20);
        this.fillStyle(0x2c3e50, 1);
        this.fillCircle(0, 0, 17);
        this.fillStyle(0x5d6d7e, 0.5);
        this.fillCircle(-5, -5, 6);

        // Spines (12 in all directions with wobble animation)
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const x1 = Math.cos(angle) * 18;
            const y1 = Math.sin(angle) * 18;
            const mx = Math.cos(angle) * 24 + Math.sin(this.time * 3 + i) * 2;
            const my = Math.sin(angle) * 24 + Math.cos(this.time * 3 + i) * 2;
            // Outline
            this.fillStyle(0x000000, 1);
            this.fillTriangle(x1 - 2, y1, mx, my, x1 + 2, y1);
            // Fill
            this.fillStyle(0xe8e8e8, 1);
            this.fillTriangle(x1 - 1, y1, mx, my, x1 + 1, y1);
        }

        // Eye (centre)
        this.fillStyle(0x000000, 1);
        this.fillCircle(0, 0, 6);
        this.fillStyle(0xe74c3c, 1);
        this.fillCircle(0, 0, 4);
        this.fillStyle(0x000000, 1);
        this.fillCircle(1, 1, 2);
    }
}
