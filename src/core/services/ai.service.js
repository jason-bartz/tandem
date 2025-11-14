import Anthropic from '@anthropic-ai/sdk';
import logger from '@/utils/helpers/logger';

class AIService {
  constructor() {
    this.client = null;
    this.enabled = process.env.AI_GENERATION_ENABLED !== 'false';
    this.model = process.env.AI_MODEL || 'claude-sonnet-4-5-20250929';
    this.maxRetries = 2;
    this.timeout = 30000; // 30 seconds
    this.generationCount = 0; // Track for analytics
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
        logger.debug('Generating puzzle with AI', genInfo);

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
        logger.debug('AI response received', responseInfo);

        const puzzle = this.parseResponse(responseText);
        this.validatePuzzle(puzzle);

        // Track successful generation
        this.generationCount++;
        const successInfo = {
          date,
          theme: puzzle.theme,
          duration,
          totalGenerations: this.generationCount,
        };
        logger.debug('Puzzle generated successfully', successInfo);

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

        // Handle Anthropic API specific errors
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
        logger.debug('Generating hints with AI', genInfo);

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
        logger.debug('AI hints response received', responseInfo);

        const hints = this.parseHintsResponse(responseText, puzzles.length);

        // Track successful generation
        this.generationCount++;
        const successInfo = {
          theme,
          hintsCount: hints.length,
          duration,
          totalGenerations: this.generationCount,
        };
        logger.debug('Hints generated successfully', successInfo);

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

        // Handle Anthropic API specific errors (same as generatePuzzle)
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

    // Track all emojis used across the puzzle to prevent repetition
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
        // Check if hint contains the answer
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
        logger.debug('Assessing puzzle difficulty with AI', assessInfo);

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
        logger.debug('AI difficulty assessment received', responseInfo);

        const assessment = this.parseDifficultyResponse(responseText);

        // Track successful assessment
        const successInfo = {
          theme,
          rating: assessment.rating,
          duration,
        };
        logger.debug('Difficulty assessed successfully', successInfo);

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

        // Handle rate limiting
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
  async generateCrypticPuzzle({ difficulty = 3, crypticDevices = [], themeHint = null, allowMultiWord = false }) {
    const client = this.getClient();
    if (!client) {
      throw new Error('AI generation is not enabled. Please configure ANTHROPIC_API_KEY.');
    }

    const startTime = Date.now();
    let lastError = null;

    // Retry logic for production reliability
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const prompt = this.buildCrypticPrompt({ difficulty, crypticDevices, themeHint, allowMultiWord });
        const genInfo = {
          difficulty,
          crypticDevices,
          hasThemeHint: !!themeHint,
          allowMultiWord,
          model: this.model,
          attempt: attempt + 1,
          maxAttempts: this.maxRetries + 1,
        };
        const hasRequirement = allowMultiWord ? prompt.includes('MULTI-WORD REQUIREMENT') : false;
        logger.debug('Generating cryptic puzzle with AI', {
          ...genInfo,
          allowMultiWord,
          hasMultiWordRequirement: hasRequirement,
        });

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
        logger.debug('AI cryptic puzzle response received', responseInfo);

        const puzzle = this.parseCrypticResponse(responseText);
        this.validateCrypticPuzzle(puzzle);

        // CRITICAL: Enforce multi-word requirement if enabled
        if (allowMultiWord) {
          const isMultiWord = puzzle.answer.includes(' ');
          if (!isMultiWord) {
            throw new Error('Multi-word requirement not met: AI generated single-word answer when multi-word was required. Retrying...');
          }
          const wordCount = puzzle.answer.split(/\s+/).length;
          if (wordCount < 2) {
            throw new Error(`Multi-word requirement not met: Answer has only ${wordCount} word. Retrying...`);
          }
          logger.info('[ai.service] Multi-word requirement validated', {
            answer: puzzle.answer,
            wordCount,
            wordPattern: puzzle.word_pattern
          });
        }

        // Track successful generation
        this.generationCount++;
        const successInfo = {
          answer: puzzle.answer,
          device: puzzle.cryptic_device,
          difficulty: puzzle.difficulty_rating,
          duration,
          totalGenerations: this.generationCount,
        };
        logger.debug('Cryptic puzzle generated successfully', successInfo);

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

        // Handle Anthropic API specific errors
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
   * Build the prompt for cryptic puzzle generation - REVISED VERSION v6 (Construction-First Methodology)
   * CRITICAL CHANGE: Build from cryptic devices UP to answer, not backwards
   * Focuses on mathematical correctness and sound cryptic logic before cleverness
   */
  buildCrypticPrompt({ difficulty, crypticDevices, themeHint, allowMultiWord }) {
    let deviceInstructions = '';

    if (crypticDevices && crypticDevices.length > 0) {
      const deviceList = crypticDevices.map(d => d.replace('_', ' ')).join(', ');
      if (crypticDevices.length === 1) {
        deviceInstructions = `REQUIRED CRYPTIC DEVICE: ${deviceList}\nYou MUST use this specific device in your puzzle.`;
      } else {
        deviceInstructions = `REQUIRED CRYPTIC DEVICES: ${deviceList}\nYou MUST incorporate ALL of these devices into your puzzle. Create a puzzle that uses multiple cryptic techniques from this list.`;
      }
    } else {
      deviceInstructions = `Choose ONE primary cryptic device that works cleanly (prefer: charade, anagram, deletion, or hidden).`;
    }

    const themeInstructions = themeHint
      ? `THEME/TOPIC HINT: "${themeHint}"\nTry to incorporate this theme or topic into your puzzle if possible, but prioritize creating a mathematically correct, high-quality cryptic clue.`
      : '';

    const multiWordRequirement = allowMultiWord
      ? `
🚨 MULTI-WORD REQUIREMENT - MANDATORY:
You MUST create a multi-word phrase answer (2-3 words).
- Examples: "BLUE FEATHERS" (4,8), "DOWN IN THE DUMPS" (4,2,3,5), "OUT OF SORTS" (3,2,5)
- Each word must be at least 2 letters
- Total letters: 5-11 (excluding spaces)
- Maximum 3 words for readability
- Return answer WITH SPACES: e.g., "BLUE FEATHERS" not "BLUEFEATHERS"
- Set word_pattern to array of word lengths: e.g., [4, 8] for "BLUE FEATHERS"

This is NOT optional - single-word answers will be rejected.`
      : '';

    const difficultyGuidance = {
      2: 'Easy - Use familiar words with clear wordplay. Most solvers should be able to work it out.',
      3: 'Medium - Balanced difficulty. Clever but fair wordplay. Standard cryptic crossword difficulty.',
      4: 'Challenging - More complex wordplay or less common (but still known) words. Requires cryptic experience.',
    };

    return `You are creating ONE cryptic crossword puzzle in the style of "Minute Cryptic."
${allowMultiWord ? `
🚨🚨🚨 MANDATORY REQUIREMENT - READ THIS FIRST 🚨🚨🚨
YOU MUST CREATE A MULTI-WORD ANSWER (2-3 WORDS WITH SPACES)
Single-word answers are FORBIDDEN and will be REJECTED.
Examples: "BLUE FEATHERS", "DOWN IN THE DUMPS", "OUT OF SORTS"
🚨🚨🚨 DO NOT IGNORE THIS - IT IS NON-NEGOTIABLE 🚨🚨🚨
` : ''}
🚨 CRITICAL RULES:
1. Use ONLY common, everyday English words (think Wordle difficulty)
2. Source fodder must be simple words everyone knows
3. Follow the steps IN EXACT ORDER - don't jump ahead
4. For ANAGRAMS: Your source word MUST be common (not ARGENTS, MORTICAN, etc.)
5. EMOJIS MUST REPLACE WORDS - They are NOT decorative elements!
6. ⚠️ EMOJI ≠ ANSWER: Emojis must NEVER directly depict/represent the answer
   - Think: If someone sees the emoji, can they guess the answer directly?
   - ❌ If YES → BANNED! Choose different emojis
   - ✅ If NO → Safe to use
   - Emojis should represent: fodder words, indicators, or unrelated concepts
   - NOT the answer itself or obvious visual representations of it
7. ⚠️ ABBREVIATIONS & SUBSTITUTIONS - "Earned, Not Arbitrary"

   Use abbreviations/substitutions ONLY when they feel natural within the surface reading!

   ✅ ALLOWED - Earned through surface context:
   - "club" → C (playing cards, Roman numeral - if surface mentions cards/clubs)
   - "one" → I or A (Roman numeral, article - universally known)
   - "department" → DEPT (standard abbreviation)
   - "$0.01" → CENT, PENNY (natural way to read the symbol)
   - "direction" → N/S/E/W (if surface is about navigation/geography)
   - "note" → A-G (musical notes - if surface is music-themed)
   - Common acronyms: USA, TV, PC, CEO, FBI, NYC, etc.

   ⚠️ USE CAREFULLY - Valid but must be contextual:
   - "saint" → S, ST (only if surface mentions religion/saints)
   - "river" → R (only if surface is about geography/water)
   - "left/right" → L/R (only if surface is about directions)

   ❌ AVOID - Arbitrary or forced:
   - Random letter assignments with no surface logic
   - Abbreviations that break the natural reading flow
   - Obscure jargon requiring specialized knowledge
   - Multiple obscure abbreviations in one clue

   🎯 KEY PRINCIPLE: If the substitution feels "earned" through the surface reading's context, it's valid!

TARGET DIFFICULTY: ${difficulty}/5 - ${difficultyGuidance[difficulty] || difficultyGuidance[3]}
${deviceInstructions}
${themeInstructions}
${multiWordRequirement}

═══════════════════════════════════════════════════════════════════
✨ SURFACE READING - THE ART OF CRYPTIC DELIGHT
═══════════════════════════════════════════════════════════════════

The "surface" is what your clue appears to say before solving. This is what makes cryptic crosswords delightful!

🎯 GOAL: Create a natural, coherent sentence that:
- Reads like real English (headline, phrase, or conversational snippet)
- Suggests one scenario, but the answer reveals something completely different
- Makes the solver smile when decoded ("Ah! THAT's what it meant!")
- Uses misdirection elegantly (not just listing mechanical steps)

✅ EXAMPLES OF BRILLIANT SURFACE READINGS:

**"Buzzer-beater was thrown with second on stopwatch (4)"** → SWAT
- Surface story: Basketball game-winner at the buzzer
- Reality: WAS (thrown/scrambled) + S (second on stopwatch) = SWAT
- Delight factor: Sports → Police action (unexpected twist)

**"One goes into debt flying private jet? (5)"** → BIDET
- Surface story: Rich person's luxury spending habits
- Reality: I (one) goes into DEBT (scrambled/flying) = BIDET
- Delight factor: Wealth → Bathroom fixture (hilarious misdirection)

**"Goodbye! you blurted out, after ladies undressed (5)"** → ADIEU
- Surface story: Awkward/scandalous social situation
- Reality: U (you, said aloud) after ADIE (ladies undressed/letters removed)
- Delight factor: Social faux pas → French farewell

**"Campers on alert... bears close to home (8)"** → PERSONAL
- Surface story: Camping warning about wildlife
- Reality: Hidden in "camPERS ON ALert" = PERSONAL (close to home)
- Delight factor: Outdoor survival → Intimate/private

❌ ANTI-EXAMPLES (mechanically correct but boring):

**"Scrambled parties for sea raiders (7)"** → PIRATES
- Just describes the mechanics with no misdirection
- Solver immediately sees: "Oh, it's an anagram of parties"
- No surface story, no delight, no "aha moment"

**"Stop reversed in pans (4)"** → POTS
- Too transparent, just states the operation
- No narrative, no cleverness

🎨 SURFACE READING TECHNIQUES:

1. **Tell a micro-story**: "Song at night club leaves Lucy transfixed by mirrorball"
2. **Use cultural references**: "FINISH HIM!" (Mortal Kombat) for FIGHTING
3. **Create scenarios**: "Seductive, romantic guy dumped after 'mid' sex"
4. **Employ misdirection**: "$0.02?" suggests money, but means ADVICE
5. **Build atmosphere**: "Deadly agent playing phone tag" (spy thriller feel)

💡 REMEMBER: Mechanical correctness is required, but artistry makes it memorable!

═══════════════════════════════════════════════════════════════════
🎯 EMOJI USAGE PHILOSOPHY - FUNCTIONAL, NOT DECORATIVE
═══════════════════════════════════════════════════════════════════

⚠️ CRITICAL EMOJI RULES - EXACTLY 2 EMOJIS REQUIRED:
- You MUST use EXACTLY 2 emojis in your clue
- Emojis must REPLACE actual words in the clue (not decorate it)
- Test: Remove emojis → clue should have GAPS (missing words)
- ⚠️ SPACING RULE: The 2 emojis must be SEPARATED by at least one word (they cannot appear next to each other)

✅ CORRECT USAGE - Emojis REPLACE words and are SEPARATED:
- "Parties 🔀 for 🏴‍☠️ (7)" → PIRATES
  * 🔀 REPLACES "scrambled" (the indicator)
  * 🏴‍☠️ REPLACES "sea raiders" (the definition)
  * SEPARATED by: "parties for" ✓
  * Remove emojis: "Parties _____ for _____ (7)" → HAS GAPS ✓
  * PARTIES scrambled = PIRATES

- "🛑 reversed in 🍲 (4)" → POTS
  * 🛑 REPLACES "stop" (the fodder word)
  * 🍲 REPLACES "pans" (the definition)
  * SEPARATED by: "reversed in" ✓
  * Remove emojis: "_____ reversed in _____ (4)" → HAS GAPS ✓
  * STOP reversed = POTS

❌ WRONG USAGE - Emojis appear next to each other:
- "💬🔥 disrupted for gloomy fates (5)"
  * Two emojis with NO WORDS between them → WRONG!
  * This violates the spacing rule

❌ WRONG USAGE - Emojis are decorative:
- "🍟🥔 Thin slice? Trim potato strip with permission (6)"
  * Remove emojis: "Thin slice? Trim potato strip with permission" → NO GAPS!
  * The clue works fine without emojis → DECORATIVE → WRONG
  * Also violates spacing rule (emojis are adjacent)

═══════════════════════════════════════════════════════════════════
HOW TO USE YOUR 2 EMOJIS (MUST BE SEPARATED)
═══════════════════════════════════════════════════════════════════

⚠️ REMEMBER: Your 2 emojis must be SEPARATED by at least one word!

Each emoji represents a DIFFERENT word in the clue:
- "Parties 🔀 for 🏴‍☠️ (7)" → PIRATES
  * 🔀 REPLACES "scrambled" (the indicator)
  * 🏴‍☠️ REPLACES "sea raiders" (the definition)
  * SEPARATED by: "parties for" (2 words between them) ✓
  * Remove: "Parties _____ for _____ (7)" → HAS GAPS ✓
  * PARTIES scrambled = PIRATES

- "🛑 reversed in 🍲 (4)" → POTS
  * 🛑 REPLACES "stop" (the fodder)
  * 🍲 REPLACES "pans" (the definition)
  * SEPARATED by: "reversed in" (2 words between them) ✓
  * Remove: "_____ reversed in _____ (4)" → HAS GAPS ✓
  * STOP reversed = POTS

- "🌊 with shore is 🏖️ (8)" → SEASHORE
  * 🌊 REPLACES "sea" (first part)
  * 🏖️ REPLACES "beach" (definition)
  * SEPARATED by: "with shore is" (3 words between them) ✓
  * Remove: "_____ with shore is _____ (8)" → HAS GAPS ✓
  * SEA + SHORE = SEASHORE

═══════════════════════════════════════════════════════════════════
EMOJI SELECTION - Principles Over Prescriptive Lists
═══════════════════════════════════════════════════════════════════

Choose emojis CREATIVELY based on your specific clue. Don't limit yourself to preset lists!

🎯 **EMOJI SELECTION PRINCIPLES:**

1. **Visual/Conceptual Clarity**: Emoji should clearly suggest the intended word
2. **Functional Replacement**: Must actually replace a word (not just decorate)
3. **Not-Too-Obvious**: Should require slight decoding, but be fair
4. **Answer Independence**: NEVER use emojis that directly depict the answer

⚠️ CRITICAL TEST: "Does this emoji visually show/depict the answer?"
- ❌ If YES → Don't use it! Choose something else
- ✅ If NO → Safe to use

**INDICATOR EMOJIS** (signal the cryptic device):

*Anagram indicators (chaos, mixing, energy):*
⚡ = energized, charged, electric → anagram
💫 = dizzy, scrambled, confused → anagram
🌪️ = whirlwind, tornado, mixed up → anagram
🎲 = dice, random, shuffled → anagram
🎰 = slot machine, mixed, jumbled → anagram
🃏 = joker, wild, chaotic → anagram
🔀 = shuffle (use sparingly - too obvious)
🌀 = spiral, swirled, twisted → anagram

*Reversal indicators (backwards, rotation):*
🔄 = reversed, back, circular → reversal
↩️ = return, back, reversed → reversal
🔃 = clockwise/counterclockwise → reversal
⤴️⤵️ = up/down, flipped → reversal
🪞 = mirror, reflected → reversal

*Container indicators (wrapping, holding):*
📦 = box, contains, holds → container
🎁 = wrapped, gift, enclosed → container
🗄️ = filing, stored within → container
🧰 = toolbox, carries → container
🫙 = jar, holds → container

*Deletion indicators (cutting, removing):*
✂️ = scissors, cut, snipped → deletion
🔪 = knife, sliced, trimmed → deletion
❌ = crossed out, deleted → deletion
🚫 = prohibited, without, minus → deletion
🪓 = axe, chopped, split → deletion/charade

*Homophone indicators (sound, hearing):*
🔊 = volume, sounds like, heard → homophone
👂 = ear, listening, sounds → homophone
📢 = announcement, spoken → homophone
🗣️ = speaking, said aloud → homophone

**FODDER EMOJIS** (words being manipulated):

*Common single-emoji fodder:*
🛑 = STOP, HALT, END
🎉 = PARTY, CELEBRATION
🎪 = CIRCUS, TENT, RING
🌸 = FLOWER, BLOOM, ROSE
⭐ = STAR, STELLAR
🌙 = MOON, LUNAR, NIGHT
☀️ = SUN, SOLAR, DAY
🎵 = NOTE, MUSIC, SONG
🏃 = RUN, RUNNER, RACE
💰 = MONEY, GOLD, CASH

⚠️ NOTE: Since emojis must be separated, you CANNOT use paired emojis (like 💬🔥) anymore.
Instead, use single emojis that clearly represent individual words.

*Single-emoji fodder examples:*
💬 = CHAT, TALK, MOODS
🔥 = FIRE, BURN, HEAT
🐝 = BEE, BUZZ
🦂 = SCORPION, STING
🎪 = CIRCUS, TENT
🏃 = RUN, RUNNER, RACE
🌸 = FLOWER, BLOOM, ROSE
🃏 = JOKER, CARD, WILD
🎲 = DICE, CHANCE, ROLL
👹 = DEMON, DEVIL
🎉 = PARTY, CELEBRATE
🥳 = CELEBRATE, PARTY, JOY

**DEFINITION EMOJIS** (can hint at answer meaning):
Use with caution - should not make answer too obvious!

🏴‍☠️ = PIRATE, RAIDER (specific enough)
🌊 = STREAM, RIVER, OCEAN, FLOW (multiple interpretations - good)
🏫 = SCHOOL, CLASS, TEACHER (contextual)
🍲 = POT, STEW, COOK (cooking-related)
⚖️ = JUSTICE, BALANCE, LEGAL

💡 **EMOJI SELECTION STRATEGY:**

PREFER: Emojis for FODDER and INDICATORS (not definitions)
- Keeps answer non-obvious
- Forces solver to work through cryptic mechanics
- More satisfying solve experience

EXAMPLE GOOD USAGE (emojis separated):
- "💬 disrupted for 😔 (5)" → DOOMS
  * 💬 = MOODS or CHAT (fodder)
  * "disrupted" = anagram indicator (text)
  * 😔 = gloomy/sad (definition)
  * SEPARATED by: "disrupted for" ✓
  * Answer not guessable from emojis alone ✓

EXAMPLE BAD USAGE (emojis adjacent):
- "💬🔥 disrupted for 😱💀 (5)" → DOOMS
  * 💬🔥 are adjacent (no words between) → VIOLATES SPACING RULE ✗
  * 😱💀 also adjacent → VIOLATES SPACING RULE ✗
  * Even if emojis were separated, 😱💀 directly suggests DOOMS (scary + death) ✗

═══════════════════════════════════════════════════════════════════
CONSTRUCTION APPROACH - Outcome-Focused, Not Mechanical
═══════════════════════════════════════════════════════════════════

🎯 **THINK HOLISTICALLY, NOT STEP-BY-STEP**

Instead of following rigid steps, focus on achieving these three outcomes simultaneously:

**OUTCOME 1: Natural Surface Reading**
- Clue reads like a complete, real-world sentence
- Has narrative flow or tells a micro-story
- Employs clever misdirection (surface suggests X, answer is Y)
- Makes solver smile when decoded

**OUTCOME 2: Clean Cryptic Mechanics**
- Device works mathematically/phonetically perfectly
- Letter counts match exactly (for anagrams, containers, charades)
- Indicators are standard and recognizable
- Definition is accurate and fair

**OUTCOME 3: Common, Accessible Vocabulary**
- Answer is Wordle-level familiar
- Fodder words are everyday language
- Avoid technical jargon, specialized terms, or obscure words
- Both answer and components should feel earned, not arbitrary

═══════════════════════════════════════════════════════════════════

🛠️ **FLEXIBLE CONSTRUCTION WORKFLOW** (adapt as needed):

**Option A: Answer-First Approach**
1. Pick a common answer word (5-11 letters)
2. Choose a cryptic device that naturally fits it
3. Design the wordplay mechanics
4. Craft a surface reading that disguises the mechanics
5. Replace 2 words with emojis
6. Verify all three outcomes ✓

**Option B: Device-First Approach**
1. Choose your cryptic device
2. Select common fodder that works well
3. Calculate what answer emerges
4. Verify answer is common/valid
5. Craft engaging surface reading around it
6. Replace 2 words with emojis
7. Verify all three outcomes ✓

**Option C: Surface-First Approach (Advanced)**
1. Think of a clever surface reading scenario
2. Identify what cryptic device could work within it
3. Engineer the mechanics to fit the narrative
4. Verify answer emerges correctly
5. Replace 2 words with emojis
6. Verify all three outcomes ✓

═══════════════════════════════════════════════════════════════════

📋 **CRITICAL VERIFICATION CHECKLIST** (regardless of approach):

**Vocabulary Check:**
□ Answer is common, Wordle-level familiar (5-11 letters)
□ Fodder words are everyday language (not ARGENTS, MORTICAN, etc.)
□ No technical jargon, foreign words, or obscure terms

**Mechanics Check:**
□ For ANAGRAMS: Letters match EXACTLY
   - Write out both words letter-by-letter and compare:
   - MOODS = M,O,O,D,S vs DOOMS = D,O,O,M,S ✓ (same letters)
   - AGENTS = A,G,E,N,T,S vs STAGES = S,T,A,G,E,S ✗ (different!)
□ For CONTAINERS: Length math works (outer + inner = answer)
□ For CHARADES: Parts combine to make answer
□ For REVERSALS: Backward spelling is exact
□ For HIDDEN: Letters appear consecutively
□ For HOMOPHONES: Pronunciation is genuinely identical

**Surface Reading Check:**
□ Reads as natural, complete sentence
□ Has narrative or thematic coherence
□ Employs misdirection (not just mechanical description)
□ Would make solver smile/say "aha!" when solved

**Emoji Check:**
□ EXACTLY 2 emojis used
□ EMOJIS ARE SEPARATED by at least one word (not adjacent)
□ Emojis REPLACE specific words (test: remove them → gaps!)
□ Emojis are decodable but not obvious
□ Emojis DON'T directly depict the answer

**Definition Check:**
□ Definition is accurate synonym or description
□ Positioned at start OR end of clue (not middle)
□ Fair and dictionary-valid

═══════════════════════════════════════════════════════════════════

💡 **REMEMBER:**
- Artistry > Mechanical correctness (but both are required!)
- Surface reading is what makes cryptics delightful
- Common vocabulary ensures accessibility
- Emojis add visual interest but shouldn't give away answer

═══════════════════════════════════════════════════════════════════
COMPLETE EXAMPLES - From Good to Great
═══════════════════════════════════════════════════════════════════

**EXAMPLE 1: Basic Anagram** (Mechanically Correct, But Uninspired)

"💬🔥 disrupted for gloomy fates (5)" → DOOMS

Analysis:
- Device: Anagram
- 💬🔥 = MOODS (fodder - chat + fire = emotional states)
- "disrupted" = anagram indicator
- "gloomy fates" = definition
- Mechanics: MOODS (M-O-O-D-S) scrambled = DOOMS (D-O-O-M-S) ✓
- Emoji test: Remove → "_____ disrupted for gloomy fates" (has gap) ✓

What's missing: No surface story, no misdirection, just states the mechanics

═══════════════════════════════════════════════════════════════════

**EXAMPLE 2: Enhanced Anagram** (Better Surface Reading)

"Deadly 💀 🎲 tag? (8)" → PATHOGEN

Analysis:
- Device: Anagram
- 💀 = PHONE (skull represents death/calling)... wait, that doesn't work
- Let me reconsider: "💀🎲 playing phone tag? (8)" → PATHOGEN

Better version:
"Deadly agent 💫 📞🏷️ (8)" → PATHOGEN
- 💫 = "playing" (anagram indicator - scrambled/mixed)
- 📞🏷️ = "phone tag" (fodder)
- "Deadly agent" = PATHOGEN (definition)
- Surface: Spy thriller imagery, but answer is biological!
- Mechanics: PHONETAG (P-H-O-N-E-T-A-G) scrambled = PATHOGEN ✓

═══════════════════════════════════════════════════════════════════

**EXAMPLE 3: Sophisticated Container** (Multi-layered Misdirection)

"🐝🦂 gets Ray wandering (8)" → STRAYING

Analysis:
- Device: Container
- 🐝🦂 = STING (bee + scorpion = creatures that sting)
- "gets" = contains (container indicator)
- "Ray" = RAY (proper name suggests person, actually a light ray!)
- "wandering" = STRAYING (definition)
- Surface: Sounds like Ray is a person who wanders/gets lost
- Reality: STING wraps around RAY → ST(RAY)ING = STRAYING
- Mechanics: 5 letters (STING) + 3 (RAY) = 8 (STRAYING) ✓
- Emoji test: Remove → "_____ gets Ray wandering" (has gap) ✓

Why this works: Clever use of "Ray" as both a name AND a common word

═══════════════════════════════════════════════════════════════════

**EXAMPLE 4: Playful Reversal** (Simple But Effective)

"🛑 🔄 in kitchen vessels (4)" → POTS

Analysis:
- Device: Reversal
- 🛑 = STOP (fodder)
- 🔄 = turned/reversed (reversal indicator)
- "kitchen vessels" = POTS (definition - more interesting than just "pans")
- Mechanics: STOP reversed = POTS ✓
- Surface: Minimal but functional

Better surface version:
"🛑 🔄 for cooking gear (4)" → POTS
- Reads more naturally
- "cooking gear" is specific but not too obvious

═══════════════════════════════════════════════════════════════════

**EXAMPLE 5: Hidden Word** (Narrative Surface)

"Campers on alert 🐻 personal belongings (8)" → PERSONAL

Analysis:
- Device: Hidden word
- Surface: Camping scenario, bears threatening belongings
- 🐻 = "bears" (hidden word indicator - "bears" as in "carries/contains")
- Actually, let's use 2 emojis properly:

Revised: "🏕️⚠️ alert bears personal items (8)" → PERSONAL
- 🏕️⚠️ = "Campers on" (but that's the fodder, not indicator...)

Better: "Alert 🏕️ 🐻 personal stuff (8)" → PERSONAL
- "Alert campers" contains hidden word
- 🐻 = "bears" (indicator)
- Hidden in "camPERS ON ALert" = PERSONAL
- "personal stuff" = definition

Actually, this is complex. Let me show a clearer hidden word:

"Dozen, 💭🔝 (6)" → ZENITH
- 💭 = "I think" (from the phrase)
- 🔝 = "top" (definition)
- Hidden in "doZEN, I THink" = ZENITH
- Surface: Simple but works

═══════════════════════════════════════════════════════════════════
VALID COMMON ANAGRAM SOURCES (Use ONLY these types!)
═══════════════════════════════════════════════════════════════════

ALWAYS use common English words that people use every day:

5-letter sources: AGENT, HEART, EARTH, BREAD, TEAMS, MASTER, LISTEN, PHONE
6-letter sources: LISTEN, MASTER, GARDEN, PLANET, SILENT, AGENTS, FRIEND
7-letter sources: KITCHEN, GARDENS, STRANGE, CHAPTER, MONSTER
8-letter sources: ROMANTIC, PATHOGEN (phone tag), ESTIMATE (teams tie)

Test your anagram source:
✓ Would it appear in Wordle?
✓ Do people say it in normal conversation?
✓ Would a 10-year-old know this word?

If NO to any of these → choose a different source word!

═══════════════════════════════════════════════════════════════════
MULTI-DEVICE CLUES (Advanced - Difficulty 4-5)
═══════════════════════════════════════════════════════════════════

For higher difficulty, combine multiple cryptic devices in one clue:

**EXAMPLE: Deletion + Anagram**
"Every other 🏠🐕 💫 for cattle (4)" → HERD
- "Every other" = deletion indicator (take alternating letters)
- 🏠🐕 = HOMEBRED (house + dog bred at home)
- 💫 = "mixed" (anagram indicator)
- Take every other letter from HOMEBRED: H_M_B_E_ → HMBE? No...
- Actually: H-O-M-E-B-R-E-D, every prime (2,3,5,7) = O-M-B-E → rearranged...

Let me show a clearer multi-device:

**EXAMPLE: Container + Anagram**
"💫 debt traps 💰 jet (5)" → BIDET
- Device: Anagram + Container
- 💫 = "mixed" (anagram indicator)
- "debt" = DEBT (to be scrambled)
- "traps" = contains (container indicator)
- 💰 = "one" → I (Roman numeral)
- "jet" = BIDET (definition - water jet)
- Mechanics: DEBT scrambled (flying) = BDET... contains I = BIDET? No...
- Actually: I goes INTO (trapped by) DEBT scrambled = BIDET
- Proper: "One trapped by 💫 debt jet? (5)" → BIDET

⚠️ **Note on Multi-Device Clues:**
- Only use for difficulty 4-5
- All mechanics must work perfectly
- Surface reading becomes even more important
- Each device must contribute to the answer
- Don't force complexity - simple elegance > complicated mess

═══════════════════════════════════════════════════════════════════
QUALITY BENCHMARKS - Good vs. Great Clues
═══════════════════════════════════════════════════════════════════

**⭐ GOOD CLUE (Acceptable - Difficulty 2-3):**
- Mechanics work correctly ✓
- Uses common vocabulary ✓
- Has basic surface reading
- Straightforward, transparent
- Example: "💬🔥 disrupted for gloomy fates (5)" → DOOMS

**⭐⭐⭐ GREAT CLUE (Target - Difficulty 3-4):**
- Mechanics work perfectly ✓
- Uses common, accessible vocabulary ✓
- Engaging surface reading with narrative ✓
- Clever misdirection ✓
- Makes solver smile ("aha!") ✓
- Example: "Deadly agent 💫 📞🏷️ (8)" → PATHOGEN
  * Surface suggests spy thriller
  * Answer is biological agent
  * "Phone tag" is colloquial phrase
  * Delight factor when decoded

**⭐⭐⭐⭐⭐ EXCEPTIONAL CLUE (Aspire To - Difficulty 4-5):**
- All "Great" qualities PLUS:
- Multi-layered misdirection
- Cultural reference or wordplay
- Surface tells complete micro-story
- Multiple possible interpretations before solving
- Memorable, quotable
- Example from Minute Cryptic: "Goodbye! you blurted out, after ladies undressed (5)" → ADIEU
  * Surface: Scandalous social situation
  * Multiple devices working together
  * Homophone (U sounds like YOU) + deletion (ladies undressed)
  * Unforgettable imagery

🎯 **TARGET QUALITY LEVEL:**
- Aim for ⭐⭐⭐ GREAT as baseline
- Difficulty 2-3: Can be simpler (⭐ GOOD is acceptable)
- Difficulty 4-5: Reach for ⭐⭐⭐⭐⭐ EXCEPTIONAL
- Remember: A simple, elegant clue > a forced complex one

═══════════════════════════════════════════════════════════════════
DEVICE QUICK REFERENCE
═══════════════════════════════════════════════════════════════════

CHARADE: Join words | Indicators: with, and, by, before, after
Build: Pick 2 common words, verify they join to make a real word
Example: SUN + RISE = SUNRISE, CAR + PET = CARPET

ANAGRAM: Scramble letters | Indicators: mixed, jumbled, broken, playing, disrupted
Build: Pick COMMON source word, find what common words it anagrams to
Example: TEAMS TIE → ESTIMATE, LISTEN → SILENT

DELETION: Remove letters | Indicators: without, loses, drops, cut, headless
Build: Pick common word, remove specific letter(s), verify remainder is a word
Example: HOMEBRED (removing alternates) → HERD

HIDDEN: Word in phrase | Indicators: in, within, bears, features of, absorbed
Build: Create natural phrase that CONTAINS your target word
Example: "camPERS ON ALert" contains PERSONAL

═══════════════════════════════════════════════════════════════════
FINAL INSTRUCTIONS
═══════════════════════════════════════════════════════════════════

Now complete Steps 1-6 above. Then format as JSON.

🚨 BEFORE YOU SUBMIT - VERIFY:
1. All fodder words are COMMON (in everyday vocabulary)
2. Answer is COMMON (would appear in Wordle)
3. Letter counts are CORRECT
4. For anagrams: source word is NOT obscure or made-up
5. Exactly 2 emojis
6. Explanation is ONE clear sentence
7. HINTS DO NOT CONTAIN THE ANSWER WORD - guide without revealing!

CRITICAL: Check each hint carefully:
- Fodder hint: Describe components, DON'T say the answer word
- Indicator hint: Explain the operation, DON'T say the answer word
- Definition hint: Point to the definition, DON'T say the answer word
- Letter hint: Only give first letter

Example: If answer is ESTIMATE, hints can say "teams tie" but NOT "estimate"

═══════════════════════════════════════════════════════════════════
JSON OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════
${allowMultiWord ? `
🚨 FINAL REMINDER: Your answer MUST be multi-word with spaces!
"BLUE FEATHERS" ✓ | "BLUEFEATHERS" ✗ | "MOONLIGHT" ✗
` : ''}
Return ONLY this JSON (no markdown, no explanations after):

${allowMultiWord ? `
// MULTI-WORD EXAMPLE:
{
  "clue": "Blue feathers discarded? (4, 8)",
  "answer": "BLUE FEATHERS",
  "length": 12,
  "word_pattern": [4, 8],
  "hints": [
    {
      "type": "indicator",
      "text": "'discarded' signals a double definition clue - look for two ways to read 'Blue feathers discarded'.",
      "order": 1
    },
    {
      "type": "fodder",
      "text": "This is a double definition - 'Blue' can mean sad or down, and 'feathers discarded' suggests plumage that's been thrown away.",
      "order": 2
    },
    {
      "type": "definition",
      "text": "The phrase means feeling sad or down - a state of being dispirited.",
      "order": 3
    },
    {
      "type": "letter",
      "text": "Starts with D",
      "order": 4
    }
  ],
  "explanation": "Double definition: 'Blue' (down/sad) + 'feathers discarded' (down in the dumps) = DOWN IN THE DUMPS",
  "difficulty_rating": ${difficulty},
  "cryptic_device": "double_definition"
}

NOTE: For multi-word answers:
- Include spaces in "answer": "BLUE FEATHERS" NOT "BLUEFEATHERS"
- Add "word_pattern" field with array of word lengths: [4, 8]
- Update "length" to total letters (excluding spaces): 12
- Clue should show pattern: (4, 8) not just (12)
` : `
// SINGLE-WORD EXAMPLE:
{
  "clue": "💬 disrupted for 😔 (5)",
  "answer": "DOOMS",
  "length": 5,
  "hints": [
    {
      "type": "emoji",
      "text": "💬 represents chat or talk - think about emotional communication.",
      "order": 1
    },
    {
      "type": "indicator",
      "text": "'Disrupted' signals anagram - it tells you to rearrange the letters of a neighboring word.",
      "order": 2
    },
    {
      "type": "emoji",
      "text": "😔 represents sadness or gloominess.",
      "order": 3
    },
    {
      "type": "definition",
      "text": "The answer describes terrible fates or inevitable ends.",
      "order": 4
    },
    {
      "type": "letter",
      "text": "Starts with D",
      "order": 5
    }
  ],
  "explanation": "MOODS (💬 = talk/chat → moods) disrupted = DOOMS (😔 = gloomy fates)",
  "difficulty_rating": ${difficulty},
  "cryptic_device": "anagram"
}`}

HINT WRITING GUIDELINES (CRITICAL):
- Order hints: Indicator → Fodder → Definition → Letter (matches Minute Cryptic pedagogy)
- INDICATOR hint: Explain which word(s) signal the cryptic device and what they tell you to do
- FODDER hint: Explain what the emoji(s) represent and how to decode them (but DON'T reveal the fodder word itself unless necessary)
- DEFINITION hint: Explain what the definition means (but DON'T use the answer word - guide without revealing!)
- LETTER hint: Just give first letter
- Each hint should teach HOW to solve, not just give the answer

═══════════════════════════════════════════════════════════════════
🚨 FINAL MANDATORY CHECKS BEFORE SUBMITTING
═══════════════════════════════════════════════════════════════════

**EMOJI REQUIREMENTS:**
□ EXACTLY 2 emojis in clue (count: 1... 2... stop!)
□ EMOJIS ARE SEPARATED by at least one word (cannot be adjacent!)
□ Remove emojis → clue has OBVIOUS GAPS (not "still works fine")
□ Emojis REPLACE specific words (fodder/indicator, NOT answer)
□ NO EMOJI = ANSWER VIOLATION
   - Look at your answer, then look at BOTH emojis
   - Question: "Does this emoji visually depict my answer?"
   - ❌ If YES → INVALID! Choose different emojis!
   - ✅ If NO → Safe to proceed

**VOCABULARY REQUIREMENTS:**
${allowMultiWord ? '🚨 □ MULTI-WORD ANSWER REQUIRED: 2-3 words with spaces (e.g., "BLUE FEATHERS")' : '□ Answer is common everyday word (Wordle-level)'}
□ Answer is 5-11 letters total (excluding spaces)
□ Fodder words are everyday vocabulary (not ARGENTS, MORTICAN, etc.)
□ No technical jargon or specialized terminology
□ Abbreviations are "earned" through surface context (not arbitrary)
${allowMultiWord ? '□ Each word in multi-word answer must be at least 2 letters\n□ Include spaces in answer field: "BLUE FEATHERS" NOT "BLUEFEATHERS"' : ''}

**MECHANICS VERIFICATION:**
□ For ANAGRAMS: Letters match EXACTLY
   - Write out BOTH words letter-by-letter:
   - Fodder: M-O-O-D-S vs Answer: D-O-O-M-S ✓ (same letters)
   - Fodder: A-G-E-N-T-S vs Answer: S-T-A-G-E-S ✗ (AGENTS has N, STAGES doesn't!)
□ For CONTAINERS: outer word wraps inner word perfectly
   - Length math: outer + inner = answer length
□ For REVERSALS: fodder backwards = answer (letter-perfect)
□ For CHARADES: parts combine to form answer exactly
□ For HIDDEN: consecutive letters spell answer
□ For HOMOPHONES: pronunciation is genuinely identical

**SURFACE READING QUALITY:**
□ Clue reads as natural, complete sentence
□ Has narrative coherence or tells a micro-story
□ Employs misdirection (surface context ≠ answer context)
□ Would make solver say "aha!" when decoded
□ NOT just a mechanical description of the cryptic device

**HINT QUALITY:**
□ Hints ordered: Indicator → Fodder → Definition → Letter
□ Hints teach HOW to solve (not just reveal answer)
□ NO hint reveals the answer word directly
□ Fodder hint explains emoji meaning clearly
□ Definition hint guides without using answer word

**OVERALL QUALITY TARGET:**
□ For difficulty 2-3: Aim for ⭐⭐⭐ GOOD baseline
□ For difficulty 3-4: Aim for ⭐⭐⭐ GREAT with engaging surface
□ For difficulty 4-5: Reach for ⭐⭐⭐⭐⭐ EXCEPTIONAL with multiple layers

═══════════════════════════════════════════════════════════════════
🎯 FINAL REMINDER - CORE PRINCIPLES
═══════════════════════════════════════════════════════════════════

1. **Surface Reading is King**: Mechanical correctness is required, but artistry makes it memorable
2. **Common Vocabulary Only**: Accessibility matters - Wordle-level words only
3. **Exactly 2 Emojis Always (Separated)**: Signature mechanic - functional, not decorative, and must have at least one word between them
4. **Misdirection is Delight**: Best clues suggest one thing, reveal another
5. **Fair But Clever**: Solver should feel smart for solving it, not frustrated

Think like a Minute Cryptic constructor: natural language flow, clever wordplay, satisfying "aha!" moment.

NOW: Create your cryptic puzzle and return ONLY the JSON (no markdown, no extra text).`;
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
        logger.debug(`Found ${codeBlocks.length} JSON code blocks, using the last one`);
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
   * Validate cryptic puzzle structure
   */
  validateCrypticPuzzle(puzzle) {
    const errors = [];

    if (!puzzle.clue || puzzle.clue.length < 5) {
      errors.push('Clue is missing or too short');
    }

    // CRITICAL: Check for "=" in clue (not cryptic style!)
    if (puzzle.clue && puzzle.clue.includes('=')) {
      errors.push('Clue contains "=" which is not cryptic crossword style. Clues must disguise the wordplay, not reveal it with mathematical notation.');
    }

    // CRITICAL: Validate TWO-emoji requirement (Daily Cryptic signature mechanic)
    if (puzzle.clue) {
      const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Regional_Indicator}{2})/gu;
      const emojis = puzzle.clue.match(emojiRegex) || [];
      const emojiCount = emojis.length;

      if (emojiCount !== 2) {
        errors.push(`TWO-EMOJI REQUIREMENT: Must have exactly 2 emojis (found ${emojiCount}). This is the signature Daily Cryptic mechanic.`);
      }
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
      errors.push(`Length mismatch: length=${puzzle.length} but answer="${puzzle.answer}" has ${totalLetters} letters (excluding spaces)`);
    }

    // Allow spaces in multi-word answers
    if (!/^[A-Z\s]+$/.test(puzzle.answer || '')) {
      errors.push('Answer must be uppercase letters and spaces only');
    }

    // Validate word_pattern for multi-word answers
    if (puzzle.answer && puzzle.answer.includes(' ')) {
      const words = puzzle.answer.split(/\s+/).filter(w => w.length > 0);

      if (!puzzle.word_pattern) {
        errors.push('Multi-word answer requires word_pattern field');
      } else if (puzzle.word_pattern.length !== words.length) {
        errors.push(`word_pattern length (${puzzle.word_pattern.length}) does not match number of words (${words.length})`);
      } else {
        // Validate each word length
        for (let i = 0; i < words.length; i++) {
          if (words[i].length !== puzzle.word_pattern[i]) {
            errors.push(`Word ${i + 1} "${words[i]}" has ${words[i].length} letters but pattern specifies ${puzzle.word_pattern[i]}`);
          }
          if (words[i].length < 2) {
            errors.push(`Word ${i + 1} "${words[i]}" is too short (min 2 letters per word)`);
          }
        }
      }

      if (words.length > 3) {
        errors.push('Multi-word answers should have max 3 words for readability');
      }
    }

    if (!Array.isArray(puzzle.hints) || puzzle.hints.length !== 4) {
      errors.push('Must have exactly 4 hints');
    } else {
      const requiredTypes = ['fodder', 'indicator', 'definition', 'letter'];
      puzzle.hints.forEach((hint, index) => {
        if (!hint.type || !requiredTypes.includes(hint.type)) {
          errors.push(`Hint ${index + 1} has invalid type: ${hint.type}`);
        }
        if (!hint.text || hint.text.trim().length === 0) {
          errors.push(`Hint ${index + 1} text is empty`);
        }

        // CRITICAL: Check that hints don't reveal the answer (except for 'letter' hint which gives first letter)
        if (hint.type !== 'letter' && puzzle.answer) {
          const hintLower = hint.text.toLowerCase();
          const answerLower = puzzle.answer.toLowerCase();

          // Check if hint contains the full answer word as a standalone word (not as substring)
          // Use word boundaries to avoid false positives (e.g., "EARLS" in hint when answer is "PEARLS")
          const wordBoundaryRegex = new RegExp(`\\b${answerLower}\\b`, 'i');
          if (wordBoundaryRegex.test(hintLower)) {
            errors.push(`Hint ${index + 1} (${hint.type}) contains the answer "${puzzle.answer}". Hints should guide, not reveal!`);
          }

          // Additional check: if hint spells out the answer letter by letter (e.g., "H-A-L-L-M-A-R-K")
          const spelledOut = puzzle.answer.split('').join('-');
          if (hintLower.includes(spelledOut.toLowerCase())) {
            errors.push(`Hint ${index + 1} (${hint.type}) spells out the answer. This is too revealing!`);
          }
        }
      });
    }

    if (!puzzle.explanation || puzzle.explanation.length < 10) {
      errors.push('Explanation is missing or too short');
    }

    if (!puzzle.cryptic_device) {
      errors.push('Cryptic device is missing');
    }

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
    if (puzzle.cryptic_device && !validDevices.includes(puzzle.cryptic_device)) {
      errors.push(`Invalid cryptic device: ${puzzle.cryptic_device}`);
    }

    if (puzzle.difficulty_rating < 1 || puzzle.difficulty_rating > 5) {
      errors.push('Difficulty rating must be between 1 and 5');
    }

    // CRITICAL: Validate anagram mechanics (letter-perfect matching)
    if (puzzle.cryptic_device === 'anagram') {
      // Extract fodder word from explanation (e.g., "MOODS (💬🔥) disrupted = DOOMS")
      const explanationMatch = puzzle.explanation?.match(/^([A-Z]+)\s*(?:\([^)]+\))?\s*(?:scrambled|mixed|disrupted|broken|rearranged)/i);
      if (explanationMatch) {
        const fodder = explanationMatch[1].toUpperCase();
        const answer = puzzle.answer.toUpperCase();

        // Sort letters to compare
        const fodderSorted = fodder.split('').sort().join('');
        const answerSorted = answer.split('').sort().join('');

        if (fodderSorted !== answerSorted) {
          errors.push(
            `ANAGRAM VERIFICATION FAILED: "${fodder}" (${fodder.split('').join(',')}) cannot become "${answer}" (${answer.split('').join(',')}). ` +
            `Letters don't match! Fodder sorted: [${fodderSorted}], Answer sorted: [${answerSorted}]`
          );
        } else {
          logger.info('Anagram verification passed', { fodder, answer, sorted: fodderSorted });
        }
      } else {
        // Couldn't extract fodder from explanation - warn but don't fail
        logger.warn('Could not extract fodder from anagram explanation for verification', {
          explanation: puzzle.explanation,
          answer: puzzle.answer
        });
      }
    }

    // CRITICAL: Check for emoji=answer violations
    // Heuristic check - looks for hints that describe the answer word directly
    if (puzzle.hints && Array.isArray(puzzle.hints)) {
      const answerLower = puzzle.answer.toLowerCase();

      // Check for common singular/plural variations
      const answerVariations = new Set([answerLower]);
      if (answerLower.endsWith('s')) {
        answerVariations.add(answerLower.slice(0, -1)); // SPEARS → SPEAR
      } else {
        answerVariations.add(answerLower + 's'); // SPEAR → SPEARS
      }

      // Common patterns where hints explicitly mention the answer
      const suspiciousPatterns = [];
      for (const variation of answerVariations) {
        suspiciousPatterns.push(
          `represents ${variation}`,
          `means ${variation}`,
          `shows ${variation}`,
          `depicts ${variation}`,
          `is ${variation}`,
          `are ${variation}`,
          `is a ${variation}`,
          `are a ${variation}`,
        );
      }

      // Check fodder and definition hints (most common violation points)
      const hintsToCheck = puzzle.hints.filter(h => h.type === 'fodder' || h.type === 'definition');

      for (const hint of hintsToCheck) {
        const hintLower = hint.text.toLowerCase();

        for (const pattern of suspiciousPatterns) {
          if (hintLower.includes(pattern)) {
            errors.push(
              `EMOJI=ANSWER VIOLATION DETECTED: ${hint.type} hint directly mentions the answer. ` +
              `Hint contains "${pattern.split(' ').slice(-1)[0]}" when answer is "${puzzle.answer}". ` +
              `Emojis must represent fodder/indicators, NOT the answer itself. ` +
              `Players should NOT be able to guess the answer just by seeing the emojis.`
            );
            logger.error('Emoji=Answer violation detected', {
              answer: puzzle.answer,
              hintType: hint.type,
              hintText: hint.text,
              matchedPattern: pattern,
            });
            break;
          }
        }
      }
    }

    if (errors.length > 0) {
      const errorMsg = 'Invalid cryptic puzzle: ' + errors.join(', ');
      logger.error('Cryptic puzzle validation failed', { errors, puzzle });
      throw new Error(errorMsg);
    }

    logger.info('Cryptic puzzle validation passed', {
      answer: puzzle.answer,
      length: puzzle.length,
      device: puzzle.cryptic_device,
    });
  }

  /**
   * Generate and fill a Mini crossword grid using AI
   * @param {Object} options - Generation options
   * @param {Array<Array<string>>} options.grid - Current 5x5 grid state (letters or 'BLACK')
   * @param {Array<string>} options.wordDatabase - Available words from miniWordDatabase
   * @returns {Promise<{grid: Array<Array<string>>, clues: Object}>}
   */
  async fillMiniGrid({ grid, wordDatabase }) {
    const client = this.getClient();
    if (!client) {
      throw new Error('AI generation is not enabled. Please configure ANTHROPIC_API_KEY.');
    }

    const startTime = Date.now();
    let lastError = null;

    // Retry logic for production reliability
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const prompt = this.buildMiniGridPrompt({ grid, wordDatabase });
        const genInfo = {
          model: this.model,
          attempt: attempt + 1,
          maxAttempts: this.maxRetries + 1,
        };
        logger.debug('Filling Mini grid with AI', genInfo);

        const message = await client.messages.create({
          model: this.model,
          max_tokens: 2048,
          temperature: 0.7, // Moderate temperature for creative but valid solutions
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
        logger.debug('AI Mini grid response received', responseInfo);

        const result = this.parseMiniGridResponse(responseText);
        this.validateMiniGrid(result, wordDatabase);

        // Track successful generation
        this.generationCount++;
        const successInfo = {
          duration,
          wordCount: result.clues.across.length + result.clues.down.length,
          totalGenerations: this.generationCount,
        };
        logger.debug('Mini grid filled successfully', successInfo);

        return result;
      } catch (error) {
        lastError = error;

        // Enhanced error logging
        logger.error('AI Mini grid fill attempt failed', {
          attempt: attempt + 1,
          errorMessage: error.message,
          errorType: error.constructor.name,
          errorStatus: error.status,
          errorCode: error.error?.type,
          willRetry: attempt < this.maxRetries,
        });

        // Handle rate limiting
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
    logger.error('AI Mini grid fill failed after all retries', {
      attempts: this.maxRetries + 1,
      error: lastError,
    });
    throw new Error(
      `AI Mini grid fill failed after ${this.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Build the prompt for Mini grid filling
   */
  buildMiniGridPrompt({ grid, wordDatabase }) {
    // Analyze current grid state
    const gridState = this.analyzeGridState(grid);

    // Format word database by length
    const wordsByLength = {};
    wordDatabase.forEach(word => {
      const len = word.length;
      if (!wordsByLength[len]) wordsByLength[len] = [];
      wordsByLength[len].push(word);
    });

    const wordDatabaseSummary = Object.entries(wordsByLength)
      .map(([len, words]) => {
        // Show more examples for better AI understanding
        const examples = words.slice(0, 15).join(', ');
        return `  ${len} letters: ${words.length} words\n    Examples: ${examples}${words.length > 15 ? ', ...' : ''}`;
      })
      .join('\n');

    return `You are an expert NYT Mini crossword constructor. Your task is to fill a 5x5 crossword grid intelligently.

CURRENT GRID STATE:
${this.formatGridForPrompt(grid)}

GRID ANALYSIS:
- Existing letters: ${gridState.existingLetters.length > 0 ? gridState.existingLetters.join(', ') : 'None'}
- Black squares: ${gridState.blackSquares.length} positions
- Words to fill:
  Across: ${gridState.acrossWords.map(w => `${w.number} (${w.length} letters, row ${w.row})`).join(', ')}
  Down: ${gridState.downWords.map(w => `${w.number} (${w.length} letters, col ${w.col})`).join(', ')}

AVAILABLE WORD DATABASE (YOU MUST USE ONLY THESE WORDS):
${wordDatabaseSummary}

⚠️ CRITICAL DATABASE CONSTRAINT ⚠️
- EVERY word in your solution MUST exist in the database above
- DO NOT invent words or use words not in the database
- Your solution will be REJECTED if it contains ANY word not in the database
- When choosing a word, VERIFY it appears in the database first

CONSTRUCTION RULES:

1. **Every letter is checked**: Each letter must work both across AND down
2. **All words must be from database**: ONLY use words explicitly listed in the database above
3. **Respect existing letters**: Keep any letters already filled in the grid
4. **Rotational symmetry**: Black squares typically follow 180° rotational symmetry
5. **No isolated sections**: All white squares must connect
6. **Quality word choices**: Prefer common, everyday words from the database

CONSTRUCTION APPROACH (NYT method):

1. **Start with constraints**: Identify cells with existing letters
2. **Fill longest words first**: Longer words (4-5 letters) limit options more
3. **Check intersections**: For each word, verify all crossing letters form valid words
4. **Use common letters**: E, A, R, S, T, I, O, N are easy to cross
5. **Avoid difficult letters together**: Q, Z, X, J should not intersect unless necessary
6. **Theme/Pattern**: Mini puzzles often have mini-themes (all foods, colors, etc.)

ALGORITHM:

For each empty word slot:
1. Generate pattern with known letters (e.g., "A??LE" if A is at position 0)
2. Search database for matching words
3. For each candidate:
   - Check if it creates valid crossings
   - Verify crossing words exist in database
   - Score based on word commonality
4. Select word that creates most valid crossings
5. Continue until grid is complete

VALIDATION CHECKLIST:
□ All cells filled (no empty cells except BLACK)
□ Every across word exists in database
□ Every down word exists in database
□ All intersections work correctly
□ No duplicate words used
□ Grid follows symmetry pattern

OUTPUT FORMAT (JSON only):
{
  "grid": [
    ["B", "A", "K", "E", "R"],
    ["A", "R", "E", "A", "S"],
    ["BLACK", "L", "A", "M", "E"],
    ["K", "E", "P", "T", "BLACK"],
    ["S", "T", "E", "M", "S"]
  ],
  "words": {
    "across": [
      { "number": 1, "answer": "BAKER", "row": 0, "col": 0, "length": 5 },
      { "number": 6, "answer": "AREAS", "row": 1, "col": 0, "length": 5 },
      { "number": 8, "answer": "LAME", "row": 2, "col": 1, "length": 4 },
      { "number": 9, "answer": "KEPT", "row": 3, "col": 0, "length": 4 },
      { "number": 10, "answer": "STEMS", "row": 4, "col": 0, "length": 5 }
    ],
    "down": [
      { "number": 1, "answer": "BAKES", "row": 0, "col": 0, "length": 5 },
      { "number": 2, "answer": "ARLES", "row": 0, "col": 1, "length": 5 },
      { "number": 3, "answer": "KEEP", "row": 0, "col": 2, "length": 4 },
      { "number": 4, "answer": "EATS", "row": 0, "col": 3, "length": 4 },
      { "number": 5, "answer": "RAMS", "row": 0, "col": 4, "length": 4 }
    ]
  }
}

CRITICAL INSTRUCTIONS:
- Return ONLY the JSON object - no text before or after
- Do NOT wrap in markdown code blocks
- Do NOT include any explanations or commentary
- Start your response immediately with {
- Use ONLY words from the provided database
- Verify ALL intersections work correctly
- Empty cells must contain uppercase letters A-Z
- Black squares must remain 'BLACK'

Respond with pure JSON only:`;
  }

  /**
   * Analyze current grid state to understand constraints
   */
  analyzeGridState(grid) {
    const existingLetters = [];
    const blackSquares = [];
    const acrossWords = [];
    const downWords = [];

    // Find existing letters and black squares
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cell = grid[row][col];
        if (cell === 'BLACK') {
          blackSquares.push({ row, col });
        } else if (cell && cell !== '') {
          existingLetters.push({ letter: cell, row, col });
        }
      }
    }

    // Find word slots (across)
    let wordNumber = 1;
    for (let row = 0; row < grid.length; row++) {
      let wordStart = null;
      let length = 0;
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] !== 'BLACK') {
          if (wordStart === null) wordStart = col;
          length++;
        } else {
          if (length >= 2) {
            acrossWords.push({ number: wordNumber++, row, col: wordStart, length });
          }
          wordStart = null;
          length = 0;
        }
      }
      if (length >= 2) {
        acrossWords.push({ number: wordNumber++, row, col: wordStart, length });
      }
    }

    // Find word slots (down)
    for (let col = 0; col < grid[0].length; col++) {
      let wordStart = null;
      let length = 0;
      for (let row = 0; row < grid.length; row++) {
        if (grid[row][col] !== 'BLACK') {
          if (wordStart === null) wordStart = row;
          length++;
        } else {
          if (length >= 2) {
            downWords.push({ number: wordNumber++, row: wordStart, col, length });
          }
          wordStart = null;
          length = 0;
        }
      }
      if (length >= 2) {
        downWords.push({ number: wordNumber++, row: wordStart, col, length });
      }
    }

    return {
      existingLetters,
      blackSquares,
      acrossWords,
      downWords,
    };
  }

  /**
   * Format grid for prompt display
   */
  formatGridForPrompt(grid) {
    const display = grid.map((row, i) =>
      `${i}: [${row.map(cell => cell === 'BLACK' ? '█' : (cell || '·')).join(' ')}]`
    ).join('\n');
    return display;
  }

  /**
   * Parse AI Mini grid response
   */
  parseMiniGridResponse(responseText) {
    try {
      // Try multiple strategies to extract JSON from the response

      // Strategy 1: Look for JSON code blocks
      const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
      if (codeBlockMatch) {
        const result = JSON.parse(codeBlockMatch[1]);
        return this.normalizeMiniGridResult(result);
      }

      // Strategy 2: Find the first complete JSON object
      const jsonStart = responseText.indexOf('{');
      if (jsonStart !== -1) {
        // Try to find matching closing brace by counting braces
        let braceCount = 0;
        let jsonEnd = -1;
        for (let i = jsonStart; i < responseText.length; i++) {
          if (responseText[i] === '{') braceCount++;
          if (responseText[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }

        if (jsonEnd !== -1) {
          const jsonStr = responseText.substring(jsonStart, jsonEnd);
          const result = JSON.parse(jsonStr);
          return this.normalizeMiniGridResult(result);
        }
      }

      // Strategy 3: Fallback to greedy match
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return this.normalizeMiniGridResult(result);
      }

      throw new Error('No JSON found in response');
    } catch (error) {
      logger.error('Failed to parse AI Mini grid response', {
        error: error.message,
        responsePreview: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
      });
      throw new Error('Failed to parse AI Mini grid response. Please try again.');
    }
  }

  /**
   * Normalize and validate Mini grid result structure
   */
  normalizeMiniGridResult(result) {
    // Validate structure
    if (!result.grid || !Array.isArray(result.grid)) {
      throw new Error('Invalid grid structure: missing or non-array grid');
    }

    if (!result.words || !result.words.across || !result.words.down) {
      throw new Error('Invalid words structure: missing words.across or words.down');
    }

    return {
      grid: result.grid,
      clues: {
        across: result.words.across,
        down: result.words.down,
      },
    };
  }

  /**
   * Validate Mini grid - ensures all words exist in database and intersections work
   */
  validateMiniGrid(result, wordDatabase) {
    const errors = [];

    // Check grid dimensions
    if (result.grid.length !== 5) {
      errors.push('Grid must be 5 rows');
    }

    result.grid.forEach((row, i) => {
      if (row.length !== 5) {
        errors.push(`Row ${i} must be 5 columns`);
      }
      row.forEach((cell, j) => {
        if (cell !== 'BLACK' && (!/^[A-Z]$/.test(cell) || cell === '')) {
          errors.push(`Invalid cell at [${i}][${j}]: "${cell}"`);
        }
      });
    });

    // Check words exist
    if (!result.clues.across || result.clues.across.length === 0) {
      errors.push('No across words found');
    }

    if (!result.clues.down || result.clues.down.length === 0) {
      errors.push('No down words found');
    }

    if (errors.length > 0) {
      const errorMsg = 'Invalid Mini grid structure: ' + errors.join(', ');
      logger.error('Mini grid validation failed', { errors, result });
      throw new Error(errorMsg);
    }

    // CRITICAL: Validate all words exist in database
    const wordSet = new Set(wordDatabase.map(w => w.toUpperCase()));
    const invalidWords = [];

    // Validate across words
    result.clues.across.forEach(word => {
      if (!wordSet.has(word.answer.toUpperCase())) {
        invalidWords.push(`ACROSS ${word.number}: "${word.answer}" not in database`);
      }
    });

    // Validate down words
    result.clues.down.forEach(word => {
      if (!wordSet.has(word.answer.toUpperCase())) {
        invalidWords.push(`DOWN ${word.number}: "${word.answer}" not in database`);
      }
    });

    if (invalidWords.length > 0) {
      const errorMsg = 'AI generated words not in database: ' + invalidWords.join('; ');
      logger.error('Mini grid word validation failed', { invalidWords });
      throw new Error(errorMsg);
    }

    // CRITICAL: Extract and validate actual words from grid match the clue list
    const extractedWords = this.extractWordsFromGrid(result.grid);

    // Verify all extracted words exist in database
    const gridInvalidWords = [];
    [...extractedWords.across, ...extractedWords.down].forEach(word => {
      if (!wordSet.has(word.answer.toUpperCase())) {
        gridInvalidWords.push(`"${word.answer}" at ${word.direction} ${word.row || word.col}`);
      }
    });

    if (gridInvalidWords.length > 0) {
      const errorMsg = 'Grid contains invalid words: ' + gridInvalidWords.join('; ');
      logger.error('Grid word extraction validation failed', { gridInvalidWords });
      throw new Error(errorMsg);
    }

    logger.info('Mini grid validation passed', {
      acrossCount: result.clues.across.length,
      downCount: result.clues.down.length,
      allWordsValid: true,
    });
  }

  /**
   * Extract all words from grid to validate they match database
   */
  extractWordsFromGrid(grid) {
    const across = [];
    const down = [];
    let wordNumber = 1;

    // Extract across words
    for (let row = 0; row < 5; row++) {
      let col = 0;
      while (col < 5) {
        if (grid[row][col] === 'BLACK') {
          col++;
          continue;
        }

        let startCol = col;
        let word = '';
        while (col < 5 && grid[row][col] !== 'BLACK') {
          word += grid[row][col];
          col++;
        }

        if (word.length >= 2) {
          across.push({
            number: wordNumber++,
            answer: word,
            row,
            startCol,
            length: word.length,
            direction: 'across'
          });
        }
      }
    }

    // Extract down words
    for (let col = 0; col < 5; col++) {
      let row = 0;
      while (row < 5) {
        if (grid[row][col] === 'BLACK') {
          row++;
          continue;
        }

        let startRow = row;
        let word = '';
        while (row < 5 && grid[row][col] !== 'BLACK') {
          word += grid[row][col];
          row++;
        }

        if (word.length >= 2) {
          down.push({
            number: wordNumber++,
            answer: word,
            col,
            startRow,
            length: word.length,
            direction: 'down'
          });
        }
      }
    }

    return { across, down };
  }

  /**
   * Generate NYT Mini-style clues for a completed grid
   * @param {Object} options - Generation options
   * @param {Array<Object>} options.words - Words to generate clues for
   * @returns {Promise<Object>} - Generated clues
   */
  async generateMiniClues({ words }) {
    const client = this.getClient();
    if (!client) {
      throw new Error('AI generation is not enabled. Please configure ANTHROPIC_API_KEY.');
    }

    const startTime = Date.now();
    let lastError = null;

    // Retry logic for production reliability
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const prompt = this.buildMiniCluesPrompt({ words });
        const genInfo = {
          model: this.model,
          attempt: attempt + 1,
          maxAttempts: this.maxRetries + 1,
          wordCount: words.length,
        };
        logger.debug('Generating Mini clues with AI', genInfo);

        const message = await client.messages.create({
          model: this.model,
          max_tokens: 2048,
          temperature: 0.8, // Higher temperature for creative clue writing
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
        logger.debug('AI Mini clues response received', responseInfo);

        const clues = this.parseMiniCluesResponse(responseText);
        this.validateMiniClues(clues, words);

        // Track successful generation
        this.generationCount++;
        const successInfo = {
          duration,
          clueCount: Object.keys(clues).length,
          totalGenerations: this.generationCount,
        };
        logger.debug('Mini clues generated successfully', successInfo);

        return clues;
      } catch (error) {
        lastError = error;

        // Enhanced error logging
        logger.error('AI Mini clues generation attempt failed', {
          attempt: attempt + 1,
          errorMessage: error.message,
          errorType: error.constructor.name,
          errorStatus: error.status,
          errorCode: error.error?.type,
          willRetry: attempt < this.maxRetries,
        });

        // Handle rate limiting
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
    logger.error('AI Mini clues generation failed after all retries', {
      attempts: this.maxRetries + 1,
      error: lastError,
    });
    throw new Error(
      `AI Mini clues generation failed after ${this.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Build the prompt for Mini clue generation
   */
  buildMiniCluesPrompt({ words }) {
    const wordsList = words.map(w =>
      `${w.number}. ${w.answer} (${w.length} letters)`
    ).join('\n');

    return `You are an expert NYT Mini crossword clue writer. Generate clever, accessible clues for these words.

WORDS TO CLUE:
${wordsList}

NYT MINI CLUE STYLE (from the crossword construction video):

1. **Accessible but Clever**: Clues should be solvable by most people, but with a bit of wordplay
2. **Various Clue Types**:
   - Straight definitions: "Large body of water" for OCEAN
   - Fill-in-the-blank: "___ and crafts" for ARTS
   - Trivia: "Author of '1984'" for ORWELL
   - Wordplay: "What a baker makes" for BREAD (could be money or food)
   - Pop culture: "___-Man (arcade game)" for PAC

3. **Avoid**:
   - Obscure references that require specialized knowledge
   - Overly technical jargon
   - Clues that are too obvious or too hard
   - Offensive or insensitive content

4. **The "Breakfast Test"**: Would this clue be appropriate to solve over breakfast with family?

5. **Clue Difficulty**:
   - Monday (easiest): Very straightforward, common knowledge
   - Wednesday-Friday (Mini): Balanced - clever but fair
   - Saturday (hardest): More abstract, requires thinking

6. **Formatting**:
   - Use proper punctuation
   - Capitalize appropriately
   - Question marks for questions
   - Keep concise (typically 3-10 words)

CLUE QUALITY EXAMPLES:

EXCELLENT:
- "Big ___ (London landmark)" for BEN
- "Opposite of subtract" for ADD
- "Breakfast bread" for TOAST
- "___ and flow" for EBB

GOOD:
- "Feline pet" for CAT
- "Not odd" for EVEN
- "Morning meal" for BREAKFAST

TOO EASY:
- "The letters C-A-T" for CAT
- "Five-letter word for breakfast" for TOAST

TOO HARD:
- "Felis catus domesticus" for CAT (too technical)
- "Lepus europaeus relative" for HARE (too obscure)

OUTPUT FORMAT (JSON only):
{
  "clues": [
    {
      "number": 1,
      "answer": "BAKER",
      "clue": "One who works with dough"
    },
    {
      "number": 2,
      "answer": "AREAS",
      "clue": "Regions or zones"
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON (no markdown, no explanations)
- One clue per word
- Clues should be clever but fair
- Aim for Mini difficulty (accessible but not too obvious)
- Use variety in clue types

Now generate creative, high-quality clues for all the words above.`;
  }

  /**
   * Parse AI Mini clues response
   */
  parseMiniCluesResponse(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);

      if (!result.clues || !Array.isArray(result.clues)) {
        throw new Error('Invalid clues structure');
      }

      // Convert array to object keyed by number
      const cluesObj = {};
      result.clues.forEach(clue => {
        cluesObj[clue.number] = clue.clue;
      });

      return cluesObj;
    } catch (error) {
      logger.error('Failed to parse AI Mini clues response', { error, responseText });
      throw new Error('Failed to parse AI Mini clues response. Please try again.');
    }
  }

  /**
   * Validate Mini clues
   */
  validateMiniClues(clues, words) {
    const errors = [];

    words.forEach(word => {
      if (!clues[word.number]) {
        errors.push(`Missing clue for word ${word.number} (${word.answer})`);
      } else {
        const clue = clues[word.number];
        if (typeof clue !== 'string' || clue.length < 3) {
          errors.push(`Invalid clue for word ${word.number}: too short`);
        }
        // Check if clue accidentally contains the answer
        if (clue.toUpperCase().includes(word.answer.toUpperCase())) {
          errors.push(`Clue for ${word.answer} contains the answer word`);
        }
      }
    });

    if (errors.length > 0) {
      const errorMsg = 'Invalid Mini clues: ' + errors.join(', ');
      logger.error('Mini clues validation failed', { errors, clues });
      throw new Error(errorMsg);
    }

    logger.info('Mini clues validation passed', {
      clueCount: Object.keys(clues).length,
    });
  }

  /**
   * Check if AI generation is available
   */
  isEnabled() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const enabled = this.enabled && !!apiKey;

    if (!enabled) {
      const diagnostics = {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length,
        apiKeyPrefix: apiKey?.substring(0, 10),
        enabledFlag: this.enabled,
        aiGenerationEnabled: process.env.AI_GENERATION_ENABLED,
        nodeEnv: process.env.NODE_ENV,
        envKeys: Object.keys(process.env).filter(
          (k) => k.includes('AI') || k.includes('ANTHROPIC')
        ),
      };

      logger.error('AI generation check failed', null, diagnostics);

      // Provide actionable error message
      if (!apiKey) {
        logger.error('Missing ANTHROPIC_API_KEY environment variable');
      } else if (this.enabled === false) {
        logger.warn('AI generation disabled via AI_GENERATION_ENABLED flag');
      }
    } else {
      logger.debug('AI generation is enabled and ready');
    }

    return enabled;
  }
}

export default new AIService();
