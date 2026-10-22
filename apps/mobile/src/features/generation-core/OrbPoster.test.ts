import { createElement } from 'react';
import { createOrbInteraction, type OrbTheme, type OrbVariant } from '@stay-focused/shared';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { OrbPoster } from './OrbPoster';

vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Defs: 'Defs', RadialGradient: 'RadialGradient', Stop: 'Stop' }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let rendered: ReactTestRenderer | undefined;
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; });

for (const variant of ['clock', 'standalone'] satisfies OrbVariant[]) {
  for (const mode of ['dark', 'light'] satisfies OrbTheme[]) {
    for (const size of [26, 240]) {
      it(`contains the entire ${variant} spill in its native bitmap at ${size}pt in ${mode}`, async () => {
        const interaction = { state: { current: createOrbInteraction(3) }, wake: { current: null } };
        await act(async () => { rendered = create(createElement(OrbPoster, { variant, mode, size, interaction })); });
        const root = rendered!.root;
        const svg = root.findByProps({ testID: 'orb-poster' });
        const [x, y, width, height] = svg.props.viewBox.split(' ').map(Number) as number[];
        const circles = root.findAllByType('Circle' as never);
        for (const circle of circles) {
          const { cx, cy, r } = circle.props;
          // Android's backing bitmap cannot honor SVG overflow. Every drawn
          // circle must end inside the declared viewport, with a clear border.
          expect(Number(cx) - Number(r)).toBeGreaterThan(x!);
          expect(Number(cy) - Number(r)).toBeGreaterThan(y!);
          expect(Number(cx) + Number(r)).toBeLessThan(x! + width!);
          expect(Number(cy) + Number(r)).toBeLessThan(y! + height!);
        }
        const footprint = root.findByType('View' as never).props.style;
        expect(footprint).toEqual({ width: size, height: size });
        const pixelsPerUnit = svg.props.width / width!;
        expect(pixelsPerUnit * 100).toBeCloseTo(size);
        expect(svg.props.height / height!).toBeCloseTo(pixelsPerUnit);
        expect(svg.props.style.left + (50 - x!) * pixelsPerUnit).toBeCloseTo(size / 2);
        expect(svg.props.style.top + (50 - y!) * pixelsPerUnit).toBeCloseTo(size / 2);
        const stops = root.findAllByType('Stop' as never);
        expect(stops.at(-1)!.props.stopOpacity).toBe(0);
        expect(footprint).not.toHaveProperty('overflow', 'hidden');
      });
    }
  }
}
