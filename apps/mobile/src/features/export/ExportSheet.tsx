import type { LibraryArtifactDetail } from '@stay-focused/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../auth';
import { Action, Copy, Notice, Sheet } from '../../design/primitives';
import { formatsFor, saveStudyFile } from './studyExport';
import type { StudyFormat } from './exportLayout';

const label: Record<StudyFormat, string> = { pdf: 'PDF', docx: 'Word (.docx)', pptx: 'PowerPoint (.pptx)' };
export function ExportSheet({ detail, onClose }: { detail: LibraryArtifactDetail; onClose: () => void }) {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  async function save(format: StudyFormat) {
    if (!session || busy) return;
    setBusy(true); setNote(null);
    try {
      const name = await saveStudyFile(detail, format, session.user.id);
      setNote(name ? `Saved ${name} to the selected folder.` : 'Save cancelled.');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setNote(message.includes("isn't writable") ? 'That folder does not allow saves on this device. Choose Documents or another writable folder.' : 'Could not create the document. Try another folder or format.');
    }
    finally { setBusy(false); }
  }
  return <Sheet title="Export" onClose={onClose}>
    <Copy muted>Choose a format, then select a writable folder such as Documents on your device.</Copy>
    <View style={{ gap: 10 }}>{formatsFor(detail).map(format => <Action key={format} disabled={busy} onPress={() => void save(format)}>{label[format]}</Action>)}</View>
    {note ? <Notice>{note}</Notice> : null}
  </Sheet>;
}
