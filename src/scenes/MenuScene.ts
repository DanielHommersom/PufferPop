import Phaser from 'phaser';
import { Preferences } from '@capacitor/preferences';
import { GAME_WIDTH, GAME_HEIGHT, INFLATE_COLORS } from '../constants';
import { SKINS, SkinRenderer } from '../objects/SkinRenderer';
import type { SkinDefinition } from '../objects/SkinRenderer';

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
    async create(): Promise<void> {
        // Reset ephemeral state so the scene is clean on restart.
        this.bubbles     = [];
        this.bubbleBaseX = [];
        this.bubblePhase = [];

        // Load selected skin before drawing the preview fish
        const savedId = await this.loadSelectedSkin();
        const skin    = SKINS.find(s => s.id === savedId) ?? SKINS[0];

        this.drawBackground();
        this.createCoralDecor();
        this.createBubbles();
        this.createMenuFish(skin);
        this.createTitle();
        this.createTutorialPanel();
        this.createTapButton();
        this.createSelectSkinButton();

        // Refresh fish preview when returning from SkinSelectScene
        this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    }

    /** Per-frame: bubble x-wobble. */
    update(): void {
        const t = this.time.now * 0.001;
        for (let i = 0; i < this.bubbles.length; i++) {
            this.bubbles[i].x = this.bubbleBaseX[i] + Math.sin(t + this.bubblePhase[i]) * 15;
        }
    }

    /** Kill all tweens on scene shutdown to prevent memory leaks. */
    shutdown(): void {
        this.tweens.killAll();
        this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
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
     * Creates the animated pufferfish preview using the supplied skin.
     * Attaches bob and breathe tweens. SkinRenderer draws everything into a
     * single Graphics object so there is no separate eye layer.
     *
     * @param skin Active skin to render on the preview fish.
     */
    private createMenuFish(skin: SkinDefinition): void {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT * 0.28;
        const r  = 52;

        this.fishGfx = this.add.graphics({ x: cx, y: cy });
        SkinRenderer.draw(this.fishGfx, skin, r, 8);

        // Bob
        this.tweens.add({
            targets:  this.fishGfx,
            y:        '+=14',
            yoyo:     true,
            duration: 1100,
            ease:     'Sine.easeInOut',
            repeat:   -1,
        });

        // Breathe
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

    /** Redraws the menu fish preview after returning from SkinSelectScene. */
    private onResume(): void {
        void this.loadSelectedSkin().then(savedId => {
            const skin = SKINS.find(s => s.id === savedId) ?? SKINS[0];
            SkinRenderer.draw(this.fishGfx, skin, 52, 8);
        });
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

        // Tap on button: brief squish → start game
        cont.setInteractive(
            new Phaser.Geom.Rectangle(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H),
            Phaser.Geom.Rectangle.Contains,
        );
        cont.once('pointerdown', () => {
            this.tweens.killAll();
            this.tweens.add({
                targets: cont, scaleX: 0.94, scaleY: 0.94,
                duration: 80, ease: 'Sine.easeOut', yoyo: true,
                onComplete: () => this.startGame(),
            });
        });
        this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
    }

    // ── Select-skin button ─────────────────────────────────────────────────────

    /** Creates the "SELECT SKIN" button that launches the skin selector overlay. */
    private createSelectSkinButton(): void {
        const cx      = GAME_WIDTH / 2;
        const BTN_W   = 220;
        const BTN_H   = 52;
        const btnMidY = GAME_HEIGHT * 0.86 + BTN_H / 2;
        const pixelFont = '"Press Start 2P", monospace';

        const cont = this.add.container(cx, btnMidY);
        const gfx  = this.add.graphics();
        cont.add(gfx);

        // Drop shadow
        gfx.fillStyle(0x000000, 1);
        gfx.fillRoundedRect(-BTN_W / 2 + 4, -BTN_H / 2 + 4, BTN_W, BTN_H, 14);
        // Outline
        gfx.fillStyle(0x000000, 1);
        gfx.fillRoundedRect(-BTN_W / 2 - 3, -BTN_H / 2 - 3, BTN_W + 6, BTN_H + 6, 15);
        // Fill
        gfx.fillStyle(0x1a4a6a, 1);
        gfx.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 12);
        // Highlight
        gfx.fillStyle(0x2a6a9a, 0.5);
        gfx.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, 16, 12);

        cont.add(this.add.text(0, 0, 'SELECT SKIN', {
            fontFamily: pixelFont, fontSize: '10px', color: '#ffffff',
        }).setOrigin(0.5));

        cont.setInteractive(
            new Phaser.Geom.Rectangle(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H),
            Phaser.Geom.Rectangle.Contains,
        );
        cont.on('pointerdown', () => {
            this.tweens.add({
                targets: cont, scaleX: 0.94, scaleY: 0.94,
                duration: 80, yoyo: true,
                onComplete: () => {
                    this.scene.pause();
                    this.scene.launch('SkinSelectScene');
                },
            });
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Loads the persisted selected skin id, falling back to 'default'. */
    private async loadSelectedSkin(): Promise<string> {
        try {
            const { value } = await Preferences.get({ key: 'selectedSkin' });
            return value ?? 'default';
        } catch {
            return 'default';
        }
    }

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
