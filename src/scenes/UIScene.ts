import Phaser from 'phaser';
import type { GameScene } from './GameScene';

interface DialogueData {
  name: string;
  lines: string[];
  onComplete: () => void;
}

/**
 * UI 覆盖层场景，与 GameScene 并行运行
 * 显示：血条、属性、消息日志、对话框
 */
export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;

  // HUD 元素
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private mpBarBg!: Phaser.GameObjects.Rectangle;
  private mpBar!: Phaser.GameObjects.Rectangle;
  private statsText!: Phaser.GameObjects.Text;
  private floorText!: Phaser.GameObjects.Text;

  // 小地图
  private minimap!: Phaser.GameObjects.Graphics;
  private minimapBg!: Phaser.GameObjects.Rectangle;
  private readonly MINIMAP_SCALE = 2;

  // 消息日志
  private messages: string[] = [];
  private messageTexts: Phaser.GameObjects.Text[] = [];

  // 对话框
  private dialogueContainer!: Phaser.GameObjects.Container;
  private dialogueNameText!: Phaser.GameObjects.Text;
  private dialogueBodyText!: Phaser.GameObjects.Text;
  private dialogueLines: string[] = [];
  private dialogueIndex = 0;
  private dialogueCallback: (() => void) | null = null;
  private isDialogueOpen = false;

  constructor() {
    super({ key: 'UI' });
  }

  init(data: { gameScene: GameScene }) {
    this.gameScene = data.gameScene;
    this.messages = [];
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // ===== HP 条 =====
    this.hpBarBg = this.add.rectangle(12, 12, 200, 16, 0x333333).setOrigin(0).setScrollFactor(0);
    this.hpBar = this.add.rectangle(12, 12, 200, 16, 0xcc2222).setOrigin(0).setScrollFactor(0);

    // ===== MP 条 =====
    this.mpBarBg = this.add.rectangle(12, 32, 200, 10, 0x333333).setOrigin(0).setScrollFactor(0);
    this.mpBar = this.add.rectangle(12, 32, 200, 10, 0x2244cc).setOrigin(0).setScrollFactor(0);

    // ===== 属性文字 =====
    this.statsText = this.add.text(12, 48, '', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });

    // ===== 楼层标识 =====
    this.floorText = this.add
      .text(w - 12, 12, '', {
        fontSize: '14px',
        color: '#ffcc00',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0);

    // ===== 小地图（右上角） =====
    this.createMinimap(w);

    // ===== 消息日志（底部） =====
    for (let i = 0; i < 5; i++) {
      const t = this.add.text(12, h - 90 + i * 16, '', {
        fontSize: '12px',
        color: '#cccccc',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 2,
      });
      this.messageTexts.push(t);
    }

    // ===== 对话框 =====
    this.createDialogueBox(w, h);

    // ===== 事件监听 =====
    this.game.events.on('hud:update', this.updateHUD, this);
    this.game.events.on('message', this.addMessage, this);
    this.game.events.on('dialogue:open', this.openDialogue, this);

    // 对话推进按键
    this.input.keyboard!.on('keydown-SPACE', this.advanceDialogue, this);
    this.input.keyboard!.on('keydown-ENTER', this.advanceDialogue, this);

    this.updateHUD();
  }

  // ===== HUD 更新 =====

  private updateHUD() {
    if (!this.gameScene?.player) return;
    const p = this.gameScene.player;

    // HP 条宽度
    const hpRatio = Math.max(0, p.stats.hp / p.stats.maxHp);
    this.hpBar.setSize(200 * hpRatio, 16);

    // MP 条宽度
    const mpRatio = Math.max(0, p.stats.mp / p.stats.maxMp);
    this.mpBar.setSize(200 * mpRatio, 10);

    // 属性文字
    this.statsText.setText(
      `HP ${p.stats.hp}/${p.stats.maxHp}  MP ${p.stats.mp}/${p.stats.maxMp}\n` +
        `Lv.${p.stats.level}  攻:${p.stats.atk}  防:${p.stats.def}  ` +
        `经验:${p.stats.exp}/${p.expToNext}`,
    );

    // 楼层
    this.floorText.setText(`第 ${this.gameScene.currentFloor + 1} 层`);

    // 刷新小地图
    this.drawMinimap();
  }

  // ===== 消息日志 =====

  private addMessage(msg: string) {
    this.messages.push(msg);
    if (this.messages.length > 5) this.messages.shift();
    for (let i = 0; i < this.messageTexts.length; i++) {
      this.messageTexts[i].setText(this.messages[i] || '');
    }
  }

  // ===== 对话系统 =====

  private createDialogueBox(w: number, h: number) {
    const boxW = w - 60;
    const boxH = 130;
    const boxX = 30;
    const boxY = h - boxH - 100;

    this.dialogueContainer = this.add.container(0, 0);
    this.dialogueContainer.setVisible(false);
    this.dialogueContainer.setDepth(200);

    // 背景
    const bg = this.add.rectangle(boxX, boxY, boxW, boxH, 0x000000, 0.9);
    bg.setOrigin(0);
    bg.setStrokeStyle(2, 0x886633);

    // 名字
    this.dialogueNameText = this.add.text(boxX + 16, boxY + 12, '', {
      fontSize: '16px',
      color: '#ffcc00',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });

    // 正文
    this.dialogueBodyText = this.add.text(boxX + 16, boxY + 40, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      wordWrap: { width: boxW - 40 },
      lineSpacing: 4,
    });

    // 继续提示
    const hint = this.add
      .text(boxX + boxW - 16, boxY + boxH - 14, '[ 空格/回车 继续 ]', {
        fontSize: '11px',
        color: '#888888',
        fontFamily: 'monospace',
      })
      .setOrigin(1, 1);

    this.dialogueContainer.add([bg, this.dialogueNameText, this.dialogueBodyText, hint]);
  }

  private openDialogue(data: DialogueData) {
    this.dialogueLines = data.lines;
    this.dialogueIndex = 0;
    this.dialogueCallback = data.onComplete;
    this.isDialogueOpen = true;

    this.dialogueNameText.setText(data.name);
    this.dialogueBodyText.setText(data.lines[0]);
    this.dialogueContainer.setVisible(true);
  }

  private advanceDialogue() {
    if (!this.isDialogueOpen) return;

    this.dialogueIndex++;
    if (this.dialogueIndex >= this.dialogueLines.length) {
      this.closeDialogue();
      return;
    }
    this.dialogueBodyText.setText(this.dialogueLines[this.dialogueIndex]);
  }

  private closeDialogue() {
    this.dialogueContainer.setVisible(false);
    this.isDialogueOpen = false;
    if (this.dialogueCallback) {
      this.dialogueCallback();
      this.dialogueCallback = null;
    }
  }

  // ===== 小地图 =====

  private createMinimap(screenW: number) {
    const gs = this.gameScene;
    if (!gs.dungeon) return;

    const mw = gs.dungeon.width * this.MINIMAP_SCALE;
    const mh = gs.dungeon.height * this.MINIMAP_SCALE;
    const mx = screenW - mw - 10;
    const my = 30;

    this.minimapBg = this.add.rectangle(mx - 2, my - 2, mw + 4, mh + 4, 0x000000, 0.6);
    this.minimapBg.setOrigin(0);
    this.minimapBg.setDepth(50);

    this.minimap = this.add.graphics();
    this.minimap.setPosition(mx, my);
    this.minimap.setDepth(51);

    this.drawMinimap();
  }

  private drawMinimap() {
    if (!this.minimap || !this.gameScene?.dungeon) return;

    const gs = this.gameScene;
    const s = this.MINIMAP_SCALE;
    const g = this.minimap;
    g.clear();

    for (let y = 0; y < gs.dungeon.height; y++) {
      for (let x = 0; x < gs.dungeon.width; x++) {
        const key = `${x},${y}`;
        if (!gs.explored.has(key)) continue;

        const tile = gs.dungeon.tiles[y][x];
        const inFov = gs.visible.has(key);

        if (tile === 1) {
          g.fillStyle(inFov ? 0x666688 : 0x3a3a4a);
        } else if (tile === 2) {
          g.fillStyle(0xddaa00);
        } else {
          g.fillStyle(inFov ? 0x555566 : 0x2a2a3a);
        }
        g.fillRect(x * s, y * s, s, s);
      }
    }

    // 敌人红点（仅视野内）
    g.fillStyle(0xff3333);
    for (const enemy of gs.enemies) {
      if (enemy.isDead) continue;
      if (gs.visible.has(`${enemy.x},${enemy.y}`)) {
        g.fillRect(enemy.x * s, enemy.y * s, s, s);
      }
    }

    // NPC 绿点（仅视野内）
    g.fillStyle(0x33ff66);
    for (const npc of gs.npcs) {
      if (gs.visible.has(`${npc.x},${npc.y}`)) {
        g.fillRect(npc.x * s, npc.y * s, s, s);
      }
    }

    // 玩家白点
    g.fillStyle(0xffffff);
    g.fillRect(gs.player.x * s - 1, gs.player.y * s - 1, s + 2, s + 2);
  }

  // ===== 清理 =====

  shutdown() {
    this.game.events.off('hud:update', this.updateHUD, this);
    this.game.events.off('message', this.addMessage, this);
    this.game.events.off('dialogue:open', this.openDialogue, this);
  }
}
