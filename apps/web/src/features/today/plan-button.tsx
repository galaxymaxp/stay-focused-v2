"use client";
import { GlassPill } from '../../components/ui/glass-pill';

export function PlanButton({ onPress, disabled, blocks = 0, adjusting = false, expanded }: {
  onPress: () => void; disabled?: boolean; blocks?: number; adjusting?: boolean; expanded?: boolean;
}) {
  return <GlassPill size="lg" label="Plan" sub={adjusting ? 'Updating…' : `${blocks} blocks ready`}
    ariaLabel="Plan your free time" ariaExpanded={expanded} disabled={disabled} onClick={onPress} />;
}
