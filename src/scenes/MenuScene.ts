import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private gameOver = false;
  private victory = false;

  constructor() {
    super({ key: 'Menu' });
  }

  init(data: { gameOver?: boolean; victory?: boolean }) {
    this.gameOver = data.gameOver || false;
    this.victory = data.victory || false;
  }

  create() {
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2;

    // 标题
    this.add
      .text(cx, cy - 100, '仙  途', {
        fontSize: '56px',
        color: '#ffcc00',
        fontFamily: 'serif',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // 副标题
    this.add
      .text(cx, cy - 40, '— 玄幻 Roguelike —', {
        fontSize: '18px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // 状态文字
    if (this.gameOver) {
      this.add
        .text(cx, cy + 10, '你被击败了...', {
          fontSize: '22px',
          color: '#ff4444',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5);
    } else if (this.victory) {
      this.add
        .text(cx, cy + 10, '恭喜通关！妖王已被击败！', {
          fontSize: '22px',
          color: '#44ff44',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5);
    }

    // 开始提示（闪烁效果）
    const startText = this.add
      .text(cx, cy + 70, '按任意键开始游戏', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // 操作提示
    this.add
      .text(cx, cy + 110, '方向键 / WASD 移动  |  空格 等待一回合', {
        fontSize: '12px',
        color: '#666666',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // 按任意键开始
    this.input.keyboard!.once('keydown', () => {
      this.scene.start('Game', { floor: 0 });
    });
  }
}
