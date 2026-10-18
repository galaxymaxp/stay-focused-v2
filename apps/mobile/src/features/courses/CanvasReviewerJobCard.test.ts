import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { job } from '../../testSupport/queueJob';

vi.mock('expo-router/react-navigation', () => ({ useIsFocused: () => true }));
vi.mock('expo-router', () => ({ router: {} }));
vi.mock('react-native', () => ({ Text: 'Text', View: 'View', StyleSheet: { create: (styles: unknown) => styles } }));
vi.mock('lucide-react-native', () => ({}));
vi.mock('../../auth', () => ({}));
vi.mock('../../design/theme', () => ({ useLegacyTheme: () => ({}) }));
vi.mock('../../components/Button', () => ({ Button: 'Button' }));
vi.mock('../../components/Card', () => ({ Card: 'Card' }));
vi.mock('../../components/Screen', () => ({}));
vi.mock('../../components/TextField', () => ({}));
vi.mock('../../config/apiBaseUrl', () => ({}));
vi.mock('../../services/canvasApi', () => ({}));
vi.mock('../../services/processingJobsApi', () => ({}));
vi.mock('../../services/activeProcessingJobStore', () => ({}));
vi.mock('../../services/canvasReviewerRecoveryStore', () => ({}));
vi.mock('../../services/completedArtifactCache', () => ({}));
vi.mock('../../services/reviewerLibraryApi', () => ({}));
vi.mock('../reviewer/ReviewerPreview', () => ({}));
vi.mock('./usePreparationRefresh', () => ({}));
const { CanvasReviewerJobCard } = await import('./CanvasSourceReviewerScreen');
let rendered: ReactTestRenderer | undefined;
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; });
it.each([true, false])('failed Canvas card, retryable=%s, has one appropriate primary action', async retryable => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const onRetry = vi.fn();
  await act(async () => { rendered = create(createElement(CanvasReviewerJobCard, {
    job: job({ status: 'failed', retryable, stage: 'generating_sections', safeErrorMessage: 'Could not finish.' }),
    onRetry, onDismiss: vi.fn(), onCancel: vi.fn(),
  })); });
  const buttons = rendered!.root.findAllByType('Button' as never);
  expect(buttons.some(button => button.props.children === 'Try again')).toBe(retryable);
  expect(buttons.some(button => button.props.children === 'Choose another material')).toBe(!retryable);
  expect(JSON.stringify(rendered!.toJSON())).toContain('Stopped while building topics');
  if (retryable) {
    expect(JSON.stringify(rendered!.toJSON())).toContain('Your material is safe.');
    await act(async () => buttons.find(button => button.props.children === 'Try again')!.props.onPress());
    expect(onRetry).toHaveBeenCalledOnce();
    await act(async () => rendered!.update(createElement(CanvasReviewerJobCard, {
      job: job({ status: 'failed', retryable }), onRetry, onDismiss: vi.fn(), onCancel: vi.fn(), retrying: true,
    })));
    expect(rendered!.root.findAllByType('Button' as never).find(button => button.props.children === 'Retrying…')!.props.disabled).toBe(true);
  }
});
