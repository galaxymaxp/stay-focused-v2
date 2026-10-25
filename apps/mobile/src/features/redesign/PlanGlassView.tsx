import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { createPlanGlassLoop, type PlanGlassFrame } from '@stay-focused/shared/plan-glass-renderer';
import { radius } from '../../design/tokens';
import { threeContext } from '../generation-core/threeContext';
import { loadGlassAtlas } from './glassAtlas';
import metrics from '../../../assets/clock/plan-atlas.json';

export interface PlanGlassHandle { press(side: number): void }
interface Props {
  width: number; mode: 'light' | 'dark'; reducedMotion: boolean; live: boolean; accent: string;
  handle: MutableRefObject<PlanGlassHandle | null>; onReady: () => void; onFailure: () => void; onLoading: () => void;
}
const SCALE = 0.6;

export function PlanGlassView({ width, mode, reducedMotion, live, accent, handle, onReady, onFailure, onLoading }: Props) {
  const runtime = useRef<PlanGlassFrame>({ width, height: 52, radius: radius.control, mode,
    reducedMotion, running: live, accent, pressAt: -Infinity, pressSide: 0 });
  runtime.current = { ...runtime.current, width, mode, reducedMotion, running: live, accent };
  const callbacks = useRef({ onReady, onFailure, onLoading }); callbacks.current = { onReady, onFailure, onLoading };
  const resources = useRef<{ renderer: THREE.WebGLRenderer; atlas: THREE.Texture | null;
    loop: ReturnType<typeof createPlanGlassLoop> | null } | null>(null);
  const generation = useRef(0);
  const dispose = useCallback(() => {
    generation.current++; handle.current = null;
    const previous = resources.current; resources.current = null;
    if (previous) {
      // Android may already have destroyed the old context during navigation.
      for (const release of [() => previous.loop?.dispose(), () => previous.atlas?.dispose(), () => previous.renderer.dispose()]) {
        try { release(); } catch { /* Continue releasing the remaining resources. */ }
      }
    }
  }, [handle]);
  useEffect(() => () => dispose(), [dispose]);
  useEffect(() => { resources.current?.loop?.wake(); }, [width, mode, reducedMotion, live, accent]);
  const create = useCallback((gl: ExpoWebGLRenderingContext) => {
    if (resources.current) callbacks.current.onLoading();
    dispose();
    const serial = generation.current;
    const fail = () => { if (generation.current === serial) { dispose(); callbacks.current.onFailure(); } };
    try {
      const canvas = { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight,
        clientHeight: gl.drawingBufferHeight, style: {}, addEventListener() {}, removeEventListener() {} } as unknown as HTMLCanvasElement;
      const renderer = new THREE.WebGLRenderer({ canvas, context: threeContext(gl), alpha: true, antialias: true });
      renderer.setPixelRatio(1); renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      const current = { renderer, atlas: null as THREE.Texture | null,
        loop: null as ReturnType<typeof createPlanGlassLoop> | null };
      resources.current = current;
      void loadGlassAtlas(require('../../../assets/clock/plan-atlas.png'), metrics).then(atlas => {
        if (generation.current !== serial) { atlas.dispose(); return; }
        current.atlas = atlas;
        try {
          let bufferWidth = gl.drawingBufferWidth, bufferHeight = gl.drawingBufferHeight;
          current.loop = createPlanGlassLoop(renderer, atlas, metrics, () => {
            if (bufferWidth !== gl.drawingBufferWidth || bufferHeight !== gl.drawingBufferHeight) {
              bufferWidth = gl.drawingBufferWidth; bufferHeight = gl.drawingBufferHeight;
              renderer.setSize(bufferWidth, bufferHeight);
            }
            return runtime.current;
          },
            () => callbacks.current.onReady(), fail, () => {
              if (gl.isContextLost?.()) throw new Error('plan_context_unavailable');
              gl.endFrameEXP();
            });
          handle.current = { press(side) {
            runtime.current = { ...runtime.current, pressAt: Date.now(), pressSide: side };
            current.loop?.wake();
          } };
          current.loop.wake();
        } catch { fail(); }
      }).catch(fail);
    } catch { fail(); }
  }, [dispose, handle]);
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
    <GLView onContextCreate={create} style={{ width: width * SCALE, height: 52 * SCALE, transform: [{ scale: 1 / SCALE }] }} />
  </View>;
}
