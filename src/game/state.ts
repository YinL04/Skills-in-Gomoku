import { characters, skills } from "./config";
import { chooseAiAction } from "./ai";
import { adjacentEnemy, cleanHalfBoard, cloneBoard, createBoard, evaluateBoard, legalSkill, legalTarget, nextSeed, place, remove, skillCost, skillUseCount, snapshotOf } from "./rules";
import { dialogueFor } from "./dialogue";
import type { EnvironmentEvent, GameAction, GameMode, GameSnapshot, GameState, Player, Position, RemovedStoneRecord, SkillId } from "./types";

const other = (p: Player) => (1 - p) as Player;
const isAi = (state: GameState, player: Player) => player === 1 && state.mode !== "local";
const clonePlayers = (state: GameState) => state.players.map((p) => ({ ...p, usedSkills: [...p.usedSkills], lockedSkills: { ...p.lockedSkills } })) as GameState["players"];

export function createGame(options: { mode: GameMode; playerCharacter: GameState["players"][0]["character"]; opponentCharacter?: GameState["players"][0]["character"]; difficulty?: GameState["difficulty"]; environment?: boolean; chaos?: GameState["chaos"]; chapter?: number; seed?: number }): GameState {
  return {
    board: createBoard(), phase: "playerTurn", mode: options.mode, current: 0,
    players: [
      { character: options.playerCharacter, energy: 2, usedSkills: [], frozen: 0, shield: false, lured: false, lockedSkills: {} },
      { character: options.opponentCharacter ?? "principal", energy: 2, usedSkills: [], frozen: 0, shield: false, lured: false, lockedSkills: {} },
    ],
    difficulty: options.difficulty ?? "normal", environment: options.environment ?? true, chaos: options.chaos ?? "normal", turn: 1, happy: 8,
    happyTimeTurns: 0, happyTriggered: false, lastMove: null, moveHistory: [], skillHistory: [], removed: [], changes: [], selectedSkill: null,
    skillTargets: [], pendingSkill: null, result: null, statusText: "黑棋先手。每次普通落子获得1点技能值。", dialogue: { speaker: "系统", text: "新校规：棋盘损坏前，请先保存快照。" },
    seed: options.seed ?? 20260710, environmentEvents: [], stats: { skillUses: 0, counters: 0, events: 0, maxHappy: 8 }, chapter: options.chapter ?? 1,
    animation: null, cutLine: null, snapshots: [], boardCondition: "normal", freezeUntil: null,
  };
}

function withHappy(state: GameState, amount: number): GameState {
  const happy = Math.min(100, state.happy + amount), trigger = happy === 100 && !state.happyTriggered;
  return { ...state, happy, happyTriggered: state.happyTriggered || trigger, happyTimeTurns: trigger ? 6 : state.happyTimeTurns, stats: { ...state.stats, maxHappy: Math.max(state.stats.maxHappy, happy) }, dialogue: trigger ? dialogueFor("happy", state.seed) : state.dialogue };
}

function maybeEnvironmentEvent(state: GameState): GameState {
  const interval = state.chaos === "extreme" ? 8 : 12, max = state.chaos === "extreme" ? 4 : 2;
  if (!state.environment || state.turn % interval !== 0 || state.environmentEvents.length >= max || state.result) return state;
  const options: EnvironmentEvent[] = ["embarrassingProjection", "looseLeg", "cleanerPasses"], seed = nextSeed(state.seed), event = options[seed % options.length];
  const text = event === "looseLeg" ? "棋盘腿松了两秒，坐标拒绝跟着晃。" : event === "cleanerPasses" ? "保洁从台边经过：今天先不加班。" : "黑历史投影误触，快乐值被迫上升。";
  return withHappy({ ...state, seed, statusText: text, dialogue: dialogueFor("environment", seed), environmentEvents: [...state.environmentEvents, event], animation: event, stats: { ...state.stats, events: state.stats.events + 1 } }, 5);
}

function startNextTurn(state: GameState, nextPlayer: Player): GameState {
  const players = clonePlayers(state); let board = cloneBoard(state.board);
  board = board.map((row) => row.map((stone) => stone?.owner === nextPlayer && stone.half ? { ...stone, half: false } : stone));
  Object.keys(players[nextPlayer].lockedSkills).forEach((key) => { const id = key as SkillId, turns = (players[nextPlayer].lockedSkills[id] ?? 0) - 1; if (turns <= 0) delete players[nextPlayer].lockedSkills[id]; else players[nextPlayer].lockedSkills[id] = turns; });
  const result = evaluateBoard(board, undefined, state.cutLine);
  let next: GameState = { ...state, board, players, current: nextPlayer, turn: state.turn + 1, phase: result ? "gameOver" : isAi(state, nextPlayer) ? "aiThinking" : "playerTurn", result, selectedSkill: null, skillTargets: [], pendingSkill: null, cutLine: null, happyTimeTurns: Math.max(0, state.happyTimeTurns - 1), statusText: nextPlayer === 0 ? "轮到你行动。" : "对手正在判断该摔棋子还是摔棋盘。", dialogue: isAi(state, nextPlayer) ? dialogueFor("thinking", state.seed) : state.dialogue };
  next = maybeEnvironmentEvent(next);
  return next;
}

function finishBoardAction(state: GameState, board: GameState["board"], player: Player, text: string): GameState {
  const result = evaluateBoard(board, player, state.cutLine);
  if (result) return { ...state, board, result, phase: "gameOver", statusText: text, dialogue: dialogueFor("win", state.seed), animation: "victory" };
  return startNextTurn({ ...state, board, statusText: text }, other(player));
}

function reactionAvailable(state: GameState, defender: Player, id: SkillId) {
  const owns = characters.find((c) => c.id === state.players[defender].character)?.skills.includes(id);
  return !!owns && skillUseCount(state, defender, id) < skills[id].uses && state.players[defender].energy >= skillCost(state, id);
}

export function reactionSkillFor(state: GameState, attacker: Player, skillId: SkillId): SkillId | undefined {
  const defender = other(attacker);
  if (skillId === "flyingStone" && reactionAvailable(state, defender, "grapple")) return "grapple";
  if (skillId === "mountain" && reactionAvailable(state, defender, "comeback")) return "comeback";
  if ((skillId === "lure" || skillId === "finalReverse") && reactionAvailable(state, defender, "timeRewind")) return "timeRewind";
  return undefined;
}

function queueOrResolve(state: GameState, skillId: SkillId, targets: Position[]): GameState {
  const reactionSkillId = reactionSkillFor(state, state.current, skillId), pendingSkill = { player: state.current, skillId, targets, reactionSkillId };
  const queued = { ...state, pendingSkill, selectedSkill: null, skillTargets: [] };
  return reactionSkillId ? { ...queued, phase: "reactionWindow", statusText: `${skills[skillId].name}即将结算：${skills[reactionSkillId].name}已就绪。` } : resolveSkill(queued, false);
}

function spendSkill(state: GameState, player: Player, id: SkillId) {
  const players = clonePlayers(state); players[player].energy -= skillCost(state, id); players[player].usedSkills.push(id); return players;
}

function resolveCounter(state: GameState): GameState {
  const pending = state.pendingSkill!, attacker = pending.player, defender = other(attacker), counterId = pending.reactionSkillId!;
  const players = spendSkill(state, attacker, pending.skillId); players[defender].energy -= skillCost(state, counterId); players[defender].usedSkills.push(counterId);
  if (counterId === "grapple") players[attacker].lockedSkills.flyingStone = 2;
  const history = [
    ...state.skillHistory,
    { player: attacker, skillId: pending.skillId, turn: state.turn, countered: true },
    { player: defender, skillId: counterId, turn: state.turn, countered: false },
  ];
  const text = counterId === "grapple" ? "擒拿擒拿，擒擒又拿拿！飞沙走石被当场按住。" : counterId === "comeback" ? "东山再起：棋盘刚摔下去，就被捡起来继续用了。" : "时光倒流：终结演出已被倒放回后台。";
  return startNextTurn(withHappy({ ...state, players, skillHistory: history, pendingSkill: null, boardCondition: "normal", phase: "resolvingSkill", statusText: text, dialogue: dialogueFor("counter", state.seed), animation: counterId, stats: { ...state.stats, skillUses: state.stats.skillUses + 2, counters: state.stats.counters + 1 } }, 13), defender);
}

function restoreSnapshot(state: GameState, snapshot: GameSnapshot) {
  return { ...state, board: cloneBoard(snapshot.board), lastMove: snapshot.lastMove, moveHistory: snapshot.moveHistory.map((m) => ({ ...m, position: { ...m.position } })), cutLine: snapshot.cutLine, boardCondition: "rewinding" as const };
}

export function resolveSkill(state: GameState, counter: boolean): GameState {
  if (counter) return resolveCounter(state);
  const pending = state.pendingSkill!, player = pending.player, defender = other(player), id = pending.skillId;
  let players = spendSkill(state, player, id), board = cloneBoard(state.board), removed: RemovedStoneRecord[] = [...state.removed], cutLine = state.cutLine, result = state.result, seed = state.seed;
  const snapshots = id === "timeRewind" ? [...state.snapshots] : [...state.snapshots, snapshotOf(state)];
  let text = `${skills[id].name}已结算。`, boardCondition = state.boardCondition;

  if (id === "timeRewind") {
    const snapshot = snapshots.pop(); if (snapshot) { const restored = restoreSnapshot(state, snapshot); board = restored.board; cutLine = restored.cutLine; text = "时光倒流：上一段棋局被强行倒放。资源消耗拒绝倒流。"; boardCondition = "rewinding"; }
  } else if (id === "stillWater") {
    players[defender].frozen = 1; text = "静如止水：空气、棋盘和操作一起冻结5秒。"; boardCondition = "frozen";
  } else if (id === "doubleBloom") {
    for (const target of pending.targets) { board = place(board, target, { owner: player }); result = evaluateBoard(board, player, cutLine); if (result) break; } text = "梅开二度：两颗棋子按流程完成投递。";
  } else if (id === "flyingStone") {
    const target = pending.targets[0], stone = board[target.row]?.[target.col];
    if (stone && players[defender].shield) { players[defender].shield = false; players[defender].energy = Math.min(6, players[defender].energy + 1); text = "外练筋骨皮挡住了飞沙走石。什刹海今天没有新增棋子。"; }
    else if (stone) { board = remove(board, target); removed.push({ stone, position: target, cause: id, restorable: true }); text = state.lastMove && target.row === state.lastMove.position.row && target.col === state.lastMove.position.col ? "飞沙走石：上一颗棋子已被扔进什刹海。" : "飞沙走石：指定棋子已被扔进什刹海。"; }
  } else if (id === "cleaning") {
    const cleaned = cleanHalfBoard(board, seed); board = cleaned.board; seed = cleaned.seed; cleaned.removed.forEach((x) => removed.push({ ...x, cause: id, restorable: true })); text = `保洁上门：随机清除了${cleaned.removed.length}颗棋子。`;
  } else if (id === "mountain" || id === "lure" || id === "finalReverse") {
    boardCondition = id === "mountain" ? "broken" : state.boardCondition; result = { winner: player, reason: "finisher", finisher: id };
    text = id === "mountain" ? "力拔山兮：棋盘损坏，终结成立！" : id === "lure" ? "调呈离山：张呈已离开山东，终结成立！" : "两极反转：黑历史展示完毕，张呈丧失战斗力！";
  } else if (id === "halfStone") {
    board = place(board, pending.targets[0], { owner: player, half: true }); text = "胜天半子：半颗棋子正在努力保持平衡。";
  } else if (id === "handBlade") {
    const target = pending.targets[0], neighbor = adjacentEnemy(board, target, defender); if (neighbor) cutLine = [target, neighbor]; text = "手刀·再见：指定连线暂时断开。";
  } else if (id === "training") {
    players[player].shield = true; text = "外练筋骨皮：下一次棋子干预将被阻挡。";
  }

  let next = withHappy({ ...state, board, players, removed, cutLine, result, seed, snapshots, boardCondition, pendingSkill: null, phase: result ? "gameOver" : "resolvingSkill", statusText: text, dialogue: result ? dialogueFor("win", state.seed) : dialogueFor("skill", state.seed), animation: id, skillHistory: [...state.skillHistory, { player, skillId: id, turn: state.turn, countered: false }], stats: { ...state.stats, skillUses: state.stats.skillUses + 1 } }, 5);
  if (result) return next;
  next = startNextTurn(next, defender);
  if (id === "stillWater") next = { ...next, phase: "skippingTurn", freezeUntil: Date.now() + 5000, boardCondition: "frozen", statusText: "静如止水生效：棋盘操作冻结5秒。" };
  return next;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "LOAD") return action.state;
  if (action.type === "RESTART") return createGame({ mode: state.mode, playerCharacter: state.players[0].character, opponentCharacter: state.players[1].character, difficulty: state.difficulty, environment: state.environment, chaos: state.chaos, chapter: state.chapter, seed: state.seed });
  if (action.type === "CLEAR_ANIMATION") return { ...state, animation: null, boardCondition: state.boardCondition === "rewinding" ? "normal" : state.boardCondition };
  if (action.type === "DEBUG_SET") {
    const value = Number.isFinite(action.value) ? action.value : 0;
    if (action.field === "happy") { const happy = Math.max(0, Math.min(100, Math.round(value))); return { ...state, happy, stats: { ...state.stats, maxHappy: Math.max(state.stats.maxHappy, happy) } }; }
    if (action.field === "turn") return { ...state, turn: Math.max(1, Math.min(199, Math.round(value))) };
    const players = clonePlayers(state), player = action.field === "blackEnergy" ? 0 : 1; players[player].energy = Math.max(0, Math.min(6, Math.round(value))); return { ...state, players };
  }
  if (action.type === "DEBUG_SET_CURRENT") return { ...state, current: action.player, phase: state.result ? "gameOver" : isAi(state, action.player) ? "aiThinking" : "playerTurn", selectedSkill: null, skillTargets: [], pendingSkill: null, statusText: `测试台：已切换到${action.player === 0 ? "黑方" : "白方"}行动。` };
  if (action.type === "DEBUG_CLEAR_TEMP") { const players = clonePlayers(state); players.forEach((player) => { player.frozen = 0; player.shield = false; player.lured = false; player.lockedSkills = {}; }); return { ...state, players, animation: null, freezeUntil: null, cutLine: null, boardCondition: "normal", selectedSkill: null, skillTargets: [], pendingSkill: null, phase: state.result ? "gameOver" : isAi(state, state.current) ? "aiThinking" : "playerTurn", statusText: "测试台：所有临时状态已清除。" }; }
  if (action.type === "END_FREEZE" && state.phase === "skippingTurn") { const players = clonePlayers(state); players[state.current].frozen = 0; return { ...state, players, phase: isAi(state, state.current) ? "aiThinking" : "playerTurn", freezeUntil: null, boardCondition: "normal", statusText: "时间恢复流动，可以继续落子。" }; }
  if (state.result) return state;
  if (action.type === "CANCEL_SKILL" && (state.phase === "skillTargeting" || state.phase === "multiStepSkill")) return { ...state, phase: isAi(state, state.current) ? "aiThinking" : "playerTurn", selectedSkill: null, skillTargets: [], statusText: "已取消技能，技能值没有变化。" };

  if (action.type === "PLACE" && state.phase === "playerTurn") {
    const { row, col } = action.position; if (state.board[row][col]) return { ...state, statusText: "这里已经有棋子了。", dialogue: dialogueFor("invalid", state.seed) };
    const player = state.current, players = clonePlayers(state); players[player].energy = Math.min(6, players[player].energy + 1);
    const move = { player, position: action.position, kind: "normal" as const, turn: state.turn }, board = place(state.board, action.position, { owner: player });
    return finishBoardAction({ ...state, players, snapshots: [...state.snapshots, snapshotOf(state)], lastMove: move, moveHistory: [...state.moveHistory, move], dialogue: dialogueFor("move", state.seed), seed: nextSeed(state.seed) }, board, player, "普通落子完成，技能值+1。" );
  }

  if (action.type === "SELECT_SKILL" && state.phase === "playerTurn" && legalSkill(state, state.current, action.skillId)) {
    const def = skills[action.skillId];
    return def.targetType === "none" ? queueOrResolve(state, action.skillId, []) : { ...state, selectedSkill: action.skillId, phase: def.multiStep ? "multiStepSkill" : "skillTargeting", skillTargets: [], statusText: def.multiStep ? "请选择第一处目标。" : action.skillId === "flyingStone" ? "请选择要扔进什刹海的棋子；上一手带有金色标记。" : "请选择合法目标。" };
  }

  if (action.type === "SKILL_TARGET" && (state.phase === "skillTargeting" || state.phase === "multiStepSkill") && state.selectedSkill) {
    if (!legalTarget(state, state.current, state.selectedSkill, action.position) || state.skillTargets.some((p) => p.row === action.position.row && p.col === action.position.col)) return { ...state, statusText: "这个目标不接受该技能。", dialogue: dialogueFor("invalid", state.seed) };
    const targets = [...state.skillTargets, action.position]; if (skills[state.selectedSkill].multiStep && targets.length < 2) return { ...state, skillTargets: targets, statusText: "第一步完成，请选择第二处目标。" };
    return queueOrResolve(state, state.selectedSkill, targets);
  }

  if (action.type === "REACTION" && state.phase === "reactionWindow") return resolveSkill(state, action.use);
  if (action.type === "AI_ACT" && state.phase === "aiThinking") {
    const picked = chooseAiAction(state), ready = { ...state, phase: "playerTurn" as const };
    if (picked.kind === "place") return gameReducer(ready, { type: "PLACE", position: picked.position! });
    return picked.targets?.length ? queueOrResolve(ready, picked.skillId!, picked.targets) : gameReducer(ready, { type: "SELECT_SKILL", skillId: picked.skillId! });
  }
  return state;
}
