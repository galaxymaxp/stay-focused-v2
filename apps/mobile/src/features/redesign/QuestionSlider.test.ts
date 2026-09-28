import { describe, expect, it } from 'vitest';
import { sliderQuestionIndex } from './questionSliderModel';

describe('question slider snapping', () => {
  it.each([10, 30, 100])('maps the track to valid question indices for %i questions', count => {
    expect(sliderQuestionIndex(0, 300, count)).toBe(0);
    expect(sliderQuestionIndex(300, 300, count)).toBe(count - 1);
    expect(sliderQuestionIndex(150, 300, count)).toBe(Math.round((count - 1) / 2));
    expect(sliderQuestionIndex(-40, 300, count)).toBe(0);
    expect(sliderQuestionIndex(500, 300, count)).toBe(count - 1);
  });
});
