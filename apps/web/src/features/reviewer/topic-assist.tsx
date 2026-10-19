"use client";
import { TOPIC_ACTIONS, TOPIC_LEVELS, TOPIC_LABELS, TOPIC_SHORT_LABELS, EXPOUND_LABEL, STUDY_OFFLINE, STUDY_GROUNDING_LABELS, selectTopic, topicLevelAction,
  type ReviewerReaderModel, type TopicAction, type TopicLevel, type TopicResult } from '@stay-focused/shared';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Api } from '../../lib/api';
import { topicAssist } from './assist-store';
import { StudyText } from './study-text';
import { StudyAnswerArea, useAnswerReveal } from './study-answer-scroll';

type Entry = { status: 'pending' | 'ready' | 'error'; result?: TopicResult; error?: string };
type Props = {
  reviewer: ReviewerReaderModel; sectionId: string; owner: string; client: Api; online: boolean; children: ReactNode;
};
export function TopicAssist(props: Props) {
  const selection = useMemo(() => selectTopic(props.reviewer, props.sectionId), [props.reviewer, props.sectionId]);
  return <TopicAssistContent key={JSON.stringify([props.owner, selection?.reviewerId, selection?.sectionId, selection?.canonicalContent])} {...props} />;
}
function TopicAssistContent({ reviewer, sectionId, owner, client, online, children }: Props) {
  const selection = useMemo(() => selectTopic(reviewer, sectionId), [reviewer, sectionId]);
  const [level, setLevel] = useState<TopicLevel>('original');
  const [expanded, setExpanded] = useState(false);
  const options = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const group = options.current;
    if (!group) return;
    const measure = () => {
      const selected = group.querySelector<HTMLButtonElement>('[aria-checked="true"]');
      if (!selected) return;
      const x = selected.offsetLeft, width = selected.offsetWidth;
      setThumb(old => old?.x === x && old.width === width ? old : { x, width });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    for (const button of group.querySelectorAll('button')) observer.observe(button);
    return () => observer.disconnect();
  }, [level]);
  const [entries, setEntries] = useState<Partial<Record<TopicAction, Entry>>>({});
  const alive = useRef(true);
  const reveal = useAnswerReveal();
  const bodyId = `topic-${sectionId}-body`, expoundId = `topic-${sectionId}-expound`;
  useEffect(() => {
    alive.current = true;
    if (selection) for (const action of TOPIC_ACTIONS) void topicAssist.peek(owner, selection, action).then(result => {
      if (result && alive.current) setEntries(old => old[action] ? old : { ...old, [action]: { status: 'ready', result } });
    });
    return () => { alive.current = false; };
  }, [owner, selection]);
  const action = topicLevelAction(level), current = action ? entries[action] : undefined;
  const expound = entries.topic_expound;
  const canUse = (action: TopicAction) => !!selection && !!owner && (online || entries[action]?.status === 'ready');
  const focusLevel = action && !canUse(action) ? 'original' : level;
  function run(action: TopicAction, target: string) {
    if (!selection) return;
    const token = reveal.begin(target);
    if (entries[action]?.status === 'ready') return;
    setEntries(old => ({ ...old, [action]: { status: 'pending' } }));
    void topicAssist.run(owner, client, selection, action, online).then(result => {
      if (alive.current) { setEntries(old => ({ ...old, [action]: { status: 'ready', result } })); reveal.complete(token); }
    }, () => {
      if (alive.current) {
        setEntries(old => ({ ...old, [action]: { status: 'error', error: online
          ? 'This explanation could not be generated. Try again in a moment.' : STUDY_OFFLINE } }));
        reveal.complete(token);
      }
    });
  }
  function choose(next: TopicLevel) {
    setLevel(next);
    const nextAction = topicLevelAction(next);
    if (nextAction) run(nextAction, bodyId); else reveal.cancel();
  }
  function toggleExpound() {
    setExpanded(!expanded);
    if (!expanded) run('topic_expound', expoundId); else reveal.cancel();
  }
  const renderEntry = (entry: Entry | undefined, retry: () => void) => entry?.status === 'ready' && entry.result
    ? <div className="stack"><p className="meta">{STUDY_GROUNDING_LABELS[entry.result.grounding]}</p><StudyText text={entry.result.text} /></div>
    : entry?.status === 'error' ? <div role="alert"><p>{entry.error}</p><button disabled={!online} onClick={retry}>Retry</button></div>
    : <p role="status">Creating your explanation?</p>;
  return <div className="stack topic-assist">
    <div className="topic-level-row no-select">
      <div className="segmented">
        <div ref={options} className="topic-level-options" role="radiogroup" aria-label="Topic level" onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          if (index < 0 || !buttons.length) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
            : (index + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length;
          buttons[next]?.focus(); buttons[next]?.click();
        }}>
          {thumb && <span className="topic-level-thumb" aria-hidden="true" style={{ width: thumb.width, transform: `translateX(${thumb.x}px)` }} />}
          {TOPIC_LEVELS.map(item => { const a = topicLevelAction(item); return <button key={item} type="button" role="radio" aria-label={TOPIC_LABELS[item]} aria-checked={level === item} tabIndex={focusLevel === item ? 0 : -1}
            disabled={!!a && !canUse(a)} onClick={() => choose(item)}>
            <span className="topic-label-full" aria-hidden="true">{TOPIC_LABELS[item]}</span><span className="topic-label-short" aria-hidden="true">{TOPIC_SHORT_LABELS[item]}</span>
          </button>; })}
        </div>
        <button type="button" aria-label={EXPOUND_LABEL} aria-expanded={expanded} disabled={!expanded && !canUse('topic_expound')} onClick={toggleExpound}>
          {expanded && <span className="topic-level-thumb topic-level-thumb-static" aria-hidden="true" />}
          <span>{EXPOUND_LABEL}</span>
        </button>
      </div>
    </div>
    {!online && <p className="meta">{STUDY_OFFLINE}</p>}
    <StudyAnswerArea id={bodyId}>{level === 'original' ? children : renderEntry(current, () => action && run(action, bodyId))}</StudyAnswerArea>
    {expanded && <StudyAnswerArea id={expoundId}><h3>Expound</h3>{renderEntry(expound, () => run('topic_expound', expoundId))}</StudyAnswerArea>}
  </div>;
}
