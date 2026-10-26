"use client";
function Shape({ width, height, radius = 8 }: { width: number | string; height: number; radius?: number }) { return <span className="planner-sk" aria-hidden="true" style={{ width, height, borderRadius: radius }} />; }
export function PlannerSkeleton() {
  return <div className="planner-skeleton" aria-busy="true" aria-label="Loading your plan">
    <div className="planner-fit"><div className="row between"><Shape width="55%" height={16} /><Shape width="23%" height={12} /></div><Shape width="100%" height={6} radius={3} /><Shape width="85%" height={12} /></div>
    <div className="planner-timeline">{['78%','92%','64%'].map((width,index) => <div className="planner-block" data-testid="skeleton-block-row" key={index}><div className="planner-time"><Shape width={30} height={12} /></div><div className="planner-block-card"><div className="row"><Shape width={10} height={10} radius={5} /><Shape width={38} height={10} /></div><Shape width={width} height={14} /><Shape width={92} height={10} /></div></div>)}</div>
    <div><h3 className="planner-kicker">Adjust</h3>{['Courses','Include'].map((label,index)=><div className="planner-skeleton-setting" key={label}><span>{label}</span><Shape width={index ? 196 : 44} height={index ? 36 : 12} radius={index ? 10 : 6} /></div>)}</div>
    <div><h3 className="planner-kicker">Smart order</h3>{['72%','58%','66%','50%'].map((width,index)=><div className="planner-skeleton-course" data-testid="skeleton-course-row" key={index}><Shape width={10} height={10} radius={5} /><div className="grow"><Shape width={width} height={13} /><Shape width={110} height={10} /></div><Shape width={14} height={14} radius={4} /></div>)}</div>
    <button type="button" className="planner-primary" disabled>Use this plan</button>
  </div>;
}
