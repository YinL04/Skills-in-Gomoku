import type { DialogueEntry, DialogueTrigger } from "./types";

export const dialogues: DialogueEntry[] = [
  { trigger: "move", speaker: "zhang", text: "终于有一步像五子棋了。", weight: 2 },
  { trigger: "move", speaker: "ziqi", text: "普通落子，是高级技能的休息。", weight: 1 },
  { trigger: "move", speaker: "principal", text: "这一步没出事故，记大功。", weight: 1 },
  { trigger: "skill", speaker: "principal", text: "规则不是没了，是去换衣服了。", weight: 1 },
  { trigger: "skill", speaker: "ziqi", text: "顾名思义，名已经很努力了。", weight: 1 },
  { trigger: "skill", speaker: "zhang", text: "我申请查看校规原件。", weight: 2 },
  { trigger: "invalid", speaker: "system", text: "该位置拒绝配合演出。", weight: 1 },
  { trigger: "invalid", speaker: "zhang", text: "连胡闹都要讲先来后到。", weight: 1 },
  { trigger: "counter", speaker: "wang", text: "反制成功，手法很职业。", weight: 1 },
  { trigger: "counter", speaker: "principal", text: "问得好！下次别问。", weight: 1 },
  { trigger: "environment", speaker: "system", text: "礼堂设施再次参与比赛。", weight: 1 },
  { trigger: "environment", speaker: "zhang", text: "校长，棋盘不是一次性的。", weight: 1 },
  { trigger: "thinking", speaker: "system", text: "AI 正在寻找规则漏洞。", weight: 1 },
  { trigger: "thinking", speaker: "system", text: "对手正在假装这是职业比赛。", weight: 1 },
  { trigger: "thinking", speaker: "system", text: "正在确认棋盘能不能摔。", weight: 1 },
  { trigger: "nearWin", speaker: "zhang", text: "先别鼓掌，棋还没下完。", weight: 1 },
  { trigger: "win", speaker: "principal", text: "胜负有效，解释稍后补交。", weight: 1 },
  { trigger: "win", speaker: "zhang", text: "我赢了，但规则输了。", weight: 1 },
  { trigger: "happy", speaker: "ziqi", text: "哒啦哒，棋盘也会唱！", weight: 1 },
  { trigger: "happy", speaker: "system", text: "快乐时刻：技能统一打折。", weight: 1 },
];

export function dialogueFor(trigger: DialogueTrigger, seed: number) {
  const pool = dialogues.filter((d) => d.trigger === trigger); if (!pool.length) return null;
  const entry = pool[Math.abs(seed) % pool.length]; return { speaker: entry.speaker, text: entry.text };
}
