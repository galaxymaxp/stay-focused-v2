"use client";
import { TOPIC_ACTIONS, TOPIC_LEVELS, TOPIC_LABELS, STUDY_OFFLINE, STUDY_GROUNDING_LABELS, selectTopic, topicLevelAction,
  type ReviewerReaderModel, type TopicAction, type TopicLevel, type TopicResult } from '@stay-focused/shared';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
      <div className="segmented" role="group" aria-label="Topic level">
        {TOPIC_LEVELS.map(item => { const a = topicLevelAction(item); return <button key={item} type="button" aria-pressed={level === item}
          disabled={!!a && !canUse(a)} onClick={() => choose(item)}>{TOPIC_LABELS[item]}</button>; })}
      </div>
      <button type="button" className="subtle" aria-expanded={expanded} disabled={!expanded && !canUse('topic_expound')} onClick={toggleExpound}>Expound</button>
    </div>
    {!online && <p className="meta">{STUDY_OFFLINE}</p>}
    <StudyAnswerArea id={bodyId}>{level === 'original' ? children : renderEntry(current, () => action && run(action, bodyId))}</StudyAnswerArea>
    {expanded && <StudyAnswerArea id={expoundId}><h3>Expound</h3>{renderEntry(expound, () => run('topic_expound', expoundId))}</StudyAnswerArea>}
  </div>;
}
