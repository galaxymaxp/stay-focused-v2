"use client";
import type { LibraryArtifactSummary, ReviewerReaderModel } from '@stay-focused/shared';
import { useEffect, useId, useRef, useState } from 'react';
import { courseIdentity } from '../../app-model/courseIdentity';
import { Heading, Icon } from '../../components/ui';
import { dateLabel } from '../../lib/api';
import { ShareReviewer, type ShareReviewerTrigger } from './share-reviewer';
import { GlassPill } from '../../components/ui/glass-pill';

export function ReviewerHeader({ artifact, reviewer, onSave, onExport, exportBusy, onQuiz, quizDisabled, quizBusy = false }: {
  artifact: LibraryArtifactSummary;
  reviewer: ReviewerReaderModel;
  onSave: () => void;
  onExport: () => void;
  exportBusy: boolean;
  onQuiz: () => void;
  quizDisabled: boolean;
  quizBusy?: boolean;
}) {
  const course = `/library/course/${encodeURIComponent(artifact.course?.id ?? 'personal')}`;
  return <div className="reviewer-heading">
    <Heading title={artifact.title} crumb={artifact.title}
      parent={{ label: artifact.course ? courseIdentity(artifact.course).title : 'Personal & other', href: course }}
      subtitle={[reviewer.course?.name, dateLabel(reviewer.generatedAt)].filter(Boolean).join(' · ')} back={course}
      action={<div className="row wrap reviewer-heading-actions">
        {!artifact.relatedArtifactIds.some(id => id.startsWith('quiz:')) && <GlassPill size="sm"
          label={quizBusy ? 'Generating quiz' : 'Generate quiz'} busy={quizBusy} disabled={quizDisabled} onClick={onQuiz} />}
        {artifact.id.startsWith('artifact:') ? <ShareReviewer artifactId={artifact.id.slice('artifact:'.length)} reviewer={reviewer}
          renderTrigger={share => <ReviewerActions onExport={onExport} busy={exportBusy} onSave={onSave} share={share} />} /> : <ReviewerActions onExport={onExport} busy={exportBusy} onSave={onSave} />}
      </div>} />
    {reviewer.reviewMinutes || reviewer.sections.length > 1 ? <div className="meta reviewer-meta">
      {reviewer.reviewMinutes ? <span>{`~${reviewer.reviewMinutes} min review`}</span> : null}
      {reviewer.sections.length > 1 ? <span>{`${reviewer.sections.length} topics`}</span> : null}
    </div> : null}
  </div>;
}

/** Uses the existing AccountMenu popover pattern, scoped to this reviewer. */
function ReviewerActions({ onSave, onExport, busy, share }: { onSave: () => void; onExport: () => void; busy: boolean; share?: ShareReviewerTrigger }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const outside = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('touchstart', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('touchstart', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const select = (action: () => void) => { setOpen(false); trigger.current?.focus(); action(); };
  return <div className="reviewer-actions" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} className="icon-button subtle" aria-label="Reviewer actions" aria-haspopup="menu"
      aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen(value => !value)}
      onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); } }}>
      <Icon name="ellipsis" />
    </button>
    {open && <div id={menuId} ref={menu} className="account-popover reviewer-actions-menu" role="menu" aria-label="Reviewer actions"
      onKeyDown={event => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 :
          (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }}>
      {share && <button role="menuitem" disabled={share.disabled} onClick={() => select(share.onClick)}><Icon name="globe" />Share</button>}
      <button role="menuitem" disabled={busy} onClick={() => select(onExport)}><Icon name="download" />{busy ? 'Creating file...' : 'Export PDF'}</button>
      <button role="menuitem" disabled={busy} onClick={() => select(onSave)}><Icon name="download" />Text (.txt)</button>
    </div>}
  </div>;
}
