import * as ROT from 'rot-js';
import { DUNGEON_WIDTH, DUNGEON_HEIGHT } from '../config';

export interface Point {
  x: number;
  y: number;
}

export interface DungeonData {
  width: number;
  height: number;
  tiles: number[][]; // 0=地面, 1=墙壁, 2=楼梯
  playerStart: Point;
  stairsPos: Point;
  enemySpawns: Point[];
  npcSpawns: Point[];
  bossSpawn: Point | null;
}

/**
 * 生成随机地牢（保证楼梯可达）
 * @param floor 当前层数 (0-based)
 */
export function generateDungeon(floor: number): DungeonData {
  // 最多尝试 20 次，确保生成的地牢楼梯可达
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = tryGenerateDungeon(floor);
    if (result) return result;
  }
  // 兜底：放宽参数再试
  return tryGenerateDungeon(floor, true)!;
}

function tryGenerateDungeon(floor: number, forceConnect = false): DungeonData | null {
  const width = DUNGEON_WIDTH;
  const height = DUNGEON_HEIGHT;

  // 初始化全部为墙
  const tiles: number[][] = [];
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      tiles[y][x] = 1;
    }
  }

  // 使用 ROT.js Digger 生成房间+走廊
  const digger = new ROT.Map.Digger(width, height, {
    roomWidth: [4, 9],
    roomHeight: [4, 7],
    corridorLength: [2, 6],
    dugPercentage: 0.25 + floor * 0.05,
  });

  digger.create((x, y, value) => {
    tiles[y][x] = value; // 0=地面, 1=墙壁
  });

  const rooms = digger.getRooms();

  // 已占用位置（防止重叠）
  const used = new Set<string>();
  const markUsed = (p: Point) => used.add(`${p.x},${p.y}`);
  const isUsed = (p: Point) => used.has(`${p.x},${p.y}`);

  // 玩家出生在第一个房间中心
  const firstRoom = rooms[0];
  const playerStart: Point = {
    x: Math.floor((firstRoom.getLeft() + firstRoom.getRight()) / 2),
    y: Math.floor((firstRoom.getTop() + firstRoom.getBottom()) / 2),
  };
  markUsed(playerStart);

  // 楼梯在最后一个房间中心
  const lastRoom = rooms[rooms.length - 1];
  const stairsPos: Point = {
    x: Math.floor((lastRoom.getLeft() + lastRoom.getRight()) / 2),
    y: Math.floor((lastRoom.getTop() + lastRoom.getBottom()) / 2),
  };
  markUsed(stairsPos);
  tiles[stairsPos.y][stairsPos.x] = 2;

  // 在房间内寻找随机空地板位置
  const findRandomFloor = (): Point | null => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const room = rooms[Math.floor(ROT.RNG.getUniform() * rooms.length)];
      const x = room.getLeft() + Math.floor(ROT.RNG.getUniform() * (room.getRight() - room.getLeft() + 1));
      const y = room.getTop() + Math.floor(ROT.RNG.getUniform() * (room.getBottom() - room.getTop() + 1));
      const p: Point = { x, y };
      if (tiles[y][x] === 0 && !isUsed(p)) {
        return p;
      }
    }
    return null;
  };

  // 生成敌人位置：越深层敌人越多
  const enemyCount = 4 + floor * 3;
  const enemySpawns: Point[] = [];
  for (let i = 0; i < enemyCount; i++) {
    const p = findRandomFloor();
    if (p) {
      enemySpawns.push(p);
      markUsed(p);
    }
  }

  // Boss 在最后一层，放在楼梯附近
  let bossSpawn: Point | null = null;
  if (floor === 2) {
    // Boss 放在倒数第二个房间
    const bossRoom = rooms[Math.max(0, rooms.length - 2)];
    const bp: Point = {
      x: Math.floor((bossRoom.getLeft() + bossRoom.getRight()) / 2),
      y: Math.floor((bossRoom.getTop() + bossRoom.getBottom()) / 2),
    };
    if (!isUsed(bp) && tiles[bp.y][bp.x] === 0) {
      bossSpawn = bp;
      markUsed(bp);
    }
  }

  // NPC 位置：每层 1-2 个
  const npcCount = floor === 2 ? 1 : 2;
  const npcSpawns: Point[] = [];
  for (let i = 0; i < npcCount; i++) {
    const p = findRandomFloor();
    if (p) {
      npcSpawns.push(p);
      markUsed(p);
    }
  }

  // 验证楼梯从出生点可达
  const passable = (x: number, y: number) => {
    const t = tiles[y]?.[x];
    return t === 0 || t === 2;
  };
  const astar = new ROT.Path.AStar(stairsPos.x, stairsPos.y, passable, { topology: 4 });
  const path: [number, number][] = [];
  astar.compute(playerStart.x, playerStart.y, (x, y) => path.push([x, y]));

  if (path.length < 2) {
    // 楼梯不可达，重新生成
    return null;
  }

  return { width, height, tiles, playerStart, stairsPos, enemySpawns, npcSpawns, bossSpawn };
}
