import Phaser from 'phaser';
import { TILE_SIZE, COLORS } from '../config';

/**
 * 启动场景：生成所有占位纹理，后续替换为 AI 像素美术
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create() {
    // 地形纹理
    this.makeTile('wall', COLORS.WALL, COLORS.WALL_ACCENT, 'brick');
    this.makeTile('floor', COLORS.FLOOR, COLORS.FLOOR_ACCENT, 'dots');
    this.makeTile('stairs', COLORS.STAIRS, COLORS.STAIRS_ACCENT, 'arrow');

    // 玩家
    this.makeHumanoid('player', COLORS.PLAYER, COLORS.PLAYER_ACCENT);

    // NPC
    this.makeHumanoid('npc', COLORS.NPC, COLORS.NPC_ACCENT);

    // ===== 怪物纹理（每种不同外形） =====
    this.makeBeast();      // 低级妖兽 - 四脚小兽
    this.makeGhost();      // 游荡鬼魂 - 飘浮幽灵
    this.makeDisciple();   // 邪修弟子 - 黑袍人形
    this.makeWolf();       // 妖狼 - 尖耳四脚
    this.makeElder();      // 魔修长老 - 高大持杖
    this.makeGuard();      // 黑甲卫士 - 方盾重甲
    this.makeBoss();       // 妖王·血蟒 - 大蛇

    this.scene.start('Menu');
  }

  // ===== 地形 =====

  private makeTile(key: string, bg: number, accent: number, pattern: string) {
    const s = TILE_SIZE;
    const g = this.add.graphics();

    g.fillStyle(bg);
    g.fillRect(0, 0, s, s);

    g.fillStyle(accent);
    if (pattern === 'brick') {
      g.fillRect(0, 0, s, 1);
      g.fillRect(0, 7, s, 1);
      g.fillRect(0, 15, s, 1);
      g.fillRect(4, 0, 1, 7);
      g.fillRect(10, 8, 1, 7);
    } else if (pattern === 'dots') {
      g.fillRect(3, 3, 1, 1);
      g.fillRect(11, 7, 1, 1);
      g.fillRect(7, 12, 1, 1);
    } else if (pattern === 'arrow') {
      g.fillRect(7, 3, 2, 7);
      g.fillRect(5, 8, 2, 2);
      g.fillRect(9, 8, 2, 2);
      g.fillRect(6, 10, 1, 1);
      g.fillRect(9, 10, 1, 1);
      g.fillRect(7, 11, 2, 1);
    }

    g.generateTexture(key, s, s);
    g.destroy();
  }

  // ===== 人形（玩家/NPC通用） =====

  private makeHumanoid(key: string, color: number, accent: number) {
    const s = TILE_SIZE;
    const g = this.add.graphics();
    g.fillStyle(color);
    g.fillRect(5, 2, 6, 4);   // 头
    g.fillRect(4, 6, 8, 6);   // 身体
    g.fillRect(4, 12, 3, 2);  // 左腿
    g.fillRect(9, 12, 3, 2);  // 右腿
    g.fillStyle(accent);
    g.fillRect(6, 3, 2, 2);   // 左眼
    g.fillRect(9, 3, 2, 2);   // 右眼
    g.generateTexture(key, s, s);
    g.destroy();
  }

  // ===== 怪物：低级妖兽（矮胖四脚兽） =====

  private makeBeast() {
    const s = TILE_SIZE;
    const g = this.add.graphics();
    g.fillStyle(0x8b5e3c); // 棕色
    g.fillRect(4, 5, 9, 5);   // 身体
    g.fillRect(3, 3, 5, 3);   // 头
    g.fillRect(4, 10, 2, 3);  // 前左腿
    g.fillRect(9, 10, 2, 3);  // 前右腿
    g.fillRect(12, 4, 2, 2);  // 尾巴
    // 眼睛
    g.fillStyle(0xff6600);
    g.fillRect(4, 4, 1, 1);
    g.fillRect(6, 4, 1, 1);
    // 嘴
    g.fillStyle(0x5a3a1a);
    g.fillRect(3, 6, 1, 1);
    g.generateTexture('enemy_beast', s, s);
    g.destroy();
  }

  // ===== 怪物：游荡鬼魂（飘浮半透明） =====

  private makeGhost() {
    const s = TILE_SIZE;
    const g = this.add.graphics();
    g.fillStyle(0x8888cc); // 淡紫色
    g.fillRect(4, 2, 8, 6);   // 头+身体
    g.fillRect(3, 8, 10, 3);  // 裙摆
    g.fillRect(3, 11, 2, 2);  // 左飘尾
    g.fillRect(7, 11, 2, 2);  // 中飘尾
    g.fillRect(11, 11, 2, 2); // 右飘尾
    // 空洞眼睛
    g.fillStyle(0x000000);
    g.fillRect(5, 4, 2, 2);
    g.fillRect(9, 4, 2, 2);
    // 嘴
    g.fillRect(7, 7, 2, 1);
    g.generateTexture('enemy_ghost', s, s);
    g.destroy();
  }

  // ===== 怪物：邪修弟子（黑袍人形） =====

  private makeDisciple() {
    const s = TILE_SIZE;
    const g = this.add.graphics();
    g.fillStyle(0x333355); // 深蓝黑
    g.fillRect(5, 2, 6, 4);   // 头
    g.fillRect(3, 6, 10, 6);  // 宽袍
    g.fillRect(4, 12, 3, 2);  // 左脚
    g.fillRect(9, 12, 3, 2);  // 右脚
    // 红色眼睛
    g.fillStyle(0xff2222);
    g.fillRect(6, 3, 2, 2);
    g.fillRect(9, 3, 2, 2);
    // 袍子腰带
    g.fillStyle(0x662222);
    g.fillRect(4, 8, 8, 1);
    g.generateTexture('enemy_disciple', s, s);
    g.destroy();
  }

  // ===== 怪物：妖狼（尖耳利爪） =====

  private makeWolf() {
    const s = TILE_SIZE;
    const g = this.add.graphics();
    g.fillStyle(0x555577); // 灰蓝色
    g.fillRect(4, 5, 10, 4);  // 身体
    g.fillRect(2, 3, 5, 4);   // 头
    g.fillRect(2, 1, 2, 2);   // 左耳
    g.fillRect(5, 1, 2, 2);   // 右耳
    g.fillRect(4, 9, 2, 4);   // 前腿
    g.fillRect(10, 9, 2, 4);  // 后腿
    g.fillRect(13, 4, 2, 2);  // 尾巴上翘
    g.fillRect(14, 3, 1, 1);  // 尾尖
    // 眼睛
    g.fillStyle(0xffff00);
    g.fillRect(3, 4, 1, 1);
    g.fillRect(5, 4, 1, 1);
    // 獠牙
    g.fillStyle(0xffffff);
    g.fillRect(2, 7, 1, 1);
    g.generateTexture('enemy_wolf', s, s);
    g.destroy();
  }

  // ===== 怪物：魔修长老（高大 + 法杖） =====

  private makeElder() {
    const s = TILE_SIZE;
    const g = this.add.graphics();
    g.fillStyle(0x442255); // 深紫色
    g.fillRect(5, 1, 6, 4);   // 头
    g.fillRect(4, 5, 8, 7);   // 长袍
    g.fillRect(5, 12, 3, 2);  // 左脚
    g.fillRect(8, 12, 3, 2);  // 右脚
    // 法杖
    g.fillStyle(0xaa8833);
    g.fillRect(13, 2, 1, 11);
    g.fillStyle(0xff44ff);
    g.fillRect(12, 1, 3, 2);  // 杖头宝珠
    // 眼睛（紫光）
    g.fillStyle(0xcc44ff);
    g.fillRect(6, 2, 2, 2);
    g.fillRect(9, 2, 2, 2);
    g.generateTexture('enemy_elder', s, s);
    g.destroy();
  }

  // ===== 怪物：黑甲卫士（重甲 + 方盾） =====

  private makeGuard() {
    const s = TILE_SIZE;
    const g = this.add.graphics();
    g.fillStyle(0x444444); // 铁灰色
    g.fillRect(5, 1, 6, 4);   // 头盔
    g.fillRect(4, 5, 8, 7);   // 甲胄
    g.fillRect(4, 12, 3, 3);  // 左腿
    g.fillRect(9, 12, 3, 3);  // 右腿
    // 盾牌
    g.fillStyle(0x555555);
    g.fillRect(1, 4, 3, 7);
    g.fillStyle(0x666688);
    g.fillRect(2, 5, 1, 5);   // 盾面高光
    // 头盔缝隙（眼睛）
    g.fillStyle(0xdd3333);
    g.fillRect(6, 2, 4, 1);
    // 肩甲高光
    g.fillStyle(0x666666);
    g.fillRect(4, 5, 2, 1);
    g.fillRect(10, 5, 2, 1);
    g.generateTexture('enemy_guard', s, s);
    g.destroy();
  }

  // ===== Boss：妖王·血蟒（大蛇） =====

  private makeBoss() {
    const s = TILE_SIZE;
    const g = this.add.graphics();
    // 蛇身（S形曲线）
    g.fillStyle(0xcc2222); // 血红色
    g.fillRect(2, 2, 5, 4);   // 头
    g.fillRect(7, 4, 4, 3);   // 身段1
    g.fillRect(5, 7, 4, 3);   // 身段2
    g.fillRect(9, 9, 4, 3);   // 身段3
    g.fillRect(11, 12, 3, 2); // 尾
    // 鳞片花纹
    g.fillStyle(0x991111);
    g.fillRect(8, 5, 2, 1);
    g.fillRect(6, 8, 2, 1);
    g.fillRect(10, 10, 2, 1);
    // 眼睛
    g.fillStyle(0xffff00);
    g.fillRect(3, 3, 2, 2);
    g.fillRect(5, 3, 1, 1);
    // 蛇信
    g.fillStyle(0xff6666);
    g.fillRect(1, 5, 2, 1);
    g.fillRect(0, 4, 1, 1);
    g.generateTexture('boss_serpent', s, s);
    g.destroy();
  }
}
