import Phaser from 'phaser';
import { PufferFish } from '../objects/PufferFish';
import { Obstacle } from '../objects/Obstacle';
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    GAP_SIZE_INITIAL,
    GAP_SIZE_MIN,
    OBSTACLE_SPEED_INITIAL,
    OBSTACLE_SPEED_MAX,
    SPAWN_INTERVAL_INITIAL,
    DIFFICULTY_RAMP_SCORE,
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
    private fish!: PufferFish;
    private obstacles!: Obstacle[];
    private score: number = 0;
    private isGameOver: boolean = false;

    // UI elements
    private scoreText!: Phaser.GameObjects.Text;
    private meterBg!: Phaser.GameObjects.Rectangle;
    private meterFill!: Phaser.GameObjects.Rectangle;

    // Input
    private spaceKey!: Phaser.Input.Keyboard.Key;

    // Timer
    private spawnTimer!: Phaser.Time.TimerEvent;

    constructor() {
        super({ key: 'GameScene' });
    }

    create(): void {
        this.score = 0;
        this.isGameOver = false;
        this.obstacles = [];

        // Background
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'background');

        // Player fish
        this.fish = new PufferFish(this, 120, GAME_HEIGHT / 2);

        // Score display
        this.scoreText = this.add.text(GAME_WIDTH / 2, 30, '0', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#0a1a3a',
            strokeThickness: 5,
        });
        this.scoreText.setOrigin(0.5, 0);
        this.scoreText.setDepth(10);

        // ── Inflate meter UI ──────────────────────────────────────────────
        const meterX = 10;
        const meterY = GAME_HEIGHT - 24;
        const meterMaxW = 120;
        const meterH = 14;

        // Background track
        this.meterBg = this.add.rectangle(meterX, meterY, meterMaxW, meterH, 0x223344);
        this.meterBg.setOrigin(0, 0);
        this.meterBg.setDepth(10);

        // Foreground fill (starts at 0 width)
        this.meterFill = this.add.rectangle(meterX, meterY, 0, meterH, 0x44ff44);
        this.meterFill.setOrigin(0, 0);
        this.meterFill.setDepth(11);

        // Meter label
        this.add.text(meterX, meterY - 16, 'OPBLAZEN', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '11px',
            color: '#aabbcc',
        }).setDepth(10);

        // ── Input ─────────────────────────────────────────────────────────
        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.input.on('pointerdown', () => {
            if (!this.isGameOver) this.fish.inflate();
        });
        this.input.on('pointerup', () => {
            if (!this.isGameOver) this.fish.deflate();
        });

        // ── Obstacle spawn timer ──────────────────────────────────────────
        this.spawnTimer = this.time.addEvent({
            delay: SPAWN_INTERVAL_INITIAL,
            callback: this.spawnObstacle,
            callbackScope: this,
            loop: true,
        });

        // Spawn one immediately so the player isn't staring at a blank screen
        this.spawnObstacle();
    }

    /** Main game loop – called every frame. */
    update(): void {
        if (this.isGameOver) return;

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
                this.scoreText.setText(String(this.score));
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

    /** Spawns a new obstacle at the right edge with a random gap position. */
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
    }

    /**
     * Returns the gap size for the current score, linearly interpolated from
     * GAP_SIZE_INITIAL down to GAP_SIZE_MIN over DIFFICULTY_RAMP_SCORE points.
     */
    private currentGapSize(): number {
        const t = Math.min(this.score / DIFFICULTY_RAMP_SCORE, 1);
        return Math.round(GAP_SIZE_INITIAL + (GAP_SIZE_MIN - GAP_SIZE_INITIAL) * t);
    }

    /**
     * Returns the obstacle speed for the current score, linearly interpolated
     * from OBSTACLE_SPEED_INITIAL up to OBSTACLE_SPEED_MAX over DIFFICULTY_RAMP_SCORE points.
     */
    private currentSpeed(): number {
        const t = Math.min(this.score / DIFFICULTY_RAMP_SCORE, 1);
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

    /** Redraws the inflate meter fill width and colour every frame. */
    private updateMeter(): void {
        const ratio = this.fish.inflateLevel / FISH_MAX_INFLATE;
        const maxW = 120;
        this.meterFill.width = ratio * maxW;

        if (ratio >= 0.8) {
            this.meterFill.setFillStyle(0xff3300);
        } else if (ratio >= 0.5) {
            this.meterFill.setFillStyle(0xff8800);
        } else {
            this.meterFill.setFillStyle(0x44ff44);
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

        this.spawnTimer.remove();
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
