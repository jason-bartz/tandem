/**
 * Tests for Child Safety Filter
 * Ensures that CSAM/child exploitation content is always blocked
 */

import {
  containsChildExploitationContent,
  getSafeFallbackElement,
  validateElementSafety,
} from '../validation/childSafetyFilter';

describe('containsChildExploitationContent', () => {
  describe('should BLOCK unsafe content', () => {
    it('blocks direct CSAM terms', () => {
      expect(containsChildExploitationContent('csam')).toBe(true);
      expect(containsChildExploitationContent('pedo')).toBe(true);
      expect(containsChildExploitationContent('pedophile')).toBe(true);
      expect(containsChildExploitationContent('lolicon')).toBe(true);
      expect(containsChildExploitationContent('jailbait')).toBe(true);
    });

    it('blocks child + exploitation term combinations', () => {
      expect(containsChildExploitationContent('child porn')).toBe(true);
      expect(containsChildExploitationContent('kidporn')).toBe(true);
      expect(containsChildExploitationContent('nude child')).toBe(true);
      expect(containsChildExploitationContent('sexy teen')).toBe(true);
      expect(containsChildExploitationContent('erotic minor')).toBe(true);
    });

    it('blocks leetspeak variations', () => {
      expect(containsChildExploitationContent('ch1ld p0rn')).toBe(true);
      expect(containsChildExploitationContent('k1d s3x')).toBe(true);
    });

    it('blocks with separators removed', () => {
      expect(containsChildExploitationContent('child_porn')).toBe(true);
      expect(containsChildExploitationContent('child-sex')).toBe(true);
      expect(containsChildExploitationContent('child.abuse')).toBe(true);
    });
  });

  describe('should ALLOW safe content', () => {
    it('allows normal game elements', () => {
      expect(containsChildExploitationContent('Fire')).toBe(false);
      expect(containsChildExploitationContent('Dragon')).toBe(false);
      expect(containsChildExploitationContent('Wizard')).toBe(false);
      expect(containsChildExploitationContent('Internet')).toBe(false);
    });

    it('allows child-related innocent terms', () => {
      expect(containsChildExploitationContent('Childhood')).toBe(false);
      expect(containsChildExploitationContent('Children')).toBe(false);
      expect(containsChildExploitationContent('Kid')).toBe(false);
      expect(containsChildExploitationContent('Baby Yoda')).toBe(false);
      expect(containsChildExploitationContent('Teen Titan')).toBe(false);
    });

    it('allows adult content without child references', () => {
      expect(containsChildExploitationContent('Sexy Beast')).toBe(false);
      expect(containsChildExploitationContent('Adult Entertainment')).toBe(false);
      expect(containsChildExploitationContent('Nudist Beach')).toBe(false);
    });

    it('allows edge cases that should not trigger', () => {
      expect(containsChildExploitationContent('Minecraft')).toBe(false);
      expect(containsChildExploitationContent('Kidnapping')).toBe(false);
      expect(containsChildExploitationContent('Billy the Kid')).toBe(false);
    });
  });

  it('handles null/undefined/empty inputs', () => {
    expect(containsChildExploitationContent(null)).toBe(false);
    expect(containsChildExploitationContent(undefined)).toBe(false);
    expect(containsChildExploitationContent('')).toBe(false);
  });
});

describe('getSafeFallbackElement', () => {
  it('returns an element with name and emoji', () => {
    const fallback = getSafeFallbackElement();
    expect(fallback).toHaveProperty('element');
    expect(fallback).toHaveProperty('emoji');
    expect(typeof fallback.element).toBe('string');
    expect(typeof fallback.emoji).toBe('string');
    expect(fallback.element.length).toBeGreaterThan(0);
    expect(fallback.emoji.length).toBeGreaterThan(0);
  });
});

describe('validateElementSafety', () => {
  it('returns original element when safe', () => {
    const result = validateElementSafety('Dragon', '🐉');
    expect(result.element).toBe('Dragon');
    expect(result.emoji).toBe('🐉');
    expect(result.blocked).toBe(false);
  });

  it('returns fallback when unsafe', () => {
    const result = validateElementSafety('child porn', '👶');
    expect(result.element).not.toBe('child porn');
    expect(result.blocked).toBe(true);
    expect(result.element.length).toBeGreaterThan(0);
  });
});
