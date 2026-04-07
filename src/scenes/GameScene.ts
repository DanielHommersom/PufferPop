import Phaser from 'phaser';
import { Preferences } from '@capacitor/preferences';
import { AdMob, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { AppTrackingTransparency } from '@capgo/capacitor-app-tracking-transparency';
import { Capacitor } from '@capacitor/core';
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
    private muted: boolean = localStorage.getItem('pufferfishrun_muted') === '1';

    // Input
    private spaceKey!: Phaser.Input.Keyboard.Key;

    // Danger ring
    private dangerRing!: Phaser.GameObjects.Graphics;
    private dangerRingTween?: Phaser.Tweens.Tween;

    // Timer
    private spawnTimer: Phaser.Time.TimerEvent | null = null;

    // Audio
    private audioCtx: AudioContext | null = null;

    // Ads – persists across scene restarts (Phaser reuses the same instance)
    private deathCount: number = 0;
    private adInitialized: boolean = false;
    private adReady: boolean = false;

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

        this.dangerRing = this.add.graphics();
        this.dangerRing.setDepth(5); // above background, below UI

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
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 48, 'PUFF LEVEL', {
            fontFamily: pixelFont, fontSize: '7px', color: '#88aabb',
        }).setOrigin(0.5, 0).setDepth(10);
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
            localStorage.setItem('pufferfishrun_muted', this.muted ? '1' : '0');
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
        void this.initAdMob();
    }

    update(_time: number, delta: number): void {
        if (this.isGameOver) return;

        this.parallax.update(delta);

        if (this.spaceKey.isDown) {
            this.fish.inflate();
        } else if (this.spaceKey.isUp && !this.input.activePointer.isDown) {
            this.fish.deflate();
        }

        this.fish.update(delta);
        this.updateDangerRing();

        const fishR = this.fish.getRadius();
        if (this.fish.y - fishR < 0 || this.fish.y + fishR > GAME_HEIGHT) {
            void this.triggerGameOver();
            return;
        }

        const speed = this.currentSpeed() * (delta / 16.667);
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

    /** Initialises AdMob once per app session and preloads the first interstitial. */
    private async initAdMob(): Promise<void> {
        if (this.adInitialized) {
            if (!this.adReady) void this.prepareAd();
            return;
        }
        try {
            if (Capacitor.getPlatform() === 'ios') {
                await AppTrackingTransparency.requestPermission();
            }
            await AdMob.initialize({ initializeForTesting: false });
            this.adInitialized = true;
            await this.prepareAd();
        } catch {
            // AdMob unavailable (browser / simulator) — silently skip
        }
    }

    /** Preloads the next interstitial ad so it's ready to show instantly. */
    private async prepareAd(): Promise<void> {
        try {
            await AdMob.prepareInterstitial({
                adId: 'ca-app-pub-3366446717708247~6010209537', // ← replace before release
            });
            this.adReady = true;
        } catch {
            this.adReady = false;
        }
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
        // 8 blocks × 16 px wide + 7 gaps × 4 px = 156 px total, centred
        const BLOCK_W = 16;
        const BLOCK_H = 14;
        const GAP     = 4;
        const startX  = Math.round(GAME_WIDTH / 2 - (8 * BLOCK_W + 7 * GAP) / 2);
        const blockY  = GAME_HEIGHT - 32;
        const filled  = Math.round((this.fish.inflateLevel / FISH_MAX_INFLATE) * 8);

        this.meterGfx.clear();
        for (let i = 0; i < 8; i++) {
            const bx = startX + i * (BLOCK_W + GAP);

            // Black outline (1 px larger on each side)
            this.meterGfx.fillStyle(0x000000, 1);
            this.meterGfx.fillRect(bx - 1, blockY - 1, BLOCK_W + 2, BLOCK_H + 2);

            // Block fill — colour changes by tier
            const color = i < filled
                ? (i >= 6 ? 0xff2200 : i >= 4 ? 0xff8800 : 0x44cc44)
                : 0x223344;
            this.meterGfx.fillStyle(color, 1);
            this.meterGfx.fillRect(bx, blockY, BLOCK_W, BLOCK_H);
        }
    }

    // ── Mute button ────────────────────────────────────────────────────────────

    private drawMuteButton(cx: number, cy: number, _r: number): void {
        this.muteGfx.clear();

        // Background circle
        this.muteGfx.fillStyle(0x000000, 0.45);
        this.muteGfx.fillCircle(cx, cy, 22);

        const color = this.muted ? 0x888888 : 0xffffff;
        this.muteGfx.fillStyle(color, 1);

        // Speaker body (rect, left side)
        this.muteGfx.fillRect(cx - 12, cy - 4, 5, 8);

        // Speaker cone (trapezoid: narrow at body, wide at mouth)
        // Left edge matches body right edge: x=cx-7, y=cy±4
        // Right (mouth) edge: x=cx+3, y=cy±8
        this.muteGfx.fillTriangle(
            cx - 7, cy - 4,
            cx - 7, cy + 4,
            cx + 3, cy + 8,
        );
        this.muteGfx.fillTriangle(
            cx - 7, cy - 4,
            cx + 3, cy + 8,
            cx + 3, cy - 8,
        );

        if (!this.muted) {
            // Sound wave arcs centered at the cone mouth (cx+3)
            this.muteGfx.lineStyle(2, 0xffffff, 1);
            this.muteGfx.beginPath();
            this.muteGfx.arc(cx + 3, cy, 6, -0.6, 0.6, false);
            this.muteGfx.strokePath();
            this.muteGfx.beginPath();
            this.muteGfx.arc(cx + 3, cy, 11, -0.65, 0.65, false);
            this.muteGfx.strokePath();
        } else {
            // Red × to the right of the cone
            this.muteGfx.lineStyle(2.5, 0xff3333, 1);
            this.muteGfx.lineBetween(cx + 6, cy - 7, cx + 14, cy + 1);
            this.muteGfx.lineBetween(cx + 14, cy - 7, cx + 6, cy + 1);
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
        const t = ctx.currentTime;
        const dur = 0.22;

        // Body tone – low pitch sweeping up, like air filling a balloon
        const body = ctx.createOscillator();
        const bodyGain = ctx.createGain();
        body.connect(bodyGain);
        bodyGain.connect(ctx.destination);
        body.type = 'sine';
        body.frequency.setValueAtTime(80, t);
        body.frequency.exponentialRampToValueAtTime(260, t + dur);
        bodyGain.gain.setValueAtTime(0.0, t);
        bodyGain.gain.linearRampToValueAtTime(0.32, t + 0.04);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        body.start(t);
        body.stop(t + dur);

        // Bubble pop overtone – short mid blip at the end
        const pop = ctx.createOscillator();
        const popGain = ctx.createGain();
        pop.connect(popGain);
        popGain.connect(ctx.destination);
        pop.type = 'sine';
        pop.frequency.setValueAtTime(520, t + dur - 0.04);
        pop.frequency.exponentialRampToValueAtTime(320, t + dur + 0.05);
        popGain.gain.setValueAtTime(0.0, t + dur - 0.04);
        popGain.gain.linearRampToValueAtTime(0.18, t + dur);
        popGain.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05);
        pop.start(t + dur - 0.04);
        pop.stop(t + dur + 0.06);
    }

    private playGameOverSound(): void {
        if (this.muted) return;
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const t = ctx.currentTime;

        // Sharp thud – low-frequency body impact of the pop
        const thud = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thud.connect(thudGain);
        thudGain.connect(ctx.destination);
        thud.type = 'sine';
        thud.frequency.setValueAtTime(180, t);
        thud.frequency.exponentialRampToValueAtTime(40, t + 0.18);
        thudGain.gain.setValueAtTime(0.7, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        thud.start(t);
        thud.stop(t + 0.18);

        // Burst of noise – the actual "pop" of the skin splitting
        const bufSize = Math.ceil(ctx.sampleRate * 0.08);
        const noiseBuffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const burst = ctx.createBufferSource();
        burst.buffer = noiseBuffer;
        const burstFilter = ctx.createBiquadFilter();
        burstFilter.type = 'lowpass';
        burstFilter.frequency.value = 1800;
        const burstGain = ctx.createGain();
        burstGain.gain.setValueAtTime(0.6, t);
        burstGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        burst.connect(burstFilter);
        burstFilter.connect(burstGain);
        burstGain.connect(ctx.destination);
        burst.start(t);
        burst.stop(t + 0.08);

        // Deflation wheeze – pitch falling fast, like air escaping
        const wheeze = ctx.createOscillator();
        const wheezeGain = ctx.createGain();
        wheeze.connect(wheezeGain);
        wheezeGain.connect(ctx.destination);
        wheeze.type = 'sawtooth';
        wheeze.frequency.setValueAtTime(340, t + 0.05);
        wheeze.frequency.exponentialRampToValueAtTime(60, t + 0.45);
        wheezeGain.gain.setValueAtTime(0.0, t + 0.05);
        wheezeGain.gain.linearRampToValueAtTime(0.18, t + 0.1);
        wheezeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        wheeze.start(t + 0.05);
        wheeze.stop(t + 0.46);
    }

    // ── Game over ──────────────────────────────────────────────────────────────

    private async triggerGameOver(): Promise<void> {
        if (this.isGameOver) return;
        this.isGameOver = true;

        this.dangerRingTween?.stop();
        this.dangerRing.clear();

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

        this.deathCount++;
        const showAd = this.adReady && this.deathCount % 3 === 0;

        if (showAd) {
            this.adReady = false;
            this.time.delayedCall(800, () => {
                void (async () => {
                    // Cast needed: plugin v8 types are missing the Dismissed overload
                    const handle = await AdMob.addListener(
                        InterstitialAdPluginEvents.Dismissed as unknown as InterstitialAdPluginEvents.Showed,
                        () => {
                            void handle.remove();
                            void this.prepareAd();
                            this.scene.start('GameOverScene');
                        },
                    );
                    try {
                        await AdMob.showInterstitial();
                    } catch {
                        // Ad not available (no network, simulator, etc.) — fall through
                        void handle.remove();
                        this.scene.start('GameOverScene');
                    }
                })();
            });
        } else {
            this.time.delayedCall(800, () => { this.scene.start('GameOverScene'); });
        }
    }

    // ── Danger ring ────────────────────────────────────────────────────────────

    /**
     * Redraws the danger ring around the fish every frame.
     *
     * Tier thresholds (based on inflateLevel / FISH_MAX_INFLATE):
     *   < 0.35  — no ring (screen stays clean at low inflate)
     *   0.35–0.60 — subtle white ring, no pulse
     *   0.60–0.80 — orange ring, slow pulse (380 ms)
     *   0.80–1.00 — red double ring, fast pulse (160 ms)
     *
     * The ring is redrawn at fish.x / fish.y each frame so it follows
     * the fish exactly without a position tween.
     * Pulse tweens are started lazily and stopped when the tier drops.
     */
    private updateDangerRing(): void {
        this.dangerRing.clear();

        const ratio = this.fish.inflateLevel / FISH_MAX_INFLATE;
        if (ratio < 0.35) {
            this.dangerRingTween?.stop();
            this.dangerRing.setAlpha(1);
            return;
        }

        const r = this.fish.getRadius();
        const x = this.fish.x;
        const y = this.fish.y;

        if (ratio >= 0.80) {
            // Outer ring — black shadow then red fill
            this.dangerRing.lineStyle(6, 0x000000, 0.6);
            this.dangerRing.strokeCircle(x, y, r + 10);
            this.dangerRing.lineStyle(4, 0xff2200, 0.9);
            this.dangerRing.strokeCircle(x, y, r + 10);

            // Inner ring
            this.dangerRing.lineStyle(4, 0x000000, 0.4);
            this.dangerRing.strokeCircle(x, y, r + 5);
            this.dangerRing.lineStyle(2, 0xff6600, 0.7);
            this.dangerRing.strokeCircle(x, y, r + 5);

            // Fast pulse — restart if not already running at this speed
            if (!this.dangerRingTween || !this.dangerRingTween.isPlaying()) {
                this.dangerRingTween = this.tweens.add({
                    targets:  this.dangerRing,
                    alpha:    { from: 1, to: 0.3 },
                    duration: 160,
                    yoyo:     true,
                    repeat:   -1,
                    ease:     'Sine.easeInOut',
                });
            }

        } else if (ratio >= 0.60) {
            // Orange warning ring
            this.dangerRing.lineStyle(5, 0x000000, 0.5);
            this.dangerRing.strokeCircle(x, y, r + 8);
            this.dangerRing.lineStyle(3, 0xff8800, 0.8);
            this.dangerRing.strokeCircle(x, y, r + 8);

            // Slow pulse
            if (!this.dangerRingTween || !this.dangerRingTween.isPlaying()) {
                this.dangerRingTween = this.tweens.add({
                    targets:  this.dangerRing,
                    alpha:    { from: 1, to: 0.5 },
                    duration: 380,
                    yoyo:     true,
                    repeat:   -1,
                    ease:     'Sine.easeInOut',
                });
            }

        } else {
            // Subtle white ring (ratio 0.35–0.60)
            this.dangerRingTween?.stop();
            this.dangerRing.setAlpha(1);
            this.dangerRing.lineStyle(3, 0x000000, 0.3);
            this.dangerRing.strokeCircle(x, y, r + 6);
            this.dangerRing.lineStyle(2, 0xffffff, 0.4);
            this.dangerRing.strokeCircle(x, y, r + 6);
        }
    }

    /** Clean up the danger ring on scene shutdown to prevent memory leaks. */
    shutdown(): void {
        this.dangerRingTween?.stop();
        this.dangerRing?.destroy();
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
