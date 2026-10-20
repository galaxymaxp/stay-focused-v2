import { useState, type ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import type { CoreState } from "../generation-core/coreModel";
import { Action, Copy, Sheet } from "../../design/primitives";
import { GenerationCore } from "./GenerationCore";

/** The measured child of Page: safe areas, header and tabs are already removed. */
export function GenerationLayout({
  title,
  status,
  compactStatus,
  progress,
  state,
  note,
  notices,
  attention = false,
  actions,
}: {
  title?: string;
  status: ReactNode;
  /** Short equivalent state label; the full status remains in details. */
  compactStatus?: ReactNode;
  progress?: ReactNode;
  state: CoreState;
  note: string;
  notices?: ReactNode;
  attention?: boolean;
  actions?: (close: () => void) => ReactNode;
}) {
  const { fontScale } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const [space, setSpace] = useState({ width: 0, height: 0 });
  const [details, setDetails] = useState(false);
  const [statusHeight, setStatusHeight] = useState(0);
  const [controlsHeight, setControlsHeight] = useState(0);
  // Keep text scaling intact. Short/enlarged layouts move secondary content
  // and the complete action column into the existing accessible scrolling Sheet.
  const compact =
    (height > 0 &&
      (height < 440 || statusHeight + controlsHeight + 152 > height)) ||
    fontScale > 1.3;
  const size = Math.max(0, Math.min(340, space.width, space.height));
  const short = height > 0 && height < 440;
  const close = () => setDetails(false);
  return (
    <View
      testID="generation-viewport"
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      style={{
        flex: 1,
        minHeight: 0,
        paddingVertical: short ? 4 : 8,
        gap: short ? 4 : 8,
      }}
    >
      <View
        accessibilityLiveRegion="polite"
        onLayout={(event) => setStatusHeight(event.nativeEvent.layout.height)}
        style={{ flexShrink: 0, alignItems: "center", gap: 4 }}
      >
        {short && fontScale > 1.3 ? (compactStatus ?? status) : status}
        {progress}
      </View>
      <View
        testID="generation-orb-space"
        onLayout={(event) => {
          const { width, height: nextHeight } = event.nativeEvent.layout;
          setSpace((previous) =>
            previous.width === width && previous.height === nextHeight
              ? previous
              : { width, height: nextHeight },
          );
        }}
        style={{
          flex: 1,
          minHeight: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {size > 0 ? <GenerationCore state={state} size={size} /> : null}
      </View>
      <View
        onLayout={(event) => {
          if (!compact) setControlsHeight(event.nativeEvent.layout.height);
        }}
        style={{
          flexShrink: 0,
          width: "100%",
          maxWidth: 360,
          alignSelf: "center",
          gap: 8,
        }}
      >
        {!compact ? (
          <Copy muted size="bodySmall" style={{ textAlign: "center" }}>
            {attention
              ? "Needs attention. Open details for the full message."
              : note}
          </Copy>
        ) : null}
        {!compact ? actions?.(() => {}) : null}
        <Action secondary pill onPress={() => setDetails(true)}>
          {compact
            ? "Details and actions"
            : attention
              ? "Details and error"
              : "Generation details"}
        </Action>
      </View>
      {details ? (
        <Sheet title="Generation details" onClose={close}>
          {title ? <Copy size="h3">{title}</Copy> : null}
          {status}
          <Copy muted size="bodySmall">
            {note}
          </Copy>
          {notices}
          {compact ? actions?.(close) : null}
        </Sheet>
      ) : null}
    </View>
  );
}
