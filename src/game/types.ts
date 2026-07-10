export type Player = 0 | 1;
export type CharacterId = "zhang" | "ziqi" | "principal" | "wang";
export type SkillId = "grapple" | "comeback" | "education" | "stillWater" | "doubleBloom" | "lure" | "flyingStone" | "mountain" | "cleaning" | "halfStone" | "handBlade" | "training";
export type ReactionCardId = "honesty" | "waterDrop" | "reverse" | "publicComeback";
export type GameMode = "story" | "free" | "pure" | "local";
export type GamePhase = "home" | "characterSelect" | "storyDialogue" | "gameStarting" | "playerTurn" | "aiThinking" | "skillTargeting" | "multiStepSkill" | "reactionWindow" | "resolvingSkill" | "resolvingEnvironmentEvent" | "skippingTurn" | "happyTime" | "gameOver";
export type AiDifficulty = "easy" | "normal" | "hard";
export interface Position { row: number; col: number }
export interface Stone { owner: Player; half?: boolean; protected?: boolean }
export type BoardCell = Stone | null;
export type Board = BoardCell[][];
export type TargetType = "none" | "empty" | "enemyStone" | "area";
export interface CharacterDefinition { id: CharacterId; name: string; role: string; icon: string; accent: string; passive: string; skills: SkillId[] }
export interface SkillDefinition { id: SkillId; name: string; character: CharacterId; cost: number; blurb: string; rules: string; targetType: TargetType; multiStep: boolean; counterable: boolean; uses: number }
export interface ReactionCardDefinition { id: ReactionCardId; name: string; description: string }
export interface MoveRecord { player: Player; position: Position; kind: "normal" | "skill"; turn: number }
export interface SkillUseRecord { player: Player; skillId: SkillId; turn: number; countered: boolean }
export interface RemovedStoneRecord { stone: Stone; position: Position; cause: SkillId | "environment"; restorable: boolean }
export interface BoardChangeRecord { type: "place" | "remove" | "restore" | "move"; position: Position; to?: Position; stone: Stone }
export interface StatusEffect { type: "frozen" | "lured" | "shield" | "locked" | "cut"; owner: Player; turns: number; skillId?: SkillId; positions?: [Position, Position] }
export type EnvironmentEvent = "cleanerPasses" | "tide" | "principalInterferes" | "embarrassingProjection" | "looseLeg";
export type DialogueTrigger = "opening" | "move" | "skill" | "invalid" | "counter" | "environment" | "thinking" | "nearWin" | "win" | "happy";
export interface DialogueEntry { trigger: DialogueTrigger; speaker: CharacterId | "system"; text: string; weight: number }
export interface GameResult { winner: Player | null; reason: "five" | "draw" | "absurdDraw"; line?: Position[] }
export interface AiCandidateAction { kind: "place" | "skill"; score: number; position?: Position; skillId?: SkillId; targets?: Position[] }
export interface SeededRandomState { seed: number }
export interface PlayerState { character: CharacterId; energy: number; usedSkills: SkillId[]; reaction: ReactionCardId; reactionUsed: boolean; frozen: number; shield: boolean; lured: boolean; lockedSkills: Partial<Record<SkillId, number>> }
export interface GameStats { skillUses: number; counters: number; events: number; maxHappy: number }
export interface PendingSkill { player: Player; skillId: SkillId; targets: Position[] }
export interface GameState {
  board: Board; phase: GamePhase; mode: GameMode; current: Player; players: [PlayerState, PlayerState];
  difficulty: AiDifficulty; environment: boolean; chaos: "normal" | "extreme"; turn: number; happy: number;
  happyTimeTurns: number; happyTriggered: boolean; lastMove: MoveRecord | null; moveHistory: MoveRecord[];
  skillHistory: SkillUseRecord[]; removed: RemovedStoneRecord[]; changes: BoardChangeRecord[]; selectedSkill: SkillId | null;
  skillTargets: Position[]; pendingSkill: PendingSkill | null; result: GameResult | null; statusText: string;
  dialogue: { speaker: string; text: string } | null; seed: number; environmentEvents: EnvironmentEvent[];
  stats: GameStats; chapter: number; animation: string | null; cutLine: [Position, Position] | null;
}
export type GameAction =
  | { type: "LOAD"; state: GameState }
  | { type: "PLACE"; position: Position }
  | { type: "SELECT_SKILL"; skillId: SkillId }
  | { type: "CANCEL_SKILL" }
  | { type: "SKILL_TARGET"; position: Position }
  | { type: "REACTION"; use: boolean }
  | { type: "AI_ACT" }
  | { type: "CLEAR_ANIMATION" }
  | { type: "RESTART" };
