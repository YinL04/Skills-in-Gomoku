import { characters, skills } from "./config";
import type { Board, GameResult, GameState, Player, Position, RemovedStoneRecord, SkillId, Stone } from "./types";

export const SIZE = 15;
export const createBoard = (): Board => Array.from({ length: SIZE }, () => Array<Stone | null>(SIZE).fill(null));
export const inBounds = ({ row, col }: Position) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;
export const samePos = (a: Position, b: Position) => a.row === b.row && a.col === b.col;
export const cloneBoard = (board: Board): Board => board.map((row) => row.map((cell) => cell ? { ...cell } : null));

const crossesCut = (a: Position, b: Position, cut: [Position, Position] | null) => cut && ((samePos(a, cut[0]) && samePos(b, cut[1])) || (samePos(a, cut[1]) && samePos(b, cut[0])));

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
        const prev = line[line.length - 1];
        const nextCell = board[next.row][next.col];
        if (!nextCell || nextCell.owner !== player || nextCell.half || crossesCut(prev, next, cut)) break;
        line.push(next);
      }
      if (line.length >= 5) return line;
    }
  }
  return null;
}

export function evaluateBoard(board: Board, activePlayer?: Player, cut: [Position, Position] | null = null): GameResult | null {
  const a = winningLine(board, 0, cut); const b = winningLine(board, 1, cut);
  if (a && b) return activePlayer === undefined ? { winner: null, reason: "absurdDraw" } : { winner: activePlayer, reason: "five", line: activePlayer === 0 ? a : b };
  if (a) return { winner: 0, reason: "five", line: a };
  if (b) return { winner: 1, reason: "five", line: b };
  if (board.every((row) => row.every(Boolean))) return { winner: null, reason: "draw" };
  return null;
}

export function isOuterThree({ row, col }: Position) { return row < 3 || col < 3 || row >= SIZE - 3 || col >= SIZE - 3; }
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

export function skillCost(state: GameState, id: SkillId) { return Math.max(1, skills[id].cost - (state.happyTimeTurns > 0 ? 1 : 0)); }
export function legalSkill(state: GameState, player: Player, id: SkillId): boolean {
  const p = state.players[player]; const def = skills[id];
  if (state.result || !characters.find((c) => c.id === p.character)?.skills.includes(id) || p.usedSkills.includes(id) || (p.lockedSkills[id] ?? 0) > 0 || p.energy < skillCost(state, id)) return false;
  if (id === "comeback") return findRestorable(state.removed, player, state.board) !== null;
  if (id === "stillWater") return state.players[1 - player as Player].frozen === 0;
  if (id === "doubleBloom") return state.board.flat().filter((x) => !x).length >= 2;
  if (id === "flyingStone" || id === "handBlade") return state.board.some((row) => row.some((s) => s?.owner === (1 - player) && !s.protected));
  if (id === "halfStone") return !state.board.some((row) => row.some((s) => s?.owner === player && s.half));
  return true;
}

export function legalTarget(state: GameState, player: Player, id: SkillId, pos: Position): boolean {
  if (!inBounds(pos)) return false;
  const cell = state.board[pos.row][pos.col];
  if (["education", "doubleBloom", "halfStone"].includes(id)) return !cell;
  if (["flyingStone", "handBlade"].includes(id)) return !!cell && cell.owner !== player && !cell.protected;
  return id === "mountain" || id === "cleaning";
}

export function findRestorable(records: RemovedStoneRecord[], player: Player, board: Board) {
  for (let i = records.length - 1; i >= 0; i--) { const r = records[i]; if (r.stone.owner === player && r.restorable && !board[r.position.row][r.position.col]) return r; }
  return null;
}

export function place(board: Board, pos: Position, stone: Stone): Board { const next = cloneBoard(board); next[pos.row][pos.col] = { ...stone }; return next; }
export function remove(board: Board, pos: Position): Board { const next = cloneBoard(board); next[pos.row][pos.col] = null; return next; }

export function mountainClear(board: Board, center: Position) {
  const next = cloneBoard(board); const removed: { position: Position; stone: Stone }[] = [];
  for (let r = Math.max(0, center.row - 1); r <= Math.min(SIZE - 1, center.row + 1); r++) for (let c = Math.max(0, center.col - 1); c <= Math.min(SIZE - 1, center.col + 1); c++) if (next[r][c]) { removed.push({ position: { row: r, col: c }, stone: next[r][c]! }); next[r][c] = null; }
  return { board: next, removed };
}

export function cleaningSweep(board: Board, center: Position) {
  const next = cloneBoard(board); const start = Math.max(0, Math.min(SIZE - 5, center.col - 2)); const cells: { position: Position; stone: Stone; distance: number }[] = [];
  for (let c = start; c < start + 5; c++) { const stone = next[center.row][c]; if (stone && !stone.protected) cells.push({ position: { row: center.row, col: c }, stone, distance: Math.abs(c - (start + 2)) }); }
  const removed: { position: Position; stone: Stone }[] = [];
  ([0, 1] as Player[]).forEach((owner) => { const found = cells.filter((x) => x.stone.owner === owner).sort((a, b) => a.distance - b.distance || a.position.col - b.position.col)[0]; if (found) { next[found.position.row][found.position.col] = null; removed.push(found); } });
  return { board: next, removed };
}

export function adjacentEnemy(board: Board, pos: Position, owner: Player): Position | null {
  for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1],[-1,0],[0,-1],[-1,-1],[-1,1]]) { const p = { row: pos.row + dr, col: pos.col + dc }; if (inBounds(p) && board[p.row][p.col]?.owner === owner) return p; }
  return null;
}
