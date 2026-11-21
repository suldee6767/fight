import * as Phaser from 'phaser';

import { AUDIO_KEYS, playAudioCue } from '../game/core/audio';
import { STAGE_DEFINITIONS, TITLE_ARENA_BG_KEY } from '../game/stageConfig';
import { createSelectionCard, type SelectionCard } from '../game/ui';
import { SCENE_KEYS, type MatchMode } from '../game/types';
import { BaseScene } from './BaseScene';

interface LevelSelectData {
  mode: MatchMode;
}

const COLS = 4;

/**
 * Second step of the Play flow: pick one of the 8 stages in a 4x2 gallery.
 */
export class LevelSelectScene extends BaseScene {
  private mode: MatchMode = '1v1';
  private cards: SelectionCard[] = [];
  private selectedIndex = 0;

  constructor() {
    super(SCENE_KEYS.LevelSelect);
  }

  init(data: LevelSelectData): void {
    this.mode = data?.mode ?? '1v1';
  }

  create(): void {
    this.cards = [];
    this.selectedIndex = 0;

    this.markActiveScene(SCENE_KEYS.LevelSelect);
    this.setGameState('title');
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor(0x020617);

    if (this.textures.exists(TITLE_ARENA_BG_KEY)) {
      const bg = this.add.image(width / 2, height / 2, TITLE_ARENA_BG_KEY).setAlpha(0.18).setDepth(0);
      bg.setScale(Math.max(width / (bg.width || width), height / (bg.height || height)));
    }

    this.createHeading('Select Stage', this.mode === '1v1' ? '1 VS 1  •  8 Battlegrounds' : '1 VS CPU  •  8 Battlegrounds');

    this.buildCards();
    this.registerInput();
    this.setSelection(0);

    this.createFooterHint('WASD / Arrows to choose stage  •  Enter / Space to confirm  •  Esc back');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cards.forEach((card) => card.destroy());
      this.cards = [];
    });
  }

  private buildCards(): void {
    const { centerX } = this.cameras.main;
    const cardWidth = 278;
    const cardHeight = 204;
    const gapX = 24;
    const gapY = 20;
    const totalWidth = cardWidth * COLS + gapX * (COLS - 1);
    const startX = centerX - totalWidth / 2 + cardWidth / 2;
    const startY = 232;

    STAGE_DEFINITIONS.forEach((stage, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);

      const card = createSelectionCard(this, {
        x: startX + col * (cardWidth + gapX),
        y: startY + row * (cardHeight + gapY),
        width: cardWidth,
        height: cardHeight,
        title: stage.label,
        subtitle: stage.subtitle,
        texture: this.textures.exists(stage.key) ? stage.key : undefined,
        imageOffsetY: -22,
        onHover: () => this.setSelection(index),
        onClick: () => this.confirm(index)
      });

      this.cards.push(card);
    });
  }

  private registerInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    keyboard.on('keydown-LEFT', () => this.moveSelection(-1));
    keyboard.on('keydown-A', () => this.moveSelection(-1));
    keyboard.on('keydown-RIGHT', () => this.moveSelection(1));
    keyboard.on('keydown-D', () => this.moveSelection(1));
    keyboard.on('keydown-UP', () => this.moveSelection(-COLS));
    keyboard.on('keydown-W', () => this.moveSelection(-COLS));
    keyboard.on('keydown-DOWN', () => this.moveSelection(COLS));
    keyboard.on('keydown-S', () => this.moveSelection(COLS));
    keyboard.on('keydown-ENTER', () => this.confirm(this.selectedIndex));
    keyboard.on('keydown-SPACE', () => this.confirm(this.selectedIndex));
    keyboard.on('keydown-ESC', () => this.scene.start(SCENE_KEYS.ModeSelect));
    keyboard.on('keydown-BACKSPACE', () => this.scene.start(SCENE_KEYS.ModeSelect));
  }

  private moveSelection(delta: number): void {
    const next = Phaser.Math.Wrap(this.selectedIndex + delta, 0, this.cards.length);
    this.setSelection(next);
  }

  private setSelection(index: number): void {
    this.selectedIndex = index;
    this.cards.forEach((card, cardIndex) => {
      const accent = STAGE_DEFINITIONS[cardIndex]?.accentColor ?? 0xfacc15;
      card.setSelected(cardIndex === index, accent);
    });
  }

  private confirm(index: number): void {
    this.setSelection(index);
    playAudioCue(this, AUDIO_KEYS.uiConfirm, this.app.settingsStore.getState());
    this.scene.start(SCENE_KEYS.CharacterSelect, {
      mode: this.mode,
      stageId: STAGE_DEFINITIONS[index].id
    });
  }
}
