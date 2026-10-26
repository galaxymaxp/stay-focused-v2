import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, BackHandler, PanResponder, ScrollView, View, type GestureResponderEvent, type LayoutRectangle, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { haptic } from "../../design/haptics";
import { moveLibraryItems } from "./libraryOrder";

interface Drop { id: string; after: boolean }
interface Drag {
  id: string;
  originY: number;
  pointerY: number;
  listTop: number;
  scrollStart: number;
  selected: ReadonlySet<string>;
  moved: boolean;
  drop: Drop | null;
}

/** A hold arms dragging; ordinary swipes still belong to scrolling/row actions.
 * Commit only on release, so interruption leaves the saved order intact. */
export function useLibraryOrganizer(scope: string, all: readonly string[], visible: readonly string[], save: (ids: readonly string[]) => void, single = false) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const translate = useRef(new Animated.Value(0)).current;
  const listRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const layouts = useRef(new Map<string, LayoutRectangle>());
  const scrollY = useRef(0);
  const viewport = useRef({ top: 0, height: 0 });
  const touchY = useRef(0);
  const drag = useRef<Drag | null>(null);
  const suppressTap = useRef<string | null>(null);
  const latest = useRef({ all, visible, save });
  latest.current = { all, visible, save };

  const cancel = () => {
    drag.current = null;
    translate.setValue(0);
    setDragging(null);
    setDrop(null);
    if (single) { setEditing(false); setSelected(new Set()); }
  };
  const done = () => { cancel(); setEditing(false); setSelected(new Set()); };
  const callbacks = useRef({ cancel, done });
  callbacks.current = { cancel, done };
  useEffect(() => { callbacks.current.done(); }, [scope]);
  useEffect(() => {
    if (!editing) return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => { callbacks.current.done(); return true; });
    return () => listener.remove();
  }, [editing]);
  useEffect(() => {
    if (dragging && !visible.includes(dragging)) callbacks.current.cancel();
  }, [dragging, visible]);

  const updatePointer = (pageY: number) => {
    const current = drag.current;
    if (!current) return;
    current.pointerY = pageY;
    current.moved ||= Math.abs(pageY - current.originY) > 8;
    const delta = scrollY.current - current.scrollStart;
    translate.setValue(pageY - current.originY + delta);
    if (!current.moved) return;
    const y = pageY - current.listTop + delta;
    let nearest: { id: string; distance: number; after: boolean } | null = null;
    for (const id of latest.current.visible) {
      if (current.selected.has(id)) continue;
      const layout = layouts.current.get(id);
      if (!layout) continue;
      const middle = layout.y + layout.height / 2;
      const distance = Math.abs(y - middle);
      if (!nearest || distance < nearest.distance) nearest = { id, distance, after: y > middle };
    }
    if (nearest) {
      const next = { id: nearest.id, after: nearest.after };
      if (current.drop?.id !== next.id || current.drop.after !== next.after) {
        current.drop = next;
        setDrop(next);
        haptic.select();
      }
    }
  };
  const release = () => {
    const current = drag.current;
    if (current?.moved && current.drop) {
      const { all, visible, save } = latest.current;
      const next = moveLibraryItems(all, visible, current.selected, current.drop.id, current.drop.after);
      if (next.some((id, index) => id !== all[index])) { save(next); haptic.success(); }
    }
    cancel();
  };
  const gestureCallbacks = useRef({ updatePointer, release, cancel });
  gestureCallbacks.current = { updatePointer, release, cancel };
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: () => drag.current !== null,
    onPanResponderMove: event => gestureCallbacks.current.updatePointer(event.nativeEvent.pageY),
    onPanResponderRelease: () => gestureCallbacks.current.release(),
    onPanResponderTerminate: () => gestureCallbacks.current.cancel(),
    onPanResponderTerminationRequest: () => drag.current === null,
    onShouldBlockNativeResponder: () => drag.current !== null,
  }), []);

  useEffect(() => {
    if (!dragging) return;
    // Measure the viewport when a hold arms dragging.
    scrollRef.current?.getNativeScrollRef()?.measureInWindow((_x, y, _width, height) => { viewport.current = { top: y, height }; });
    const timer = setInterval(() => {
      const current = drag.current;
      const { top, height } = viewport.current;
      if (!current || !current.moved || !height) return;
      const step = current.pointerY < top + 64 ? -12 : current.pointerY > top + height - 64 ? 12 : 0;
      if (step) scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current + step), animated: false });
    }, 32);
    return () => clearInterval(timer);
  }, [dragging]);

  const hold = (id: string) => {
    const group = !single && selected.has(id) ? selected : new Set([id]);
    suppressTap.current = id;
    setEditing(true);
    setSelected(group);
    setDragging(id);
    drag.current = { id, originY: touchY.current, pointerY: touchY.current, listTop: 0, scrollStart: scrollY.current, selected: group, moved: false, drop: null };
    listRef.current?.measureInWindow((_x, y) => { if (drag.current?.id === id) drag.current.listTop = y; });
    scrollRef.current?.getNativeScrollRef()?.measureInWindow((_x, y, _width, height) => { viewport.current = { top: y, height }; });
  };
  const tap = (id: string, open: () => void) => {
    if (suppressTap.current === id) { suppressTap.current = null; return; }
    if (!editing) { open(); return; }
    haptic.select();
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
    if (drag.current) updatePointer(drag.current.pointerY);
  };
  const touchStart = (event: GestureResponderEvent) => { suppressTap.current = null; touchY.current = event.nativeEvent.pageY; };
  const selectedIds = all.filter(id => selected.has(id));
  const allSelected = visible.length > 0 && visible.every(id => selected.has(id));
  const toggleAll = () => { haptic.select(); setSelected(allSelected ? new Set() : new Set(visible)); };
  return {
    editing, selected, selectedIds, dragging, drop, translate, scrollRef, listRef, layouts,
    begin: (id?: string) => { setEditing(true); setSelected(new Set(id ? [id] : [])); }, done, hold, tap, allSelected, toggleAll, onScroll,
    panHandlers: responder.panHandlers,
    touchStart,
    touchEnd: () => { if (drag.current) release(); },
    touchCancel: cancel,
  };
}
