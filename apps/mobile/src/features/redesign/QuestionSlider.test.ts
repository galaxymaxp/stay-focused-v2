import { describe, expect, it } from 'vitest';
import { sliderQuestionIndex, sliderQuestionIndexFromPageX } from './questionSliderModel';

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
