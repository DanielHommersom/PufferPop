import Phaser from 'phaser';
import { PufferFish } from '../objects/PufferFish';
import { Obstacle } from '../objects/Obstacle';
import { ParallaxBackground } from '../objects/ParallaxBackground';
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    GAP_SIZE_INITIAL,
    GAP_SIZE_MIN,
    OBSTACLE_SPEED_INITIAL,
    OBSTACLE_SPEED_MAX,
    SPAWN_INTERVAL_INITIAL,
    SPAWN_INTERVAL_MIN,
    DIFFICULTY_RAMP_GAP,
    DIFFICULTY_RAMP_SPEED,
    DIFFICULTY_RAMP_SPAWN,
    FISH_MAX_INFLATE,
} from '../constants';

/**
 * GameScene – the main gameplay loop.
 *
 * Responsibilities:
 *  - Spawn obstacles on a timer
 *  - Drive the PufferFish physics via input
 *  - Detect collisions (circle vs AABB)
 *  - Track and display score
 *  - Render the inflate meter UI
 *  - Trigger the GameOverScene when the player dies
 */
export class GameScene extends Phaser.Scene {
    private parallax!: ParallaxBackground;
    private fish!: PufferFish;
    private obstacles!: Obstacle[];
    private score: number = 0;
    private isGameOver: boolean = false;

    // UI – score display: 4 outline copies + 1 main text on top
    private scoreOutlines!: Phaser.GameObjects.Text[];
    private scoreMain!: Phaser.GameObjects.Text;

    // UI – best score (top right, double-drawn)
    private bestShadow!: Phaser.GameObjects.Text;
    private bestMain!: Phaser.GameObjects.Text;
    private bestScore: number = 0;

    // UI – inflate meter (Graphics, redrawn every frame)
    private meterGfx!: Phaser.GameObjects.Graphics;

    // Input
    private spaceKey!: Phaser.Input.Keyboard.Key;

    // Timer – holds the pending delayedCall so it can be cancelled on game over
    private spawnTimer: Phaser.Time.TimerEvent | null = null;

    constructor() {
        super({ key: 'GameScene' });
    }

    create(): void {
        this.score = 0;
        this.isGameOver = false;
        this.obstacles = [];

        // Static cartoon ocean base – sits below all parallax layers (depth −10)
        this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(-10);

        // Parallax layers scroll on top of the static base
        this.parallax = new ParallaxBackground(this);

        // Player fish
        this.fish = new PufferFish(this, 120, GAME_HEIGHT / 2);

        // ── Score display (4-corner black outline + white text on top) ────
        const scoreX = GAME_WIDTH / 2;
        const scoreY = 20;
        const pixelFont = '"Press Start 2P"';

        const outlineOffsets: [number, number][] = [[-3, -3], [3, -3], [-3, 3], [3, 3]];
        this.scoreOutlines = outlineOffsets.map(([dx, dy]) =>
            this.add.text(scoreX + dx, scoreY + dy, '0', {
                fontFamily: pixelFont,
                fontSize: '32px',
                color: '#000000',
            }).setOrigin(0.5, 0).setDepth(20),
        );

        this.scoreMain = this.add.text(scoreX, scoreY, '0', {
            fontFamily: pixelFont,
            fontSize: '32px',
            color: '#ffffff',
        }).setOrigin(0.5, 0).setDepth(21);

        // ── Best score (top right, double-drawn) ──────────────────────────
        this.bestScore = (this.registry.get('highScore') as number | undefined) ?? 0;
        const bestX = GAME_WIDTH - 10;
        const bestStr = `BEST:${this.bestScore}`;

        this.bestShadow = this.add.text(bestX + 2, scoreY + 2, bestStr, {
            fontFamily: pixelFont,
            fontSize: '8px',
            color: '#000000',
        }).setOrigin(1, 0).setAlpha(0.6).setDepth(10);

        this.bestMain = this.add.text(bestX, scoreY, bestStr, {
            fontFamily: pixelFont,
            fontSize: '8px',
            color: '#ffffff',
        }).setOrigin(1, 0).setDepth(11);

        // ── Inflate meter (Graphics, redrawn every frame) ─────────────────
        const meterStartX = 10;
        const meterLabelY = GAME_HEIGHT - 44;

        this.add.text(meterStartX, meterLabelY, 'PUFF', {
            fontFamily: pixelFont,
            fontSize: '8px',
            color: '#88aabb',
        }).setDepth(20);

        this.meterGfx = this.add.graphics().setDepth(20);

        // ── Input ─────────────────────────────────────────────────────────
        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.input.on('pointerdown', () => {
            if (!this.isGameOver) this.fish.inflate();
        });
        this.input.on('pointerup', () => {
            if (!this.isGameOver) this.fish.deflate();
        });

        // Spawn one immediately, which also schedules the next spawn
        this.spawnObstacle();
    }

    /** Main game loop – called every frame. */
    update(_time: number, delta: number): void {
        if (this.isGameOver) return;

        this.parallax.update(delta);

        // ── Input polling ─────────────────────────────────────────────────
        if (this.spaceKey.isDown) {
            this.fish.inflate();
        } else if (this.spaceKey.isUp && !this.input.activePointer.isDown) {
            this.fish.deflate();
        }

        // ── Fish physics ──────────────────────────────────────────────────
        this.fish.update();

        // ── Boundary check ────────────────────────────────────────────────
        const fishR = this.fish.getRadius();
        if (this.fish.y - fishR < 0 || this.fish.y + fishR > GAME_HEIGHT) {
            this.triggerGameOver();
            return;
        }

        // ── Obstacle movement + scoring + collision ───────────────────────
        const speed = this.currentSpeed();
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= speed;

            // Score: fish has passed the obstacle's right edge
            if (!obs.passed && obs.x + 64 < this.fish.x) {
                obs.passed = true;
                this.score++;
                const scoreStr = String(this.score);
                this.scoreOutlines.forEach(t => t.setText(scoreStr));
                this.scoreMain.setText(scoreStr);

                // Update best score display if beaten
                if (this.score > this.bestScore) {
                    this.bestScore = this.score;
                    const bestStr = `BEST:${this.bestScore}`;
                    this.bestShadow.setText(bestStr);
                    this.bestMain.setText(bestStr);
                }
            }

            // Collision: circle vs two AABBs
            if (this.circleCollidesRect(obs.getTopRect()) ||
                this.circleCollidesRect(obs.getBottomRect())) {
                this.triggerGameOver();
                return;
            }

            // Remove obstacles that have scrolled off the left edge
            if (obs.x < -80) {
                obs.destroy();
                this.obstacles.splice(i, 1);
            }
        }

        // ── Update inflate meter ──────────────────────────────────────────
        this.updateMeter();
    }

    /** Spawns a new obstacle at the right edge with a random gap position,
     *  then schedules the next spawn using the current dynamic interval. */
    private spawnObstacle(): void {
        if (this.isGameOver) return;

        const gap = this.currentGapSize();
        const margin = gap * 0.55;
        const gapY = Phaser.Math.Between(
            Math.floor(gap / 2 + margin),
            Math.floor(GAME_HEIGHT - gap / 2 - margin)
        );
        const obs = new Obstacle(this, GAME_WIDTH + 10, gapY, gap);
        this.obstacles.push(obs);

        // Schedule next spawn with the delay re-evaluated at spawn time
        this.spawnTimer = this.time.delayedCall(
            this.currentSpawnInterval(),
            this.spawnObstacle,
            [],
            this
        );
    }

    /**
     * Returns the spawn interval for the current score, linearly interpolated
     * from SPAWN_INTERVAL_INITIAL down to SPAWN_INTERVAL_MIN over DIFFICULTY_RAMP_SPAWN points.
     */
    private currentSpawnInterval(): number {
        const t = Math.min(this.score / DIFFICULTY_RAMP_SPAWN, 1);
        return SPAWN_INTERVAL_INITIAL + (SPAWN_INTERVAL_MIN - SPAWN_INTERVAL_INITIAL) * t;
    }

    /**
     * Returns the gap size for the current score, linearly interpolated from
     * GAP_SIZE_INITIAL down to GAP_SIZE_MIN over DIFFICULTY_RAMP_GAP points.
     */
    private currentGapSize(): number {
        const t = Math.min(this.score / DIFFICULTY_RAMP_GAP, 1);
        return Math.round(GAP_SIZE_INITIAL + (GAP_SIZE_MIN - GAP_SIZE_INITIAL) * t);
    }

    /**
     * Returns the obstacle speed for the current score, linearly interpolated
     * from OBSTACLE_SPEED_INITIAL up to OBSTACLE_SPEED_MAX over DIFFICULTY_RAMP_SPEED points.
     */
    private currentSpeed(): number {
        const t = Math.min(this.score / DIFFICULTY_RAMP_SPEED, 1);
        return OBSTACLE_SPEED_INITIAL + (OBSTACLE_SPEED_MAX - OBSTACLE_SPEED_INITIAL) * t;
    }

    /**
     * Tests if the fish's hit-circle overlaps a rectangle (AABB).
     * @param rect World-space rectangle from getTopRect() / getBottomRect().
     */
    private circleCollidesRect(rect: { x: number; y: number; w: number; h: number }): boolean {
        const r = this.fish.getRadius();
        const cx = this.fish.x;
        const cy = this.fish.y;

        // Nearest point on rect to circle centre
        const nearX = Phaser.Math.Clamp(cx, rect.x, rect.x + rect.w);
        const nearY = Phaser.Math.Clamp(cy, rect.y, rect.y + rect.h);

        const dx = cx - nearX;
        const dy = cy - nearY;
        return dx * dx + dy * dy < r * r;
    }

    /**
     * Redraws the 8-block inflate meter every frame using a Graphics object.
     * Each block: 1 px black outline (16×16), then 14×14 fill.
     * Empty: 0x223344 · Blocks 1–4: 0x44cc44 · 5–6: 0xff8800 · 7–8: 0xff2200
     */
    private updateMeter(): void {
        const BLOCK  = 14;
        const OUTLINE = 16;   // 1 px extra each side
        const GAP    = 3;
        const startX = 10;
        const blockY = GAME_HEIGHT - 26;
        const filled = Math.round((this.fish.inflateLevel / FISH_MAX_INFLATE) * 8);

        this.meterGfx.clear();

        for (let i = 0; i < 8; i++) {
            const bx = startX + i * (BLOCK + GAP);

            // Outline
            this.meterGfx.fillStyle(0x000000, 1);
            this.meterGfx.fillRect(bx - 1, blockY - 1, OUTLINE, OUTLINE);

            // Fill
            let color: number;
            if (i < filled) {
                color = i >= 6 ? 0xff2200 : i >= 4 ? 0xff8800 : 0x44cc44;
            } else {
                color = 0x223344;
            }
            this.meterGfx.fillStyle(color, 1);
            this.meterGfx.fillRect(bx, blockY, BLOCK, BLOCK);
        }
    }

    /**
     * Ends the game:
     *  1. Freezes input.
     *  2. Persists score / high-score in the Phaser registry.
     *  3. Plays a shrink + bubble death animation.
     *  4. Transitions to GameOverScene after 800 ms.
     */
    private triggerGameOver(): void {
        if (this.isGameOver) return;
        this.isGameOver = true;

        this.spawnTimer?.remove();
        this.fish.deflate();

        // Persist scores
        this.registry.set('lastScore', this.score);
        const previous = (this.registry.get('highScore') as number | undefined) ?? 0;
        if (this.score > previous) {
            this.registry.set('highScore', this.score);
        }

        // Death animation – shrink the fish
        this.tweens.add({
            targets: this.fish,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 400,
            ease: 'Back.easeIn',
        });

        // Floating gold score popup at the fish position
        const popup = this.add.text(this.fish.x, this.fish.y - 20, String(this.score), {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            color: '#ffdd00',
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: popup,
            y: popup.y - 80,
            alpha: 0,
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => popup.destroy(),
        });

        // Spawn a small burst of bubble particles
        this.spawnDeathBubbles();

        // Navigate to GameOverScene after a short delay
        this.time.delayedCall(800, () => {
            this.scene.start('GameOverScene');
        });
    }

    /** Spawns several bubble images that float upward after death. */
    private spawnDeathBubbles(): void {
        const count = 8;
        for (let i = 0; i < count; i++) {
            const bx = this.fish.x + Phaser.Math.Between(-20, 20);
            const by = this.fish.y + Phaser.Math.Between(-10, 10);
            const bubble = this.add.image(bx, by, 'bubble');
            bubble.setScale(Phaser.Math.FloatBetween(0.5, 1.4));

            this.tweens.add({
                targets: bubble,
                y: by - Phaser.Math.Between(60, 130),
                alpha: 0,
                duration: Phaser.Math.Between(400, 700),
                ease: 'Quad.easeOut',
                onComplete: () => bubble.destroy(),
            });
        }
    }
}
