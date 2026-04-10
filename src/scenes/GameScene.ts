import Phaser from 'phaser';
import * as ROT from 'rot-js';
import { TILE_SIZE, CAMERA_ZOOM, FLOOR_COUNT, FOV_RADIUS, AGGRO_RANGE } from '../config';
import { generateDungeon, DungeonData } from '../dungeon/DungeonGenerator';
import { Player, PlayerStats } from '../entities/Player';
import { Enemy, createEnemy, createBoss } from '../entities/Enemy';
import { NPC, createNPC } from '../entities/NPC';

interface InitData {
  floor?: number;
  playerData?: { stats: PlayerStats; expToNext: number } | null;
}

export class GameScene extends Phaser.Scene {
  player!: Player;
  enemies: Enemy[] = [];
  npcs: NPC[] = [];
  dungeon!: DungeonData;
  currentFloor = 0;

  // 渲染
  private tileSprites: (Phaser.GameObjects.Sprite | null)[][] = [];

  // 视野
  private visible = new Set<string>();
  private explored = new Set<string>();

  // 状态
  private inputLocked = false;
  private gameOver = false;
  private savedPlayerData: InitData['playerData'] = null;

  // 输入：长按持续移动
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private moveTimer = 0;
  private readonly FIRST_MOVE_DELAY = 0;    // 首次按下立即响应
  private readonly REPEAT_MOVE_DELAY = 120; // 长按时每 120ms 移动一格

  constructor() {
    super({ key: 'Game' });
  }

  init(data: InitData) {
    this.currentFloor = data.floor || 0;
    this.savedPlayerData = data.playerData || null;
    this.enemies = [];
    this.npcs = [];
    this.tileSprites = [];
    this.visible = new Set();
    this.explored = new Set();
    this.inputLocked = false;
    this.gameOver = false;
  }

  create() {
    // 生成地牢
    this.dungeon = generateDungeon(this.currentFloor);
    this.renderDungeon();

    // 创建玩家
    this.player = new Player(this, this.dungeon.playerStart.x, this.dungeon.playerStart.y);
    if (this.savedPlayerData) {
      this.player.loadData(this.savedPlayerData);
    }

    // 生成敌人
    this.spawnEnemies();

    // 生成 NPC
    this.spawnNPCs();

    // 摄像机
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setBounds(
      0,
      0,
      this.dungeon.width * TILE_SIZE,
      this.dungeon.height * TILE_SIZE,
    );

    // 输入
    this.setupInput();

    // 视野
    this.updateFOV();

    // UI 场景
    if (this.scene.isActive('UI')) {
      this.scene.stop('UI');
    }
    this.scene.launch('UI', { gameScene: this });

    this.emitMessage(`—— 第 ${this.currentFloor + 1} 层 ——`);
  }

  // ===== 渲染 =====

  private renderDungeon() {
    for (let y = 0; y < this.dungeon.height; y++) {
      this.tileSprites[y] = [];
      for (let x = 0; x < this.dungeon.width; x++) {
        const tile = this.dungeon.tiles[y][x];
        let texture: string;
        if (tile === 1) texture = 'wall';
        else if (tile === 2) texture = 'stairs';
        else texture = 'floor';

        const sprite = this.add.sprite(x * TILE_SIZE, y * TILE_SIZE, texture);
        sprite.setOrigin(0, 0);
        sprite.setDepth(tile === 2 ? 1 : 0);
        sprite.setAlpha(0); // 初始隐藏，FOV 控制可见度
        this.tileSprites[y][x] = sprite;
      }
    }
  }

  // ===== 实体生成 =====

  private spawnEnemies() {
    for (const pos of this.dungeon.enemySpawns) {
      this.enemies.push(createEnemy(this, pos.x, pos.y, this.currentFloor));
    }
    if (this.dungeon.bossSpawn) {
      this.enemies.push(createBoss(this, this.dungeon.bossSpawn.x, this.dungeon.bossSpawn.y));
    }
  }

  private spawnNPCs() {
    for (let i = 0; i < this.dungeon.npcSpawns.length; i++) {
      const pos = this.dungeon.npcSpawns[i];
      this.npcs.push(createNPC(this, pos.x, pos.y, this.currentFloor, i));
    }
  }

  // ===== 输入 =====

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    // 空格等待（仍用单次触发）
    this.wasd.space.on('down', () => {
      if (this.inputLocked || this.gameOver) return;
      this.emitMessage('你原地等待...');
      this.endPlayerTurn();
    });
  }

  /** 每帧轮询方向键，支持长按持续移动 */
  update(_time: number, delta: number) {
    if (this.inputLocked || this.gameOver) return;

    this.moveTimer -= delta;
    if (this.moveTimer > 0) return;

    let dx = 0;
    let dy = 0;

    if (this.cursors.up?.isDown || this.wasd.w?.isDown) dy = -1;
    else if (this.cursors.down?.isDown || this.wasd.s?.isDown) dy = 1;
    else if (this.cursors.left?.isDown || this.wasd.a?.isDown) dx = -1;
    else if (this.cursors.right?.isDown || this.wasd.d?.isDown) dx = 1;

    if (dx !== 0 || dy !== 0) {
      this.handlePlayerAction(dx, dy);
      this.moveTimer = this.REPEAT_MOVE_DELAY;
    }
  }

  // ===== 玩家行动 =====

  private handlePlayerAction(dx: number, dy: number) {
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    // 边界 & 墙壁
    if (nx < 0 || nx >= this.dungeon.width || ny < 0 || ny >= this.dungeon.height) return;
    if (this.dungeon.tiles[ny][nx] === 1) return;

    // 碰到敌人 → 攻击
    const enemy = this.enemies.find((e) => e.x === nx && e.y === ny && !e.isDead);
    if (enemy) {
      this.attackEnemy(enemy);
      return;
    }

    // 碰到 NPC → 交互
    const npc = this.npcs.find((n) => n.x === nx && n.y === ny);
    if (npc) {
      this.interactNPC(npc);
      return;
    }

    // 楼梯 → 下一层
    if (this.dungeon.tiles[ny][nx] === 2) {
      this.movePlayerTo(nx, ny, () => this.goToNextFloor());
      return;
    }

    // 普通移动
    this.movePlayerTo(nx, ny, () => this.endPlayerTurn());
  }

  private movePlayerTo(x: number, y: number, onComplete: () => void) {
    this.inputLocked = true;
    this.player.x = x;
    this.player.y = y;

    this.tweens.add({
      targets: this.player.sprite,
      x: x * TILE_SIZE,
      y: y * TILE_SIZE,
      duration: 80,
      ease: 'Linear',
      onComplete: () => {
        this.updateFOV();
        onComplete();
      },
    });
  }

  // ===== 战斗 =====

  private attackEnemy(enemy: Enemy) {
    this.inputLocked = true;

    const damage = Math.max(1, this.player.stats.atk - enemy.stats.def);
    enemy.stats.hp -= damage;

    // 闪烁
    enemy.sprite.setTint(0xffffff);
    this.time.delayedCall(100, () => {
      if (!enemy.isDead) enemy.sprite.clearTint();
    });

    this.showDamageNumber(enemy.x, enemy.y, damage);
    this.emitMessage(`你攻击了${enemy.name}，造成 ${damage} 点伤害！`);

    if (enemy.stats.hp <= 0) {
      enemy.isDead = true;
      enemy.sprite.setVisible(false);

      this.emitMessage(`${enemy.name}被你击败！获得 ${enemy.expReward} 经验。`);
      const leveled = this.player.gainExp(enemy.expReward);
      if (leveled) {
        this.emitMessage(`突破！你现在是 ${this.player.stats.level} 级！`);
      }

      if (enemy.isBoss) {
        this.handleVictory();
        return;
      }
    }

    this.endPlayerTurn();
  }

  private enemyAttackPlayer(enemy: Enemy) {
    const damage = Math.max(1, enemy.stats.atk - this.player.stats.def);
    this.player.stats.hp -= damage;

    this.player.sprite.setTint(0xff0000);
    this.time.delayedCall(100, () => {
      if (this.player.stats.hp > 0) this.player.sprite.clearTint();
    });

    this.showDamageNumber(this.player.x, this.player.y, damage);
    this.emitMessage(`${enemy.name}攻击了你，造成 ${damage} 点伤害！`);
  }

  // ===== 回合结算 =====

  private endPlayerTurn() {
    this.processEnemyTurns();

    // 检查死亡
    if (this.player.stats.hp <= 0) {
      this.gameOver = true;
      this.emitMessage('你倒下了...');
      this.time.delayedCall(1500, () => {
        this.scene.stop('UI');
        this.scene.start('Menu', { gameOver: true });
      });
      return;
    }

    this.game.events.emit('hud:update');
    this.inputLocked = false;
  }

  private processEnemyTurns() {
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      const dist = Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y);

      if (dist === 1) {
        // 相邻 → 攻击
        this.enemyAttackPlayer(enemy);
      } else if (dist <= AGGRO_RANGE) {
        // 在仇恨范围内 → 向玩家移动
        this.moveEnemyToward(enemy);
      }
      // 超出范围 → 原地不动
    }
  }

  private moveEnemyToward(enemy: Enemy) {
    const passable = (x: number, y: number) => {
      if (this.dungeon.tiles[y]?.[x] === 1) return false;
      if (this.enemies.some((e) => e !== enemy && !e.isDead && e.x === x && e.y === y))
        return false;
      return true;
    };

    const astar = new ROT.Path.AStar(this.player.x, this.player.y, passable, { topology: 4 });
    const path: [number, number][] = [];
    astar.compute(enemy.x, enemy.y, (x, y) => path.push([x, y]));

    if (path.length > 1) {
      const [nx, ny] = path[1];
      // 不走到玩家身上
      if (nx !== this.player.x || ny !== this.player.y) {
        enemy.x = nx;
        enemy.y = ny;
        enemy.sprite.setPosition(nx * TILE_SIZE, ny * TILE_SIZE);

        // 更新敌人可见性
        const key = `${nx},${ny}`;
        enemy.sprite.setVisible(this.visible.has(key));
      }
    }
  }

  // ===== 视野（FOV） =====

  private updateFOV() {
    this.visible.clear();

    const fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
      const tile = this.dungeon.tiles[y]?.[x];
      return tile !== undefined && tile !== 1;
    });

    fov.compute(this.player.x, this.player.y, FOV_RADIUS, (x, y) => {
      const key = `${x},${y}`;
      this.visible.add(key);
      this.explored.add(key);
    });

    // 更新地图方块透明度
    for (let y = 0; y < this.dungeon.height; y++) {
      for (let x = 0; x < this.dungeon.width; x++) {
        const sprite = this.tileSprites[y]?.[x];
        if (!sprite) continue;

        const key = `${x},${y}`;
        if (this.visible.has(key)) {
          sprite.setAlpha(1);
        } else if (this.explored.has(key)) {
          sprite.setAlpha(0.3);
        } else {
          sprite.setAlpha(0);
        }
      }
    }

    // 更新实体可见性
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      enemy.sprite.setVisible(this.visible.has(`${enemy.x},${enemy.y}`));
    }
    for (const npc of this.npcs) {
      npc.sprite.setVisible(this.visible.has(`${npc.x},${npc.y}`));
    }
  }

  // ===== NPC 交互 =====

  private interactNPC(npc: NPC) {
    this.inputLocked = true;

    this.game.events.emit('dialogue:open', {
      name: npc.name,
      lines: npc.dialogue,
      onComplete: () => {
        if (npc.onInteract) {
          npc.onInteract(this.player, (msg: string) => this.emitMessage(msg));
        }
        this.game.events.emit('hud:update');
        this.inputLocked = false;
      },
    });
  }

  // ===== 楼层跳转 =====

  private goToNextFloor() {
    if (this.currentFloor >= FLOOR_COUNT - 1) {
      this.emitMessage('这已经是最深层了...');
      this.inputLocked = false;
      return;
    }

    this.emitMessage('你走下了台阶...');
    this.time.delayedCall(500, () => {
      this.scene.stop('UI');
      this.scene.restart({
        floor: this.currentFloor + 1,
        playerData: this.player.saveData(),
      });
    });
  }

  // ===== 胜利 =====

  private handleVictory() {
    this.gameOver = true;
    this.emitMessage('妖王倒下了！你成功了！');
    this.time.delayedCall(2000, () => {
      this.scene.stop('UI');
      this.scene.start('Menu', { victory: true });
    });
  }

  // ===== 工具方法 =====

  private showDamageNumber(x: number, y: number, damage: number) {
    const text = this.add.text(
      x * TILE_SIZE + TILE_SIZE / 2,
      y * TILE_SIZE,
      `-${damage}`,
      {
        fontSize: '10px',
        color: '#ff4444',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 2,
      },
    );
    text.setOrigin(0.5);
    text.setDepth(100);

    this.tweens.add({
      targets: text,
      y: text.y - 16,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  emitMessage(msg: string) {
    this.game.events.emit('message', msg);
  }
}
