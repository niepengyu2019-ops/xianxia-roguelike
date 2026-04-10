import Phaser from 'phaser';
import { TILE_SIZE } from '../config';

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  level: number;
  exp: number;
}

export class Player {
  x: number;
  y: number;
  stats: PlayerStats;
  expToNext: number;
  sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.stats = {
      hp: 30,
      maxHp: 30,
      mp: 10,
      maxMp: 10,
      atk: 5,
      def: 2,
      level: 1,
      exp: 0,
    };
    this.expToNext = 10;

    this.sprite = scene.add.sprite(x * TILE_SIZE, y * TILE_SIZE, 'player');
    this.sprite.setOrigin(0, 0);
    this.sprite.setDepth(10);
  }

  /** 获得经验，返回是否升级 */
  gainExp(amount: number): boolean {
    this.stats.exp += amount;
    let leveled = false;
    while (this.stats.exp >= this.expToNext) {
      this.stats.exp -= this.expToNext;
      this.levelUp();
      leveled = true;
    }
    return leveled;
  }

  private levelUp() {
    this.stats.level++;
    this.expToNext = Math.floor(this.expToNext * 1.5);
    this.stats.maxHp += 5;
    this.stats.hp = this.stats.maxHp;
    this.stats.maxMp += 3;
    this.stats.mp = this.stats.maxMp;
    this.stats.atk += 2;
    this.stats.def += 1;
  }

  /** 序列化数据（跨楼层保留） */
  saveData() {
    return {
      stats: { ...this.stats },
      expToNext: this.expToNext,
    };
  }

  /** 反序列化数据 */
  loadData(data: { stats: PlayerStats; expToNext: number }) {
    this.stats = { ...data.stats };
    this.expToNext = data.expToNext;
  }
}
