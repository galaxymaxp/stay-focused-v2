import type { MaterialPreparation } from '@stay-focused/shared';

export function preparationPresentation(preparation: MaterialPreparation) {
  switch (preparation.status) {
    case 'ready': return { label: 'Ready', message: 'Ready to study.' };
    case 'preparing': return { label: 'Preparing', message: 'Reviewer and Quiz will be available when this material is ready.' };
    case 'failed': return { label: "Couldn't prepare", message: preparation.reasonCode === 'preparation_paused'
      ? 'Preparation paused. Tap Retry to try again.' : 'Tap Retry to try again.' };
    case 'unsupported': return { label: 'Unsupported', message: "This file type isn't supported yet." };
    case 'empty': return { label: 'No study text found', message: 'No study text was found in this item.' };
    case 'unavailable': return { label: 'Unavailable', message: 'This item is unavailable.' };
  }
}
