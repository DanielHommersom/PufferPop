import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

/**
 * GameOverScene – Flappy Bird-style cartoon game-over screen.
 *
 * Layout:
 *   "POP!!" headline  – Press Start 2P, 4-corner outline trick, shake tween
 *   Score panel       – beige rounded rect (280×160), medal circle on left,
 *                       animated score counter + best score on right
 *   "TAP TO RETRY"    – green outlined button below the panel
 */
export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create(): void {
        const cx = GAME_WIDTH / 2;
        const pixelFont = '"Press Start 2P"';

        // Background
        this.add.image(0, 0, 'background').setOrigin(0, 0);

        const lastScore = (this.registry.get('lastScore') as number | undefined) ?? 0;
        const highScore = (this.registry.get('highScore') as number | undefined) ?? 0;
        const isNewRecord = lastScore >= highScore && lastScore > 0;

        // ── "POP!!" headline (4-corner outline + fill) ────────────────────
        const headlineY = Math.round(GAME_HEIGHT * 0.22);

        const outlineOffsets: [number, number][] = [[-3, -3], [3, -3], [-3, 3], [3, 3]];
        outlineOffsets.forEach(([dx, dy]) => {
            this.add.text(cx + dx, headlineY + dy, 'POP!!', {
                fontFamily: pixelFont,
                fontSize: '64px',
                color: '#000000',
            }).setOrigin(0.5).setDepth(10);
        });

        const headline = this.add.text(cx, headlineY, 'POP!!', {
            fontFamily: pixelFont,
            fontSize: '64px',
            color: '#e83820',
        }).setOrigin(0.5).setDepth(11);

        this.tweens.add({
            targets: headline,
            x: headline.x + 6,
            duration: 55,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 5,
        });

        // ── Score panel (beige rounded rect) ─────────────────────────────
        const PANEL_W  = 280;
        const PANEL_H  = 160;
        const panelX   = Math.round((GAME_WIDTH - PANEL_W) / 2);   // 100
        const panelY   = Math.round(GAME_HEIGHT * 0.40);            // ~341
        const panelCY  = panelY + PANEL_H / 2;                     // vertical centre of panel

        const panelGfx = this.add.graphics().setDepth(12);

        // Outline (pass 1)
        panelGfx.fillStyle(0x000000, 1);
        panelGfx.fillRoundedRect(panelX - 4, panelY - 4, PANEL_W + 8, PANEL_H + 8, 14);

        // Fill (pass 2)
        panelGfx.fillStyle(0xf5e6c8, 1);
        panelGfx.fillRoundedRect(panelX, panelY, PANEL_W, PANEL_H, 10);

        // ── Medal ─────────────────────────────────────────────────────────
        const medalX = panelX + 58;

        if (lastScore >= 20) {
            // Gold medal
            panelGfx.fillStyle(0x000000, 1);
            panelGfx.fillCircle(medalX, panelCY, 30);
            panelGfx.fillStyle(0xf7c234, 1);
            panelGfx.fillCircle(medalX, panelCY, 26);
            // Shine highlight
            panelGfx.fillStyle(0xffe97a, 1);
            panelGfx.fillCircle(medalX - 8, panelCY - 8, 9);
        } else if (lastScore >= 10) {
            // Silver medal
            panelGfx.fillStyle(0x000000, 1);
            panelGfx.fillCircle(medalX, panelCY, 30);
            panelGfx.fillStyle(0xc0c0c0, 1);
            panelGfx.fillCircle(medalX, panelCY, 26);
            // Shine highlight
            panelGfx.fillStyle(0xe8e8e8, 1);
            panelGfx.fillCircle(medalX - 8, panelCY - 8, 9);
        }
        // score < 10: no medal

        // ── Score + Best (right half of panel) ───────────────────────────
        const rightCX  = panelX + 185;
        const depth    = 13;

        this.add.text(rightCX, panelY + 22, 'SCORE', {
            fontFamily: pixelFont,
            fontSize: '9px',
            color: '#8a7a5a',
        }).setOrigin(0.5, 0).setDepth(depth);

        const scoreText = this.add.text(rightCX, panelY + 42, '0', {
            fontFamily: pixelFont,
            fontSize: '22px',
            color: '#3a3020',
        }).setOrigin(0.5, 0).setDepth(depth);

        // Animated counter: 0 → lastScore
        const counter = { value: 0 };
        this.tweens.add({
            targets: counter,
            value: lastScore,
            duration: Math.min(1000, lastScore * 55),
            ease: 'Quad.easeOut',
            onUpdate: () => { scoreText.setText(String(Math.floor(counter.value))); },
            onComplete: () => { scoreText.setText(String(lastScore)); },
        });

    const bestLabel = isNewRecord ? 'NEW HIGHEST SCORE!' : 'HIGHEST SCORE';
        const bestColor = isNewRecord ? '#c05000' : '#8a7a5a';

        this.add.text(rightCX, panelY + 90, bestLabel, {
            fontFamily: pixelFont,
            fontSize: '8px',
            color: bestColor,
        }).setOrigin(0.5, 0).setDepth(depth);

        this.add.text(rightCX, panelY + 108, String(highScore), {
            fontFamily: pixelFont,
            fontSize: '18px',
            color: '#3a3020',
        }).setOrigin(0.5, 0).setDepth(depth);

        // ── "TAP TO RETRY" button ─────────────────────────────────────────
        const BTN_W  = 260;
        const BTN_H  = 52;
        const btnX   = Math.round((GAME_WIDTH - BTN_W) / 2);
        const btnY   = Math.round(GAME_HEIGHT * 0.74);

        const btnGfx = this.add.graphics().setDepth(14);

        // Outline (pass 1)
        btnGfx.fillStyle(0x000000, 1);
        btnGfx.fillRoundedRect(btnX - 3, btnY - 3, BTN_W + 6, BTN_H + 6, 11);

        // Fill (pass 2)
        btnGfx.fillStyle(0x56bf4a, 1);
        btnGfx.fillRoundedRect(btnX, btnY, BTN_W, BTN_H, 8);

        // Top highlight strip
        btnGfx.fillStyle(0x78d96c, 1);
        btnGfx.fillRoundedRect(btnX + 6, btnY + 5, BTN_W - 12, 10, 4);

        this.add.text(cx, btnY + BTN_H / 2, 'TAP TO RETRY', {
            fontFamily: pixelFont,
            fontSize: '10px',
            color: '#ffffff',
        }).setOrigin(0.5).setDepth(15);

        // Pulse the button
        this.tweens.add({
            targets: [btnGfx],
            alpha: 0.75,
            duration: 600,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        // ── "SHARE ON X" button ───────────────────────────────────────────
        const SHARE_W = 260;
        const SHARE_H = 48;
        const shareX  = Math.round((GAME_WIDTH - SHARE_W) / 2);
        const shareY  = btnY + BTN_H + 14;

        const shareGfx = this.add.graphics().setDepth(14);

        // Outline
        shareGfx.fillStyle(0x000000, 1);
        shareGfx.fillRoundedRect(shareX - 3, shareY - 3, SHARE_W + 6, SHARE_H + 6, 11);

        // Fill (X black)
        shareGfx.fillStyle(0x111111, 1);
        shareGfx.fillRoundedRect(shareX, shareY, SHARE_W, SHARE_H, 8);

        // Top highlight strip
        shareGfx.fillStyle(0x333333, 1);
        shareGfx.fillRoundedRect(shareX + 6, shareY + 5, SHARE_W - 12, 8, 4);

        this.add.text(cx, shareY + SHARE_H / 2, 'SHARE ON X  𝕏', {
            fontFamily: pixelFont,
            fontSize: '9px',
            color: '#ffffff',
        }).setOrigin(0.5).setDepth(15);

        // ── Input – retry on button tap or SPACE (600 ms delay) ──────────
        this.time.delayedCall(600, () => {
            btnGfx.setInteractive(
                new Phaser.Geom.Rectangle(btnX, btnY, BTN_W, BTN_H),
                Phaser.Geom.Rectangle.Contains,
            );
            btnGfx.once('pointerdown', this.restartGame, this);

            shareGfx.setInteractive(
                new Phaser.Geom.Rectangle(shareX, shareY, SHARE_W, SHARE_H),
                Phaser.Geom.Rectangle.Contains,
            );
            shareGfx.on('pointerdown', () => {
                const tweet = encodeURIComponent(
                    `I scored ${highScore} in Puffer Pop! 🐡 Can you beat my score?`,
                );
                window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
            });

            this.input.keyboard?.once('keydown-SPACE', this.restartGame, this);
        });
    }

    private restartGame(): void {
        this.scene.start('GameScene');
    }
}
