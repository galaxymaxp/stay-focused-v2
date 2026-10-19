"use client";
import type { LibraryArtifactDetail } from '@stay-focused/shared';
import type { StudyFormat } from '@stay-focused/shared/study-export';
import { useId, useState } from 'react';
import { Notice } from '../components/ui';
import { useAction } from '../lib/hooks';
import { downloadStudyFile, EXPORT_FAILURE, studyFormats } from './study-export';

const labels: Record<StudyFormat, string> = { pdf: 'PDF', docx: 'Word (.docx)', pptx: 'PowerPoint (.pptx)' };

export function StudyExportControl({ detail, disabled = false, unsaved = false }: {
  detail: LibraryArtifactDetail;
  disabled?: boolean;
  unsaved?: boolean;
}) {
  const action = useAction();
  const [formats, setFormats] = useState<readonly StudyFormat[]>([]);
  const [open, setOpen] = useState(false);
  const optionsId = useId(), hintId = useId();
  return <div className="stack">
    <button disabled={disabled || unsaved || action.busy} aria-expanded={open} aria-controls={open ? optionsId : undefined}
      aria-describedby={unsaved ? hintId : undefined} onClick={() => {
        if (open) { setOpen(false); return; }
        void action.run(async () => {
          try { setFormats(await studyFormats(detail)); setOpen(true); }
          catch { throw new Error(EXPORT_FAILURE); }
        });
      }}>{action.busy ? 'Creating file...' : 'Export'}</button>
    {unsaved && <p id={hintId} className="meta">Save your changes first to include them.</p>}
    {open && <div id={optionsId} className="stack" role="group" aria-label="Export format">
      {formats.map(format => <button key={format} disabled={disabled || unsaved || action.busy} onClick={() => void action.run(async () => {
        await downloadStudyFile(detail, format);
        setOpen(false);
      })}>{labels[format]}</button>)}
    </div>}
    {action.message && <Notice>{action.message}</Notice>}
  </div>;
}
