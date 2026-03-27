import Phaser from 'phaser';
import { Preferences } from '@capacitor/preferences';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

/**
 * MenuScene – displays the game title and a tap-to-play prompt.
 * Title bobs up and down via a looping tween.
 */
export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create(): void {
        // Background
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'background');

        // Title text
        const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 'PUFFER POP', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '52px',
            fontStyle: 'bold',
            color: '#f4a832',
            stroke: '#0a1a3a',
            strokeThickness: 6,
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000000',
                blur: 4,
                fill: true,
            },
        });
        title.setOrigin(0.5);

        // Bobbing tween on the title
        this.tweens.add({
            targets: title,
            y: title.y - 14,
            duration: 900,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        // Subtitle / instruction text
        const sub = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.56, 'TAP TO PLAY', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '26px',
            color: '#ffffff',
            stroke: '#0a1a3a',
            strokeThickness: 4,
        });
        sub.setOrigin(0.5);

        // Pulsing opacity on subtitle
        this.tweens.add({
            targets: sub,
            alpha: 0.3,
            duration: 700,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        // Best score – load async, add text when ready
        const bestTxt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.70, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '13px',
            color: '#ffdd88',
            stroke: '#0a1a3a',
            strokeThickness: 4,
        }).setOrigin(0.5);

        Preferences.get({ key: 'highScore' })
            .then(({ value }) => {
                const best = value !== null ? parseInt(value, 10) : 0;
                if (best > 0) bestTxt.setText(`Highest Score: ${best}`);
            })
            .catch(() => { /* no best score to show */ });

        // Version / credits tiny text
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.92, 'v1.0.0', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '14px',
            color: '#556688',
        }).setOrigin(0.5);

        // Input – any pointer or space key starts the game
        this.input.once('pointerdown', this.startGame, this);
        this.input.keyboard?.once('keydown-SPACE', this.startGame, this);
    }

    /** Transition to the GameScene. */
    private startGame(): void {
        this.scene.start('GameScene');
    }
}
