import Phaser from 'phaser';
import { TILE_SIZE } from '../config';

export interface EnemyStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
}

export class Enemy {
  x: number;
  y: number;
  name: string;
  stats: EnemyStats;
  expReward: number;
  isBoss: boolean;
  isDead = false;
  sprite: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    name: string,
    textureKey: string,
    stats: EnemyStats,
    expReward: number,
    isBoss = false,
  ) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.stats = stats;
    this.expReward = expReward;
    this.isBoss = isBoss;

    this.sprite = scene.add.sprite(x * TILE_SIZE, y * TILE_SIZE, textureKey);
    this.sprite.setOrigin(0, 0);
    this.sprite.setDepth(5);
  }
}

// ===== 各层敌人配置 =====

interface EnemyDef {
  name: string;
  texture: string;
  hp: number;
  atk: number;
  def: number;
  exp: number;
}

const FLOOR_ENEMIES: EnemyDef[][] = [
  // 第一层
  [
    { name: '低级妖兽', texture: 'enemy_beast', hp: 10, atk: 3, def: 1, exp: 5 },
    { name: '游荡鬼魂', texture: 'enemy_ghost', hp: 8, atk: 4, def: 0, exp: 4 },
  ],
  // 第二层
  [
    { name: '邪修弟子', texture: 'enemy_disciple', hp: 15, atk: 5, def: 2, exp: 8 },
    { name: '妖狼', texture: 'enemy_wolf', hp: 12, atk: 6, def: 1, exp: 7 },
  ],
  // 第三层
  [
    { name: '魔修长老', texture: 'enemy_elder', hp: 20, atk: 7, def: 3, exp: 12 },
    { name: '黑甲卫士', texture: 'enemy_guard', hp: 25, atk: 6, def: 4, exp: 10 },
  ],
];

const BOSS_DEF: EnemyDef = {
  name: '妖王·血蟒',
  texture: 'boss_serpent',
  hp: 60,
  atk: 10,
  def: 5,
  exp: 50,
};

/** 在指定位置生成随机敌人 */
export function createEnemy(scene: Phaser.Scene, x: number, y: number, floor: number): Enemy {
  const defs = FLOOR_ENEMIES[floor] || FLOOR_ENEMIES[0];
  const def = defs[Math.floor(Math.random() * defs.length)];
  return new Enemy(
    scene,
    x,
    y,
    def.name,
    def.texture,
    { hp: def.hp, maxHp: def.hp, atk: def.atk, def: def.def },
    def.exp,
  );
}

/** 生成 Boss */
export function createBoss(scene: Phaser.Scene, x: number, y: number): Enemy {
  return new Enemy(
    scene,
    x,
    y,
    BOSS_DEF.name,
    BOSS_DEF.texture,
    { hp: BOSS_DEF.hp, maxHp: BOSS_DEF.hp, atk: BOSS_DEF.atk, def: BOSS_DEF.def },
    BOSS_DEF.exp,
    true,
  );
}
