import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { Player } from './Player';

export class NPC {
  x: number;
  y: number;
  name: string;
  dialogue: string[];
  onInteract?: (player: Player, emitMessage: (msg: string) => void) => void;
  sprite: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    name: string,
    dialogue: string[],
    onInteract?: (player: Player, emitMessage: (msg: string) => void) => void,
  ) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.dialogue = dialogue;
    this.onInteract = onInteract;

    this.sprite = scene.add.sprite(x * TILE_SIZE, y * TILE_SIZE, 'npc');
    this.sprite.setOrigin(0, 0);
    this.sprite.setDepth(5);
  }
}

// ===== NPC 数据定义 =====

interface NPCDef {
  name: string;
  dialogue: string[];
  onInteract?: (player: Player, emitMessage: (msg: string) => void) => void;
}

const NPC_POOL: NPCDef[] = [
  {
    name: '散修老者',
    dialogue: [
      '年轻人，此地危险重重...',
      '前方的妖兽越来越强大，切记量力而行。',
      '我送你一些灵力，助你一臂之力。',
    ],
    onInteract: (player, emit) => {
      const heal = 10;
      player.stats.hp = Math.min(player.stats.hp + heal, player.stats.maxHp);
      emit(`散修老者为你疗伤，恢复了 ${heal} 点生命！`);
    },
  },
  {
    name: '药师',
    dialogue: [
      '你的气息有些紊乱...',
      '让我为你调理一番。',
      '好了，你的伤势已经痊愈。',
    ],
    onInteract: (player, emit) => {
      player.stats.hp = player.stats.maxHp;
      player.stats.mp = player.stats.maxMp;
      emit('药师为你完全恢复了生命和法力！');
    },
  },
  {
    name: '神秘剑客',
    dialogue: [
      '...',
      '最深处有一头妖王，实力非同小可。',
      '看你骨骼惊奇，传你一招剑法。',
    ],
    onInteract: (player, emit) => {
      player.stats.atk += 1;
      emit('神秘剑客传授了你一招剑法，攻击力 +1！');
    },
  },
  {
    name: '行脚商人',
    dialogue: [
      '嘿，小子！要看看我的好东西吗？',
      '可惜你来得不巧，好货都卖完了。',
      '下次再来吧！不过送你个护身符。',
    ],
    onInteract: (player, emit) => {
      player.stats.def += 1;
      emit('行脚商人送了你一枚护身符，防御力 +1！');
    },
  },
];

/** 在指定位置生成 NPC */
export function createNPC(
  scene: Phaser.Scene,
  x: number,
  y: number,
  _floor: number,
  index: number,
): NPC {
  const def = NPC_POOL[index % NPC_POOL.length];
  return new NPC(scene, x, y, def.name, def.dialogue, def.onInteract);
}
