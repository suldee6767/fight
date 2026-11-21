import * as Phaser from 'phaser';

import { AUDIO_KEYS, playAudioCue } from '../game/core/audio';
import { GAME_TAGLINE, GAME_TITLE } from '../game/constants';
import { TITLE_ARENA_BG_KEY } from '../game/stageConfig';
import { addLeftTitleScrim, createTextButton, type TextButton } from '../game/ui';
import { SCENE_KEYS } from '../game/types';
import { StageAtmosphereEffect } from '../game/vfx';
import { BaseScene } from './BaseScene';

interface MenuOption {
  label: string;
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

    const leftX = 96;
    this.add.rectangle(leftX, 118, 84, 5, 0xfacc15, 1).setOrigin(0, 0.5).setDepth(5);
    this.add
      .text(leftX, 134, GAME_TITLE, {
        color: '#f8fafc',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '72px',
        fontStyle: 'bold',
        stroke: '#020617',
        strokeThickness: 8
      })
      .setOrigin(0, 0)
      .setDepth(5);

    this.add
      .text(leftX + 2, 214, GAME_TAGLINE.toUpperCase(), {
        color: '#38bdf8',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '24px',
        fontStyle: 'bold'
      })
      .setOrigin(0, 0)
      .setDepth(5);

    this.renderMenu();

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
      { label: 'Play', action: () => this.scene.start(SCENE_KEYS.ModeSelect) },
      {
        label: 'Quick Match (Gojo vs Sukuna)',
        action: () =>
          this.scene.start(SCENE_KEYS.Match, {
            mode: '1vcpu',
            stageId: 'shibuya-station',
            p1CharacterId: 'gojo',
            p2CharacterId: 'sukuna'
          })
      },
      { label: 'Settings', action: () => this.scene.start(SCENE_KEYS.Settings) }
    ];

    const startY = 312;
    const spacing = 74;

    this.options.forEach((option, optionIndex) => {
      const button = createTextButton(this, {
        x: 284,
        y: startY + optionIndex * spacing,
        width: 376,
        height: 58,
        label: option.label,
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
