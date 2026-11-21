import { preloadStarterAssets, registerStarterAnimations } from '../game/assets';
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
  constructor() {
    super(SCENE_KEYS.Boot);
  }

  preload(): void {
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
    void prepareMyFighters(this)
      .catch((error) => console.error('[my-fighter] could not prepare fighters', error))
      .then(() => {
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
}
