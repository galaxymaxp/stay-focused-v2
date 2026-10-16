"use client";
/* Wikimedia images must retain their attribution and never use private image APIs. */
/* eslint-disable @next/next/no-img-element */
import { ASSIST_RESULT_LABELS, gradeAttempt, gradeQuestion, reviewerShareSignIn, isReviewerShareToken,
  type ReviewerShareSnapshot, type SharedQuiz, type QuizResult } from '@stay-focused/shared';
import { StudyText } from './reviewer/study-text';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export const SHARED_AI_ACTIONS = ['Ask', 'Ask about this image', 'Define', 'Explain', 'Summarize', 'Analogy', 'Example', 'Test', 'Generate Quiz', 'Find a visual', 'Regenerate', 'Show a different one'] as const;

/** Pure O2 grading: no attempt endpoint, persistence, model or owner dependency. */
export function scoreSharedQuiz(quiz: SharedQuiz, answers: Readonly<Record<string, readonly string[]>>): QuizResult {
  return gradeAttempt({ id: 'shared', quizId: 'shared', startedAt: '', completedAt: null, status: 'in_progress', currentQuestion: 0,
    skippedQuestionIds: [], revealedQuestionIds: [], assistedQuestionIds: [], updatedAt: '', answers: [],
    feedback: quiz.questions.flatMap(q => {
      const selected = answers[q.id];
      return selected?.length ? [gradeQuestion(q, quiz.keys.find(k => k.id === q.id)!, selected)] : [];
    }) }, quiz.questions, quiz.keys);
}

export function SharedQuizPractice({ quiz, signIn }: { quiz: SharedQuiz; signIn: string }) {
  const [answers, setAnswers] = useState<Record<string, readonly string[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const answer = (id: string, values: readonly string[]) => setAnswers(old => ({ ...old, [id]: values }));
  return <section className="surface stack" aria-label={quiz.title}>
    <h2>{quiz.title}</h2>
    <p className="meta">Practice here. Your answers and score are not saved.</p>
    <form className="stack" onSubmit={event => { event.preventDefault(); setResult(scoreSharedQuiz(quiz, answers)); }}>
      {quiz.questions.map((q, i) => <fieldset key={q.id} disabled={!!result} className="stack">
        <legend>{i + 1}. {q.prompt}</legend>
        <p className="meta">{q.selectionInstruction}</p>
        {q.leftItem && <p>{q.leftItem}</p>}
        {q.matchingPairs?.length ? q.matchingPairs.map(pair => <label key={pair.id}>{pair.leftItem}
          <select aria-label={pair.leftItem} value={(answers[q.id] ?? []).find(value => value.startsWith(`${pair.id}:`))?.slice(pair.id.length + 1) ?? ''}
            onChange={event => answer(q.id, [...(answers[q.id] ?? []).filter(value => !value.startsWith(`${pair.id}:`)), ...(event.target.value ? [`${pair.id}:${event.target.value}`] : [])])}>
            <option value="">Choose a match</option>{q.options.map(o => <option key={o.id} value={o.id}>{o.text}</option>)}
          </select></label>) : q.type === 'identification' ? <label>Answer<input aria-label={`Answer ${i + 1}`} value={answers[q.id]?.[0] ?? ''}
          onChange={event => answer(q.id, event.target.value ? [event.target.value] : [])} /></label> : <>
          {q.options.map(o => <label key={o.id} className="row">
            <input type={q.type === 'multi_select' ? 'checkbox' : 'radio'} name={`question-${i}`} value={o.id} checked={(answers[q.id] ?? []).includes(o.id)}
              onChange={event => answer(q.id, q.type === 'multi_select' ? event.target.checked ? [...(answers[q.id] ?? []), o.id] : (answers[q.id] ?? []).filter(value => value !== o.id)
                : [o.id, ...(q.type === 'modified_true_false' && o.text.trim().toLowerCase() === 'false' ? (answers[q.id] ?? []).filter(value => !q.options.some(o => o.id === value)) : [])])} />{o.text}
          </label>)}
          {q.type === 'modified_true_false' && q.options.some(o => o.text.trim().toLowerCase() === 'false' && answers[q.id]?.includes(o.id)) && <label>Correction, if false<input aria-label={`Correction ${i + 1}`}
            value={(answers[q.id] ?? []).find(value => !q.options.some(o => o.id === value)) ?? ''}
            onChange={event => answer(q.id, [...(answers[q.id] ?? []).filter(value => q.options.some(o => o.id === value)), ...(event.target.value ? [event.target.value] : [])])} /></label>}
        </>}
        {result && <p role="status">{result.questions[i]?.correct ? 'Correct' : result.questions[i]?.skipped ? 'Skipped' : 'Incorrect'} — {result.questions[i]?.explanation}</p>}
      </fieldset>)}
      {!result && <button className="primary">Check score</button>}
    </form>
    {result && <div className="stack" role="status"><h3>{result.percentage}% · {result.earnedPoints} of {result.possiblePoints} points</h3>
      <Link href={signIn} className="button primary">Sign in to save your score</Link>
      <button onClick={() => { setResult(null); setAnswers({}); }}>Try again</button>
    </div>}
  </section>;
}

export function SharedReviewerReader({ snapshot, token }: { snapshot: ReviewerShareSnapshot; token: string }) {
  const signIn = reviewerShareSignIn(token);
  return <main className="stack shared-reviewer">
    <header className="page-heading"><div><p className="kicker">Stay Focused · Shared Reviewer</p><h1>{snapshot.title}</h1>
      <p className="muted">A read-only shared version.</p></div></header>
    <div className="reviewer-layout">
      <nav className="reviewer-toc stack" aria-label="Topics"><h2>Topics</h2>
        <ol className="toc-list">{snapshot.sections.map((s, i) => <li key={i}><a href={`#topic-${i + 1}`}>{s.title}</a></li>)}</ol>
        {snapshot.keyTerms.length > 0 && <details><summary>Key terms</summary><ul>{snapshot.keyTerms.map((term, i) => <li key={i}>{term}</li>)}</ul></details>}
      </nav>
      <article className="reviewer-article">
        {snapshot.sections.map((s, i) => <section key={i} id={`topic-${i + 1}`} className="reviewer-topic">
          <header className="topic-head"><span className="kicker">Topic {i + 1}</span><h2>{s.title}</h2></header>
          <div className="topic-level-row" aria-label="Topic level">
            {['Original', 'Simplify', 'Explain simply', 'Expound'].map(label => <Link key={label} className="button subtle" href={signIn}>{label}</Link>)}
          </div>
          {s.citations.map(label => <p className="meta" key={label}>{label}</p>)}
          {snapshot.visuals.filter(v => v.section === i).map((v, j) => <figure className="surface stack" key={j}>
            <p className="meta">External reference — not from your course material.</p>
            <img src={v.image} alt={v.title} loading="lazy" referrerPolicy="no-referrer" />
            <Link href={signIn} className="button"><span aria-hidden="true">? </span>Ask about this image</Link>
            <figcaption>{v.title} · <a href={v.sourceUrl} target="_blank" rel="noreferrer">{v.credit}</a> · <a href={v.licenseUrl} target="_blank" rel="noreferrer">{v.license}</a></figcaption>
          </figure>)}
          {s.blocks.map((b, j) => <div className="reviewer-block" key={j}>
            <h3>{b.title}</h3><p className="explanation">{b.explanation}</p>
            {b.keyPoints.length > 0 && <div className="key-points"><span className="kicker">Key points</span><ul>{b.keyPoints.map((p, k) => <li key={k}>{p}</li>)}</ul></div>}
            {b.evidence.map((e, k) => <p key={k} className={e.kind === 'code' ? 'code' : undefined}>{e.text}</p>)}
            {snapshot.assists.filter(a => a.section === i && a.block === j).map((a, k) => <details key={k} className="surface stack">
              <summary>{ASSIST_RESULT_LABELS[a.type]}{a.point === undefined ? '' : ` · Key point ${a.point + 1}`}</summary><StudyText text={a.text} />
            </details>)}
          </div>)}
        </section>)}
        {snapshot.quizzes.map((quiz, i) => <SharedQuizPractice key={i} quiz={quiz} signIn={signIn} />)}
        {!snapshot.quizzes.length && <p className="muted">No quiz was included in this shared version.</p>}
        <section className="surface stack" aria-label="Study Assist"><h2>Study Assist</h2><p>Sign in to create your own study content.</p>
          <div className="row wrap">{SHARED_AI_ACTIONS.map(action => <Link className="button" key={action} href={signIn}>{action}</Link>)}</div>
        </section>
      </article>
    </div>
  </main>;
}

export function SharedReviewerPage({ token }: { token: string }) {
  const [snapshot, setSnapshot] = useState<ReviewerShareSnapshot | null>(null), [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isReviewerShareToken(token)) { setState('missing'); return; }
    const abort = new AbortController(); setSnapshot(null); setState('loading');
    void fetch(`/api/shares/${token}`, { method: 'GET', credentials: 'omit', cache: 'no-store', signal: abort.signal }).then(async response => {
      if (response.status === 404) { if (!abort.signal.aborted) setState('missing'); return; }
      if (!response.ok) throw new Error('unavailable');
      const value = await response.json() as ReviewerShareSnapshot;
      if (!abort.signal.aborted) { setSnapshot(value); setState('ready'); }
    }).catch(() => { if (!abort.signal.aborted) setState('error'); });
    return () => abort.abort();
  }, [token, retry]);
  if (state === 'ready' && snapshot) return <SharedReviewerReader snapshot={snapshot} token={token} />;
  return <main className="auth-page"><div className="auth-card stack">
    {state === 'missing' ? <h1>This reviewer is no longer shared</h1> : state === 'error' ? <><h1>Couldn’t load this reviewer</h1><button onClick={() => setRetry(n => n + 1)}>Retry</button></> : <p role="status">Loading shared reviewer…</p>}
  </div></main>;
}
