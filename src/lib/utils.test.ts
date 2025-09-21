import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional');
    });

    it('should handle undefined and null values', () => {
      expect(cn('base', undefined, null, 'valid')).toBe('base valid');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
    });

    it('should handle mixed input types', () => {
      expect(cn('base', { active: true, disabled: false }, ['extra', 'classes'])).toContain('base');
      expect(cn('base', { active: true, disabled: false }, ['extra', 'classes'])).toContain('active');
      expect(cn('base', { active: true, disabled: false }, ['extra', 'classes'])).toContain('extra');
      expect(cn('base', { active: true, disabled: false }, ['extra', 'classes'])).toContain('classes');
      expect(cn('base', { active: true, disabled: false }, ['extra', 'classes'])).not.toContain('disabled');
    });
  });
});