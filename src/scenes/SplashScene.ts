import * as Phaser from 'phaser';

import { AUDIO_KEYS, playAudioCue } from '../game/core/audio';
import { GAME_TAGLINE, GAME_TITLE } from '../game/constants';
import { TITLE_ARENA_BG_KEY } from '../game/stageConfig';
import { addLeftTitleScrim } from '../game/ui';
import { SCENE_KEYS } from '../game/types';
import { StageAtmosphereEffect } from '../game/vfx';
import { BaseScene } from './BaseScene';

export class SplashScene extends BaseScene {
  private hasAdvanced = false;
  private atmosphere?: StageAtmosphereEffect;

  constructor() {
    super(SCENE_KEYS.Splash);
  }

  create(): void {
    this.hasAdvanced = false;
    this.markActiveScene(SCENE_KEYS.Splash);
    this.setGameState('title');

    const camera = this.cameras.main;
    const { width, height } = camera;
    camera.setBackgroundColor(0x020617);

    if (this.textures.exists(TITLE_ARENA_BG_KEY)) {
      const bg = this.add.image(width / 2, height / 2, TITLE_ARENA_BG_KEY).setDepth(0);
      const scale = Math.max(width / (bg.width || width), height / (bg.height || height));
      bg.setScale(scale);
    }

    addLeftTitleScrim(this, width, height, 1);

    this.atmosphere = new StageAtmosphereEffect(this, width, height, 'cursed');

    const leftX = 88;
    const midY = Math.round(height * 0.44);

    // Accent slash bar
    this.add.rectangle(leftX, midY - 120, 96, 6, 0xfacc15, 1).setOrigin(0, 0.5).setDepth(5);

    this.add
      .text(leftX, midY - 102, GAME_TITLE.toUpperCase(), {
        color: '#f8fafc',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '84px',
        fontStyle: 'bold',
        stroke: '#020617',
        strokeThickness: 10
      })
      .setOrigin(0, 0)
      .setDepth(5);

    this.add
      .text(leftX + 2, midY - 10, GAME_TAGLINE.toUpperCase(), {
        color: '#38bdf8',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '28px',
        fontStyle: 'bold'
      })
      .setOrigin(0, 0)
      .setDepth(5);

    this.add
      .text(leftX + 2, midY + 34, '13 Anime & Street Fighters  •  8 Panoramic Stages', {
        color: '#cbd5e1',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '16px'
      })
      .setOrigin(0, 0)
      .setDepth(5);

    const prompt = this.add
      .text(
        leftX + 2,
        midY + 112,
        this.app.isMobileShell ? 'TAP ANYWHERE TO ENTER ARENA' : 'PRESS ANY KEY OR CLICK TO ENTER',
        {
          color: '#facc15',
          fontFamily: '"Barlow Condensed", sans-serif',
          fontSize: '24px',
          fontStyle: 'bold',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          padding: { x: 18, y: 10 }
        }
      )
      .setOrigin(0, 0)
      .setDepth(5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.55,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    const advanceToMenu = (): void => {
      if (this.hasAdvanced) {
        return;
      }

      this.hasAdvanced = true;
      playAudioCue(this, AUDIO_KEYS.uiConfirm, this.app.settingsStore.getState());
      this.scene.start(SCENE_KEYS.MainMenu);
    };

    this.input.once('pointerup', advanceToMenu);
    this.input.keyboard?.once('keydown', advanceToMenu);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.atmosphere?.destroy();
      this.atmosphere = undefined;
    });
  }

  update(_time: number, delta: number): void {
    this.atmosphere?.update(delta / 1000);
  }
}
