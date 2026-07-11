import { characters, skills } from "./config";
import type { Board, GameResult, GameSnapshot, GameState, Player, Position, RemovedStoneRecord, SkillId, Stone } from "./types";

export const SIZE = 15;
export const createBoard = (): Board => Array.from({ length: SIZE }, () => Array<Stone | null>(SIZE).fill(null));
export const inBounds = ({ row, col }: Position) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;
export const samePos = (a: Position, b: Position) => a.row === b.row && a.col === b.col;
export const cloneBoard = (board: Board): Board => board.map((row) => row.map((cell) => cell ? { ...cell } : null));
const crossesCut = (a: Position, b: Position, cut: [Position, Position] | null) => !!cut && ((samePos(a, cut[0]) && samePos(b, cut[1])) || (samePos(a, cut[1]) && samePos(b, cut[0])));

export function winningLine(board: Board, player: Player, cut: [Position, Position] | null = null): Position[] | null {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]] as const;
  for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
    const cell = board[row][col];
    if (!cell || cell.owner !== player || cell.half) continue;
    for (const [dr, dc] of directions) {
      const line: Position[] = [{ row, col }];
      for (let i = 1; i < SIZE; i++) {
        const next = { row: row + dr * i, col: col + dc * i };
        if (!inBounds(next)) break;
        const nextCell = board[next.row][next.col];
        if (!nextCell || nextCell.owner !== player || nextCell.half || crossesCut(line[line.length - 1], next, cut)) break;
        line.push(next);
      }
      if (line.length >= 5) return line;
    }
  }
  return null;
}

export function evaluateBoard(board: Board, activePlayer?: Player, cut: [Position, Position] | null = null): GameResult | null {
  const black = winningLine(board, 0, cut), white = winningLine(board, 1, cut);
  if (black && white) return activePlayer === undefined ? { winner: null, reason: "absurdDraw" } : { winner: activePlayer, reason: "five", line: activePlayer === 0 ? black : white };
  if (black) return { winner: 0, reason: "five", line: black };
  if (white) return { winner: 1, reason: "five", line: white };
  if (board.every((row) => row.every(Boolean))) return { winner: null, reason: "draw" };
  return null;
}

export function candidatePositions(board: Board): Position[] {
  const stones: Position[] = [];
  board.forEach((row, r) => row.forEach((cell, c) => cell && stones.push({ row: r, col: c })));
  if (!stones.length) return [{ row: 7, col: 7 }];
  const out = new Map<string, Position>();
  stones.forEach(({ row, col }) => { for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const p = { row: row + dr, col: col + dc }; if (inBounds(p) && !board[p.row][p.col]) out.set(`${p.row},${p.col}`, p); } });
  return [...out.values()];
}

export function nextSeed(seed: number) { return (seed * 1664525 + 1013904223) >>> 0; }
export function randomUnit(seed: number) { const next = nextSeed(seed); return { value: next / 4294967296, seed: next }; }
export function skillCost(state: GameState, id: SkillId) { return Math.max(1, skills[id].cost - (state.happyTimeTurns > 0 && !skills[id].finisher ? 1 : 0)); }
export function skillUseCount(state: GameState, player: Player, id: SkillId) { return state.skillHistory.filter((x) => x.player === player && x.skillId === id).length; }

export function skillUnavailableReason(state: GameState, player: Player, id: SkillId): string | null {
  const p = state.players[player], def = skills[id];
  if (state.result) return "棋局已结束";
  if (!characters.find((c) => c.id === p.character)?.skills.includes(id)) return "角色未装备";
  if (def.reactionOnly) return "等待对应危机";
  if (skillUseCount(state, player, id) >= def.uses) return "本局次数已用完";
  if ((p.lockedSkills[id] ?? 0) > 0) return "被擒拿锁定";
  if (p.energy < skillCost(state, id)) return `需要 ${skillCost(state, id)} 点技能值`;
  const opponent = state.players[(1 - player) as Player];
  if (def.finisher && state.turn < 8) return "第8回合后就绪";
  if ((id === "lure" || id === "finalReverse") && opponent.character !== "zhang") return "仅对张呈生效";
  if (id === "finalReverse" && state.mode === "story" && state.chapter < 4) return "第四章解锁";
  if (id === "finalReverse" && state.happy < 80) return "快乐值达到80后就绪";
  if (id === "timeRewind" && state.snapshots.length === 0) return "没有可以倒流的行动";
  if (id === "flyingStone" || id === "handBlade") {
    const targets = state.board.flat().filter((stone) => stone?.owner === (1 - player) && !stone.protected);
    if (!targets.length) return "没有合法目标";
  }
  if (id === "doubleBloom" && state.board.flat().filter((x) => !x).length < 2) return "空位不足";
  if (id === "cleaning" && state.board.flat().filter((x) => x && !x.protected).length < 2) return "棋盘还不需要保洁";
  return null;
}

export function legalSkill(state: GameState, player: Player, id: SkillId) { return skillUnavailableReason(state, player, id) === null; }
export function legalTarget(state: GameState, player: Player, id: SkillId, pos: Position): boolean {
  if (!inBounds(pos)) return false;
  const cell = state.board[pos.row][pos.col];
  if (["doubleBloom", "halfStone"].includes(id)) return !cell;
  if (["flyingStone", "handBlade"].includes(id)) return !!cell && cell.owner !== player && !cell.protected;
  return false;
}

export function place(board: Board, pos: Position, stone: Stone): Board { const next = cloneBoard(board); next[pos.row][pos.col] = { ...stone }; return next; }
export function remove(board: Board, pos: Position): Board { const next = cloneBoard(board); next[pos.row][pos.col] = null; return next; }
export function findRestorable(records: RemovedStoneRecord[], player: Player, board: Board) {
  for (let i = records.length - 1; i >= 0; i--) { const r = records[i]; if (r.stone.owner === player && r.restorable && !board[r.position.row][r.position.col]) return r; }
  return null;
}
export function adjacentEnemy(board: Board, pos: Position, owner: Player): Position | null {
  for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1],[-1,0],[0,-1],[-1,-1],[-1,1]]) { const p = { row: pos.row + dr, col: pos.col + dc }; if (inBounds(p) && board[p.row][p.col]?.owner === owner) return p; }
  return null;
}

export function snapshotOf(state: GameState): GameSnapshot {
  return { board: cloneBoard(state.board), current: state.current, turn: state.turn, lastMove: state.lastMove ? { ...state.lastMove, position: { ...state.lastMove.position } } : null, moveHistory: state.moveHistory.map((m) => ({ ...m, position: { ...m.position } })), cutLine: state.cutLine ? [{ ...state.cutLine[0] }, { ...state.cutLine[1] }] : null };
}

export function cleanHalfBoard(board: Board, seed: number) {
  const next = cloneBoard(board); const candidates: { position: Position; stone: Stone; key: number }[] = [];
  let rolling = seed;
  next.forEach((row, r) => row.forEach((stone, c) => { if (stone && !stone.protected) { rolling = nextSeed(rolling); candidates.push({ position: { row: r, col: c }, stone, key: rolling }); } }));
  const groups = ([0, 1] as Player[]).map((owner) => candidates.filter((x) => x.stone.owner === owner).sort((a, b) => a.key - b.key || a.position.row - b.position.row || a.position.col - b.position.col));
  const target = Math.floor(candidates.length / 2), quotas = groups.map((group) => Math.floor(group.length / 2));
  let remaining = target - quotas[0] - quotas[1], preferred = rolling % 2;
  while (remaining > 0) {
    const first = preferred as Player, second = (1 - preferred) as Player;
    const owner = quotas[first] < Math.max(0, groups[first].length - 1) ? first : quotas[second] < Math.max(0, groups[second].length - 1) ? second : null;
    if (owner === null) break;
    quotas[owner]++; remaining--; preferred = 1 - owner;
  }
  const removed: { position: Position; stone: Stone }[] = [];
  ([0, 1] as Player[]).forEach((owner) => groups[owner].slice(0, quotas[owner]).forEach((item) => { next[item.position.row][item.position.col] = null; removed.push(item); }));
  return { board: next, removed, seed: rolling };
}

// 保留给旧棋谱与测试使用的确定性区域工具。
export function mountainClear(board: Board, center: Position) {
  const next = cloneBoard(board); const removed: { position: Position; stone: Stone }[] = [];
  for (let r = Math.max(0, center.row - 1); r <= Math.min(SIZE - 1, center.row + 1); r++) for (let c = Math.max(0, center.col - 1); c <= Math.min(SIZE - 1, center.col + 1); c++) if (next[r][c]) { removed.push({ position: { row: r, col: c }, stone: next[r][c]! }); next[r][c] = null; }
  return { board: next, removed };
}
