import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

/**
 * GameOverScene – shown after the player dies.
 *
 * Displays:
 *  - "PATS!" headline
 *  - Score (animated counter from 0 → final value)
 *  - High-score
 *  - "Tap to play again" prompt
 *
 * Tapping or pressing SPACE restarts GameScene.
 */
export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create(): void {
        // Background
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'background').setAlpha(0.85);

        const lastScore = (this.registry.get('lastScore') as number | undefined) ?? 0;
        const highScore = (this.registry.get('highScore') as number | undefined) ?? 0;

        // ── "PATS!" headline ──────────────────────────────────────────────
        const headline = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.28, 'PATS!', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '72px',
            fontStyle: 'bold',
            color: '#e83820',
            stroke: '#0a1a3a',
            strokeThickness: 8,
        });
        headline.setOrigin(0.5);

        // Shake the headline briefly
        this.tweens.add({
            targets: headline,
            x: headline.x + 6,
            duration: 60,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 5,
        });

        // ── Score label ───────────────────────────────────────────────────
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.46, 'SCORE', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '20px',
            color: '#aabbcc',
        }).setOrigin(0.5);

        const scoreText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.52, '0', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '52px',
            fontStyle: 'bold',
            color: '#f4a832',
            stroke: '#0a1a3a',
            strokeThickness: 5,
        });
        scoreText.setOrigin(0.5);

        // Animate score counter 0 → lastScore
        const counter = { value: 0 };
        this.tweens.add({
            targets: counter,
            value: lastScore,
            duration: Math.min(1200, lastScore * 60),
            ease: 'Quad.easeOut',
            onUpdate: () => {
                scoreText.setText(String(Math.floor(counter.value)));
            },
            onComplete: () => {
                scoreText.setText(String(lastScore));
            },
        });

        // ── High-score label ──────────────────────────────────────────────
        const isNewRecord = lastScore >= highScore && lastScore > 0;
        const hsLabel = isNewRecord ? '★ NIEUW RECORD ★' : `RECORD: ${highScore}`;
        const hsColor = isNewRecord ? '#ffee00' : '#aabbcc';

        const hsText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.63, hsLabel, {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: isNewRecord ? '22px' : '18px',
            color: hsColor,
            stroke: '#0a1a3a',
            strokeThickness: 3,
        });
        hsText.setOrigin(0.5);

        if (isNewRecord) {
            this.tweens.add({
                targets: hsText,
                scaleX: 1.12,
                scaleY: 1.12,
                duration: 350,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });
        }

        // ── "Play again" prompt ───────────────────────────────────────────
        const prompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.80, 'Tik om opnieuw te spelen', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '22px',
            color: '#ffffff',
            stroke: '#0a1a3a',
            strokeThickness: 4,
        });
        prompt.setOrigin(0.5);

        this.tweens.add({
            targets: prompt,
            alpha: 0.2,
            duration: 600,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        // ── Input – restart on tap or SPACE ───────────────────────────────
        // Delay input by 600 ms to prevent accidental instant restart
        this.time.delayedCall(600, () => {
            this.input.once('pointerdown', this.restartGame, this);
            this.input.keyboard?.once('keydown-SPACE', this.restartGame, this);
        });
    }

    /** Restarts only the GameScene (not the full game). */
    private restartGame(): void {
        this.scene.start('GameScene');
    }
}
