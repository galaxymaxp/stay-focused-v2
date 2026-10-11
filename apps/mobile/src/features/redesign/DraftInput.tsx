import { useState, type ComponentProps } from "react";
import { TextInput } from "react-native";

/** The page scrolls; draft fields grow and shrink as their wrapped text changes. */
export function DraftInput({ style, minHeight = 96, ...props }: ComponentProps<typeof TextInput> & { minHeight?: number }) {
  const [height, setHeight] = useState(minHeight);
  return (
    <TextInput
      {...props}
      multiline
      scrollEnabled={false}
      onContentSizeChange={(event) => {
        const next = Math.max(minHeight, Math.ceil(event.nativeEvent.contentSize.height) + 16);
        setHeight((old) => old === next ? old : next);
        props.onContentSizeChange?.(event);
      }}
      style={[style, { height, minHeight, textAlignVertical: "top" }]}
    />
  );
}
