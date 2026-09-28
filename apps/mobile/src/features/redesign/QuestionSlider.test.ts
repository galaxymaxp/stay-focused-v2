import { describe, expect, it } from 'vitest';
import { sliderGestureIntent, sliderQuestionIndex, sliderQuestionIndexFromPageX } from './questionSliderModel';

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
  it.each([-1, 1])('locks slow and fast horizontal movement with drift in direction %i', direction => {
    let intent = sliderGestureIntent('pending', 3, direction * 2);
    expect(intent).toBe('pending');
    intent = sliderGestureIntent(intent, 7, direction * 3);
    expect(intent).toBe('horizontal');
    expect(sliderGestureIntent(intent, 100, direction * 20)).toBe('horizontal');
    expect(sliderGestureIntent(intent, 2, direction * 150)).toBe('horizontal');
    expect(sliderGestureIntent('pending', 120, direction * 16)).toBe('horizontal');
  });
  it('leaves dominant vertical scrolling with the parent for the entire touch', () => {
    const intent = sliderGestureIntent('pending', 2, 8);
    expect(intent).toBe('vertical');
    expect(sliderGestureIntent(intent, 150, 10)).toBe('vertical');
  });
});
