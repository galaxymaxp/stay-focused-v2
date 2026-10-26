import { GlassPill } from '../../components/GlassPill';

export function PlanButton({ onPress, disabled, blocks = 0, adjusting = false }: {
  onPress: () => void; disabled?: boolean; blocks?: number; adjusting?: boolean;
}) {
  return <GlassPill size="lg" label="Plan" sub={adjusting ? 'Updating…' : `${blocks} blocks ready`}
    accessibilityLabel="Plan your free time" disabled={disabled} onPress={onPress} />;
}
