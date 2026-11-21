import * as Phaser from 'phaser';

import { getAppContext } from '../game/context';
import type { AppContext } from '../game/context';
import { SCENE_KEYS, type SceneKey } from '../game/types';

export type ShellGameState = 'title' | 'playing' | 'paused' | 'gameover';

export abstract class BaseScene extends Phaser.Scene {
  protected get app(): AppContext {
    return getAppContext();
  }

  protected markActiveScene(sceneKey: SceneKey): void {
    this.app.debugStore.patchState({ activeScene: sceneKey });
  }

  protected setGameState(state: ShellGameState): void {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = state;
    }
  }

  protected createHeading(title: string, subtitle: string): void {
    const { centerX } = this.cameras.main;

    this.add
      .text(centerX, 38, title.toUpperCase(), {
        color: '#f8fafc',
        fontFamily: '"Barlow Condensed", "Plus Jakarta Sans", sans-serif',
        fontSize: '44px',
        fontStyle: 'bold',
        stroke: '#020617',
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.add.rectangle(centerX, 64, 96, 3, 0xfacc15, 0.92).setOrigin(0.5).setDepth(40);

    if (subtitle) {
      this.add
        .text(centerX, 82, subtitle, {
          color: '#cbd5e1',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '15px'
        })
        .setOrigin(0.5)
        .setDepth(40);
    }
  }

  protected createFooterHint(text: string): void {
    const { centerX, width, height } = this.cameras.main;

    this.add
      .rectangle(centerX, height - 18, width, 36, 0x050914, 0.86)
      .setStrokeStyle(1, 0x1e293b, 0.9)
      .setOrigin(0.5)
      .setDepth(99);

    this.add
      .text(centerX, height - 18, text, {
        color: '#cbd5e1',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '13px'
      })
      .setOrigin(0.5)
      .setDepth(100);
  }

  protected goToMenu(): void {
    this.scene.start(SCENE_KEYS.MainMenu);
  }
}
