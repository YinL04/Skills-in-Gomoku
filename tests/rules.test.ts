import { describe, expect, it } from "vitest";
import { chooseAiAction } from "../src/game/ai";
import { createGame, gameReducer } from "../src/game/state";
import { cleaningSweep, cloneBoard, createBoard, evaluateBoard, legalTarget, mountainClear, nextSeed, winningLine } from "../src/game/rules";
import type { GameState, Player, Position } from "../src/game/types";

const stones = (positions: Position[], owner: Player = 0) => { const b=createBoard();positions.forEach(p=>b[p.row][p.col]={owner});return b; };
const rich = (character: GameState["players"][0]["character"], opponent: GameState["players"][0]["character"]="principal") => { const s=createGame({mode:"local",playerCharacter:character,opponentCharacter:opponent,environment:false,seed:42});s.players[0].energy=6;s.players[1].energy=6;return s; };

describe("传统五子棋规则",()=>{
  it("1 横向五连",()=>expect(winningLine(stones([0,1,2,3,4].map(col=>({row:3,col}))),0)).toHaveLength(5));
  it("2 纵向五连",()=>expect(winningLine(stones([0,1,2,3,4].map(row=>({row,col:3}))),0)).toHaveLength(5));
  it("3 主对角线五连",()=>expect(winningLine(stones([0,1,2,3,4].map(n=>({row:n,col:n}))),0)).toHaveLength(5));
  it("4 反对角线五连",()=>expect(winningLine(stones([0,1,2,3,4].map(n=>({row:n,col:8-n}))),0)).toHaveLength(5));
  it("5 超过五颗仍获胜",()=>expect(winningLine(stones([0,1,2,3,4,5].map(col=>({row:9,col}))),0)).toHaveLength(6));
  it("6 半子不计入五连",()=>{const b=stones([0,1,2,3].map(col=>({row:2,col})));b[2][4]={owner:0,half:true};expect(winningLine(b,0)).toBeNull()});
  it("7 半子转正后重新形成五连",()=>{const b=stones([0,1,2,3].map(col=>({row:2,col})));b[2][4]={owner:0};expect(evaluateBoard(b)?.winner).toBe(0)});
  it("8 断线仅切断指定相邻关系",()=>{const b=stones([0,1,2,3,4].map(col=>({row:5,col})));expect(winningLine(b,0,[{row:5,col:2},{row:5,col:3}])).toBeNull();expect(winningLine(b,0,[{row:4,col:2},{row:4,col:3}])).toHaveLength(5)});
  it("9 环境导致双方同时五连为荒诞平局",()=>{const b=stones([0,1,2,3,4].map(col=>({row:1,col})));[0,1,2,3,4].forEach(row=>b[row][9]={owner:1});expect(evaluateBoard(b)?.reason).toBe("absurdDraw")});
});

describe("技能与资源",()=>{
  it("10 飞沙走石移除敌子",()=>{let s=rich("principal");s.board[7][7]={owner:1};s=gameReducer(s,{type:"SELECT_SKILL",skillId:"flyingStone"});s=gameReducer(s,{type:"SKILL_TARGET",position:{row:7,col:7}});expect(s.board[7][7]).toBeNull();expect(s.removed.at(-1)?.cause).toBe("flyingStone")});
  it("11 飞沙走石不能选择受保护棋子",()=>{const s=rich("principal");s.board[7][7]={owner:1,protected:true};expect(legalTarget(s,0,"flyingStone",{row:7,col:7})).toBe(false)});
  it("12 静如止水会跳过对手回合",()=>{let s=rich("ziqi");s=gameReducer(s,{type:"SELECT_SKILL",skillId:"stillWater"});expect(s.current).toBe(0);expect(s.statusText).toContain("静止")});
  it("13 水滴石穿取消冻结",()=>{let s=rich("ziqi");s.players[1].reaction="waterDrop";s=gameReducer(s,{type:"SELECT_SKILL",skillId:"stillWater"});expect(s.phase).toBe("reactionWindow");s=gameReducer(s,{type:"REACTION",use:true});expect(s.players[1].frozen).toBe(0);expect(s.stats.counters).toBe(1)});
  it("14 梅开二度连续放两子",()=>{let s=rich("ziqi");s=gameReducer(s,{type:"SELECT_SKILL",skillId:"doubleBloom"});s=gameReducer(s,{type:"SKILL_TARGET",position:{row:7,col:7}});s=gameReducer(s,{type:"SKILL_TARGET",position:{row:7,col:8}});expect(s.board[7][7]?.owner).toBe(0);expect(s.board[7][8]?.owner).toBe(0)});
  it("15 梅开二度第一子获胜就停止",()=>{let s=rich("ziqi");[3,4,5,6].forEach(c=>s.board[3][c]={owner:0});s=gameReducer(s,{type:"SELECT_SKILL",skillId:"doubleBloom"});s=gameReducer(s,{type:"SKILL_TARGET",position:{row:3,col:7}});s=gameReducer(s,{type:"SKILL_TARGET",position:{row:10,col:10}});expect(s.result?.winner).toBe(0);expect(s.board[10][10]).toBeNull()});
  it("16 擒拿锁定对方未用技能",()=>{let s=rich("zhang","ziqi");s=gameReducer(s,{type:"SELECT_SKILL",skillId:"grapple"});expect(Object.keys(s.players[1].lockedSkills).length).toBe(1)});
  it("17 东山再起只恢复合法记录",()=>{let s=rich("zhang");s.removed=[{stone:{owner:0},position:{row:6,col:6},cause:"flyingStone",restorable:true}];s=gameReducer(s,{type:"SELECT_SKILL",skillId:"comeback"});expect(s.board[6][6]?.owner).toBe(0);expect(s.removed[0].restorable).toBe(false)});
  it("18 力拔山兮稳定清空 3×3",()=>{const b=createBoard();b[6][6]={owner:0};b[7][7]={owner:1};b[8][8]={owner:0};const a=mountainClear(b,{row:7,col:7}),c=mountainClear(b,{row:7,col:7});expect(a).toEqual(c);expect(a.removed).toHaveLength(3)});
  it("19 保洁上门不移除受保护棋子",()=>{const b=createBoard();b[7][6]={owner:0,protected:true};b[7][7]={owner:0};b[7][8]={owner:1};const r=cleaningSweep(b,{row:7,col:7});expect(r.board[7][6]).not.toBeNull();expect(r.board[7][7]).toBeNull()});
  it("20 胜天半子落下半子",()=>{let s=rich("wang");s=gameReducer(s,{type:"SELECT_SKILL",skillId:"halfStone"});s=gameReducer(s,{type:"SKILL_TARGET",position:{row:7,col:7}});expect(s.board[7][7]?.half).toBe(true)});
  it("21 手刀建立临时断线",()=>{let s=rich("wang");s.board[7][7]={owner:1};s.board[7][8]={owner:1};s=gameReducer(s,{type:"SELECT_SKILL",skillId:"handBlade"});s=gameReducer(s,{type:"SKILL_TARGET",position:{row:7,col:7}});expect(s.cutLine).toEqual([{row:7,col:7},{row:7,col:8}])});
  it("22 被反制后攻击者仍消耗资源和次数",()=>{let s=rich("principal");s.board[7][7]={owner:1};s.players[1].reaction="honesty";s=gameReducer(s,{type:"SELECT_SKILL",skillId:"flyingStone"});s=gameReducer(s,{type:"SKILL_TARGET",position:{row:7,col:7}});s=gameReducer(s,{type:"REACTION",use:true});expect(s.players[0].energy).toBe(3);expect(s.players[0].usedSkills).toContain("flyingStone");expect(s.board[7][7]).not.toBeNull()});
  it("23 两极反转不能用于无阵营技能",()=>{let s=rich("principal");s.players[1].reaction="reverse";s=gameReducer(s,{type:"SELECT_SKILL",skillId:"mountain"});expect(s.phase).toBe("skillTargeting")});
  it("24 取消技能不扣资源",()=>{let s=rich("principal"),energy=s.players[0].energy;s=gameReducer(s,{type:"SELECT_SKILL",skillId:"mountain"});s=gameReducer(s,{type:"CANCEL_SKILL"});expect(s.players[0].energy).toBe(energy);expect(s.players[0].usedSkills).not.toContain("mountain")});
});

describe("状态机、AI 与确定性",()=>{
  it("25 固定种子产生相同序列",()=>expect(nextSeed(12345)).toBe(nextSeed(12345)));
  it("26 技能选择中环境事件不会插入",()=>{let s=rich("principal");s.environment=true;s.turn=12;s=gameReducer(s,{type:"SELECT_SKILL",skillId:"mountain"});expect(s.environmentEvents).toHaveLength(0)});
  it("27 游戏结束后动作不改变棋盘",()=>{let s=rich("zhang");s.result={winner:0,reason:"five"};const before=cloneBoard(s.board);s=gameReducer(s,{type:"PLACE",position:{row:7,col:7}});expect(s.board).toEqual(before)});
  it("28 AI 会完成直接获胜",()=>{const s=rich("principal");s.current=1;[3,4,5,6].forEach(c=>s.board[4][c]={owner:1});const a=chooseAiAction(s);expect(a.kind).toBe("place");const b=cloneBoard(s.board);b[a.position!.row][a.position!.col]={owner:1};expect(evaluateBoard(b)?.winner).toBe(1)});
  it("29 AI 会阻挡对方下一步获胜",()=>{const s=rich("principal");s.current=1;[3,4,5,6].forEach(c=>s.board[4][c]={owner:0});const a=chooseAiAction(s);expect(a.kind).toBe("place");expect([{row:4,col:2},{row:4,col:7}]).toContainEqual(a.position)});
  it("30 快乐时刻只触发一次",()=>{let s=rich("wang");s.happy=99;s=gameReducer(s,{type:"SELECT_SKILL",skillId:"training"});expect(s.happyTriggered).toBe(true);const turns=s.happyTimeTurns;s.happy=100;s=gameReducer(s,{type:"PLACE",position:{row:1,col:1}});expect(s.happyTriggered).toBe(true);expect(s.happyTimeTurns).toBeLessThanOrEqual(turns)});
  it("31 重开清除所有临时状态",()=>{let s=rich("wang");s.players[0].shield=true;s.players[1].frozen=1;s.cutLine=[{row:1,col:1},{row:1,col:2}];s.board[7][7]={owner:0};s=gameReducer(s,{type:"RESTART"});expect(s.players[0].shield).toBe(false);expect(s.players[1].frozen).toBe(0);expect(s.cutLine).toBeNull();expect(s.board.flat().every(x=>!x)).toBe(true)});
  it("32 技能动画清除后下一位玩家可以继续落子",()=>{let s=rich("principal");s.board[7][7]={owner:1};s=gameReducer(s,{type:"SELECT_SKILL",skillId:"flyingStone"});s=gameReducer(s,{type:"SKILL_TARGET",position:{row:7,col:7}});expect(s.animation).toBe("flyingStone");expect(s.current).toBe(1);s=gameReducer(s,{type:"CLEAR_ANIMATION"});expect(s.animation).toBeNull();s=gameReducer(s,{type:"PLACE",position:{row:0,col:0}});expect(s.board[0][0]?.owner).toBe(1)});
});
