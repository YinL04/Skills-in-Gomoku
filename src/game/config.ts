import type { CharacterDefinition, SkillDefinition } from "./types";

export const characters: CharacterDefinition[] = [
  { id: "zhang", name: "张呈", role: "认真棋手 · 专治物理胡闹", icon: "呈", accent: "#5aa7c7", passive: "终结危机出现时，优先获得补救提示。", skills: ["grapple", "comeback", "timeRewind"] },
  { id: "ziqi", name: "子棋", role: "天生棋将 · 冻结时间与成语", icon: "棋", accent: "#d97a68", passive: "技能成功后可能一本正经地表扬自己。", skills: ["stillWater", "doubleBloom", "lure"] },
  { id: "principal", name: "技能五", role: "校长 · 规则和棋盘都能摔", icon: "五", accent: "#b9944b", passive: "第四章可发动最终招式“两极反转”。", skills: ["flyingStone", "cleaning", "mountain", "finalReverse"] },
  { id: "wang", name: "王金宝", role: "职业棋手 · 负责相对克制", icon: "宝", accent: "#8f7ed1", passive: "防护成功时，额外增加 3 点快乐值。", skills: ["halfStone", "handBlade", "training"] },
];

export const skillList: SkillDefinition[] = [
  { id: "grapple", name: "擒拿", character: "zhang", cost: 2, blurb: "擒擒又拿拿，专克飞沙走石", rules: "飞沙走石发动时可反应：取消移除，并锁定对方飞沙走石两个行动回合。", targetType: "none", multiStep: false, counterable: false, uses: 1, category: "reaction", reactionOnly: true },
  { id: "comeback", name: "东山再起", character: "zhang", cost: 3, blurb: "捡起棋盘，继续游戏", rules: "仅在力拔山兮摔坏棋盘时反应，恢复摔棋盘前的完整棋局。", targetType: "none", multiStep: false, counterable: false, uses: 1, category: "rescue", reactionOnly: true },
  { id: "timeRewind", name: "时光倒流", character: "zhang", cost: 6, blurb: "倒立施法，撤销上一完整行动", rules: "主动使用时恢复到上一个行动前的棋盘；也可反制调呈离山或两极反转。已消耗的技能次数不返还。", targetType: "none", multiStep: false, counterable: false, uses: 1, category: "ultimate" },
  { id: "stillWater", name: "静如止水", character: "ziqi", cost: 3, blurb: "凝结时间，冻结棋盘操作5秒", rules: "对方行动开始前锁定棋盘操作5秒；倒计时结束后正常继续，不吞掉回合。", targetType: "none", multiStep: false, counterable: false, uses: 2, category: "control" },
  { id: "doubleBloom", name: "梅开二度", character: "ziqi", cost: 5, blurb: "连续放置两颗棋子", rules: "依次选择两个不同空位；第一颗造成胜利时立即停止。", targetType: "empty", multiStep: true, counterable: false, uses: 1, category: "normal" },
  { id: "lure", name: "调呈离山", character: "ziqi", cost: 6, blurb: "调走张呈，离开山东，直接获胜", rules: "第8回合后且对手为张呈时发动。张呈可用时光倒流反制，否则发动者直接获胜。", targetType: "none", multiStep: false, counterable: true, uses: 1, category: "ultimate", finisher: true },
  { id: "flyingStone", name: "飞沙走石", character: "principal", cost: 3, blurb: "把对手棋子扔进什刹海", rules: "选择一颗对方棋子移除；上一颗棋子会特别标记。可被张呈的擒拿阻止。", targetType: "enemyStone", multiStep: false, counterable: true, uses: 1, category: "normal" },
  { id: "cleaning", name: "保洁上门", character: "principal", cost: 4, blurb: "随机清除一半棋子", rules: "用固定随机种子清除约一半未保护棋子，并尽量为双方各保留一颗。", targetType: "none", multiStep: false, counterable: false, uses: 1, category: "normal" },
  { id: "mountain", name: "力拔山兮", character: "principal", cost: 6, blurb: "摔帽子、摔棋盘，直接获胜", rules: "第8回合后摔坏棋盘。张呈可用东山再起恢复，否则发动者直接获胜。", targetType: "none", multiStep: false, counterable: true, uses: 1, category: "ultimate", finisher: true },
  { id: "finalReverse", name: "两极反转", character: "principal", cost: 6, blurb: "展示黑历史，张呈丧失战斗力", rules: "第8回合后、快乐值达到80且对手为张呈时发动。可被时光倒流反制。", targetType: "none", multiStep: false, counterable: true, uses: 1, category: "ultimate", finisher: true },
  { id: "halfStone", name: "胜天半子", character: "wang", cost: 4, blurb: "放置一颗暂不计胜负的半子", rules: "半子阻挡连线，在王金宝下个正式回合转正。", targetType: "empty", multiStep: false, counterable: false, uses: 1, category: "normal" },
  { id: "handBlade", name: "手刀·再见", character: "wang", cost: 4, blurb: "切断相邻敌子之间的连线", rules: "选择一颗相邻同色敌子，建立一条持续一回合的断线。", targetType: "enemyStone", multiStep: false, counterable: false, uses: 1, category: "control" },
  { id: "training", name: "外练筋骨皮", character: "wang", cost: 2, blurb: "抵挡下一次棋子干预", rules: "下一次敌方技能试图移除己方棋子时阻挡该技能。", targetType: "none", multiStep: false, counterable: false, uses: 1, category: "rescue" },
];

export const skills = Object.fromEntries(skillList.map((s) => [s.id, s])) as Record<SkillDefinition["id"], SkillDefinition>;

export const storyChapters = [
  { title: "技能五子棋学校", opponent: "ziqi" as const, intro: [["张呈", "有人吗？"], ["子棋", "有人！"], ["张呈", "你们学校没有门铃吗？"], ["技能五", "问得好！"], ["张呈", "我还没问。"]] },
  { title: "时光倒流训练课", opponent: "ziqi" as const, intro: [["子棋", "今天练习冻结时间。"], ["张呈", "棋盘为什么穿了羽绒服？"], ["子棋", "它比你先理解规则。"]] },
  { title: "校长开始摔棋盘", opponent: "principal" as const, intro: [["技能五", "今天讲棋盘的循环利用。"], ["张呈", "您先把棋盘放下。"], ["技能五", "放下也是摔的一部分。"]] },
  { title: "两极反转毕业考", opponent: "principal" as const, intro: [["技能五", "毕业考最后一项：黑历史。"], ["张呈", "这和五子棋有什么关系？"], ["技能五", "关系正在加载。"]] },
];
