import Anthropic from '@anthropic-ai/sdk';
import logger from '@/lib/logger';

class AIService {
  constructor() {
    this.client = null;
    this.enabled = process.env.AI_GENERATION_ENABLED !== 'false';
    this.model = process.env.AI_MODEL || 'claude-sonnet-4-5-20250929';
    this.maxRetries = 2;
    this.timeout = 30000; // 30 seconds
    this.generationCount = 0; // Track for analytics
  }

  isEnabled() {
    return this.enabled && !!process.env.ANTHROPIC_API_KEY;
  }

  getClient() {
    if (!this.client && this.enabled) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        logger.warn('ANTHROPIC_API_KEY not found - AI generation disabled');
        this.enabled = false;
        return null;
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Generate a puzzle using AI
   * @param {Object} options - Generation options
   * @param {string} options.date - Target date for the puzzle
   * @param {Array} options.pastPuzzles - Recent puzzles for context (last 30-60 days)
   * @param {Array} options.excludeThemes - Themes to avoid
   * @param {string} options.themeHint - Optional theme hint from user
   * @returns {Promise<{theme: string, puzzles: Array<{emoji: string, answer: string, hint: string}>}>}
   */
  async generatePuzzle({ date, pastPuzzles = [], excludeThemes = [], themeHint }) {
    const client = this.getClient();
    if (!client) {
      throw new Error('AI generation is not enabled. Please configure ANTHROPIC_API_KEY.');
    }

    const startTime = Date.now();
    let lastError = null;

    // Retry logic for production reliability
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const prompt = this.buildPrompt({ date, pastPuzzles, excludeThemes, themeHint });
        const genInfo = {
          date,
          model: this.model,
          attempt: attempt + 1,
          maxAttempts: this.maxRetries + 1,
          hasThemeHint: !!themeHint,
        };

        logger.info('Generating puzzle with AI', genInfo);

        const message = await client.messages.create({
          model: this.model,
          max_tokens: 1024,
          temperature: 1.0, // Higher temperature for more creative variety
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = message.content[0].text;
        const duration = Date.now() - startTime;

        const responseInfo = {
          length: responseText.length,
          duration,
          attempt: attempt + 1,
        };

        logger.info('AI response received', responseInfo);

        const puzzle = this.parseResponse(responseText);
        this.validatePuzzle(puzzle);

        this.generationCount++;
        const successInfo = {
          date,
          theme: puzzle.theme,
          duration,
          totalGenerations: this.generationCount,
        };

        logger.info('Puzzle generated successfully', successInfo);

        return puzzle;
      } catch (error) {
        lastError = error;

        // Enhanced error logging
        logger.error('AI generation attempt failed', {
          attempt: attempt + 1,
          errorMessage: error.message,
          errorType: error.constructor.name,
          errorStatus: error.status,
          errorCode: error.error?.type,
          willRetry: attempt < this.maxRetries,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        });

        if (error.status === 429) {
          const retryAfter = error.error?.retry_after || Math.pow(2, attempt + 1);
          logger.warn('Rate limit hit, will retry after delay', {
            retryAfter,
            attempt: attempt + 1,
          });

          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
            continue;
          } else {
            // Add rate limit context to error
            error.message = `rate_limit: ${error.message}`;
            throw error;
          }
        }

        // Don't retry on authentication errors
        if (
          error.status === 401 ||
          error.message.includes('authentication') ||
          error.message.includes('API key')
        ) {
          logger.error('Authentication error - not retrying', { error: error.message });
          throw error;
        }

        // Service overloaded - retry with longer backoff
        if (error.status === 529) {
          logger.warn('Service overloaded, will retry with longer delay', { attempt: attempt + 1 });
          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt + 2) * 1000));
            continue;
          }
        }

        // Don't retry on validation errors (puzzle format issues) - but try once more with fresh generation
        if (error.message.includes('Invalid') || error.message.includes('must be')) {
          if (attempt < this.maxRetries) {
            logger.warn('Validation error, retrying with fresh generation', {
              error: error.message,
            });
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
        }

        if (attempt === this.maxRetries) {
          break;
        }

        // Brief delay before retry (exponential backoff)
        const backoffMs = Math.pow(2, attempt) * 1000;
        logger.info('Waiting before retry', { backoffMs, attempt: attempt + 1 });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    // All retries failed
    logger.error('AI puzzle generation failed after all retries', {
      attempts: this.maxRetries + 1,
      error: lastError,
    });
    throw new Error(
      `AI generation failed after ${this.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Generate hints for existing puzzle answers
   * @param {Object} options - Generation options
   * @param {string} options.theme - The puzzle theme
   * @param {Array} options.puzzles - Array of {emoji, answer} pairs
   * @returns {Promise<Array<string>>} - Array of hints
   */
  async generateHints({ theme, puzzles }) {
    const client = this.getClient();
    if (!client) {
      throw new Error('AI generation is not enabled. Please configure ANTHROPIC_API_KEY.');
    }

    const startTime = Date.now();
    let lastError = null;

    // Retry logic for production reliability
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const prompt = this.buildHintsPrompt({ theme, puzzles });
        const genInfo = {
          theme,
          model: this.model,
          attempt: attempt + 1,
          maxAttempts: this.maxRetries + 1,
        };

        logger.info('Generating hints with AI', genInfo);

        const message = await client.messages.create({
          model: this.model,
          max_tokens: 512,
          temperature: 1.0, // Higher temperature for creative variety
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = message.content[0].text;
        const duration = Date.now() - startTime;

        const responseInfo = {
          length: responseText.length,
          duration,
          attempt: attempt + 1,
        };

        logger.info('AI hints response received', responseInfo);

        const hints = this.parseHintsResponse(responseText, puzzles.length);

        this.generationCount++;
        const successInfo = {
          theme,
          hintsCount: hints.length,
          duration,
          totalGenerations: this.generationCount,
        };

        logger.info('Hints generated successfully', successInfo);

        return hints;
      } catch (error) {
        lastError = error;

        // Enhanced error logging
        logger.error('AI hints generation attempt failed', {
          attempt: attempt + 1,
          errorMessage: error.message,
          errorType: error.constructor.name,
          errorStatus: error.status,
          errorCode: error.error?.type,
          willRetry: attempt < this.maxRetries,
        });

        if (error.status === 429) {
          const retryAfter = error.error?.retry_after || Math.pow(2, attempt + 1);
          logger.warn('Rate limit hit, will retry after delay', {
            retryAfter,
            attempt: attempt + 1,
          });

          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
            continue;
          } else {
            error.message = `rate_limit: ${error.message}`;
            throw error;
          }
        }

        // Don't retry on authentication errors
        if (
          error.status === 401 ||
          error.message.includes('authentication') ||
          error.message.includes('API key')
        ) {
          logger.error('Authentication error - not retrying', { error: error.message });
          throw error;
        }

        // Service overloaded - retry with longer backoff
        if (error.status === 529) {
          logger.warn('Service overloaded, will retry with longer delay', { attempt: attempt + 1 });
          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt + 2) * 1000));
            continue;
          }
        }

        if (attempt === this.maxRetries) {
          break;
        }

        // Brief delay before retry (exponential backoff)
        const backoffMs = Math.pow(2, attempt) * 1000;
        logger.info('Waiting before retry', { backoffMs, attempt: attempt + 1 });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    // All retries failed
    logger.error('AI hints generation failed after all retries', {
      attempts: this.maxRetries + 1,
      error: lastError,
    });
    throw new Error(
      `AI hints generation failed after ${this.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Build the prompt for AI puzzle generation
   */
  buildPrompt({ date, pastPuzzles, excludeThemes, themeHint }) {
    const recentThemes = pastPuzzles
      .slice(0, 30)
      .map((p) => p.theme)
      .filter(Boolean);
    const allExcludedThemes = [...new Set([...recentThemes, ...excludeThemes])];

    const excludedThemesList =
      allExcludedThemes.length > 0
        ? `\nRecent/excluded themes to avoid:\n${allExcludedThemes.map((t) => `- ${t}`).join('\n')}`
        : '';

    const themeInstructions = themeHint
      ? `USER REQUESTED THEME: "${themeHint}"
Generate 4 emoji-word pairs that fit this theme. IMPORTANT: You must refine and polish the theme text to match our standard formatting style before outputting it. Focus on creating excellent, guessable emoji pairs that match this theme.`
      : `You are creating a daily emoji puzzle game. Generate ONE puzzle with a creative theme and 4 emoji-word pairs.`;

    const themeRequirements = themeHint
      ? `
THEME PROVIDED BY USER: "${themeHint}"
CRITICAL THEME REFINEMENT REQUIREMENTS:
- Use "${themeHint}" as your INSPIRATION and guide
- You MUST refine and format the theme to match our standard patterns:
  * Use Title Case for all words (e.g., "Christmas Activities", not "christmas activities")
  * Add descriptive context if the hint is too simple (e.g., "christmas" → "Christmas Activities" or "Classic Christmas Movies")
  * Ensure proper grammar and article usage (e.g., "Things That Go Bump in the Night" not "things that go bump in the night")
  * Match our established theme patterns (see examples below)
- Stay true to the user's concept but present it professionally
- Focus on finding 4 excellent answers that fit this refined theme perfectly`
      : `
THEME REQUIREMENTS:
- Create a DIVERSE, CREATIVE theme that connects 4 words in an interesting way
- Vary your approach! Use different theme patterns:
  * Direct categories: "Board Games", "Pizza Toppings", "Dog Breeds", "Planets"
  * Descriptive phrases: "Things That Charge", "Things That Can Be Broken", "Words Before 'Stick'"
  * "Forms/Types of ___": "Forms of Capital", "Types of Layers", "Kinds of Energy"
  * Word relationships: "Synonyms for Fast", "Words That Follow 'Green'", "Palindromes"
  * Conceptual links: "Famous Pairs", "Things That Come in Dozens", "Red Things"
  * Activities/Actions: "Winter Sports", "Kitchen Verbs", "Dance Moves"
  * Places/Locations: "US State Capitals", "Famous Streets", "Ocean Names"
  * Pop culture: "Disney Characters", "Superhero Aliases", "Beatles Songs"
- CRITICAL: Do NOT default to "Forms of" or "Things That" patterns - mix it up!`;

    return `${themeInstructions}
${themeRequirements}

GOOD EXAMPLES (notice how emoji pairs work TOGETHER to be guessable):
- "Board Games" → MONOPOLY (🏠💰), LIFE (🚙👶), CHECKERS (⬛️🟥), SCRABBLE (🔤📖)
- "Things That Charge" → BATTERY (🔋⚡), CAVALRY (🐎⚔️), BULL (🐂🚩), LAWYER (⚖️💵)
- "Forms of Capital" → VENTURE (🏢💰), LETTER (✉️📝), PUNISHMENT (⚖️💀), CITY (🏛️🇩🇪)
- "Retro Videogame Franchises" → MARIO (🍄🪠), SONIC (🦔💍), TETRIS (🧱🏗️), PACMAN (👻💊)

BAD EXAMPLES (emojis are not cohesive or guessable):
- ❌ "Pizza Toppings" → PEPPERONI (🍕🥓) - uses pizza emoji in the answer
- ❌ "Dog Breeds" → BEAGLE (🐕👂) - just uses generic dog emoji

CRITICAL EMOJI RULES:
- NEVER use the theme itself as an emoji (e.g., don't use 🍕 for pizza toppings)
- NEVER use generic category emojis (e.g., don't use 🐕 for different dog breeds)
- The two emojis must combine to create a specific, guessable clue
- Each emoji must be unique across the entire puzzle - no repetition
- Aim for New York Times Connections difficulty: should require thought but feel satisfying when discovered

VOCABULARY REQUIREMENTS (CRITICAL):
- Use everyday vocabulary at Wordle difficulty level - recognizable but not necessarily easy
- NEVER use technical terms, foreign language words, specialized jargon, or niche vocabulary
- Explicitly BANNED: musical terms (legato, crescendo, ritornello), scientific jargon, legal terminology, medical terms, academic language
- Words should be used in mainstream contexts (news, conversations, popular media)
- Difficulty comes from clever themes and emoji connections, NOT from obscure vocabulary

EMOJI PAIR REQUIREMENTS:
- Use exactly 2 emojis per word
- CRITICAL: Each emoji must be unique across the entire puzzle - do NOT reuse any emoji in multiple answers
- Emoji pairs MUST provide intuitive visual or phonetic clues to the answer
- Test: Could someone reasonably deduce the answer from the two emojis?
- Avoid abstract concepts that can't be represented visually
- Avoid using the same emoji twice in one pair
- BAD example: 🎺📈 for CRESCENDO (too abstract, relies on knowing musical term)
- BAD example: 🦋👄 for LEGATO (makes no sense, no visual connection)
- GOOD example: ☀️🔥 for HOT (clear visual connection)
- GOOD example: 💰💼 for BUSINESS (clear contextual association)
- Consider using emojis that represent:
  * Direct visual representation of the word
  * Phonetic hints (rebus-style) that are clear
  * Contextual associations that most people would recognize
  * Related concepts that obviously combine to suggest the answer

DIFFICULTY BALANCE:
Within each puzzle, include:
- 1 easier pair: Most players should get this quickly (~70% success rate)
- 2 medium pairs: Requires some thinking but achievable (~40-60% success rate)
- 1 harder pair: The challenge answer, less obvious connection to theme (~20-30% success rate)
- Remember: Even the "hard" answer should be a word people know, just harder to connect to the theme

VARIETY REQUIREMENTS:
- Don't repeat words across different meaning contexts (e.g., avoid CAPITAL if theme is "Forms of Capital")
- Vary emoji categories (don't use all food emojis, all animal emojis, etc.)
- Ensure each answer feels distinct within its theme
${excludedThemesList}

HINT REQUIREMENTS:
Each puzzle MUST include a concise, crossword-style hint (3-8 words ideal, max 60 characters):
- CRITICAL: Hints should focus on the ANSWER WORD ITSELF, not its relationship to the theme
- Only reference the theme if it's essential to understanding what the answer IS (e.g., "Board game" context for MONOPOLY)
- Avoid revealing the theme connection - if the word stands alone, hint at the word, not the theme pattern
- Don't use the answer word in the hint
- Make hints progressively harder (easy hint for easy answer, harder hint for harder answer)
- Embrace NYT crossword style: wordplay, puns, cultural references, and clever indirect clues
- Add personality and character where appropriate
- Examples of excellent hints:
  * HOUR → "60 minutes" (simple, direct, doesn't reference "rush hour")
  * FIGHTING → "FINISH HIM!" (pop culture reference with character)
  * MONOPOLY → "Park Place and Boardwalk locale" (clever, indirect)
  * STOVE → "Where things get heated in the kitchen" (wordplay)
  * FRIDGE → "Cool place for leftovers" (pun on "cool")
  * TOASTER → "Pop-up breakfast helper" (playful description)

RESPONSE FORMAT (JSON only, no explanation):
{
  "theme": "Your creative theme here",
  "puzzles": [
    {"emoji": "🍳🔥", "answer": "STOVE", "hint": "Kitchen cooking surface"},
    {"emoji": "❄️📦", "answer": "FRIDGE", "hint": "Cold food storage"},
    {"emoji": "🍞🔥", "answer": "TOASTER", "hint": "Bread browning device"},
    {"emoji": "☕⚡", "answer": "COFFEE", "hint": "Morning brew machine"}
  ]
}

Generate a puzzle for ${date}. Be creative and ensure variety!`;
  }

  /**
   * Build the prompt for AI hints generation
   */
  buildHintsPrompt({ theme, puzzles }) {
    const puzzlesList = puzzles.map((p, i) => `${i + 1}. ${p.emoji} → ${p.answer}`).join('\n');

    return `You are generating crossword-style hints for an emoji puzzle game.

THEME: "${theme}"

PUZZLE ANSWERS:
${puzzlesList}

HINT REQUIREMENTS:
Each hint MUST be concise, crossword-style (3-8 words ideal, max 60 characters):
- CRITICAL: Hints should focus on the ANSWER WORD ITSELF, not its relationship to the theme
- Only reference the theme if it's essential to understanding what the answer IS (e.g., "Board game" context for MONOPOLY)
- Avoid revealing the theme connection - if the word stands alone, hint at the word, not the theme pattern
- Don't use the answer word in the hint
- Make hints progressively harder (easy hint for easy answer, harder hint for harder answer)
- Embrace NYT crossword style: wordplay, puns, cultural references, and clever indirect clues
- Add personality and character where appropriate

EXAMPLES OF EXCELLENT HINTS:
- HOUR → "60 minutes" (simple, direct, doesn't reference "rush hour")
- FIGHTING → "FINISH HIM!" (pop culture reference with character)
- MONOPOLY → "Park Place and Boardwalk locale" (clever, indirect)
- STOVE → "Where things get heated in the kitchen" (wordplay)
- FRIDGE → "Cool place for leftovers" (pun on "cool")
- TOASTER → "Pop-up breakfast helper" (playful description)

RESPONSE FORMAT (JSON array only, no explanation):
["hint for puzzle 1", "hint for puzzle 2", "hint for puzzle 3", "hint for puzzle 4"]

Generate creative, clever hints for each answer above.`;
  }

  /**
   * Parse AI hints response into array format
   */
  parseHintsResponse(responseText, expectedCount) {
    try {
      // Try to extract JSON array from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const hints = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(hints)) {
        throw new Error('Response is not an array');
      }

      if (hints.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} hints, got ${hints.length}`);
      }

      // Validate each hint
      hints.forEach((hint, index) => {
        if (typeof hint !== 'string' || hint.trim().length === 0) {
          throw new Error(`Hint ${index + 1} is empty or invalid`);
        }
        if (hint.length > 60) {
          throw new Error(`Hint ${index + 1} is too long (max 60 characters): "${hint}"`);
        }
      });

      return hints.map((h) => h.trim());
    } catch (error) {
      logger.error('Failed to parse AI hints response', { error, responseText });
      throw new Error('Failed to parse AI hints response. Please try again.');
    }
  }

  /**
   * Parse AI response into puzzle format
   */
  parseResponse(responseText) {
    try {
      // Try to extract JSON from the response (in case AI adds explanation)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const puzzle = JSON.parse(jsonMatch[0]);

      // Normalize the structure
      return {
        theme: puzzle.theme?.trim() || '',
        puzzles: (puzzle.puzzles || []).map((p) => ({
          emoji: p.emoji?.trim() || '',
          answer: p.answer?.trim().toUpperCase() || '',
          hint: p.hint?.trim() || '', // Include hint in parsed puzzle
        })),
      };
    } catch (error) {
      logger.error('Failed to parse AI response', { error, responseText });
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }

  /**
   * Validate the generated puzzle
   */
  validatePuzzle(puzzle) {
    if (!puzzle.theme || puzzle.theme.length < 5) {
      throw new Error('Invalid theme generated');
    }

    if (!Array.isArray(puzzle.puzzles) || puzzle.puzzles.length !== 4) {
      throw new Error('Must have exactly 4 puzzle pairs');
    }

    const allEmojisUsed = new Set();

    puzzle.puzzles.forEach((p, index) => {
      if (!p.emoji || !p.answer) {
        throw new Error(`Puzzle pair ${index + 1} is incomplete`);
      }

      // Validate hint if present (not required for backward compatibility)
      if (p.hint) {
        if (p.hint.length > 60) {
          throw new Error(`Hint ${index + 1} is too long (max 60 characters)`);
        }

        if (p.hint.toLowerCase().includes(p.answer.toLowerCase())) {
          throw new Error(`Hint ${index + 1} contains the answer`);
        }
      }

      // Count emoji characters using a comprehensive regex that handles:
      // - Standard emojis (1F300-1F9FF)
      // - Supplementary emojis (various ranges)
      // - Variation selectors (FE0F)
      // - ZWJ sequences
      // - Keycap sequences
      const emojiRegex =
        /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Regional_Indicator}{2}|[\u{1F1E6}-\u{1F1FF}]{2})/gu;
      const emojis = p.emoji.match(emojiRegex) || [];
      const emojiCount = emojis.length;

      if (emojiCount < 2) {
        throw new Error(
          `Puzzle pair ${index + 1} needs exactly 2 emojis, got ${emojiCount}: ${p.emoji} (matched: ${emojis.join(', ')})`
        );
      }

      // Check for emoji repetition across answers
      emojis.forEach((emoji) => {
        if (allEmojisUsed.has(emoji)) {
          throw new Error(
            `Emoji "${emoji}" is used in multiple answers. Each emoji must be unique across the puzzle.`
          );
        }
        allEmojisUsed.add(emoji);
      });

      if (p.answer.length < 2 || p.answer.length > 30) {
        throw new Error(`Answer "${p.answer}" must be 2-30 characters`);
      }

      if (!/^[A-Z\s,]+$/.test(p.answer)) {
        throw new Error(
          `Answer "${p.answer}" must contain only uppercase letters, spaces, and commas`
        );
      }
    });

    return true;
  }

  /**
   * Assess the difficulty of a puzzle
   * @param {Object} puzzle - The puzzle to assess {theme, puzzles: [{emoji, answer, hint}]}
   * @returns {Promise<{rating: string, factors: Object}>}
   */
  async assessDifficulty({ theme, puzzles }) {
    const client = this.getClient();
    if (!client) {
      throw new Error('AI generation is not enabled. Please configure ANTHROPIC_API_KEY.');
    }

    const startTime = Date.now();
    let lastError = null;

    // Retry logic for production reliability
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const prompt = this.buildDifficultyPrompt({ theme, puzzles });
        const assessInfo = {
          theme,
          model: this.model,
          attempt: attempt + 1,
          maxAttempts: this.maxRetries + 1,
        };

        logger.info('Assessing puzzle difficulty with AI', assessInfo);

        const message = await client.messages.create({
          model: this.model,
          max_tokens: 512,
          temperature: 0.3, // Lower temperature for consistent analysis
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = message.content[0].text;
        const duration = Date.now() - startTime;

        const responseInfo = {
          length: responseText.length,
          duration,
          attempt: attempt + 1,
        };

        logger.info('AI difficulty assessment received', responseInfo);

        const assessment = this.parseDifficultyResponse(responseText);

        const successInfo = {
          theme,
          rating: assessment.rating,
          duration,
        };

        logger.info('Difficulty assessed successfully', successInfo);

        return assessment;
      } catch (error) {
        lastError = error;

        // Enhanced error logging
        logger.error('AI difficulty assessment attempt failed', {
          attempt: attempt + 1,
          errorMessage: error.message,
          errorType: error.constructor.name,
          errorStatus: error.status,
          errorCode: error.error?.type,
          willRetry: attempt < this.maxRetries,
        });

        if (error.status === 429) {
          const retryAfter = error.error?.retry_after || Math.pow(2, attempt + 1);
          logger.warn('Rate limit hit, will retry after delay', {
            retryAfter,
            attempt: attempt + 1,
          });

          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
            continue;
          } else {
            error.message = `rate_limit: ${error.message}`;
            throw error;
          }
        }

        // Don't retry on authentication errors
        if (
          error.status === 401 ||
          error.message.includes('authentication') ||
          error.message.includes('API key')
        ) {
          logger.error('Authentication error - not retrying', { error: error.message });
          throw error;
        }

        if (attempt === this.maxRetries) {
          break;
        }

        // Brief delay before retry
        const backoffMs = Math.pow(2, attempt) * 1000;
        logger.info('Waiting before retry', { backoffMs, attempt: attempt + 1 });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    // All retries failed
    logger.error('AI difficulty assessment failed after all retries', {
      attempts: this.maxRetries + 1,
      error: lastError,
    });
    throw new Error(
      `AI difficulty assessment failed after ${this.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Build the prompt for AI difficulty assessment
   */
  buildDifficultyPrompt({ theme, puzzles }) {
    const puzzlesList = puzzles
      .map((p, i) => `${i + 1}. ${p.emoji} → ${p.answer}${p.hint ? ` (hint: "${p.hint}")` : ''}`)
      .join('\n');

    return `You are analyzing the difficulty of a word puzzle game.

PUZZLE TO ASSESS:

THEME: "${theme}"

PUZZLES:
${puzzlesList}

DIFFICULTY ASSESSMENT CRITERIA:

1. **Theme Complexity** (1-5 scale):
   - 1: Direct, concrete categories (e.g., "Kitchen Appliances", "Dog Breeds")
   - 2: Slightly abstract but clear (e.g., "Things That Charge", "Red Things")
   - 3: Requires lateral thinking (e.g., "Words Before 'Stick'", "Forms of Capital")
   - 4: Abstract connections (e.g., "Things That Can Be Broken", "Famous Pairs")
   - 5: Highly conceptual or obscure (e.g., "Palindromes", "Homophones of Greek Letters")

2. **Vocabulary Level** (1-5 scale):
   - 1: Common everyday words everyone knows (e.g., SUN, CAR, HOUSE)
   - 2: Familiar words used regularly (e.g., PEPPER, COFFEE, DESERT)
   - 3: Standard vocabulary, some thought required (e.g., MONOPOLY, CAVALRY, VENTURE)
   - 4: Less common but recognizable words (e.g., LEGATO, FORTNIGHT, ARCHIPELAGO)
   - 5: Specialized or uncommon vocabulary (e.g., RITORNELLO, PENULTIMATE, ESCUTCHEON)

3. **Emoji Clarity** (1-5 scale):
   - 1: Emojis directly represent the answer (e.g., ☀️🔥 = SUN)
   - 2: Visual representation with one step (e.g., 🏠💰 = MONOPOLY)
   - 3: Requires combining concepts (e.g., 🔋⚡ = BATTERY, ⚖️💀 = CAPITAL)
   - 4: Abstract or indirect representation (e.g., 🏛️🇩🇪 = CAPITAL as in city)
   - 5: Very abstract or multiple logical leaps needed

4. **Hint Directness** (1-5 scale, if hints provided):
   - 1: Explicit definition (e.g., "60 minutes" for HOUR)
   - 2: Clear contextual clue (e.g., "Kitchen cooking surface" for STOVE)
   - 3: Requires interpretation (e.g., "Cool place for leftovers" for FRIDGE)
   - 4: Wordplay or cultural reference (e.g., "FINISH HIM!" for FIGHTING)
   - 5: Very indirect or cryptic crossword-style clue

OVERALL DIFFICULTY SCALE:
- **Easy**: Most players will solve quickly, clear connections (avg 1.5-2.5 across factors)
- **Medium-Easy**: Some thinking required, accessible vocabulary (avg 2.5-3.0)
- **Medium**: Balanced challenge, creative thinking needed (avg 3.0-3.5)
- **Medium-Hard**: Clever connections, less obvious (avg 3.5-4.0)
- **Hard**: Challenging vocabulary or abstract themes (avg 4.0-5.0)

RESPONSE FORMAT (JSON only, no explanation):
{
  "rating": "Easy|Medium-Easy|Medium|Medium-Hard|Hard",
  "factors": {
    "themeComplexity": number (1-5),
    "vocabularyLevel": number (1-5),
    "emojiClarity": number (1-5),
    "hintDirectness": number (1-5, or null if no hints)
  },
  "reasoning": "Brief 1-2 sentence explanation of the rating"
}

Analyze the puzzle above and provide your assessment.`;
  }

  /**
   * Parse AI difficulty assessment response
   */
  parseDifficultyResponse(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const assessment = JSON.parse(jsonMatch[0]);

      // Validate response
      const validRatings = ['Easy', 'Medium-Easy', 'Medium', 'Medium-Hard', 'Hard'];
      if (!validRatings.includes(assessment.rating)) {
        throw new Error(`Invalid rating: ${assessment.rating}`);
      }

      if (!assessment.factors || typeof assessment.factors !== 'object') {
        throw new Error('Missing or invalid factors');
      }

      return {
        rating: assessment.rating,
        factors: assessment.factors,
        reasoning: assessment.reasoning || '',
      };
    } catch (error) {
      logger.error('Failed to parse AI difficulty assessment response', { error, responseText });
      throw new Error('Failed to parse AI difficulty assessment. Please try again.');
    }
  }

  /**
   * Generate a cryptic crossword-style puzzle
   * @param {Object} options - Generation options
   * @param {string} options.difficulty - Difficulty level (2-4)
   * @param {Array<string>} options.crypticDevices - Preferred cryptic devices to include (optional)
   * @param {string} options.themeHint - Optional theme hint from user
   * @param {boolean} options.allowMultiWord - Require multi-word phrase (2-3 words)
   * @returns {Promise<Object>} - Generated cryptic puzzle
   */
  async generateCrypticPuzzle({
    difficulty = 3,
    crypticDevices = [],
    themeHint = null,
    allowMultiWord = false,
  }) {
    const client = this.getClient();
    if (!client) {
      throw new Error('AI generation is not enabled. Please configure ANTHROPIC_API_KEY.');
    }

    const startTime = Date.now();
    let lastError = null;

    // Retry logic for production reliability
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const prompt = this.buildCrypticPrompt({
          difficulty,
          crypticDevices,
          themeHint,
          allowMultiWord,
        });
        const genInfo = {
          difficulty,
          crypticDevices,
          hasThemeHint: !!themeHint,
          allowMultiWord,
          model: this.model,
          attempt: attempt + 1,
          maxAttempts: this.maxRetries + 1,
        };

        // DEBUG: Log if multi-word requirement is in prompt
        if (allowMultiWord) {
          const hasRequirement = prompt.includes('MULTI-WORD REQUIREMENT');

          if (hasRequirement) {
            prompt.match(/🚨 MULTI-WORD REQUIREMENT[\s\S]{0,300}/)?.[0];
          }
        }

        logger.info('Generating cryptic puzzle with AI', genInfo);

        const message = await client.messages.create({
          model: this.model,
          max_tokens: 1536,
          temperature: 1.0,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = message.content[0].text;
        const duration = Date.now() - startTime;

        const responseInfo = {
          length: responseText.length,
          duration,
          attempt: attempt + 1,
        };

        logger.info('AI cryptic puzzle response received', responseInfo);

        const puzzle = this.parseCrypticResponse(responseText);
        this.validateCrypticPuzzle(puzzle);

        // CRITICAL: Enforce multi-word requirement if enabled
        if (allowMultiWord) {
          const isMultiWord = puzzle.answer.includes(' ');
          const wordCount = puzzle.answer.split(/\s+/).filter((w) => w.length > 0).length;

          logger.info('[ai.service] Checking multi-word requirement', {
            answer: puzzle.answer,
            hasSpace: isMultiWord,
            wordCount,
            wordPattern: puzzle.word_pattern,
          });

          if (!isMultiWord) {
            logger.error('[ai.service] Multi-word requirement FAILED: No spaces in answer', {
              answer: puzzle.answer,
              attempt: attempt + 1,
            });
            throw new Error(
              `Multi-word requirement not met: AI generated single-word answer "${puzzle.answer}" when multi-word was required. Must have spaces between words. Retrying...`
            );
          }

          if (wordCount < 2) {
            logger.error('[ai.service] Multi-word requirement FAILED: Not enough words', {
              answer: puzzle.answer,
              wordCount,
              attempt: attempt + 1,
            });
            throw new Error(
              `Multi-word requirement not met: Answer "${puzzle.answer}" has only ${wordCount} word (need 2-3 words). Retrying...`
            );
          }

          if (wordCount > 3) {
            logger.error('[ai.service] Multi-word requirement FAILED: Too many words', {
              answer: puzzle.answer,
              wordCount,
              attempt: attempt + 1,
            });
            throw new Error(
              `Multi-word requirement not met: Answer "${puzzle.answer}" has ${wordCount} words (max 3 words). Retrying...`
            );
          }

          logger.info('[ai.service] ✓ Multi-word requirement validated successfully', {
            answer: puzzle.answer,
            wordCount,
            wordPattern: puzzle.word_pattern,
          });
        }

        this.generationCount++;
        const successInfo = {
          answer: puzzle.answer,
          device: puzzle.cryptic_device,
          difficulty: puzzle.difficulty_rating,
          duration,
          totalGenerations: this.generationCount,
        };

        logger.info('Cryptic puzzle generated successfully', successInfo);

        return puzzle;
      } catch (error) {
        lastError = error;

        // Enhanced error logging
        logger.error('AI cryptic puzzle generation attempt failed', {
          attempt: attempt + 1,
          errorMessage: error.message,
          errorType: error.constructor.name,
          errorStatus: error.status,
          errorCode: error.error?.type,
          willRetry: attempt < this.maxRetries,
        });

        if (error.status === 429) {
          const retryAfter = error.error?.retry_after || Math.pow(2, attempt + 1);
          logger.warn('Rate limit hit, will retry after delay', {
            retryAfter,
            attempt: attempt + 1,
          });

          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
            continue;
          } else {
            error.message = `rate_limit: ${error.message}`;
            throw error;
          }
        }

        // Don't retry on authentication errors
        if (
          error.status === 401 ||
          error.message.includes('authentication') ||
          error.message.includes('API key')
        ) {
          logger.error('Authentication error - not retrying', { error: error.message });
          throw error;
        }

        // Service overloaded - retry with longer backoff
        if (error.status === 529) {
          logger.warn('Service overloaded, will retry with longer delay', { attempt: attempt + 1 });
          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt + 2) * 1000));
            continue;
          }
        }

        // Validation errors - retry with fresh generation
        if (error.message.includes('Invalid') || error.message.includes('must be')) {
          if (attempt < this.maxRetries) {
            logger.warn('Validation error, retrying with fresh generation', {
              error: error.message,
            });
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
        }

        if (attempt === this.maxRetries) {
          break;
        }

        // Brief delay before retry (exponential backoff)
        const backoffMs = Math.pow(2, attempt) * 1000;
        logger.info('Waiting before retry', { backoffMs, attempt: attempt + 1 });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    // All retries failed
    logger.error('AI cryptic puzzle generation failed after all retries', {
      attempts: this.maxRetries + 1,
      error: lastError,
    });
    throw new Error(
      `AI cryptic generation failed after ${this.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Build the prompt for cryptic puzzle generation - REVISED VERSION v7 (Quality-First with Multi-Step Wordplay)
   * INSPIRED BY: High-quality cryptic setters who create clues with depth and sophistication
   * KEY PRINCIPLES:
   * - Multi-step wordplay (at least 2 distinct operations)
   * - Longer, more elaborate wordplay sections (spanning several words)
   * - Natural surface readings that tell a story
   * - Teaching-focused hint breakdowns
   */
  buildCrypticPrompt({ difficulty, crypticDevices, themeHint, allowMultiWord }) {
    let deviceInstructions = '';

    if (crypticDevices && crypticDevices.length > 0) {
      const deviceList = crypticDevices.map((d) => d.replace('_', ' ')).join(', ');
      if (crypticDevices.length === 1) {
        deviceInstructions = `\nREQUIRED CRYPTIC DEVICE: ${deviceList}\nYou MUST use this specific device in your puzzle.\n`;
      } else {
        deviceInstructions = `\nREQUIRED CRYPTIC DEVICES: ${deviceList}\nYou MUST incorporate these devices into your puzzle.\n`;
      }
    }

    const themeInstructions = themeHint
      ? `\nTHEME/TOPIC HINT: "${themeHint}"\nTry to incorporate this theme or topic into your puzzle if possible.\n`
      : '';

    const multiWordRequirement = allowMultiWord
      ? `
═══════════════════════════════════════════════════════════════════
🚨 MULTI-WORD PHRASE/IDIOM REQUIREMENT - MANDATORY 🚨
═══════════════════════════════════════════════════════════════════

⚠️ CRITICAL: The answer MUST contain SPACES between words ⚠️

You MUST create a PHRASE or IDIOM that people actually say (2-3 words).

ACCEPTABLE MULTI-WORD PHRASES/IDIOMS:
✓ "HOT POTATO" - idiom for controversial issue (3,6 letters)
✓ "COLD SHOULDER" - phrase for ignoring someone (4,8 letters)
✓ "EASY STREET" - idiom for comfortable life (4,6 letters)
✓ "ROUGH PATCH" - phrase for difficult period (5,5 letters)
✓ "CLEAN SLATE" - idiom for fresh start (5,5 letters)
✓ "LAST STRAW" - idiom for final annoyance (4,5 letters)
✓ "OPEN BOOK" - phrase for transparent person (4,4 letters)
✓ "TOP DRAWER" - phrase for excellent quality (3,6 letters)

These are REAL PHRASES people say - not random word combinations!

MANDATORY REQUIREMENTS (ALL MUST BE MET):
✓ Answer MUST have SPACES between words (e.g., "HOT POTATO")
✓ Must be 2-3 words (not 1 word, not 4+ words)
✓ Each word must be at least 2 letters long
✓ Total letters: 5-11 (excluding spaces)
✓ Must be a well-known phrase/idiom/expression
✓ Set word_pattern to array: e.g., [3, 6] for "HOT POTATO"

❌ THESE WILL BE REJECTED - DO NOT GENERATE:
✗ "FORCE" - single word (REJECTED!)
✗ "POTATO" - single word (REJECTED!)
✗ "SHOULDER" - single word (REJECTED!)
✗ "HOTPOTATO" - no spaces (REJECTED!)
✗ "A B C D" - too many words (REJECTED!)

═══════════════════════════════════════════════════════════════════
`
      : '';

    const difficultyGuidance = {
      2: 'Easy - Use familiar words with clear wordplay. Most solvers should be able to work it out.',
      3: 'Medium - Balanced difficulty. Clever but fair wordplay. Standard cryptic crossword difficulty.',
      4: 'Challenging - More complex wordplay or less common (but still known) words. Requires cryptic experience.',
    };

    return `# DAILY CRYPTIC PUZZLE GENERATOR PROMPT

## YOUR TASK:

Create ONE cryptic crossword clue using classic cryptic construction techniques.
${multiWordRequirement}
${deviceInstructions}
${themeInstructions}

## DIFFICULTY LEVEL:

Target difficulty: ${difficulty}/5 - ${difficultyGuidance[difficulty] || difficultyGuidance[3]}

## CRYPTIC CLUE STRUCTURE

Every cryptic clue has two parts:

1. **Definition** - A straightforward synonym for the answer (usually at the start or end)
2. **Wordplay** - A clever way to construct the answer using cryptic devices

## CRYPTIC DEVICES:

### Anagram

Letters rearranged to form a new word

- **Indicators:** mixed, confused, disturbed, scrambled, wild, broken, dancing, crazy, messy, off, drunk, poor, bad, strange, wrong
- **Example:** "Moods disrupted for gloomy fates (5)" = DOOMS (MOODS anagrammed)

### Reversal

Read a word or letters backward

- **Indicators:** back, returned, reversed, around, reflected, retreating, mirror, rolling, twist
- **Example:** "Stop reversed in pans (4)" = POTS (STOP backwards)
- **CRITICAL:** The backwards word must EXACTLY spell the answer or part of the answer
- **Verify your reversal:** If reversing "FOO" you get "OOF" - check this letter by letter!

### Container

One word placed inside another word

- **Indicators:** in, into, within, holding, containing, around, about, grabs, captures, embracing, wearing, interrupted
- **Example:** "Sting gets Ray wandering (8)" = STRAYING (ST(RAY)ING)

### Deletion

Remove specific letters from a word

- **Indicators:** without, loses, drops, missing, lacking, headless (first), endless (last), heartless (middle), curtailed
- **Example:** "Demons losing direction = monster (5)" = FIEND (FIENDS - S)

### Homophone

A word that sounds like another word

- **Indicators:** sounds like, heard, spoken, said, audibly, aloud, vocal, listening, by ear, reported, mentioned
- **Example:** "Chews sounds like selects (7)" = CHOOSES (sounds like CHEWS)

### Hidden Word

The answer is hiding inside consecutive letters

- **Indicators:** in, within, part of, some of, held by, inside, concealed, buried, partially
- **Example:** "Part of grand river crossing (5)" = RIVER (hidden in "gRAND RIVEr")

### Charade

Two or more parts joined together to make the answer

- **Indicators:** with, and, before, after, following, by, next to, leading
- **Example:** "Sea with shore is beach (8)" = SEASHORE (SEA + SHORE)

### Double Definition

Two different definitions of the same word

- **Indicators:** None - just two definitions
- **Example:** "Bow vessel front (3,4)" = BOW SHIP ("bow" = bend forward, "ship" = vessel, "front" = bow of ship)

### Selection (Initial Letters)

Pick specific letters from words

- **Indicators:** starts, heads, opens, begins, initially, at first, primarily, ends, tails, last, middle, heart
- **Example:** "Solar Eclipse Now Tonight = message (4)" = SENT (first letters)

---

## CONSTRUCTION GUIDELINES:

1. **Definition Placement**
   - Definition must be at ONE END of the clue (first or last chunk)
   - Never bury definition in the middle
   - Must be a true, fair synonym of the answer

2. **Vocabulary - Common, Everyday Words Only**
   - Use ONLY words at Wordle difficulty level
   - Source fodder must be simple words everyone knows
   - For ANAGRAMS: Source word MUST be common (not obscure or made-up words)
   - Everyday vocabulary ensures accessibility

3. **Surface Reading**
   - The clue should read like a natural sentence or headline
   - Create a clear scenario or narrative
   - The surface should provide elegant misdirection

4. **Clarity and Fairness**
   - The definition should be a true synonym of the answer
   - The wordplay should lead unambiguously to the answer
   - Include the answer length in parentheses at the end

5. **Abbreviations (Use Sparingly)**
   - Common abbreviations are acceptable when they feel natural
   - Examples: N/S/E/W for directions, C/D/M for Roman numerals, standard acronyms (USA, TV, PC, etc.)
   - Avoid obscure or arbitrary abbreviations

---

## ⚠️ CRITICAL: MANDATORY VERIFICATION REQUIREMENTS ⚠️

Before submitting your clue, you MUST verify the mathematics letter-by-letter:

### 1. Letter Count Verification
- Count source letters: "PHONE TAG" = 8 letters (excluding spaces)
- Count answer letters: "PATHOGEN" = 8 letters
- They MUST match exactly ✓

### 2. Anagram Verification
- Write out source: P-H-O-N-E-T-A-G
- Write out answer: P-A-T-H-O-G-E-N
- Verify same letters appear: A(1), E(1), G(1), H(1), N(1), O(1), P(1), T(1) ✓
- Check: every letter in source appears in answer, and vice versa

### 3. Reversal Verification
- Write forward: S-T-O-P (4 letters)
- Write backward: P-O-T-S (4 letters)
- Verify both spell real words ✓
- Example of WRONG: "COIL reversed" does NOT equal "ELECTRIC"

### 4. Container Verification
- Outer word letters: Count them
- Inner word letters: Count them
- Combined length: Outer + Inner must equal answer length
- Example: ST + RAY + ING = 8 letters → STRAYING = 8 letters ✓

### 5. Hidden Word Verification
- Write source phrase: "campers on alert"
- Identify consecutive letters: camPERS ON ALert
- Extract: P-E-R-S-O-N-A-L (8 letters)
- Verify answer matches exactly ✓

### 6. Selection Verification (Initial/Odd/Even Letters)
- Write out full source phrase
- Mark positions: **F**ood **A**rriving **U**nusually **L**ate **T**oday
- Extract marked letters: F-A-U-L-T
- Verify spelling matches answer ✓

**🚨 DO NOT SUBMIT A CLUE UNLESS YOU HAVE VERIFIED THE MATHEMATICS LETTER-BY-LETTER! 🚨**

If your verification fails, START OVER with different fodder. Never submit broken wordplay.

---

## VERIFIED QUALITY EXAMPLES (Study These Carefully):

### Example 1: INITIAL LETTERS (Selection Device)

**Clue:** "Server's mistake leads to food arriving unusually late today (5)"
**Answer:** FAULT

- Definition: "Server's mistake"
- Indicator: "leads to" (signals initial letters)
- Fodder: "food arriving unusually late today"
- Mechanics: **F**ood **A**rriving **U**nusually **L**ate **T**oday = FAULT
- **VERIFICATION STEPS:**
  - Write out phrase: food arriving unusually late today
  - Take first letter of each word: F-A-U-L-T
  - Count: 5 letters ✓
  - Verify answer: FAULT = 5 letters ✓
  - Check spelling: F-A-U-L-T matches exactly ✓

### Example 2: ODD LETTER SELECTION

**Clue:** "Slim odds of solving that (6)"
**Answer:** SLIGHT

- Definition: "Slim"
- Indicator: "odds of" (select odd-position letters)
- Fodder: "solving that"
- Mechanics: **S**o**L**v**I**n**G** t**H**a**T** = SLIGHT
- **VERIFICATION STEPS:**
  - Write out phrase without space: SOLVINGTHAT (11 letters)
  - Number positions: S(1) O(2) L(3) V(4) I(5) N(6) G(7) T(8) H(9) A(10) T(11)
  - Take odd positions: 1,3,5,7,9,11 = S-L-I-G-H-T
  - Count: 6 letters ✓
  - Verify answer: SLIGHT = 6 letters ✓
  - Check spelling: S-L-I-G-H-T matches exactly ✓

### Example 3: ANAGRAM

**Clue:** "Deadly agent playing phone tag (8)"
**Answer:** PATHOGEN

- Definition: "Deadly agent"
- Indicator: "playing" (anagram)
- Fodder: "phone tag"
- Mechanics: PHONE TAG (rearranged) = PATHOGEN
- **VERIFICATION STEPS:**
  - Write out source: PHONE TAG (no space) = P-H-O-N-E-T-A-G (8 letters)
  - Write out answer: P-A-T-H-O-G-E-N (8 letters)
  - Count matches: 8 = 8 ✓
  - Verify same letters:
    - Source has: A(1), E(1), G(1), H(1), N(1), O(1), P(1), T(1)
    - Answer has: A(1), E(1), G(1), H(1), N(1), O(1), P(1), T(1)
  - Perfect match ✓

### Example 4: HIDDEN WORD

**Clue:** "Campers on alert... bears close to home (8)"
**Answer:** PERSONAL

- Definition: "close to home"
- Indicator: "bears" (hidden word indicator)
- Fodder: "Campers on alert"
- Mechanics: cam**PERS ON AL**ert = PERSONAL
- **VERIFICATION STEPS:**
  - Write out phrase: campers on alert
  - Look for consecutive letters: camPERS ON ALert
  - Extract: P-E-R-S-O-N-A-L (8 letters)
  - Verify answer: PERSONAL = 8 letters ✓
  - Check: letters are consecutive in source ✓
  - Perfect match ✓

### Example 5: MULTI-STEP (Selection + Deletion)

**Clue:** "Lead guitarist fills all but the first bass section? (5)"
**Answer:** GILLS

- Definition: "bass section" (fish gills, not music - note the ?)
- Indicators: "Lead" (first letter) + "all but the first" (deletion)
- Fodder: "guitarist" + "fills"
- Mechanics: **G**uitarist + (F)ILLS = G + ILLS = GILLS
- **VERIFICATION STEPS:**
  - Take first letter of "guitarist": G
  - Take "fills" without first letter: (F)ILLS = ILLS (4 letters)
  - Combine: G + ILLS = GILLS (5 letters)
  - Verify answer: GILLS = 5 letters ✓
  - Check spelling: G-I-L-L-S matches exactly ✓
  - Surface misdirection: "bass" = fish, not music ✓

**KEY TAKEAWAY:** Notice how every example shows step-by-step verification. This is MANDATORY for your clue!

---

## FINAL CHECKLIST (Before Submitting):

1. **VERIFICATION COMPLETED:**
   - ✓ I have performed letter-by-letter verification (as shown above)
   - ✓ My fodder letters exactly match my answer letters
   - ✓ Letter counts are correct for all components
   - ✓ If anagram: I listed out all letters and confirmed they match
   - ✓ If reversal: I wrote it forwards and backwards to verify
   - ✓ If container: I counted outer + inner = answer length
   - ✓ If hidden: I confirmed letters are consecutive in source
   - **DO NOT PROCEED if any verification step failed**

2. **Definition is accurate:**
   - Must be a true synonym of the answer
   - Placed at ONE END of the clue (not buried in middle)

3. **Wordplay is fair:**
   - Indicators are standard and clear
   - Letter counts match (verified above)
   - Construction follows established rules
   - Uses common vocabulary (Wordle-level words)

4. **Clue structure is clear:**
   - Definition + Wordplay (or Wordplay + Definition)
   - Answer length in parentheses at end: (5) or (3,4) for multi-word
   - Natural surface reading (reads like a sentence)
   - No ambiguity in construction

5. **Explanation is concise and clear:**
   - Format: "WORDPLAY OPERATION = ANSWER"
   - ONE sentence maximum
   - Show the mechanics simply
   - Example: "STOP (reversed) = POTS"
   - Example: "PHONE TAG (anagrammed) = PATHOGEN"
   - Example: "**G**uitarist + (F)ILLS = GILLS"
   - DO NOT ramble or provide multiple attempts
   - DO NOT use phrases like "Actually:" or "Better:" or "Clean answer:"
   - Just state the ONE correct solution clearly

---

## OUTPUT FORMAT:
${
  allowMultiWord
    ? `
**MULTI-WORD PHRASE EXAMPLE:**

\`\`\`json
{
  "clue": "Feeling sad? Dejected bird loses its plumage (4, 2, 3, 5)",
  "answer": "DOWN IN THE DUMPS",
  "length": 14,
  "word_pattern": [4, 2, 3, 5],
  "hints": [
    {
      "type": "fodder",
      "text": "The word 'dejected bird' provides components we need. A dejected bird might be 'down', and birds have 'down' (feathers)."
    },
    {
      "type": "indicator",
      "text": "'loses its plumage' signals a wordplay operation - something is being removed or combined."
    },
    {
      "type": "definition",
      "text": "'Feeling sad' is the definition - this phrase describes being in low spirits or depressed."
    },
    {
      "type": "letter",
      "text": "Starts with D"
    }
  ],
  "explanation": "DOWN (bird's plumage/dejected) + IN THE DUMPS (discarded) = DOWN IN THE DUMPS",
  "difficulty_rating": ${difficulty},
  "cryptic_device": "charade"
}
\`\`\`

**NOTE:** For multi-word PHRASE answers:
- Answer must be a well-known PHRASE or IDIOM that people actually say
- Include spaces in "answer": "DOWN IN THE DUMPS" NOT "DOWNINTHEDUMPS"
- Add "word_pattern" field with array of word lengths: [4, 2, 3, 5]
- Update "length" to total letters (excluding spaces): 14
- Clue should show pattern: (4, 2, 3, 5) not just (14)
`
    : `
**SINGLE-WORD EXAMPLE:**

\`\`\`json
{
  "clue": "Moods disrupted for gloomy fates (5)",
  "answer": "DOOMS",
  "length": 5,
  "hints": [
    {
      "type": "fodder",
      "text": "The word 'moods' provides the letters we need to work with."
    },
    {
      "type": "indicator",
      "text": "'Disrupted' signals an anagram - letters need to be rearranged."
    },
    {
      "type": "definition",
      "text": "'Gloomy fates' describes terrible destinies or inevitable ends."
    },
    {
      "type": "letter",
      "text": "Starts with D"
    }
  ],
  "explanation": "MOODS (disrupted/anagrammed) = DOOMS",
  "difficulty_rating": ${difficulty},
  "cryptic_device": "anagram"
}
\`\`\`
`
}

Return ONLY the JSON. No additional explanation.`;
  }

  /**
   * Parse AI cryptic response into puzzle format
   */
  parseCrypticResponse(responseText) {
    try {
      // First, try to extract JSON from markdown code blocks
      const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
      const codeBlocks = [];
      let match;

      while ((match = codeBlockRegex.exec(responseText)) !== null) {
        codeBlocks.push(match[1]);
      }

      // If we found code blocks, use the LAST one (AI often corrects itself)
      let jsonText;
      if (codeBlocks.length > 0) {
        jsonText = codeBlocks[codeBlocks.length - 1];
      } else {
        // Fallback: try to extract JSON without code blocks
        const jsonMatch = responseText.match(/\{[\s\S]*?\}(?=\s*$|\s*```|\s*\n\n)/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        jsonText = jsonMatch[0];
      }

      const puzzle = JSON.parse(jsonText);

      // Normalize the structure
      const answer = (puzzle.answer?.trim() || '').toUpperCase();
      const totalLength = answer.replace(/\s/g, '').length; // Exclude spaces

      return {
        clue: puzzle.clue?.trim() || '',
        answer,
        length: puzzle.length || totalLength || 0,
        word_pattern: puzzle.word_pattern || null,
        hints: puzzle.hints || [],
        explanation: puzzle.explanation?.trim() || '',
        difficulty_rating: puzzle.difficulty_rating || 3,
        cryptic_device: puzzle.cryptic_device || 'charade',
      };
    } catch (error) {
      logger.error('Failed to parse AI cryptic response', { error, responseText });
      throw new Error('Failed to parse AI cryptic response. Please try again.');
    }
  }

  /**
   * Generate crossword clues for Daily Mini puzzles
   * @param {Array} words - Array of {word, direction, row, col} objects
   * @returns {Promise<Array>} - Array of generated clues
   */
  async generateCrosswordClues(words) {
    const client = this.getClient();
    if (!client) {
      throw new Error('AI generation is not enabled. Please configure ANTHROPIC_API_KEY.');
    }

    const startTime = Date.now();
    let lastError = null;

    // Retry logic for production reliability
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const prompt = this.buildCrosswordCluesPrompt(words);
        const genInfo = {
          wordCount: words.length,
          model: this.model,
          attempt: attempt + 1,
          maxAttempts: this.maxRetries + 1,
        };

        logger.info('Generating crossword clues with AI', genInfo);

        const message = await client.messages.create({
          model: this.model,
          max_tokens: 1024,
          temperature: 0.8, // Moderate creativity for variety
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = message.content[0].text;
        const duration = Date.now() - startTime;

        const responseInfo = {
          length: responseText.length,
          duration,
          attempt: attempt + 1,
        };

        logger.info('AI crossword clues response received', responseInfo);

        const clues = this.parseCrosswordCluesResponse(responseText, words.length);

        this.generationCount++;
        const successInfo = {
          clueCount: clues.length,
          duration,
          totalGenerations: this.generationCount,
        };

        logger.info('Crossword clues generated successfully', successInfo);

        return clues;
      } catch (error) {
        lastError = error;

        // Enhanced error logging
        logger.error('AI crossword clues generation attempt failed', {
          attempt: attempt + 1,
          errorMessage: error.message,
          errorType: error.constructor.name,
          errorStatus: error.status,
          errorCode: error.error?.type,
          willRetry: attempt < this.maxRetries,
        });

        if (error.status === 429) {
          const retryAfter = error.error?.retry_after || Math.pow(2, attempt + 1);
          logger.warn('Rate limit hit, will retry after delay', {
            retryAfter,
            attempt: attempt + 1,
          });

          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
            continue;
          } else {
            error.message = `rate_limit: ${error.message}`;
            throw error;
          }
        }

        // Don't retry on authentication errors
        if (
          error.status === 401 ||
          error.message.includes('authentication') ||
          error.message.includes('API key')
        ) {
          logger.error('Authentication error - not retrying', { error: error.message });
          throw error;
        }

        // Service overloaded - retry with longer backoff
        if (error.status === 529) {
          logger.warn('Service overloaded, will retry with longer delay', { attempt: attempt + 1 });
          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt + 2) * 1000));
            continue;
          }
        }

        if (attempt === this.maxRetries) {
          break;
        }

        // Brief delay before retry (exponential backoff)
        const backoffMs = Math.pow(2, attempt) * 1000;
        logger.info('Waiting before retry', { backoffMs, attempt: attempt + 1 });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    // All retries failed
    logger.error('AI crossword clues generation failed after all retries', {
      attempts: this.maxRetries + 1,
      error: lastError,
    });
    throw new Error(
      `AI crossword clues generation failed after ${this.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Build the prompt for crossword clue generation
   */
  buildCrosswordCluesPrompt(words) {
    const wordsList = words.map((w, i) => `${i + 1}. ${w.word} (${w.direction})`).join('\n');

    return `You are generating crossword-style clues for a Daily Mini crossword puzzle.

WORDS TO CLUE:
${wordsList}

CLUE REQUIREMENTS:
Each clue MUST be concise, crossword-style (3-10 words ideal, max 80 characters):
- Focus on the WORD ITSELF - provide a definition, synonym, or description
- Use NYT crossword style: clever wordplay, puns, cultural references when appropriate
- Vary difficulty - mix straightforward definitions with clever misdirection
- Make clues engaging and fun to solve
- DO NOT use the answer word in the clue
- DO NOT reference the word's position in the grid

CLUE STYLE EXAMPLES:
- CARDS → "Deck components"
- HOUSE → "Dwelling or legislative body"
- STOVE → "Where things heat up in the kitchen"
- PIANO → "Instrument with 88 keys"
- BREAD → "Dough after baking"
- RIVER → "Amazon or Nile"
- MUSIC → "Universal language"

RESPONSE FORMAT (JSON array only, no explanation):
["clue for word 1", "clue for word 2", "clue for word 3", ...]

Generate creative, clever clues for each word above. Return ONLY the JSON array.`;
  }

  /**
   * Generate movies for Reel Connections puzzle
   * @param {Object} options - Generation options
   * @param {string} options.connection - The connection/theme for the movies
   * @param {string} options.difficulty - Difficulty level (easy, medium, hard)
   * @returns {Promise<{connection: string, movies: string[]}>}
   */
  async generateReelConnectionsMovies({ connection, difficulty = 'medium' }) {
    const client = this.getClient();
    if (!client) {
      throw new Error('AI generation is not enabled. Please configure ANTHROPIC_API_KEY.');
    }

    const startTime = Date.now();
    let lastError = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const prompt = this.buildReelConnectionsPrompt({ connection, difficulty });
        const genInfo = {
          connection,
          difficulty,
          model: this.model,
          attempt: attempt + 1,
          maxAttempts: this.maxRetries + 1,
        };

        logger.info('Generating Reel Connections movies with AI', genInfo);

        const message = await client.messages.create({
          model: this.model,
          max_tokens: 512,
          temperature: 0.9, // Higher for creative movie suggestions
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = message.content[0].text;
        const duration = Date.now() - startTime;

        logger.info('AI Reel Connections response received', {
          length: responseText.length,
          duration,
          attempt: attempt + 1,
        });

        const result = this.parseReelConnectionsResponse(responseText);

        this.generationCount++;
        logger.info('Reel Connections movies generated successfully', {
          connection: result.connection,
          movieCount: result.movies.length,
          duration,
        });

        return result;
      } catch (error) {
        lastError = error;

        logger.error('AI Reel Connections generation attempt failed', {
          attempt: attempt + 1,
          errorMessage: error.message,
          errorType: error.constructor.name,
          willRetry: attempt < this.maxRetries,
        });

        if (error.status === 429) {
          const retryAfter = error.error?.retry_after || Math.pow(2, attempt + 1);
          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
            continue;
          } else {
            error.message = `rate_limit: ${error.message}`;
            throw error;
          }
        }

        if (
          error.status === 401 ||
          error.message.includes('authentication') ||
          error.message.includes('API key')
        ) {
          throw error;
        }

        if (attempt === this.maxRetries) {
          break;
        }

        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw new Error(
      `AI Reel Connections generation failed after ${this.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Build prompt for Reel Connections movie generation
   */
  buildReelConnectionsPrompt({ connection, difficulty }) {
    const difficultyGuidance = {
      easy: 'Choose well-known, popular movies that most people would recognize. Blockbusters and classics.',
      medium:
        'Mix of popular and somewhat less mainstream movies. Should be recognizable but may require some movie knowledge.',
      hard: 'Can include less mainstream or older films, but they must still be findable in movie databases.',
    };

    return `You are generating movies for a Reel Connections puzzle game (similar to NYT Connections but with movies).

CONNECTION/THEME: "${connection}"

DIFFICULTY: ${difficulty} - ${difficultyGuidance[difficulty] || difficultyGuidance['medium']}

REQUIREMENTS:
1. Generate EXACTLY 4 movies that share the connection "${connection}"
2. Each movie MUST be a real, well-known film that exists in movie databases like IMDB/OMDb
3. Movies MUST have theatrical posters available (no obscure films without posters)
4. The connection should be interesting but not too obscure - players should have an "aha!" moment
5. Prefer movies from 1990-present for better poster availability, but classics are fine
6. Avoid movies with very similar titles that could be confused

EXAMPLES OF GOOD CONNECTIONS:
- "Movies with colors in the title" → The Green Mile, Blue Velvet, Scarlet Street, The Color Purple
- "Movies set in space" → Gravity, Interstellar, Alien, 2001: A Space Odyssey
- "Movies with food in the title" → Pulp Fiction (just kidding), Chocolat, Fried Green Tomatoes, Ratatouille

RESPONSE FORMAT (JSON only):
{
  "connection": "The exact connection/theme",
  "movies": ["Movie Title 1", "Movie Title 2", "Movie Title 3", "Movie Title 4"]
}

Generate 4 movies for the connection "${connection}". Return ONLY the JSON.`;
  }

  /**
   * Parse Reel Connections AI response
   */
  parseReelConnectionsResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);

      if (!result.connection || typeof result.connection !== 'string') {
        throw new Error('Missing or invalid connection');
      }

      if (!Array.isArray(result.movies) || result.movies.length !== 4) {
        throw new Error('Must have exactly 4 movies');
      }

      result.movies.forEach((movie, index) => {
        if (typeof movie !== 'string' || movie.trim().length < 2) {
          throw new Error(`Movie ${index + 1} is invalid`);
        }
      });

      return {
        connection: result.connection.trim(),
        movies: result.movies.map((m) => m.trim()),
      };
    } catch (error) {
      logger.error('Failed to parse Reel Connections response', { error, responseText });
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }

  /**
   * Parse AI crossword clues response
   */
  parseCrosswordCluesResponse(responseText, expectedCount) {
    try {
      // Try to extract JSON array from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const clues = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(clues)) {
        throw new Error('Response is not an array');
      }

      if (clues.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} clues, got ${clues.length}`);
      }

      // Validate each clue
      clues.forEach((clue, index) => {
        if (typeof clue !== 'string' || clue.trim().length === 0) {
          throw new Error(`Clue ${index + 1} is empty or invalid`);
        }
        if (clue.length > 80) {
          throw new Error(`Clue ${index + 1} is too long (max 80 characters): "${clue}"`);
        }
      });

      return clues.map((c) => c.trim());
    } catch (error) {
      logger.error('Failed to parse AI crossword clues response', { error, responseText });
      throw new Error('Failed to parse AI crossword clues response. Please try again.');
    }
  }

  /**
   * Validate cryptic puzzle structure
   */
  validateCrypticPuzzle(puzzle) {
    const errors = [];

    if (!puzzle.clue || puzzle.clue.length < 5) {
      errors.push('Clue is missing or too short');
    }

    // CRITICAL: Check for "=" in clue (not cryptic style!)
    if (puzzle.clue && puzzle.clue.includes('=')) {
      errors.push(
        'Clue contains "=" which is not cryptic crossword style. Clues must disguise the wordplay, not reveal it with mathematical notation.'
      );
    }

    // Validate answer length (excluding spaces for multi-word)
    const totalLetters = puzzle.answer ? puzzle.answer.replace(/\s/g, '').length : 0;

    if (!puzzle.answer || totalLetters < 5) {
      errors.push('Answer is missing or too short (min 5 letters excluding spaces)');
    }

    if (totalLetters > 11) {
      errors.push('Answer is too long (max 11 letters excluding spaces)');
    }

    if (puzzle.length !== totalLetters) {
      errors.push(
        `Length mismatch: length=${puzzle.length} but answer="${puzzle.answer}" has ${totalLetters} letters (excluding spaces)`
      );
    }

    // Allow spaces in multi-word answers
    if (!/^[A-Z\s]+$/.test(puzzle.answer || '')) {
      errors.push('Answer must be uppercase letters and spaces only');
    }

    // Validate word_pattern for multi-word answers
    if (puzzle.answer && puzzle.answer.includes(' ')) {
      const words = puzzle.answer.split(/\s+/).filter((w) => w.length > 0);

      if (!puzzle.word_pattern) {
        errors.push('Multi-word answer requires word_pattern field');
      } else if (puzzle.word_pattern.length !== words.length) {
        errors.push(
          `word_pattern length (${puzzle.word_pattern.length}) does not match number of words (${words.length})`
        );
      } else {
        // Verify each word length matches pattern
        for (let i = 0; i < words.length; i++) {
          if (words[i].length !== puzzle.word_pattern[i]) {
            errors.push(
              `Word ${i + 1} ("${words[i]}") has length ${words[i].length} but word_pattern says ${puzzle.word_pattern[i]}`
            );
          }
        }
      }
    }

    if (!puzzle.explanation) {
      errors.push('Explanation is required');
    }

    // Validate hints
    if (!Array.isArray(puzzle.hints) || puzzle.hints.length !== 4) {
      errors.push('Must have exactly 4 hints');
    } else {
      const requiredTypes = ['fodder', 'indicator', 'definition', 'letter'];
      const hintTypes = puzzle.hints.map((h) => h.type);

      requiredTypes.forEach((type) => {
        if (!hintTypes.includes(type)) {
          errors.push(`Missing required hint type: ${type}`);
        }
      });

      puzzle.hints.forEach((hint, index) => {
        if (!hint.text || hint.text.trim().length === 0) {
          errors.push(`Hint ${index + 1} (${hint.type}) has no text`);
        }
      });
    }

    // Validate difficulty rating
    if (!puzzle.difficulty_rating || puzzle.difficulty_rating < 1 || puzzle.difficulty_rating > 5) {
      errors.push('Difficulty rating must be between 1 and 5');
    }

    // Validate cryptic device
    const validDevices = [
      'charade',
      'container',
      'deletion',
      'anagram',
      'reversal',
      'homophone',
      'hidden',
      'double_definition',
      'initial_letters',
    ];
    if (!puzzle.cryptic_device || !validDevices.includes(puzzle.cryptic_device)) {
      errors.push(`Invalid cryptic device: ${puzzle.cryptic_device}`);
    }

    if (errors.length > 0) {
      throw new Error(`Puzzle validation failed: ${errors.join(', ')}`);
    }
  }
}

export default new AIService();
