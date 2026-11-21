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
      .text(centerX, 46, title, {
        color: '#f8fafc',
        fontFamily: '"Barlow Condensed", "Plus Jakarta Sans", sans-serif',
        fontSize: '42px',
        fontStyle: 'bold',
        stroke: '#020617',
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(40);

    if (subtitle) {
      this.add
        .text(centerX, 82, subtitle, {
          color: '#94a3b8',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '16px'
        })
        .setOrigin(0.5)
        .setDepth(40);
    }
  }

  protected createFooterHint(text: string): void {
    const { centerX, height } = this.cameras.main;

    this.add
      .text(centerX, height - 24, text, {
        color: '#cbd5e1',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '14px',
        backgroundColor: 'rgba(2, 6, 23, 0.55)',
        padding: { x: 12, y: 4 }
      })
      .setOrigin(0.5)
      .setDepth(100);
  }

  protected goToMenu(): void {
    this.scene.start(SCENE_KEYS.MainMenu);
  }
}
