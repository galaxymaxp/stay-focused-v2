import { describe, expect, it } from 'vitest';
import { sliderGestureIntent, sliderQuestionIndex, sliderQuestionIndexFromPageX, type SliderIntent } from './questionSliderModel';

describe('question slider snapping', () => {
  it.each([10, 30, 100])('maps the track to valid question indices for %i questions', count => {
    expect(sliderQuestionIndex(0, 300, count)).toBe(0);
    expect(sliderQuestionIndex(300, 300, count)).toBe(count - 1);
    expect(sliderQuestionIndex(150, 300, count)).toBe(Math.round((count - 1) / 2));
    expect(sliderQuestionIndex(-40, 300, count)).toBe(0);
    expect(sliderQuestionIndex(500, 300, count)).toBe(count - 1);
  });
  it('uses the same track origin when a 100-question drag starts on the thumb', () => {
    const left = 60, width = 960;
    expect(sliderQuestionIndexFromPageX(196, left, width, 100)).toBe(14);
    expect(sliderQuestionIndexFromPageX(312, left, width, 100)).toBe(26);
    expect(sliderQuestionIndexFromPageX(89, left, width, 100)).toBe(3);
  });
});

describe('slider gesture intent', () => {
  it.each([
    [[0, 0], [5, 1], [14, 4], [28, 7], [45, 10], [70, 8]],
    [[0, 0], [-6, 2], [-18, 5], [-35, 9], [-60, 14]],
    [[0, 0], [10, 2], [20, 6], [35, 3], [50, 9], [70, 5]],
    [[0, 0], [4, 7], [7, 10], [18, 11], [40, 8], [80, 20]],
  ].map(points => [points]))('locks horizontal intent through a realistic movement sequence: %j', points => {
    let intent: SliderIntent = 'pending';
    for (const [dx, dy] of points) {
      intent = sliderGestureIntent(intent, dx, dy);
      expect(intent).not.toBe('vertical');
    }
    expect(intent).toBe('horizontal');
    expect(sliderGestureIntent(intent, 100, -10)).toBe('horizontal');
    expect(sliderGestureIntent(intent, 100, 50)).toBe('horizontal');
  });
  it('leaves dominant vertical scrolling with the parent for the entire touch', () => {
    expect(sliderGestureIntent('pending', 2, 8)).toBe('pending');
    const intent = sliderGestureIntent('pending', 3, 18);
    expect(intent).toBe('vertical');
    expect(sliderGestureIntent(intent, 150, 10)).toBe('vertical');
  });
});
