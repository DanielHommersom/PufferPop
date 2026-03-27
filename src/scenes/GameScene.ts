import Phaser from 'phaser';
import { Preferences } from '@capacitor/preferences';
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

export class GameScene extends Phaser.Scene {
    private parallax!: ParallaxBackground;
    private fish!: PufferFish;
    private obstacles!: Obstacle[];
    private score: number = 0;
    private isGameOver: boolean = false;

    // UI – score display
    private scoreOutlines!: Phaser.GameObjects.Text[];
    private scoreMain!: Phaser.GameObjects.Text;

    // UI – best score
    private bestShadow!: Phaser.GameObjects.Text;
    private bestMain!: Phaser.GameObjects.Text;
    private bestScore: number = 0;

    // UI – inflate meter
    private meterGfx!: Phaser.GameObjects.Graphics;

    // UI – mute button
    private muteGfx!: Phaser.GameObjects.Graphics;
    private muted: boolean = localStorage.getItem('pufferpop_muted') === '1';

    // Input
    private spaceKey!: Phaser.Input.Keyboard.Key;

    // Timer
    private spawnTimer: Phaser.Time.TimerEvent | null = null;

    // Audio
    private audioCtx: AudioContext | null = null;

    constructor() {
        super({ key: 'GameScene' });
    }

    create(): void {
        this.score = 0;
        this.isGameOver = false;
        this.obstacles = [];

        this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(-10);
        this.parallax = new ParallaxBackground(this);
        this.fish = new PufferFish(this, 120, GAME_HEIGHT / 2);

        // ── Score display ──────────────────────────────────────────────────
        const scoreX = GAME_WIDTH / 2;
        const scoreY = 20;
        const pixelFont = '"Press Start 2P"';

        this.scoreOutlines = ([[-3,-3],[3,-3],[-3,3],[3,3]] as [number,number][]).map(([dx,dy]) =>
            this.add.text(scoreX + dx, scoreY + dy, '0', {
                fontFamily: pixelFont, fontSize: '32px', color: '#000000',
            }).setOrigin(0.5, 0).setDepth(20),
        );
        this.scoreMain = this.add.text(scoreX, scoreY, '0', {
            fontFamily: pixelFont, fontSize: '32px', color: '#ffffff',
        }).setOrigin(0.5, 0).setDepth(21);

        // ── Best score ─────────────────────────────────────────────────────
        this.bestScore = (this.registry.get('highScore') as number | undefined) ?? 0;
        const bestX = GAME_WIDTH - 10;
        const bestStr = `BEST:${this.bestScore}`;
        this.bestShadow = this.add.text(bestX + 2, scoreY + 2, bestStr, {
            fontFamily: pixelFont, fontSize: '8px', color: '#000000',
        }).setOrigin(1, 0).setAlpha(0.6).setDepth(10);
        this.bestMain = this.add.text(bestX, scoreY, bestStr, {
            fontFamily: pixelFont, fontSize: '8px', color: '#ffffff',
        }).setOrigin(1, 0).setDepth(11);

        // Load persisted high score in background; update display if higher than registry value
        this.loadHighScore().then(persisted => {
            if (persisted > this.bestScore) {
                this.bestScore = persisted;
                this.registry.set('highScore', persisted);
                this.bestShadow.setText(`Highest Score: ${persisted}`);
                this.bestMain.setText(`Highest Score: ${persisted}`);
            }
        }).catch(() => { /* registry fallback already set above */ });

        // ── Inflate meter ──────────────────────────────────────────────────
        this.add.text(10, GAME_HEIGHT - 44, 'PUFF', {
            fontFamily: pixelFont, fontSize: '8px', color: '#88aabb',
        }).setDepth(20);
        this.meterGfx = this.add.graphics().setDepth(20);

        // ── Mute button (bottom-right) ─────────────────────────────────────
        const muteR = 22;
        const muteCx = GAME_WIDTH - 14 - muteR;
        const muteCy = GAME_HEIGHT - 14 - muteR;
        this.muteGfx = this.add.graphics().setDepth(30);
        this.drawMuteButton(muteCx, muteCy, muteR);
        this.muteGfx.setInteractive(
            new Phaser.Geom.Circle(muteCx, muteCy, muteR),
            Phaser.Geom.Circle.Contains,
        );
        this.muteGfx.on('pointerdown', () => {
            this.muted = !this.muted;
            localStorage.setItem('pufferpop_muted', this.muted ? '1' : '0');
            this.drawMuteButton(muteCx, muteCy, muteR);
        });

        // ── Input ──────────────────────────────────────────────────────────
        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
            if (over.length === 0 && !this.isGameOver) {
                this.fish.inflate();
                this.playPuff();
            }
        });
        this.input.on('pointerup', () => {
            if (!this.isGameOver) this.fish.deflate();
        });

        this.spawnObstacle();
    }

    update(_time: number, delta: number): void {
        if (this.isGameOver) return;

        this.parallax.update(delta);

        if (this.spaceKey.isDown) {
            this.fish.inflate();
        } else if (this.spaceKey.isUp && !this.input.activePointer.isDown) {
            this.fish.deflate();
        }

        this.fish.update();

        const fishR = this.fish.getRadius();
        if (this.fish.y - fishR < 0 || this.fish.y + fishR > GAME_HEIGHT) {
            void this.triggerGameOver();
            return;
        }

        const speed = this.currentSpeed();
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= speed;

            if (!obs.passed && obs.x + 64 < this.fish.x) {
                obs.passed = true;
                this.score++;
                const scoreStr = String(this.score);
                this.scoreOutlines.forEach(t => t.setText(scoreStr));
                this.scoreMain.setText(scoreStr);
                if (this.score > this.bestScore) {
                    this.bestScore = this.score;
                    const bestStr = `BEST:${this.bestScore}`;
                    this.bestShadow.setText(bestStr);
                    this.bestMain.setText(bestStr);
                }
            }

            if (this.circleCollidesRect(obs.getTopRect()) ||
                this.circleCollidesRect(obs.getBottomRect())) {
                void this.triggerGameOver();
                return;
            }

            if (obs.x < -80) {
                obs.destroy();
                this.obstacles.splice(i, 1);
            }
        }

        this.updateMeter();
    }

    /** Loads the persisted high score. Falls back to registry if Preferences unavailable (e.g. browser). */
    private async loadHighScore(): Promise<number> {
        try {
            const { value } = await Preferences.get({ key: 'highScore' });
            return value !== null ? parseInt(value, 10) : 0;
        } catch {
            return (this.registry.get('highScore') as number | undefined) ?? 0;
        }
    }

    /** Saves score to persistent storage if it beats the current high score. */
    private async saveHighScore(score: number): Promise<void> {
        const current = await this.loadHighScore();
        if (score > current) {
            try {
                await Preferences.set({ key: 'highScore', value: String(score) });
            } catch {
                // browser fallback: registry is updated below
            }
            this.registry.set('highScore', score);
        }
    }

    private spawnObstacle(): void {
        if (this.isGameOver) return;
        const gap = this.currentGapSize();
        const margin = gap * 0.55;
        const gapY = Phaser.Math.Between(
            Math.floor(gap / 2 + margin),
            Math.floor(GAME_HEIGHT - gap / 2 - margin),
        );
        this.obstacles.push(new Obstacle(this, GAME_WIDTH + 10, gapY, gap));
        this.spawnTimer = this.time.delayedCall(this.currentSpawnInterval(), this.spawnObstacle, [], this);
    }

    private currentSpawnInterval(): number {
        const t = Math.min(this.score / DIFFICULTY_RAMP_SPAWN, 1);
        return SPAWN_INTERVAL_INITIAL + (SPAWN_INTERVAL_MIN - SPAWN_INTERVAL_INITIAL) * t;
    }

    private currentGapSize(): number {
        const t = Math.min(this.score / DIFFICULTY_RAMP_GAP, 1);
        return Math.round(GAP_SIZE_INITIAL + (GAP_SIZE_MIN - GAP_SIZE_INITIAL) * t);
    }

    private currentSpeed(): number {
        const t = Math.min(this.score / DIFFICULTY_RAMP_SPEED, 1);
        return OBSTACLE_SPEED_INITIAL + (OBSTACLE_SPEED_MAX - OBSTACLE_SPEED_INITIAL) * t;
    }

    private circleCollidesRect(rect: { x: number; y: number; w: number; h: number }): boolean {
        const r = this.fish.getRadius();
        const cx = this.fish.x;
        const cy = this.fish.y;
        const nearX = Phaser.Math.Clamp(cx, rect.x, rect.x + rect.w);
        const nearY = Phaser.Math.Clamp(cy, rect.y, rect.y + rect.h);
        const dx = cx - nearX;
        const dy = cy - nearY;
        return dx * dx + dy * dy < r * r;
    }

    private updateMeter(): void {
        const BLOCK = 14;
        const OUTLINE = 16;
        const GAP = 3;
        const startX = 10;
        const blockY = GAME_HEIGHT - 26;
        const filled = Math.round((this.fish.inflateLevel / FISH_MAX_INFLATE) * 8);
        this.meterGfx.clear();
        for (let i = 0; i < 8; i++) {
            const bx = startX + i * (BLOCK + GAP);
            this.meterGfx.fillStyle(0x000000, 1);
            this.meterGfx.fillRect(bx - 1, blockY - 1, OUTLINE, OUTLINE);
            const color = i < filled
                ? (i >= 6 ? 0xff2200 : i >= 4 ? 0xff8800 : 0x44cc44)
                : 0x223344;
            this.meterGfx.fillStyle(color, 1);
            this.meterGfx.fillRect(bx, blockY, BLOCK, BLOCK);
        }
    }

    // ── Mute button ────────────────────────────────────────────────────────────

    private drawMuteButton(cx: number, cy: number, _r: number): void {
        this.muteGfx.clear();

        // Background circle
        this.muteGfx.fillStyle(0x000000, 0.45);
        this.muteGfx.fillCircle(cx, cy, 22);

        // Speaker body
        const bx = cx - 9;
        const by = cy - 5;
        this.muteGfx.fillStyle(this.muted ? 0x888888 : 0xffffff, 1);
        this.muteGfx.fillRect(bx, by, 6, 10);

        // Speaker horn
        this.muteGfx.fillTriangle(
            bx + 6, by - 3,
            bx + 6, by + 13,
            bx + 14, by + 5,
        );

        if (!this.muted) {
            // Sound waves
            this.muteGfx.lineStyle(2, 0xffffff, 1);
            this.muteGfx.beginPath();
            this.muteGfx.arc(cx + 2, cy, 10, -0.6, 0.6, false);
            this.muteGfx.strokePath();
            this.muteGfx.beginPath();
            this.muteGfx.arc(cx + 2, cy, 15, -0.7, 0.7, false);
            this.muteGfx.strokePath();
        } else {
            // Red ×
            this.muteGfx.lineStyle(2.5, 0xff3333, 1);
            this.muteGfx.lineBetween(cx + 5, cy - 6, cx + 12, cy + 1);
            this.muteGfx.lineBetween(cx + 12, cy - 6, cx + 5, cy + 1);
        }
    }

    // ── Audio ──────────────────────────────────────────────────────────────────

    private getAudioCtx(): AudioContext | null {
        try {
            if (!this.audioCtx) this.audioCtx = new AudioContext();
            if (this.audioCtx.state === 'suspended') void this.audioCtx.resume();
            return this.audioCtx;
        } catch {
            return null;
        }
    }

    private playPuff(): void {
        if (this.muted) return;
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.28, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    }

    private playGameOverSound(): void {
        if (this.muted) return;
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        [392, 311, 233].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            const t = ctx.currentTime + i * 0.18;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
            osc.start(t);
            osc.stop(t + 0.16);
        });
    }

    // ── Game over ──────────────────────────────────────────────────────────────

    private async triggerGameOver(): Promise<void> {
        if (this.isGameOver) return;
        this.isGameOver = true;

        this.spawnTimer?.remove();
        this.fish.deflate();
        this.playGameOverSound();

        this.registry.set('lastScore', this.score);
        await this.saveHighScore(this.score);
        this.registry.set('highScore', await this.loadHighScore());

        this.tweens.add({
            targets: this.fish,
            scaleX: 0, scaleY: 0, alpha: 0,
            duration: 400,
            ease: 'Back.easeIn',
        });

        const popup = this.add.text(this.fish.x, this.fish.y - 20, String(this.score), {
            fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#ffdd00',
        }).setOrigin(0.5).setDepth(20);
        this.tweens.add({
            targets: popup,
            y: popup.y - 80, alpha: 0,
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => popup.destroy(),
        });

        this.spawnDeathBubbles();
        this.time.delayedCall(800, () => { this.scene.start('GameOverScene'); });
    }

    private spawnDeathBubbles(): void {
        for (let i = 0; i < 8; i++) {
            const bx = this.fish.x + Phaser.Math.Between(-20, 20);
            const by = this.fish.y + Phaser.Math.Between(-10, 10);
            const bubble = this.add.image(bx, by, 'bubble');
            bubble.setScale(Phaser.Math.FloatBetween(0.5, 1.4));
            this.tweens.add({
                targets: bubble,
                y: by - Phaser.Math.Between(60, 130), alpha: 0,
                duration: Phaser.Math.Between(400, 700),
                ease: 'Quad.easeOut',
                onComplete: () => bubble.destroy(),
            });
        }
    }
}
