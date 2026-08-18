import type {AgentState} from "@abhi/types";
export function Office({state,onObject}:{state:AgentState,onObject:(x:string)=>void}){return <div className={`office state-${state.toLowerCase()}`} aria-label={`ABHI office. Current state: ${state}`}>
<div className="window"><div className="sky-glow"/><span className="star s1"/><span className="star s2"/><span className="star s3"/><div className="city c1"/><div className="city c2"/><div className="city c3"/></div>
<div className="wall-line"/><button className="board office-hit" onClick={()=>onObject("tasks")} aria-label="Open task board"><span>LIVE TASK</span><b>{state==="IDLE"?"STANDBY":state}</b><i/></button>
<button className="shelf office-hit" onClick={()=>onObject("memory")} aria-label="Open memory"><span/><span/><span/><em>MEMORY</em></button>
<div className="lamp"><i/><b/></div><div className="plant"><i/><i/><i/><b/></div>
<button className="desk office-hit" onClick={()=>onObject("activity")} aria-label="Open current activity"><div className="monitor"><div className="monitor-screen"><span className="terminal-line"/><span className="terminal-line short"/><div className="pulse-line"/></div><i/></div><div className="mug">A</div><div className="desk-top"/><div className="drawer"><i/><i/></div></button>
<button className="abhi office-hit" onClick={()=>onObject("agent")} aria-label="Open ABHI agent panel"><div className="antenna"><i/></div><div className="head"><div className="face"><i className="eye left"/><i className="eye right"/><span className="mouth"/></div><div className="ear left"/><div className="ear right"/></div><div className="neck"/><div className="body"><div className="core"><i/></div><span className="arm left"/><span className="arm right"/></div><div className="chair"/></button>
<div className="floor-grid"/><div className="ambient a1"/><div className="ambient a2"/></div>}

