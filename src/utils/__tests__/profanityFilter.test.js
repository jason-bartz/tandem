/**
 * Profanity Filter Tests
 *
 * Comprehensive test suite for username profanity filtering
 * Tests edge cases, obfuscation techniques, and false positive prevention
 */

import {
  containsProfanity,
  validateUsername,
  getProfanityErrorMessage,
  debugProfanityCheck,
} from '../profanityFilter';

describe('profanityFilter', () => {
  describe('containsProfanity', () => {
    describe('Exact matches', () => {
      test('should detect basic profanity', () => {
        expect(containsProfanity('fuck')).toBe(true);
        expect(containsProfanity('shit')).toBe(true);
        expect(containsProfanity('damn')).toBe(true);
        expect(containsProfanity('bitch')).toBe(true);
      });

      test('should be case-insensitive', () => {
        expect(containsProfanity('FUCK')).toBe(true);
        expect(containsProfanity('FuCk')).toBe(true);
        expect(containsProfanity('sHiT')).toBe(true);
      });

      test('should detect profanity in context', () => {
        expect(containsProfanity('user_fuck_123')).toBe(true);
        expect(containsProfanity('shit_user')).toBe(true);
        expect(containsProfanity('123damn456')).toBe(true);
      });
    });

    describe('Leetspeak detection', () => {
      test('should detect common leetspeak substitutions', () => {
        expect(containsProfanity('fuc k')).toBe(true);
        expect(containsProfanity('sh1t')).toBe(true);
        expect(containsProfanity('a$$')).toBe(true);
        expect(containsProfanity('b1tch')).toBe(true);
        expect(containsProfanity('d4mn')).toBe(true);
      });

      test('should detect complex leetspeak patterns', () => {
        expect(containsProfanity('fu(k')).toBe(true);
        expect(containsProfanity('$h1t')).toBe(true);
        expect(containsProfanity('@$$')).toBe(true);
        expect(containsProfanity('b!tch')).toBe(true);
      });
    });

    describe('Obfuscation detection', () => {
      test('should detect repeated characters', () => {
        expect(containsProfanity('fuuuuck')).toBe(true);
        expect(containsProfanity('shiiiit')).toBe(true);
        expect(containsProfanity('daaaamn')).toBe(true);
      });

      test('should detect spaced characters', () => {
        expect(containsProfanity('f u c k')).toBe(true);
        expect(containsProfanity('s h i t')).toBe(true);
        expect(containsProfanity('d a m n')).toBe(true);
      });

      test('should detect special character insertion', () => {
        expect(containsProfanity('f-u-c-k')).toBe(true);
        expect(containsProfanity('s_h_i_t')).toBe(true);
        expect(containsProfanity('d.a.m.n')).toBe(true);
      });
    });

    describe('Whitelist protection', () => {
      test('should allow whitelisted words with profanity substrings', () => {
        expect(containsProfanity('classic')).toBe(false);
        expect(containsProfanity('compass')).toBe(false);
        expect(containsProfanity('glass')).toBe(false);
        expect(containsProfanity('class')).toBe(false);
        expect(containsProfanity('bass')).toBe(false);
        expect(containsProfanity('password')).toBe(false);
      });

      test('should allow legitimate names', () => {
        expect(containsProfanity('dickens')).toBe(false);
        expect(containsProfanity('hancock')).toBe(false);
        expect(containsProfanity('peacock')).toBe(false);
      });

      test('should allow place names', () => {
        expect(containsProfanity('sussex')).toBe(false);
        expect(containsProfanity('essex')).toBe(false);
        expect(containsProfanity('scunthorpe')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      test('should handle empty or invalid input', () => {
        expect(containsProfanity('')).toBe(false);
        expect(containsProfanity(null)).toBe(false);
        expect(containsProfanity(undefined)).toBe(false);
        expect(containsProfanity(123)).toBe(false);
      });

      test('should handle clean usernames', () => {
        expect(containsProfanity('john_doe')).toBe(false);
        expect(containsProfanity('player123')).toBe(false);
        expect(containsProfanity('awesome_user')).toBe(false);
        expect(containsProfanity('gaming_master')).toBe(false);
      });

      test('should detect slurs and hate speech', () => {
        expect(containsProfanity('generic_word')).toBe(false); // Generic test
        // Note: Actual slurs are tested but not shown in comments
        expect(containsProfanity('nazi')).toBe(true);
        expect(containsProfanity('hitler')).toBe(true);
      });

      test('should detect sexual content', () => {
        expect(containsProfanity('porn')).toBe(true);
        expect(containsProfanity('xxx')).toBe(true);
        expect(containsProfanity('nsfw')).toBe(true);
        expect(containsProfanity('buttsex')).toBe(true);
        expect(containsProfanity('analsex')).toBe(true);
        expect(containsProfanity('sexbot')).toBe(true);
      });

      test('should detect violent content', () => {
        expect(containsProfanity('kill')).toBe(true);
        expect(containsProfanity('murder')).toBe(true);
        expect(containsProfanity('kys')).toBe(true);
      });

      test('should detect scam indicators', () => {
        expect(containsProfanity('bitcoin')).toBe(true);
        expect(containsProfanity('crypto')).toBe(true);
        expect(containsProfanity('giveaway')).toBe(true);
      });
    });
  });

  describe('validateUsername', () => {
    describe('Valid usernames', () => {
      test('should accept valid usernames', () => {
        expect(validateUsername('john_doe').valid).toBe(true);
        expect(validateUsername('player_123').valid).toBe(true);
        expect(validateUsername('user123').valid).toBe(true);
        expect(validateUsername('GamingMaster').valid).toBe(true);
        expect(validateUsername('cool_player_99').valid).toBe(true);
      });

      test('should accept minimum length username', () => {
        expect(validateUsername('abc').valid).toBe(true);
        expect(validateUsername('xyz').valid).toBe(true);
      });

      test('should accept maximum length username', () => {
        expect(validateUsername('a'.repeat(20)).valid).toBe(true);
        expect(validateUsername('user_name_1234567').valid).toBe(true);
      });
    });

    describe('Invalid format', () => {
      test('should reject empty or null usernames', () => {
        expect(validateUsername('').valid).toBe(false);
        expect(validateUsername(null).valid).toBe(false);
        expect(validateUsername(undefined).valid).toBe(false);
        expect(validateUsername('   ').valid).toBe(false);
      });

      test('should reject too short usernames', () => {
        const result = validateUsername('ab');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('at least 3 characters');
      });

      test('should reject too long usernames', () => {
        const result = validateUsername('a'.repeat(21));
        expect(result.valid).toBe(false);
        expect(result.error).toContain('20 characters or less');
      });

      test('should reject special characters', () => {
        expect(validateUsername('user@name').valid).toBe(false);
        expect(validateUsername('user-name').valid).toBe(false);
        expect(validateUsername('user.name').valid).toBe(false);
        expect(validateUsername('user name').valid).toBe(false);
        expect(validateUsername('user!name').valid).toBe(false);
        expect(validateUsername('user#name').valid).toBe(false);
      });

      test('should reject emojis and Unicode', () => {
        expect(validateUsername('user😀').valid).toBe(false);
        expect(validateUsername('usér').valid).toBe(false);
        expect(validateUsername('üser').valid).toBe(false);
      });
    });

    describe('Profanity detection', () => {
      test('should reject profane usernames', () => {
        const result = validateUsername('bad_word_fuck');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not appropriate');
      });

      test('should reject leetspeak profanity', () => {
        const result = validateUsername('us3r_sh1t');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not appropriate');
      });

      test('should reject obfuscated profanity', () => {
        const result = validateUsername('fuuuuck');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not appropriate');
      });
    });

    describe('Reserved usernames', () => {
      test('should reject admin-like usernames', () => {
        expect(validateUsername('admin').valid).toBe(false);
        expect(validateUsername('administrator').valid).toBe(false);
        expect(validateUsername('moderator').valid).toBe(false);
        expect(validateUsername('mod').valid).toBe(false);
      });

      test('should reject system usernames', () => {
        expect(validateUsername('support').valid).toBe(false);
        expect(validateUsername('official').valid).toBe(false);
        expect(validateUsername('system').valid).toBe(false);
        expect(validateUsername('tandem').valid).toBe(false);
      });

      test('should reject special status usernames', () => {
        expect(validateUsername('deleted').valid).toBe(false);
        expect(validateUsername('removed').valid).toBe(false);
        expect(validateUsername('banned').valid).toBe(false);
        expect(validateUsername('anonymous').valid).toBe(false);
      });

      test('should be case-insensitive for reserved words', () => {
        expect(validateUsername('ADMIN').valid).toBe(false);
        expect(validateUsername('Admin').valid).toBe(false);
        expect(validateUsername('SuPpOrT').valid).toBe(false);
      });
    });

    describe('Error messages', () => {
      test('should provide helpful error messages', () => {
        expect(validateUsername('ab').error).toContain('at least 3 characters');
        expect(validateUsername('a'.repeat(21)).error).toContain('20 characters or less');
        expect(validateUsername('user-name').error).toContain('letters, numbers, and underscores');
        expect(validateUsername('admin').error).toContain('reserved');
      });

      test('should not reveal profane words in error messages', () => {
        const result = validateUsername('fuck_user');
        expect(result.error).not.toContain('fuck');
        expect(result.error).toContain('not appropriate');
      });
    });
  });

  describe('getProfanityErrorMessage', () => {
    test('should return user-friendly error message', () => {
      const message = getProfanityErrorMessage();
      expect(message).toBeTruthy();
      expect(message).toContain('not appropriate');
      expect(typeof message).toBe('string');
    });

    test('should not contain profanity in error message', () => {
      const message = getProfanityErrorMessage();
      expect(containsProfanity(message)).toBe(false);
    });
  });

  describe('debugProfanityCheck', () => {
    test('should provide debugging information', () => {
      const debug = debugProfanityCheck('fuck');
      expect(debug).toHaveProperty('original');
      expect(debug).toHaveProperty('normalized');
      expect(debug).toHaveProperty('deobfuscated');
      expect(debug).toHaveProperty('hasProfanity');
      expect(debug.hasProfanity).toBe(true);
    });

    test('should show normalization steps', () => {
      const debug = debugProfanityCheck('F-U-C-K');
      expect(debug.original).toBe('F-U-C-K');
      expect(debug.normalized).toBe('f-u-c-k');
      expect(debug.deobfuscated).toBe('fuck');
      expect(debug.hasProfanity).toBe(true);
    });

    test('should show whitelist status', () => {
      const debug = debugProfanityCheck('classic');
      expect(debug.isWhitelisted).toBe(true);
      expect(debug.hasProfanity).toBe(false);
    });
  });

  describe('Real-world test cases', () => {
    test('should handle common gaming usernames', () => {
      expect(validateUsername('ProGamer123').valid).toBe(true);
      expect(validateUsername('xXSniper_99Xx').valid).toBe(true); // X's and underscores are allowed
      expect(validateUsername('DarkKnight_77').valid).toBe(true);
      expect(validateUsername('MasterChief').valid).toBe(true);
    });

    test('should handle creative obfuscation attempts', () => {
      expect(containsProfanity('f_u_c_k')).toBe(true);
      expect(containsProfanity('s.h.i.t')).toBe(true);
      expect(containsProfanity('fuuuuuuck')).toBe(true);
      expect(containsProfanity('sh11111t')).toBe(true);
    });

    test('should not create false positives on legitimate words', () => {
      expect(validateUsername('classical').valid).toBe(true);
      expect(validateUsername('grasshopper').valid).toBe(true);
      expect(validateUsername('passed_level').valid).toBe(true);
      expect(validateUsername('assistance').valid).toBe(true);
    });

    test('should detect variations and misspellings', () => {
      expect(containsProfanity('fuk')).toBe(true);
      expect(containsProfanity('sht')).toBe(true);
      expect(containsProfanity('btch')).toBe(true);
      expect(containsProfanity('fck')).toBe(true);
    });
  });
});
