import * as Phaser from 'phaser';

export interface GlassPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: number;
  fillAlpha?: number;
  borderColor?: number;
  borderAlpha?: number;
  accentTopColor?: number;
  depth?: number;
  scrollFactor?: number;
}

export function createGlassPanel(scene: Phaser.Scene, config: GlassPanelConfig): Phaser.GameObjects.Container {
  const depth = config.depth ?? 5;
  const scroll = config.scrollFactor ?? 1;
  const children: Phaser.GameObjects.GameObject[] = [];

  const bg = scene.add
    .rectangle(0, 0, config.width, config.height, config.fillColor ?? 0x091020, config.fillAlpha ?? 0.9)
    .setStrokeStyle(2, config.borderColor ?? 0x1e293b, config.borderAlpha ?? 0.95)
    .setOrigin(0.5);
  children.push(bg);

  const innerSheen = scene.add
    .rectangle(0, -config.height / 2 + 12, config.width - 8, 18, 0xffffff, 0.03)
    .setOrigin(0.5);
  children.push(innerSheen);

  if (config.accentTopColor !== undefined) {
    const topBar = scene.add
      .rectangle(0, -config.height / 2 + 1, Math.min(config.width - 24, 148), 3, config.accentTopColor, 0.98)
      .setOrigin(0.5);
    children.push(topBar);
  }

  return scene.add.container(config.x, config.y, children).setDepth(depth).setScrollFactor(scroll);
}

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
  accentColor?: number;
  onClick(): void;
  onHover?(): void;
}

export function createTextButton(scene: Phaser.Scene, config: TextButtonConfig): TextButton {
  const accent = config.accentColor ?? 0xfacc15;

  const background = scene.add
    .rectangle(0, 0, config.width, config.height, 0x0b1222, 0.9)
    .setStrokeStyle(2, 0x334155, 0.9);
  const indicator = scene.add
    .rectangle(-config.width / 2 + 6, 0, 5, config.height - 14, accent, 0.95)
    .setOrigin(0.5)
    .setVisible(false);
  const label = scene.add
    .text(0, 0, config.label, {
      color: '#cbd5e1',
      fontFamily: '"Barlow Condensed", "Plus Jakarta Sans", sans-serif',
      fontSize: config.width < 200 ? '22px' : '24px',
      fontStyle: 'bold'
    })
    .setOrigin(0.5);

  background.setInteractive({ useHandCursor: true });

  const group = scene.add.container(config.x, config.y, [background, indicator, label]);

  const setSelected = (selected: boolean): void => {
    background.setFillStyle(selected ? 0x13203b : 0x0b1222, selected ? 0.97 : 0.88);
    background.setStrokeStyle(selected ? 2.5 : 1.5, selected ? accent : 0x334155, selected ? 1 : 0.85);
    indicator.setVisible(selected);
    label.setColor(selected ? '#facc15' : '#e2e8f0');

    scene.tweens.killTweensOf(group);
    scene.tweens.add({
      targets: group,
      scaleX: selected ? 1.03 : 1,
      scaleY: selected ? 1.03 : 1,
      duration: 130,
      ease: 'Cubic.Out'
    });
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
      scene.tweens.killTweensOf(group);
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
  metaText?: string;
  metaColor?: string;
  texture?: string;
  badge?: { text: string; color: number };
  rankBadge?: { text: string; color: number };
  topAccentColor?: number;
  baseBorderColor?: number;
  /** Max width/height (px) for the card image; defaults to fitting the card cleanly. */
  imageMaxSize?: number;
  /** Vertical offset of the image centre from the card centre. */
  imageOffsetY?: number;
  onClick?: () => void;
  onHover?: () => void;
}

const CARD_BASE_STROKE = 0x26354d;

/**
 * Create a selectable arcade glass card with animated hover/select lift,
 * top rank trim, aspect-fit portrait/stage socket, title, and clean metadata.
 */
export function createSelectionCard(scene: Phaser.Scene, config: SelectionCardConfig): SelectionCard {
  const defaultStroke = config.baseBorderColor ?? CARD_BASE_STROKE;
  const trimColor = config.topAccentColor ?? config.rankBadge?.color ?? config.baseBorderColor ?? 0x38bdf8;

  const background = scene.add
    .rectangle(0, 0, config.width, config.height, 0x091020, 0.95)
    .setStrokeStyle(2, defaultStroke, 0.92);

  const topTrim = scene.add
    .rectangle(0, -config.height / 2 + 2, config.width - 4, 3, trimColor, 0.96)
    .setOrigin(0.5);

  const children: Phaser.GameObjects.GameObject[] = [background, topTrim];

  const hasSubtitle = Boolean(config.subtitle);
  const hasMeta = Boolean(config.metaText);
  const availW = Math.min(config.width - 20, config.imageMaxSize ?? config.width - 20);
  const availH = Math.min(
    config.height - (hasSubtitle || hasMeta ? 64 : 46),
    config.imageMaxSize ?? config.height - (hasSubtitle || hasMeta ? 64 : 46)
  );
  const imgY = config.imageOffsetY ?? (hasSubtitle || hasMeta ? -20 : -14);

  if (config.texture) {
    const framePad = scene.add
      .rectangle(0, imgY, availW + 6, availH + 6, 0x040710, 0.85)
      .setStrokeStyle(1, 0x1e293b, 0.9)
      .setOrigin(0.5);
    children.push(framePad);

    const image = scene.add.image(0, imgY, config.texture).setOrigin(0.5);
    const srcW = image.width || availW;
    const srcH = image.height || availH;
    const scale = Math.min(availW / srcW, availH / srcH);
    image.setScale(scale);
    children.push(image);
  }

  const badgeY = -config.height / 2 + 14;
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

  const bottomLineY = config.height / 2 - 15;
  const titleY = hasSubtitle || hasMeta ? bottomLineY - 21 : config.height / 2 - 20;

  const title = scene.add
    .text(0, titleY, config.title, {
      color: '#f8fafc',
      fontFamily: '"Barlow Condensed", "Plus Jakarta Sans", sans-serif',
      fontSize: config.width < 168 ? '18px' : config.width < 240 ? '21px' : '24px',
      fontStyle: 'bold',
      align: 'center'
    })
    .setOrigin(0.5);
  children.push(title);

  if (config.metaText) {
    const metaLabel = scene.add
      .text(0, bottomLineY, config.metaText.toUpperCase(), {
        color: config.metaColor ?? '#94a3b8',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: config.width < 175 ? '9.5px' : '11px',
        fontStyle: 'bold',
        align: 'center'
      })
      .setOrigin(0.5);
    children.push(metaLabel);
  } else if (config.subtitle) {
    const subtitle = scene.add
      .text(0, bottomLineY, config.subtitle, {
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
    background.setFillStyle(selected ? 0x13203b : 0x091020, 0.96);
    title.setColor(selected ? '#ffffff' : '#e2e8f0');

    scene.tweens.killTweensOf(container);
    scene.tweens.add({
      targets: container,
      scaleX: selected ? 1.05 : 1,
      scaleY: selected ? 1.05 : 1,
      duration: 140,
      ease: 'Cubic.Out'
    });
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
      scene.tweens.killTweensOf(container);
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

