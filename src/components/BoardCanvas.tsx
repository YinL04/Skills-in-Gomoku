import { useEffect, useRef } from "react";
import { legalTarget, SIZE } from "../game/rules";
import type { GameState, Position } from "../game/types";

interface Props { state: GameState; onCell: (position: Position) => void }
export function BoardCanvas({ state, onCell }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return; const dpr = Math.min(2, window.devicePixelRatio || 1); const rect = canvas.getBoundingClientRect(); const size = Math.min(rect.width, rect.height); canvas.width = size * dpr; canvas.height = size * dpr;
    const ctx = canvas.getContext("2d")!; ctx.scale(dpr, dpr); const pad = size * .055, step = (size - pad * 2) / (SIZE - 1);
    const wood = ctx.createLinearGradient(0, 0, size, size); wood.addColorStop(0, "#e6b86d"); wood.addColorStop(.45, "#c9914c"); wood.addColorStop(1, "#a96b33"); ctx.fillStyle = wood; ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = .12; ctx.strokeStyle = "#fff1bf"; for (let y = 8; y < size; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(size*.25,y-6,size*.7,y+8,size,y-2); ctx.stroke(); } ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(50,24,8,.68)"; ctx.lineWidth = 1; for (let i = 0; i < SIZE; i++) { const p = pad + i * step; ctx.beginPath(); ctx.moveTo(p, pad); ctx.lineTo(p, size-pad); ctx.stroke(); ctx.beginPath(); ctx.moveTo(pad, p); ctx.lineTo(size-pad, p); ctx.stroke(); }
    ctx.fillStyle = "#3d210f"; [3,7,11].forEach((r) => [3,7,11].forEach((c) => { ctx.beginPath(); ctx.arc(pad+c*step,pad+r*step,Math.max(2,step*.09),0,Math.PI*2); ctx.fill(); }));
    if (state.selectedSkill) for (let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) if (legalTarget(state,state.current,state.selectedSkill,{row:r,col:c})) { ctx.strokeStyle="rgba(255,245,171,.72)"; ctx.lineWidth=2; ctx.strokeRect(pad+c*step-step*.35,pad+r*step-step*.35,step*.7,step*.7); }
    state.board.forEach((row,r)=>row.forEach((stone,c)=>{ if(!stone)return; const x=pad+c*step,y=pad+r*step,rad=step*.42; ctx.save(); if(stone.half){ctx.beginPath();ctx.rect(x-rad,y-rad,rad,rad*2);ctx.clip();} const g=ctx.createRadialGradient(x-rad*.3,y-rad*.35,rad*.1,x,y,rad); if(stone.owner===0){g.addColorStop(0,"#656565");g.addColorStop(.35,"#282828");g.addColorStop(1,"#050505");}else{g.addColorStop(0,"#fffef0");g.addColorStop(.55,"#e7dfcb");g.addColorStop(1,"#a89d8a");} ctx.shadowColor="rgba(0,0,0,.48)";ctx.shadowBlur=rad*.45;ctx.shadowOffsetY=rad*.25;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();ctx.restore(); if(stone.half){ctx.fillStyle="#5e2b83";ctx.font=`bold ${rad*.9}px sans-serif`;ctx.fillText("½",x-rad*.2,y+rad*.28);} if(stone.protected){ctx.strokeStyle="#d7f8ff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,rad*1.15,0,Math.PI*2);ctx.stroke();ctx.font=`${rad*.65}px sans-serif`;ctx.fillText("◇",x-rad*.35,y+rad*.25);} }));
    if(state.lastMove){const{x,y}={x:pad+state.lastMove.position.col*step,y:pad+state.lastMove.position.row*step};ctx.fillStyle="#efb932";ctx.beginPath();ctx.arc(x,y,step*.1,0,Math.PI*2);ctx.fill();}
    if(state.result?.line){ctx.strokeStyle="#fff4a8";ctx.lineWidth=Math.max(4,step*.16);ctx.lineCap="round";ctx.shadowColor="#ffcc55";ctx.shadowBlur=14;ctx.beginPath();state.result.line.forEach((p,i)=>{const x=pad+p.col*step,y=pad+p.row*step;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();}
    if(state.cutLine){const [a,b]=state.cutLine;ctx.strokeStyle="#f34b5f";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(pad+a.col*step,pad+a.row*step);ctx.lineTo(pad+b.col*step,pad+b.row*step);ctx.stroke();ctx.font=`${step*.7}px sans-serif`;ctx.fillText("✂",pad+(a.col+b.col)/2*step-step*.35,pad+(a.row+b.row)/2*step-step*.2);}
  }, [state]);
  function click(e: React.PointerEvent<HTMLCanvasElement>) { const rect=e.currentTarget.getBoundingClientRect(),size=Math.min(rect.width,rect.height),pad=size*.055,step=(size-pad*2)/(SIZE-1); const col=Math.round((e.clientX-rect.left-pad)/step),row=Math.round((e.clientY-rect.top-pad)/step); if(row>=0&&row<SIZE&&col>=0&&col<SIZE)onCell({row,col}); }
  return <canvas ref={ref} className={`board-canvas ${state.animation ? `fx-${state.animation}` : ""}`} onPointerDown={click} aria-label="15×15 五子棋棋盘，点击交叉点落子" />;
}
