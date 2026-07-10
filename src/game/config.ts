import type { CharacterDefinition, ReactionCardDefinition, SkillDefinition } from "./types";

export const characters: CharacterDefinition[] = [
  { id: "zhang", name: "张呈", role: "认真棋手 · 被迫适应", icon: "呈", accent: "#5aa7c7", passive: "首次目睹不讲理技能，额外获得 1 点技能值。", skills: ["grapple", "comeback", "education"] },
  { id: "ziqi", name: "子棋", role: "天生棋将 · 真诚胡说", icon: "棋", accent: "#d97a68", passive: "技能成功后可能郑重表扬自己。", skills: ["stillWater", "doubleBloom", "lure"] },
  { id: "principal", name: "技能五", role: "校长 · 规则的甲乙双方", icon: "五", accent: "#b9944b", passive: "第一次被质疑时，以“问得好”增加快乐值。", skills: ["flyingStone", "mountain", "cleaning"] },
  { id: "wang", name: "王金宝", role: "职业棋手 · 手刀也职业", icon: "宝", accent: "#8f7ed1", passive: "防护成功时，额外增加 3 点快乐值。", skills: ["halfStone", "handBlade", "training"] },
];

export const skillList: SkillDefinition[] = [
  { id: "grapple", name: "擒拿", character: "zhang", cost: 3, blurb: "锁住对方一项技能", rules: "自动锁定对手一个未使用的主动技能，持续两个对方行动回合。", targetType: "none", multiStep: false, counterable: false, uses: 1 },
  { id: "comeback", name: "东山再起", character: "zhang", cost: 3, blurb: "恢复最近被技能移除的己方棋子", rules: "仅当原坐标为空且移除记录可恢复时生效。", targetType: "none", multiStep: false, counterable: false, uses: 1 },
  { id: "education", name: "九年义务教育", character: "zhang", cost: 5, blurb: "在空位落子并给出教学", rules: "选择一个空位放置己方棋子，本回合不可反制。", targetType: "empty", multiStep: false, counterable: false, uses: 1 },
  { id: "stillWater", name: "静如止水", character: "ziqi", cost: 4, blurb: "跳过对手下个行动回合", rules: "不可叠加，可被水滴石穿反制。", targetType: "none", multiStep: false, counterable: true, uses: 1 },
  { id: "doubleBloom", name: "梅开二度", character: "ziqi", cost: 5, blurb: "连续放置两颗棋子", rules: "依次选择两个不同空位；第一颗获胜则立即停止。", targetType: "empty", multiStep: true, counterable: false, uses: 1 },
  { id: "lure", name: "调呈离山", character: "ziqi", cost: 3, blurb: "对手下次只能落在外三圈", rules: "只限制普通落子，技能仍可使用。", targetType: "none", multiStep: false, counterable: false, uses: 1 },
  { id: "flyingStone", name: "飞沙走石", character: "principal", cost: 3, blurb: "移除一颗对方棋子", rules: "选择未受保护的敌方棋子，可被拾金不昧或两极反转反制。", targetType: "enemyStone", multiStep: false, counterable: true, uses: 1 },
  { id: "mountain", name: "力拔山兮", character: "principal", cost: 6, blurb: "清空 3×3，自己下回合休息", rules: "采用稳定规则：目标 3×3 内棋子全部移除并写入历史。", targetType: "area", multiStep: false, counterable: false, uses: 1 },
  { id: "cleaning", name: "保洁上门", character: "principal", cost: 4, blurb: "横扫一段五格区域", rules: "以目标为中心的横向五格内，双方各最多移除一颗最近棋子。", targetType: "area", multiStep: false, counterable: false, uses: 1 },
  { id: "halfStone", name: "胜天半子", character: "wang", cost: 4, blurb: "放置一颗暂不计胜负的半子", rules: "半子阻挡连线，在王金宝下个正式回合转正。", targetType: "empty", multiStep: false, counterable: true, uses: 1 },
  { id: "handBlade", name: "手刀·再见", character: "wang", cost: 4, blurb: "切断相邻敌子之间的连线", rules: "选择一颗有相邻同色棋子的敌子，系统建立一条临时断线。", targetType: "enemyStone", multiStep: false, counterable: false, uses: 1 },
  { id: "training", name: "外练筋骨皮", character: "wang", cost: 2, blurb: "抵挡下一次棋子干预", rules: "下一次敌方技能试图移除、移动或转换己方棋子时阻挡该技能。", targetType: "none", multiStep: false, counterable: false, uses: 1 },
];

export const skills = Object.fromEntries(skillList.map((s) => [s.id, s])) as Record<SkillDefinition["id"], SkillDefinition>;

export const reactionCards: ReactionCardDefinition[] = [
  { id: "honesty", name: "拾金不昧", description: "对方要移除你的棋子时，立即归还。" },
  { id: "waterDrop", name: "水滴石穿", description: "取消静如止水，并照常行动。" },
  { id: "reverse", name: "两极反转", description: "把有明确阵营目标的技能反向结算。" },
  { id: "publicComeback", name: "东山再起", description: "恢复最近一次被技能移除的己方棋子。" },
];

export const storyChapters = [
  { title: "技能五子棋学校", opponent: "ziqi" as const, intro: [["张呈", "有人吗？"], ["子棋", "有人！"], ["张呈", "你们学校没有门铃吗？"], ["技能五", "问得好！"], ["张呈", "我还没问。"]] },
  { title: "先从棋子上跨过去", opponent: "ziqi" as const, intro: [["子棋", "欢迎参加进阶课。"], ["张呈", "上节课的规则还作数吗？"], ["子棋", "当然。我们只是换一套。"]] },
  { title: "校长亲自下场", opponent: "principal" as const, intro: [["技能五", "今天讲棋盘的可持续使用。"], ["张呈", "您手里为什么拿着锤子？"], ["技能五", "教学用具。"]] },
  { title: "胜天半子", opponent: "principal" as const, intro: [["技能五", "毕业考只有一条规则。"], ["张呈", "终于有规则了。"], ["技能五", "保持快乐。其他规则临场通知。"]] },
];
