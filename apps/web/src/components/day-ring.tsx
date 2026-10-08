"use client";
import type { TodayItem } from "@stay-focused/shared";
import { useEffect, useRef, useState } from "react";
import { timeLabel } from "../lib/api";
const point = (minutes: number, radius = 126) => ({ x: 160 + radius * Math.cos(minutes / 1440 * Math.PI * 2 + Math.PI / 2), y: 160 + radius * Math.sin(minutes / 1440 * Math.PI * 2 + Math.PI / 2) });
function arc(from: number, to: number) { const a=point(from), b=point(Math.min(to,from+1439.9)); return `M${a.x} ${a.y} A126 126 0 ${to-from>720?1:0} 1 ${b.x} ${b.y}`; }
export function DayRing({ timeline, date, start, end, onChange }: { timeline: readonly TodayItem[]; date: string; start: number; end: number; onChange: (start: number, end: number) => void }) {
  const [now,setNow]=useState(new Date()), dragging=useRef<"start"|"end"|null>(null);
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),30000);return ()=>clearInterval(timer);},[]);
  const segments=timeline.flatMap(item=>{
    if (!item.startAt||!item.endAt) return [];
    const dayStart=new Date(`${date}T00:00:00`).getTime(), from=Math.max(0,(Date.parse(item.startAt)-dayStart)/60000), to=Math.min(1440,(Date.parse(item.endAt)-dayStart)/60000);
    return to>from?[{id:item.id,from,to,color:item.kind==="study_session"?"#8DAFF0":item.kind==="calendar_block"?"#E5BC76":"#B7A1D8"}]:[];
  });
  function change(handle:"start"|"end", value:number) { onChange(handle==="start"?Math.min(value,end-15):start,handle==="end"?Math.max(value,start+15):end); }
  const minutes=now.getHours()*60+now.getMinutes(), marker=point(minutes,105);
  return <div><div className="ring-container"><svg viewBox="0 0 320 320" aria-label="Your day and available study time" role="img" onPointerMove={event=>{if(!dragging.current)return;const rect=event.currentTarget.getBoundingClientRect(),x=(event.clientX-rect.left)*320/rect.width-160,y=(event.clientY-rect.top)*320/rect.height-160;const value=Math.round((((Math.atan2(y,x)-Math.PI/2+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*1440)/15)*15;change(dragging.current,Math.min(1440,Math.max(0,value)));}} onPointerUp={()=>{dragging.current=null;}} onPointerCancel={()=>{dragging.current=null;}}>
    <circle cx="160" cy="160" r="116" fill="var(--surface)"/><circle cx="160" cy="160" r="126" fill="none" stroke="var(--field)" strokeWidth="22"/>
    <path d={arc(start,end)} stroke="#91CDB2" strokeWidth="22" fill="none"/>{segments.map(s=><path key={s.id} d={arc(s.from,s.to)} stroke={s.color} strokeWidth="22" fill="none"/>)}
    {Array.from({length:48},(_,i)=>{const a=point(i*30,i%2===0?99:105),b=point(i*30,112);return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--muted)" strokeWidth=".8" opacity=".6"/>;})}
    <circle cx={marker.x} cy={marker.y} r="3" fill="#E5BC76"/>
    {(["start","end"] as const).map(handle=>{const p=point(handle==="start"?start:end);return <g key={handle} onPointerDown={event=>{dragging.current=handle;event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);}}><circle cx={p.x} cy={p.y} r="24" fill="transparent"/><circle cx={p.x} cy={p.y} r="9" stroke="var(--text)" strokeWidth="2" fill="#8DAFF0"/></g>;})}
    {[0,360,720,1080].map(m=>{const p=point(m,150);return <text key={m} x={p.x} y={p.y+3} fill="var(--secondary)" textAnchor="middle" fontSize="9">{m===0?"12 AM":m===360?"6 AM":m===720?"12 PM":"6 PM"}</text>;})}
  </svg><div className="ring-center"><span className="clock-label">{timeLabel(now.toISOString())}</span><span className="meta">{new Date(`${date}T12:00:00`).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}</span></div></div><p className="meta" style={{textAlign:"center"}}>Drag the handles to adjust your study time.</p><div className="ring-controls"><label>Available from<input type="range" min="0" max="1425" step="15" value={start} aria-valuetext={minuteLabel(start)} onChange={e=>change("start",Number(e.target.value))}/><span>{minuteLabel(start)}</span></label><label>Available until<input type="range" min="15" max="1440" step="15" value={end} aria-valuetext={minuteLabel(end)} onChange={e=>change("end",Number(e.target.value))}/><span>{minuteLabel(end)}</span></label></div></div>;
}
export function minuteLabel(value:number) { return value===1440?"12:00 AM (next day)":`${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`; }
