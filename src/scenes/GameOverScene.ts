import Phaser from 'phaser';
import { Browser } from '@capacitor/browser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

/**
 * GameOverScene – ocean-themed game-over screen.
 *
 * Layout (top to bottom):
 *   "GAME OVER" headline  – zooms in from scale 2 with Back.easeOut
 *   Score panel           – dark ocean panel, animated score counter,
 *                           best score, medal / fish-skeleton
 *   "PLAY AGAIN" button   – green, bounces up from below
 *   "SHARE" button        – blue, uses @capacitor/share native sheet
 *   Debris bubbles        – 6 one-shot bubbles rising from screen centre
 */
export class GameOverScene extends Phaser.Scene {
    /** The score achieved in the last game run. */
    private score: number = 0;

    constructor() {
        super({ key: 'GameOverScene' });
    }

    /**
     * Preload – Press Start 2P is injected via @font-face in index.html;
     * no runtime font load is needed here.
     */
    preload(): void { /* font provided by @font-face in index.html */ }

    /** Build all screen elements. Score and high-score are read from the registry. */
    create(): void {
        this.score            = (this.registry.get('lastScore') as number | undefined) ?? 0;
        const highScore       = (this.registry.get('highScore') as number | undefined) ?? 0;
        const isNewRecord     = this.score > 0 && this.score >= highScore;

        this.drawBackground();
        this.createGameOverTitle();
        this.createScorePanel(highScore, isNewRecord);
        this.createRetryButton();
        this.createShareButton();
        this.spawnDebrisBubbles();
    }

    /** Kill all tweens on scene shutdown to prevent memory leaks. */
    shutdown(): void {
        this.tweens.killAll();
    }

    // ── Background ─────────────────────────────────────────────────────────────

    /**
     * Draws the darkened ocean gradient (MenuScene colours × 0.7) with a
     * 55 % black overlay on top for the game-over mood.
     */
    private drawBackground(): void {
        const gfx = this.add.graphics();

        // Darkened ocean bands (each colour ≈ MenuScene × 0.7)
        gfx.fillStyle(0x368689, 1);   // 0x4ec0ca * 0.7
        gfx.fillRect(0, 0, GAME_WIDTH, Math.ceil(GAME_HEIGHT * 0.6));

        gfx.fillStyle(0x1d616c, 1);   // 0x2a8a9a * 0.7
        gfx.fillRect(
            0, Math.floor(GAME_HEIGHT * 0.6),
            GAME_WIDTH, Math.ceil(GAME_HEIGHT * 0.25),
        );

        gfx.fillStyle(0x092840, 1);   // 0x0d3a5c * 0.7
        gfx.fillRect(
            0, Math.floor(GAME_HEIGHT * 0.85),
            GAME_WIDTH, Math.ceil(GAME_HEIGHT * 0.15),
        );

        // Dark overlay
        gfx.fillStyle(0x000000, 0.55);
        gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // ── Headline ───────────────────────────────────────────────────────────────

    /**
     * Draws the "GAME OVER" headline and tweens it from scale 2 / alpha 0
     * to scale 1 / alpha 1 over 400 ms with Back.easeOut.
     */
    private createGameOverTitle(): void {
        const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.18, 'GAME OVER', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize:   '32px',
            color:      '#ff4444',
            stroke:     '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5).setAlpha(0).setScale(2.0);

        this.tweens.add({
            targets:  title,
            alpha:    1,
            scaleX:   1.0,
            scaleY:   1.0,
            duration: 400,
            ease:     'Back.easeOut',
        });
    }

    // ── Score panel ────────────────────────────────────────────────────────────

    /**
     * Draws the dark ocean score panel with animated score counter, best score,
     * medal / skeleton icon, and optional star burst for new records.
     *
     * @param highScore   The all-time best score.
     * @param isNewRecord True if the current run set a new high score.
     */
    private createScorePanel(highScore: number, isNewRecord: boolean): void {
        const cx       = GAME_WIDTH / 2;
        const PANEL_W  = 310;
        const PANEL_H  = 220;
        const panelCY  = GAME_HEIGHT * 0.45;
        const panelX   = cx - PANEL_W / 2;
        const panelY   = panelCY - PANEL_H / 2;
        const medalCX  = panelX + 55;     // left-side medal / skeleton centre
        const rightCX  = panelX + 210;    // right-side content centre
        const pixelFont = '"Press Start 2P", monospace';

        const gfx = this.add.graphics();

        // Outer teal glow
        gfx.fillStyle(0x1a6a7a, 1);
        gfx.fillRoundedRect(panelX - 10, panelY - 10, PANEL_W + 20, PANEL_H + 20, 28);
        // Black outline
        gfx.fillStyle(0x000000, 1);
        gfx.fillRoundedRect(panelX - 4, panelY - 4, PANEL_W + 8, PANEL_H + 8, 22);
        // Main fill
        gfx.fillStyle(0x0a2a4a, 1);
        gfx.fillRoundedRect(panelX, panelY, PANEL_W, PANEL_H, 18);
        // Inner border (teal ring, 2 px)
        gfx.fillStyle(0x1a4a6a, 1);
        gfx.fillRoundedRect(panelX + 8, panelY + 8, PANEL_W - 16, PANEL_H - 16, 14);
        gfx.fillStyle(0x0a2a4a, 1);
        gfx.fillRoundedRect(panelX + 10, panelY + 10, PANEL_W - 20, PANEL_H - 20, 12);
        // Horizontal divider at panel vertical centre
        gfx.fillStyle(0x1a4a6a, 1);
        gfx.fillRect(panelX + 16, panelCY - 1, PANEL_W - 32, 2);

        // Medal or fish skeleton on left side
        this.drawMedal(gfx, medalCX, panelCY, this.score);

        // ── Score section (top half) ────────────────────────────────────────

        this.add.text(rightCX, panelY + 24, 'SCORE', {
            fontFamily: pixelFont, fontSize: '10px', color: '#88aabb',
        }).setOrigin(0.5, 0);

        const scoreText = this.add.text(rightCX, panelY + 48, '0', {
            fontFamily: pixelFont, fontSize: '44px',
            color: '#ffffff', stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5, 0);

        // Animated counter: 0 → this.score over 800 ms
        const counter = { value: 0 };
        this.tweens.add({
            targets:  counter,
            value:    this.score,
            duration: 800,
            ease:     'Quad.easeOut',
            onUpdate:   () => { scoreText.setText(String(Math.floor(counter.value))); },
            onComplete: () => { scoreText.setText(String(this.score)); },
        });

        // ── Best section (bottom half) ──────────────────────────────────────

        this.add.text(rightCX, panelCY + 14, isNewRecord ? 'NEW BEST!' : 'BEST', {
            fontFamily: pixelFont, fontSize: '10px',
            color: isNewRecord ? '#f4a832' : '#88aabb',
        }).setOrigin(0.5, 0);

        this.add.text(rightCX, panelCY + 36, String(highScore), {
            fontFamily: pixelFont, fontSize: '36px',
            color: isNewRecord ? '#f4a832' : '#ffffff',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5, 0);

        // Staggered stars for a new record
        if (isNewRecord) {
            const starOffsets: [number, number][] = [
                [-55, 50], [55, 50], [-42, 76], [42, 76],
            ];
            for (let i = 0; i < starOffsets.length; i++) {
                const [dx, dy] = starOffsets[i];
                const starGfx  = this.add.graphics({ x: rightCX + dx, y: panelCY + dy }).setScale(0);
                this.drawStar(starGfx, 8);
                this.tweens.add({
                    targets: starGfx, scaleX: 1, scaleY: 1,
                    duration: 300, delay: 900 + i * 80, ease: 'Back.easeOut',
                });
            }
        }
    }

    /**
     * Draws the medal icon (or fish skeleton) on the left side of the score panel.
     * Medal tiers: gold ≥ 40, silver ≥ 20, bronze ≥ 10, skeleton < 10.
     * Each medal uses the outline trick and has a small white shine at top-left.
     *
     * @param gfx   Panel Graphics to draw into.
     * @param x     World x of the medal/skeleton centre.
     * @param y     World y of the medal/skeleton centre.
     * @param score Current run score used to determine the tier.
     */
    private drawMedal(
        gfx:   Phaser.GameObjects.Graphics,
        x:     number,
        y:     number,
        score: number,
    ): void {
        let fillColor: number;
        let shineColor: number;

        if (score >= 40) {
            fillColor  = 0xf7c234;
            shineColor = 0xfff4a0;
        } else if (score >= 20) {
            fillColor  = 0xc0c0c0;
            shineColor = 0xffffff;
        } else if (score >= 10) {
            fillColor  = 0xcd7f32;
            shineColor = 0xe8a860;
        } else {
            this.drawFishSkeleton(gfx, x, y);
            return;
        }

        gfx.fillStyle(0x000000, 1);
        gfx.fillCircle(x, y, 26);
        gfx.fillStyle(fillColor, 1);
        gfx.fillCircle(x, y, 22);
        // Top-left shine arc (small white circle)
        gfx.fillStyle(shineColor, 0.70);
        gfx.fillCircle(x - 7, y - 7, 7);
    }

    /**
     * Draws a simple fish skeleton in 0x334466 for scores below 10.
     * Tail + oval body + two cross-mark "X-eyes" using thin rects.
     *
     * @param gfx Panel Graphics to draw into.
     * @param x   World x of the skeleton centre.
     * @param y   World y of the skeleton centre.
     */
    private drawFishSkeleton(
        gfx: Phaser.GameObjects.Graphics,
        x:   number,
        y:   number,
    ): void {
        // Tail
        gfx.fillStyle(0x000000, 1);
        gfx.fillTriangle(x - 22, y - 10, x - 22, y + 10, x - 34, y);
        gfx.fillStyle(0x334466, 1);
        gfx.fillTriangle(x - 20, y - 8,  x - 20, y + 8,  x - 30, y);

        // Body
        gfx.fillStyle(0x000000, 1);
        gfx.fillEllipse(x, y, 46, 36);
        gfx.fillStyle(0x334466, 1);
        gfx.fillEllipse(x, y, 42, 32);

        // X-eyes: two cross marks (horizontal + vertical thin rects)
        for (const ex of [x + 7, x + 18]) {
            gfx.fillStyle(0xffffff, 1);
            gfx.fillRect(ex - 4, y - 7, 8, 2);   // horizontal bar
            gfx.fillRect(ex - 1, y - 10, 2, 8);  // vertical bar
        }
    }

    /**
     * Draws a 5-pointed star centered at (0, 0) of the given Graphics.
     * Uses outline trick: black offset polygon drawn first, then orange fill.
     *
     * @param gfx    Target Graphics (positioned at the star's world location).
     * @param outerR Outer-tip radius in pixels.
     */
    private drawStar(gfx: Phaser.GameObjects.Graphics, outerR: number): void {
        const innerR = outerR * 0.42;
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < 10; i++) {
            const r     = i % 2 === 0 ? outerR : innerR;
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }

        // Outline (shifted 1 px right+down)
        gfx.fillStyle(0x000000, 1);
        gfx.fillPoints(pts.map(p => ({ x: p.x + 1, y: p.y + 1 })), true);
        // Fill
        gfx.fillStyle(0xf4a832, 1);
        gfx.fillPoints(pts, true);
    }

    // ── Retry button ───────────────────────────────────────────────────────────

    /**
     * Creates the green "PLAY AGAIN" button inside a Container.
     * It bounces up from below (y+40, alpha 0) with a 900 ms delay.
     * The hit area is registered after the entrance completes (1400 ms).
     */
    private createRetryButton(): void {
        const cx      = GAME_WIDTH / 2;
        const BTN_W   = 300;
        const BTN_H   = 68;
        const targetY = GAME_HEIGHT * 0.72 + BTN_H / 2;
        const pixelFont = '"Press Start 2P", monospace';

        const cont = this.add.container(cx, targetY + 40).setAlpha(0);

        const gfx = this.add.graphics();
        cont.add(gfx);

        // Drop shadow
        gfx.fillStyle(0x000000, 1);
        gfx.fillRoundedRect(-BTN_W / 2 + 5, -BTN_H / 2 + 5, BTN_W, BTN_H, 16);
        // Outline
        gfx.fillStyle(0x000000, 1);
        gfx.fillRoundedRect(-BTN_W / 2 - 3, -BTN_H / 2 - 3, BTN_W + 6, BTN_H + 6, 17);
        // Fill (green)
        gfx.fillStyle(0x44cc44, 1);
        gfx.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 14);
        // Top highlight
        gfx.fillStyle(0x77ee77, 0.5);
        gfx.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, 20, 14);

        cont.add(this.add.text(0, 0, 'PLAY AGAIN', {
            fontFamily: pixelFont, fontSize: '14px', color: '#000000',
        }).setOrigin(0.5));

        // Bounce entrance
        this.tweens.add({
            targets: cont, y: targetY, alpha: 1,
            duration: 500, delay: 900, ease: 'Back.easeOut',
        });

        // Register hit area after animation completes
        this.time.delayedCall(1400, () => {
            cont.setInteractive(
                new Phaser.Geom.Rectangle(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H),
                Phaser.Geom.Rectangle.Contains,
            );
            cont.once('pointerdown', () => this.scene.start('GameScene'));
            this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('GameScene'));
        });
    }

    // ── Share button ───────────────────────────────────────────────────────────

    /**
     * Creates the blue "SHARE" button that triggers the native share sheet via
     * {@link @capacitor/share!Share.share}.
     * If sharing throws (unsupported platform), the button hides itself.
     */
    private createShareButton(): void {
        const cx      = GAME_WIDTH / 2;
        const BTN_W   = 200;
        const BTN_H   = 52;
        const targetY = GAME_HEIGHT * 0.72 + 90 + BTN_H / 2;
        const pixelFont = '"Press Start 2P", monospace';

        const cont = this.add.container(cx, targetY + 40).setAlpha(0);

        const gfx = this.add.graphics();
        cont.add(gfx);

        // Drop shadow
        gfx.fillStyle(0x000000, 1);
        gfx.fillRoundedRect(-BTN_W / 2 + 4, -BTN_H / 2 + 4, BTN_W, BTN_H, 12);
        // Outline
        gfx.fillStyle(0x000000, 1);
        gfx.fillRoundedRect(-BTN_W / 2 - 3, -BTN_H / 2 - 3, BTN_W + 6, BTN_H + 6, 15);
        // Fill (blue)
        gfx.fillStyle(0x4a90d9, 1);
        gfx.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 12);
        // Top highlight
        gfx.fillStyle(0x6ab0f0, 0.5);
        gfx.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, 16, 12);

        cont.add(this.add.text(0, 0, 'SHARE', {
            fontFamily: pixelFont, fontSize: '11px', color: '#ffffff',
        }).setOrigin(0.5));

        // Bounce entrance
        this.tweens.add({
            targets: cont, y: targetY, alpha: 1,
            duration: 500, delay: 1100, ease: 'Back.easeOut',
        });

        // Register hit area after animation completes
        this.time.delayedCall(1600, () => {
            cont.setInteractive(
                new Phaser.Geom.Rectangle(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H),
                Phaser.Geom.Rectangle.Contains,
            );
            cont.on('pointerdown', () => void this.doShare(cont));
        });
    }

    /**
     * Invokes the native share sheet via @capacitor/share.
     * Hides the button container if the platform does not support sharing.
     *
     * @param btn The share button Container – hidden on failure.
     */
    private async doShare(btn: Phaser.GameObjects.Container): Promise<void> {
        try {
            const text = encodeURIComponent(`I survived ${this.score} reefs in Puffer Pop! Can you beat me? 🐡`);
            await Browser.open({ url: `https://x.com/intent/tweet?text=${text}` });
        } catch {
            btn.setVisible(false);
        }
    }

    // ── Debris bubbles ─────────────────────────────────────────────────────────

    /**
     * Spawns 6 one-shot bubble particles rising from the screen centre,
     * each fading out as they float upward.
     */
    private spawnDebrisBubbles(): void {
        for (let i = 0; i < 6; i++) {
            const bx = GAME_WIDTH / 2 + Phaser.Math.Between(-40, 40);
            const r  = Phaser.Math.Between(4, 12);

            const bGfx = this.add.graphics({ x: bx, y: GAME_HEIGHT / 2 });
            bGfx.fillStyle(0x000000, 1);
            bGfx.fillCircle(0, 0, r + 2);
            bGfx.fillStyle(0xffffff, 0.25);
            bGfx.fillCircle(0, 0, r);

            this.tweens.add({
                targets:  bGfx,
                y:        GAME_HEIGHT / 2 - Phaser.Math.Between(200, 400),
                alpha:    0,
                duration: Phaser.Math.Between(1200, 2500),
                delay:    i * 150,
                ease:     'Quad.easeOut',
            });
        }
    }
}
