import { useState } from "react";
import type { GameAction, GameState, Player } from "../game/types";

export function GameModifier({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const [open, setOpen] = useState(false);
  const setNumber = (field: "happy" | "blackEnergy" | "whiteEnergy" | "turn", value: string) => dispatch({ type: "DEBUG_SET", field, value: Number(value) });
  return <aside className={`game-modifier ${open ? "open" : ""}`}>
    <button className="modifier-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>🛠 {open ? "收起测试台" : "测试台"}</button>
    {open && <div className="modifier-panel">
      <header><small>本地调试工具</small><b>棋局控制台</b></header>
      <label><span>快乐值</span><input type="number" min="0" max="100" value={state.happy} onChange={(e)=>setNumber("happy",e.target.value)}/><em>/ 100</em></label>
      <label><span>黑方技能值</span><input type="number" min="0" max="6" value={state.players[0].energy} onChange={(e)=>setNumber("blackEnergy",e.target.value)}/><em>/ 6</em></label>
      <label><span>白方技能值</span><input type="number" min="0" max="6" value={state.players[1].energy} onChange={(e)=>setNumber("whiteEnergy",e.target.value)}/><em>/ 6</em></label>
      <label><span>行动计数</span><input type="number" min="1" max="199" value={state.turn} onChange={(e)=>setNumber("turn",e.target.value)}/><em>步</em></label>
      <div className="modifier-side"><span>当前行动方</span>{([0,1] as Player[]).map((player)=><button key={player} className={state.current===player?"active":""} onClick={()=>dispatch({type:"DEBUG_SET_CURRENT",player})}>{player===0?"黑方":"白方"}</button>)}</div>
      <div className="modifier-presets"><button onClick={()=>dispatch({type:"DEBUG_SET",field:"happy",value:80})}>快乐80</button><button onClick={()=>{dispatch({type:"DEBUG_SET",field:"blackEnergy",value:6});dispatch({type:"DEBUG_SET",field:"whiteEnergy",value:6})}}>双方满能</button></div>
      <button className="clear-temp" onClick={()=>dispatch({type:"DEBUG_CLEAR_TEMP"})}>清除冻结、锁定与临时状态</button>
    </div>}
  </aside>;
}
