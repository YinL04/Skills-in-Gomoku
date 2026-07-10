import { characters, reactionCards, skills } from "./config";
import { chooseAiAction } from "./ai";
import { adjacentEnemy, cleaningSweep, cloneBoard, createBoard, evaluateBoard, findRestorable, isOuterThree, legalSkill, legalTarget, mountainClear, nextSeed, place, remove, skillCost } from "./rules";
import { dialogueFor } from "./dialogue";
import type { EnvironmentEvent, GameAction, GameMode, GameState, Player, Position, RemovedStoneRecord, SkillId } from "./types";

const other = (p: Player) => (1 - p) as Player;
const isAi = (state: GameState, player: Player) => player === 1 && state.mode !== "local";

export function createGame(options: { mode: GameMode; playerCharacter: GameState["players"][0]["character"]; opponentCharacter?: GameState["players"][0]["character"]; difficulty?: GameState["difficulty"]; environment?: boolean; chaos?: GameState["chaos"]; chapter?: number; seed?: number }): GameState {
  const playerCard = options.playerCharacter === "zhang" ? "honesty" : reactionCards[(options.seed ?? 42) % reactionCards.length].id;
  const enemyCard = options.opponentCharacter === "zhang" ? "waterDrop" : reactionCards[((options.seed ?? 42) + 1) % reactionCards.length].id;
  return {
    board: createBoard(), phase: "playerTurn", mode: options.mode, current: 0,
    players: [
      { character: options.playerCharacter, energy: 2, usedSkills: [], reaction: playerCard, reactionUsed: false, frozen: 0, shield: false, lured: false, lockedSkills: {} },
      { character: options.opponentCharacter ?? "principal", energy: 2, usedSkills: [], reaction: enemyCard, reactionUsed: false, frozen: 0, shield: false, lured: false, lockedSkills: {} },
    ],
    difficulty: options.difficulty ?? "normal", environment: options.environment ?? true, chaos: options.chaos ?? "normal", turn: 1, happy: 8,
    happyTimeTurns: 0, happyTriggered: false, lastMove: null, moveHistory: [], skillHistory: [], removed: [], changes: [], selectedSkill: null,
    skillTargets: [], pendingSkill: null, result: null, statusText: "黑棋先手。请在交叉点落子。", dialogue: { speaker: "系统", text: "底层规则严谨，表层演出请系好安全带。" },
    seed: options.seed ?? 20260710, environmentEvents: [], stats: { skillUses: 0, counters: 0, events: 0, maxHappy: 8 }, chapter: options.chapter ?? 1, animation: null, cutLine: null,
  };
}

function withHappy(state: GameState, amount: number) {
  const happy = Math.min(100, state.happy + amount); const trigger = happy === 100 && !state.happyTriggered;
  return { ...state, happy, happyTriggered: state.happyTriggered || trigger, happyTimeTurns: trigger ? 6 : state.happyTimeTurns, stats: { ...state.stats, maxHappy: Math.max(state.stats.maxHappy, happy) }, dialogue: trigger ? dialogueFor("happy", state.seed) : state.dialogue };
}

function eventAfterTurn(state: GameState): GameState {
  const interval = state.chaos === "extreme" ? 8 : 12; const max = state.chaos === "extreme" ? 4 : 2;
  if (!state.environment || state.turn % interval !== 0 || state.environmentEvents.length >= max || state.result) return state;
  const events: EnvironmentEvent[] = ["cleanerPasses", "tide", "principalInterferes", "embarrassingProjection", "looseLeg"];
  const seed = nextSeed(state.seed); const event = events[seed % events.length]; let board = cloneBoard(state.board); let text = "黑历史投影启动：所有人假装没看见。";
  if (event === "cleanerPasses") {
    const edge: Position[] = []; board.forEach((row, r) => row.forEach((s, c) => s && !s.protected && (r === 0 || c === 0 || r === 14 || c === 14) && edge.push({ row: r, col: c })));
    const from = edge[seed % Math.max(1, edge.length)]; if (from) { const to = [{row:from.row+1,col:from.col},{row:from.row-1,col:from.col},{row:from.row,col:from.col+1},{row:from.row,col:from.col-1}].find((p) => board[p.row]?.[p.col] === null); if (to) { board[to.row][to.col] = board[from.row][from.col]; board[from.row][from.col] = null; text = "保洁路过：边缘棋子请往里站。"; } }
  } else if (event === "tide") {
    const found = [...state.removed].reverse().find((r) => r.cause === "flyingStone" && !board[r.position.row][r.position.col]); if (found) { board[found.position.row][found.position.col] = { ...found.stone }; text = "什刹海涨潮：棋子自己漂回来了。"; }
  } else if (event === "principalInterferes" && !state.players.some((p) => p.character === "principal")) {
    const a: Position[] = [], b: Position[] = []; board.forEach((row,r) => row.forEach((s,c) => s?.owner === 0 ? a.push({row:r,col:c}) : s?.owner === 1 && b.push({row:r,col:c}))); if (a.length && b.length) { const p1=a[seed%a.length],p2=b[(seed>>>3)%b.length], tmp=board[p1.row][p1.col]; board[p1.row][p1.col]=board[p2.row][p2.col]; board[p2.row][p2.col]=tmp; text="校长插手：两颗棋子交换了学籍。"; }
  } else if (event === "looseLeg") text = "棋盘腿松了两秒。坐标坚称自己没动。";
  const result = evaluateBoard(board, undefined, state.cutLine);
  return withHappy({ ...state, board, seed, result, phase: result ? "gameOver" : state.phase, statusText: text, dialogue: dialogueFor("environment", seed), environmentEvents: [...state.environmentEvents, event], animation: event, stats: { ...state.stats, events: state.stats.events + 1 } }, 5);
}

function startNextTurn(state: GameState, active: Player): GameState {
  let board = cloneBoard(state.board); let current = active; let players = state.players.map((p) => ({ ...p, lockedSkills: { ...p.lockedSkills } })) as GameState["players"];
  board = board.map((row) => row.map((stone) => stone?.owner === current && stone.half ? { ...stone, half: false } : stone));
  players[current].lured = players[current].lured;
  Object.keys(players[current].lockedSkills).forEach((key) => { const id = key as SkillId; const value = (players[current].lockedSkills[id] ?? 0) - 1; if (value <= 0) delete players[current].lockedSkills[id]; else players[current].lockedSkills[id] = value; });
  let statusText = current === 0 ? "轮到你了。" : "对手正在思考怎么合理地胡闹。";
  if (players[current].frozen > 0) { players[current].frozen--; current = other(current); statusText = `${characters.find((c) => c.id === players[active].character)?.name} 被静止了一回合。`; }
  const result = evaluateBoard(board, undefined, state.cutLine);
  let next: GameState = { ...state, board, players, current, turn: state.turn + 1, phase: result ? "gameOver" : isAi(state, current) ? "aiThinking" : "playerTurn", result, selectedSkill: null, skillTargets: [], pendingSkill: null, statusText, cutLine: active === current ? state.cutLine : null, happyTimeTurns: Math.max(0, state.happyTimeTurns - 1), dialogue: isAi(state, current) ? dialogueFor("thinking", state.seed) : state.dialogue };
  next = eventAfterTurn(next); return next;
}

function finish(state: GameState, board: GameState["board"], player: Player, text: string): GameState {
  const result = evaluateBoard(board, player, state.cutLine);
  if (result) return { ...state, board, result, phase: "gameOver", statusText: text, dialogue: dialogueFor("win", state.seed), animation: "victory" };
  return startNextTurn({ ...state, board, statusText: text }, other(player));
}

function reactionValid(state: GameState, pending: NonNullable<GameState["pendingSkill"]>) {
  const defender = other(pending.player); const card = state.players[defender].reaction;
  if (state.players[defender].reactionUsed) return false;
  if (pending.skillId === "stillWater") return card === "waterDrop" || card === "reverse";
  if (pending.skillId === "flyingStone") return card === "honesty" || card === "reverse";
  return false;
}

function queueOrResolve(state: GameState, skillId: SkillId, targets: Position[]): GameState {
  const pending = { player: state.current, skillId, targets }; const withPending = { ...state, pendingSkill: pending, selectedSkill: null, skillTargets: [] };
  return reactionValid(withPending, pending) ? { ...withPending, phase: "reactionWindow", statusText: "反制窗口开启：现在讲规则还来得及。" } : resolveSkill(withPending, false);
}

export function resolveSkill(state: GameState, counter: boolean): GameState {
  const pending = state.pendingSkill!; const player = pending.player, defender = other(player), id = pending.skillId, cost = skillCost(state, id);
  let board = cloneBoard(state.board); let players = state.players.map((p) => ({ ...p, usedSkills: [...p.usedSkills], lockedSkills: { ...p.lockedSkills } })) as GameState["players"];
  players[player].energy -= cost; players[player].usedSkills.push(id);
  const card = players[defender].reaction; let blocked = counter; let reversed = counter && card === "reverse";
  if (counter) { players[defender].reactionUsed = true; players[defender].energy = Math.min(6, players[defender].energy + 1); }
  if (id === "flyingStone" && players[defender].shield) { blocked = true; players[defender].shield = false; players[defender].energy = Math.min(6, players[defender].energy + 1); }
  const removed: RemovedStoneRecord[] = [...state.removed]; let cutLine = state.cutLine; let result = state.result; let text = `${skills[id].name} 已结算。`;
  if (blocked && !reversed) text = `${skills[id].name} 被${reactionCards.find((r) => r.id === card)?.name ?? "防护"}挡住，但消耗照扣。`;
  else if (id === "grapple") { const target = characters.find((c) => c.id === players[defender].character)!.skills.find((s) => !players[defender].usedSkills.includes(s)); if (target) players[defender].lockedSkills[target] = 2; text = `擒拿锁住了${target ? skills[target].name : "空气"}。`; }
  else if (id === "comeback") { const found = findRestorable(removed, player, board); if (found) { board = place(board, found.position, found.stone); found.restorable = false; text = "棋子坐电梯回来了。山不一定在山东。"; } }
  else if (id === "education") { board = place(board, pending.targets[0], { owner: player, protected: true }); text = "教学分析：此处兼顾进攻与阻止对方讲课。"; }
  else if (id === "stillWater") { players[defender].frozen = 1; text = "水静了，人也别动了。"; }
  else if (id === "doubleBloom") { for (const target of pending.targets) { board = place(board, target, { owner: player }); result = evaluateBoard(board, player, cutLine); if (result) break; } text = "梅花完成了两次投递。"; }
  else if (id === "lure") { players[defender].lured = true; text = "路牌指向最外三圈。成语表示没有意见。"; }
  else if (id === "flyingStone") { let target = pending.targets[0]; if (reversed) { const own: Position[]=[]; board.forEach((row,r)=>row.forEach((s,c)=>s?.owner===player&&!s.protected&&own.push({row:r,col:c}))); target=own[state.seed%Math.max(1,own.length)] ?? target; } const stone = board[target.row][target.col]; if (stone) { board = remove(board, target); removed.push({ stone, position: target, cause: id, restorable: true }); } text = "棋子飞向什刹海，大概在这个方向。"; }
  else if (id === "mountain") { const cleared = mountainClear(board, pending.targets[0]); board = cleared.board; cleared.removed.forEach((x) => removed.push({ ...x, cause: id, restorable: true })); players[player].frozen = 1; text = "棋盘重整完毕，桌腿表示抗议。"; }
  else if (id === "cleaning") { const swept = cleaningSweep(board, pending.targets[0]); board = swept.board; swept.removed.forEach((x) => removed.push({ ...x, cause: id, restorable: true })); text = "保洁完成。校长身份暂不影响卫生。"; }
  else if (id === "halfStone") { board = place(board, pending.targets[0], { owner: player, half: true }); text = "半颗棋子努力维持着职业平衡。"; }
  else if (id === "handBlade") { const target = pending.targets[0]; const neighbor = adjacentEnemy(board, target, defender); if (neighbor) cutLine = [target, neighbor]; text = "手刀划过，指定连线暂时请假。"; }
  else if (id === "training") { players[player].shield = true; text = "外练筋骨皮，内练内容待补充。"; }
  let next = withHappy({ ...state, board, players, removed, cutLine, result, pendingSkill: null, phase: result ? "gameOver" : "resolvingSkill", statusText: text, dialogue: counter ? dialogueFor("counter", state.seed) : dialogueFor("skill", state.seed), animation: id, skillHistory: [...state.skillHistory, { player, skillId: id, turn: state.turn, countered: counter }], stats: { ...state.stats, skillUses: state.stats.skillUses + 1, counters: state.stats.counters + (counter ? 1 : 0) } }, counter ? 13 : 5);
  if (result) return { ...next, phase: "gameOver", dialogue: dialogueFor("win", state.seed) };
  return startNextTurn(next, defender);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "LOAD") return action.state;
  if (action.type === "RESTART") return createGame({ mode: state.mode, playerCharacter: state.players[0].character, opponentCharacter: state.players[1].character, difficulty: state.difficulty, environment: state.environment, chaos: state.chaos, chapter: state.chapter, seed: state.seed });
  if (action.type === "CLEAR_ANIMATION") return { ...state, animation: null };
  if (state.result) return state;
  if (action.type === "CANCEL_SKILL" && (state.phase === "skillTargeting" || state.phase === "multiStepSkill")) return { ...state, phase: isAi(state, state.current) ? "aiThinking" : "playerTurn", selectedSkill: null, skillTargets: [], statusText: "已取消技能，技能值原封未动。" };
  if (action.type === "PLACE" && state.phase === "playerTurn") {
    const { row, col } = action.position; if (state.board[row][col] || (state.players[state.current].lured && !isOuterThree(action.position))) return { ...state, dialogue: dialogueFor("invalid", state.seed), statusText: state.players[state.current].lured ? "调呈离山：本次普通落子只能在外三圈。" : "这里已经有棋子了。" };
    const player = state.current; const board = place(state.board, action.position, { owner: player }); const players = state.players.map((p) => ({...p})) as GameState["players"]; players[player].energy = Math.min(6, players[player].energy + 1); players[player].lured = false;
    const move = { player, position: action.position, kind: "normal" as const, turn: state.turn };
    return finish({ ...state, players, lastMove: move, moveHistory: [...state.moveHistory, move], dialogue: dialogueFor("move", state.seed), seed: nextSeed(state.seed) }, board, player, "落子完成，技能值 +1。" );
  }
  if (action.type === "SELECT_SKILL" && state.phase === "playerTurn" && legalSkill(state, state.current, action.skillId)) {
    const def = skills[action.skillId]; return def.targetType === "none" ? queueOrResolve(state, action.skillId, []) : { ...state, selectedSkill: action.skillId, phase: def.multiStep ? "multiStepSkill" : "skillTargeting", skillTargets: [], statusText: def.multiStep ? "请选择第一处目标。" : "请选择棋盘上的合法目标。" };
  }
  if (action.type === "SKILL_TARGET" && (state.phase === "skillTargeting" || state.phase === "multiStepSkill") && state.selectedSkill) {
    if (!legalTarget(state, state.current, state.selectedSkill, action.position) || state.skillTargets.some((p) => p.row === action.position.row && p.col === action.position.col)) return { ...state, dialogue: dialogueFor("invalid", state.seed), statusText: "这个目标不接受该技能。" };
    const targets = [...state.skillTargets, action.position]; if (skills[state.selectedSkill].multiStep && targets.length < 2) return { ...state, skillTargets: targets, statusText: "第一步已生效，请选择第二处目标。" };
    return queueOrResolve(state, state.selectedSkill, targets);
  }
  if (action.type === "REACTION" && state.phase === "reactionWindow") return resolveSkill(state, action.use);
  if (action.type === "AI_ACT" && state.phase === "aiThinking") {
    const picked = chooseAiAction(state); if (picked.kind === "place") return gameReducer({ ...state, phase: "playerTurn" }, { type: "PLACE", position: picked.position! });
    const selected = { ...state, phase: "playerTurn" as const }; if (!picked.targets?.length) return gameReducer(selected, { type: "SELECT_SKILL", skillId: picked.skillId! });
    return queueOrResolve(selected, picked.skillId!, picked.targets);
  }
  return state;
}
