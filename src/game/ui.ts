import * as Phaser from 'phaser';

export interface TextButton {
  group: Phaser.GameObjects.Container;
  setSelected(selected: boolean): void;
  destroy(): void;
}

interface TextButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick(): void;
  onHover?(): void;
}

export function createTextButton(scene: Phaser.Scene, config: TextButtonConfig): TextButton {
  const background = scene.add.image(config.x, config.y, 'ui-button');
  const label = scene.add.text(config.x, config.y, config.label, {
    color: '#e2e8f0',
    fontFamily: '"Barlow Condensed", "Plus Jakarta Sans", sans-serif',
    fontSize: '26px',
    fontStyle: 'bold'
  });

  background.setDisplaySize(config.width, config.height);
  background.setInteractive({ useHandCursor: true });
  label.setOrigin(0.5);

  const group = scene.add.container(0, 0, [background, label]);

  const setSelected = (selected: boolean): void => {
    background.setTexture(selected ? 'ui-button-active' : 'ui-button');
    label.setColor(selected ? '#ffffff' : '#cbd5e1');
  };

  background.on('pointerover', () => {
    config.onHover?.();
  });
  background.on('pointerdown', () => {
    config.onClick();
  });

  setSelected(false);

  return {
    group,
    setSelected,
    destroy: () => {
      group.destroy(true);
    }
  };
}

export interface SelectionCard {
  container: Phaser.GameObjects.Container;
  setSelected(selected: boolean, accent?: number): void;
  setDimmed(dimmed: boolean): void;
  flashLock(onComplete: () => void): void;
  destroy(): void;
}

export interface SelectionCardConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle?: string;
  texture?: string;
  badge?: { text: string; color: number };
  rankBadge?: { text: string; color: number };
  baseBorderColor?: number;
  /** Max width/height (px) for the card image; defaults to fitting the card cleanly. */
  imageMaxSize?: number;
  /** Vertical offset of the image centre from the card centre. */
  imageOffsetY?: number;
  onClick?: () => void;
  onHover?: () => void;
}

const CARD_BASE_STROKE = 0x334155;

/**
 * Create a selectable card: a framed panel with an optional aspect-fit image,
 * optional corner badge(s), title and subtitle, plus selection highlighting and
 * lock-in flash.
 */
export function createSelectionCard(scene: Phaser.Scene, config: SelectionCardConfig): SelectionCard {
  const defaultStroke = config.baseBorderColor ?? CARD_BASE_STROKE;
  const background = scene.add
    .rectangle(0, 0, config.width, config.height, 0x0b1222, 0.94)
    .setStrokeStyle(2, defaultStroke, 1);

  const children: Phaser.GameObjects.GameObject[] = [background];

  const hasSubtitle = Boolean(config.subtitle);
  const availW = Math.min(config.width - 18, config.imageMaxSize ?? config.width - 18);
  const availH = Math.min(config.height - (hasSubtitle ? 64 : 46), config.imageMaxSize ?? config.height - (hasSubtitle ? 64 : 46));

  if (config.texture) {
    const image = scene.add.image(0, config.imageOffsetY ?? (hasSubtitle ? -22 : -15), config.texture).setOrigin(0.5);
    const srcW = image.width || availW;
    const srcH = image.height || availH;
    const scale = Math.min(availW / srcW, availH / srcH);
    image.setScale(scale);
    children.push(image);
  }

  const badgeY = -config.height / 2 + 12;
  if (config.badge && config.rankBadge) {
    const chipW = Math.min(68, Math.floor((config.width - 12) / 2));
    const leftX = -config.width / 2 + chipW / 2 + 4;
    const rightX = config.width / 2 - chipW / 2 - 4;

    const leftBg = scene.add.rectangle(leftX, badgeY, chipW, 17, config.badge.color, 0.92).setOrigin(0.5);
    const leftTxt = scene.add
      .text(leftX, badgeY, config.badge.text.toUpperCase(), {
        color: '#020617',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '8.5px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const rightBg = scene.add.rectangle(rightX, badgeY, chipW, 17, config.rankBadge.color, 0.95).setOrigin(0.5);
    const rightTxt = scene.add
      .text(rightX, badgeY, config.rankBadge.text.toUpperCase(), {
        color: '#020617',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '8.5px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    children.push(leftBg, leftTxt, rightBg, rightTxt);
  } else if (config.badge) {
    const chipBg = scene.add
      .rectangle(0, badgeY, Math.min(config.width - 16, 76), 18, config.badge.color, 0.92)
      .setOrigin(0.5);
    const chipTxt = scene.add
      .text(0, badgeY, config.badge.text.toUpperCase(), {
        color: '#020617',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '10px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    children.push(chipBg, chipTxt);
  } else if (config.rankBadge) {
    const chipBg = scene.add
      .rectangle(0, badgeY, Math.min(config.width - 16, 82), 18, config.rankBadge.color, 0.95)
      .setOrigin(0.5);
    const chipTxt = scene.add
      .text(0, badgeY, config.rankBadge.text.toUpperCase(), {
        color: '#020617',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '10px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    children.push(chipBg, chipTxt);
  }

  const subtitleY = config.height / 2 - 15;
  const titleY = hasSubtitle ? subtitleY - 21 : config.height / 2 - 20;

  const title = scene.add
    .text(0, titleY, config.title, {
      color: '#f8fafc',
      fontFamily: '"Barlow Condensed", "Plus Jakarta Sans", sans-serif',
      fontSize: config.width < 165 ? '17px' : config.width < 240 ? '20px' : '22px',
      fontStyle: 'bold',
      align: 'center'
    })
    .setOrigin(0.5);
  children.push(title);

  if (config.subtitle) {
    const subtitle = scene.add
      .text(0, subtitleY, config.subtitle, {
        color: '#94a3b8',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: config.width < 220 ? '11px' : '13px',
        align: 'center'
      })
      .setOrigin(0.5);
    children.push(subtitle);
  }

  const flash = scene.add
    .rectangle(0, 0, config.width, config.height, 0xffffff, 0)
    .setOrigin(0.5);
  children.push(flash);

  const container = scene.add.container(config.x, config.y, children);

  background.setInteractive({ useHandCursor: true });
  background.on('pointerover', () => config.onHover?.());
  background.on('pointerdown', () => config.onClick?.());

  const setSelected = (selected: boolean, accent: number = 0x38bdf8): void => {
    background.setStrokeStyle(selected ? 3 : 2, selected ? accent : defaultStroke, selected ? 1 : 0.85);
    background.setFillStyle(selected ? 0x13203b : 0x0b1222, 0.96);
    container.setScale(selected ? 1.04 : 1);
    title.setColor(selected ? '#ffffff' : '#e2e8f0');
  };

  const setDimmed = (dimmed: boolean): void => {
    container.setAlpha(dimmed ? 0.4 : 1);
  };

  const flashLock = (onComplete: () => void): void => {
    scene.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 0.85 },
      duration: 85,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        flash.setAlpha(0);
        onComplete();
      }
    });
  };

  setSelected(false);

  return {
    container,
    setSelected,
    setDimmed,
    flashLock,
    destroy: () => {
      container.destroy(true);
    }
  };
}

const LEFT_SCRIM_TEXTURE_KEY = 'ui-left-title-scrim';

/**
 * Adds a smooth horizontal gradient scrim that keeps left-aligned title copy
 * legible while letting the right-hand arena illustration shine cleanly.
 */
export function addLeftTitleScrim(
  scene: Phaser.Scene,
  width: number,
  height: number,
  depth = 1
): Phaser.GameObjects.Image {
  if (!scene.textures.exists(LEFT_SCRIM_TEXTURE_KEY)) {
    const tex = scene.textures.createCanvas(LEFT_SCRIM_TEXTURE_KEY, 256, 2);
    if (tex) {
      const ctx = tex.getContext();
      const grad = ctx.createLinearGradient(0, 0, 256, 0);
      grad.addColorStop(0, 'rgba(2, 6, 23, 0.90)');
      grad.addColorStop(0.36, 'rgba(2, 6, 23, 0.78)');
      grad.addColorStop(0.62, 'rgba(2, 6, 23, 0.42)');
      grad.addColorStop(0.84, 'rgba(2, 6, 23, 0.14)');
      grad.addColorStop(1, 'rgba(2, 6, 23, 0.04)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 2);
      tex.refresh();
    }
  }

  return scene.add
    .image(0, 0, LEFT_SCRIM_TEXTURE_KEY)
    .setOrigin(0, 0)
    .setDisplaySize(width, height)
    .setDepth(depth);
}

