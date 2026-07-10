import { characters } from "../game/config";
import type { GameState, Player } from "../game/types";

export function CharacterPanel({ state, player }: { state: GameState; player: Player }) {
  const data = characters.find((c) => c.id === state.players[player].character)!; const info = state.players[player]; const active = state.current === player && !state.result;
  return <aside className={`character-panel ${active ? "active" : ""} ${info.frozen ? "frozen" : ""}`} style={{ "--accent": data.accent } as React.CSSProperties}>
    <div className="portrait" aria-hidden="true"><span>{data.icon}</span><i>{player === 0 ? "黑" : "白"}</i></div>
    <div className="character-copy"><small>{player === 0 ? "玩家一" : state.mode === "local" ? "玩家二" : "学院代表"}</small><h3>{data.name}</h3><p>{data.role}</p></div>
    <div className="energy-row" aria-label={`技能值 ${info.energy} / 6`}><b>技</b>{Array.from({length:6},(_,i)=><i key={i} className={i<info.energy?"full":""}/>)}</div>
    <div className="status-chips">{info.frozen>0&&<span>❄ 冻结</span>}{info.shield&&<span>◇ 防护</span>}{info.lured&&<span>↗ 外三圈</span>}{Object.keys(info.lockedSkills).length>0&&<span>✋ 擒拿</span>}</div>
  </aside>;
}
