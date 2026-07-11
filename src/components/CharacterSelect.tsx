import { useState } from "react";
import { characters, skills, storyChapters } from "../game/config";
import type { AiDifficulty, CharacterId, GameMode } from "../game/types";

interface Props {
  mode: GameMode; selected: CharacterId; setSelected: (id: CharacterId) => void;
  opponentSelected: CharacterId; setOpponentSelected: (id: CharacterId) => void;
  difficulty: AiDifficulty; setDifficulty: (d: AiDifficulty)=>void; environment: boolean; setEnvironment:(v:boolean)=>void;
  chaos:"normal"|"extreme"; setChaos:(v:"normal"|"extreme")=>void; chapter:number; setChapter:(n:number)=>void;
  unlocked:number; onStart:()=>void; onBack:()=>void;
}

export function CharacterSelect(props: Props) {
  const story = props.mode === "story", dualSelection = props.mode === "free" || props.mode === "local";
  const [editingSide, setEditingSide] = useState<"black" | "white">("black");
  const black = characters.find((c) => c.id === props.selected)!, white = characters.find((c) => c.id === props.opponentSelected)!;
  const chooseCharacter = (id: CharacterId) => { if (story) return; if (!dualSelection || editingSide === "black") props.setSelected(id); else props.setOpponentSelected(id); };

  return <main className="select-shell"><header className="sub-header"><button onClick={props.onBack}>← 返回礼堂</button><div><small>赛前手续</small><h1>{story ? "选择剧情章节" : dualSelection ? "选择双方代表" : "选择你的代表"}</h1></div><span>底层规则审核中</span></header>
    {story && <section className="chapter-tabs">{storyChapters.map((c,i)=><button key={c.title} disabled={i+1>props.unlocked} className={props.chapter===i+1?"active":""} onClick={()=>props.setChapter(i+1)}><small>第 {i+1} 章</small><b>{c.title}</b>{i+1>props.unlocked&&<em>未解锁</em>}</button>)}</section>}
    {dualSelection && <section className="side-selector" aria-label="选择要编辑的对战方">
      <button className={editingSide==="black"?"active black":"black"} onClick={()=>setEditingSide("black")}><i>黑</i><span><small>黑方 · 玩家一</small><b>{black.name}</b></span><em>先手</em></button>
      <div className="versus">VS</div>
      <button className={editingSide==="white"?"active white":"white"} onClick={()=>setEditingSide("white")}><i>白</i><span><small>白方 · {props.mode==="free"?"AI":"玩家二"}</small><b>{white.name}</b></span><em>{props.mode==="free"?"电脑控制":"本地控制"}</em></button>
    </section>}
    <section className="select-grid">{characters.map((c)=>{const blackPicked=props.selected===c.id,whitePicked=dualSelection&&props.opponentSelected===c.id,activePick=dualSelection?(editingSide==="black"?blackPicked:whitePicked):blackPicked;return <button key={c.id} className={`select-card ${activePick?"selected":""} ${blackPicked?"black-picked":""} ${whitePicked?"white-picked":""}`} onClick={()=>chooseCharacter(c.id)} disabled={story&&c.id!=="zhang"} style={{"--accent":c.accent} as React.CSSProperties}><div className="big-portrait"><span>{c.icon}</span><i>{c.id==="zhang"?"认真":c.id==="ziqi"?"真诚":c.id==="principal"?"权威":"职业"}</i>{blackPicked&&dualSelection&&<b className="pick-badge black">黑方</b>}{whitePicked&&<b className="pick-badge white">白方</b>}</div><h2>{c.name}</h2><p>{c.role}</p><div className="skill-preview">{c.skills.map((id)=><span key={id}><b>{skills[id].name}</b><small>{skills[id].cost} 技能值</small></span>)}</div><small className="passive">被动 · {c.passive}</small></button>})}</section>
    <section className="match-settings"><label><span>AI 难度</span><select value={props.difficulty} onChange={(e)=>props.setDifficulty(e.target.value as AiDifficulty)} disabled={props.mode==="local"}><option value="easy">简单 · 先胡闹再计算</option><option value="normal">普通 · 会攻会守</option><option value="hard">困难 · 认真钻规则漏洞</option></select></label><label className="switch-line"><span>环境事件</span><input type="checkbox" checked={props.environment} onChange={(e)=>props.setEnvironment(e.target.checked)} /></label><label><span>胡闹浓度</span><select value={props.chaos} onChange={(e)=>props.setChaos(e.target.value as "normal"|"extreme")}><option value="normal">正常胡闹</option><option value="extreme">极度胡闹</option></select></label><button className="start-button" onClick={props.onStart}>以 {black.name} 对阵 {dualSelection?white.name:"学院代表"} <i>→</i></button></section>
  </main>;
}
