import Phaser from 'phaser';
import { Preferences } from '@capacitor/preferences';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { SKINS, SkinRenderer } from '../objects/SkinRenderer';

const CARD_W   = 64;
const CARD_H   = 100;
const CARD_GAP = 8;
const BTN_W    = 220;
const BTN_H    = 52;

/**
 * SkinSelectScene — slides up on top of the paused MenuScene.
 *
 * Shows all 6 skins in a horizontal card row. Locked skins are dimmed with
 * a "?" placeholder. Tapping a card selects it; the SELECT button confirms
 * and persists the choice via @capacitor/preferences.
 */
export class SkinSelectScene extends Phaser.Scene {
    private selectedIndex: number = 0;
    private highScore: number = 0;
    private skinCards: Phaser.GameObjects.Graphics[] = [];
    private skinGraphics: Phaser.GameObjects.Graphics[] = [];
    private lockIcons: Phaser.GameObjects.Text[] = [];
    private nameText!: Phaser.GameObjects.Text;
    private unlockText!: Phaser.GameObjects.Text;
    private selectBtn!: Phaser.GameObjects.Graphics;
    private selectBtnText!: Phaser.GameObjects.Text;
    private selectBtnCont!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'SkinSelectScene' });
    }

    async create(): Promise<void> {
        this.highScore     = await this.loadHighScore();
        const savedId      = await this.loadSelectedSkin();
        const found        = SKINS.findIndex(s => s.id === savedId);
        this.selectedIndex = found >= 0 ? found : 0;

        const PANEL_W  = GAME_WIDTH - 40;
        const PANEL_H  = 500;
        const panelCY  = GAME_HEIGHT / 2 + 20;
        const panelTop = -PANEL_H / 2;

        // Dark overlay — stays put while panel slides in
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

        // Everything inside one container for the entrance animation
        const panelCont = this.add.container(GAME_WIDTH / 2, panelCY + 300).setAlpha(0);

        // ── Panel background ──────────────────────────────────────────────────
        const panelGfx = this.add.graphics();
        panelGfx.fillStyle(0x000000, 1);
        panelGfx.fillRoundedRect(-PANEL_W / 2 - 4, panelTop - 4, PANEL_W + 8, PANEL_H + 8, 18);
        panelGfx.fillStyle(0x0a2a4a, 1);
        panelGfx.fillRoundedRect(-PANEL_W / 2, panelTop, PANEL_W, PANEL_H, 14);
        panelGfx.lineStyle(2, 0x1a4a6a, 1);
        panelGfx.strokeRoundedRect(-PANEL_W / 2 + 6, panelTop + 6, PANEL_W - 12, PANEL_H - 12, 12);
        panelCont.add(panelGfx);

        const PF = '"Press Start 2P"';
        const addText = (x: number, y: number, str: string, size: string, color: string) => {
            const t = this.add.text(x, y, str, { fontFamily: PF, fontSize: size, color }).setOrigin(0.5);
            panelCont.add(t);
            return t;
        };

        // ── Title & score ─────────────────────────────────────────────────────
        addText(0, panelTop + 34, 'SELECT SKIN', '14px', '#ffffff');
        addText(0, panelTop + 58, `BEST: ${this.highScore}`, '9px', '#ffdd88');

        // ── Skin card row ─────────────────────────────────────────────────────
        const totalCardsW = SKINS.length * CARD_W + (SKINS.length - 1) * CARD_GAP;
        const cardsStartX = -totalCardsW / 2;
        const cardsTopY   = panelTop + 82;

        this.skinCards   = [];
        this.skinGraphics = [];
        this.lockIcons   = [];

        for (let i = 0; i < SKINS.length; i++) {
            const skin   = SKINS[i];
            const cardX  = cardsStartX + i * (CARD_W + CARD_GAP);
            const locked = skin.unlockScore > this.highScore;

            // Card background (interactive)
            const card = this.add.graphics();
            card.x = cardX;
            card.y = cardsTopY;
            card.fillStyle(locked ? 0x030d1a : 0x062040, 1);
            card.fillRoundedRect(0, 0, CARD_W, CARD_H, 6);
            card.lineStyle(2, 0x000000, 1);
            card.strokeRoundedRect(0, 0, CARD_W, CARD_H, 6);
            card.setInteractive(
                new Phaser.Geom.Rectangle(0, 0, CARD_W, CARD_H),
                Phaser.Geom.Rectangle.Contains,
            );
            card.on('pointerdown', () => this.selectCard(i));
            panelCont.add(card);
            this.skinCards.push(card);

            // Fish preview centred in the card
            const skinGfx = this.add.graphics();
            skinGfx.x = cardX + CARD_W / 2;
            skinGfx.y = cardsTopY + CARD_H * 0.44;
            SkinRenderer.draw(skinGfx, skin, 22, 6);
            panelCont.add(skinGfx);
            this.skinGraphics.push(skinGfx);

            if (locked) {
                // Dark overlay on the card
                const overlay = this.add.graphics();
                overlay.x = cardX;
                overlay.y = cardsTopY;
                overlay.fillStyle(0x000000, 0.65);
                overlay.fillRoundedRect(0, 0, CARD_W, CARD_H, 6);
                panelCont.add(overlay);

                const lockText = this.add.text(
                    cardX + CARD_W / 2, cardsTopY + CARD_H / 2,
                    '?', { fontFamily: PF, fontSize: '16px', color: '#334466' },
                ).setOrigin(0.5);
                panelCont.add(lockText);
                this.lockIcons.push(lockText);
            } else {
                // Placeholder so lockIcons[i] is always defined
                const dummy = this.add.text(0, -9999, '').setVisible(false);
                panelCont.add(dummy);
                this.lockIcons.push(dummy);
            }
        }

        const cardsBottom = cardsTopY + CARD_H;

        // ── Name & unlock labels ──────────────────────────────────────────────
        this.nameText   = addText(0, cardsBottom + 22, '', '11px', '#ffffff');
        this.unlockText = addText(0, cardsBottom + 42, '', '8px', '#44cc44');

        // ── SELECT button ─────────────────────────────────────────────────────
        const selectBtnCY = cardsBottom + 80;
        this.selectBtnCont = this.add.container(0, selectBtnCY);
        this.selectBtn     = this.add.graphics();
        this.selectBtnText = this.add.text(0, 0, 'SELECT', {
            fontFamily: PF, fontSize: '12px', color: '#ffffff',
        }).setOrigin(0.5);
        this.selectBtnCont.add([this.selectBtn, this.selectBtnText]);
        this.selectBtnCont.setSize(BTN_W, BTN_H);
        this.selectBtnCont.setInteractive();
        this.selectBtnCont.on('pointerdown', () => void this.onSelectPressed());
        panelCont.add(this.selectBtnCont);

        // ── BACK button ───────────────────────────────────────────────────────
        const BACK_W     = 180;
        const BACK_H     = 44;
        const backBtnCY  = selectBtnCY + BTN_H / 2 + 16 + BACK_H / 2;
        const backCont   = this.add.container(0, backBtnCY);
        const backGfx    = this.add.graphics();
        // Drop shadow
        backGfx.fillStyle(0x000000, 1);
        backGfx.fillRoundedRect(-BACK_W / 2 + 4, -BACK_H / 2 + 4, BACK_W, BACK_H, 12);
        // Outline
        backGfx.fillStyle(0x000000, 1);
        backGfx.fillRoundedRect(-BACK_W / 2 - 3, -BACK_H / 2 - 3, BACK_W + 6, BACK_H + 6, 14);
        // Fill
        backGfx.fillStyle(0x8b2020, 1);
        backGfx.fillRoundedRect(-BACK_W / 2, -BACK_H / 2, BACK_W, BACK_H, 12);
        // Highlight
        backGfx.fillStyle(0xcc4444, 0.5);
        backGfx.fillRoundedRect(-BACK_W / 2, -BACK_H / 2, BACK_W, 14, 12);
        const backLabel = this.add.text(0, 0, 'BACK', {
            fontFamily: PF, fontSize: '10px', color: '#ffffff',
        }).setOrigin(0.5);
        backCont.add([backGfx, backLabel]);
        backCont.setSize(BACK_W, BACK_H);
        backCont.setInteractive();
        backCont.on('pointerdown', () => {
            this.tweens.add({
                targets: backCont, scaleX: 0.94, scaleY: 0.94,
                duration: 80, yoyo: true,
                onComplete: () => {
                    this.scene.stop();
                    this.scene.resume('MenuScene');
                },
            });
        });
        panelCont.add(backCont);

        // ── Entrance animation ────────────────────────────────────────────────
        this.tweens.add({
            targets:  panelCont,
            y:        panelCY,
            alpha:    1,
            duration: 350,
            ease:     'Back.easeOut',
        });

        this.updateSelection();
    }

    /**
     * Selects a card by index. Silently ignores locked skins.
     * @param index Index into the SKINS array.
     */
    private selectCard(index: number): void {
        if (SKINS[index].unlockScore > this.highScore) return;
        this.selectedIndex = index;
        this.tweens.add({
            targets: this.skinCards[index], scaleX: 0.94, scaleY: 0.94,
            duration: 80, yoyo: true,
        });
        this.updateSelection();
    }

    /**
     * Redraws all card borders, updates label text and SELECT button colour
     * to reflect the current selectedIndex.
     */
    private updateSelection(): void {
        for (let i = 0; i < SKINS.length; i++) {
            const card   = this.skinCards[i];
            const locked = SKINS[i].unlockScore > this.highScore;
            card.clear();

            if (i === this.selectedIndex) {
                // Orange selection border
                card.fillStyle(0xf4a832, 1);
                card.fillRoundedRect(0, 0, CARD_W, CARD_H, 7);
                card.fillStyle(0x1a4a6a, 1);
                card.fillRoundedRect(3, 3, CARD_W - 6, CARD_H - 6, 5);
            } else {
                card.fillStyle(0x000000, 1);
                card.fillRoundedRect(0, 0, CARD_W, CARD_H, 7);
                card.fillStyle(locked ? 0x030d1a : 0x062040, 1);
                card.fillRoundedRect(2, 2, CARD_W - 4, CARD_H - 4, 5);
            }
        }

        const skin     = SKINS[this.selectedIndex];
        const unlocked = skin.unlockScore <= this.highScore;

        this.nameText.setText(skin.name);

        if (unlocked) {
            this.unlockText.setText('UNLOCKED').setColor('#44cc44');
        } else {
            this.unlockText.setText(`REACH SCORE ${skin.unlockScore}`).setColor('#ff8800');
        }

        // Redraw SELECT button with appropriate colour
        this.selectBtn.clear();
        const btnFill = unlocked ? 0x44cc44 : 0x334466;
        // Drop shadow
        this.selectBtn.fillStyle(0x000000, 1);
        this.selectBtn.fillRoundedRect(-BTN_W / 2 + 5, -BTN_H / 2 + 5, BTN_W, BTN_H, 14);
        // Outline
        this.selectBtn.fillStyle(0x000000, 1);
        this.selectBtn.fillRoundedRect(-BTN_W / 2 - 3, -BTN_H / 2 - 3, BTN_W + 6, BTN_H + 6, 17);
        // Fill
        this.selectBtn.fillStyle(btnFill, 1);
        this.selectBtn.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 14);
        // Highlight strip (unlocked only)
        if (unlocked) {
            this.selectBtn.fillStyle(0x77ee77, 0.5);
            this.selectBtn.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, 20, 14);
        }
    }

    /**
     * Persists the selected skin to Preferences, then plays a press animation
     * and returns to the MenuScene.
     */
    private async onSelectPressed(): Promise<void> {
        const skin = SKINS[this.selectedIndex];
        if (skin.unlockScore > this.highScore) return;

        try {
            await Preferences.set({ key: 'selectedSkin', value: skin.id });
        } catch {
            // Browser fallback — continue without persisting
        }

        this.tweens.add({
            targets:  this.selectBtnCont,
            scaleX:   0.94, scaleY: 0.94,
            duration: 80, yoyo: true,
            onComplete: () => {
                this.scene.stop();
                this.scene.resume('MenuScene');
            },
        });
    }

    /** Loads the persisted high score, falling back to 0. */
    private async loadHighScore(): Promise<number> {
        try {
            const { value } = await Preferences.get({ key: 'highScore' });
            return value ? parseInt(value, 10) : 0;
        } catch {
            return 0;
        }
    }

    /** Loads the persisted selected skin id, falling back to 'default'. */
    private async loadSelectedSkin(): Promise<string> {
        try {
            const { value } = await Preferences.get({ key: 'selectedSkin' });
            return value ?? 'default';
        } catch {
            return 'default';
        }
    }
}
