import * as Phaser from 'phaser';

import { preloadStarterAssets, registerStarterAnimations } from '../game/assets';
import { GAME_TITLE } from '../game/constants';
import { registerGeneratedAssets } from '../game/generatedAssets';
import { prepareMyFighters } from '../game/myFighterLoader';
import { stripFlatPortraitBackgroundCanvas } from '../game/rawSheet';
import { registerTileAtlasFrames } from '../game/tileAtlas';
import { registerQuestUiAtlasFrames } from '../game/uiAtlas';
import { registerFightingUiAtlasFrames } from '../game/fightingUiAtlas';
import { SCENE_KEYS } from '../game/types';
import { BaseScene } from './BaseScene';

const PORTRAITS_TO_KEY = ['red-brawler-portrait', 'bayasaa-portrait'] as const;

export class BootScene extends BaseScene {
  private barFill?: Phaser.GameObjects.Rectangle;
  private statusText?: Phaser.GameObjects.Text;
  private barWidth = 420;

  constructor() {
    super(SCENE_KEYS.Boot);
  }

  preload(): void {
    this.buildLoadingScreen();

    const handleProgress = (value: number): void => {
      this.setBootProgress(value * 0.58, 'Loading Stages & Atlases...');
    };
    this.load.on('progress', handleProgress);
    this.load.once('complete', () => {
      this.load.off('progress', handleProgress);
      this.setBootProgress(0.6, 'Slicing Fighters...');
    });

    preloadStarterAssets(this);
  }

  create(): void {
    this.markActiveScene(SCENE_KEYS.Boot);
    registerGeneratedAssets(this);
    registerTileAtlasFrames(this);
    registerQuestUiAtlasFrames(this);
    registerFightingUiAtlasFrames(this);

    for (const portraitKey of PORTRAITS_TO_KEY) {
      if (!this.textures.exists(portraitKey)) {
        continue;
      }
      const source = this.textures.get(portraitKey).getSourceImage();
      if (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement) {
        const cleaned = stripFlatPortraitBackgroundCanvas(source);
        this.textures.remove(portraitKey);
        this.textures.addCanvas(portraitKey, cleaned);
      }
    }

    // Fighters from myFighters.ts are sliced from raw pictures first, because
    // their frame counts are only known once the pictures are read.
    void prepareMyFighters(this, (completed, total, fighterName) => {
      const frac = total > 0 ? completed / total : 1;
      this.setBootProgress(0.6 + frac * 0.4, `Preparing Fighters (${completed}/${total}): ${fighterName}`);
    })
      .catch((error) => console.error('[my-fighter] could not prepare fighters', error))
      .then(() => {
        this.setBootProgress(1, 'Entering Arena...');
        registerStarterAnimations(this);
        const autostart =
          typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).get('autostart') === '1';

        if (autostart) {
          this.scene.start(SCENE_KEYS.Match, {
            mode: '1vcpu',
            stageId: 'shibuya-station',
            p1CharacterId: 'gojo',
            p2CharacterId: 'sukuna'
          });
          return;
        }

        this.scene.start(SCENE_KEYS.Splash);
      });
  }

  private buildLoadingScreen(): void {
    const { centerX, centerY, width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor(0x020617);

    this.add.rectangle(centerX, centerY, width, height, 0x020617, 1);
    this.add.rectangle(centerX, centerY - 68, 84, 5, 0xfacc15, 1);

    this.add
      .text(centerX, centerY - 28, GAME_TITLE.toUpperCase(), {
        color: '#f8fafc',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '58px',
        fontStyle: 'bold',
        stroke: '#0f172a',
        strokeThickness: 6
      })
      .setOrigin(0.5);

    this.barWidth = Math.min(460, Math.round(width * 0.52));
    const barY = centerY + 34;

    this.add
      .rectangle(centerX, barY, this.barWidth + 6, 18, 0x0b1224, 0.95)
      .setStrokeStyle(2, 0x38bdf8, 0.75);

    this.barFill = this.add
      .rectangle(centerX - this.barWidth / 2, barY, 4, 12, 0xfacc15, 1)
      .setOrigin(0, 0.5);

    this.statusText = this.add
      .text(centerX, barY + 26, 'Loading Arena Assets...', {
        color: '#94a3b8',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '13px'
      })
      .setOrigin(0.5);
  }

  private setBootProgress(fraction: number, label: string): void {
    const clamped = Phaser.Math.Clamp(fraction, 0.02, 1);
    this.barFill?.setDisplaySize(Math.round(this.barWidth * clamped), 12);
    this.statusText?.setText(`${label}  ${Math.round(clamped * 100)}%`);
  }
}
