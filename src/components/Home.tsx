import { characters } from "../game/config";

export type HomeAction = "story" | "free" | "pure" | "local" | "characters" | "skills" | "settings" | "records" | "credits";
export function Home({ onAction, unlocked }: { onAction: (action: HomeAction) => void; unlocked: number }) {
  return <main className="home-shell">
    <div className="curtain left"/><div className="curtain right"/>
    <section className="hero">
      <div className="school-stamp">本校规则 · 随时解释</div>
      <p className="eyebrow">SKILL GOMOKU ACADEMY</p>
      <h1><span>技能</span>五子棋学校</h1>
      <p className="marquee"><i/>传统五子棋，好无趣？那就加入技能。<i/></p>
      <p className="lead">底层规则严谨，表层演出荒诞。请坐稳，棋盘偶尔不坐稳。</p>
    </section>
    <section className="mode-grid" aria-label="游戏模式">
      <button className="mode-card featured" onClick={()=>onAction("story")}><span className="card-index">主修课程 · {unlocked}/4</span><strong>剧情闯关</strong><p>扮演张呈，完成四章荒诞棋局。</p><b>进入学校 →</b></button>
      <button className="mode-card" onClick={()=>onAction("free")}><span className="card-index">随堂练习</span><strong>自由对战</strong><p>选角色、难度与胡闹浓度。</p><b>自定义开局 →</b></button>
      <button className="mode-card" onClick={()=>onAction("local")}><span className="card-index">同桌对练</span><strong>本地双人</strong><p>两个人共享屏幕，责任各半。</p><b>请同桌上场 →</b></button>
      <button className="mode-card quiet" onClick={()=>onAction("pure")}><span className="card-index">隐藏选修</span><strong>纯净五子棋</strong><p>据说有人只是想正常下棋。</p><b>保持克制 →</b></button>
    </section>
    <section className="cast-strip"><div><small>本学期师资</small><h2>一本正经地，胡说八道</h2></div>{characters.map((c)=><button key={c.id} onClick={()=>onAction("characters")} style={{"--accent":c.accent} as React.CSSProperties}><span>{c.icon}</span><b>{c.name}</b><small>{c.role.split(" · ")[0]}</small></button>)}</section>
    <nav className="utility-nav" aria-label="更多内容">{[["characters","角色图鉴"],["skills","技能图鉴"],["settings","设置"],["records","战绩"],["credits","制作说明"]].map(([id,label])=><button key={id} onClick={()=>onAction(id as HomeAction)}>{label}</button>)}</nav>
    <footer>校训：下棋开心就好 · 棋盘损坏请联系校长（校长会假装没听见）</footer>
  </main>;
}
