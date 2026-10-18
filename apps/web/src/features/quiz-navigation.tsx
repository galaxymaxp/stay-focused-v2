"use client";
import { useEffect, useId, useRef, useState } from 'react';
import type { QuizQuestionState } from '@stay-focused/shared';
import { Icon } from '../components/ui';

type NavigationProps = {
  states: readonly QuizQuestionState[];
  disabled: boolean;
  onSelect: (position: number) => void;
};

export function QuestionGrid({ states, disabled, onSelect }: NavigationProps) {
  return <nav className="question-grid" aria-label="Questions">
    {states.map((state, position) => <button key={position} type="button"
      className={`question-dot ${state}`}
      aria-current={state === 'current' ? 'step' : undefined}
      aria-label={`Question ${position + 1}, ${state}`}
      disabled={disabled} onClick={() => onSelect(position)}>
      {position + 1}
    </button>)}
  </nav>;
}

export function QuestionJump({ index, states, disabled, onSelect }: NavigationProps & { index: number }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const modal = dialog.current;
    modal?.showModal();
    modal?.querySelector<HTMLButtonElement>('[aria-current="step"]')?.focus();
    return () => { if (modal?.open) modal.close(); };
  }, [open]);
  function close() {
    // End modal inertness before returning focus to the trigger.
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }
  return <>
    <button ref={trigger} type="button" className="meta quiz-jump-trigger"
      aria-label={`Question ${index + 1} of ${states.length}, show all questions`}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={id}
      aria-disabled={disabled} onClick={() => { if (!disabled) setOpen(true); }}>
      Question {index + 1} of {states.length}<Icon name="chevron-down" />
    </button>
    {open && <dialog ref={dialog} id={id} className="quiz-jump-dialog"
      aria-labelledby={`${id}-title`}
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="stack quiz-jump-content">
        <div className="row between">
          <h2 id={`${id}-title`}>Questions</h2>
          <button type="button" className="subtle" onClick={close}>Done</button>
        </div>
        <p className="meta">Answered · Unanswered · Revealed</p>
        <QuestionGrid states={states} disabled={disabled} onSelect={position => { close(); onSelect(position); }} />
      </div>
    </dialog>}
  </>;
}
