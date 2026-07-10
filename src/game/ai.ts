import { characters, skills } from "./config";
import { candidatePositions, cloneBoard, evaluateBoard, legalSkill, legalTarget, randomUnit } from "./rules";
import type { AiCandidateAction, GameState, Player, Position } from "./types";

function lineScore(state: GameState, pos: Position, player: Player) {
  const center = 14 - Math.abs(7 - pos.row) - Math.abs(7 - pos.col);
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  let score = center;
  for (const [dr, dc] of dirs) for (const owner of [player, 1 - player as Player]) {
    let count = 0;
    for (const sign of [-1, 1]) for (let i = 1; i <= 4; i++) { const r = pos.row + dr * i * sign, c = pos.col + dc * i * sign; if (state.board[r]?.[c]?.owner === owner) count++; else break; }
    score += count * count * (owner === player ? 10 : 11);
  }
  return score;
}

export function chooseAiAction(state: GameState): AiCandidateAction {
  const player = state.current; const candidates = candidatePositions(state.board);
  for (const pos of candidates) { const b = cloneBoard(state.board); b[pos.row][pos.col] = { owner: player }; if (evaluateBoard(b, player, state.cutLine)?.winner === player) return { kind: "place", position: pos, score: 100000 }; }
  for (const pos of candidates) { const b = cloneBoard(state.board); b[pos.row][pos.col] = { owner: 1 - player as Player }; if (evaluateBoard(b, 1 - player as Player, state.cutLine)?.winner === 1 - player) return { kind: "place", position: pos, score: 90000 }; }
  const rng = randomUnit(state.seed); const rate = state.difficulty === "easy" ? .12 : state.difficulty === "hard" ? .38 : .25;
  const char = characters.find((c) => c.id === state.players[player].character)!;
  const available = char.skills.filter((id) => legalSkill(state, player, id));
  if (available.length && rng.value < rate) {
    const skillId = available[Math.floor(rng.value * 1000) % available.length]; const def = skills[skillId];
    const targets: Position[] = [];
    if (def.targetType !== "none") { const legal = def.targetType === "empty" ? candidates : state.board.flatMap((row, r) => row.map((_, c) => ({ row: r, col: c }))).filter((p) => legalTarget(state, player, skillId, p)); if (legal.length) targets.push(legal[0]); if (def.multiStep && legal.length > 1) targets.push(legal[1]); }
    return { kind: "skill", skillId, targets, score: 500 };
  }
  const ranked = candidates.map((position) => ({ kind: "place" as const, position, score: lineScore(state, position, player) + rng.value * 3 })).sort((a, b) => b.score - a.score);
  if (state.difficulty === "easy") return ranked[Math.min(ranked.length - 1, Math.floor(rng.value * Math.min(6, ranked.length)))];
  return ranked[0];
}
