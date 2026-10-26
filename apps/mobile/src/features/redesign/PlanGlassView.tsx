import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { createPlanGlassLoop, planImpulse, type PlanGlassFrame } from '@stay-focused/shared/plan-glass-renderer';
import { PLAN_PILL_RADIUS } from './planPill';
import { threeContext } from '../generation-core/threeContext';
import { loadGlassAtlas } from './glassAtlas';
import type { OrbInteractionHandle } from '../generation-core/orbInteraction';
import { dayOrbTones } from './dayClock';
import metrics from '../../../assets/clock/plan-atlas.json';

export interface PlanGlassHandle { press(x: number, y?: number): void }
interface Props {
  width: number; mode: 'light' | 'dark'; reducedMotion: boolean; live: boolean; interaction: OrbInteractionHandle;
  handle: MutableRefObject<PlanGlassHandle | null>; onReady: () => void; onFailure: () => void; onLoading: () => void;
}
const SCALE = 0.6;

export function PlanGlassView({ width, mode, reducedMotion, live, interaction, handle, onReady, onFailure, onLoading }: Props) {
  const runtime = useRef<PlanGlassFrame>({ width, height: 52, radius: PLAN_PILL_RADIUS, mode,
    reducedMotion, running: live, palette: () => interaction.state.current, light: dayOrbTones(720).position, glow: 0.9875, impulses: [] });
  runtime.current = { ...runtime.current, width, mode, reducedMotion, running: live, palette: () => interaction.state.current };
  const callbacks = useRef({ onReady, onFailure, onLoading }); callbacks.current = { onReady, onFailure, onLoading };
  const resources = useRef<{ renderer: THREE.WebGLRenderer; atlas: THREE.Texture | null;
    loop: ReturnType<typeof createPlanGlassLoop> | null } | null>(null);
  const generation = useRef(0);
  const dispose = useCallback(() => {
    generation.current++; handle.current = null; interaction.wake.current = null;
    const previous = resources.current; resources.current = null;
    if (previous) {
      // Android may already have destroyed the old context during navigation.
      for (const release of [() => previous.loop?.dispose(), () => previous.atlas?.dispose(), () => previous.renderer.dispose()]) {
        try { release(); } catch { /* Continue releasing the remaining resources. */ }
      }
    }
  }, [handle, interaction]);
  useEffect(() => () => dispose(), [dispose]);
  useEffect(() => { resources.current?.loop?.wake(); }, [width, mode, reducedMotion, live, interaction]);
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
            const now = new Date(), tones = dayOrbTones(now.getHours() * 60 + now.getMinutes());
            return { ...runtime.current, light: tones.position, glow: 0.35 + tones.strength * 0.75 };
          },
            () => callbacks.current.onReady(), fail, () => {
              if (gl.isContextLost?.()) throw new Error('plan_context_unavailable');
              gl.endFrameEXP();
            });
          interaction.wake.current = () => current.loop?.wake();
          handle.current = { press(x, y = 0) {
            runtime.current = { ...runtime.current, impulses: planImpulse(runtime.current.impulses, x, y, Date.now(), runtime.current.reducedMotion) };
            current.loop?.wake();
          } };
          current.loop.wake();
        } catch { fail(); }
      }).catch(fail);
    } catch { fail(); }
  }, [dispose, handle, interaction]);
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
    <GLView onContextCreate={create} style={{ width: width * SCALE, height: 52 * SCALE, transform: [{ scale: 1 / SCALE }] }} />
  </View>;
}
