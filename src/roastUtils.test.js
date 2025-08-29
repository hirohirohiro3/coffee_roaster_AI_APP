import { describe, it, expect } from 'vitest';
import { formatTime, calculateDTR } from './utils/roastUtils.js';

describe('formatTime', () => {
  it('should correctly format seconds into MM:SS format', () => {
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(59)).toBe('00:59');
  });
});

describe('calculateDTR', () => {
  it('should correctly calculate the Development Time Ratio', () => {
    // Example: 10 minute total time, 8 minute first crack
    expect(calculateDTR('08:00', '10:00')).toBeCloseTo(20.0);
  });
});
