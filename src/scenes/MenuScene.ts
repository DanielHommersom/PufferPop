import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, INFLATE_COLORS } from '../constants';

/**
 * MenuScene – ocean-themed main menu with animated pufferfish, title treatment,
 * inflate-mechanic tutorial panel, coral rock decorations, and floating bubbles.
 *
 * Visual style matches PufferFish.ts and Obstacle.ts:
 *   cartoon outline trick, dark-red coral rocks, orange pufferfish.
 *
 * Layers (back to front):
 *   1. Ocean gradient background + diagonal light rays
 *   2. Coral rock clusters (bottom edge)
 *   3. Floating bubble particles
 *   4. Animated pufferfish (bob + breathe + blink)
 *   5. "PUFFER / POP" title with staggered slide-in
 *   6. Inflate tutorial panel with hold / release indicators (pulse)
 *   7. "TAP TO PLAY" button (idle pulse + press animation)
 */
export class MenuScene extends Phaser.Scene {
    /** Main fish body graphics – receives bob and breathe tweens. */
    private fishGfx!: Phaser.GameObjects.Graphics;
    /** Separate eye graphics so scaleY can be tweened for blinking. */
    private eyeGfx!: Phaser.GameObjects.Graphics;
    /** Frames elapsed since last blink reset. */
    private blinkCounter: number = 0;
    /** Guards against starting a new blink while one is running. */
    private blinking: boolean = false;
    /** Live bubble Graphics objects (positions updated in update()). */
    private bubbles: Phaser.GameObjects.Graphics[] = [];
    /** Baseline x positions for sinusoidal bubble wobble. */
    private bubbleBaseX: number[] = [];
    /** Per-bubble phase offset so each wobbles independently. */
    private bubblePhase: number[] = [];

    constructor() {
        super({ key: 'MenuScene' });
    }

    /**
     * Preload – Press Start 2P is injected via @font-face in index.html;
     * no runtime font load is needed here.
     */
    preload(): void { /* font provided by @font-face in index.html */ }

    /** Build all menu layers, animations, and input bindings. */
    create(): void {
        // Reset ephemeral state so the scene is clean on restart.
        this.bubbles      = [];
        this.bubbleBaseX  = [];
        this.bubblePhase  = [];
        this.blinkCounter = 0;
        this.blinking     = false;

        this.drawBackground();
        this.createCoralDecor();
        this.createBubbles();
        this.createMenuFish();
        this.createTitle();
        this.createTutorialPanel();
        this.createTapButton();
    }

    /** Per-frame: bubble x-wobble and eye-blink timer. */
    update(): void {
        const t = this.time.now * 0.001;
        for (let i = 0; i < this.bubbles.length; i++) {
            this.bubbles[i].x = this.bubbleBaseX[i] + Math.sin(t + this.bubblePhase[i]) * 15;
        }

        this.blinkCounter++;
        if (this.blinkCounter >= 200 && !this.blinking) {
            this.blinking = true;
            this.tweens.add({
                targets:  this.eyeGfx,
                scaleY:   0.1,
                duration: 60,
                ease:     'Sine.easeIn',
                yoyo:     true,
                onComplete: () => {
                    this.blinking     = false;
                    this.blinkCounter = 0;
                },
            });
        }
    }

    /** Kill all tweens on scene shutdown to prevent memory leaks. */
    shutdown(): void {
        this.tweens.killAll();
    }

    // ── Background ─────────────────────────────────────────────────────────────

    /**
     * Draws the three-band ocean gradient and four diagonal light-ray trapezoids.
     * Each ray is thin at the top (8 px) and wide at the bottom (40 px).
     */
    private drawBackground(): void {
        const gfx = this.add.graphics();

        // Top band (shallow water)
        gfx.fillStyle(0x4ec0ca, 1);
        gfx.fillRect(0, 0, GAME_WIDTH, Math.ceil(GAME_HEIGHT * 0.6));

        // Mid band
        gfx.fillStyle(0x2a8a9a, 1);
        gfx.fillRect(
            0, Math.floor(GAME_HEIGHT * 0.6),
            GAME_WIDTH, Math.ceil(GAME_HEIGHT * 0.85 - GAME_HEIGHT * 0.6),
        );

        // Deep band
        gfx.fillStyle(0x0d3a5c, 1);
        gfx.fillRect(
            0, Math.floor(GAME_HEIGHT * 0.85),
            GAME_WIDTH, Math.ceil(GAME_HEIGHT * 0.15),
        );

        // Light rays – diagonal trapezoids, 15 % alpha
        const rayGfx  = this.add.graphics();
        const rayBotY = GAME_HEIGHT * 0.55;
        for (const rx of [200, 320, 420, 560]) {
            rayGfx.fillStyle(0x5dd4de, 0.15);
            rayGfx.fillPoints(
                [
                    { x: rx - 4,  y: 0       },
                    { x: rx + 4,  y: 0       },
                    { x: rx + 20, y: rayBotY },
                    { x: rx - 20, y: rayBotY },
                ],
                true,
            );
        }
    }

    // ── Coral decorations ──────────────────────────────────────────────────────

    /**
     * Draws three coral rock clusters along the bottom edge using the same
     * dark-red outline-trick style as Obstacle.ts.
     */
    private createCoralDecor(): void {
        const gfx = this.add.graphics();
        this.drawCoralCluster(gfx,  60,              GAME_HEIGHT - 40, 80, 60);
        this.drawCoralCluster(gfx,  GAME_WIDTH / 2,  GAME_HEIGHT - 30, 60, 45);
        this.drawCoralCluster(gfx,  GAME_WIDTH - 60, GAME_HEIGHT - 40, 80, 60);
    }

    /**
     * Draws a single coral cluster of three irregular blocks.
     * Outline trick: each block drawn in black first (3 px expanded), then filled.
     *
     * @param gfx   Target Graphics object.
     * @param cx    Horizontal centre of the cluster.
     * @param baseY Bottom y of the cluster (blocks grow upward from here).
     * @param w     Total width budget for the cluster.
     * @param h     Maximum height of the tallest block.
     */
    private drawCoralCluster(
        gfx:   Phaser.GameObjects.Graphics,
        cx:    number,
        baseY: number,
        w:     number,
        h:     number,
    ): void {
        const blocks: [number, number, number, number][] = [
            [cx - w * 0.40, baseY - h * 0.85, w * 0.38, h * 0.85],
            [cx - w * 0.08, baseY - h,        w * 0.40, h       ],
            [cx + w * 0.12, baseY - h * 0.75, w * 0.35, h * 0.75],
        ];

        // Pass 1: black outline
        gfx.fillStyle(0x000000, 1);
        for (const [bx, by, bw, bh] of blocks) {
            gfx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
        }
        // Pass 2: coral fill
        gfx.fillStyle(0x8b2020, 1);
        for (const [bx, by, bw, bh] of blocks) {
            gfx.fillRect(bx, by, bw, bh);
        }
    }

    // ── Floating bubbles ───────────────────────────────────────────────────────

    /**
     * Spawns 8 bubble Graphics objects that float upward continuously.
     * Horizontal wobble is applied in update() via a per-bubble sin offset.
     */
    private createBubbles(): void {
        for (let i = 0; i < 8; i++) {
            const bx = Phaser.Math.Between(20, GAME_WIDTH - 20);
            const r  = Phaser.Math.Between(6, 16);

            const bGfx = this.add.graphics({ x: bx, y: GAME_HEIGHT + 20 });
            // Outline
            bGfx.fillStyle(0x000000, 1);
            bGfx.fillCircle(0, 0, r + 2);
            // Fill – 20 % white for a translucent soap-bubble look
            bGfx.fillStyle(0xffffff, 0.20);
            bGfx.fillCircle(0, 0, r);

            this.bubbles.push(bGfx);
            this.bubbleBaseX.push(bx);
            this.bubblePhase.push(Math.random() * Math.PI * 2);

            this.tweens.add({
                targets:  bGfx,
                y:        -20,
                duration: Phaser.Math.Between(3000, 6000),
                delay:    Phaser.Math.Between(0, 3000),
                repeat:   -1,
                ease:     'Linear',
            });
        }
    }

    // ── Menu fish ──────────────────────────────────────────────────────────────

    /**
     * Creates the animated pufferfish and attaches bob, breathe, and blink tweens.
     * The fish body and eye are separate Graphics objects so the eye scaleY
     * can be tweened independently for the blink effect.
     */
    private createMenuFish(): void {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT * 0.28;
        const r  = 52;

        this.fishGfx = this.add.graphics({ x: cx, y: cy });
        this.drawStaticFishBody(this.fishGfx, r);

        // Eye positioned at the fish's eye offset in world space
        this.eyeGfx = this.add.graphics({ x: cx + r * 0.5, y: cy - r * 0.25 });
        this.drawEye(this.eyeGfx, r);

        // Bob: fish + eye move together to stay in sync
        this.tweens.add({
            targets:  [this.fishGfx, this.eyeGfx],
            y:        '+=14',
            yoyo:     true,
            duration: 1100,
            ease:     'Sine.easeInOut',
            repeat:   -1,
        });

        // Breathe: body squishes slightly; eye floats at its own size
        this.tweens.add({
            targets:  this.fishGfx,
            scaleX:   1.06,
            scaleY:   0.96,
            duration: 1800,
            ease:     'Sine.easeInOut',
            yoyo:     true,
            repeat:   -1,
        });
    }

    /**
     * Draws the fish body (tail + ellipse + belly + specular + spines)
     * centered at (0, 0) of the given Graphics object.
     * Matches the inflate-level style from PufferFish.ts (fully inflated look).
     *
     * @param gfx Target Graphics to draw into.
     * @param r   Body radius in pixels.
     */
    private drawStaticFishBody(gfx: Phaser.GameObjects.Graphics, r: number): void {
        const tailBaseX = -(r * 1.05);
        const tailHalfH = r * 0.55;
        const tailDepth = r * 0.55;

        // Tail – outline then dark-orange fill
        gfx.fillStyle(0x000000, 1);
        gfx.fillTriangle(
            tailBaseX + 3, -tailHalfH - 3,
            tailBaseX + 3,  tailHalfH + 3,
            tailBaseX - tailDepth - 3, 0,
        );
        gfx.fillStyle(0xf4921a, 1);
        gfx.fillTriangle(
            tailBaseX, -tailHalfH,
            tailBaseX,  tailHalfH,
            tailBaseX - tailDepth, 0,
        );

        // Body outline
        gfx.fillStyle(0x000000, 1);
        gfx.fillCircle(0, 0, r + 3);
        // Body fill
        gfx.fillStyle(INFLATE_COLORS.safe, 1);
        gfx.fillEllipse(0, 0, r * 2.2, r * 1.9);
        // Belly highlight
        const belly = Phaser.Display.Color.IntegerToColor(INFLATE_COLORS.safe).lighten(25).color;
        gfx.fillStyle(belly, 1);
        gfx.fillEllipse(r * 0.1, r * 0.3, r * 1.1, r * 0.7);
        // Specular
        gfx.fillStyle(0xffffff, 0.60);
        gfx.fillEllipse(-r * 0.25, -r * 0.35, r * 0.7, r * 0.45);

        // Spines – 8 directions, outline trick
        const spineH = 10;
        const halfW  = 3;
        const dirs: [number, number][] = [
            [ 1,  0], [-1,  0], [ 0,  1], [ 0, -1],
            [ 1,  1], [ 1, -1], [-1,  1], [-1, -1],
        ];
        for (const [nx, ny] of dirs) {
            const len = Math.sqrt(nx * nx + ny * ny);
            const ux  = nx / len;
            const uy  = ny / len;
            const px  = -uy;
            const py  =  ux;
            const bx  = ux * r * 1.05;
            const by  = uy * r * 1.05;
            const tx  = ux * (r * 1.05 + spineH);
            const ty  = uy * (r * 1.05 + spineH);

            gfx.fillStyle(0x000000, 1);
            gfx.fillTriangle(
                bx + px * (halfW + 2), by + py * (halfW + 2),
                bx - px * (halfW + 2), by - py * (halfW + 2),
                tx + ux * 2,           ty + uy * 2,
            );
            gfx.fillStyle(0xffffff, 1);
            gfx.fillTriangle(
                bx + px * halfW, by + py * halfW,
                bx - px * halfW, by - py * halfW,
                tx, ty,
            );
        }
    }

    /**
     * Draws a full cartoon eye centered at (0, 0) of the given Graphics object.
     * Layers: black outline → white sclera → blue iris → dark pupil → specular dot.
     *
     * @param gfx Target eye Graphics (positioned at the eye's world location).
     * @param r   Fish body radius used to derive proportional sizes.
     */
    private drawEye(gfx: Phaser.GameObjects.Graphics, r: number): void {
        const eyeR = r * 0.32;
        gfx.fillStyle(0x000000, 1);
        gfx.fillCircle(0, 0, eyeR + 3);
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(0, 0, eyeR);
        gfx.fillStyle(0x4a90d9, 1);
        gfx.fillCircle(r * 0.04, r * 0.03, eyeR * 0.55);
        gfx.fillStyle(0x000000, 1);
        gfx.fillCircle(r * 0.07, r * 0.05, eyeR * 0.34);
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(r * 0.02, -r * 0.01, Math.max(2, eyeR * 0.19));
    }

    // ── Title ──────────────────────────────────────────────────────────────────

    /**
     * Adds "PUFFER" and "POP" on separate lines.
     * Both start alpha:0 / y+30 px and slide up via Back.easeOut.
     * "POP" is delayed by 200 ms to stagger the entrance.
     */
    private createTitle(): void {
        const cx        = GAME_WIDTH / 2;
        const pufferY   = GAME_HEIGHT * 0.48;
        const popY      = GAME_HEIGHT * 0.56;
        const pixelFont = '"Press Start 2P", monospace';

        const puffer = this.add.text(cx, pufferY + 30, 'PUFFERFISH', {
            fontFamily: pixelFont,
            fontSize:   '42px',
            color:      '#ffffff',
            stroke:     '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5).setAlpha(0);

        const pop = this.add.text(cx, popY + 30, 'RUN', {
            fontFamily: pixelFont,
            fontSize:   '58px',
            color:      '#f4a832',
            stroke:     '#000000',
            strokeThickness: 10,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({ targets: puffer, alpha: 1, y: pufferY, duration: 600, ease: 'Back.easeOut' });
        this.tweens.add({ targets: pop,    alpha: 1, y: popY,    duration: 600, delay: 200, ease: 'Back.easeOut' });
    }

    // ── Tutorial panel ─────────────────────────────────────────────────────────

    /**
     * Draws the inflate-mechanic tutorial panel showing HOLD (inflate) on the
     * left and RELEASE (deflate) on the right, separated by a vertical divider.
     * The panel is held in a Container so scale tweens pivot from its centre.
     */
    private createTutorialPanel(): void {
        const cx        = GAME_WIDTH / 2;
        const PANEL_W   = 280;
        const PANEL_H   = 72;
        const panelTopY = GAME_HEIGHT * 0.65;
        const panelMidY = panelTopY + PANEL_H / 2;
        const pixelFont = '"Press Start 2P", monospace';

        // Container centred on the panel — scale tweens pivot from this point.
        const cont = this.add.container(cx, panelMidY);

        const gfx = this.add.graphics();
        cont.add(gfx);

        // Panel outline (3 px)
        gfx.fillStyle(0x000000, 1);
        gfx.fillRoundedRect(-PANEL_W / 2 - 3, -PANEL_H / 2 - 3, PANEL_W + 6, PANEL_H + 6, 15);
        // Panel fill
        gfx.fillStyle(0x0a2a4a, 1);
        gfx.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 12);
        // Centre divider
        gfx.fillStyle(0x334466, 1);
        gfx.fillRect(-1, -PANEL_H / 2 + 8, 2, PANEL_H - 16);

        // HOLD side: inflated fish (r:14) at local (-70, -14)
        gfx.fillStyle(0x000000, 1);
        gfx.fillCircle(-70, -14, 17);
        gfx.fillStyle(INFLATE_COLORS.safe, 1);
        gfx.fillEllipse(-70, -14, 14 * 2.2, 14 * 1.9);

        // RELEASE side: deflated fish (r:8) at local (70, -14)
        gfx.fillStyle(0x000000, 1);
        gfx.fillCircle(70, -14, 10);
        gfx.fillStyle(INFLATE_COLORS.safe, 1);
        gfx.fillEllipse(70, -14, 8 * 2.2, 8 * 1.9);

        const addText = (lx: number, ly: number, str: string, size: string): void => {
            const t = this.add.text(lx, ly, str, {
                fontFamily: pixelFont, fontSize: size, color: '#ffffff',
            }).setOrigin(0.5);
            cont.add(t);
        };

        addText(-70,  6, '▲',       '10px');
        addText( 70,  6, '▼',       '10px');
        addText(-70, 21, 'HOLD',    '8px');
        addText( 70, 21, 'RELEASE', '8px');

        // Gentle pulse to draw the eye
        this.tweens.add({
            targets: cont, scaleX: 1.03, scaleY: 1.03,
            duration: 900, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        });
    }

    // ── Tap-to-play button ─────────────────────────────────────────────────────

    /**
     * Creates the "TAP TO PLAY" button inside a Container so the idle-pulse and
     * press-squish tweens both scale from the button's visual centre.
     * Any tap anywhere on screen triggers the start-game sequence.
     */
    private createTapButton(): void {
        const cx      = GAME_WIDTH / 2;
        const BTN_W   = 300;
        const BTN_H   = 68;
        const btnMidY = GAME_HEIGHT * 0.78 + BTN_H / 2;
        const pixelFont = '"Press Start 2P", monospace';

        const cont = this.add.container(cx, btnMidY);

        const gfx = this.add.graphics();
        cont.add(gfx);

        // Drop shadow
        gfx.fillStyle(0x000000, 1);
        gfx.fillRoundedRect(-BTN_W / 2 + 5, -BTN_H / 2 + 5, BTN_W, BTN_H, 16);
        // Outline
        gfx.fillStyle(0x000000, 1);
        gfx.fillRoundedRect(-BTN_W / 2 - 3, -BTN_H / 2 - 3, BTN_W + 6, BTN_H + 6, 17);
        // Fill
        gfx.fillStyle(0xf4a832, 1);
        gfx.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 14);
        // Top highlight strip at 50 % alpha
        gfx.fillStyle(0xf7c45a, 0.5);
        gfx.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, 20, 14);

        const label = this.add.text(0, 0, 'TAP TO PLAY', {
            fontFamily: pixelFont, fontSize: '16px', color: '#000000',
        }).setOrigin(0.5);
        cont.add(label);

        // Idle pulse
        this.tweens.add({
            targets: cont, scaleX: 1.04, scaleY: 1.04,
            duration: 700, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        });

        // Any tap: brief squish → start game
        this.input.once('pointerdown', () => {
            this.tweens.killAll();
            this.tweens.add({
                targets: cont, scaleX: 0.94, scaleY: 0.94,
                duration: 80, ease: 'Sine.easeOut', yoyo: true,
                onComplete: () => this.startGame(),
            });
        });
        this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Triggers the scene transition with a white camera flash.
     * All tweens are stopped first to prevent stale callbacks after the scene ends.
     */
    private startGame(): void {
        this.tweens.killAll();
        this.cameras.main.flash(200, 255, 255, 255);
        this.time.delayedCall(200, () => this.scene.start('GameScene'));
    }
}
