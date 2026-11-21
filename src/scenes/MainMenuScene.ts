import * as Phaser from 'phaser';

import { AUDIO_KEYS, playAudioCue } from '../game/core/audio';
import { GAME_TAGLINE, GAME_TITLE } from '../game/constants';
import { TITLE_ARENA_BG_KEY } from '../game/stageConfig';
import { addLeftTitleScrim, createGlassPanel, createTextButton, type TextButton } from '../game/ui';
import { SCENE_KEYS } from '../game/types';
import { StageAtmosphereEffect } from '../game/vfx';
import { BaseScene } from './BaseScene';

interface MenuOption {
  label: string;
  accent?: number;
  action: () => void;
}

export class MainMenuScene extends BaseScene {
  private selectedIndex = 0;
  private buttons: TextButton[] = [];
  private options: MenuOption[] = [];
  private atmosphere?: StageAtmosphereEffect;

  constructor() {
    super(SCENE_KEYS.MainMenu);
  }

  create(): void {
    this.buttons = [];
    this.selectedIndex = 0;
    this.options = [];

    this.markActiveScene(SCENE_KEYS.MainMenu);
    this.setGameState('title');

    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor(0x020617);

    if (this.textures.exists(TITLE_ARENA_BG_KEY)) {
      const bg = this.add.image(width / 2, height / 2, TITLE_ARENA_BG_KEY).setDepth(0);
      const scale = Math.max(width / (bg.width || width), height / (bg.height || height));
      bg.setScale(scale);
    }

    addLeftTitleScrim(this, width, height, 1);

    this.atmosphere = new StageAtmosphereEffect(this, width, height, 'cursed');

    const leftX = 88;
    this.add.rectangle(leftX, 88, 96, 5, 0xfacc15, 1).setOrigin(0, 0.5).setDepth(5);
    this.add
      .text(leftX, 104, GAME_TITLE, {
        color: '#f8fafc',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '74px',
        fontStyle: 'bold',
        stroke: '#020617',
        strokeThickness: 8
      })
      .setOrigin(0, 0)
      .setDepth(5);

    this.add
      .text(leftX + 2, 186, `${GAME_TAGLINE.toUpperCase()}  •  15 FIGHTERS`, {
        color: '#38bdf8',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '24px',
        fontStyle: 'bold'
      })
      .setOrigin(0, 0)
      .setDepth(5);

    createGlassPanel(this, {
      x: 288,
      y: 428,
      width: 416,
      height: 324,
      borderColor: 0x334155,
      accentTopColor: 0xfacc15,
      depth: 4
    });

    this.renderMenu();
    this.buildControlsCard(width);

    const keyUp = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    const keyDown = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    const keyW = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const keyS = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const keyEnter = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const keySpace = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    keyUp?.on('down', () => this.moveSelection(-1));
    keyW?.on('down', () => this.moveSelection(-1));
    keyDown?.on('down', () => this.moveSelection(1));
    keyS?.on('down', () => this.moveSelection(1));
    keyEnter?.on('down', () => this.confirmOption(this.options[this.selectedIndex]));
    keySpace?.on('down', () => this.confirmOption(this.options[this.selectedIndex]));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearButtons();
      this.atmosphere?.destroy();
      this.atmosphere = undefined;
      this.selectedIndex = 0;
      this.options = [];
    });

    this.createFooterHint('Up/Down or W/S to navigate  •  Enter / Space to confirm');
  }

  update(_time: number, delta: number): void {
    this.atmosphere?.update(delta / 1000);
  }

  private buildControlsCard(width: number): void {
    const cardW = 356;
    const cardH = 192;
    const cardX = width - cardW / 2 - 48;
    const cardY = 564;

    createGlassPanel(this, {
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      fillAlpha: 0.88,
      borderColor: 0x38bdf8,
      accentTopColor: 0x38bdf8,
      depth: 4
    });

    const left = cardX - cardW / 2 + 22;
    this.add
      .text(left, cardY - 68, 'ARENA COMBAT GUIDE', {
        color: '#facc15',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '20px',
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(6);

    const lines = [
      'Move / Jump:  WASD  (P2: Arrows)',
      'Light / Heavy:  F / G  (P2: , / .)',
      'Block & Parry:  Hold Back or C (P2: /)',
      'Offense / Defense Stance:  Q  (P2: K)',
      'Special Finisher:  V  (P2: L) at 100%'
    ];

    lines.forEach((line, index) => {
      this.add
        .text(left, cardY - 36 + index * 26, line, {
          color: '#e2e8f0',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '13px'
        })
        .setOrigin(0, 0.5)
        .setDepth(6);
    });
  }

  private moveSelection(direction: number): void {
    const next = Phaser.Math.Wrap(this.selectedIndex + direction, 0, this.buttons.length);
    this.setSelection(next);
  }

  private setSelection(index: number): void {
    this.selectedIndex = index;
    this.buttons.forEach((button, buttonIndex) => {
      button.setSelected(buttonIndex === index);
    });
  }

  private renderMenu(): void {
    this.clearButtons();

    this.options = [
      { label: 'Play  (Mode → Stage → Fighters)', accent: 0xfacc15, action: () => this.scene.start(SCENE_KEYS.ModeSelect) },
      {
        label: 'Quick Match: Genghis Khan vs Gojo',
        accent: 0xf59e0b,
        action: () =>
          this.scene.start(SCENE_KEYS.Match, {
            mode: '1vcpu',
            stageId: 'final-valley',
            p1CharacterId: 'genghis-khan',
            p2CharacterId: 'gojo'
          })
      },
      {
        label: 'Quick Match: Gojo vs Sukuna',
        accent: 0x38bdf8,
        action: () =>
          this.scene.start(SCENE_KEYS.Match, {
            mode: '1vcpu',
            stageId: 'shibuya-station',
            p1CharacterId: 'gojo',
            p2CharacterId: 'sukuna'
          })
      },
      { label: 'Settings', accent: 0x94a3b8, action: () => this.scene.start(SCENE_KEYS.Settings) }
    ];

    const startY = 314;
    const spacing = 70;

    this.options.forEach((option, optionIndex) => {
      const button = createTextButton(this, {
        x: 288,
        y: startY + optionIndex * spacing,
        width: 376,
        height: 54,
        label: option.label,
        accentColor: option.accent,
        onClick: () => this.confirmOption(option),
        onHover: () => this.setSelection(optionIndex)
      });
      button.group.setDepth(10);
      this.buttons.push(button);
    });

    this.setSelection(0);
  }

  private clearButtons(): void {
    this.buttons.forEach((button) => {
      button.destroy();
    });
    this.buttons = [];
  }

  private confirmOption(option?: MenuOption): void {
    if (!option) {
      return;
    }

    playAudioCue(this, AUDIO_KEYS.uiConfirm, this.app.settingsStore.getState());
    option.action();
  }
}
